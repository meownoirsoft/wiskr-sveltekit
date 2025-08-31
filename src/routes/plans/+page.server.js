import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  // Get the current user from the session
  const { data: { user } } = await locals.supabase.auth.getUser();
  
  return {
    user: user || null
  };
}
