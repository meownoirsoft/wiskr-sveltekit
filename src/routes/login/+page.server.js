// src/routes/login/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ locals, url }) => {
  // If user is already authenticated, redirect to projects
  if (locals.user) {
    throw redirect(303, '/projects');
  }

  // Check for OAuth error in URL params and pass to page
  const error = url.searchParams.get('error');
  
  return {
    error: error ? decodeURIComponent(error) : null
  };
};
