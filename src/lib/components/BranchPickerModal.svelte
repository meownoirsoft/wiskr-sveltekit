<script>
  import { createEventDispatcher } from 'svelte';
  import { GitBranch, Check } from 'lucide-svelte';

  export let visible = false;
  export let branches = [];
  export let currentBranchId = 'main';

  const dispatch = createEventDispatcher();

  function close() {
    dispatch('close');
  }

  function selectBranch(id) {
    dispatch('select', id);
  }
</script>

{#if visible}
  <div class="fixed inset-0 z-50" on:click={(e) => { if (e.target === e.currentTarget) close(); }}>
    <div class="absolute inset-0 backdrop-blur-sm bg-black/30 dark:bg-black/40"></div>
    <div class="absolute left-1/2 -translate-x-1/2 top-20 w-[92vw] max-w-sm rounded-lg border shadow-xl" style="background-color: var(--bg-primary); border-color: var(--border-header-input);">
      <div class="p-3 border-b" style="border-color: var(--border-header-input);">
        <div class="flex items-center gap-2">
          <GitBranch class="w-4 h-4" />
          <h3 class="text-sm font-medium" style="color: var(--text-header);">Select Branch</h3>
        </div>
      </div>
      <div class="max-h-72 overflow-y-auto">
        {#each branches as branch}
          <button
            class="w-full flex items-center justify-between px-4 py-3 text-sm border-b last:border-b-0 text-left"
            style="border-color: var(--border-header-input); color: var(--text-header);"
            on:click={() => selectBranch(branch.branch_id)}
          >
            <span class="truncate">{branch.branch_name}</span>
            {#if branch.branch_id === currentBranchId}
              <Check class="w-4 h-4" />
            {/if}
          </button>
        {/each}
        {#if !branches || branches.length === 0}
          <div class="p-4 text-sm text-center" style="color: var(--text-header-secondary);">No branches yet</div>
        {/if}
      </div>
      <div class="p-3 flex justify-end gap-2">
        <button 
          class="px-3 py-1.5 text-sm rounded border" 
          style="background-color: var(--color-accent); color: var(--color-accent-text);" 
          on:click={close}>Close</button>
      </div>
    </div>
  </div>
{/if}

