import { json } from '@sveltejs/kit';

export async function GET({ url, locals }) {
  console.log('🔍 Search API GET called with:', { searchParams: Object.fromEntries(url.searchParams) });
  
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = url;
    const searchTerm = searchParams.get('q');
    const includeTypes = searchParams.get('types')?.split(',') || ['facts', 'docs', 'chats'];
    const currentProjectId = searchParams.get('projectId');
    
    if (!searchTerm || !searchTerm.trim()) {
      return json({ results: [] });
    }
    
    if (!currentProjectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const results = [];
    const { supabase } = locals;
    
    // Search facts
    if (includeTypes.includes('facts')) {
      const { data: facts, error: factsError } = await supabase
        .from('facts')
        .select('*')
        .eq('project_id', currentProjectId)
        .or(`key.ilike.%${searchTerm}%,value.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!factsError && facts) {
        facts.forEach(fact => {
          results.push({
            id: fact.id,
            type: 'facts',
            title: fact.key || 'Untitled Fact',
            name: fact.key || 'Untitled Fact',
            snippet: fact.value?.substring(0, 100) + (fact.value?.length > 100 ? '...' : ''),
            content: fact.value,
            factType: fact.type
          });
        });
      }
    }
    
    // Search docs
    if (includeTypes.includes('docs')) {
      const { data: docs, error: docsError } = await supabase
        .from('docs')
        .select('*')
        .eq('project_id', currentProjectId)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!docsError && docs) {
        docs.forEach(doc => {
          results.push({
            id: doc.id,
            type: 'docs',
            title: doc.title || 'Untitled Doc',
            name: doc.title || 'Untitled Doc',
            snippet: doc.content?.substring(0, 100) + (doc.content?.length > 100 ? '...' : ''),
            content: doc.content
          });
        });
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
      
      console.log('Search API: Raw messages query result:', { messages, messagesError });
      
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
        
        console.log('Search API: Branches found:', branches?.length || 0);
        console.log('Search API: Branch details:', branches?.map(b => ({ id: b.id, branch_id: b.branch_id, branch_name: b.branch_name, session_id: b.session_id })));
        console.log('Search API: Sessions found:', sessions?.length || 0);
        
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
          console.log('Processing message:', { 
            messageId: message.id, 
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
              sessionId: session?.id,
              session_name: session?.session_name,
              branch_id: branch?.branch_id,  // Use branch_id (string) not id (UUID)
              branch_name: branch?.branch_name,
              messageId: message.id,
              instanceCount: instanceCount, // Number of times search term appears
              firstMatchIndex: firstMatchIndex // Position of first match for scrolling
            });
          }
        });
        
        // Convert to array and limit to 10 results
        const deduplicatedResults = Array.from(uniqueMessages.values())
          .sort((a, b) => b.instanceCount - a.instanceCount || b.created_at - a.created_at)
          .slice(0, 10);
        
        console.log('Search API: Final chat results:', deduplicatedResults.map(r => ({
          id: r.id,
          sessionId: r.sessionId,
          branch_id: r.branch_id,
          type: r.type
        })));
        
        results.push(...deduplicatedResults);
      }
    }
    
    // Search questions
    if (includeTypes.includes('questions')) {
      const { data: questions, error: questionsError } = await supabase
        .from('project_questions')
        .select('*')
        .eq('project_id', currentProjectId)
        .ilike('question', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!questionsError && questions) {
        questions.forEach(question => {
          results.push({
            id: question.id,
            type: 'questions',
            title: question.question?.substring(0, 50) + (question.question?.length > 50 ? '...' : ''),
            name: question.question?.substring(0, 50) + (question.question?.length > 50 ? '...' : ''),
            snippet: question.question?.substring(0, 100) + (question.question?.length > 100 ? '...' : ''),
            content: question.question
          });
        });
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
    
    // Return results in the structure that GlobalSearch expects
    const structuredResults = {
      facts: results.filter(r => r.type === 'facts'),
      docs: results.filter(r => r.type === 'docs'),
      chatMessages: results.filter(r => r.type === 'chats'),
      questions: results.filter(r => r.type === 'questions'),
      relatedIdeas: results.filter(r => r.type === 'ideas'),
      sessionGroups: [],
      totalSessions: 0
    };
    
    console.log('🔍 Search API POST: Returning structured results:', structuredResults);
    
    console.log('🔍 Search API POST: About to return results');
    return json({ results: structuredResults });
    
  } catch (error) {
    console.error('🔍 Search API POST: Error occurred:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    console.log('🔍 Search API POST: Function completed');
  }
}

export async function POST({ request, locals }) {
  console.log('🔍 Search API POST called - START');
  
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      console.log('🔍 Search API POST: Unauthorized');
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔍 Search API POST: User authenticated');
    
    const { query, projectId, includeTypes = ['facts', 'docs', 'chats', 'questions', 'ideas'] } = await request.json();
    
    console.log('🔍 Search API POST parameters:', { query, projectId, includeTypes });
    
    if (!query || !query.trim()) {
      return json({ results: [] });
    }
    
    const searchTerm = query.trim();
    console.log('🔍 Search API POST searchTerm:', searchTerm);
    const results = [];
    
    // Get the current project ID from the request or use the one from locals
    const currentProjectId = projectId || locals.currentProject?.id;
    
    if (!currentProjectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    const { supabase } = locals;
    
    console.log('🔍 Search API POST: About to search with projectId:', currentProjectId);
    
    // Search facts
    if (includeTypes.includes('facts')) {
      const { data: facts, error: factsError } = await supabase
        .from('facts')
        .select('*')
        .eq('project_id', currentProjectId)
        .or(`key.ilike.%${searchTerm}%,value.ilike.%${searchTerm}%,type.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!factsError && facts) {
        facts.forEach(fact => {
          results.push({
            id: fact.id,
            type: 'facts',
            title: fact.key || 'Untitled Fact',
            name: fact.key || 'Untitled Fact',
            snippet: fact.value?.substring(0, 100) + (fact.value?.length > 100 ? '...' : ''),
            content: fact.value,
            factType: fact.type
          });
        });
      }
    }
    
    // Search docs
    if (includeTypes.includes('docs')) {
      const { data: docs, error: docsError } = await supabase
        .from('docs')
        .select('*')
        .eq('project_id', currentProjectId)
        .or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!docsError && docs) {
        docs.forEach(doc => {
          results.push({
            id: doc.id,
            type: 'docs',
            title: doc.title || 'Untitled Doc',
            name: doc.title || 'Untitled Doc',
            snippet: doc.content?.substring(0, 100) + (doc.content?.length > 100 ? '...' : ''),
            content: doc.content
          });
        });
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
      
      console.log('Search API: Raw messages query result:', { messages, messagesError });
      
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
        
        console.log('Search API: Branches found:', branches?.length || 0);
        console.log('Search API: Branch details:', branches?.map(b => ({ id: b.id, branch_id: b.branch_id, branch_name: b.branch_name, session_id: b.session_id })));
        console.log('Search API: Sessions found:', sessions?.length || 0);
        
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
          console.log('Processing message:', { 
            messageId: message.id, 
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
              sessionId: session?.id,
              session_name: session?.session_name,
              branch_id: branch?.branch_id,  // Use branch_id (string) not id (UUID)
              branch_name: branch?.branch_name,
              messageId: message.id,
              instanceCount: instanceCount, // Number of times search term appears
              firstMatchIndex: firstMatchIndex // Position of first match for scrolling
            });
          }
        });
        
        // Convert to array and limit to 10 results
        const deduplicatedResults = Array.from(uniqueMessages.values())
          .sort((a, b) => b.instanceCount - a.instanceCount || b.created_at - a.created_at)
          .slice(0, 10);
        
        console.log('Search API: Final chat results:', deduplicatedResults.map(r => ({
          id: r.id,
          sessionId: r.sessionId,
          branch_id: r.branch_id,
          type: r.type
        })));
        
        results.push(...deduplicatedResults);
      }
    }
    
    // Search questions
    if (includeTypes.includes('questions')) {
      const { data: questions, error: questionsError } = await supabase
        .from('project_questions')
        .select('*')
        .eq('project_id', currentProjectId)
        .ilike('question', `%${searchTerm}%`)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!questionsError && questions) {
        questions.forEach(question => {
          results.push({
            id: question.id,
            type: 'questions',
            title: question.question?.substring(0, 50) + (question.question?.length > 50 ? '...' : ''),
            name: question.question?.substring(0, 50) + (question.question?.length > 50 ? '...' : ''),
            snippet: question.question?.substring(0, 100) + (question.question?.length > 100 ? '...' : ''),
            content: question.question
          });
        });
      }
    }
    
    // For ideas, we'll need to check if there are any stored ideas or generate them
    // For now, we'll skip ideas as they're typically generated on-demand
    
    console.log('🔍 Search API POST: Returning results count by type:', {
      facts: results.filter(r => r.type === 'facts').length,
      docs: results.filter(r => r.type === 'docs').length,
      chats: results.filter(r => r.type === 'chats').length,
      questions: results.filter(r => r.type === 'questions').length,
      total: results.length
    });
    
    return json({ 
      results: results,
      query: searchTerm,
      total: results.length
    });
    
  } catch (error) {
    console.error('Search API error:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
}
