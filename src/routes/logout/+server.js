import { redirect } from '@sveltejs/kit';

export const GET = async ({ locals, cookies }) => {
  // Clear the cached session
  cookies.delete('sb-session', { path: '/' });
  
  // Sign out from Supabase
  await locals.supabase.auth.signOut();
  
  throw redirect(302, '/login');
};