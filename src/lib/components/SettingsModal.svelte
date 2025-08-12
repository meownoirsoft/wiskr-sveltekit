<script>
  import { createEventDispatcher } from 'svelte';
  import { Settings, Save, Plus, Trash2, GripVertical, ArrowLeft, X } from 'lucide-svelte';
  import FactTypesManager from './FactTypesManager.svelte';

  export let showSettingsModal = false;
  export let project = null;

  const dispatch = createEventDispatcher();

  let activeTab = 'general';
  let projectName = '';
  let projectDescription = '';
  let savingGeneral = false;
  
  // Initialize form values when project changes
  $: if (project) {
    projectName = project.name || '';
    projectDescription = project.description || '';
  }
  
  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'fact-types', label: 'Fact Types', icon: Settings },
    // Future tabs can be added here
  ];

  function closeModal() {
    showSettingsModal = false;
    dispatch('close');
  }

  // Close modal on escape key
  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  // Close modal when clicking backdrop
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  async function saveGeneralSettings() {
    if (!project?.id) return;
    
    savingGeneral = true;
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim()
        })
      });
      
      if (response.ok) {
        const updatedProject = await response.json();
        // Update the local project object
        project = { ...project, ...updatedProject };
        console.log('General settings saved successfully');
      } else {
        const error = await response.json();
        console.error('Failed to save general settings:', error);
        alert('Failed to save settings: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving general settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      savingGeneral = false;
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showSettingsModal}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-modal-title"
    tabindex="0"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 id="settings-modal-title" class="text-2xl font-bold text-gray-900">Project Settings</h2>
          <p class="text-gray-600 mt-1">
            Manage configuration for <strong>{project?.name || 'this project'}</strong>
          </p>
        </div>
        <button
          on:click={closeModal}
          class="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close settings"
        >
          <X size="24" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-gray-200 px-6">
        <nav class="-mb-px flex space-x-8">
          {#each tabs as tab}
            <button
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors
                     {activeTab === tab.id 
                       ? 'border-blue-500 text-blue-600' 
                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
              on:click={() => activeTab = tab.id}
            >
              <svelte:component this={tab.icon} class="inline w-4 h-4 mr-2" />
              {tab.label}
            </button>
          {/each}
        </nav>
      </div>

      <!-- Modal Body - Scrollable Content -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if activeTab === 'fact-types'}
          <div>
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">Fact Types</h3>
              <p class="text-gray-600">Customize the fact types available in your project. You can rename existing types, add new ones, and change their colors.</p>
            </div>
            
            <FactTypesManager projectId={project?.id} />
          </div>
        {:else if activeTab === 'general'}
          <div>
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">General Settings</h3>
              <p class="text-gray-600">Basic project configuration options.</p>
            </div>
            
                <label for="project-name" class="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
                <input 
                  id="project-name"
                  type="text" 
                  bind:value={projectName}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter project name"
                />
                  placeholder="Enter project name"
                />
                <label for="project-description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea 
                  id="project-description"
                  rows="3"
                  bind:value={projectDescription}
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Project description (optional)"
                ></textarea>
              </div>
              
              <div class="flex justify-between items-center pt-6 border-t">
                <p class="text-sm text-gray-500">More general settings will be added here in future updates.</p>
                <button
                  on:click={saveGeneralSettings}
                  disabled={savingGeneral}
                  class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size="16" />
                  {savingGeneral ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure modal is above other content */
  :global(body:has(.fixed.inset-0.bg-black.bg-opacity-50)) {
    overflow: hidden;
  }
</style>
