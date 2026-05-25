import { redirect } from '@sveltejs/kit';
import { destroySession, SESSION_COOKIE_NAME } from '$lib/server/auth.js';

export const GET = async ({ cookies }) => {
  const sessionId = cookies.get(SESSION_COOKIE_NAME);
  await destroySession(sessionId);
  cookies.delete(SESSION_COOKIE_NAME, { path: '/' });

  throw redirect(302, '/login');
};
