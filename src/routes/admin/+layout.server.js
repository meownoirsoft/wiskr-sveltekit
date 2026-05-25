import { requireAdmin } from '$lib/server/adminAuth.js';
import sql from '$lib/server/db.js';

export async function load({ locals }) {
  const adminCheck = await requireAdmin(locals);
  if (adminCheck) {
    throw adminCheck;
  }

  try {
    const stats = {};

    try {
      const [row] = await sql`SELECT COUNT(*)::int AS count FROM users`;
      stats.users = row?.count ?? 0;
    } catch (err) {
      console.warn('Could not fetch user count:', err.message);
      stats.users = 0;
    }

    try {
      const [row] = await sql`SELECT COUNT(*)::int AS count FROM projects`;
      stats.projects = row?.count ?? 0;
    } catch (err) {
      console.warn('Could not fetch project count:', err.message);
      stats.projects = 0;
    }

    try {
      const [row] = await sql`SELECT COUNT(*)::int AS count FROM conversation_sessions`;
      stats.sessions = row?.count ?? 0;
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
      stats: { users: 0, projects: 0, sessions: 0 }
    };
  }
}
