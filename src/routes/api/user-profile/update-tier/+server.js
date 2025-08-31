import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  try {
    const { userId, tier, stripeCustomerId, stripeSubscriptionId, webhookKey } = await request.json();
    
    // Verify webhook key (this should match what you set in your environment)
    if (webhookKey !== process.env.WEBHOOK_SECRET_KEY) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Validate required fields
    if (!userId || tier === undefined || !stripeCustomerId || !stripeSubscriptionId) {
      return json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    console.log('Webhook updating user tier:', { userId, tier, stripeCustomerId, stripeSubscriptionId });
    
    // Update user profile using locals.supabase (which has service role access)
    const { data, error } = await locals.supabase
      .from('profiles')
      .update({ 
        tier: parseInt(tier),
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('Error updating user tier:', error);
      return json({ error: 'Database update failed' }, { status: 500 });
    }
    
    console.log(`User ${userId} upgraded to tier ${tier} successfully:`, data);
    
    return json({ 
      success: true, 
      message: `User ${userId} upgraded to tier ${tier}`,
      data 
    });

  } catch (error) {
    console.error('Error in webhook user tier update:', error);
    return json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
