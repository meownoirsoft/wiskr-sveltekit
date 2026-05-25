# Test Scripts

## Stripe Checkout Test

The `test-stripe-checkout.js` script automates the complete Stripe checkout flow to test webhook processing end-to-end.

### What it tests:

1. **Navigation** - Goes to projects page
2. **Feature Gate** - Finds and clicks a PRO badge
3. **Upgrade Modal** - Opens the upgrade modal
4. **Stripe Checkout** - Clicks upgrade button to go to Stripe
5. **Payment Processing** - Fills out test payment form
6. **Webhook Verification** - Checks if user gets upgraded successfully

### Prerequisites:

1. **Environment Variables** (add to `.env`):
   ```bash
   APP_URL=http://localhost:5173
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   TEST_USER_EMAIL=your_test_user_email
   TEST_USER_PASSWORD=your_test_user_password
   ```

2. **Chrome Remote Debugging** (to use existing Chrome with login session):
   ```bash
   # Start Chrome with remote debugging enabled
   google-chrome --remote-debugging-port=9222
   
   # Or if you want to use a specific profile
   google-chrome --remote-debugging-port=9222 --user-data-dir=~/.config/google-chrome/Default
   ```

3. **Test User** - Make sure you have a user account that can trigger the upgrade flow

4. **Stripe Test Mode** - Ensure you're in Stripe test mode

### Usage:

```bash
# Run the test
pnpm run test:stripe

# Or run directly
node scripts/test-stripe-checkout.js
```

### Test Flow:

1. **Navigate to projects page** - Looks for FeatureGate components
2. **Find PRO badge** - Searches for a feature that requires Pro tier
3. **Click PRO badge** - Opens the UpgradeModal
4. **Click upgrade button** - Redirects to Stripe checkout
5. **Fill payment form** - Uses Stripe test card (4242 4242 4242 4242)
6. **Complete payment** - Submits the form
7. **Verify redirect** - Checks if user returns to projects page
8. **Check success** - Looks for upgrade success message
9. **Verify database** - Confirms user tier was updated

### Test Cards:

- **Visa**: 4242 4242 4242 4242
- **Expiry**: 12/30
- **CVC**: 123

### Debugging:

- **Screenshots**: Failed tests save screenshots as `stripe-test-failure.png`
- **Console logs**: Detailed logging of each step
- **Headless mode**: Set `headless: false` in script for visual debugging

### Customization:

- **Slow mode**: Adjust `slowMo` value for slower execution
- **Timeouts**: Modify timeout values for different environments
- **Test data**: Change test card details or add more test scenarios

### Troubleshooting:

1. **Element not found**: Check that test attributes are properly set
2. **Timeout errors**: Increase timeout values or check network speed
3. **Stripe errors**: Verify Stripe is in test mode and webhook is configured
4. **Database errors**: Check Supabase connection and permissions
