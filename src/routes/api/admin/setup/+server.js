import { json } from '@sveltejs/kit';
import { getUserByEmail, updateUserMetadata } from '$lib/server/auth.js';

/**
 * One-time setup endpoint to create initial admin user
 * This should be disabled after initial setup for security
 */
export async function POST({ request }) {
  try {
    const { email, setupKey } = await request.json();

    // Basic security check - you should set this in your environment
    const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || 'wiskr-admin-setup-2024';

    if (setupKey !== ADMIN_SETUP_KEY) {
      return json({ error: 'Invalid setup key' }, { status: 401 });
    }

    if (!email) {
      return json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const user = await getUserByEmail(email);

    if (!user) {
      return json({ error: 'User not found with that email' }, { status: 404 });
    }

    // Set admin metadata
    await updateUserMetadata(user.id, { admin: true });

    return json({
      success: true,
      message: `Successfully set ${email} as admin`,
      userId: user.id
    });

  } catch (error) {
    console.error('Admin setup error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
