<script>
  import { createEventDispatcher } from 'svelte';
  import { Settings, Save, Plus, Trash2, GripVertical, ArrowLeft, X } from 'lucide-svelte';
  import FactTypesManager from './FactTypesManager.svelte';
  import TLDRModal from './TLDRModal.svelte';
  import TLDRButton from './TLDRButton.svelte';

  export let showProjectSettingsModal = false;
  export let project = null;

  const dispatch = createEventDispatcher();

  let activeTab = 'general';
  let projectName = '';
  let projectDescription = '';
  let savingGeneral = false;
  let saveSuccess = false;
  let lastProjectId = null; // Track project changes to avoid overriding user input
  
  // TL;DR state
  let showTLDRModal = false;
  let tldrOriginalText = '';
  let tldrFieldType = 'project-description';
  
  // Initialize form values when project changes (but not when user is editing)
  $: if (project && project.id !== lastProjectId) {
    projectName = project.name || '';
    projectDescription = project.description || '';
    lastProjectId = project.id;
  }
  
  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'fact-types', label: 'Fact Types', icon: Settings },
    // Future tabs can be added here
  ];

  function closeModal() {
    showProjectSettingsModal = false;
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
      const requestData = {
        name: projectName.trim(),
        description: projectDescription.trim()
      };
      
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (response.ok) {
        const updatedProject = await response.json();
        // Update the local project object
        project = { ...project, ...updatedProject };
        // Explicitly update the form fields to ensure they reflect the saved data
        projectName = updatedProject.name || '';
        projectDescription = updatedProject.description || '';
        
        // Show success message
        saveSuccess = true;
        setTimeout(() => {
          saveSuccess = false;
        }, 3000);
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
  
  // TL;DR handlers
  function handleTLDRClick() {
    if (!projectDescription.trim()) return;
    tldrOriginalText = projectDescription;
    tldrFieldType = 'project-description';
    showTLDRModal = true;
  }
  
  function handleTLDRModalClose() {
    showTLDRModal = false;
    tldrOriginalText = '';
  }
  
  function handleTLDRReplace(event) {
    const { newText } = event.detail;
    projectDescription = newText;
    showTLDRModal = false;
    tldrOriginalText = '';
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showProjectSettingsModal}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    style="background-color: rgba(0, 0, 0, 0.25);"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-modal-title"
    tabindex="0"
  >
    <!-- Modal Content -->
    <div class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" style="background-color: var(--bg-modal, white);">
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h2 id="settings-modal-title" class="text-2xl font-bold text-gray-900 dark:text-gray-100">{project?.name || 'this project'} Settings</h2>
        </div>
        <button
          on:click={closeModal}
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          aria-label="Close settings"
        >
          <X size="24" />
        </button>
      </div>

      <!-- Navigation Tabs -->
      <div class="border-b border-gray-200 dark:border-gray-700 px-6">
        <nav class="-mb-px flex space-x-8">
          {#each tabs as tab}
            <button
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors
                     {activeTab === tab.id 
                       ? 'border-b-2' 
                       : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
              style={activeTab === tab.id ? 'border-color: var(--color-accent); color: var(--color-accent);' : ''}
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
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Fact Types</h3>
              <p class="text-gray-600 dark:text-gray-400">Customize the fact types available in your project. You can rename existing types, add new ones, and change their colors.</p>
            </div>
            
            <FactTypesManager projectId={project?.id} />
          </div>
        {:else if activeTab === 'general'}
          <div>
            <div class="space-y-6">
              <!-- Project Name and Info Box Row -->
              <div class="grid grid-cols-2 gap-6">
                <div>
                  <label for="project-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
                  <input 
                    id="project-name"
                    type="text" 
                    bind:value={projectName}
                    class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent" style="--tw-ring-color: var(--color-accent);"
                    placeholder="Enter project name"
                  />
                </div>
                <div>
                  <h4 class="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">🎯 Critical for AI Performance</h4>
                  <div class="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div class="flex items-start">
                      <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    
                      <div class="ml-3">
                        <p class="text-xs text-blue-700 dark:text-blue-300">The description below is the <strong>most important context</strong> for Mr Wiskr (and friends). It's their <strong>"north star"</strong> for providing targeted assistance. This should clearly define:</p>
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
                  <label for="project-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Description
                    <span class="inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">Most Important</span>
                  </label>
                  
                  {#if projectDescription.trim()}
                    <TLDRButton
                      on:tldr={handleTLDRClick}
                      disabled={!projectDescription.trim()}
                      size="sm"
                    />
                  {/if}
                </div>
                <textarea 
                  id="project-description"
                  rows="10"
                  bind:value={projectDescription}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent" style="--tw-ring-color: var(--color-accent);"
                  placeholder="Describe your project's goals, objectives, and what you're trying to achieve. Be specific about your aims and requirements. This helps the AI provide more targeted assistance."
                ></textarea>
                <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  💡 <strong>Tip:</strong> A well-written description dramatically improves response quality.
                </p>
              </div>
              
              <!-- Save Button and Success Message Row -->
              <div class="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                {#if saveSuccess}
                  <div class="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-md">
                    <div class="flex items-center">
                      <div class="flex-shrink-0">
                        <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                      </div>
                      <div class="ml-3">
                        <p class="text-sm font-medium text-green-800 dark:text-green-200">✅ Settings saved successfully!</p>
                      </div>
                    </div>
                  </div>
                {:else}
                  <div></div>
                {/if}
                <button
                  on:click={saveGeneralSettings}
                  on:mouseenter={(e) => !savingGeneral && (e.target.style.backgroundColor = 'var(--color-accent-hover)')}
                  on:mouseleave={(e) => !savingGeneral && (e.target.style.backgroundColor = 'var(--color-accent)')}
                  disabled={savingGeneral}
                  class="flex items-center gap-2 px-6 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors" style="background-color: var(--color-accent);"
                >
                  <Save size="16" />
                  {savingGeneral ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- TL;DR Modal -->
{#if showTLDRModal}
  <TLDRModal
    bind:visible={showTLDRModal}
    originalText={tldrOriginalText}
    fieldType={tldrFieldType}
    on:close={handleTLDRModalClose}
    on:replace={handleTLDRReplace}
  />
{/if}

<style>
  /* Ensure modal is above other content */
  :global(body:has(.fixed.inset-0.backdrop-blur-sm)) {
    overflow: hidden;
  }
</style>
