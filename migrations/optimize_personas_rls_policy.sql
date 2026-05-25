-- Optimize personas table RLS policy for better performance
-- Fixes Supabase warning about auth.uid() re-evaluation for each row

-- Drop the existing policy
DROP POLICY IF EXISTS "persona owner read" ON public.personas;

-- Create optimized policy that evaluates auth.uid() once per query
CREATE POLICY "persona owner read" ON public.personas
    FOR SELECT USING (user_id = (SELECT auth.uid()));

-- If there are other personas policies that might have the same issue, optimize them too:

-- Check if there's an insert policy that needs optimization
DROP POLICY IF EXISTS "persona owner insert" ON public.personas;
CREATE POLICY "persona owner insert" ON public.personas
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Check if there's an update policy that needs optimization  
DROP POLICY IF EXISTS "persona owner update" ON public.personas;
CREATE POLICY "persona owner update" ON public.personas
    FOR UPDATE USING (user_id = (SELECT auth.uid()));

-- Check if there's a delete policy that needs optimization
DROP POLICY IF EXISTS "persona owner delete" ON public.personas;
CREATE POLICY "persona owner delete" ON public.personas
    FOR DELETE USING (user_id = (SELECT auth.uid()));
