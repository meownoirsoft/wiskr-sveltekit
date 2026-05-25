import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/queries.js';
import { isAdmin } from '$lib/auth/admin';
import { listUsers } from '$lib/server/auth.js';

export const load = async ({ locals, url }) => {
  // Check admin permissions
  const adminCheck = await isAdmin(locals.db, locals.user);
  if (!adminCheck.isAdmin) {
    throw redirect(303, '/');
  }

  try {
    // Load all projects across all users for admin dashboard
    const { data: projects, error: projectsError } = await db
      .from('projects')
      .select('id, name, description, created_at, user_id')
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error('Error loading projects:', projectsError);
      return { projects: [], users: [] };
    }

    // Get users and enrich projects with user info
    const users = await listUsers(1, 1000);

    // Create user lookup map
    const userMap = new Map();
    users.forEach(user => {
      const meta = typeof user.user_metadata === 'string'
        ? JSON.parse(user.user_metadata)
        : user.user_metadata || {};
      userMap.set(user.id, {
        id: user.id,
        email: user.email,
        full_name: meta.full_name || meta.name
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
    return { projects: [], users: [] };
  }
};
