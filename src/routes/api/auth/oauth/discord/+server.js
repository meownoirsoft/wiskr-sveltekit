import { redirect } from '@sveltejs/kit';
import { getDiscordAuthUrl, generateState } from '$lib/server/oauth.js';

export async function GET({ url, cookies }) {
  const state = generateState();
  const redirectUri = `${url.origin}/api/auth/callback?provider=discord`;

  cookies.set('oauth_state', state, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10
  });

  const next = url.searchParams.get('next') || '/projects';
  cookies.set('oauth_next', next, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10
  });

  throw redirect(302, getDiscordAuthUrl(redirectUri, state));
}
