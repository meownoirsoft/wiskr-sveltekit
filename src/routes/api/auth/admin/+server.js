import { json } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth/admin.js';

/**
 * Check if current user has admin permissions
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ locals }) {
  try {
    const user = locals.user;
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isAdmin: adminStatus, reason } = await isAdmin(locals.db, user);

    return json({ 
      isAdmin: adminStatus,
      reason,
      user: {
        id: user.id,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Admin check API error:', error);
    return json({ error: 'Internal server error', isAdmin: false }, { status: 500 });
  }
}
