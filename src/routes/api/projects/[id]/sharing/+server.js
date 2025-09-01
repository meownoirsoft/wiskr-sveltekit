import { json } from '@sveltejs/kit';
import { createHmac, randomBytes } from 'crypto';

// Hash password for storage
function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = createHmac('sha256', salt).update(password).digest('hex');
  return `${salt}:${hash}`;
}

// Verify password
function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return !inputPassword; // No password required if none set
  if (!inputPassword) return false; // Password required but none provided
  
  const [salt, hash] = storedHash.split(':');
  const inputHash = createHmac('sha256', salt).update(inputPassword).digest('hex');
  return hash === inputHash;
}

export const PUT = async ({ params, request, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ message: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const { isPublic, password } = await request.json();

    // Validate input
    if (typeof isPublic !== 'boolean') {
      return json({ message: 'isPublic must be a boolean' }, { status: 400 });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password && password.trim()) {
      hashedPassword = hashPassword(password.trim());
    }

    // Update the project sharing settings
    const updateData = {
      is_public: isPublic,
      share_password: hashedPassword
    };

    // If making public for the first time, ensure share_id exists
    if (isPublic) {
      const { data: existingProject } = await locals.supabase
        .from('projects')
        .select('share_id')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (!existingProject?.share_id) {
        // Generate new share_id if doesn't exist - use crypto.randomUUID instead of supabase function
        updateData.share_id = crypto.randomUUID();
      }
    }

    console.log('Updating project with data:', updateData);
    
    const { data: project, error } = await locals.supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select('id, name, description, share_id, is_public')
      .single();

    console.log('Project update result:', { project, error });

    if (error) {
      console.error('Error updating project sharing:', error);
      return json({ message: error.message }, { status: 500 });
    }

    if (!project) {
      return json({ message: 'Project not found or unauthorized' }, { status: 404 });
    }

    // Return project data without password hash
    return json({
      ...project,
      hasPassword: !!hashedPassword
    });
  } catch (error) {
    console.error('Unexpected error updating project sharing:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
};

export const GET = async ({ params, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ message: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    const { data: project, error } = await locals.supabase
      .from('projects')
      .select('id, name, share_id, is_public, share_password')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching project sharing:', error);
      return json({ message: error.message }, { status: 500 });
    }

    if (!project) {
      return json({ message: 'Project not found' }, { status: 404 });
    }

    return json({
      id: project.id,
      name: project.name,
      shareId: project.share_id,
      isPublic: project.is_public,
      hasPassword: !!project.share_password
    });
  } catch (error) {
    console.error('Unexpected error fetching project sharing:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
};

// Reset share link (generate new share_id)
export const POST = async ({ params, locals }) => {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ message: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;

    // Generate a new share_id
    const newShareId = crypto.randomUUID();
    
    const { data: project, error } = await locals.supabase
      .from('projects')
      .update({ share_id: newShareId })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select('id, name, share_id, is_public')
      .single();

    if (error) {
      console.error('Error resetting share link:', error);
      return json({ message: error.message }, { status: 500 });
    }

    if (!project) {
      return json({ message: 'Project not found or unauthorized' }, { status: 404 });
    }

    return json({
      id: project.id,
      name: project.name,
      shareId: project.share_id,
      isPublic: project.is_public
    });
  } catch (error) {
    console.error('Unexpected error resetting share link:', error);
    return json({ message: 'Internal server error' }, { status: 500 });
  }
};
