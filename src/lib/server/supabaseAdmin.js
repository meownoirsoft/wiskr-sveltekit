import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

export function supabaseAdmin() {
  const supabaseUrl = SUPABASE_URL || PUBLIC_SUPABASE_URL;
  let serviceRoleKey = SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL. Please check your environment variables.');
  }
  
  // Fallback to anon key for development if service role key is missing or placeholder
  if (!serviceRoleKey || serviceRoleKey === '...' || serviceRoleKey.includes('YOUR_SERVICE_ROLE_KEY_HERE')) {
    console.warn('⚠️  Using PUBLIC_SUPABASE_ANON_KEY as fallback. Some admin operations may fail.');
    serviceRoleKey = PUBLIC_SUPABASE_ANON_KEY;
  }
  
  if (!serviceRoleKey) {
    throw new Error('Missing both SUPABASE_SERVICE_ROLE_KEY and PUBLIC_SUPABASE_ANON_KEY. Please check your environment variables.');
  }
  
  return createClient(supabaseUrl, serviceRoleKey);
}
