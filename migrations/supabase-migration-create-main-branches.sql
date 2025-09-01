-- Migration: Create missing "main" branches for existing sessions
-- This fixes the issue where messages reference "main" branch_id but no branch records exist

-- First, let's see what we're working with (these are just for visibility, remove if not needed)
-- SELECT COUNT(*) as total_sessions FROM conversation_sessions;
-- SELECT COUNT(*) as total_branches FROM conversation_branches;
-- SELECT COUNT(*) as messages_with_main_branch FROM messages WHERE branch_id = 'main';

-- Create "main" branches for sessions that don't have them
INSERT INTO conversation_branches (id, session_id, branch_id, branch_name, project_id, created_at)
SELECT 
    gen_random_uuid() as id,  -- Generate proper UUID for primary key
    cs.id as session_id,
    'main' as branch_id,  -- Set branch_id to 'main' to match message references
    'main' as branch_name,
    cs.project_id,
    NOW() as created_at
FROM conversation_sessions cs
LEFT JOIN conversation_branches cb ON cb.session_id = cs.id AND cb.branch_id = 'main'
WHERE cb.id IS NULL  -- Only create for sessions that don't already have a main branch
;

-- Verify the results
SELECT 
    'Created main branches' as action,
    COUNT(*) as count
FROM conversation_branches 
WHERE branch_name = 'main';

-- Optional: Show sessions and their main branches
-- SELECT 
--     cs.session_name,
--     cs.id as session_id,
--     cb.id as branch_id,
--     cb.branch_name
-- FROM conversation_sessions cs
-- LEFT JOIN conversation_branches cb ON cb.session_id = cs.id AND cb.branch_name = 'main'
-- ORDER BY cs.session_name;