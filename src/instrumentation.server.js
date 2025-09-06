import * as Sentry from '@sentry/sveltekit';

// Determine environment based on URL
function getEnvironment() {
  if (typeof window !== 'undefined') {
    // Client-side
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'development';
    } else if (window.location.hostname === 'wiskr.app') {
      return 'production';
    }
  }
  
  // Server-side or fallback
  if (process.env.NODE_ENV === 'development') {
    return 'development';
  } else if (process.env.NODE_ENV === 'production') {
    return 'production';
  }
  
  return 'development'; // Default fallback
}

Sentry.init({
  dsn: 'https://bd9dc16a1a74900d1054238747da0b43@o4509965529972736.ingest.us.sentry.io/4509965533249536',
  environment: getEnvironment(),
  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});