import { json } from '@sveltejs/kit';

export const PUT = async ({ params, request, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ message: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const { name, description } = await request.json();

    if (!name?.trim()) {
      return json({ message: 'Project name is required' }, { status: 400 });
    }

    // First, verify the project exists and user has access
    const { data: existingProject, error: fetchError } = await locals.supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (fetchError) {
      console.error('Error fetching project for update:', fetchError);
      if (fetchError.code === 'PGRST116') {
        return json({ message: 'Project not found or unauthorized' }, { status: 404 });
      }
      return json({ message: fetchError.message }, { status: 500 });
    }

    if (!existingProject) {
      return json({ message: 'Project not found or unauthorized' }, { status: 404 });
    }

    // Update the project
    const { data: projects, error } = await locals.supabase
      .from('projects')
      .update({ 
        name: name.trim(), 
        description: description?.trim() || '' 
      })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select('id, name, description, icon, color, brief_text, created_at');

    if (error) {
      console.error('Error updating project:', error);
      return json({ message: error.message }, { status: 500 });
    }

    if (!projects || projects.length === 0) {
      return json({ message: 'Project not found or unauthorized' }, { status: 404 });
    }

    const project = projects[0];

    return json(project);
  } catch (error) {
    console.error('Unexpected error updating project:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
};

export const GET = async ({ params, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    console.log(user)
    if (!user) {
      return json({ message: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Get the project
    const { data: project, error } = await locals.supabase
      .from('projects')
      .select('id, name, description, icon, color, brief_text, created_at')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching project:', error);
      return json({ message: error.message }, { status: 500 });
    }

    if (!project) {
      return json({ message: 'Project not found' }, { status: 404 });
    }

    return json(project);
  } catch (error) {
    console.error('Unexpected error fetching project:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
};
