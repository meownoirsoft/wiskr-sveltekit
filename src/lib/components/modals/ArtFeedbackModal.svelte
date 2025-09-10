<script>
  import { createEventDispatcher } from 'svelte';
  import { X, AlertTriangle, Image, Palette, Zap, MessageSquare } from 'lucide-svelte';

  export let isOpen = false;
  export let artUrl = '';
  export let cardId = '';
  export let cardTitle = '';

  const dispatch = createEventDispatcher();

  let selectedReason = '';
  let details = '';
  let isSubmitting = false;

  const feedbackReasons = [
    {
      id: 'text_in_image',
      label: 'Text or words in image',
      description: 'The image contains text, letters, or written content',
      icon: MessageSquare
    },
    {
      id: 'card_borders',
      label: 'Card borders or UI elements',
      description: 'The image shows card frames, borders, or game UI elements',
      icon: Image
    },
    {
      id: 'low_quality',
      label: 'Low quality or blurry',
      description: 'The image is blurry, pixelated, or low resolution',
      icon: AlertTriangle
    },
    {
      id: 'wrong_style',
      label: 'Wrong art style',
      description: 'The art style doesn\'t match MTG/fantasy card art',
      icon: Palette
    },
    {
      id: 'other',
      label: 'Other issue',
      description: 'Something else is wrong with the art',
      icon: Zap
    }
  ];

  function closeModal() {
    if (isSubmitting) return;
    dispatch('close');
  }

  function handleSubmit() {
    if (!selectedReason) return;
    
    isSubmitting = true;
    dispatch('submit', {
      artUrl,
      cardId,
      reason: selectedReason,
      details: details.trim()
    });
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      closeModal();
    }
  }

  // Reset form when modal opens
  $: if (isOpen) {
    selectedReason = '';
    details = '';
    isSubmitting = false;
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <div
    class="fixed inset-0 flex items-center justify-center z-[9999]"
    style="background-color: rgba(0, 0, 0, 0.1); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"
    on:click={closeModal}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Report Art Issue
        </h3>
        <button
          on:click={closeModal}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Close modal"
          disabled={isSubmitting}
        >
          <X size="20" />
        </button>
      </div>

      <!-- Card Info -->
      <div class="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <p class="text-sm text-gray-600 dark:text-gray-300">
          <strong>Card:</strong> {cardTitle}
        </p>
        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Help us improve art generation by reporting issues
        </p>
      </div>

      <!-- Art Preview -->
      {#if artUrl}
        <div class="mb-4">
          <img
            src={artUrl}
            alt="Card art preview"
            class="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
          />
        </div>
      {/if}

      <!-- Reason Selection -->
      <div class="mb-4">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          What's wrong with this art?
        </label>
        <div class="space-y-2">
          {#each feedbackReasons as reason}
            <label class="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <input
                type="radio"
                bind:group={selectedReason}
                value={reason.id}
                class="mt-1"
                disabled={isSubmitting}
              />
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <svelte:component this={reason.icon} size="16" class="text-gray-500 dark:text-gray-400" />
                  <span class="font-medium text-gray-900 dark:text-gray-100">{reason.label}</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">{reason.description}</p>
              </div>
            </label>
          {/each}
        </div>
      </div>

      <!-- Additional Details -->
      <div class="mb-6">
        <label for="details" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Additional details (optional)
        </label>
        <textarea
          id="details"
          bind:value={details}
          placeholder="Describe the issue in more detail..."
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
          rows="3"
          disabled={isSubmitting}
        ></textarea>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          on:click={closeModal}
          class="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md font-medium transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          on:click={handleSubmit}
          class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!selectedReason || isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </div>
  </div>
{/if}
