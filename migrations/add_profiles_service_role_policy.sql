-- Add policies to allow service role to manage user profiles for webhook operations
-- This enables Stripe webhooks to update user tiers and subscription information

-- Allow service role to bypass RLS for profiles table
-- This policy allows the service role to update user profiles (for webhook operations)
CREATE POLICY "Service role can manage all profiles" ON profiles
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Note: The service role already bypasses RLS by default in newer versions of Supabase,
-- but this policy ensures compatibility and makes the permissions explicit for webhook operations
