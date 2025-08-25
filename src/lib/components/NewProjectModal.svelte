<script>
  import { createEventDispatcher } from 'svelte';

  export let showNewProjectModal = false;
  export let newProjectName = '';
  export let newProjectDescription = '';
  export let creatingProject = false;
  export let createProjectErr = '';

  const dispatch = createEventDispatcher();

  function closeModal() {
    if (!creatingProject) {
      dispatch('close');
    }
  }

  function createProject() {
    dispatch('create', {
      name: newProjectName.trim(),
      description: newProjectDescription.trim()
    });
  }
</script>

{#if showNewProjectModal}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
    style="background-color: rgba(0, 0, 0, 0.25);"
    on:click={(e) => e.target === e.currentTarget && closeModal()}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
    role="dialog"
    aria-modal="true"
    aria-labelledby="create-modal-title"
    tabindex="0"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" style="background-color: var(--bg-modal, white);">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 id="create-modal-title" class="text-2xl font-bold text-gray-900 dark:text-gray-100">Create Project</h2>
        </div>
        <button
          on:click={closeModal}
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close modal"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>

      <!-- Modal Body - Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6">
        <div class="space-y-6">
          <!-- Project Name and Info Box Row -->
          <div class="grid grid-cols-2 gap-6">
            <div>
              <label for="new-project-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
              <input 
                id="new-project-name"
                type="text" 
                bind:value={newProjectName}
                class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent" style="--tw-ring-color: var(--color-accent);"
                placeholder="e.g., Book 1: The Beginning"
              />
            </div>
            <div>
              <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">🎯 Critical for Wiskr Performance</h4>
              <div class="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                <div class="flex items-start">
                  <div class="flex-shrink-0">
                    <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                    </svg>
                  </div>
                
                  <div class="ml-3">
                    <p class="text-xs text-blue-700 dark:text-blue-300">The description below is the <strong>most important context</strong> for your wiskrs. It's their <strong>"north star"</strong> for providing targeted assistance. This should clearly define:</p>
                    <ul class="font-medium text-xs text-blue-700 dark:text-blue-300 my-4 mb-0 list-disc space-y-1">
                      <li>What you're trying to achieve or build</li>
                      <li>Your project's main goals and objectives</li>
                      <li>The scope and focus areas, and any specific requirements or constraints</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div class="flex items-center justify-between mb-2">
              <label for="new-project-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Project Description
                <span class="inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">Most Important</span>
              </label>
            </div>
            <textarea 
              id="new-project-description"
              rows="10"
              bind:value={newProjectDescription}
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent" style="--tw-ring-color: var(--color-accent);"
              placeholder="Describe your project's goals, objectives, and what you're trying to achieve. Be specific about your aims and requirements. This helps your wiskrs provide more targeted assistance."
            ></textarea>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              💡 <strong>Tip:</strong> A well-written description dramatically improves response quality.
            </p>
          </div>
          
          
          {#if createProjectErr}
            <div class="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-red-800 dark:text-red-200">{createProjectErr}</p>
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Create Button Row -->
          <div class="flex items-center justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
            <div class="flex gap-3">
              <button
                on:click={closeModal}
                class="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                disabled={creatingProject}
              >
                Cancel
              </button>
              <button
                on:click={createProject}
                on:mouseenter={(e) => !creatingProject && (e.target.style.backgroundColor = 'var(--color-accent-hover)')}
                on:mouseleave={(e) => !creatingProject && (e.target.style.backgroundColor = 'var(--color-accent)')}
                disabled={creatingProject || !newProjectName.trim()}
                class="flex items-center gap-2 px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors" style="background-color: var(--color-accent);"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                </svg>
                {creatingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
