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
  <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
    <div class="bg-white rounded-xl shadow-xl w-[90vw] max-w-md p-4">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-semibold">Create Project</h3>
        <button class="text-sm" on:click={closeModal}>✕</button>
      </div>

      <div class="grid gap-2">
        <label class="text-xs text-zinc-600" for="newProjectName">Name</label>
        <input class="border rounded p-2" name="newProjectName" placeholder="e.g., BEDNOMANCER 2" bind:value={newProjectName} />

        <div class="grid grid-cols-2 gap-2 mt-2">
          <div>
            <label class="text-xs text-zinc-600" for="newProjectIcon">Icon (emoji)</label>
            <input class="border rounded p-2" name="newProjectIcon" bind:value={newProjectIcon} />
          </div>
          <div>
            <label class="text-xs text-zinc-600" for="newProjectColor">Color</label>
            <input class="border rounded p-2" type="color" name="newProjectColor" bind:value={newProjectColor} />
          </div>
        </div>

        {#if createProjectErr}
          <div class="text-xs text-red-600 mt-1">{createProjectErr}</div>
        {/if}

        <div class="flex items-center justify-end gap-2 mt-3">
          <button class="text-sm px-3 py-1 border rounded" on:click={closeModal}>Cancel</button>
          <button class="text-sm px-3 py-1 border rounded bg-indigo-600 text-white disabled:opacity-50"
            on:click={createProject} disabled={creatingProject}>
            {creatingProject ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
