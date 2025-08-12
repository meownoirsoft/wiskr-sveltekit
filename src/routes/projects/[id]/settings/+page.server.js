import { error } from '@sveltejs/kit';

export async function load({ params, locals }) {
  // Get the current user
  const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
  if (userError || !user) {
    throw error(401, 'Unauthorized');
  }

  // Fetch project details
  const { data: project, error: projectError } = await locals.supabase
    .from('projects')
    .select('*')
    .eq('id', params.id)
    .single();

  if (projectError) {
    console.error('Error fetching project:', projectError);
    throw error(404, 'Project not found');
  }

  // Check if user has access to this project
  if (project.user_id !== user.id) {
    throw error(403, 'Access denied');
  }

  return {
    project
  };
}
