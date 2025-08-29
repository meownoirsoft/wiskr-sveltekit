-- Emergency cleanup script to remove problematic data and fix RLS issues
-- Run this in Supabase SQL editor to clean up the BEDNOMANCER issue

-- IMPORTANT: This will temporarily disable RLS to clean up data
-- It will re-enable RLS with proper policies afterwards

BEGIN;

-- Step 1: Temporarily disable RLS on all related tables
ALTER TABLE conversation_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_branches DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE facts DISABLE ROW LEVEL SECURITY;
ALTER TABLE docs DISABLE ROW LEVEL SECURITY;

-- Step 2: Delete any projects that have problematic names or are orphaned
DELETE FROM projects WHERE name LIKE '%BEDNOMANCER%' OR name LIKE '%Test%' OR user_id IS NULL;

-- Step 3: Clean up any orphaned data
DELETE FROM conversation_sessions WHERE project_id NOT IN (SELECT id FROM projects);
DELETE FROM conversation_branches WHERE project_id NOT IN (SELECT id FROM projects);
DELETE FROM messages WHERE project_id NOT IN (SELECT id FROM projects);
DELETE FROM facts WHERE project_id NOT IN (SELECT id FROM projects);
DELETE FROM docs WHERE project_id NOT IN (SELECT id FROM projects);

-- Step 4: Remove all existing RLS policies to start fresh
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on all relevant tables
    FOR policy_record IN 
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE tablename IN ('projects', 'conversation_sessions', 'conversation_branches', 'messages', 'facts', 'docs')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON ' || policy_record.tablename;
    END LOOP;
END $$;

-- Step 5: Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE docs ENABLE ROW LEVEL SECURITY;

-- Step 6: Create simple, working policies for all tables

-- Projects policies
CREATE POLICY "projects_policy" ON projects FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Conversation sessions policies
CREATE POLICY "sessions_policy" ON conversation_sessions 
FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = conversation_sessions.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = conversation_sessions.project_id AND projects.user_id = auth.uid())
);

-- Conversation branches policies
CREATE POLICY "branches_policy" ON conversation_branches 
FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = conversation_branches.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = conversation_branches.project_id AND projects.user_id = auth.uid())
);

-- Messages policies
CREATE POLICY "messages_policy" ON messages 
FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = messages.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = messages.project_id AND projects.user_id = auth.uid())
);

-- Facts policies
CREATE POLICY "facts_policy" ON facts 
FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = facts.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = facts.project_id AND projects.user_id = auth.uid())
);

-- Docs policies
CREATE POLICY "docs_policy" ON docs 
FOR ALL USING (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = docs.project_id AND projects.user_id = auth.uid())
) WITH CHECK (
    EXISTS (SELECT 1 FROM projects WHERE projects.id = docs.project_id AND projects.user_id = auth.uid())
);

-- Step 7: Create necessary indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_project_id ON conversation_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_branches_project_id ON conversation_branches(project_id);
CREATE INDEX IF NOT EXISTS idx_messages_project_id ON messages(project_id);
CREATE INDEX IF NOT EXISTS idx_facts_project_id ON facts(project_id);
CREATE INDEX IF NOT EXISTS idx_docs_project_id ON docs(project_id);

COMMIT;

-- Final verification and status report
SELECT 
    'Cleanup completed' as status,
    (SELECT COUNT(*) FROM projects) as total_projects,
    (SELECT COUNT(*) FROM conversation_sessions) as total_sessions,
    (SELECT COUNT(*) FROM messages) as total_messages,
    current_user as current_db_user,
    COALESCE(auth.uid()::text, 'No auth context') as current_auth_user;

-- Show remaining projects (should not include BEDNOMANCER)
SELECT 'Remaining projects:' as info, id, name, user_id 
FROM projects 
ORDER BY created_at DESC;
