// src/routes/context-dashboard/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
  // Check authentication - redirect to login if not authenticated
  const { data: { session } } = await locals.supabase.auth.getSession();
  
  if (!session) {
    throw redirect(303, '/login');
  }

  // Load user's projects for the dropdown
  const { data: projects, error } = await locals.supabase
    .from('projects')
    .select('id, name, description')
    .order('name');
  
  if (error) {
    console.error('Error loading projects:', error);
    return {
      user: session.user,
      projects: []
    };
  }

  // Get projectId from URL params
  const projectId = url.searchParams.get('projectId');
  
  return {
    user: session.user,
    projects: projects || [],
    selectedProjectId: projectId
  };
};
