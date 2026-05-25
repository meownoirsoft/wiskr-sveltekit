-- Add user tier and trial support to the profiles table
-- This migration adds the tier column and trial_ends_at column for the pricing system

-- Add tier column (0 = free, 1 = pro, 2 = studio)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tier INTEGER DEFAULT 0;

-- Add trial_ends_at column for trial tracking  
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMP WITH TIME ZONE;

-- Add index on tier column for efficient queries
CREATE INDEX IF NOT EXISTS profiles_tier_idx ON public.profiles (tier);

-- Add index on trial_ends_at for trial expiration queries
CREATE INDEX IF NOT EXISTS profiles_trial_ends_at_idx ON public.profiles (trial_ends_at);

-- Add constraint to ensure tier is valid (drop first if exists, then add)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_tier_check;
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_tier_check 
CHECK (tier >= 0 AND tier <= 2);

-- Update RLS policies if needed (allow users to read their own tier info)
-- The existing profile policies should already cover this, but let's be explicit

-- Policy for users to read their own tier info
DROP POLICY IF EXISTS "Users can view their own tier info" ON public.profiles;
CREATE POLICY "Users can view their own tier info" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy for users to update their own tier info (for trial activation, etc.)
DROP POLICY IF EXISTS "Users can update their own tier info" ON public.profiles;
CREATE POLICY "Users can update their own tier info" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
