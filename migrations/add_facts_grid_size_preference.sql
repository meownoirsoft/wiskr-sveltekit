-- Add facts_grid_size column to user_preferences table
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS facts_grid_size INTEGER DEFAULT 3 CHECK (facts_grid_size >= 1 AND facts_grid_size <= 4);

COMMENT ON COLUMN user_preferences.facts_grid_size IS 'Number of fact/doc cards to display horizontally in a row (1-4)';
