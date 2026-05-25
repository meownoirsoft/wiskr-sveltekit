/**
 * OAuth2 flows for Google and Discord.
 * Uses direct HTTP requests — no external OAuth library needed.
 */
import { randomBytes } from 'crypto';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET
} from '$env/static/private';

// ---------------------------------------------------------------------------
// State / PKCE helpers
// ---------------------------------------------------------------------------

export function generateState() {
  return randomBytes(32).toString('hex');
}

// ---------------------------------------------------------------------------
// Google OAuth2
// ---------------------------------------------------------------------------

export function getGoogleAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'offline',
    prompt: 'consent'
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeGoogleCode(code, redirectUri) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed: ${text}`);
  }

  return res.json(); // { access_token, id_token, refresh_token, ... }
}

export async function getGoogleUser(accessToken) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) throw new Error('Failed to fetch Google user info');
  return res.json(); // { id, email, name, picture, ... }
}

// ---------------------------------------------------------------------------
// Discord OAuth2
// ---------------------------------------------------------------------------

export function getDiscordAuthUrl(redirectUri, state) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'identify email',
    state,
    prompt: 'consent'
  });
  return `https://discord.com/api/oauth2/authorize?${params}`;
}

export async function exchangeDiscordCode(code, redirectUri) {
  const res = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: DISCORD_CLIENT_ID,
      client_secret: DISCORD_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code'
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${text}`);
  }

  return res.json(); // { access_token, token_type, ... }
}

export async function getDiscordUser(accessToken) {
  const res = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!res.ok) throw new Error('Failed to fetch Discord user info');
  return res.json(); // { id, email, username, avatar, ... }
}
