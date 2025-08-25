-- Fix existing test user sessions and branches
-- Run this in your Supabase SQL editor or database console

-- Step 1: Find your test user's project (replace with actual email if needed)
-- SELECT p.*, u.email 
-- FROM projects p 
-- JOIN auth.users u ON p.user_id = u.id 
-- WHERE u.email = 'your-test-email@example.com';

-- Step 2: Check if sessions exist for the project
-- SELECT * FROM conversation_sessions WHERE project_id = 'your-project-id';

-- Step 3: Create missing session and branch for existing project
-- Replace 'YOUR_PROJECT_ID' with the actual project ID from Step 1

INSERT INTO conversation_sessions (
  project_id,
  session_name,
  session_date,
  is_active,
  topic_summary,
  created_at,
  updated_at
) 
SELECT 
  p.id as project_id,
  'Main Chat' as session_name,
  CURRENT_DATE as session_date,
  true as is_active,
  'Your main conversation with Wiskrs' as topic_summary,
  NOW() as created_at,
  NOW() as updated_at
FROM projects p
WHERE p.id = 'YOUR_PROJECT_ID'
AND NOT EXISTS (
  SELECT 1 FROM conversation_sessions cs 
  WHERE cs.project_id = p.id
);

-- Step 4: Create the main branch for the new session
INSERT INTO conversation_branches (
  project_id,
  session_id,
  branch_id,
  branch_name,
  color_index,
  created_at,
  updated_at
)
SELECT 
  cs.project_id,
  cs.id as session_id,
  'main' as branch_id,
  'Main Branch' as branch_name,
  0 as color_index,
  NOW() as created_at,
  NOW() as updated_at
FROM conversation_sessions cs
WHERE cs.project_id = 'YOUR_PROJECT_ID'
AND cs.session_name = 'Main Chat'
AND NOT EXISTS (
  SELECT 1 FROM conversation_branches cb 
  WHERE cb.session_id = cs.id AND cb.branch_id = 'main'
);

-- Step 5: Verify the fix worked
-- SELECT 
--   p.name as project_name,
--   cs.session_name,
--   cb.branch_name,
--   cb.branch_id
-- FROM projects p
-- JOIN conversation_sessions cs ON p.id = cs.project_id
-- JOIN conversation_branches cb ON cs.id = cb.session_id
-- WHERE p.id = 'YOUR_PROJECT_ID';
