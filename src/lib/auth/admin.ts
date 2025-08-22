import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Fallback admin emails for initial setup
const ADMIN_EMAILS = [
  'ry@nrwl.xyz'
];

/**
 * Check if a user has admin permissions
 */
export async function isAdmin(supabase: any, user: any): Promise<{ isAdmin: boolean; reason?: string }> {
  if (!user) {
    return { isAdmin: false, reason: 'No user provided' };
  }

  try {
    // First check against hardcoded admin emails (fallback)
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      return { isAdmin: true, reason: 'Admin email whitelist' };
    }

    // Try to get full user details with metadata
    const { data: fullUser, error } = await supabaseAdmin.auth.admin.getUserById(user.id);
    
    if (error) {
      console.error('Admin check error:', error.message);
      // Fall back to email check if admin API fails
      return { 
        isAdmin: user.email && ADMIN_EMAILS.includes(user.email),
        reason: 'Fallback email check due to admin API error' 
      };
    }

    // Check user metadata for admin flag
    if (fullUser?.user_metadata?.is_admin === true) {
      return { isAdmin: true, reason: 'User metadata admin flag' };
    }

    // Check app metadata for admin flag
    if (fullUser?.app_metadata?.is_admin === true) {
      return { isAdmin: true, reason: 'App metadata admin flag' };
    }

    // Final fallback to email check
    if (fullUser?.email && ADMIN_EMAILS.includes(fullUser.email)) {
      return { isAdmin: true, reason: 'Admin email match' };
    }

    return { isAdmin: false, reason: 'No admin permissions found' };

  } catch (error) {
    console.error('Exception in admin check:', error);
    // Fall back to email check on any error
    return { 
      isAdmin: user.email && ADMIN_EMAILS.includes(user.email),
      reason: 'Fallback email check due to exception' 
    };
  }
}

/**
 * Get user by ID with admin client
 */
export async function getAdminUser(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

/**
 * Update user metadata with admin client
 */
export async function updateUserMetadata(userId: string, metadata: Record<string, any>) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: metadata
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return null;
  }
}

/**
 * List all users with admin client
 */
export async function listAllUsers(page = 1, perPage = 50) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error listing users:', error);
    return null;
  }
}

/**
 * Delete user with admin client
 */
export async function deleteUser(userId: string) {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting user:', error);
    return null;
  }
}
