import Stripe from 'stripe';

// Initialize Stripe with secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

// Stripe product/price IDs - these should match your Stripe dashboard
export const STRIPE_PRODUCTS = {
  PRO: {
    name: 'Pro Plan',
    priceId: 'price_1S1FdQ20OPLdAwYoc6vJXdhq', // Replace with actual price ID
    tier: 1,
    features: [
      'Up to 50 projects',
      '500,000 AI tokens/month',
      'All Wiskr models',
      'Priority email support',
      'Advanced export formats',
      'Enhanced fact management',
      'Usage analytics'
    ]
  },
  STUDIO: {
    name: 'Studio Plan',
    priceId: 'price_1S1FeW20OPLdAwYoxTPtlcxQ', // Replace with actual price ID
    tier: 2,
    features: [
      'Unlimited projects',
      '2,000,000 AI tokens/month',
      'Everything in Pro',
      'Team collaboration features',
      'Admin dashboard and controls',
      'Custom Wiskr model integrations',
      'API access for integrations',
      'Dedicated support manager',
      'Service Level Agreement (SLA)',
      'Custom onboarding and training',
      'Priority feature requests'
    ]
  }
};

// Helper function to get product by tier
export function getProductByTier(tier) {
  if (tier === 1) return STRIPE_PRODUCTS.PRO;
  if (tier === 2) return STRIPE_PRODUCTS.STUDIO;
  return null;
}

// Helper function to get product by price ID
export function getProductByPriceId(priceId) {
  return Object.values(STRIPE_PRODUCTS).find(product => product.priceId === priceId);
}
