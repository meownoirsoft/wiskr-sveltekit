import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { isAdmin } from '$lib/auth/admin';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export const load: PageServerLoad = async ({ locals }) => {
  // Check admin permissions
  const adminCheck = await isAdmin(locals.supabase, locals.user);
  if (!adminCheck.isAdmin) {
    throw redirect(303, '/');
  }

  try {
    // Fetch all users for target selection from auth
    const { data: authResponse, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching users:', error);
      return {
        users: []
      };
    }

    const users = (authResponse?.users || []).map(user => ({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name,
      created_at: user.created_at
    }));

    return {
      users: users
    };
  } catch (error) {
    console.error('Load error:', error);
    return {
      users: []
    };
  }
};
