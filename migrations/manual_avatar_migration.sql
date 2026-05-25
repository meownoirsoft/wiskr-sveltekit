-- Add avatar fields to user_preferences table
-- Run this in your Supabase Dashboard -> SQL Editor

ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS avatar_type VARCHAR(20) DEFAULT 'default' CHECK (avatar_type IN ('default', 'premade', 'custom')),
ADD COLUMN IF NOT EXISTS avatar_value TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN user_preferences.avatar_type IS 'Type of avatar: default (no custom avatar), premade (selected from static files), custom (uploaded by user)';
COMMENT ON COLUMN user_preferences.avatar_value IS 'For premade: filename (e.g., avatar-1.png), for custom: upload URL/path, for default: null';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'user_preferences' 
AND column_name IN ('avatar_type', 'avatar_value');
