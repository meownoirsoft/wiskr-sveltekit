<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Crown, Gift, User, Calendar } from 'lucide-svelte';
  import { createModalClickHandler } from '$lib/utils/modalClickHandler.js';
  import { TIER_NAMES } from '$lib/config/tiers.js';

  const dispatch = createEventDispatcher();
  
  // Modal click handler for proper backdrop clicks
  const modalClickHandler = createModalClickHandler(() => {
    handleClose();
  });

  export let show = false;
  export let user = null;
  export let saving = false;

  let selectedTier = 0;
  let trialEndDate = '';

  // Reset form when user changes
  $: if (user) {
    selectedTier = user.tier || 0;
    trialEndDate = user.trial_ends_at ? user.trial_ends_at.split('T')[0] : '';
  }

  const tierOptions = [
    { value: 0, label: 'Free', icon: User, description: 'Basic features, limited projects' },
    { value: 1, label: 'Pro', icon: Crown, description: 'Advanced features, unlimited projects' },
    { value: 2, label: 'Studio', icon: Gift, description: 'All features, premium models' }
  ];

  function handleClose() {
    if (saving) return;
    dispatch('close');
  }

  function handleSave() {
    if (saving || !user) return;

    // Validate trial end date if Pro/Studio tier
    let validTrialEndDate = null;
    if (selectedTier > 0 && trialEndDate) {
      validTrialEndDate = new Date(trialEndDate + 'T23:59:59.999Z').toISOString();
    }

    dispatch('save', {
      userId: user.id,
      tier: selectedTier,
      trial_ends_at: validTrialEndDate
    });
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  }

  function getTierDisplayInfo(tier, trialEndsAt) {
    const tierName = TIER_NAMES[tier] || 'Free';
    if (tier > 0 && trialEndsAt) {
      const trialEnd = new Date(trialEndsAt);
      const now = new Date();
      if (now < trialEnd) {
        return `${tierName} (Trial until ${trialEnd.toLocaleDateString()})`;
      } else {
        return `${tierName} (Trial Expired)`;
      }
    }
    return tierName;
  }
</script>

{#if show}
  <div 
    class="fixed inset-0 z-50 flex items-center justify-center p-4"
    style="backdrop-filter: blur(8px); background-color: rgba(0, 0, 0, 0.5);"
    on:mousedown={modalClickHandler.handleMouseDown} on:click={modalClickHandler.handleClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="tier-change-title"
  >
    <div class="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md border border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
        <div>
          <h3 id="tier-change-title" class="text-lg font-semibold text-gray-900 dark:text-white">
            Change User Tier
          </h3>
          {#if user}
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {user.email}
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-500">
              Current: {getTierDisplayInfo(user.tier, user.trial_ends_at)}
            </p>
          {/if}
        </div>
        <button
          type="button"
          on:click={handleClose}
          disabled={saving}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Tier Selection -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Select Tier
          </label>
          <div class="space-y-3">
            {#each tierOptions as option}
              <label class="relative flex items-start p-3 rounded-lg border cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors {selectedTier === option.value ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/50' : 'border-gray-200 dark:border-gray-600'}">
                <input
                  type="radio"
                  bind:group={selectedTier}
                  value={option.value}
                  disabled={saving}
                  class="sr-only"
                />
                <div class="flex items-center gap-3 flex-1">
                  <svelte:component this={option.icon} class="h-5 w-5 {selectedTier === option.value ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}" />
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {option.label}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      {option.description}
                    </div>
                  </div>
                </div>
                {#if selectedTier === option.value}
                  <div class="h-4 w-4 rounded-full border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center">
                    <div class="h-2 w-2 rounded-full bg-blue-600 dark:bg-blue-400"></div>
                  </div>
                {:else}
                  <div class="h-4 w-4 rounded-full border-2 border-gray-300 dark:border-gray-500"></div>
                {/if}
              </label>
            {/each}
          </div>
        </div>

        <!-- Trial End Date (only for Pro/Studio) -->
        {#if selectedTier > 0}
          <div>
            <label for="trial-end-date" class="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar class="h-4 w-4" />
              Trial End Date (Optional)
            </label>
            <input
              id="trial-end-date"
              type="date"
              bind:value={trialEndDate}
              disabled={saving}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
              style="background-color: #1b1b1e;"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave empty for permanent tier. If set, user will revert to Free when trial expires.
            </p>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-600">
        <button
          type="button"
          on:click={handleClose}
          disabled={saving}
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          on:click={handleSave}
          disabled={saving || !user}
          class="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-md transition-colors"
        >
          {#if saving}
            Saving...
          {:else}
            Save Changes
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
