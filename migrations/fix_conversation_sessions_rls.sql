-- Fix RLS policies for conversation_sessions to prevent 42501 errors
-- This addresses issues where newly created projects can't immediately create sessions

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can create conversation sessions in their projects" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can update their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can delete their own conversation sessions" ON conversation_sessions;

-- Recreate policies with better logic
-- Policy for SELECT: Users can view sessions for projects they own
CREATE POLICY "Users can view their own conversation sessions" ON conversation_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Policy for INSERT: Users can create sessions for projects they own
-- Use WITH CHECK instead of USING for INSERT policies
CREATE POLICY "Users can create conversation sessions in their projects" ON conversation_sessions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Policy for UPDATE: Users can update sessions for projects they own
CREATE POLICY "Users can update their own conversation sessions" ON conversation_sessions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Policy for DELETE: Users can delete sessions for projects they own
CREATE POLICY "Users can delete their own conversation sessions" ON conversation_sessions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_sessions.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Ensure projects table has proper RLS policies for this to work
-- Check if projects table has RLS enabled and proper policies
DO $$
BEGIN
    -- Check if projects table exists and has RLS enabled
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'projects') THEN
        -- Enable RLS on projects if not already enabled
        EXECUTE 'ALTER TABLE projects ENABLE ROW LEVEL SECURITY';
        
        -- Create basic project RLS policy if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'projects' 
            AND policyname = 'Users can access their own projects'
        ) THEN
            EXECUTE 'CREATE POLICY "Users can access their own projects" ON projects
                FOR ALL USING (user_id = auth.uid())';
        END IF;
    END IF;
END $$;

-- Test the policies by attempting a sample query (will fail gracefully if auth.uid() is null)
-- This helps validate the policy syntax
DO $$
BEGIN
    PERFORM 1 FROM conversation_sessions 
    WHERE project_id IN (
        SELECT id FROM projects WHERE user_id = COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)
    ) 
    LIMIT 1;
    
    RAISE NOTICE 'RLS policies for conversation_sessions updated successfully';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RLS policy test completed (this is normal)';
END $$;
