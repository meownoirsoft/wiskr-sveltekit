<script>
  import { createEventDispatcher } from 'svelte';

  export let showNewProjectModal = false;
  export let newProjectName = '';
  export let newProjectIcon = '📁';
  export let newProjectColor = '#6366f1';
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
      icon: newProjectIcon,
      color: newProjectColor
    });
  }
</script>

{#if showNewProjectModal}
  <div class="fixed inset-0 backdrop-blur-sm bg-black bg-opacity-25 dark:bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl w-[90vw] max-w-md p-4" style="background-color: var(--bg-modal, white);">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100">Create Project</h3>
        <button class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" on:click={closeModal}>✕</button>
      </div>

      <div class="grid gap-2">
        <label class="text-xs text-zinc-600 dark:text-zinc-400" for="newProjectName">Name</label>
        <input class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded p-2" name="newProjectName" placeholder="e.g., BEDNOMANCER 2" bind:value={newProjectName} />

        <div class="grid grid-cols-2 gap-2 mt-2">
          <div class="w-48">
            <label class="text-xs text-zinc-600 dark:text-zinc-400" for="newProjectIcon">Icon (emoji)</label>
            <input class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-2" name="newProjectIcon" bind:value={newProjectIcon} />
          </div>
          <div>
            <label class="text-xs text-zinc-600 dark:text-zinc-400" for="newProjectColor">Color</label>
            <input class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-2" type="color" name="newProjectColor" bind:value={newProjectColor} />
          </div>
        </div>

        {#if createProjectErr}
          <div class="text-xs text-red-600 mt-1">{createProjectErr}</div>
        {/if}

        <div class="flex items-center justify-end gap-2 mt-3">
          <button class="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded" on:click={closeModal}>Cancel</button>
          <button class="text-sm px-3 py-1 border rounded bg-indigo-600 text-white disabled:opacity-50"
            on:click={createProject} disabled={creatingProject}>
            {creatingProject ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
