import { supabase } from '$lib/supabase.js';

/**
 * Sign in with Google OAuth
 * @param {string} redirectTo - URL to redirect to after successful authentication
 * @returns {Promise<{data: any, error: any}>}
 */
export async function signInWithGoogle(redirectTo = '/projects') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectTo}`,
        scopes: 'openid email profile'
      }
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error during Google sign in:', err);
    return { data: null, error: err };
  }
}

/**
 * Sign in with Discord OAuth
 * @param {string} redirectTo - URL to redirect to after successful authentication
 * @returns {Promise<{data: any, error: any}>}
 */
export async function signInWithDiscord(redirectTo = '/projects') {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}${redirectTo}`,
        scopes: 'identify email'
      }
    });

    if (error) {
      console.error('Error signing in with Discord:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Unexpected error during Discord sign in:', err);
    return { data: null, error: err };
  }
}

/**
 * Get the appropriate error message for OAuth errors
 * @param {any} error - The error object from Supabase
 * @returns {string} User-friendly error message
 */
export function getOAuthErrorMessage(error) {
  if (!error) return '';
  
  if (error.message?.includes('popup')) {
    return 'Please allow popups for this site to sign in with OAuth.';
  }
  
  if (error.message?.includes('cancelled')) {
    return 'Sign in was cancelled. Please try again.';
  }
  
  return error.message || 'An error occurred during sign in. Please try again.';
}
