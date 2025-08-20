// src/routes/api/context-score/[projectId]/+server.js
import { json } from '@sveltejs/kit';
import { getContextScore } from '$lib/server/utils/contextScore.js';

export const GET = async ({ params, locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
  
  const { projectId } = params;
  
  if (!projectId) {
    return json({ error: 'Missing projectId' }, { status: 400 });
  }

  try {
    // Check that user has access to this project (RLS will handle this)
    const { data: project } = await locals.supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (!project) {
      return json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Get the context score (cached or calculate fresh)
    const score = await getContextScore(locals.supabase, projectId);
    
    return json({ 
      score,
      projectId,
      projectName: project.name,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Context score API error:', error);
    return json({ error: error.message }, { status: 500 });
  }
};
