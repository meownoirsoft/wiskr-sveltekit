// src/routes/api/ideas/debug/+server.js
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

    // Check if ideas table exists and has data
    const { data: ideas, error: ideasError, count } = await supabase
      .from('ideas')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId);

    if (ideasError) {
      console.error('Debug: Ideas query error:', ideasError);
      return json({ 
        error: 'Ideas query failed', 
        details: ideasError,
        tableExists: false
      });
    }

    // Check table structure
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'ideas');

    console.log(`🔍 Ideas Debug: Found ${ideas?.length || 0} ideas for project ${projectId}`);
    console.log(`🔍 Ideas Debug: Table structure:`, tableInfo);

    return json({ 
      success: true,
      ideas: ideas || [],
      count: count || 0,
      tableExists: true,
      tableStructure: tableInfo || [],
      projectId: projectId,
      userId: user.id
    });

  } catch (error) {
    console.error('Ideas Debug API error:', error);
    return json({ error: 'Debug failed', details: error.message });
  }
};
