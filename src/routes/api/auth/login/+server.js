import { json } from '@sveltejs/kit';
import { getUserByEmail, verifyPassword, createSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user || !user.password_hash) {
      return json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const { sessionId } = await createSession(user.id);
    const isProduction = process.env.NODE_ENV === 'production';
    cookies.set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(isProduction));

    return json({
      user: { id: user.id, email: user.email, user_metadata: user.user_metadata }
    });
  } catch (err) {
    console.error('Login error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
