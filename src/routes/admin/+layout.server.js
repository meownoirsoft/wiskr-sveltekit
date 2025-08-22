import { requireAdmin } from '$lib/server/adminAuth.js';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.js';

export async function load({ locals }) {
  // Check admin permissions
  const adminCheck = await requireAdmin(locals);
  if (adminCheck) {
    // If adminCheck is not null, it's an error response
    throw adminCheck;
  }

  try {
    const adminClient = supabaseAdmin();
    
    // Fetch basic stats for the sidebar
    const stats = {};
    
    // Get user count
    try {
      const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();
      if (!usersError && users) {
        stats.users = users.users.length;
      }
    } catch (err) {
      console.warn('Could not fetch user count:', err.message);
      stats.users = 0;
    }

    // Get project count
    try {
      const { count: projectCount, error: projectError } = await adminClient
        .from('projects')
        .select('*', { count: 'exact', head: true });
      
      if (!projectError) {
        stats.projects = projectCount || 0;
      }
    } catch (err) {
      console.warn('Could not fetch project count:', err.message);
      stats.projects = 0;
    }

    // Get session count
    try {
      const { count: sessionCount, error: sessionError } = await adminClient
        .from('conversation_sessions')
        .select('*', { count: 'exact', head: true });
      
      if (!sessionError) {
        stats.sessions = sessionCount || 0;
      }
    } catch (err) {
      console.warn('Could not fetch session count:', err.message);
      stats.sessions = 0;
    }

    return {
      user: locals.user,
      stats
    };
  } catch (error) {
    console.error('Admin layout load error:', error);
    
    return {
      user: locals.user,
      stats: {
        users: 0,
        projects: 0,
        sessions: 0
      }
    };
  }
}
