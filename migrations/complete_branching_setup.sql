-- Complete branching setup migration
-- Run this step by step if needed

-- Step 1: Add columns to messages table (if they don't exist)
DO $$
BEGIN
    -- Add branch_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'branch_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN branch_id TEXT DEFAULT 'main' NOT NULL;
    END IF;

    -- Add parent_message_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'parent_message_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN parent_message_id UUID DEFAULT NULL;
    END IF;

    -- Add branch_point column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' AND column_name = 'branch_point'
    ) THEN
        ALTER TABLE messages ADD COLUMN branch_point BOOLEAN DEFAULT FALSE;
    END IF;
END
$$;

-- Step 2: Create conversation_branches table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS conversation_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    branch_id TEXT NOT NULL,
    branch_name TEXT NOT NULL,
    parent_message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    color_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, branch_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_branch_id ON messages(project_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_branches_project ON conversation_branches(project_id);

-- Step 4: Update existing messages to use 'main' branch
UPDATE messages SET branch_id = 'main' WHERE branch_id IS NULL OR branch_id = '';

-- Step 5: Create main branch for all existing projects
INSERT INTO conversation_branches (project_id, branch_id, branch_name, color_index)
SELECT DISTINCT p.id, 'main', 'Main Conversation', 0
FROM projects p
WHERE NOT EXISTS (
    SELECT 1 FROM conversation_branches cb 
    WHERE cb.project_id = p.id AND cb.branch_id = 'main'
)
ON CONFLICT (project_id, branch_id) DO NOTHING;

-- Verify the setup
SELECT 'Setup completed successfully!' as status;
