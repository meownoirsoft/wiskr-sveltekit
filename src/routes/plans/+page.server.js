import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
  // Get the current user from the session
  const user = locals.user;
  
  return {
    user: user || null
  };
}
