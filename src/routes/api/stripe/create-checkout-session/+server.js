import { json } from '@sveltejs/kit';
import { stripe, getProductByTier } from '$lib/server/stripe.js';

export async function POST({ request, locals }) {
  try {
    const { tier, successUrl, cancelUrl } = await request.json();
    
    // Get the current user from the server-side session
    const { data: { user }, error: authError } = await locals.supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the product details for the requested tier
    const product = getProductByTier(tier);
    if (!product) {
      return json({ error: 'Invalid tier' }, { status: 400 });
    }

    // Create Stripe checkout session
    console.log('Creating checkout session:', { 
      tier, 
      product: product.name, 
      successUrl: `${request.headers.get('origin')}/projects?upgraded=true&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${request.headers.get('origin')}/projects?upgrade_canceled=true`
    });
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: product.priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `https://fox-above-loudly.ngrok-free.app/projects?upgraded=true&tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `https://fox-above-loudly.ngrok-free.app/projects?upgrade_canceled=true`,
      customer_email: user.email,
      metadata: {
        userId: user.id,
        userEmail: user.email,
        tier: tier.toString(),
        productName: product.name
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          userEmail: user.email,
          tier: tier.toString(),
          productName: product.name
        }
      }
    });

    console.log('Checkout session created successfully:', {
      sessionId: session.id,
      successUrl: session.success_url,
      cancelUrl: session.cancel_url,
      redirectUrl: session.url
    });
    
    return json({ 
      sessionId: session.id,
      url: session.url 
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return json({ 
      error: 'Failed to create checkout session' 
    }, { status: 500 });
  }
}
