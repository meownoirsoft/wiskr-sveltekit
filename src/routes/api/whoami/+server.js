import { json } from '@sveltejs/kit';
export const GET = async ({ locals }) => {
  const user = locals.user;
  return json({ user });
};