-- Drop the existing RLS policy for projects
DROP POLICY IF EXISTS "Users can only see their own projects" ON projects;

-- Create a new RLS policy that allows users to see projects with their user_id
-- regardless of who created the project
CREATE POLICY "Users can see projects assigned to them" ON projects
    FOR ALL USING (auth.uid() = user_id);

-- Also update the facts table policy if needed
DROP POLICY IF EXISTS "Users can only access facts from their own projects" ON facts;

CREATE POLICY "Users can access facts from their assigned projects" ON facts
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE user_id = auth.uid()
        )
    );
