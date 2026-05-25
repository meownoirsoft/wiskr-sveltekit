import sql from './db.js';
import { error } from '@sveltejs/kit';

const ADMIN_EMAILS = [
  'ry@nrwl.xyz',
];

/**
 * Check if a user has admin permissions
 * @param {string} userId - The user ID to check
 * @returns {Promise<boolean>} Whether the user is an admin
 */
export async function isUserAdmin(userId, userEmail = null) {
  if (!userId) return false;

  // Fast path: caller already provided the email
  if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
    return true;
  }

  try {
    const [user] = await sql`
      SELECT email, user_metadata, app_metadata
      FROM users WHERE id = ${userId}
    `;

    if (!user) {
      return userEmail ? ADMIN_EMAILS.includes(userEmail) : false;
    }

    const meta = typeof user.user_metadata === 'string'
      ? JSON.parse(user.user_metadata)
      : user.user_metadata || {};
    const appMeta = typeof user.app_metadata === 'string'
      ? JSON.parse(user.app_metadata)
      : user.app_metadata || {};

    if (meta.admin === true || appMeta.admin === true) {
      return true;
    }

    return ADMIN_EMAILS.includes(user.email);
  } catch (err) {
    console.error('Admin check error:', err.message);
    return userEmail ? ADMIN_EMAILS.includes(userEmail) : false;
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

  return null;
}

/**
 * Set admin status for a user (use this to promote users to admin)
 * @param {string} userId - User ID to promote
 * @param {boolean} isAdmin - Whether to make them admin
 * @returns {Promise<boolean>} Success status
 */
export async function setUserAdminStatus(userId, isAdmin = true) {
  try {
    await sql`
      UPDATE users
      SET user_metadata = COALESCE(user_metadata, '{}'::jsonb) || ${JSON.stringify({ admin: isAdmin })}::jsonb
      WHERE id = ${userId}
    `;
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
    const users = await sql`
      SELECT id, email, user_metadata, app_metadata, created_at
      FROM users
      WHERE (user_metadata->>'admin')::boolean = true
         OR (app_metadata->>'admin')::boolean = true
         OR email = ANY(${ADMIN_EMAILS})
    `;
    return users;
  } catch (err) {
    console.error('Error getting admin users:', err);
    return [];
  }
}
