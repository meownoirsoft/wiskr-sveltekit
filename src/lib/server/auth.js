/**
 * Self-hosted authentication module.
 * Replaces Supabase Auth with bcrypt password hashing + DB-backed sessions.
 */
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import sql from './db.js';

const SALT_ROUNDS = 12;
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

// ---------------------------------------------------------------------------
// Password helpers
// ---------------------------------------------------------------------------

export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

// ---------------------------------------------------------------------------
// User CRUD
// ---------------------------------------------------------------------------

export async function createUser({ email, password, user_metadata = {} }) {
  const passwordHash = await hashPassword(password);
  const id = randomUUID();

  const [user] = await sql`
    INSERT INTO users (id, email, password_hash, user_metadata, created_at)
    VALUES (${id}, ${email.toLowerCase()}, ${passwordHash}, ${JSON.stringify(user_metadata)}, NOW())
    RETURNING id, email, user_metadata, app_metadata, created_at
  `;

  return user;
}

export async function getUserByEmail(email) {
  const [user] = await sql`
    SELECT * FROM users WHERE email = ${email.toLowerCase()}
  `;
  return user || null;
}

export async function getUserById(userId) {
  const [user] = await sql`
    SELECT id, email, user_metadata, app_metadata, created_at FROM users WHERE id = ${userId}
  `;
  return user || null;
}

export async function updateUserMetadata(userId, metadata) {
  const [user] = await sql`
    UPDATE users
    SET user_metadata = user_metadata || ${JSON.stringify(metadata)}::jsonb
    WHERE id = ${userId}
    RETURNING id, email, user_metadata, app_metadata, created_at
  `;
  return user || null;
}

export async function updateAppMetadata(userId, metadata) {
  const [user] = await sql`
    UPDATE users
    SET app_metadata = app_metadata || ${JSON.stringify(metadata)}::jsonb
    WHERE id = ${userId}
    RETURNING id, email, user_metadata, app_metadata, created_at
  `;
  return user || null;
}

export async function listUsers(page = 1, perPage = 50) {
  const offset = (page - 1) * perPage;
  const users = await sql`
    SELECT id, email, user_metadata, app_metadata, created_at
    FROM users
    ORDER BY created_at DESC
    LIMIT ${perPage} OFFSET ${offset}
  `;
  return users;
}

export async function deleteUserById(userId) {
  await sql`DELETE FROM auth_sessions WHERE user_id = ${userId}`;
  await sql`DELETE FROM users WHERE id = ${userId}`;
}

// ---------------------------------------------------------------------------
// Session management
// ---------------------------------------------------------------------------

export async function createSession(userId) {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await sql`
    INSERT INTO auth_sessions (id, user_id, expires_at)
    VALUES (${sessionId}, ${userId}, ${expiresAt})
  `;

  return { sessionId, expiresAt };
}

export async function getSessionUser(sessionId) {
  if (!sessionId) return null;

  const [row] = await sql`
    SELECT u.id, u.email, u.user_metadata, u.app_metadata, u.created_at
    FROM auth_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ${sessionId}
      AND s.expires_at > NOW()
  `;

  return row || null;
}

export async function destroySession(sessionId) {
  if (!sessionId) return;
  await sql`DELETE FROM auth_sessions WHERE id = ${sessionId}`;
}

export async function cleanExpiredSessions() {
  await sql`DELETE FROM auth_sessions WHERE expires_at < NOW()`;
}

// ---------------------------------------------------------------------------
// OAuth user helpers (find or create by provider)
// ---------------------------------------------------------------------------

export async function findOrCreateOAuthUser({ email, provider, providerId, user_metadata = {} }) {
  // Try to find existing user by email
  let user = await getUserByEmail(email);

  if (!user) {
    // Create new user without password (OAuth-only)
    const id = randomUUID();
    const meta = { ...user_metadata, oauth_provider: provider, oauth_provider_id: providerId };

    const [newUser] = await sql`
      INSERT INTO users (id, email, password_hash, user_metadata, created_at)
      VALUES (${id}, ${email.toLowerCase()}, NULL, ${JSON.stringify(meta)}, NOW())
      RETURNING id, email, user_metadata, app_metadata, created_at
    `;
    user = newUser;
  } else {
    // Update metadata with latest provider info
    const updatedMeta = {
      ...(typeof user.user_metadata === 'string' ? JSON.parse(user.user_metadata) : user.user_metadata || {}),
      oauth_provider: provider,
      oauth_provider_id: providerId,
      ...user_metadata
    };
    await sql`
      UPDATE users SET user_metadata = ${JSON.stringify(updatedMeta)}::jsonb WHERE id = ${user.id}
    `;
    user.user_metadata = updatedMeta;
  }

  return user;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

export const SESSION_COOKIE_NAME = 'wiskr_session';

export function sessionCookieOptions(isProduction) {
  return {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SECONDS
  };
}
