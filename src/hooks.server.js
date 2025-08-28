// src/hooks.server.js
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

export const handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => event.cookies.set(key, value, { ...options, path: '/' }),
        remove: (key, options) => event.cookies.delete(key, { ...options, path: '/' })
      }
    }
  );

  // Handle OAuth callback code exchange
  if (event.url.searchParams.has('code')) {
    const code = event.url.searchParams.get('code');
    const next = event.url.searchParams.get('next') ?? '/projects';
    
    try {
      const { data, error } = await event.locals.supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('OAuth code exchange error:', error);
        throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
      }
      
      if (data?.session) {
        console.log('OAuth login successful for user:', data.user?.email);
        
        // Set cookie to trigger avatar refresh
        event.cookies.set('wiskr_refresh_avatars', '1', {
          path: '/',
          maxAge: 60 * 5 // 5 minutes
        });
        
        throw redirect(303, next);
      }
    } catch (err) {
      if (err?.status === 303) {
        // Re-throw redirect
        throw err;
      }
      console.error('Unexpected OAuth error:', err);
      throw redirect(303, `/login?error=${encodeURIComponent('Authentication failed')}`);
    }
  }

  // Get current user
  const { data: { user } } = await event.locals.supabase.auth.getUser();
  event.locals.user = user ?? null;
  
  // Add tier information to locals for server-side access
  if (user) {
    const metadata = user.user_metadata || {};
    event.locals.userTier = metadata.tier ?? 0;
    event.locals.trialEndsAt = metadata.trial_ends_at || null;
    
    // Calculate effective tier (handles trial expiration)
    const now = new Date();
    let effectiveTier = event.locals.userTier;
    if (event.locals.trialEndsAt && now > new Date(event.locals.trialEndsAt)) {
      effectiveTier = 0; // Expired trial falls back to free tier
    }
    event.locals.effectiveTier = effectiveTier;
  } else {
    event.locals.userTier = 0;
    event.locals.trialEndsAt = null;
    event.locals.effectiveTier = 0;
  }

  return resolve(event);
};
