import { json } from '@sveltejs/kit';
import { generateCardEmbedding } from '$lib/server/utils/embeddings.js';

export async function GET({ url, locals }) {
  
  try {
    // Simple rate limiting - check if we're making too many requests
    const clientIP = url.headers?.get('x-forwarded-for') || url.headers?.get('x-real-ip') || 'unknown';
    const rateLimitKey = `search_rate_limit:${clientIP}`;
    
    // For now, we'll use a simple approach - you could implement Redis or database-based rate limiting later
    const now = Date.now();
    const lastRequest = locals.searchRateLimit?.[rateLimitKey] || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < 1000) { // Minimum 1 second between requests
      return json({ 
        error: 'Rate limit exceeded', 
        message: 'Please wait a moment before searching again' 
      }, { status: 429 });
    }
    
    // Update rate limit tracking
    if (!locals.searchRateLimit) locals.searchRateLimit = {};
    locals.searchRateLimit[rateLimitKey] = now;
    
    // Verify user is authenticated using cached session
    let user = locals.getCachedUser?.() || locals.user;
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate cached user and refresh if needed
    if (!user.id || !user.email) {
      user = await locals.refreshUserCache?.();
      if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    const { searchParams } = url;
    const searchTerm = searchParams.get('q');
    const includeTypes = searchParams.get('types')?.split(',') || ['cards', 'chats'];
    const currentProjectId = searchParams.get('projectId');
    
    if (!searchTerm || !searchTerm.trim()) {
      return json({ results: [] });
    }
    
    if (!currentProjectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const results = [];
    const { supabase } = locals;
    
    // Search cards using semantic search
    if (includeTypes.includes('cards')) {
      try {
        // First try semantic search
        const { data: semanticCards, error: semanticError } = await supabase.rpc('search_cards_semantic', {
          query_embedding: await generateCardEmbedding(searchTerm, ''),
          project_id: currentProjectId,
          match_threshold: 0.3, // Lower threshold for broader results
          match_count: 10
        });

        if (!semanticError && semanticCards && semanticCards.length > 0) {
          semanticCards.forEach(card => {
            results.push({
              id: card.id,
              type: 'cards',
              title: card.title || 'Untitled Card',
              name: card.title || 'Untitled Card',
              snippet: card.content?.substring(0, 100) + (card.content?.length > 100 ? '...' : ''),
              content: card.content,
              cardType: card.type,
              similarity: card.similarity, // Include similarity score
              rarity: card.rarity,
              progress: card.progress,
              mana_cost: card.mana_cost
            });
          });
        } else {
          // Fallback to text search if semantic search fails or returns no results
          const { data: cards, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('project_id', currentProjectId)
            .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (!cardsError && cards) {
            cards.forEach(card => {
              results.push({
                id: card.id,
                type: 'cards',
                title: card.title || 'Untitled Card',
                name: card.title || 'Untitled Card',
                snippet: card.content?.substring(0, 100) + (card.content?.length > 100 ? '...' : ''),
                content: card.content,
                cardType: card.type,
                rarity: card.rarity,
                progress: card.progress,
                mana_cost: card.mana_cost
              });
            });
          }
        }
      } catch (error) {
        console.error('Card search error:', error);
        // Fallback to text search on error
        const { data: cards, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .eq('project_id', currentProjectId)
          .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!cardsError && cards) {
          cards.forEach(card => {
            results.push({
              id: card.id,
              type: 'cards',
              title: card.title || 'Untitled Card',
              name: card.title || 'Untitled Card',
              snippet: card.content?.substring(0, 100) + (card.content?.length > 100 ? '...' : ''),
              content: card.content,
              cardType: card.type,
              rarity: card.rarity,
              progress: card.progress,
              mana_cost: card.mana_cost
            });
          });
        }
      }
    }
    
    
    // Search chat messages
    if (includeTypes.includes('chats')) {
      // First, get the basic messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('project_id', currentProjectId)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (messagesError) {
        console.error('Search API: Messages query error:', messagesError);
      }
      
      
      if (!messagesError && messages && messages.length > 0) {
        // Now get the branch and session info for these messages
        const messageIds = messages.map(m => m.id);
        // Get all branch IDs from messages
        const branchIds = messages.map(m => m.branch_id).filter(id => id);
        
        // Get branch info by looking up branch_id (not the UUID primary key)
        const { data: branches, error: branchesError } = await supabase
          .from('conversation_branches')
          .select('id, branch_id, branch_name, session_id')
          .in('branch_id', branchIds);
        
        if (branchesError) {
          console.error('Search API: Branches query error:', branchesError);
        }
        
        // Get session info
        const sessionIds = branches?.map(b => b.session_id).filter(id => id) || [];
        const { data: sessions, error: sessionsError } = await supabase
          .from('conversation_sessions')
          .select('id, session_name')
          .in('id', sessionIds);
        
        if (sessionsError) {
          console.error('Search API: Sessions query error:', sessionsError);
        }
        
        
        // Create lookup maps for branches and sessions
        const branchMap = new Map();
        const sessionMap = new Map();
        
        branches?.forEach(branch => {
          branchMap.set(branch.branch_id, branch);
        });
        
        sessions?.forEach(session => {
          sessionMap.set(session.id, session);
        });
        
        // Deduplicate messages by content and combine multiple instances
        const uniqueMessages = new Map();
        
        messages.forEach(message => {
          const branch = branchMap.get(message.branch_id);
          const session = branch ? sessionMap.get(branch.session_id) : null;
          const messageKey = `${message.id}-${session?.id}`;
          
          if (!uniqueMessages.has(messageKey)) {
            // Count occurrences of the search term in this message
            const regex = new RegExp(searchTerm, 'gi');
            const matches = message.content.match(regex) || [];
            const instanceCount = matches.length;
            
            // Create a snippet that shows the first occurrence
            let snippet = message.content;
            const firstMatchIndex = message.content.toLowerCase().indexOf(searchTerm.toLowerCase());
            if (firstMatchIndex >= 0) {
              const start = Math.max(0, firstMatchIndex - 50);
              const end = Math.min(message.content.length, firstMatchIndex + searchTerm.length + 50);
              snippet = (start > 0 ? '...' : '') + message.content.substring(start, end) + (end < message.content.length ? '...' : '');
            }
            
            uniqueMessages.set(messageKey, {
              id: message.id,
              type: 'chats',
              title: session?.session_name || 'Chat',
              name: session?.session_name || 'Chat',
              snippet: snippet,
              content: message.content,
              sessionId: session?.id,
              session_name: session?.session_name,
              branch_id: branch?.branch_id,  // Use branch_id (string) not id (UUID)
              branch_name: branch?.branch_name,
              messageId: message.id,
              instanceCount: instanceCount, // Number of times search term appears
              firstMatchIndex: firstMatchIndex, // Position of first match for scrolling
              created_at: message.created_at // Include created_at for sorting
            });
          }
        });
        
        // Convert to array and limit to 10 results
        const deduplicatedResults = Array.from(uniqueMessages.values())
          .sort((a, b) => b.instanceCount - a.instanceCount || b.created_at - a.created_at)
          .slice(0, 10);
        
        // Validate that all chat results have the required IDs
        const validResults = deduplicatedResults.filter(result => {
          if (result.type === 'chats') {
            const isValid = result.sessionId && result.branch_id;
            if (!isValid) {
              console.error('❌ Search API: Invalid chat result missing required IDs:', {
                id: result.id,
                sessionId: result.sessionId,
                branch_id: result.branch_id,
                type: result.type
              });
            }
            return isValid;
          }
          return true; // Non-chat results are always valid
        });
        
        // Log detailed information about each result for debugging
        validResults.forEach((result, index) => {
          console.log(`✅ Search API: Valid chat result ${index + 1}:`, {
            sessionId: result.sessionId,
            session_name: result.session_name,
            branch_id: result.branch_id,
            branch_name: result.branch_name,
            type: result.type,
            hasSessionId: !!result.sessionId,
            hasBranchId: !!result.branch_id
          });
        });
        
        results.push(...validResults);
      }
    }
    
    
    // Search ideas
    if (includeTypes.includes('ideas')) {
      const { data: ideas, error: ideasError } = await supabase
        .from('ideas')
        .select('*')
        .eq('project_id', currentProjectId)
        .ilike('title', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!ideasError && ideas) {
        ideas.forEach(idea => {
          results.push({
            id: idea.id,
            type: 'ideas',
            title: idea.title || 'Untitled Idea',
            name: idea.title || 'Untitled Idea',
            snippet: idea.description?.substring(0, 100) + (idea.description?.length > 100 ? '...' : ''),
            content: idea.description
          });
        });
      }
    }
    
    // Process chat results into session groups for search dropdown
    const chatResults = results.filter(r => r.type === 'chats');
    const sessionGroups = [];
    const sessionMap = new Map();
    
    chatResults.forEach(chatResult => {
      if (!sessionMap.has(chatResult.sessionId)) {
        sessionMap.set(chatResult.sessionId, {
          session_id: chatResult.sessionId,
          session_name: chatResult.session_name || 'Chat',
          is_active: false, // We'll update this based on current session
          message_count: 0,
          messages: []
        });
      }
      
      const sessionGroup = sessionMap.get(chatResult.sessionId);
      sessionGroup.message_count++;
      sessionGroup.messages.push({
        id: chatResult.id,
        content: chatResult.content,
        branch_id: chatResult.branch_id,
        branch_name: chatResult.branch_name || 'Main',
        session_id: chatResult.sessionId,
        session_name: chatResult.session_name
      });
    });
    
    // Convert map to array and sort sessions
    sessionGroups.push(...sessionMap.values());
    sessionGroups.sort((a, b) => {
      // Sort by active status first, then by name
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return a.session_name.localeCompare(b.session_name);
    });
    
    // Return results in the structure that GlobalSearch expects
    const structuredResults = {
      cards: results.filter(r => r.type === 'cards'),
      chatMessages: chatResults,
      sessionGroups: sessionGroups,
      totalSessions: sessionGroups.length
    };
    
    return json({ results: structuredResults });
    
  } catch (error) {
    console.error('🔍 Search API GET: Error occurred:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST({ request, locals }) {
  
  try {
    // Simple rate limiting - check if we're making too many requests
    const clientIP = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimitKey = `search_rate_limit:${clientIP}`;
    
    // For now, we'll use a simple approach - you could implement Redis or database-based rate limiting later
    const now = Date.now();
    const lastRequest = locals.searchRateLimit?.[rateLimitKey] || 0;
    const timeSinceLastRequest = now - lastRequest;
    
    if (timeSinceLastRequest < 1000) { // Minimum 1 second between requests
      return json({ 
        error: 'Rate limit exceeded', 
        message: 'Please wait a moment before searching again' 
      }, { status: 429 });
    }
    
    // Update rate limit tracking
    if (!locals.searchRateLimit) locals.searchRateLimit = {};
    locals.searchRateLimit[rateLimitKey] = now;
    
    // Verify user is authenticated using cached session
    let user = locals.getCachedUser?.() || locals.user;
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate cached user and refresh if needed
    if (!user.id || !user.email) {
      user = await locals.refreshUserCache?.();
      if (!user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    
    
    const { query, projectId, includeTypes = ['cards', 'chats'] } = await request.json();
    
    
    if (!query || !query.trim()) {
      return json({ results: [] });
    }
    
    const searchTerm = query.trim();
    const results = [];
    
    // Get the current project ID from the request or use the one from locals
    const currentProjectId = projectId || locals.currentProject?.id;
    
    if (!currentProjectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const { supabase } = locals;
    
    
    // Search cards using semantic search
    if (includeTypes.includes('cards')) {
      try {
        // First try semantic search
        const { data: semanticCards, error: semanticError } = await supabase.rpc('search_cards_semantic', {
          query_embedding: await generateCardEmbedding(searchTerm, ''),
          project_id: currentProjectId,
          match_threshold: 0.3, // Lower threshold for broader results
          match_count: 10
        });

        if (!semanticError && semanticCards && semanticCards.length > 0) {
          semanticCards.forEach(card => {
            results.push({
              id: card.id,
              type: 'cards',
              title: card.title || 'Untitled Card',
              name: card.title || 'Untitled Card',
              snippet: card.content?.substring(0, 100) + (card.content?.length > 100 ? '...' : ''),
              content: card.content,
              cardType: card.type,
              similarity: card.similarity, // Include similarity score
              rarity: card.rarity,
              progress: card.progress,
              mana_cost: card.mana_cost
            });
          });
        } else {
          // Fallback to text search if semantic search fails or returns no results
          const { data: cards, error: cardsError } = await supabase
            .from('cards')
            .select('*')
            .eq('project_id', currentProjectId)
            .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%`)
            .order('created_at', { ascending: false })
            .limit(10);
          
          if (!cardsError && cards) {
            cards.forEach(card => {
              results.push({
                id: card.id,
                type: 'cards',
                title: card.title || 'Untitled Card',
                name: card.title || 'Untitled Card',
                snippet: card.content?.substring(0, 100) + (card.content?.length > 100 ? '...' : ''),
                content: card.content,
                cardType: card.type,
                rarity: card.rarity,
                progress: card.progress,
                mana_cost: card.mana_cost
              });
            });
          }
        }
      } catch (error) {
        console.error('Card search error:', error);
        // Fallback to text search on error
        const { data: cards, error: cardsError } = await supabase
          .from('cards')
          .select('*')
          .eq('project_id', currentProjectId)
          .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.ilike.%${searchTerm}%`)
          .order('created_at', { ascending: false })
          .limit(10);
        
        if (!cardsError && cards) {
          cards.forEach(card => {
            results.push({
              id: card.id,
              type: 'cards',
              title: card.title || 'Untitled Card',
              name: card.title || 'Untitled Card',
              snippet: card.content?.substring(0, 100) + (card.content?.length > 100 ? '...' : ''),
              content: card.content,
              cardType: card.type,
              rarity: card.rarity,
              progress: card.progress,
              mana_cost: card.mana_cost
            });
          });
        }
      }
    }
    
    
    // Search chat messages
    if (includeTypes.includes('chats')) {
      // First, get the basic messages with session_id included
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, branch_id, session_id, created_at')
        .eq('project_id', currentProjectId)
        .ilike('content', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (messagesError) {
        console.error('Search API: Messages query error:', messagesError);
      }
      
      
      if (!messagesError && messages && messages.length > 0) {
        // Now get the branch and session info for these messages
        const messageIds = messages.map(m => m.id);
        // Get all branch IDs from messages
        const branchIds = messages.map(m => m.branch_id).filter(id => id);
        
        // Get branch info by looking up branch_id (not the UUID primary key)
        const { data: branches, error: branchesError } = await supabase
          .from('conversation_branches')
          .select('id, branch_id, branch_name, session_id')
          .in('branch_id', branchIds);
        
        if (branchesError) {
          console.error('Search API: Branches query error:', branchesError);
        }
        
        // Get session info
        const sessionIds = branches?.map(b => b.session_id).filter(id => id) || [];
        const { data: sessions, error: sessionsError } = await supabase
          .from('conversation_sessions')
          .select('id, session_name')
          .in('id', sessionIds);
        
        if (sessionsError) {
          console.error('Search API: Sessions query error:', sessionsError);
        }
        
        
        // Create lookup maps for branches and sessions
        const branchMap = new Map();
        const sessionMap = new Map();
        
        branches?.forEach(branch => {
          branchMap.set(branch.branch_id, branch);
        });
        
        sessions?.forEach(session => {
          sessionMap.set(session.id, session);
        });
        
        // Deduplicate messages by content and combine multiple instances
        const uniqueMessages = new Map();
        
        messages.forEach(message => {
          const branch = branchMap.get(message.branch_id);
          console.log('Search API: Branch lookup debug:', { 
            messageBranchId: message.branch_id, 
            foundBranch: branch ? { id: branch.id, branch_id: branch.branch_id } : null 
          });
          const session = branch ? sessionMap.get(branch.session_id) : null;
          const messageKey = `${message.id}-${session?.id}`;
          
          if (!uniqueMessages.has(messageKey)) {
            // Count occurrences of the search term in this message
            const regex = new RegExp(searchTerm, 'gi');
            const matches = message.content.match(regex) || [];
            const instanceCount = matches.length;
            
            // Create a snippet that shows the first occurrence
            let snippet = message.content;
            const firstMatchIndex = message.content.toLowerCase().indexOf(searchTerm.toLowerCase());
            if (firstMatchIndex >= 0) {
              const start = Math.max(0, firstMatchIndex - 50);
              const end = Math.min(message.content.length, firstMatchIndex + searchTerm.length + 50);
              snippet = (start > 0 ? '...' : '') + message.content.substring(start, end) + (end < message.content.length ? '...' : '');
            }
            
            uniqueMessages.set(messageKey, {
              id: message.id,
              type: 'chats',
              title: session?.session_name || 'Chat',
              name: session?.session_name || 'Chat',
              snippet: snippet,
              content: message.content,
              sessionId: message.session_id,  // Use session_id directly from message
              session_name: session?.session_name,
              branch_id: message.branch_id,  // Use branch_id directly from message
              branch_name: branch?.branch_name,
              messageId: message.id,
              instanceCount: instanceCount, // Number of times search term appears
              firstMatchIndex: firstMatchIndex, // Position of first match for scrolling
              created_at: message.created_at // Include created_at for sorting
            });
          }
        });
        
        // Convert to array and limit to 10 results
        const deduplicatedResults = Array.from(uniqueMessages.values())
          .sort((a, b) => b.instanceCount - a.instanceCount || b.created_at - a.created_at)
          .slice(0, 10);
        
        // Validate that all chat results have the required IDs
        const validResults = deduplicatedResults.filter(result => {
          if (result.type === 'chats') {
            const isValid = result.sessionId && result.branch_id;
            if (!isValid) {
              console.error('❌ Search API: Invalid chat result missing required IDs:', {
                id: result.id,
                sessionId: result.sessionId,
                branch_id: result.branch_id,
                type: result.type
              });
            }
            return isValid;
          }
          return true; // Non-chat results are always valid
        });
        
        // Log detailed information about each result for debugging
        validResults.forEach((result, index) => {
          console.log(`✅ Search API: Valid chat result ${index + 1}:`, {
            sessionId: result.sessionId,
            session_name: result.session_name,
            branch_id: result.branch_id,
            branch_name: result.branch_name,
            type: result.type,
            hasSessionId: !!result.sessionId,
            hasBranchId: !!result.branch_id
          });
        });
        
        results.push(...validResults);
      }
    }
    
    
    
    console.log('🔍 Search API POST: Result counts:', {
      cards: results.filter(r => r.type === 'cards').length,
      chats: results.filter(r => r.type === 'chats').length,
      total: results.length
    });
    
    // Process chat results into session groups for search dropdown
    const chatResults = results.filter(r => r.type === 'chats');
    const sessionGroups = [];
    const sessionMap = new Map();
    
    chatResults.forEach(chatResult => {
      if (!sessionMap.has(chatResult.sessionId)) {
        sessionMap.set(chatResult.sessionId, {
          session_id: chatResult.sessionId,
          session_name: chatResult.session_name || 'Chat',
          is_active: false, // We'll update this based on current session
          message_count: 0,
          messages: []
        });
      }
      
      const sessionGroup = sessionMap.get(chatResult.sessionId);
      sessionGroup.message_count++;
      sessionGroup.messages.push({
        id: chatResult.id,
        content: chatResult.content,
        branch_id: chatResult.branch_id,
        branch_name: chatResult.branch_name || 'Main',
        session_id: chatResult.sessionId,
        session_name: chatResult.session_name
      });
    });
    
    // Convert map to array and sort sessions
    sessionGroups.push(...sessionMap.values());
    sessionGroups.sort((a, b) => {
      // Sort by active status first, then by name
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return a.session_name.localeCompare(b.session_name);
    });
    
    // Return results in the structure that GlobalSearch expects
    const structuredResults = {
      cards: results.filter(r => r.type === 'cards'),
      chatMessages: chatResults,
      sessionGroups: sessionGroups,
      totalSessions: sessionGroups.length
    };
    
    
    return json({ 
      results: structuredResults,
      query: searchTerm,
      total: results.length
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
}
