-- Migration: Enforce unique branch names per session
-- This prevents duplicate branch names within the same session

-- First, fix any existing duplicates by renaming them
DO $$
DECLARE
    duplicate_record RECORD;
    counter INTEGER;
BEGIN
    -- Find and rename duplicate branch names within the same session
    FOR duplicate_record IN 
        SELECT session_id, branch_name, COUNT(*) as count
        FROM conversation_branches 
        WHERE session_id IS NOT NULL
        GROUP BY session_id, branch_name 
        HAVING COUNT(*) > 1
    LOOP
        -- Rename duplicates by adding numbers
        counter := 2;
        FOR duplicate_id IN 
            SELECT id FROM conversation_branches 
            WHERE session_id = duplicate_record.session_id 
            AND branch_name = duplicate_record.branch_name
            ORDER BY created_at
            OFFSET 1  -- Skip the first one (keep original name)
        LOOP
            UPDATE conversation_branches 
            SET branch_name = duplicate_record.branch_name || ' (' || counter || ')'
            WHERE id = duplicate_id.id;
            counter := counter + 1;
        END LOOP;
    END LOOP;
END
$$;

-- Add unique constraint on (session_id, branch_name) to prevent future duplicate branch names per session
DO $$
BEGIN
    -- Check if the constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'conversation_branches' 
        AND constraint_name = 'conversation_branches_session_branch_name_unique'
    ) THEN
        -- Add the unique constraint
        ALTER TABLE conversation_branches 
        ADD CONSTRAINT conversation_branches_session_branch_name_unique 
        UNIQUE (session_id, branch_name);
    END IF;
END
$$;

-- Create index for better performance on session-branch queries
CREATE INDEX IF NOT EXISTS idx_branches_session_name ON conversation_branches(session_id, branch_name);
