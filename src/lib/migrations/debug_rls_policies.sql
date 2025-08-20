-- Debug script to check RLS policies and diagnose session creation issues

-- 1. Check if RLS is enabled on conversation_sessions
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('conversation_sessions', 'projects');

-- 2. List all current policies on conversation_sessions
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
WHERE tablename = 'conversation_sessions'
ORDER BY policyname;

-- 3. List all current policies on projects
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
WHERE tablename = 'projects'
ORDER BY policyname;

-- 4. Check table structure of conversation_sessions
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'conversation_sessions'
ORDER BY ordinal_position;

-- 5. Check if there are any triggers or constraints that might interfere
SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name = 'conversation_sessions';

-- 6. Test a simple policy check (this will show what auth.uid() returns)
SELECT 
    COALESCE(auth.uid()::text, 'NULL') as current_user_id,
    current_user as current_db_user;

-- 7. Check if there are any existing conversation_sessions records
SELECT COUNT(*) as total_sessions FROM conversation_sessions;

-- 8. Check projects table for the current user
SELECT id, name, user_id 
FROM projects 
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 5;

-- 9. Check if there are any foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'conversation_sessions';
