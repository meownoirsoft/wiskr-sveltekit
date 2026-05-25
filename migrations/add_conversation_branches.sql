-- Migration: Add conversation branching support
-- This adds the necessary columns and tables to support conversation branching

-- Add branch support to messages table
ALTER TABLE messages 
ADD COLUMN branch_id TEXT DEFAULT 'main',
ADD COLUMN parent_message_id UUID DEFAULT NULL,
ADD COLUMN branch_point BOOLEAN DEFAULT FALSE;

-- Create conversation_branches table to track branch metadata
CREATE TABLE IF NOT EXISTS conversation_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  branch_id TEXT NOT NULL,
  branch_name TEXT NOT NULL,
  parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  color_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, branch_id)
);

-- Create index for faster branch queries
CREATE INDEX IF NOT EXISTS idx_messages_branch_id ON messages(project_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_branches_project ON conversation_branches(project_id);

-- Insert default 'main' branch for all existing projects
INSERT INTO conversation_branches (project_id, branch_id, branch_name, color_index)
SELECT DISTINCT p.id, 'main', 'Main Conversation', 0
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM conversation_branches cb 
  WHERE cb.project_id = p.id AND cb.branch_id = 'main'
);

-- Update existing messages to be on the 'main' branch
UPDATE messages SET branch_id = 'main' WHERE branch_id IS NULL;
