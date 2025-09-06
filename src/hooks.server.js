import {sequence} from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
// src/hooks.server.js
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { redirect } from '@sveltejs/kit';

// Set Sentry environment based on URL
function setSentryEnvironment(event) {
  const hostname = event.url.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    Sentry.setTag('environment', 'development');
  } else if (hostname === 'wiskr.app') {
    Sentry.setTag('environment', 'production');
  } else {
    Sentry.setTag('environment', 'development'); // Default fallback
  }
}

export const handle = sequence(Sentry.sentryHandle(), async ({ event, resolve }) => {
  // Set environment for this request
  setSentryEnvironment(event);
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
      // Force cookie reading to ensure code_verifier is available
      const allCookies = event.cookies.getAll();
      console.log('Available cookies during OAuth callback:', allCookies.map(c => c.name));
      
      const { data, error } = await event.locals.supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('OAuth code exchange error:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          code: code ? 'present' : 'missing',
          url: event.url.toString()
        });
        throw redirect(303, `/login?error=${encodeURIComponent(error.message)}`);
      }
      
      if (data?.session) {
        console.log('OAuth login successful for user:', data.user?.email);
        
        // Clear any existing cached session to ensure fresh data
        event.cookies.delete('sb-session', { path: '/' });
        
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

  // Get current user with caching
  let user = null;
  const sessionCookie = event.cookies.get('sb-session');
  
  // Check if we have a cached user session
  if (sessionCookie) {
    try {
      const cachedSession = JSON.parse(sessionCookie);
      const now = Date.now();
      
      // Check if cached session is still valid (not expired and recent)
      if (cachedSession.user && 
          cachedSession.expiresAt > now && 
          (now - cachedSession.cachedAt) < (5 * 60 * 1000)) { // 5 minutes cache
        user = cachedSession.user;

      } else {
        event.cookies.delete('sb-session', { path: '/' });
      }
      
      // Also check if the user object has required fields
      if (user && (!user.id || !user.email)) {
        event.cookies.delete('sb-session', { path: '/' });
        user = null;
      }
    } catch (error) {
      event.cookies.delete('sb-session', { path: '/' });
    }
  }
  
  // If no valid cached session, fetch from Supabase
  if (!user) {
    const { data: { user: freshUser } } = await event.locals.supabase.auth.getUser();
    user = freshUser;
    
    // Cache the fresh user session
    if (user) {
      const sessionData = {
        user,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000) // Cache for 5 minutes
      };
      event.cookies.set('sb-session', JSON.stringify(sessionData), {
        path: '/',
        maxAge: 5 * 60, // 5 minutes
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

    }
  }
  
  event.locals.user = user;
  
  // Add helper function to get cached user (avoids repeated auth calls)
  event.locals.getCachedUser = () => {
    return event.locals.user;
  };
  
  // Add function to refresh user cache if needed
  event.locals.refreshUserCache = async () => {
    event.cookies.delete('sb-session', { path: '/' });
    
    const { data: { user: freshUser } } = await event.locals.supabase.auth.getUser();
    if (freshUser) {
      const sessionData = {
        user: freshUser,
        cachedAt: Date.now(),
        expiresAt: Date.now() + (5 * 60 * 1000) // Cache for 5 minutes
      };
      event.cookies.set('sb-session', JSON.stringify(sessionData), {
        path: '/',
        maxAge: 5 * 60, // 5 minutes
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      event.locals.user = freshUser;

    }
    return freshUser;
  };
  
  // Add tier information to locals for server-side access
  if (user) {
    const metadata = user.user_metadata || {};
    
    // First try to get tier from database (profiles table) - this is the source of truth
    try {
      const { data: profile, error } = await event.locals.supabase
        .from('profiles')
        .select('tier, trial_ends_at')
        .eq('user_id', user.id)
        .single();
      
      if (!error && profile) {
        // Use database tier as source of truth
        event.locals.userTier = profile.tier ?? 0;
        event.locals.trialEndsAt = profile.trial_ends_at || null;
      } else {
        // Fallback to metadata if no database record
        event.locals.userTier = metadata.tier ?? 0;
        event.locals.trialEndsAt = metadata.trial_ends_at || null;
      }
    } catch (dbError) {
      console.error('Error loading user profile from database:', dbError);
      // Fallback to metadata
      event.locals.userTier = metadata.tier ?? 0;
      event.locals.trialEndsAt = metadata.trial_ends_at || null;
    }
    
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
});
export const handleError = Sentry.handleErrorWithSentry();