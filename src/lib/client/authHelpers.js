import { supabase } from '$lib/supabase.js';

/**
 * Sign in with Google OAuth
 * @param {string} redirectTo - URL to redirect to after successful authentication
 * @returns {Promise<{data: any, error: any}>}
 */
export async function signInWithGoogle(redirectTo = '/projects') {
  try {
    console.log('🚀 Initiating Google OAuth with redirectTo:', `${window.location.origin}${redirectTo}`);
    
    // Clear any existing auth state to ensure clean OAuth flow
    console.log('🧹 Clearing existing auth state...');
    await supabase.auth.signOut();
    
    // Wait a moment for signOut to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
      console.error('❌ Error signing in with Google:', error);
      return { data: null, error };
    }

    console.log('✅ Google OAuth initiated successfully');
    return { data, error: null };
  } catch (err) {
    console.error('💥 Unexpected error during Google sign in:', err);
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
    
    // Wait a moment for signOut to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Try a simpler OAuth configuration first
    console.log('🔧 Attempting OAuth with simplified config...');
    
    // Check if we can access the Supabase client properly
    console.log('🔍 Supabase client check:', {
      supabaseUrl: supabase.supabaseUrl,
      supabaseKey: supabase.supabaseKey ? 'present' : 'missing'
    });
    
    // Try using the auth.getSession() first to ensure clean state
    const { data: sessionData } = await supabase.auth.getSession();
    console.log('🔍 Current session before OAuth:', sessionData);
    
    // Try a different approach - use the auth.getSession() first to ensure clean state
    try {
      // Force a clean auth state
      await supabase.auth.signOut();
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Try OAuth with explicit PKCE handling
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}${redirectTo}`,
          scopes: 'identify email',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      
      console.log('🔧 OAuth response:', { data, error });
      
      // If successful, log the redirect URL
      if (data?.url) {
        console.log('🔗 OAuth redirect URL:', data.url);
      }

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
      
    } catch (oauthError) {
      console.error('💥 OAuth initiation failed:', oauthError);
      return { data: null, error: oauthError };
    }
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
  
  if (error.message?.includes('code challenge does not match previously saved code verifier')) {
    return 'OAuth authentication failed due to a security verification issue. Please try signing in again.';
  }
  
  if (error.message?.includes('unexpected_failure')) {
    return 'An unexpected error occurred during sign in. Please try again or contact support if the issue persists.';
  }
  
  return error.message || 'An error occurred during sign in. Please try again.';
}
