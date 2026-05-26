-- pg-migration: full application schema
-- Run AFTER pg_migration_auth_schema.sql (users, auth_sessions, profiles already exist).
-- Tables ordered to satisfy foreign key dependencies.

-- pgvector extension (needed for embedding columns)
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- personas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS personas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  style_json  JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS personas_user_id_idx ON personas(user_id);

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  persona_id   UUID REFERENCES personas(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  icon         TEXT NOT NULL DEFAULT '🌐',
  color        TEXT NOT NULL DEFAULT '#6366f1',
  brief_text   TEXT NOT NULL DEFAULT '',
  description  TEXT NOT NULL DEFAULT '',
  share_id     UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  share_password TEXT,
  is_public    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS projects_user_id_idx   ON projects(user_id);
CREATE INDEX IF NOT EXISTS projects_share_id_idx  ON projects(share_id);
CREATE INDEX IF NOT EXISTS projects_is_public_idx ON projects(is_public) WHERE is_public = TRUE;

-- ---------------------------------------------------------------------------
-- conversation_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_name    TEXT NOT NULL,
  session_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  topic_summary   TEXT,
  message_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS conv_sessions_project_id_idx ON conversation_sessions(project_id);
CREATE INDEX IF NOT EXISTS conv_sessions_date_idx       ON conversation_sessions(project_id, session_date DESC);

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id        UUID REFERENCES conversation_sessions(id) ON DELETE SET NULL,
  branch_id         TEXT NOT NULL DEFAULT 'main',
  role              TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content           TEXT NOT NULL,
  model_key         TEXT,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  branch_point      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS messages_project_id_idx  ON messages(project_id);
CREATE INDEX IF NOT EXISTS messages_session_id_idx  ON messages(session_id);
CREATE INDEX IF NOT EXISTS messages_branch_idx      ON messages(project_id, branch_id);
CREATE INDEX IF NOT EXISTS messages_created_at_idx  ON messages(created_at);

-- ---------------------------------------------------------------------------
-- conversation_branches
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversation_branches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  session_id        UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  branch_id         TEXT NOT NULL,
  branch_name       TEXT NOT NULL,
  parent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  color_index       INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, branch_id)
);
CREATE INDEX IF NOT EXISTS conv_branches_project_id_idx ON conversation_branches(project_id);
CREATE INDEX IF NOT EXISTS conv_branches_session_id_idx ON conversation_branches(session_id);

-- ---------------------------------------------------------------------------
-- cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  content           TEXT NOT NULL DEFAULT '',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  rarity            TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common','special','rare','legendary')),
  progress          INTEGER NOT NULL DEFAULT 1,
  mana_cost         INTEGER NOT NULL DEFAULT 1,
  art_url           TEXT,
  generation_model  TEXT,
  art_model         TEXT,
  pinned            BOOLEAN NOT NULL DEFAULT FALSE,
  embedding         VECTOR(1536),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS cards_project_id_idx ON cards(project_id);
CREATE INDEX IF NOT EXISTS cards_user_id_idx    ON cards(user_id);
CREATE INDEX IF NOT EXISTS cards_pinned_idx     ON cards(project_id, pinned) WHERE pinned = TRUE;
CREATE INDEX IF NOT EXISTS cards_created_at_idx ON cards(created_at);

-- ---------------------------------------------------------------------------
-- card_chunks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS card_chunks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id      UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  chunk_index  INTEGER NOT NULL,
  content      TEXT NOT NULL,
  embedding    VECTOR(1536),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(card_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS card_chunks_card_id_idx ON card_chunks(card_id);

-- ---------------------------------------------------------------------------
-- facts
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL DEFAULT 'term',
  key         TEXT NOT NULL,
  value       TEXT NOT NULL,
  embedding   VECTOR(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, type, key)
);
CREATE INDEX IF NOT EXISTS facts_project_id_idx ON facts(project_id);
CREATE INDEX IF NOT EXISTS facts_type_idx        ON facts(project_id, type);

-- ---------------------------------------------------------------------------
-- project_fact_types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_fact_types (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type_key     TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color_class  TEXT NOT NULL DEFAULT 'bg-gray-100 text-gray-700',
  sort_order   INTEGER NOT NULL DEFAULT 0,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, type_key)
);
CREATE INDEX IF NOT EXISTS project_fact_types_project_id_idx ON project_fact_types(project_id);

-- ---------------------------------------------------------------------------
-- docs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS docs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  tags        TEXT[] NOT NULL DEFAULT '{}',
  pinned      BOOLEAN NOT NULL DEFAULT FALSE,
  embedding   VECTOR(1536),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS docs_project_id_idx ON docs(project_id);
CREATE INDEX IF NOT EXISTS docs_pinned_idx     ON docs(project_id, pinned) WHERE pinned = TRUE;

-- ---------------------------------------------------------------------------
-- decks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS decks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS decks_project_id_idx ON decks(project_id);

-- ---------------------------------------------------------------------------
-- deck_cards (junction: decks ↔ cards)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS deck_cards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id     UUID NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  card_id     UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  position    INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(deck_id, card_id)
);
CREATE INDEX IF NOT EXISTS deck_cards_deck_id_idx ON deck_cards(deck_id);
CREATE INDEX IF NOT EXISTS deck_cards_card_id_idx ON deck_cards(card_id);

-- ---------------------------------------------------------------------------
-- entity_cards
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  entity_name       TEXT NOT NULL,
  entity_type       TEXT NOT NULL,
  summary           TEXT NOT NULL,
  summary_tokens    INTEGER NOT NULL DEFAULT 0,
  fact_count        INTEGER NOT NULL DEFAULT 0,
  confidence_score  FLOAT NOT NULL DEFAULT 0,
  embedding         VECTOR(1536),
  last_facts_check  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, entity_name, entity_type)
);
CREATE INDEX IF NOT EXISTS entity_cards_project_id_idx ON entity_cards(project_id);
CREATE INDEX IF NOT EXISTS entity_cards_type_idx        ON entity_cards(entity_type);

-- ---------------------------------------------------------------------------
-- entity_card_cards (junction: entity_cards ↔ cards)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS entity_card_cards (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_card_id UUID NOT NULL REFERENCES entity_cards(id) ON DELETE CASCADE,
  card_id        UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entity_card_id, card_id)
);
CREATE INDEX IF NOT EXISTS entity_card_cards_entity_id_idx ON entity_card_cards(entity_card_id);
CREATE INDEX IF NOT EXISTS entity_card_cards_card_id_idx   ON entity_card_cards(card_id);

-- ---------------------------------------------------------------------------
-- ideas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ideas (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  text        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, text)
);
CREATE INDEX IF NOT EXISTS ideas_project_id_idx ON ideas(project_id);
CREATE INDEX IF NOT EXISTS ideas_created_at_idx ON ideas(created_at);

-- ---------------------------------------------------------------------------
-- project_questions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_questions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  question     TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS project_questions_project_id_idx ON project_questions(project_id);

-- ---------------------------------------------------------------------------
-- user_preferences
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  max_related_ideas   INTEGER NOT NULL DEFAULT 8,
  accent_color        TEXT NOT NULL DEFAULT '#155DFC',
  display_name        TEXT,
  avatar_type         TEXT NOT NULL DEFAULT 'default',
  avatar_value        TEXT,
  cards_grid_size     INTEGER NOT NULL DEFAULT 3,
  facts_grid_size     INTEGER NOT NULL DEFAULT 4,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- usage_logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usage_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  model       TEXT,
  tokens_in   INTEGER NOT NULL DEFAULT 0,
  tokens_out  INTEGER NOT NULL DEFAULT 0,
  cost_usd    NUMERIC(10,6) NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS usage_logs_user_id_idx    ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS usage_logs_project_id_idx ON usage_logs(project_id);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON usage_logs(created_at);
