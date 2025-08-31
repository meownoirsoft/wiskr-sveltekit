import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const STRIPE_TEST_CARD = '4242424242424242'; // Visa test card
const STRIPE_TEST_EXPIRY = '1230'; // Dec 2030
const STRIPE_TEST_CVC = '123';

// Supabase client for verification
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testStripeCheckout() {
  console.log('🚀 Starting Stripe checkout test...');
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for CI/CD
    slowMo: 100, // Slow down actions for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Go to projects page (where FeatureGate components are)
    console.log('📱 Navigating to projects page...');
    await page.goto(`${APP_URL}/projects`);
    await page.waitForSelector('[data-testid="feature-gate"]', { timeout: 10000 });
    
    // Find and click a PRO badge to trigger upgrade modal
    console.log('💳 Looking for PRO badge to click...');
    const proBadge = await page.$('[data-testid="pro-badge"]');
    if (!proBadge) {
      throw new Error('PRO badge not found - make sure you have a feature that requires Pro tier');
    }
    
    // Click the PRO badge to open upgrade modal
    console.log('💳 Clicking PRO badge...');
    await proBadge.click();
    
    // Wait for upgrade modal to appear
    console.log('⏳ Waiting for upgrade modal...');
    await page.waitForSelector('[data-testid="upgrade-modal"]', { timeout: 10000 });
    
    // Click the upgrade button in the modal
    console.log('💳 Clicking upgrade button in modal...');
    await page.click('[data-testid="upgrade-button"]');
    
    // Wait for Stripe checkout to load
    console.log('⏳ Waiting for Stripe checkout...');
    await page.waitForSelector('iframe[name="checkout"]', { timeout: 15000 });
    
    // Switch to Stripe iframe
    const stripeFrame = page.frameLocator('iframe[name="checkout"]');
    
    // Fill out payment form
    console.log('💳 Filling payment details...');
    await stripeFrame.locator('[data-testid="card-number"]').fill(STRIPE_TEST_CARD);
    await stripeFrame.locator('[data-testid="card-expiry"]').fill(STRIPE_TEST_EXPIRY);
    await stripeFrame.locator('[data-testid="card-cvc"]').fill(STRIPE_TEST_CVC);
    
    // Submit payment
    console.log('✅ Submitting payment...');
    await stripeFrame.locator('[data-testid="submit-button"]').click();
    
    // Wait for redirect back to your app
    console.log('⏳ Waiting for redirect...');
    await page.waitForNavigation({ timeout: 30000 });
    
    // Check if we're on the projects page with success message
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    if (currentUrl.includes('/projects')) {
      console.log('✅ Successfully redirected to projects page');
      
      // Check for success message
      const successMessage = await page.$('[data-testid="upgrade-success"]');
      if (successMessage) {
        console.log('🎉 Success message found!');
      } else {
        console.log('⚠️ No success message found');
      }
      
      // Wait a bit for webhook to process
      console.log('⏳ Waiting for webhook to process...');
      await page.waitForTimeout(5000);
      
      // Verify user tier was updated in database
      console.log('🔍 Verifying database update...');
      await verifyUserTierUpdate();
      
    } else {
      console.log('❌ Unexpected redirect:', currentUrl);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take screenshot on failure
    await page.screenshot({ path: 'stripe-test-failure.png' });
    console.log('📸 Screenshot saved as stripe-test-failure.png');
  } finally {
    await browser.close();
  }
}

async function verifyUserTierUpdate() {
  try {
    // This would need to be adapted based on how you identify the test user
    // For now, we'll just log that verification is needed
    console.log('🔍 Database verification needed - implement based on your user identification');
    
    // Example verification (you'd need to adapt this):
    // const { data, error } = await supabase
    //   .from('profiles')
    //   .select('tier, stripe_subscription_id')
    //   .eq('user_id', TEST_USER_ID)
    //   .single();
    
    // if (data && data.tier === 1) {
    //   console.log('✅ User tier successfully updated to Pro');
    // } else {
    //   console.log('❌ User tier not updated correctly');
    // }
    
  } catch (error) {
    console.error('❌ Database verification failed:', error);
  }
}

// Run the test
testStripeCheckout().catch(console.error);

export { testStripeCheckout };
