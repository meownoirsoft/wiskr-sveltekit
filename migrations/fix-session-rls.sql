-- Fix RLS policies for conversation_sessions and conversation_branches
-- Run these in Supabase SQL Editor

-- 1. Enable RLS on both tables (if not already enabled)
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_branches ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (in case they're incorrect)
DROP POLICY IF EXISTS "Users can view their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can create their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can update their own conversation sessions" ON conversation_sessions;
DROP POLICY IF EXISTS "Users can delete their own conversation sessions" ON conversation_sessions;

DROP POLICY IF EXISTS "Users can view their own conversation branches" ON conversation_branches;
DROP POLICY IF EXISTS "Users can create their own conversation branches" ON conversation_branches;
DROP POLICY IF EXISTS "Users can update their own conversation branches" ON conversation_branches;
DROP POLICY IF EXISTS "Users can delete their own conversation branches" ON conversation_branches;

-- 3. Create correct RLS policies for conversation_sessions
CREATE POLICY "Users can view their own conversation sessions" ON conversation_sessions
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own conversation sessions" ON conversation_sessions
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own conversation sessions" ON conversation_sessions
FOR UPDATE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
) WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own conversation sessions" ON conversation_sessions
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- 4. Create correct RLS policies for conversation_branches
CREATE POLICY "Users can view their own conversation branches" ON conversation_branches
FOR SELECT USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create their own conversation branches" ON conversation_branches
FOR INSERT WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their own conversation branches" ON conversation_branches
FOR UPDATE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
) WITH CHECK (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own conversation branches" ON conversation_branches
FOR DELETE USING (
  project_id IN (
    SELECT id FROM projects WHERE user_id = auth.uid()
  )
);

-- 5. Test the fix by running this query as your authenticated user
-- Replace 'YOUR_PROJECT_ID' with your actual project ID
SELECT 
  cs.id,
  cs.session_name,
  cs.is_active,
  cs.project_id,
  p.name as project_name,
  (p.user_id = auth.uid()) as is_owner
FROM conversation_sessions cs
JOIN projects p ON cs.project_id = p.id
WHERE cs.project_id = 'YOUR_PROJECT_ID';
