import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseClient.js';

export async function POST({ locals }) {
  try {
    // Get the current user from the server-side session
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = locals.user.id;
    console.log('Creating profile for user:', userId);

    // Check if profile already exists
    const { data: existingProfile, error: checkError } = await locals.supabase
      .from('profiles')
      .select('id, user_id, tier')
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing profile:', checkError);
      return json({ 
        error: 'Database error', 
        details: checkError.message 
      }, { status: 500 });
    }

    if (existingProfile) {
      console.log('Profile already exists:', existingProfile);
      return json({ 
        success: true,
        message: 'Profile already exists',
        profile: existingProfile
      });
    }

    // Create a new profile using admin client to bypass RLS
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        tier: 0,
        stripe_customer_id: null,
        stripe_subscription_id: null,
        stripe_subscription_status: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating profile:', createError);
      return json({ 
        error: 'Failed to create user profile', 
        details: createError.message 
      }, { status: 500 });
    }

    console.log('Profile created successfully:', newProfile);
    return json({ 
      success: true,
      message: 'Profile created successfully',
      profile: newProfile
    });

  } catch (error) {
    console.error('Error creating profile:', error);
    return json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
