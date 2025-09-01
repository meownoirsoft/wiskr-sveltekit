import { json } from '@sveltejs/kit';
import { stripe } from '$lib/server/stripe.js';
import { createClient } from '@supabase/supabase-js';

export async function POST({ request }) {
  // Create Supabase client with service role for webhook operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');

  console.log('Webhook received:', { 
    hasBody: !!body, 
    hasSignature: !!sig, 
    env: process.env.NODE_ENV,
    hasLocalSecret: !!process.env.STRIPE_WEBHOOK_SECRET_LOCAL,
    hasProdSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    localSecretLength: process.env.STRIPE_WEBHOOK_SECRET_LOCAL?.length || 0,
    prodSecretLength: process.env.STRIPE_WEBHOOK_SECRET?.length || 0,
    allEnvVars: Object.keys(process.env).filter(key => key.includes('STRIPE'))
  });

  let event;

  try {
    // Verify webhook signature
    const webhookSecret = process.env.NODE_ENV === 'development' 
      ? (process.env.STRIPE_WEBHOOK_SECRET_LOCAL || process.env.STRIPE_WEBHOOK_SECRET)
      : process.env.STRIPE_WEBHOOK_SECRET;
      
    console.log('Using webhook secret:', {
      env: process.env.NODE_ENV,
      localSecret: process.env.STRIPE_WEBHOOK_SECRET_LOCAL ? 'SET' : 'NOT SET',
      prodSecret: process.env.STRIPE_WEBHOOK_SECRET ? 'SET' : 'NOT SET',
      finalSecret: webhookSecret ? 'SET' : 'NOT SET',
      secretLength: webhookSecret?.length || 0
    });
      
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return json({ error: 'Webhook signature verification failed' }, { status: 400 });
  }

  try {
    // Handle the event
    console.log('Processing webhook event:', event.type, event.id);
    
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('Processing checkout.session.completed event');
        await handleCheckoutSessionCompleted(event.data.object, supabase);
        break;
      
      case 'customer.subscription.updated':
        console.log('Processing customer.subscription.updated event');
        await handleSubscriptionUpdated(event.data.object, supabase);
        break;
      
      case 'customer.subscription.deleted':
        console.log('Processing customer.subscription.deleted event');
        await handleSubscriptionDeleted(event.data.object, supabase);
        break;
      
      case 'invoice.payment_succeeded':
        console.log('Processing invoice.payment_succeeded event');
        await handleInvoicePaymentSucceeded(event.data.object, supabase);
        break;
      
      case 'invoice.payment_failed':
        console.log('Processing invoice.payment_failed event');
        await handleInvoicePaymentFailed(event.data.object, supabase);
        break;
      
      case 'payment_intent.created':
        console.log('Processing payment_intent.created event');
        await handlePaymentIntentCreated(event.data.object, supabase);
        break;
      
      case 'payment_intent.succeeded':
        console.log('Processing payment_intent.succeeded event');
        await handlePaymentIntentSucceeded(event.data.object, supabase);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleCheckoutSessionCompleted(session, supabase) {
  console.log('Checkout session completed:', session.id);
  console.log('Session metadata:', session.metadata);
  
  const { userId, tier } = session.metadata;
  if (!userId || !tier) {
    console.error('Missing metadata in checkout session:', session.id);
    return;
  }
  
  console.log('Processing upgrade for user:', userId, 'to tier:', tier);

  try {
    console.log('Attempting to update user profile directly:', {
      userId,
      tier: parseInt(tier),
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription
    });
    
    // Update user profile directly in database (webhook runs with service role)
    console.log('About to execute database update query...');
    
    // First, check if the user exists in profiles table
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching existing user:', fetchError);
      if (fetchError.code === 'PGRST116') {
        console.log('User does not exist in profiles table, creating new profile...');
        // Create new profile for existing user
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId, // Use user_id as the primary identifier
            tier: parseInt(tier),
            stripe_customer_id: session.customer,
            stripe_subscription_id: session.subscription,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
        
        if (createError) {
          console.error('Error creating new profile:', createError);
        } else {
          console.log('New profile created successfully:', newProfile);
        }
        return;
      }
    } else {
      console.log('Existing user found:', existingUser);
    }
    
    // Update existing profile
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        tier: parseInt(tier),
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    // Also update the user's metadata in auth.users
    if (!error) {
      try {
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { tier: parseInt(tier) }
        });
        
        if (authError) {
          console.error('Error updating user metadata:', authError);
        } else {
          console.log('User metadata updated successfully');
        }
      } catch (authError) {
        console.error('Error updating user metadata:', authError);
      }
    }

    if (error) {
      console.error('Error updating user tier:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log(`User ${userId} upgraded to tier ${tier} successfully:`, data);
    }
  } catch (error) {
    console.error('Error in handleCheckoutSessionCompleted:', error);
  }
}

async function handleSubscriptionUpdated(subscription, supabase) {
  console.log('Subscription updated:', subscription.id);
  console.log('Full subscription object:', JSON.stringify(subscription, null, 2));
  
  const { userId, tier } = subscription.metadata;
  console.log('Extracted metadata:', { userId, tier });
  
  if (!userId || !tier) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  try {
    // Update user tier and subscription status
    console.log('Updating subscription for user:', userId, 'to tier:', tier);
    console.log('Database update query:', {
      table: 'profiles',
      userId: userId,
      tier: parseInt(tier),
      subscriptionId: subscription.id,
      status: subscription.status
    });
    
    console.log('About to execute subscription update query...');
    
    // First, check if the user exists in profiles table
    const { data: existingUser, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError) {
      console.error('Error fetching existing user:', fetchError);
      if (fetchError.code === 'PGRST116') {
        console.log('User does not exist in profiles table, creating new profile...');
        // Create new profile for existing user
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_id: userId, // Use user_id as the primary identifier
            tier: parseInt(tier),
            stripe_customer_id: subscription.customer,
            stripe_subscription_id: subscription.id,
            stripe_subscription_status: subscription.status,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select();
        
        if (createError) {
          console.error('Error creating new profile:', createError);
        } else {
          console.log('New profile created successfully:', newProfile);
        }
        return;
      }
    } else {
      console.log('Existing user found:', existingUser);
    }
    
    // Update existing profile
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        tier: parseInt(tier),
        stripe_customer_id: subscription.customer,
        stripe_subscription_id: subscription.id,
        stripe_subscription_status: subscription.status,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    // Also update the user's metadata in auth.users
    if (!error) {
      try {
        const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { tier: parseInt(tier) }
        });
        
        if (authError) {
          console.error('Error updating user metadata:', authError);
        } else {
          console.log('User metadata updated successfully');
        }
      } catch (authError) {
        console.error('Error updating user metadata:', authError);
      }
    }

    if (error) {
      console.error('Error updating subscription:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
    } else {
      console.log(`Subscription updated successfully for user ${userId}:`, data);
    }
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
  }
}

async function handleSubscriptionDeleted(subscription, supabase) {
  console.log('Subscription deleted:', subscription.id);
  
  const { userId } = subscription.metadata;
  if (!userId) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  try {
    // Downgrade user to free tier
    const { error } = await supabase
      .from('profiles')
      .update({ 
        tier: 0,
        stripe_subscription_id: null,
        stripe_subscription_status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Error downgrading user:', error);
    } else {
      console.log(`User ${userId} downgraded to free tier`);
    }
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
  }
}

async function handleInvoicePaymentSucceeded(invoice, supabase) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  // Handle successful payment - could update usage limits, send confirmation emails, etc.
  // For now, just log the event
}

async function handleInvoicePaymentFailed(invoice, supabase) {
  console.log('Invoice payment failed:', invoice.id);
  
  // Handle failed payment - could send dunning emails, update subscription status, etc.
  // For now, just log the event
}

async function handlePaymentIntentCreated(paymentIntent, supabase) {
  console.log('Payment intent created:', paymentIntent.id);
  console.log('Payment intent metadata:', paymentIntent.metadata);
  // This event doesn't contain user tier info, so we can't update the profile yet
}

async function handlePaymentIntentSucceeded(paymentIntent, supabase) {
  console.log('Payment intent succeeded:', paymentIntent.id);
  console.log('Payment intent metadata:', paymentIntent.metadata);
  
  // Check if this payment intent is related to a subscription
  if (paymentIntent.metadata.userId && paymentIntent.metadata.tier) {
    console.log('Processing payment success for user:', paymentIntent.metadata.userId, 'to tier:', paymentIntent.metadata.tier);
    
    try {
      console.log('Attempting to update user profile from payment intent:', {
        userId: paymentIntent.metadata.userId,
        tier: parseInt(paymentIntent.metadata.tier),
        stripeCustomerId: paymentIntent.customer,
        stripeSubscriptionId: paymentIntent.metadata.subscriptionId
      });
      
      const { data, error } = await supabase
        .from('profiles')
        .update({ 
          tier: parseInt(paymentIntent.metadata.tier),
          stripe_customer_id: paymentIntent.customer,
          stripe_subscription_id: paymentIntent.metadata.subscriptionId,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', paymentIntent.metadata.userId)
        .select();

      if (error) {
        console.error('Error updating user tier from payment intent:', error);
      } else {
        console.log(`User ${paymentIntent.metadata.userId} upgraded to tier ${paymentIntent.metadata.tier} successfully from payment intent:`, data);
      }
    } catch (error) {
      console.error('Error in handlePaymentIntentSucceeded:', error);
    }
  }
}
