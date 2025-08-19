import { error, redirect } from '@sveltejs/kit';
import { createHmac } from 'crypto';

// Verify password
function verifyPassword(inputPassword, storedHash) {
  if (!storedHash) return !inputPassword; // No password required if none set
  if (!inputPassword) return false; // Password required but none provided
  
  const [salt, hash] = storedHash.split(':');
  const inputHash = createHmac('sha256', salt).update(inputPassword).digest('hex');
  return hash === inputHash;
}

export async function load({ params, url, locals, cookies }) {
  const { shareId } = params;
  const providedPassword = url.searchParams.get('password') || cookies.get(`share_password_${shareId}`);

  try {
    // Fetch the shared project (RLS policy allows public access to is_public=true projects)
    const { data: project, error: projectError } = await locals.supabase
      .from('projects')
      .select('id, name, description, icon, color, brief_text, created_at, share_password, user_id')
      .eq('share_id', shareId)
      .eq('is_public', true)
      .single();

    if (projectError || !project) {
      throw error(404, 'Project not found or not shared');
    }

    // Check password if required
    if (project.share_password) {
      if (!verifyPassword(providedPassword, project.share_password)) {
        return {
          needsPassword: true,
          projectName: project.name
        };
      } else {
        // Set password cookie for subsequent visits
        cookies.set(`share_password_${shareId}`, providedPassword, {
          path: `/shared/${shareId}`,
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
      }
    }

    // Fetch conversation sessions for the project
    console.log('Fetching sessions for project_id:', project.id);
    
    // First, let's try a simple query without joins to see if sessions exist
    const { data: simpleSessions, error: simpleError } = await locals.supabase
      .from('conversation_sessions')
      .select('id, created_at')
      .eq('project_id', project.id);
    
    console.log('Simple sessions query:', { sessions: simpleSessions, error: simpleError });
    
    // Now try the full query
    const { data: sessions, error: sessionsError } = await locals.supabase
      .from('conversation_sessions')
      .select(`
        id,
        created_at,
        conversation_branches (
          id,
          created_at,
          parent_branch_id,
          messages (
            id,
            role,
            content,
            created_at,
            branch_id
          )
        )
      `)
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });

    console.log('Full sessions query result:', { sessions, error: sessionsError });
    console.log('Number of sessions found:', sessions?.length || 0);
    
    // Let's also check if there are ANY sessions in the database
    const { data: allSessions, error: allSessionsError } = await locals.supabase
      .from('conversation_sessions')
      .select('id, project_id')
      .limit(10);
    
    console.log('All sessions in database (first 10):', { sessions: allSessions, error: allSessionsError });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      // Don't throw error, just show empty sessions
    }

    // Fetch project owner info for attribution
    const { data: owner } = await locals.supabase
      .from('profiles') // Assuming you have a profiles table
      .select('full_name, avatar_url')
      .eq('id', project.user_id)
      .single();

    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        icon: project.icon,
        color: project.color,
        briefText: project.brief_text,
        createdAt: project.created_at,
        owner: owner || null
      },
      sessions: sessions || [],
      isShared: true,
      shareId,
      needsPassword: false
    };
  } catch (err) {
    console.error('Error loading shared project:', err);
    throw error(500, 'Failed to load shared project');
  }
}

export const actions = {
  verifyPassword: async ({ params, request, locals, cookies }) => {
    const { shareId } = params;
    const data = await request.formData();
    const password = data.get('password');

    try {
      // Fetch the project to verify password
      const { data: project, error: projectError } = await locals.supabase
        .from('projects')
        .select('share_password')
        .eq('share_id', shareId)
        .eq('is_public', true)
        .single();

      if (projectError || !project) {
        throw error(404, 'Project not found');
      }

      if (verifyPassword(password, project.share_password)) {
        // Set password cookie
        cookies.set(`share_password_${shareId}`, password, {
          path: `/shared/${shareId}`,
          maxAge: 60 * 60 * 24 * 30, // 30 days
          httpOnly: true,
          secure: true,
          sameSite: 'lax'
        });
        
        // Redirect to remove password from URL
        throw redirect(302, `/shared/${shareId}`);
      } else {
        return {
          error: 'Incorrect password'
        };
      }
    } catch (err) {
      if (err.status) throw err; // Re-throw redirect
      console.error('Password verification error:', err);
      return {
        error: 'Failed to verify password'
      };
    }
  }
};
