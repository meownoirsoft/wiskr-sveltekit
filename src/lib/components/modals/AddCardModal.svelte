<!-- AddCardModal.svelte - Modal for creating new idea cards -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Star, Zap } from 'lucide-svelte';

  export let projectFactTypes = [];
  export let show = true;

  const dispatch = createEventDispatcher();

  let title = '';
  let content = '';
  let tags = '';
  let rarity = 'common';
  let progress = 1;
  let type = '';
  let flavorText = '';
  let isSubmitting = false;

  // Progress levels
  const progressLevels = [
    { level: 1, name: 'Raw', description: 'Just an idea, needs development' },
    { level: 2, name: 'Rough', description: 'Basic concept, needs refinement' },
    { level: 3, name: 'Crystal', description: 'Clear idea, needs polishing' },
    { level: 4, name: 'Cut', description: 'Well-formed, needs final touches' },
    { level: 5, name: 'Shimmer', description: 'Complete and ready to use' }
  ];

  // Rarity options
  const rarityOptions = [
    { value: 'common', label: 'Common', description: 'Everyday ideas and concepts', color: 'text-teal-600' },
    { value: 'special', label: 'Special', description: 'Notable ideas with potential', color: 'text-blue-600' },
    { value: 'rare', label: 'Rare', description: 'Important ideas for your world', color: 'text-purple-600' },
    { value: 'legendary', label: 'Legendary', description: 'Pivotal ideas that define your world', color: 'text-orange-600' }
  ];

  function closeModal() {
    if (!isSubmitting) {
      dispatch('cancel');
    }
  }

  function handleSubmit() {
    if (!title.trim() || !content.trim()) return;
    
    isSubmitting = true;
    dispatch('save', {
      title: title.trim(),
      content: content.trim(),
      tags: tags.trim(),
      rarity,
      progress,
      type: type || (projectFactTypes[0]?.type_key || 'concept'),
      flavorText: flavorText.trim()
    });
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      handleSubmit();
    }
  }

  // Auto-generate title from content if empty
  $: if (content && !title) {
    const words = content.trim().split(' ').slice(0, 4);
    title = words.join(' ') + (content.split(' ').length > 4 ? '...' : '');
  }
</script>

{#if show}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
    style="background-color: rgba(0, 0, 0, 0.25);"
    on:click={(e) => e.target === e.currentTarget && closeModal()}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-card-title"
    tabindex="0"
  >
    <!-- Modal Content -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Zap size="20" class="text-white" />
          </div>
          <div>
            <h2 id="create-card-title" class="text-xl font-bold text-gray-900 dark:text-gray-100">Create New Card</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Add a new idea to your world</p>
          </div>
        </div>
        <button
          on:click={closeModal}
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <X size="24" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="space-y-6">
          <!-- Title -->
          <div>
            <label for="card-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Title
            </label>
            <input 
              id="card-title"
              type="text" 
              bind:value={title}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
              style="--tw-ring-color: var(--color-accent);"
              placeholder="Enter a title for your idea..."
            />
          </div>

          <!-- Content -->
          <div>
            <label for="card-content" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Idea Content
              <span class="text-red-500">*</span>
            </label>
            <textarea 
              id="card-content"
              bind:value={content}
              rows="4"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style="--tw-ring-color: var(--color-accent);"
              placeholder="Describe your idea in detail..."
            ></textarea>
          </div>

          <!-- Rarity and Progress Row -->
          <div class="grid grid-cols-2 gap-6">
            <!-- Rarity -->
            <div>
              <label for="card-rarity" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rarity
              </label>
              <select 
                id="card-rarity"
                bind:value={rarity}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                style="--tw-ring-color: var(--color-accent);"
              >
                {#each rarityOptions as option}
                  <option value={option.value}>{option.label}</option>
                {/each}
              </select>
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {rarityOptions.find(o => o.value === rarity)?.description}
              </p>
            </div>

            <!-- Progress -->
            <div>
              <label for="card-progress" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Progress Level
              </label>
              <div class="flex items-center gap-2">
                {#each progressLevels as level}
                  <button
                    type="button"
                    class="flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors cursor-pointer {progress === level.level ? 'progress-star-selected' : 'progress-star-unselected'}"
                    on:click={() => progress = level.level}
                    title="{level.name}: {level.description}"
                  >
                    <Star size="16" style="fill: {progress >= level.level ? '#000000' : '#9ca3af'}; color: {progress >= level.level ? '#000000' : '#9ca3af'};" />
                    <span class="text-xs font-medium">{level.name}</span>
                  </button>
                {/each}
              </div>
            </div>
          </div>

          <!-- Type and Tags Row -->
          <div class="grid grid-cols-2 gap-6">
            <!-- Type -->
            {#if projectFactTypes.length > 0}
              <div>
                <label for="card-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select 
                  id="card-type"
                  bind:value={type}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                  style="--tw-ring-color: var(--color-accent);"
                >
                  {#each projectFactTypes as factType}
                    <option value={factType.type_key}>{factType.display_name}</option>
                  {/each}
                </select>
              </div>
            {/if}

            <!-- Tags -->
            <div>
              <label for="card-tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <input 
                id="card-tags"
                type="text" 
                bind:value={tags}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
                style="--tw-ring-color: var(--color-accent);"
                placeholder="tag1, tag2, tag3..."
              />
              <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Separate tags with commas
              </p>
            </div>
          </div>

          <!-- Flavor Text -->
          <div>
            <label for="card-flavor" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Flavor Text (Optional)
            </label>
            <textarea 
              id="card-flavor"
              bind:value={flavorText}
              rows="2"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent resize-none"
              style="--tw-ring-color: var(--color-accent);"
              placeholder="Additional context or flavor text..."
            ></textarea>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="flex items-center justify-end gap-3 p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          on:click={closeModal}
          class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="button"
          on:click={handleSubmit}
          class="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style="background-color: var(--color-accent); color: var(--color-accent-text);"
          disabled={!title.trim() || !content.trim() || isSubmitting}
        >
          {#if isSubmitting}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            Creating...
          {:else}
            <Zap size="16" />
            Create Card
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .progress-star-selected {
    background-color: #1e40af !important; /* blue-800 - distinct blue background */
    border-color: #60a5fa !important; /* blue-400 */
  }
  
  .progress-star-unselected {
    background-color: transparent !important;
    border-color: #4b5563 !important; /* gray-600 */
  }
  
  .progress-star-selected:hover {
    background-color: #374151 !important; /* gray-700 */
  }
  
  .progress-star-unselected:hover {
    background-color: #374151 !important; /* gray-700 */
    border-color: #6b7280 !important; /* gray-500 */
  }
</style>
