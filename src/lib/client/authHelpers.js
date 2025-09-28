import { supabase } from '$lib/supabase.js';

/**
 * Sign in with Google OAuth
 * @param {string} redirectTo - URL to redirect to after successful authentication
 * @returns {Promise<{data: any, error: any}>}
 */
export async function signInWithGoogle(redirectTo = '/projects') {
  try {
    console.log('Initiating Google OAuth with redirectTo:', `${window.location.origin}${redirectTo}`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${redirectTo}`,
        scopes: 'openid email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      console.error('Error signing in with Google:', error);
      return { data: null, error };
    }

    console.log('Google OAuth initiated successfully');
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
    console.log('🚀 Initiating Discord OAuth with redirectTo:', `${window.location.origin}${redirectTo}`);
    console.log('🔍 Current URL:', window.location.href);
    console.log('🔍 Supabase URL:', supabase.supabaseUrl);
    
    // Clear any existing auth state to ensure clean OAuth flow
    console.log('🧹 Clearing existing auth state...');
    await supabase.auth.signOut();
    
    const oauthOptions = {
      provider: 'discord',
      options: {
        redirectTo: `${window.location.origin}${redirectTo}`,
        scopes: 'identify email',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        skipBrowserRedirect: false
      }
    };
    
    console.log('🔧 OAuth options:', oauthOptions);
    
    const { data, error } = await supabase.auth.signInWithOAuth(oauthOptions);

    if (error) {
      console.error('❌ Error signing in with Discord:', error);
      console.error('❌ Discord OAuth error details:', {
        message: error.message,
        status: error.status,
        code: error.code
      });
      return { data: null, error };
    }

    console.log('✅ Discord OAuth initiated successfully, data:', data);
    return { data, error: null };
  } catch (err) {
    console.error('💥 Unexpected error during Discord sign in:', err);
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
  
  // Discord-specific error messages
  if (error.message?.includes('discord') || error.message?.includes('Discord')) {
    if (error.message?.includes('redirect_uri_mismatch')) {
      return 'Discord OAuth configuration error. Please contact support.';
    }
    if (error.message?.includes('invalid_client')) {
      return 'Discord OAuth is not properly configured. Please contact support.';
    }
    if (error.message?.includes('access_denied')) {
      return 'Discord sign in was denied. Please try again.';
    }
  }
  
  // Handle specific Supabase OAuth errors
  if (error.message?.includes('Unable to exchange external code')) {
    return 'OAuth code exchange failed. This usually means the authorization code expired or there was a configuration issue. Please try signing in again.';
  }
  
  if (error.message?.includes('unexpected_failure')) {
    return 'An unexpected error occurred during sign in. Please try again or contact support if the issue persists.';
  }
  
  return error.message || 'An error occurred during sign in. Please try again.';
}
