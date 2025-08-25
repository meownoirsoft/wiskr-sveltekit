import { json } from '@sveltejs/kit';

/**
 * Fix missing sessions and branches for existing users
 * POST /api/fix-user-sessions
 */
export async function POST({ locals }) {
  try {
    // Verify user is authenticated
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Not authenticated' }, { status: 401 });
    }

    console.log('🔧 Fixing sessions for user:', user.email);

    // Get user's projects
    const { data: projects, error: projectsError } = await locals.supabase
      .from('projects')
      .select('id, name')
      .eq('user_id', user.id);

    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
      return json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return json({ 
        error: 'No projects found',
        message: 'User has no projects to fix'
      }, { status: 404 });
    }

    const results = [];

    // Fix each project
    for (const project of projects) {
      console.log('🔍 Checking project:', project.name);

      // Check if project has sessions
      const { data: existingSessions, error: sessionsError } = await locals.supabase
        .from('conversation_sessions')
        .select('id, session_name')
        .eq('project_id', project.id);

      if (sessionsError) {
        console.error('❌ Error checking sessions:', sessionsError);
        continue;
      }

      if (existingSessions && existingSessions.length > 0) {
        console.log('✅ Project already has sessions:', existingSessions.length);
        results.push({
          projectId: project.id,
          projectName: project.name,
          action: 'skipped',
          reason: 'Already has sessions',
          sessionCount: existingSessions.length
        });
        continue;
      }

      console.log('🛠️ Creating session for project:', project.name);

      // Create main session
      const { data: newSession, error: sessionError } = await locals.supabase
        .from('conversation_sessions')
        .insert({
          project_id: project.id,
          session_name: 'Main Chat',
          session_date: new Date().toISOString().split('T')[0],
          is_active: true,
          topic_summary: 'Your main conversation with Wiskrs'
        })
        .select('id, session_name')
        .single();

      if (sessionError) {
        console.error('❌ Error creating session:', sessionError);
        results.push({
          projectId: project.id,
          projectName: project.name,
          action: 'failed',
          error: sessionError.message
        });
        continue;
      }

      console.log('✅ Created session:', newSession.session_name);

      // Create main branch
      const { data: newBranch, error: branchError } = await locals.supabase
        .from('conversation_branches')
        .insert({
          project_id: project.id,
          session_id: newSession.id,
          branch_id: 'main',
          branch_name: 'Main Branch',
          color_index: 0
        })
        .select('branch_name')
        .single();

      if (branchError) {
        console.error('❌ Error creating branch:', branchError);
        results.push({
          projectId: project.id,
          projectName: project.name,
          action: 'partial',
          sessionCreated: true,
          branchError: branchError.message
        });
        continue;
      }

      console.log('✅ Created branch:', newBranch.branch_name);

      results.push({
        projectId: project.id,
        projectName: project.name,
        action: 'fixed',
        sessionId: newSession.id,
        sessionName: newSession.session_name,
        branchName: newBranch.branch_name
      });
    }

    return json({
      success: true,
      message: `Fixed ${results.filter(r => r.action === 'fixed').length} projects`,
      results: results
    });

  } catch (error) {
    console.error('❌ Error in fix-user-sessions:', error);
    return json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
