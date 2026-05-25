import { redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth/admin';
import { listUsers } from '$lib/server/auth.js';

export const load = async ({ locals }) => {
  // Check admin permissions
  const adminCheck = await isAdmin(locals.db, locals.user);
  if (!adminCheck.isAdmin) {
    throw redirect(303, '/');
  }

  try {
    const rawUsers = await listUsers(1, 1000);

    const users = rawUsers.map(user => {
      const meta = typeof user.user_metadata === 'string'
        ? JSON.parse(user.user_metadata)
        : user.user_metadata || {};
      return {
        id: user.id,
        email: user.email,
        full_name: meta.full_name || meta.name,
        created_at: user.created_at
      };
    });

    return { users };
  } catch (error) {
    console.error('Load error:', error);
    return { users: [] };
  }
};
