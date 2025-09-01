-- Fix UUID issue with branch_id column
-- The branch_id should be TEXT, not UUID

-- First, drop any constraints that might be treating branch_id as UUID
-- (This is safe to run even if constraints don't exist)
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_branch_id_fkey;

-- Ensure branch_id is TEXT type (not UUID)
ALTER TABLE messages ALTER COLUMN branch_id TYPE TEXT;
ALTER TABLE conversation_branches ALTER COLUMN branch_id TYPE TEXT;

-- Make sure we have the proper defaults and not null constraints
ALTER TABLE messages ALTER COLUMN branch_id SET DEFAULT 'main';
ALTER TABLE messages ALTER COLUMN branch_id SET NOT NULL;

-- Create proper indexes for TEXT type
DROP INDEX IF EXISTS idx_messages_branch_id;
CREATE INDEX idx_messages_branch_id ON messages(project_id, branch_id);

-- Ensure all existing messages have proper branch_id
UPDATE messages SET branch_id = 'main' WHERE branch_id IS NULL OR branch_id = '';

-- Ensure main branch exists for all projects
INSERT INTO conversation_branches (project_id, branch_id, branch_name, color_index)
SELECT DISTINCT p.id, 'main', 'Main Conversation', 0
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_branches cb 
  WHERE cb.project_id = p.id AND cb.branch_id = 'main'
);
