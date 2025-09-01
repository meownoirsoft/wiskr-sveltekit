import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { isAdmin } from '$lib/auth/admin';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    // Check admin permissions
    const adminCheck = await isAdmin(locals.supabase, locals.user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userId = url.searchParams.get('userId');
    const projectName = url.searchParams.get('projectName');

    if (!userId) {
      return json({ error: 'userId parameter required' }, { status: 400 });
    }

    // Check what projects exist for this user (using admin client to bypass RLS)
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name, created_at, user_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (projectsError) {
      return json({ error: 'Failed to query projects', details: projectsError }, { status: 500 });
    }

    // If looking for a specific project, get its facts too
    let facts = null;
    if (projectName) {
      const project = projects?.find(p => p.name === projectName);
      if (project) {
        const { data: projectFacts, error: factsError } = await supabaseAdmin
          .from('facts')
          .select('id, key, value, type, created_at')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!factsError) {
          facts = projectFacts;
        }
      }
    }

    // Check if user can see their own projects (with regular client)
    const { data: userVisibleProjects, error: userError } = await locals.supabase
      .from('projects')
      .select('id, name, created_at')
      .eq('user_id', userId);

    return json({
      userId,
      projectName,
      adminView: {
        projectCount: projects?.length || 0,
        projects: projects?.slice(0, 5), // First 5 projects
        facts: facts?.slice(0, 5) // First 5 facts if requested
      },
      userView: {
        projectCount: userVisibleProjects?.length || 0,
        projects: userVisibleProjects?.slice(0, 5),
        error: userError?.message
      },
      diagnosis: {
        rlsIssue: (projects?.length || 0) > (userVisibleProjects?.length || 0),
        message: (projects?.length || 0) > (userVisibleProjects?.length || 0) 
          ? 'RLS is blocking user access to admin-created projects'
          : 'Projects are visible to user'
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
