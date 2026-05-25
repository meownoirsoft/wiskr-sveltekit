import { sequence } from '@sveltejs/kit/hooks';
import * as Sentry from '@sentry/sveltekit';
import { getSessionUser, SESSION_COOKIE_NAME } from '$lib/server/auth.js';
import { createDbClient } from '$lib/server/db/queries.js';

// Set Sentry environment based on URL
function setSentryEnvironment(event) {
  const hostname = event.url.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    Sentry.setTag('environment', 'development');
  } else if (hostname === 'wiskr.app') {
    Sentry.setTag('environment', 'production');
  } else {
    Sentry.setTag('environment', 'development');
  }
}

export const handle = sequence(Sentry.sentryHandle(), async ({ event, resolve }) => {
  setSentryEnvironment(event);

  const db = createDbClient();
  event.locals.db = db;

  // ---- Authenticate via session cookie ------------------------------------
  const sessionId = event.cookies.get(SESSION_COOKIE_NAME);
  const user = await getSessionUser(sessionId);
  event.locals.user = user;

  // Helper matching the old pattern
  event.locals.getCachedUser = () => event.locals.user;
  event.locals.refreshUserCache = async () => event.locals.user;

  // ---- Load tier info (same logic, now using db client) -------------------
  if (user) {
    const metadata = typeof user.user_metadata === 'string'
      ? JSON.parse(user.user_metadata)
      : user.user_metadata || {};

    try {
      const { data: profile, error } = await db
        .from('profiles')
        .select('tier, trial_ends_at')
        .eq('user_id', user.id)
        .single();

      if (!error && profile) {
        event.locals.userTier = profile.tier ?? 0;
        event.locals.trialEndsAt = profile.trial_ends_at || null;
      } else {
        event.locals.userTier = metadata.tier ?? 0;
        event.locals.trialEndsAt = metadata.trial_ends_at || null;
      }
    } catch (dbError) {
      console.error('Error loading user profile from database:', dbError);
      event.locals.userTier = metadata.tier ?? 0;
      event.locals.trialEndsAt = metadata.trial_ends_at || null;
    }

    // Calculate effective tier (handles trial expiration)
    const now = new Date();
    let effectiveTier = event.locals.userTier;
    if (event.locals.trialEndsAt && now > new Date(event.locals.trialEndsAt)) {
      effectiveTier = 0;
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
