import { json } from '@sveltejs/kit';
import sql from '$lib/server/db.js';
import { isAdmin, updateUserMetadata, deleteUser as deleteUserHelper } from '$lib/auth/admin.js';

// GET - List users with stats
export async function GET({ locals, url }) {
  try {
    const user = locals.user;
    if (!user) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const adminCheck = await isAdmin(null, user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search');

    // Build user query with search, pagination, and stats in one go
    let users;
    if (search) {
      const pattern = `%${search}%`;
      users = await sql`
        SELECT
          u.id,
          u.email,
          u.user_metadata,
          u.app_metadata,
          u.created_at,
          COALESCE(p.tier, 0)            AS tier,
          p.trial_ends_at,
          COALESCE(pc.project_count, 0)  AS project_count
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS project_count
          FROM projects pr WHERE pr.user_id = u.id
        ) pc ON true
        WHERE u.email ILIKE ${pattern}
           OR u.user_metadata->>'full_name' ILIKE ${pattern}
           OR u.user_metadata->>'name' ILIKE ${pattern}
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    } else {
      users = await sql`
        SELECT
          u.id,
          u.email,
          u.user_metadata,
          u.app_metadata,
          u.created_at,
          COALESCE(p.tier, 0)            AS tier,
          p.trial_ends_at,
          COALESCE(pc.project_count, 0)  AS project_count
        FROM users u
        LEFT JOIN profiles p ON p.user_id = u.id
        LEFT JOIN LATERAL (
          SELECT COUNT(*)::int AS project_count
          FROM projects pr WHERE pr.user_id = u.id
        ) pc ON true
        ORDER BY u.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;
    }

    // Get total count (with or without search filter)
    let totalCount;
    if (search) {
      const pattern = `%${search}%`;
      const [row] = await sql`
        SELECT COUNT(*)::int AS count FROM users
        WHERE email ILIKE ${pattern}
           OR user_metadata->>'full_name' ILIKE ${pattern}
           OR user_metadata->>'name' ILIKE ${pattern}
      `;
      totalCount = row?.count ?? 0;
    } else {
      const [row] = await sql`SELECT COUNT(*)::int AS count FROM users`;
      totalCount = row?.count ?? 0;
    }

    const mapped = users.map(u => {
      const meta = typeof u.user_metadata === 'string'
        ? JSON.parse(u.user_metadata)
        : u.user_metadata || {};

      return {
        id: u.id,
        email: u.email,
        full_name: meta.full_name || meta.name || null,
        created_at: u.created_at,
        is_admin: meta.is_admin || false,
        project_count: u.project_count,
        tier: u.tier,
        trial_ends_at: u.trial_ends_at || null,
        user_metadata: meta
      };
    });

    return json({ users: mapped, total: totalCount, limit, offset });
  } catch (error) {
    console.error('User list error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create or update user metadata
export async function POST({ request, locals }) {
  try {
    const user = locals.user;
    if (!user) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }

    const adminCheck = await isAdmin(null, user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, action, data: updateData } = await request.json();

    if (!userId || !action) {
      return json({ error: 'User ID and action are required' }, { status: 400 });
    }

    switch (action) {
      case 'update_profile': {
        const result = await updateUserMetadata(userId, {
          ...(updateData.currentMetadata || {}),
          full_name: updateData.full_name
        });
        if (!result) {
          return json({ error: 'Failed to update profile' }, { status: 500 });
        }
        return json({ success: true, message: 'Profile updated successfully' });
      }

      case 'set_admin': {
        const result = await updateUserMetadata(userId, {
          ...(updateData.currentMetadata || {}),
          is_admin: updateData.is_admin
        });
        if (!result) {
          return json({ error: 'Failed to update admin status' }, { status: 500 });
        }
        return json({ success: true, message: 'Admin status updated successfully' });
      }

      case 'delete_user': {
        // Delete contexts for user's projects first
        const projects = await sql`
          SELECT id FROM projects WHERE user_id = ${userId}
        `;

        if (projects.length > 0) {
          const projectIds = projects.map(p => p.id);
          await sql`DELETE FROM contexts WHERE project_id = ANY(${projectIds})`;
          await sql`DELETE FROM projects WHERE user_id = ${userId}`;
        }

        // Delete user and sessions via auth helper
        const result = await deleteUserHelper(userId);
        if (!result) {
          return json({ error: 'Failed to delete user' }, { status: 500 });
        }
        return json({ success: true, message: 'User deleted successfully' });
      }

      case 'change_tier': {
        const { tier, trial_ends_at } = updateData;

        if (tier === undefined || tier < 0 || tier > 2) {
          return json({ error: 'Invalid tier value' }, { status: 400 });
        }

        // Upsert into profiles
        await sql`
          INSERT INTO profiles (user_id, tier, trial_ends_at)
          VALUES (${userId}, ${tier}, ${trial_ends_at || null})
          ON CONFLICT (user_id)
          DO UPDATE SET tier = ${tier}, trial_ends_at = ${trial_ends_at || null}
        `;

        // Also store tier in user metadata for quick access
        await updateUserMetadata(userId, {
          ...(updateData.currentMetadata || {}),
          tier,
          trial_ends_at: trial_ends_at || null
        });

        return json({ success: true, message: 'User tier updated successfully' });
      }

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('User action error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
