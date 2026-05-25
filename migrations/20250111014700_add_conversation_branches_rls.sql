-- Enable RLS on conversation_branches table
ALTER TABLE conversation_branches ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see branches for projects they own
CREATE POLICY "Users can view their own project branches" ON conversation_branches
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_branches.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Policy: Users can only create branches for projects they own
CREATE POLICY "Users can create branches for their own projects" ON conversation_branches
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_branches.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Policy: Users can only update branches for projects they own
CREATE POLICY "Users can update branches for their own projects" ON conversation_branches
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_branches.project_id 
            AND projects.user_id = auth.uid()
        )
    );

-- Policy: Users can only delete branches for projects they own
CREATE POLICY "Users can delete branches for their own projects" ON conversation_branches
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = conversation_branches.project_id 
            AND projects.user_id = auth.uid()
        )
    );
