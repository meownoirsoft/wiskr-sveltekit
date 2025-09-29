import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';

export async function GET({ locals }) {
  try {
    // Check if user is authenticated
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = locals.user.id;

    // Get user's Stripe customer ID from database
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('stripe_customer_id, stripe_subscription_id, tier')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      return json({ 
        error: 'Database error', 
        details: profileError.message 
      }, { status: 500 });
    }

    if (!profile?.stripe_customer_id) {
      return json({ 
        error: 'No Stripe customer found',
        userTier: profile?.tier || 0
      }, { status: 404 });
    }

    // Get subscription details from Stripe
    let subscription = null;
    if (profile.stripe_subscription_id) {
      try {
        subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      } catch (stripeError) {
        console.error('Error retrieving subscription:', stripeError);
      }
    }

    // Test portal session creation
    let portalSession = null;
    try {
      portalSession = await stripe.billingPortal.sessions.create({
        customer: profile.stripe_customer_id,
        return_url: `${process.env.ORIGIN || 'http://localhost:5173'}/projects`,
      });
    } catch (portalError) {
      console.error('Error creating portal session:', portalError);
    }

    return json({
      success: true,
      user: {
        id: userId,
        tier: profile.tier,
        stripeCustomerId: profile.stripe_customer_id,
        stripeSubscriptionId: profile.stripe_subscription_id
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        current_period_end: subscription.current_period_end,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
      } : null,
      portalSession: portalSession ? {
        url: portalSession.url,
        created: portalSession.created
      } : null
    });

  } catch (error) {
    console.error('Error in test endpoint:', error);
    return json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}












