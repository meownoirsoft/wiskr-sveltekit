import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseAdmin.js';

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
    
    const adminClient = supabaseAdmin();
    
    // Find user by email
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
    
    if (listError) {
      return json({ error: 'Failed to list users: ' + listError.message }, { status: 500 });
    }
    
    const user = users.users.find(u => u.email === email);
    
    if (!user) {
      return json({ error: 'User not found with that email' }, { status: 404 });
    }
    
    // Set admin metadata
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      user.id,
      {
        user_metadata: {
          ...user.user_metadata,
          admin: true
        }
      }
    );
    
    if (updateError) {
      return json({ error: 'Failed to set admin status: ' + updateError.message }, { status: 500 });
    }
    
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
