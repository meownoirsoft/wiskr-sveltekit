-- Add policies to allow service role to manage projects for admin operations
-- This enables admin imports to create projects that users can see

-- Allow service role to bypass RLS for admin operations
-- This policy allows the service role to insert projects for any user
CREATE POLICY "Service role can manage all projects" ON projects
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Allow service role to bypass RLS for facts table too
CREATE POLICY "Service role can manage all facts" ON facts
    FOR ALL 
    TO service_role  
    USING (true)
    WITH CHECK (true);

-- Note: The service role already bypasses RLS by default in newer versions of Supabase,
-- but these policies ensure compatibility and make the permissions explicit
