<script>
  import { createEventDispatcher } from 'svelte';
  import { X, GitBranch } from 'lucide-svelte';
  import { marked } from 'marked';

  export let showBranchModal = false;
  export let branchModalMessageIndex = -1;
  export let newBranchName = '';
  export let isCreatingBranch = false;
  export let messages = [];
  export let branches = [];
  export let currentBranchId = 'main';
  export let createError = '';

  const dispatch = createEventDispatcher();

  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Safety check for branchModalMessageIndex
  $: safeMessageIndex = typeof branchModalMessageIndex === 'number' ? branchModalMessageIndex : -1;
  $: console.log('BranchModal - branchModalMessageIndex:', branchModalMessageIndex, 'type:', typeof branchModalMessageIndex, 'safe:', safeMessageIndex);

  function renderMarkdown(content) {
    if (!content || typeof content !== 'string') return '';
    return marked(content);
  }

  // Check if there are existing branches at this message point
  $: existingBranches = branches.filter(b => {
    // For simplicity, show all branches that exist
    // In the future, you could filter by branches that start at this specific message
    return b.branch_id !== currentBranchId;
  });

  function closeModal() {
    dispatch('close');
  }

  function createBranch() {
    dispatch('create', newBranchName.trim());
  }

  function switchToBranch(branchId) {
    dispatch('switch-branch', branchId);
    closeModal();
  }
</script>

{#if showBranchModal}
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
    <div class="bg-white rounded-lg shadow-xl max-w-2xl w-full" style="background-color: var(--bg-modal, white);">
      <!-- Modal Header -->
      <div class="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {#if existingBranches.length > 0}
            Conversation Branches
          {:else}
            Create New Branch
          {/if}
        </h3>
        <button
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          on:click={closeModal}
          title="Close"
        >
          <X size="24" />
        </button>
      </div>
      
      <!-- Modal Content -->
      <div class="p-6">
        {#if existingBranches.length > 0}
          <!-- Show existing branches -->
          <div class="mb-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Switch to an existing branch or create a new one from message #{branchModalMessageIndex + 1}:
            </p>
            
            <!-- Existing branches list -->
            <div class="space-y-2 mb-4">
              {#each existingBranches as branch}
                <button
                  class="w-full flex items-center gap-3 p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                  on:click={() => switchToBranch(branch.branch_id)}
                >
                  <GitBranch size="20" class="text-gray-500 dark:text-gray-400" />
                  <div class="flex-1">
                    <div class="font-medium text-gray-900 dark:text-gray-100">{branch.branch_name}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">Branch ID: {branch.branch_id}</div>
                  </div>
                  <div class="w-4 h-4 rounded-full {branch.colorClass?.split(' ')[0] || 'bg-gray-100'}"></div>
                </button>
              {/each}
            </div>
            
            <!-- Divider -->
            <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
              <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Or create a new branch:</p>
            </div>
          </div>
        {:else}
          <!-- No existing branches, show creation form -->
          <div class="mb-4">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
              This lets you explore alternative paths!
            </p>
          </div>
        {/if}
        
        {#if branchModalMessageIndex >= 0 && messages[branchModalMessageIndex]}
          <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <div class="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Branching from:
            </div>
            <div class="prose prose-sm max-w-none text-gray-800 dark:text-gray-200 max-h-40 overflow-y-auto">
              {@html renderMarkdown(messages[branchModalMessageIndex].content.slice(0, 600))}
              {#if messages[branchModalMessageIndex].content.length > 600}
                <div class="text-gray-500 italic mt-2">...content truncated</div>
              {/if}
            </div>
          </div>
        {/if}
        
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="branch-name-box">
            Branch Name
          </label>
          <div class="flex flex-col gap-2">
            <input
              id="branch-name-box"
              type="text"
              class="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 {createError ? 'border-red-300 dark:border-red-600' : ''}"
              placeholder="e.g., Alternative approach"
              bind:value={newBranchName}
              maxlength="100"
            />
            <div class="flex gap-2">
              <button
                class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                on:click={closeModal}
                disabled={isCreatingBranch}
              >
                Cancel
              </button>
              <button
                class="flex-1 px-3 py-2 text-sm txt-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1" 
                style="background-color: var(--color-accent); color: var(--color-accent-text);"
                on:click={createBranch}
                disabled={isCreatingBranch || !newBranchName.trim()}
              >
                {#if isCreatingBranch}
                  <div class="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                  Creating...
                {:else}
                  <GitBranch size="14" />
                  Create
                {/if}
              </button>
            </div>
          </div>
          
          {#if createError}
            <div class="mt-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">
              {createError}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}
