# Stripe Integration Setup Guide

This guide will help you set up Stripe payment processing for the Wiskr application.

## Prerequisites

1. A Stripe account (https://stripe.com)
2. Access to your Phase secrets management
3. The Wiskr application codebase

## Step 1: Stripe Dashboard Setup

### 1.1 Create Products and Prices

1. Log into your [Stripe Dashboard](https://dashboard.stripe.com)
2. Go to **Products** → **Add Product**
3. Create the following products:

#### Pro Plan
- **Name**: Pro Plan
- **Price**: $15.00 USD
- **Billing**: Recurring (monthly)
- **Price ID**: Copy this - you'll need it for the code

#### Studio Plan
- **Name**: Studio Plan  
- **Price**: $39.00 USD
- **Billing**: Recurring (monthly)
- **Price ID**: Copy this - you'll need it for the code

### 1.2 Configure Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Set the endpoint URL to: `https://yourdomain.com/api/stripe/webhook`
4. Select these events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook signing secret** - you'll need this for the environment variable

## Step 2: Update Code Configuration

### 2.1 Update Stripe Product IDs

Edit `src/lib/server/stripe.js` and replace the placeholder price IDs:

```javascript
export const STRIPE_PRODUCTS = {
  PRO: {
    name: 'Pro Plan',
    priceId: 'price_YOUR_ACTUAL_PRO_PRICE_ID', // Replace with actual price ID
    tier: 1,
    // ... rest of config
  },
  STUDIO: {
    name: 'Studio Plan',
    priceId: 'price_YOUR_ACTUAL_STUDIO_PRICE_ID', // Replace with actual price ID
    tier: 2,
    // ... rest of config
  }
};
```

### 2.2 Add Webhook Secret to Phase

Add the webhook secret to your Phase environment:

```bash
phase secrets create STRIPE_WEBHOOK_SECRET
# Enter the webhook signing secret from Stripe dashboard
```

## Step 3: Database Schema Updates

The Stripe integration expects these fields in your `profiles` table:

```sql
-- Add these columns to your profiles table if they don't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT;
```

## Step 4: Test the Integration

### 4.1 Test Checkout Flow

1. Start your development server
2. Navigate to `/plans`
3. Click "Start Pro Trial" or "Upgrade to Studio"
4. You should be redirected to Stripe Checkout
5. Use Stripe test card: `4242 4242 4242 4242`
6. Complete the payment flow

### 4.2 Test Webhook Handling

1. Use Stripe CLI to test webhooks locally:
   ```bash
   stripe listen --forward-to localhost:5173/api/stripe/webhook
   ```

2. Or test in production by making a test purchase

## Step 5: Production Deployment

### 5.1 Environment Variables

Ensure these are set in your production environment:
- `STRIPE_SECRET_KEY` ✅ (already set)
- `STRIPE_PUBLIC_KEY` ✅ (already set)  
- `STRIPE_WEBHOOK_SECRET` (needs to be added)

### 5.2 Webhook URL

Update your Stripe webhook endpoint URL to your production domain:
`https://yourdomain.com/api/stripe/webhook`

## Troubleshooting

### Common Issues

1. **"No such price" error**: Check that price IDs in `stripe.js` match your Stripe dashboard
2. **Webhook signature verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` is set correctly
3. **User not found**: Check that the user authentication is working properly

### Debug Mode

Enable debug logging by checking the browser console and server logs for detailed error messages.

## Security Considerations

1. **Never expose your Stripe secret key** in client-side code
2. **Always verify webhook signatures** (already implemented)
3. **Validate user permissions** before allowing upgrades
4. **Use HTTPS** in production for all Stripe communications

## Support

If you encounter issues:
1. Check Stripe dashboard logs
2. Review server logs for errors
3. Verify all environment variables are set
4. Ensure database schema is updated

## Next Steps

After successful setup:
1. Test the complete payment flow
2. Monitor webhook events in Stripe dashboard
3. Set up Stripe Analytics for business insights
4. Consider adding subscription management features
5. Implement usage tracking and billing alerts
