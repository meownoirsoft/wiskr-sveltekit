import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { isAdmin } from '$lib/auth/admin';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const load: PageServerLoad = async ({ locals, url }) => {
  // Check admin permissions
  const adminCheck = await isAdmin(locals.supabase, locals.user);
  if (!adminCheck.isAdmin) {
    throw redirect(303, '/');
  }

  try {
    // Load all projects across all users for admin dashboard
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, name, description, created_at, user_id')
      .order('created_at', { ascending: false });
    
    if (projectsError) {
      console.error('Error loading projects:', projectsError);
      return {
        projects: [],
        users: []
      };
    }

    // Get users from auth and enrich projects with user info
    const { data: authResponse, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    const users = authResponse?.users || [];

    if (usersError) {
      console.error('Error loading users:', usersError);
    }

    // Create user lookup map
    const userMap = new Map();
    users.forEach(user => {
      userMap.set(user.id, {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name
      });
    });

    // Enrich projects with user information
    const enrichedProjects = (projects || []).map(project => {
      const user = userMap.get(project.user_id);
      return {
        ...project,
        profiles: user || {
          id: project.user_id,
          email: 'Unknown User',
          full_name: 'Unknown User'
        }
      };
    });

    // Get projectId from URL params
    const projectId = url.searchParams.get('projectId');
    const selectedUserId = url.searchParams.get('userId');
    
    return {
      projects: enrichedProjects,
      users: Array.from(userMap.values()),
      selectedProjectId: projectId,
      selectedUserId: selectedUserId
    };
  } catch (error) {
    console.error('Load error:', error);
    return {
      projects: [],
      users: []
    };
  }
};
