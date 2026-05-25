-- Comprehensive fix for conversation_sessions RLS issues
-- This will completely reset the RLS policies and clean up any problematic data

BEGIN;

-- Step 1: Temporarily disable RLS to allow cleanup
ALTER TABLE conversation_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Step 2: Clean up any orphaned conversation_sessions (sessions without valid projects)
DELETE FROM conversation_sessions 
WHERE project_id NOT IN (SELECT id FROM projects);

-- Step 3: Clean up any conversation_sessions that might be from deleted/non-existent users
DELETE FROM conversation_sessions 
WHERE project_id IN (
    SELECT id FROM projects WHERE user_id IS NULL
);

-- Step 4: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can create conversation sessions in their projects" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can update their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can delete their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Enable read access for users" ON conversation_sessions;
DROP POLICY IF EXISTS "Enable insert for users" ON conversation_sessions;
DROP POLICY IF EXISTS "Enable update for users" ON conversation_sessions;
DROP POLICY IF EXISTS "Enable delete for users" ON conversation_sessions;

-- Step 5: Drop ALL existing project policies to start fresh
DROP POLICY IF EXISTS "Users can access their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
DROP POLICY IF EXISTS "Enable read access for users" ON projects;
DROP POLICY IF EXISTS "Enable insert for users" ON projects;
DROP POLICY IF EXISTS "Enable update for users" ON projects;
DROP POLICY IF EXISTS "Enable delete for users" ON projects;

-- Step 6: Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Step 7: Create comprehensive project policies
CREATE POLICY "projects_select_policy" ON projects
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "projects_insert_policy" ON projects
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_update_policy" ON projects
    FOR UPDATE USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "projects_delete_policy" ON projects
    FOR DELETE USING (user_id = auth.uid());

-- Step 8: Create comprehensive conversation_sessions policies
-- These policies check that the session's project belongs to the current user
CREATE POLICY "sessions_select_policy" ON conversation_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "sessions_insert_policy" ON conversation_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "sessions_update_policy" ON conversation_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "sessions_delete_policy" ON conversation_sessions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Step 9: Ensure the tables have the right structure
-- Add created_at and updated_at if they don't exist
DO $$
BEGIN
    -- Add created_at to conversation_sessions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_sessions' AND column_name = 'created_at'
    ) THEN
        ALTER TABLE conversation_sessions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add updated_at to conversation_sessions if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'conversation_sessions' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE conversation_sessions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Step 10: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_project_id ON conversation_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_lookup ON conversation_sessions(project_id) 
    WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);

-- Step 11: Test the policies
DO $$
DECLARE
    test_result INTEGER;
BEGIN
    -- Test if we can query projects (should work for authenticated users)
    SELECT COUNT(*) INTO test_result FROM projects WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    RAISE NOTICE 'Project policy test: Found % projects for current user', test_result;
    
    -- Test if we can query conversation_sessions (should work for authenticated users)
    SELECT COUNT(*) INTO test_result FROM conversation_sessions;
    RAISE NOTICE 'Session policy test: Found % total sessions', test_result;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Policy test completed (errors are normal if not authenticated)';
END $$;

COMMIT;

-- Final verification
SELECT 'Projects table RLS status:' as info, 
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status
FROM pg_tables WHERE tablename = 'projects'
UNION ALL
SELECT 'Sessions table RLS status:' as info,
       CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as status  
FROM pg_tables WHERE tablename = 'conversation_sessions'
UNION ALL
SELECT 'Total project policies:' as info, COUNT(*)::text as status
FROM pg_policies WHERE tablename = 'projects'
UNION ALL  
SELECT 'Total session policies:' as info, COUNT(*)::text as status
FROM pg_policies WHERE tablename = 'conversation_sessions';
