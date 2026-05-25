/**
 * Client-side auth helpers.
 * OAuth flows are handled server-side — we just redirect to the right endpoints.
 * Sessions are cookie-based; no client-side token management needed.
 */

/**
 * Sign in with Google OAuth.
 * Redirects to the server-side OAuth initiation endpoint.
 * @param {string} redirectTo - Path to land on after successful authentication
 */
export function signInWithGoogle(redirectTo = '/projects') {
  window.location.href = `/api/auth/oauth/google?next=${encodeURIComponent(redirectTo)}`;
}

/**
 * Sign in with Discord OAuth.
 * Redirects to the server-side OAuth initiation endpoint.
 * @param {string} redirectTo - Path to land on after successful authentication
 */
export function signInWithDiscord(redirectTo = '/projects') {
  window.location.href = `/api/auth/oauth/discord?next=${encodeURIComponent(redirectTo)}`;
}

/**
 * Sign out the current user.
 * Calls the server-side logout endpoint which destroys the session cookie.
 * @param {string} redirectTo - Path to redirect to after sign out (default: /login)
 */
export async function signOut(redirectTo = '/login') {
  try {
    await fetch('/logout', { method: 'GET', redirect: 'manual' });
  } catch {
    // ignore network errors — redirect regardless
  }
  window.location.href = redirectTo;
}

/**
 * Get the currently authenticated user from the server session.
 * Returns null if not authenticated.
 * @returns {Promise<{data: {user: object|null}, error: null}>}
 */
export async function getUser() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return { data: { user: null }, error: null };
    const { user } = await res.json();
    return { data: { user }, error: null };
  } catch (err) {
    return { data: { user: null }, error: err };
  }
}

/**
 * User-friendly error message for OAuth failures.
 * @param {any} error
 * @returns {string}
 */
export function getOAuthErrorMessage(error) {
  if (!error) return '';

  const msg = error.message || String(error);

  if (msg.includes('popup')) return 'Please allow popups for this site to sign in.';
  if (msg.includes('cancelled') || msg.includes('canceled')) return 'Sign in was cancelled. Please try again.';
  if (msg.includes('access_denied')) return 'Sign in was denied. Please try again.';
  if (msg.includes('redirect_uri_mismatch')) return 'OAuth configuration error. Please contact support.';
  if (msg.includes('invalid_client')) return 'OAuth is not properly configured. Please contact support.';

  return msg || 'An error occurred during sign in. Please try again.';
}
