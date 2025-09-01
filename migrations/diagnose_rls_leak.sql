-- Diagnostic script to check why projects from other users are showing up
-- This is a critical security issue - RLS policies are not working

-- 1. Check if RLS is enabled on projects table
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'projects';

-- 2. List all current policies on projects table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;

-- 3. Check current user context
SELECT 
    current_user as database_user,
    COALESCE(auth.uid()::text, 'NULL - NOT AUTHENTICATED') as auth_user_id;

-- 4. Show all projects and their user_ids (this will show the security leak)
SELECT 
    id,
    name,
    user_id,
    created_at,
    CASE 
        WHEN user_id = auth.uid() THEN '✅ CURRENT USER' 
        WHEN user_id IS NULL THEN '❌ NO USER ID'
        ELSE '🚨 OTHER USER - SECURITY LEAK!'
    END as ownership_status
FROM projects 
ORDER BY created_at DESC;

-- 5. Test what a proper RLS query should return
SELECT 
    'Projects visible with proper RLS:' as info,
    COUNT(*) as count
FROM projects 
WHERE user_id = auth.uid();

-- 6. Check if there are any problematic policies that might be too permissive
SELECT 
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'projects' 
  AND (
    qual IS NULL 
    OR qual = 'true' 
    OR qual LIKE '%true%'
    OR qual NOT LIKE '%auth.uid()%'
  );
