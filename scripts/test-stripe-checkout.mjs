import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// Configuration
const APP_URL = process.env.APP_URL || 'http://localhost:5173';
const STRIPE_TEST_CARD = '4242424242424242'; // Visa test card
const STRIPE_TEST_EXPIRY = '1230'; // Dec 2030
const STRIPE_TEST_CVC = '123';

// Chrome profile path (optional - will use default if not set)
const CHROME_USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR || process.env.HOME + '/.config/google-chrome/Default';

// Supabase client for verification
let supabase = null;

// Initialize Supabase if environment variables are available
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );
} else {
  console.log('⚠️ Supabase environment variables not found - database verification will be skipped');
  console.log('💡 Make sure to set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
}

async function testStripeCheckout() {
  console.log('🚀 Starting Stripe checkout test...');
  
  let browser;
  
  try {
    // Try to connect to existing Chrome instance first
    console.log('🔗 Attempting to connect to existing Chrome...');
    browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });
    console.log('✅ Connected to existing Chrome instance');
  } catch (error) {
    console.log('⚠️ Could not connect to existing Chrome, launching new instance...');
    console.log('💡 To use existing Chrome, start it with: google-chrome --remote-debugging-port=9222');
    
    browser = await puppeteer.launch({
      headless: false,
      slowMo: 100,
      userDataDir: process.env.CHROME_USER_DATA_DIR || process.env.HOME + '/.config/google-chrome/Default',
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    });
  }

  let page = null;

  try {
    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set headers to bypass ngrok warning page
    await page.setExtraHTTPHeaders({
      'ngrok-skip-browser-warning': 'true'
    });
    
    // Go directly to plans page (using existing login session)
    console.log('📱 Navigating to plans page...');
    await page.goto(`${APP_URL}/plans`);
    
    // Wait for page to load completely
    console.log('⏳ Waiting for plans page to load...');
    await page.waitForSelector('[data-testid="pro-plan"]', { timeout: 30000 }); // Increased to 30s
    
    // Give the page a bit more time to fully render
    console.log('⏳ Waiting for page to fully render...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Debug: Log what we see on the page
    console.log('🔍 Looking for upgrade buttons...');
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(b => ({ 
        text: b.textContent?.trim(), 
        type: b.type,
        disabled: b.disabled,
        visible: b.offsetParent !== null
      }))
    );
    console.log('📋 Available buttons:', buttons);
    
    // Look for the upgrade button using the test attribute
    console.log('💳 Looking for upgrade button...');
    const upgradeButton = await page.$('[data-testid="upgrade-button"]');
    
    if (!upgradeButton) {
      console.log('❌ Upgrade button not found. Taking screenshot for debugging...');
      await page.screenshot({ path: 'plans-page-debug.png' });
      throw new Error('Upgrade button not found on plans page');
    }
    
    console.log('✅ Found upgrade button');
    
    // Click the upgrade button
    console.log('💳 Clicking upgrade button...');
    await page.click('[data-testid="upgrade-button"]');
    
    // Wait for Stripe checkout to load
    console.log('⏳ Waiting for Stripe checkout...');
    await page.waitForSelector('iframe[name="checkout"]', { timeout: 30000 }); // Increased to 30s
    
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
    await page.waitForNavigation({ timeout: 60000 }); // Increased to 60s for slow dev mode
    
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
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Verify user tier was updated in database
      console.log('🔍 Verifying database update...');
      await verifyUserTierUpdate();
      
    } else {
      console.log('❌ Unexpected redirect:', currentUrl);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Take screenshot on failure (only if page exists)
    if (page) {
      try {
        await page.screenshot({ path: 'stripe-test-failure.png' });
        console.log('📸 Screenshot saved as stripe-test-failure.png');
      } catch (screenshotError) {
        console.error('❌ Failed to take screenshot:', screenshotError);
      }
    }
  } finally {
    await browser.close();
  }
}

async function verifyUserTierUpdate() {
  try {
    if (!supabase) {
      console.log('⚠️ Supabase not available - skipping database verification');
      console.log('💡 Check your database manually to verify user tier was updated');
      return;
    }
    
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
