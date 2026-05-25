import { json } from '@sveltejs/kit';
import { createUser, getUserByEmail, createSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '$lib/server/auth.js';

export async function POST({ request, cookies }) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return json({ error: 'Email and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    // Check if user already exists
    const existing = await getUserByEmail(email);
    if (existing) {
      return json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const user = await createUser({ email, password });
    const { sessionId } = await createSession(user.id);
    const isProduction = process.env.NODE_ENV === 'production';
    cookies.set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(isProduction));

    return json({
      user: { id: user.id, email: user.email, user_metadata: user.user_metadata }
    });
  } catch (err) {
    console.error('Signup error:', err);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
