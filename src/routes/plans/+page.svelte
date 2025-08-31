<script>
  import { Crown, Check, X, Zap, Shield, Users, CreditCard, Settings } from 'lucide-svelte';
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  
  // Get user data from page data
  export let data;
  
  let loading = false;
  let error = null;
  let currentUser = null;
  
  // Individual loading states for each plan
  let loadingStates = {
    pro: false,
    studio: false
  };
  
  // Loading state for manage subscription
  let manageSubscriptionLoading = false;
  
  onMount(() => {
    if (browser && data?.user) {
      currentUser = data.user;
    }
  });
  
  // Plan configurations with pricing and features
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for getting started with Wiskr',
      icon: '🚀',
      color: 'bg-gray-100 dark:bg-gray-700',
      borderColor: 'border-gray-200 dark:border-gray-600',
      buttonStyle: 'border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
      features: [
        { name: 'Up to 3 projects', included: true },
        { name: '10,000 AI tokens/month', included: true },
        { name: 'Basic Wiskr models (Speed, Micro)', included: true },
        { name: 'Community Discord support', included: true },
        { name: 'Project facts and context', included: true },
        { name: 'Conversation branching', included: true },
        { name: 'Data export (JSON)', included: true },
        { name: 'Advanced Wiskr models', included: false },
        { name: 'Unlimited projects', included: false },
        { name: 'Priority email support', included: false },
        { name: 'Premium features', included: false }
      ],
      limits: {
        projects: '3 projects',
        tokens: '10K tokens/month',
        models: 'Basic models only',
        support: 'Community Discord'
      }
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$15',
      period: 'month',
      description: 'For power users who need advanced features',
      icon: '⭐',
      color: 'bg-blue-50 dark:bg-blue-900/20',
      borderColor: 'border-blue-200 dark:border-blue-700',
      buttonStyle: 'text-white font-medium shadow-lg',
      popular: true,
      tier: 1,
      features: [
        { name: 'Up to 50 projects', included: true },
        { name: '500,000 AI tokens/month', included: true },
        { name: 'All Wiskr models (including Quality, Claude)', included: true },
        { name: 'Priority email support', included: true },
        { name: 'Private Discord channel access', included: true },
        { name: 'Advanced export formats (CSV, MD)', included: true },
        { name: 'Enhanced fact management', included: true },
        { name: 'Usage analytics', included: true },
        { name: 'Everything in Free', included: true }
      ],
      limits: {
        projects: '50 projects',
        tokens: '500K tokens/month',
        models: 'All models',
        support: 'Email + Private Discord'
      }
    },
    {
      id: 'studio',
      name: 'Studio',
      price: '$39',
      period: 'month',
      description: 'For teams who need the best models and features',
      icon: '👑',
      color: 'bg-purple-50 dark:bg-purple-900/20',
      borderColor: 'border-purple-200 dark:border-purple-700',
      buttonStyle: 'border border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-900/30',
      tier: 2,
      features: [
        { name: 'Unlimited projects', included: true },
        { name: '2,000,000 AI tokens/month', included: true },
        { name: 'Everything in Pro', included: true },
        { name: 'Team collaboration features', included: true },
        { name: 'Admin dashboard and controls', included: true },
        { name: 'Custom Wiskr model integrations', included: true },
        { name: 'API access for integrations', included: true },
        { name: 'Dedicated support manager', included: true },
        { name: 'Service Level Agreement (SLA)', included: true },
        { name: 'Custom onboarding and training', included: true },
        { name: 'Priority feature requests', included: true },
        { name: 'Single Sign-On (SSO)', included: true }
      ],
      limits: {
        projects: 'Unlimited',
        tokens: '2M tokens/month',
        models: 'All models + Custom',
        support: 'Dedicated support'
      }
    }
  ];
  
  // Additional features comparison
  const featureComparison = [
    { category: 'Projects & Organization', features: [
      { name: 'Number of projects', free: '3', pro: '50', studio: 'Unlimited' },
      { name: 'Project templates', free: false, pro: true, studio: true },
      { name: 'Project sharing', free: false, pro: true, studio: true },
      { name: 'Team collaboration', free: false, pro: false, studio: true }
    ]},
    { category: 'Wiskr Models & AI', features: [
      { name: 'Basic models (Speed, Micro)', free: true, pro: true, studio: true },
      { name: 'Advanced models (Quality, Claude)', free: false, pro: true, studio: true },
      { name: 'Custom model integrations', free: false, pro: false, studio: true },
      { name: 'API access', free: false, pro: false, studio: true }
    ]},
    { category: 'Support & Service', features: [
      { name: 'Community Discord', free: true, pro: true, studio: true },
      { name: 'Email support', free: false, pro: true, studio: true },
      { name: 'Private Discord channel', free: false, pro: true, studio: true },
      { name: 'Dedicated support manager', free: false, pro: false, studio: true },
      { name: 'SLA guarantee', free: false, pro: false, studio: true }
    ]},
    { category: 'Data & Export', features: [
      { name: 'Basic export (JSON)', free: true, pro: true, studio: true },
      { name: 'Advanced exports (CSV, MD)', free: false, pro: true, studio: true },
      { name: 'Usage analytics', free: false, pro: true, studio: true },
      { name: 'Admin dashboard', free: false, pro: false, studio: true }
    ]}
  ];

  // Stripe checkout functions
  async function handleUpgrade(tier) {
    if (!currentUser) {
      // Redirect to login if not authenticated
      goto('/login');
      return;
    }

    if (currentUser.tier >= tier) {
      error = 'You are already subscribed to this tier or higher.';
      return;
    }

    // Set loading state for the specific plan
    const planId = tier === 1 ? 'pro' : 'studio';
    loadingStates[planId] = true;
    error = null;

    try {
      const response = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier,
          successUrl: `${window.location.origin}/projects?upgraded=true&tier=${tier}`,
          cancelUrl: `${window.location.origin}/projects?upgrade_canceled=true`,
        }),
      });

      const data = await response.json();

      if (data.error) {
        error = data.error;
      } else if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      }
    } catch (err) {
      error = 'Failed to create checkout session. Please try again.';
      console.error('Checkout error:', err);
    } finally {
      loadingStates[planId] = false;
    }
  }

  async function handleManageSubscription() {
    if (!currentUser) {
      goto('/login');
      return;
    }

    manageSubscriptionLoading = true;
    error = null;

    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.error) {
        error = data.error;
      } else if (data.url) {
        // Redirect to Stripe customer portal
        window.location.href = data.url;
      }
    } catch (err) {
      error = 'Failed to open customer portal. Please try again.';
      console.error('Portal error:', err);
    } finally {
      manageSubscriptionLoading = false;
    }
  }

  // Get current user's plan
  $: currentPlan = currentUser ? plans.find(p => p.tier === currentUser.tier) || plans[0] : plans[0];
  $: isSubscribed = currentUser && currentUser.tier > 0;
</script>

<svelte:head>
  <title>Plans & Pricing — Wiskr</title>
  <meta name="description" content="Choose the perfect Wiskr plan for your needs. From free community access to enterprise-grade features." />
  <meta name="robots" content="index,follow" />
</svelte:head>

<section class="mx-auto max-w-7xl px-6 py-12">
  <!-- Hero Section -->
  <header class="mb-16 text-center">
    <h1 class="text-5xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Choose Your Plan</h1>
    <p class="mt-6 text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
      Start free and upgrade as you grow. Every plan includes conversation management, project organization, and access to Wiskrs.
    </p>
    <div class="mt-8 flex items-center justify-center gap-4">
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Check size="16" class="text-green-500" />
        <span>No credit card required for Free plan</span>
      </div>
      <div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Check size="16" class="text-green-500" />
        <span>Cancel anytime</span>
      </div>
    </div>
  </header>

  <!-- Current Plan Section -->
  {#if currentUser && isSubscribed}
    <div class="mb-12 text-center">
      <div class="inline-flex items-center gap-3 px-6 py-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-600">
        <div class="text-2xl">{currentPlan.icon}</div>
        <div class="text-left">
          <h3 class="text-lg font-semibold text-green-800 dark:text-green-200">
            You're currently on the {currentPlan.name} plan
          </h3>
          <p class="text-sm text-green-600 dark:text-green-400">
            Manage your subscription or upgrade to unlock more features
          </p>
        </div>
        <button
          on:click={handleManageSubscription}
          disabled={loading}
          class="px-4 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/70 transition-colors flex items-center gap-2"
        >
          {#if loading}
            <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
          {/if}
          <Settings size="16" />
          Manage Subscription
        </button>
      </div>
    </div>
  {/if}

  <!-- Error Display -->
  {#if error}
    <div class="mb-8 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-600 text-red-700 dark:text-red-300">
        <X size="16" />
        {error}
      </div>
    </div>
  {/if}

  <!-- Success/Cancel Messages -->
  {#if browser && new URLSearchParams(window.location.search).get('success') === 'true'}
    <div class="mb-8 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-600 text-green-700 dark:text-green-300">
        <Check size="16" />
        Payment successful! Your subscription has been activated.
      </div>
    </div>
  {/if}

  {#if browser && new URLSearchParams(window.location.search).get('canceled') === 'true'}
    <div class="mb-8 text-center">
      <div class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300">
        <X size="16" />
        Payment was canceled. No charges were made.
      </div>
    </div>
  {/if}

  <!-- Pricing Cards -->
  <div class="mb-20">
    <div class="grid gap-8 lg:grid-cols-3">
      {#each plans as plan}
        <div 
          class="relative rounded-2xl p-8 transition-all hover:shadow-xl dark:hover:shadow-gray-800/25 {plan.color} border {plan.borderColor} {plan.comingSoon ? 'opacity-90' : ''}"
          style="background-color: var(--bg-card);"
        >
          <!-- Coming Soon Badge -->
          {#if plan.comingSoon}
            <div class="absolute -top-3 -right-3 z-10">
              <div class="px-4 py-2 text-xs font-bold text-white rounded-full shadow-lg transform rotate-12 bg-gradient-to-r from-purple-500 to-pink-500">
                Coming Soon
              </div>
            </div>
          {/if}
          
          <!-- Popular Badge -->
          {#if plan.popular}
            <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <div class="px-4 py-1 text-sm font-medium text-white rounded-full shadow-lg" style="background-color: var(--color-accent);">
                Most Popular
              </div>
            </div>
          {/if}

          <!-- Plan Header -->
          <div class="text-center mb-8">
            <div class="text-5xl mb-4">{plan.icon}</div>
            <h3 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{plan.name}</h3>
            <div class="flex items-baseline justify-center gap-1 mb-3">
              <span class="text-4xl font-bold text-gray-900 dark:text-gray-100">{plan.price}</span>
              <span class="text-gray-600 dark:text-gray-400">/{plan.period}</span>
            </div>
            <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{plan.description}</p>
          </div>

          <!-- CTA Button -->
          <div class="mb-8">
            {#if plan.id === 'free'}
              <a 
                href="/signup"
                class="w-full px-6 py-3 text-center rounded-lg transition-all font-medium {plan.buttonStyle} block"
              >
                Get Started Free
              </a>
            {:else if plan.tier && currentUser?.tier >= plan.tier}
              <button 
                class="w-full px-6 py-3 text-center rounded-lg font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-600 cursor-default"
                disabled
              >
                Current Plan
              </button>
            {:else if plan.tier}
              <button 
                on:click={() => handleUpgrade(plan.tier)}
                disabled={loadingStates[plan.id]}
                class="w-full px-6 py-3 text-center rounded-lg transition-all font-medium {plan.id === 'pro' ? 'text-white shadow-lg' : plan.buttonStyle} block"
                style="background-color: {plan.id === 'pro' ? 'var(--color-accent)' : ''}; color: {plan.id === 'pro' ? 'var(--color-accent-text)' : ''};"
                on:mouseenter={(e) => plan.id === 'pro' && (e.target.style.backgroundColor = 'var(--color-accent-hover)')}
                on:mouseleave={(e) => plan.id === 'pro' && (e.target.style.backgroundColor = 'var(--color-accent)')}
                data-testid="upgrade-button"
              >
                {#if loadingStates[plan.id]}
                  <div class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                {/if}
                {#if loadingStates[plan.id]}
                  {plan.id === 'pro' ? 'Starting...' : 'Upgrading...'}
                {:else}
                  {plan.id === 'pro' ? 'Start Pro Trial' : `Upgrade to ${plan.name}`}
                {/if}
              </button>
            {:else}
              <button 
                class="w-full px-6 py-3 text-center rounded-lg font-medium bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                disabled
              >
                Coming Soon
              </button>
            {/if}
          </div>

          <!-- Plan Limits Summary -->
          <div class="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
            <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Plan Includes:</h4>
            <div class="space-y-2 text-xs">
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Projects:</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">{plan.limits.projects}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Wiskrs:</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">{plan.limits.models}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600 dark:text-gray-400">Support:</span>
                <span class="font-medium text-gray-900 dark:text-gray-100">{plan.limits.support}</span>
              </div>
            </div>
          </div>

          <!-- Feature List -->
          <div class="space-y-3">
            {#each plan.features as feature}
              <div class="flex items-center gap-3">
                {#if feature.included}
                  <Check size="16" class="text-green-500 flex-shrink-0" />
                  <span class="text-sm text-gray-900 dark:text-gray-100">{feature.name}</span>
                {:else}
                  <X size="16" class="text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span class="text-sm text-gray-500 dark:text-gray-400">{feature.name}</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Feature Comparison Table -->
  <div class="mb-20">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Compare Plans</h2>
      <p class="mt-4 text-lg text-gray-600 dark:text-gray-400">
        Detailed comparison of features across all plans
      </p>
    </div>

    <div class="overflow-x-auto">
      <div class="min-w-full bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <!-- Table Header -->
        <div class="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
          <div class="grid grid-cols-4 gap-4">
            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Features</div>
            <div class="text-center text-sm font-medium text-gray-900 dark:text-gray-100">Free</div>
            <div class="text-center text-sm font-medium text-gray-900 dark:text-gray-100">Pro</div>
            <div class="text-center text-sm font-medium text-gray-900 dark:text-gray-100">Studio</div>
          </div>
        </div>

        <!-- Feature Categories -->
        {#each featureComparison as category}
          <div class="border-b border-gray-200 dark:border-gray-600">
            <div class="bg-gray-25 dark:bg-gray-750 px-6 py-3 border-b border-gray-200 dark:border-gray-600">
              <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">{category.category}</h3>
            </div>
            {#each category.features as feature}
              <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div class="grid grid-cols-4 gap-4 items-center">
                  <div class="text-sm text-gray-700 dark:text-gray-300">{feature.name}</div>
                  <div class="text-center">
                    {#if typeof feature.free === 'boolean'}
                      {#if feature.free}
                        <Check size="16" class="text-green-500 mx-auto" />
                      {:else}
                        <X size="16" class="text-gray-400 mx-auto" />
                      {/if}
                    {:else}
                      <span class="text-sm text-gray-600 dark:text-gray-400">{feature.free}</span>
                    {/if}
                  </div>
                  <div class="text-center">
                    {#if typeof feature.pro === 'boolean'}
                      {#if feature.pro}
                        <Check size="16" class="text-green-500 mx-auto" />
                      {:else}
                        <X size="16" class="text-gray-400 mx-auto" />
                      {/if}
                    {:else}
                      <span class="text-sm text-gray-600 dark:text-gray-400">{feature.pro}</span>
                    {/if}
                  </div>
                  <div class="text-center">
                    {#if typeof feature.studio === 'boolean'}
                      {#if feature.studio}
                        <Check size="16" class="text-green-500 mx-auto" />
                      {:else}
                        <X size="16" class="text-gray-400 mx-auto" />
                      {/if}
                    {:else}
                      <span class="text-sm text-gray-600 dark:text-gray-400">{feature.studio}</span>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- FAQ Section -->
  <div class="mb-20">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Frequently Asked Questions</h2>
    </div>

    <div class="max-w-3xl mx-auto space-y-6">
      <div class="rounded-lg border border-gray-200 dark:border-gray-700" style="background-color: var(--bg-card);">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Can I change plans anytime?</h3>
          <p class="text-gray-600 dark:text-gray-400">
            Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and you'll only be charged the prorated difference.
          </p>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 dark:border-gray-700" style="background-color: var(--bg-card);">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">What happens to my data if I cancel?</h3>
          <p class="text-gray-600 dark:text-gray-400">
            Your data remains accessible for 90 days after cancellation. You can export all your projects, conversations, and facts before the data is archived. If you have any problems, please contact our support team.
          </p>
        </div>
      </div>

      <div class="rounded-lg border border-gray-200 dark:border-gray-700" style="background-color: var(--bg-card);">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Do you offer refunds?</h3>
          <p class="text-gray-600 dark:text-gray-400">
            Yes! We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied, contact us for a full refund.
          </p>
        </div>
      </div>

      <!-- <div class="rounded-lg border border-gray-200 dark:border-gray-700" style="background-color: var(--bg-card);">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Is there a student discount?</h3>
          <p class="text-gray-600 dark:text-gray-400">We'd love to offer a student discount. Let us know if you're interested, and we'll see what we can do!</p>
        </div>
      </div> -->

      <div class="rounded-lg border border-gray-200 dark:border-gray-700" style="background-color: var(--bg-card);">
        <div class="p-6">
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">What makes Wiskr different?</h3>
          <p class="text-gray-600 dark:text-gray-400">
            Wiskr focuses on conversation management with context. Unlike other AI tools, we help you organize projects, manage facts, and maintain context across multiple conversation branches with various AI models.
          </p>
        </div>
      </div>
    </div>
  </div>

  <!-- CTA Section -->
  <div class="text-center">
    <div class="rounded-2xl p-8 lg:p-12" style="background-color: var(--bg-card); border: 1px solid var(--color-accent-border);">
      <h2 class="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Ready to get started?</h2>
      <p class="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
        Join thousands of users who are already managing their AI conversations better with Wiskr.
      </p>
      <div class="flex flex-col sm:flex-row gap-4 justify-center">
        <a 
          href="/signup"
          class="px-8 py-3 rounded-lg font-medium transition-all hover:shadow-lg"
          style="background-color: var(--color-accent); color: var(--color-accent-text);"
          on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
          on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
        >
          Start Free Today
        </a>
        <a 
          href="/support"
          class="px-8 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-all hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Have Questions?
        </a>
      </div>
    </div>
  </div>
</section>
