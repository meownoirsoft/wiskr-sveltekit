import * as Sentry from '@sentry/sveltekit';

Sentry.init({
  dsn: 'https://bd9dc16a1a74900d1054238747da0b43@o4509965529972736.ingest.us.sentry.io/4509965533249536',

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
});