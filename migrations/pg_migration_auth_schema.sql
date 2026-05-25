-- pg-migration: self-hosted auth schema
-- Replaces Supabase's built-in auth.users with an app-managed users table.
-- Run once against the target database before deploying the pg-migration branch.

-- ---------------------------------------------------------------------------
-- Users table (replaces auth.users)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           TEXT UNIQUE NOT NULL,
  password_hash   TEXT,                          -- NULL for OAuth-only accounts
  user_metadata   JSONB NOT NULL DEFAULT '{}',
  app_metadata    JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (email);

-- ---------------------------------------------------------------------------
-- Sessions table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_sessions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);

-- ---------------------------------------------------------------------------
-- Profiles table (tier / subscription info, keyed to our users table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tier            INTEGER NOT NULL DEFAULT 0,
  trial_ends_at   TIMESTAMPTZ,
  stripe_customer_id  TEXT,
  stripe_subscription_id TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles (user_id);
