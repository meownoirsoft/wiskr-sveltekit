<script>
  import { createEventDispatcher } from 'svelte';
  import { X } from 'lucide-svelte';

  export let isOpen = false;
  export let title = 'Confirm Action';
  export let message = 'Are you sure you want to proceed?';
  export let confirmText = 'Confirm';
  export let cancelText = 'Cancel';
  export let confirmClass = 'bg-red-600 hover:bg-red-700 text-white';
  export let cancelClass = 'bg-gray-300 hover:bg-gray-400 text-gray-800';


  const dispatch = createEventDispatcher();

  function handleConfirm() {
    dispatch('confirm');
    // Don't set isOpen = false here - let the parent control it
  }

  function handleCancel() {
    dispatch('cancel');
    // Don't set isOpen = false here - let the parent control it
  }

  function closeModal() {
    isOpen = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      handleCancel();
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 flex items-center justify-center z-[9999]"
    style="background-color: rgba(0, 0, 0, 0.1); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);"
    on:click={closeModal}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    tabindex="-1"
  >
    <div 
      class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <button
          on:click={closeModal}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <X size="20" />
        </button>
      </div>

      <!-- Message -->
      <div class="mb-6">
        <p class="text-gray-600 dark:text-gray-300">
          {message}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3">
        <button
          on:click={handleCancel}
          class="px-4 py-2 rounded-md font-medium transition-colors {cancelClass}"
        >
          {cancelText}
        </button>
        <button
          on:click={handleConfirm}
          class="px-4 py-2 rounded-md font-medium transition-colors {confirmClass}"
        >
          {confirmText}
        </button>
      </div>
    </div>
  </div>
{/if}
