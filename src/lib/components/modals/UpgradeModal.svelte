<!-- UpgradeModal.svelte - Modal for upgrading to Pro/Studio tiers -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Check, Zap, Crown, Star } from 'lucide-svelte';
  import { TIER_NAMES } from '$lib/config/tiers.js';
  import { getUserTier, getUserTierName } from '$lib/utils/tiers.js';

  const dispatch = createEventDispatcher();

  export let showModal = false;
  export let targetTier = 1; // The tier being promoted (1 = Pro, 2 = Studio)
  export let feature = null; // The feature that triggered the upgrade prompt
  export let user = null; // Current user object

  // Loading state for upgrade button
  let isUpgrading = false;

  $: currentTier = getUserTier(user);
  $: currentTierName = getUserTierName(user);
  $: targetTierName = TIER_NAMES[targetTier] || 'Pro';

  function closeModal() {
    showModal = false;
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  function handleUpgrade() {
    // Show loading state
    isUpgrading = true;
    
    // Navigate to plans page with the target tier pre-selected
    window.location.href = `/plans?tier=${targetTier}&feature=${encodeURIComponent(feature || '')}`;
  }

  // Features for each tier
  const proFeatures = [
    'Unlimited projects',
    'Advanced AI models (Claude, GPT-4, etc.)',
    'SayLess text compression',
    'Custom fact types',
    'Advanced export formats',
    'Auto-tagging',
    'Color schemes & custom avatars'
  ];

  const studioFeatures = [
    ...proFeatures,
    'All premium AI models',
    'Priority support',
    'Beta features access',
    'Account-wide export',
    'Advanced analytics',
    'Team collaboration (coming soon)'
  ];

  $: features = targetTier === 2 ? studioFeatures : proFeatures;
  $: Icon = targetTier === 2 ? Crown : Zap;
  $: accentColor = targetTier === 2 ? 'purple' : 'blue';
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
    style="background-color: rgba(0, 0, 0, 0.5);"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="upgrade-modal-title"
    tabindex="0"
  >
    <!-- Modal Content -->
    <div 
      class="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      style="background-color: var(--bg-modal, white); transform: translateZ(0);"
      on:click={(e) => e.stopPropagation()}
      data-testid="upgrade-modal"
    >
      <!-- Header -->
      <div class="relative p-6 text-center bg-gradient-to-r from-{accentColor}-500 to-{accentColor}-600">
        <button
          on:click={closeModal}
          class="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          aria-label="Close upgrade modal"
        >
          <X size="24" />
        </button>
        
        <div class="flex justify-center mb-4">
          <div class="p-3 bg-white bg-opacity-20 rounded-full">
            <svelte:component this={Icon} size="32" class="text-white" />
          </div>
        </div>
        
        <h2 id="upgrade-modal-title" class="text-2xl font-bold text-white mb-2">
          Upgrade to {targetTierName}
        </h2>
        <p class="text-{accentColor}-100 text-sm">
          Unlock powerful features to supercharge your productivity
        </p>
      </div>

      <!-- Content -->
      <div class="p-6">
        {#if feature}
          <div class="mb-6 p-4 bg-{accentColor}-50 dark:bg-{accentColor}-900/20 rounded-lg border border-{accentColor}-200 dark:border-{accentColor}-800">
            <div class="flex items-center gap-2 mb-2">
              <Star size="16" class="text-{accentColor}-600 dark:text-{accentColor}-400" />
              <span class="font-medium text-{accentColor}-800 dark:text-{accentColor}-200 capitalize">
                {feature.replace('-', ' ')} Feature
              </span>
            </div>
            <p class="text-sm text-{accentColor}-700 dark:text-{accentColor}-300">
              This premium feature requires {targetTierName} to unlock its full potential.
            </p>
          </div>
        {/if}

        <div class="mb-6">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            What you'll get with {targetTierName}:
          </h3>
          <ul class="space-y-2">
            {#each features as feature}
              <li class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <Check size="16" class="text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            {/each}
          </ul>
        </div>

        <!-- Current tier info -->
        <div class="mb-6 p-3 bg-gray-50 dark:bg-slate-800 rounded-lg">
          <p class="text-xs text-gray-600 dark:text-gray-400 text-center">
            Currently on: <span class="font-medium">{currentTierName}</span>
          </p>
        </div>

        <!-- Action buttons -->
        <div class="flex gap-3">
          <button
            on:click={closeModal}
            class="flex-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Maybe Later
          </button>
          <button
            on:click={handleUpgrade}
            disabled={isUpgrading}
            class="flex-1 px-4 py-2 text-sm rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style="background-color: var(--color-accent, {targetTier === 2 ? '#7c3aed' : '#3b82f6'});"
            class:hover:opacity-90={true}
            data-testid="upgrade-button"
          >
            {#if isUpgrading}
              <div class="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
              Upgrading...
            {:else}
              Upgrade to {targetTierName}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure modal backdrop is properly positioned */
  div[role="dialog"] {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    z-index: 99999 !important;
  }
  
  /* Modal content positioning */
  div[role="dialog"] > div:last-child {
    max-height: 90vh !important;
    max-width: 28rem !important; /* Limit width to reasonable size */
    width: 100% !important;
    overflow-y: auto !important;
    transform: translateZ(0) !important;
    margin: auto !important;
  }
  
  /* Dynamic color classes for Tailwind - ensure they're included in build */
  :global(.bg-blue-50) { background-color: #eff6ff; }
  :global(.bg-blue-500) { background-color: #3b82f6; }
  :global(.bg-blue-600) { background-color: #2563eb; }
  :global(.text-blue-100) { color: #dbeafe; }
  :global(.text-blue-600) { color: #2563eb; }
  :global(.text-blue-700) { color: #1d4ed8; }
  :global(.text-blue-800) { color: #1e40af; }
  :global(.border-blue-200) { border-color: #bfdbfe; }
  :global(.border-blue-800) { border-color: #1e40af; }
  
  :global(.bg-purple-50) { background-color: #faf5ff; }
  :global(.bg-purple-500) { background-color: #8b5cf6; }
  :global(.bg-purple-600) { background-color: #7c3aed; }
  :global(.text-purple-100) { color: #e9d5ff; }
  :global(.text-purple-600) { color: #7c3aed; }
  :global(.text-purple-700) { color: #6d28d9; }
  :global(.text-purple-800) { color: #5b21b6; }
  :global(.border-purple-200) { border-color: #ddd6fe; }
  :global(.border-purple-800) { border-color: #5b21b6; }
</style>
