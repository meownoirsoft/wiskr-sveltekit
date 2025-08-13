import { json } from '@sveltejs/kit';

/**
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function POST({ request, locals }) {
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { projectId, query, branchId = 'main' } = await request.json();
    
    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    if (!query || query.length < 3) {
      return json({ error: 'Search query must be at least 3 characters' }, { status: 400 });
    }
    
    const { supabase } = locals;
    
    // Check if user has access to this project
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .single();
      
    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 404 });
    }
    
    // Search facts
    const { data: facts, error: factsError } = await supabase
      .from('facts')
      .select('*')
      .eq('project_id', projectId)
      .or(`key.ilike.%${query}%,value.ilike.%${query}%,tags.cs.{${query}}`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Search docs
    const { data: docs, error: docsError } = await supabase
      .from('docs')
      .select('*')
      .eq('project_id', projectId)
      .or(`title.ilike.%${query}%,content.ilike.%${query}%,tags.cs.{${query}}`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Search chat messages
    const { data: chatMessages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', projectId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Get branch names for messages (if they're not on main branch)
    const formattedMessages = [];
    if (chatMessages && chatMessages.length > 0) {
      // Get unique branch IDs that aren't 'main'
      const branchIds = [...new Set(chatMessages.map(m => m.branch_id).filter(id => id !== 'main'))];
      
      let branches = [];
      if (branchIds.length > 0) {
        const { data: branchData } = await supabase
          .from('conversation_branches')
          .select('branch_id, branch_name')
          .in('branch_id', branchIds);
        branches = branchData || [];
      }
      
      // Format messages with branch names
      chatMessages.forEach(message => {
        const branch = branches.find(b => b.branch_id === message.branch_id);
        formattedMessages.push({
          ...message,
          branch_name: branch?.branch_name || (message.branch_id === 'main' ? 'Main' : 'Unknown Branch')
        });
      });
    }
    
    // Search questions
    const { data: questions, error: questionsError } = await supabase
      .from('project_questions')
      .select('*')
      .eq('project_id', projectId)
      .ilike('question', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);
    
    // Note: Related ideas are generated on-demand and not stored in the database,
    // so we don't search for them here
    
    if (factsError || docsError || messagesError || questionsError) {
      console.error('Search errors:', { factsError, docsError, messagesError, questionsError });
      return json({ error: 'Error performing search' }, { status: 500 });
    }
    
    // Return the search results
    return json({
      results: {
        facts: facts || [],
        docs: docs || [],
        chatMessages: formattedMessages,
        questions: questions || [],
        relatedIdeas: [] // Ideas are generated on-demand, not stored
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
