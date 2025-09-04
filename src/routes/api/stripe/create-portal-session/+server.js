import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';

export async function POST({ request, locals }) {
  try {
    // Get the current user from the server-side session
    if (!locals.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = locals.user.id;

    // Get user's Stripe customer ID from database
    const { data: profile, error: profileError } = await locals.supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return json({ error: 'No subscription found' }, { status: 404 });
    }

    // Create customer portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${request.headers.get('origin')}/projects`,
    });

    return json({ url: session.url });

  } catch (error) {
    console.error('Error creating portal session:', error);
    return json({ 
      error: 'Failed to create portal session' 
    }, { status: 500 });
  }
}
