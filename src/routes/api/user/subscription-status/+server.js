import { json } from '@sveltejs/kit';
import { supabaseAdmin } from '$lib/server/supabaseClient.js';

export async function GET({ locals }) {
  try {
    // Get the current user from the server-side session
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = locals.user.id;

    // Get user's profile with subscription details
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, tier, stripe_subscription_status, created_at, updated_at')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Database error:', profileError);
      return json({ 
        error: 'Database error', 
        details: profileError.message 
      }, { status: 500 });
    }

    if (!profile) {
      // If no profile exists, try to create one
      console.log('No profile found for user:', userId, '- attempting to create one');
      
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
          error: 'No profile found and failed to create one',
          hasProfile: false,
          createError: createError.message
        }, { status: 404 });
      }

      console.log('Profile created successfully:', newProfile);
      profile = newProfile;
    }

    return json({
      success: true,
      user: {
        id: userId,
        tier: profile.tier || 0,
        hasStripeCustomer: !!profile.stripe_customer_id,
        hasStripeSubscription: !!profile.stripe_subscription_id,
        subscriptionStatus: profile.stripe_subscription_status || 'none',
        profileCreated: profile.created_at,
        profileUpdated: profile.updated_at
      },
      subscription: {
        customerId: profile.stripe_customer_id,
        subscriptionId: profile.stripe_subscription_id,
        status: profile.stripe_subscription_status
      }
    });

  } catch (error) {
    console.error('Error getting subscription status:', error);
    return json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
