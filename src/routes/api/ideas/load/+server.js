// src/routes/api/ideas/load/+server.js
import { json } from '@sveltejs/kit';

export const GET = async ({ url, locals }) => {
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = url.searchParams.get('projectId');
    
    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    const { supabase } = locals;

    // Load ideas from database for this project
    const { data: ideas, error } = await supabase
      .from('ideas')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading ideas from database:', error);
      return json({ error: 'Failed to load ideas' }, { status: 500 });
    }

    console.log(`🔍 Ideas API: Loaded ${ideas?.length || 0} ideas from database for project ${projectId}`);

    return json({ 
      success: true, 
      ideas: ideas || [],
      count: ideas?.length || 0
    });

  } catch (error) {
    console.error('Ideas API error:', error);
    return json({ error: 'Failed to load ideas' }, { status: 500 });
  }
};
