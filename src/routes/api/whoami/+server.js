import { json } from '@sveltejs/kit';
export const GET = async ({ locals }) => {
  const { data: { user } } = await locals.supabase.auth.getUser();
  return json({ user });
};