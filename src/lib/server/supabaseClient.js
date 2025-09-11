import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

if (!PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables: PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

// Create a server-side Supabase client with service role key
export const supabaseAdmin = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper function to get authenticated user from locals
export function getUserFromLocals(locals) {
  return locals.supabase.auth.getUser();
}

// Helper function to check if user is authenticated
export async function requireAuth(locals) {
  const { data: { user }, error } = await getUserFromLocals(locals);
  
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  
  return user;
}
