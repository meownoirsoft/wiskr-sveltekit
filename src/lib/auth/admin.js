import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

// Create supabase admin client with error handling
let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase environment variables:', {
        hasUrl: !!SUPABASE_URL,
        hasServiceKey: !!SUPABASE_SERVICE_ROLE_KEY
      });
      throw new Error('Missing required Supabase environment variables. Please check your .env file.');
    }
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  }
  return supabaseAdmin;
}

// Fallback admin emails for initial setup
const ADMIN_EMAILS = [
  'ry@nrwl.xyz'
];

/**
 * Check if a user has admin permissions
 * @param {any} supabase - Supabase client instance
 * @param {any} user - User object to check
 * @returns {Promise<{isAdmin: boolean, reason?: string}>} Admin check result
 */
export async function isAdmin(supabase, user) {
  if (!user) {
    return { isAdmin: false, reason: 'No user provided' };
  }

  try {
    // First check against hardcoded admin emails (fallback)
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      return { isAdmin: true, reason: 'Admin email whitelist' };
    }

    // Get admin client
    const adminClient = getSupabaseAdmin();
    
    // Try to get full user details with metadata
    const { data: fullUser, error } = await adminClient.auth.admin.getUserById(user.id);
    
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
 * @param {string} userId - User ID to retrieve
 * @returns {Promise<any|null>} User data or null if error
 */
export async function getAdminUser(userId) {
  try {
    const adminClient = getSupabaseAdmin();
    const { data, error } = await adminClient.auth.admin.getUserById(userId);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

/**
 * Update user metadata with admin client
 * @param {string} userId - User ID to update
 * @param {object} metadata - Metadata object to set
 * @returns {Promise<any|null>} Updated user data or null if error
 */
export async function updateUserMetadata(userId, metadata) {
  try {
    const adminClient = getSupabaseAdmin();
    const { data, error } = await adminClient.auth.admin.updateUserById(userId, {
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
 * @param {number} page - Page number (default: 1)
 * @param {number} perPage - Items per page (default: 50)
 * @returns {Promise<any|null>} Users list or null if error
 */
export async function listAllUsers(page = 1, perPage = 50) {
  try {
    const adminClient = getSupabaseAdmin();
    const { data, error } = await adminClient.auth.admin.listUsers({
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
 * @param {string} userId - User ID to delete
 * @returns {Promise<any|null>} Delete result or null if error
 */
export async function deleteUser(userId) {
  try {
    const adminClient = getSupabaseAdmin();
    const { data, error } = await adminClient.auth.admin.deleteUser(userId);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error deleting user:', error);
    return null;
  }
}
