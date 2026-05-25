import { redirect } from '@sveltejs/kit';
import {
  exchangeGoogleCode, getGoogleUser,
  exchangeDiscordCode, getDiscordUser
} from '$lib/server/oauth.js';
import { findOrCreateOAuthUser, createSession, SESSION_COOKIE_NAME, sessionCookieOptions } from '$lib/server/auth.js';

export async function GET({ url, cookies }) {
  const provider = url.searchParams.get('provider');
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');

  const savedState = cookies.get('oauth_state');
  const next = cookies.get('oauth_next') || '/projects';

  // Clean up state cookies
  cookies.delete('oauth_state', { path: '/' });
  cookies.delete('oauth_next', { path: '/' });

  if (errorParam) {
    throw redirect(303, `/login?error=${encodeURIComponent(errorParam)}`);
  }

  if (!code) {
    throw redirect(303, '/login?error=No+authorization+code+received');
  }

  if (!state || state !== savedState) {
    throw redirect(303, '/login?error=Invalid+OAuth+state');
  }

  try {
    const redirectUri = `${url.origin}/api/auth/callback?provider=${provider}`;
    let email, name, picture, providerId;

    if (provider === 'google') {
      const tokens = await exchangeGoogleCode(code, redirectUri);
      const googleUser = await getGoogleUser(tokens.access_token);
      email = googleUser.email;
      name = googleUser.name;
      picture = googleUser.picture;
      providerId = googleUser.id;
    } else if (provider === 'discord') {
      const tokens = await exchangeDiscordCode(code, redirectUri);
      const discordUser = await getDiscordUser(tokens.access_token);
      email = discordUser.email;
      name = discordUser.username;
      picture = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;
      providerId = discordUser.id;
    } else {
      throw redirect(303, '/login?error=Unknown+OAuth+provider');
    }

    if (!email) {
      throw redirect(303, '/login?error=No+email+returned+from+provider');
    }

    const user = await findOrCreateOAuthUser({
      email,
      provider,
      providerId,
      user_metadata: { full_name: name, avatar_url: picture }
    });

    const { sessionId } = await createSession(user.id);
    const isProduction = process.env.NODE_ENV === 'production';
    cookies.set(SESSION_COOKIE_NAME, sessionId, sessionCookieOptions(isProduction));

    throw redirect(303, next);
  } catch (err) {
    if (err?.status === 303 || err?.status === 302) throw err;
    console.error('OAuth callback error:', err);
    throw redirect(303, `/login?error=${encodeURIComponent(err.message || 'Authentication failed')}`);
  }
}
