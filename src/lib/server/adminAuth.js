import { supabaseAdmin } from './supabaseAdmin.js';
import { json, error } from '@sveltejs/kit';

/**
 * Check if a user has admin permissions
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} Whether the user is an admin
 */
export async function isUserAdmin(userId, userEmail = null) {
  if (!userId) return false;
  
  // First check against hardcoded admin emails (for initial setup)
  const adminEmails = [
    'ry@nrwl.xyz', // Admin email
  ];
  
  // If we have the user's email directly, check it
  if (userEmail && adminEmails.includes(userEmail)) {
    return true;
  }
  
  try {
    const adminClient = supabaseAdmin();
    
    // Try to get user details to check metadata and email
    const { data: user, error: userError } = await adminClient.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      console.error('Error checking admin status:', userError?.message || 'User not found');
      // If we can't access admin functions, fall back to email check if available
      return userEmail ? adminEmails.includes(userEmail) : false;
    }
    
    // Check for admin flag in user metadata
    if (user.user_metadata?.admin === true || user.app_metadata?.admin === true) {
      return true;
    }
    
    // Check email against admin list
    return adminEmails.includes(user.email);
    
  } catch (err) {
    console.error('Admin check error:', err.message);
    // If admin client fails, fall back to email check if available
    return userEmail ? adminEmails.includes(userEmail) : false;
  }
}

/**
 * Middleware to check admin authentication
 * @param {Object} locals - SvelteKit locals object with user
 * @returns {Object|null} Error response if not admin, null if admin
 */
export async function requireAdmin(locals) {
  const user = locals.user;
  
  if (!user) {
    return error(401, { message: 'Authentication required' });
  }
  
  const isAdmin = await isUserAdmin(user.id, user.email);
  
  if (!isAdmin) {
    return error(403, { message: 'Admin access required' });
  }
  
  return null; // Success
}

/**
 * Set admin status for a user (use this to promote users to admin)
 * @param {string} userId - User ID to promote
 * @param {boolean} isAdmin - Whether to make them admin
 * @returns {Promise<boolean>} Success status
 */
export async function setUserAdminStatus(userId, isAdmin = true) {
  try {
    const adminClient = supabaseAdmin();
    
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      userId,
      {
        user_metadata: {
          admin: isAdmin
        }
      }
    );
    
    if (updateError) {
      console.error('Error setting admin status:', updateError);
      return false;
    }
    
    return true;
  } catch (err) {
    console.error('Error in setUserAdminStatus:', err);
    return false;
  }
}

/**
 * Get all admin users
 * @returns {Promise<Array>} List of admin users
 */
export async function getAdminUsers() {
  try {
    const adminClient = supabaseAdmin();
    
    // This is a simplified approach - in production you might want a dedicated admin table
    const { data: users, error: usersError } = await adminClient.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error listing users:', usersError);
      return [];
    }
    
    return users.users.filter(user => 
      user.user_metadata?.admin === true || 
      user.app_metadata?.admin === true
    );
    
  } catch (err) {
    console.error('Error getting admin users:', err);
    return [];
  }
}
