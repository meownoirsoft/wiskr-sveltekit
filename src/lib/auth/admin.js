import {
  getUserById,
  updateUserMetadata as updateMeta,
  listUsers,
  deleteUserById
} from '$lib/server/auth.js';

// Fallback admin emails for initial setup
const ADMIN_EMAILS = [
  'ry@nrwl.xyz'
];

/**
 * Check if a user has admin permissions
 * @param {any} _db - DB client (unused, kept for call-site compat)
 * @param {any} user - User object to check
 * @returns {Promise<{isAdmin: boolean, reason?: string}>}
 */
export async function isAdmin(_db, user) {
  if (!user) {
    return { isAdmin: false, reason: 'No user provided' };
  }

  try {
    if (user.email && ADMIN_EMAILS.includes(user.email)) {
      return { isAdmin: true, reason: 'Admin email whitelist' };
    }

    const fullUser = await getUserById(user.id);
    if (!fullUser) {
      return {
        isAdmin: user.email && ADMIN_EMAILS.includes(user.email),
        reason: 'Fallback email check — user not found'
      };
    }

    const meta = typeof fullUser.user_metadata === 'string'
      ? JSON.parse(fullUser.user_metadata)
      : fullUser.user_metadata || {};
    const appMeta = typeof fullUser.app_metadata === 'string'
      ? JSON.parse(fullUser.app_metadata)
      : fullUser.app_metadata || {};

    if (meta.is_admin === true) {
      return { isAdmin: true, reason: 'User metadata admin flag' };
    }
    if (appMeta.is_admin === true) {
      return { isAdmin: true, reason: 'App metadata admin flag' };
    }
    if (fullUser.email && ADMIN_EMAILS.includes(fullUser.email)) {
      return { isAdmin: true, reason: 'Admin email match' };
    }

    return { isAdmin: false, reason: 'No admin permissions found' };
  } catch (error) {
    console.error('Exception in admin check:', error);
    return {
      isAdmin: user.email && ADMIN_EMAILS.includes(user.email),
      reason: 'Fallback email check due to exception'
    };
  }
}

/**
 * Get user by ID
 */
export async function getAdminUser(userId) {
  try {
    return await getUserById(userId);
  } catch (error) {
    console.error('Error getting admin user:', error);
    return null;
  }
}

/**
 * Update user metadata
 */
export async function updateUserMetadata(userId, metadata) {
  try {
    return await updateMeta(userId, metadata);
  } catch (error) {
    console.error('Error updating user metadata:', error);
    return null;
  }
}

/**
 * List all users
 */
export async function listAllUsers(page = 1, perPage = 50) {
  try {
    return await listUsers(page, perPage);
  } catch (error) {
    console.error('Error listing users:', error);
    return null;
  }
}

/**
 * Delete user
 */
export async function deleteUser(userId) {
  try {
    await deleteUserById(userId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return null;
  }
}
