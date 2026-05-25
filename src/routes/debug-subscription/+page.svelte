<script>
  import { onMount } from 'svelte';
  
  let subscriptionStatus = null;
  let loading = true;
  let error = null;
  
  onMount(async () => {
    try {
      const response = await fetch('/api/user/subscription-status');
      const data = await response.json();
      
      if (data.error) {
        error = data;
      } else {
        subscriptionStatus = data;
      }
    } catch (err) {
      error = { error: 'Failed to fetch subscription status', details: err.message };
    } finally {
      loading = false;
    }
  });
  
  async function createProfile() {
    loading = true;
    try {
      const response = await fetch('/api/user/create-profile', { method: 'POST' });
      const data = await response.json();
      
      if (data.error) {
        error = data;
      } else {
        // Refresh the subscription status
        const statusResponse = await fetch('/api/user/subscription-status');
        subscriptionStatus = await statusResponse.json();
        error = null;
      }
    } catch (err) {
      error = { error: 'Failed to create profile', details: err.message };
    } finally {
      loading = false;
    }
  }
  
  async function testPortalSession() {
    loading = true;
    try {
      const response = await fetch('/api/stripe/create-portal-session', { method: 'POST' });
      const data = await response.json();
      
      if (data.error) {
        error = data;
        
        // Show specific help for Stripe portal configuration
        if (data.code === 'STRIPE_PORTAL_NOT_CONFIGURED') {
          setTimeout(() => {
            if (confirm('Stripe Customer Portal needs to be configured.\n\nWould you like to open the Stripe dashboard to set it up?')) {
              window.open('https://dashboard.stripe.com/test/settings/billing/portal', '_blank');
            }
          }, 1000);
        }
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      error = { error: 'Failed to create portal session', details: err.message };
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Debug Subscription - Wiskr</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
  <div class="max-w-4xl mx-auto px-4">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-8">
      Debug Subscription Status
    </h1>
    
    {#if loading}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div class="animate-pulse">
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
          <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    {:else if error}
      <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">Error</h2>
        <pre class="text-sm text-red-700 dark:text-red-300 whitespace-pre-wrap">{JSON.stringify(error, null, 2)}</pre>
      </div>
      
      {#if error.code === 'NO_SUBSCRIPTION' || error.error?.includes('No profile found')}
        <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
          <h2 class="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">Solution</h2>
          <p class="text-blue-700 dark:text-blue-300 mb-4">
            It looks like you don't have a profile or subscription. Let's fix this:
          </p>
          <button
            on:click={createProfile}
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Create Profile
          </button>
        </div>
      {:else if error.code === 'STRIPE_PORTAL_NOT_CONFIGURED'}
        <div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-6">
          <h2 class="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">Stripe Portal Setup Required</h2>
          <p class="text-yellow-700 dark:text-yellow-300 mb-4">
            The Stripe Customer Portal needs to be configured in your Stripe dashboard. This is a one-time setup.
          </p>
          <div class="space-y-2">
            <button
              on:click={() => window.open('https://dashboard.stripe.com/test/settings/billing/portal', '_blank')}
              class="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors mr-2"
            >
              Open Stripe Dashboard
            </button>
            <p class="text-sm text-yellow-600 dark:text-yellow-400">
              After configuring, test the portal session again.
            </p>
          </div>
        </div>
      {/if}
    {:else if subscriptionStatus}
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription Status</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 class="font-medium text-gray-700 dark:text-gray-300">User Info</h3>
            <ul class="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li><strong>ID:</strong> {subscriptionStatus.user.id}</li>
              <li><strong>Tier:</strong> {subscriptionStatus.user.tier}</li>
              <li><strong>Has Stripe Customer:</strong> {subscriptionStatus.user.hasStripeCustomer ? 'Yes' : 'No'}</li>
              <li><strong>Has Stripe Subscription:</strong> {subscriptionStatus.user.hasStripeSubscription ? 'Yes' : 'No'}</li>
              <li><strong>Subscription Status:</strong> {subscriptionStatus.user.subscriptionStatus}</li>
            </ul>
          </div>
          <div>
            <h3 class="font-medium text-gray-700 dark:text-gray-300">Stripe Details</h3>
            <ul class="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li><strong>Customer ID:</strong> {subscriptionStatus.subscription.customerId || 'None'}</li>
              <li><strong>Subscription ID:</strong> {subscriptionStatus.subscription.subscriptionId || 'None'}</li>
              <li><strong>Status:</strong> {subscriptionStatus.subscription.status || 'None'}</li>
            </ul>
          </div>
        </div>
      </div>
      
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Actions</h2>
        <div class="space-y-4">
          {#if subscriptionStatus.user.hasStripeCustomer}
            <button
              on:click={testPortalSession}
              class="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors mr-4"
            >
              Test Portal Session
            </button>
          {:else}
            <div class="text-gray-600 dark:text-gray-400">
              <p>You need to subscribe to a plan first. Visit the <a href="/plans" class="text-blue-600 hover:text-blue-700 underline">Plans page</a> to get started.</p>
            </div>
          {/if}
          
          <button
            on:click={() => window.location.reload()}
            class="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Refresh Status
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
