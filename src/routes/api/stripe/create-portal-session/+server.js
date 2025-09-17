import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { supabaseAdmin } from '$lib/server/supabaseClient.js';

export async function POST({ request, locals }) {
  try {
    // Get the current user from the server-side session
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = locals.user.id;
    console.log('Creating portal session for user:', userId);

    // Get user's profile with more details for debugging using admin client
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, tier, stripe_subscription_status')
      .eq('user_id', userId)
      .single();

    console.log('Profile query result:', { profile, profileError });

    if (profileError) {
      // Handle the case where no profile exists (PGRST116 error)
      if (profileError.code === 'PGRST116') {
        console.log('No profile found for user:', userId, '- creating one');
        
        // Create a basic profile for the user using admin client to bypass RLS
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
          
          // Handle duplicate key error (profile already exists)
          if (createError.code === '23505') {
            console.log('Profile already exists, fetching it...');
            
            // Try to fetch the existing profile
            const { data: existingProfile, error: fetchError } = await supabaseAdmin
              .from('profiles')
              .select('stripe_customer_id, stripe_subscription_id, tier, stripe_subscription_status')
              .eq('user_id', userId)
              .single();
              
            if (fetchError) {
              console.error('Error fetching existing profile:', fetchError);
              return json({ 
                error: 'Profile exists but cannot be accessed', 
                details: fetchError.message 
              }, { status: 500 });
            }
            
            // Use the existing profile and continue with normal flow
            profile = existingProfile;
            console.log('Found existing profile:', profile);
          } else {
            return json({ 
              error: 'Failed to create user profile', 
              details: createError.message 
            }, { status: 500 });
          }
        } else {
          console.log('Profile created successfully:', newProfile);
          profile = newProfile;
        }
      } else {
        console.error('Database error:', profileError);
        return json({ 
          error: 'Database error', 
          details: profileError.message 
        }, { status: 500 });
      }
    }

    if (!profile) {
      console.log('No profile found for user:', userId);
      return json({ 
        error: 'No profile found. Please try subscribing first.',
        code: 'NO_PROFILE'
      }, { status: 404 });
    }

    if (!profile.stripe_customer_id) {
      console.log('No Stripe customer ID found for user:', userId, 'Profile:', profile);
      return json({ 
        error: 'No subscription found. Please subscribe to a plan first.',
        code: 'NO_SUBSCRIPTION',
        userTier: profile.tier || 0
      }, { status: 404 });
    }

    console.log('Creating portal session for customer:', profile.stripe_customer_id);

    // Create customer portal session
    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${request.headers.get('origin')}/projects`,
      });

      console.log('Portal session created successfully:', session.id);
      return json({ url: session.url });
    } catch (stripeError) {
      console.error('Stripe portal session error:', stripeError);
      
      // Handle specific Stripe errors
      if (stripeError.type === 'StripeInvalidRequestError' && 
          stripeError.message.includes('No configuration provided')) {
        return json({ 
          error: 'Stripe Customer Portal not configured',
          details: 'The Stripe Customer Portal needs to be configured in your Stripe dashboard. Please visit https://dashboard.stripe.com/test/settings/billing/portal to set it up.',
          code: 'STRIPE_PORTAL_NOT_CONFIGURED',
          stripeError: stripeError.message
        }, { status: 400 });
      }
      
      // Handle other Stripe errors
      return json({ 
        error: 'Stripe error',
        details: stripeError.message,
        code: 'STRIPE_ERROR',
        stripeError: stripeError.message
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Error creating portal session:', error);
    return json({ 
      error: 'Failed to create portal session',
      details: error.message
    }, { status: 500 });
  }
}
