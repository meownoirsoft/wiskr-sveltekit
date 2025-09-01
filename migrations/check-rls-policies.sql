-- Check RLS policies for conversation_sessions and conversation_branches
-- Run these in Supabase SQL Editor

-- 1. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('conversation_sessions', 'conversation_branches', 'projects');

-- 2. Check existing policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('conversation_sessions', 'conversation_branches', 'projects')
ORDER BY tablename, policyname;

-- 3. Test if current user can read sessions (run as authenticated user)
-- Replace 'YOUR_PROJECT_ID' with actual project ID
SELECT 
  cs.*,
  p.name as project_name,
  p.user_id as project_owner
FROM conversation_sessions cs
JOIN projects p ON cs.project_id = p.id
WHERE cs.project_id = 'YOUR_PROJECT_ID';

-- 4. Check if conversation_branches exist for the session
SELECT 
  cb.*,
  cs.session_name
FROM conversation_branches cb
JOIN conversation_sessions cs ON cb.session_id = cs.id
WHERE cs.project_id = 'YOUR_PROJECT_ID';

-- 5. Check current user's auth info
SELECT auth.uid() as current_user_id, auth.jwt() ->> 'email' as current_user_email;

-- 6. Find your project and user info
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.user_id as project_owner,
  u.email as owner_email,
  (p.user_id = auth.uid()) as is_owner
FROM projects p
JOIN auth.users u ON p.user_id = u.id
WHERE u.email = 'your-test-email@example.com';  -- Replace with your email
