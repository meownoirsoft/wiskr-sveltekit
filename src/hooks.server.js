// src/hooks.server.js
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

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

  const { data: { user } } = await event.locals.supabase.auth.getUser();
  event.locals.user = user ?? null;

  return resolve(event);
};
