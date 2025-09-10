<!-- EditCardModal.svelte - Modal for editing existing idea cards -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { X, Star, Save, Trash } from 'lucide-svelte';

  export let card = null;
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
  let showDeleteConfirm = false;

  // Initialize form with card data
  $: if (card) {
    title = card.title || card.key || '';
    content = card.content || '';
    tags = card.tags ? card.tags.join(', ') : '';
    rarity = card.rarity || 'common';
    progress = card.progress || 1;
    type = card.type || '';
    flavorText = card.flavor_text || '';
  }

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

  function handleSave() {
    if (!title.trim() || !content.trim()) return;
    
    isSubmitting = true;
    dispatch('save', {
      card,
      updates: {
        title: title.trim(),
        content: content.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        rarity,
        progress,
        type: type || (projectFactTypes[0]?.type_key || 'concept'),
        flavor_text: flavorText.trim()
      }
    });
  }

  function handleDelete() {
    showDeleteConfirm = true;
  }

  function confirmDelete() {
    dispatch('delete', { card });
    closeModal();
  }

  function cancelDelete() {
    showDeleteConfirm = false;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      if (showDeleteConfirm) {
        cancelDelete();
      } else {
        closeModal();
      }
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      handleSave();
    }
  }
</script>

{#if show && card}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 backdrop-blur-sm z-[99999] flex items-center justify-center p-4"
    style="background-color: rgba(0, 0, 0, 0.25);"
    on:click={(e) => e.target === e.currentTarget && !showDeleteConfirm && closeModal()}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="edit-card-title"
    tabindex="0"
  >
    <!-- Modal Content -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
            <Star size="20" class="text-white" />
          </div>
          <div>
            <h2 id="edit-card-title" class="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Card</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">Modify your idea card</p>
          </div>
        </div>
        <button
          on:click={closeModal}
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
          disabled={isSubmitting}
        >
          <X size="24" />
        </button>
      </div>

      <!-- Modal Body -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="space-y-6">
          <!-- Title -->
          <div>
            <label for="edit-card-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Card Title
            </label>
            <input 
              id="edit-card-title"
              type="text" 
              bind:value={title}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent"
              style="--tw-ring-color: var(--color-accent);"
              placeholder="Enter a title for your idea..."
            />
          </div>

          <!-- Content -->
          <div>
            <label for="edit-card-content" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Idea Content
              <span class="text-red-500">*</span>
            </label>
            <textarea 
              id="edit-card-content"
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
              <label for="edit-card-rarity" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rarity
              </label>
              <select 
                id="edit-card-rarity"
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
              <label for="edit-card-progress" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    <Star size="16" fill={progress >= level.level ? '#000000' : '#9ca3af'} color={progress >= level.level ? '#000000' : '#9ca3af'} />
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
                <label for="edit-card-type" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type
                </label>
                <select 
                  id="edit-card-type"
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
              <label for="edit-card-tags" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <input 
                id="edit-card-tags"
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
            <label for="edit-card-flavor" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Flavor Text (Optional)
            </label>
            <textarea 
              id="edit-card-flavor"
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
      <div class="flex items-center justify-between p-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          on:click={handleDelete}
          class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          disabled={isSubmitting}
        >
          <Trash size="16" />
          Delete
        </button>

        <div class="flex items-center gap-3">
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
            on:click={handleSave}
            class="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-md transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style="background-color: var(--color-accent); color: var(--color-accent-text);"
            disabled={!title.trim() || !content.trim() || isSubmitting}
          >
            {#if isSubmitting}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            {:else}
              <Save size="16" />
              Save Changes
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Delete Confirmation Modal -->
  {#if showDeleteConfirm}
    <div class="fixed inset-0 backdrop-blur-sm z-[99999] flex items-center justify-center p-4" style="background-color: rgba(0, 0, 0, 0.5);">
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <Trash size="20" class="text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Delete Card</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400">This action cannot be undone</p>
          </div>
        </div>
        
        <p class="text-gray-700 dark:text-gray-300 mb-6">
          Are you sure you want to delete "<strong>{title}</strong>"? This will permanently remove the card from your world.
        </p>
        
        <div class="flex items-center justify-end gap-3">
          <button
            type="button"
            on:click={cancelDelete}
            class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            on:click={confirmDelete}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
          >
            Delete Card
          </button>
        </div>
      </div>
    </div>
  {/if}
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
