-- Cleanup script to remove any legacy "BEDNOMANCER" projects
-- This ensures new users get a truly clean slate
-- IMPORTANT: Preserves BEDNOMANCER projects for user ry@nrwl.xyz

-- First, get the user ID for ry@nrwl.xyz
-- (You'll need to replace 'USER_ID_HERE' with the actual user ID)
-- To find the user ID, run: SELECT id, email FROM auth.users WHERE email = 'ry@nrwl.xyz';

-- Check if any BEDNOMANCER projects exist (excluding ry@nrwl.xyz)
SELECT 
    p.id, 
    p.name, 
    p.user_id, 
    p.created_at,
    p.description,
    u.email
FROM projects p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
  AND u.email != 'ry@nrwl.xyz';

-- If any exist, we need to clean up associated data first

-- Clean up messages associated with BEDNOMANCER projects (excluding ry@nrwl.xyz)
DELETE FROM messages 
WHERE project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
      AND u.email != 'ry@nrwl.xyz'
);

-- Clean up facts associated with BEDNOMANCER projects (excluding ry@nrwl.xyz)
DELETE FROM facts 
WHERE project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
      AND u.email != 'ry@nrwl.xyz'
);

-- Clean up docs associated with BEDNOMANCER projects (excluding ry@nrwl.xyz)
DELETE FROM docs 
WHERE project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
      AND u.email != 'ry@nrwl.xyz'
);

-- Clean up conversation branches associated with BEDNOMANCER projects (excluding ry@nrwl.xyz)
DELETE FROM conversation_branches 
WHERE project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
      AND u.email != 'ry@nrwl.xyz'
);

-- Clean up conversation sessions associated with BEDNOMANCER projects (excluding ry@nrwl.xyz)
DELETE FROM conversation_sessions 
WHERE project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
      AND u.email != 'ry@nrwl.xyz'
);

-- Clean up project questions associated with BEDNOMANCER projects (excluding ry@nrwl.xyz)
DELETE FROM project_questions 
WHERE project_id IN (
    SELECT p.id FROM projects p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
      AND u.email != 'ry@nrwl.xyz'
);

-- Finally, delete the BEDNOMANCER projects themselves (excluding ry@nrwl.xyz)
DELETE FROM projects 
WHERE id IN (
    SELECT p.id FROM projects p
    LEFT JOIN auth.users u ON p.user_id = u.id
    WHERE (UPPER(p.name) LIKE '%BEDNOMANCER%' OR UPPER(p.description) LIKE '%BEDNOMANCER%')
      AND u.email != 'ry@nrwl.xyz'
);

-- Verify cleanup was successful - show remaining BEDNOMANCER projects (should only be ry@nrwl.xyz)
SELECT 
    p.id, 
    p.name, 
    p.user_id, 
    p.created_at,
    p.description,
    u.email,
    CASE 
        WHEN u.email = 'ry@nrwl.xyz' THEN 'PRESERVED'
        ELSE 'SHOULD BE DELETED'
    END as status
FROM projects p
LEFT JOIN auth.users u ON p.user_id = u.id
WHERE UPPER(p.name) LIKE '%BEDNOMANCER%' 
   OR UPPER(p.description) LIKE '%BEDNOMANCER%';

-- This should only return projects for ry@nrwl.xyz if cleanup was successful
