-- Add avatar fields to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20) DEFAULT 'default' CHECK (avatar_type IN ('default', 'premade', 'custom')),
ADD COLUMN IF NOT EXISTS avatar_value TEXT; -- URL for custom uploads, filename for premade avatars

COMMENT ON COLUMN user_preferences.avatar_type IS 'Type of avatar: default (no custom avatar), premade (selected from static files), custom (uploaded by user)';
COMMENT ON COLUMN user_preferences.avatar_value IS 'For premade: filename (e.g., avatar-1.png), for custom: upload URL/path, for default: null';
