<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { Settings, Save, Plus, Trash2, GripVertical, ArrowLeft, X, Download, Upload, Database } from 'lucide-svelte';
  import FactTypesManager from '../FactTypesManager.svelte';
  import SayLessModal from './SayLessModal.svelte';
  import SayLessButton from '../SayLessButton.svelte';
  import FeatureGate from '../FeatureGate.svelte';
  import ProjectExport from '../ProjectExport.svelte';
  import ProjectImport from '../ProjectImport.svelte';

  export let showProjectSettingsModal = false;
  export let project = null;
  export let user = null; // User object with tier info
  export let userTier = 0; // User tier from server
  export const effectiveTier = 0; // Effective tier from server

  const dispatch = createEventDispatcher();

  let activeTab = 'general';
  let projectName = '';
  let projectDescription = '';
  let savingGeneral = false;
  let saveSuccess = false;
  let lastProjectId = null; // Track project changes to avoid overriding user input
  
  // SayLess state
  let showSayLessModal = false;
  let saylessOriginalText = '';
  let saylessFieldType = 'project-description';
  

  
  // Initialize form values when project changes (but not when user is editing)
  $: if (project && project.id !== lastProjectId) {
    projectName = project.name || '';
    projectDescription = project.description || '';
    lastProjectId = project.id;
  }
  
     const tabs = [
     { id: 'general', label: 'General', icon: Settings },
     { id: 'fact-types', label: 'Fact\u00A0Types', icon: Settings },
     { id: 'data', label: 'Import/Export', icon: Database },
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
     // Also close info tooltip when clicking outside
     if (!event.target.closest('.info-tooltip-container')) {
       showInfoTooltip = false;
     }
   }

  async function saveGeneralSettings() {
    if (!project?.id) {
      console.error('❌ No project ID available for saving');
      alert('Error: No project selected');
      return;
    }
    
    console.log('💾 Saving project settings...', {
      projectId: project.id,
      name: projectName.trim(),
      descriptionLength: projectDescription.trim().length
    });
    
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
      
      console.log('📡 API Response status:', response.status, response.statusText);
      
      if (response.ok) {
        const updatedProject = await response.json();
        console.log('✅ Project updated successfully:', updatedProject);
        
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
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { message: await response.text() };
        }
        
        console.error('❌ Failed to save general settings:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        
        // Show user-friendly error messages
        let errorMessage = errorData.message || 'Unknown error';
        
        if (errorMessage.includes('Cannot coerce the result to a single JSON object')) {
          errorMessage = 'Database error: The project may not exist or you may not have permission to update it. Please refresh the page and try again.';
        } else if (response.status === 404) {
          errorMessage = 'Project not found. Please refresh the page and try again.';
        } else if (response.status === 401) {
          errorMessage = 'Authentication error. Please refresh the page and log in again.';
        }
        
        alert('Failed to save settings: ' + errorMessage);
      }
    } catch (error) {
      console.error('❌ Network error saving general settings:', error);
      alert('Network error saving settings. Please check your connection and try again.');
    } finally {
      savingGeneral = false;
    }
  }
  
  // SayLess handlers
  function handleSayLessClick() {
    if (!projectDescription.trim()) return;
    saylessOriginalText = projectDescription;
    saylessFieldType = 'project-description';
    showSayLessModal = true;
  }
  
  function handleSayLessModalClose() {
    showSayLessModal = false;
    saylessOriginalText = '';
  }
  
  function handleSayLessReplace(event) {
    const { newText } = event.detail;
    projectDescription = newText;
    showSayLessModal = false;
    saylessOriginalText = '';
  }
  
     // Import/Export modal state
   let showExportModal = false;
   let showImportModal = false;
   
   // Info tooltip state
   let showInfoTooltip = false;
  
  function openExportModal() {
    showExportModal = true;
  }
  
  function openImportModal() {
    showImportModal = true;
  }
  
  function closeExportModal() {
    showExportModal = false;
  }
  
     function closeImportModal() {
     showImportModal = false;
   }
   
   // Close info tooltip when clicking outside
   function handleClickOutside(event) {
     if (!event.target.closest('.info-tooltip-container')) {
       showInfoTooltip = false;
     }
   }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showProjectSettingsModal}
  <!-- Modal Backdrop -->
  <div 
    class="fixed inset-0 backdrop-blur-sm z-[99999] flex items-center justify-center p-2 md:p-4"
    style="background-color: rgba(0, 0, 0, 0.25);"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="settings-modal-title"
    tabindex="0"
  >
    <!-- Modal Content -->
         <div class="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-gray-600 md:border-0" style="background-color: var(--bg-modal, white);">
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
              class="py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center
                     {activeTab === tab.id 
                       ? 'border-b-2' 
                       : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
              style={activeTab === tab.id ? 'border-color: var(--color-accent); color: var(--color-accent);' : ''}
              on:click={() => activeTab = tab.id}
            >
              <svelte:component this={tab.icon} class="w-4 h-4 mr-2" />
              {tab.label}
            </button>
          {/each}
        </nav>
      </div>

             <!-- Modal Body - Scrollable Content -->
       <div class="flex-1 overflow-y-auto min-h-0 {activeTab === 'fact-types' ? 'p-0' : 'p-6'}">
         {#if activeTab === 'fact-types'}
           <div class="w-full px-6">
             <div class="mb-4 md:mb-6">
               <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Fact Types</h3>
               <!-- <p class="text-gray-600 dark:text-gray-400">Customize fact types in your project. Rename, add new, and change colors.</p> -->
             </div>
             
             <div class="w-full">
               <FactTypesManager projectId={project?.id} user={{ ...user, tier: userTier }} />
             </div>
           </div>
        {:else if activeTab === 'data'}
          <div>
            <!-- Import & Export Actions -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Export Section -->
              <div class="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                <div class="flex items-center mb-4">
                  <div class="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-800/30 rounded-lg mr-3">
                    <Download size="20" class="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">Export Project</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Create a backup of your project data</p>
                  </div>
                </div>
                
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Export all facts, documents, and project settings as a JSON file that can be imported later.
                </p>
                
                <button
                  on:click={openExportModal}
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium" 
                  style="background-color: var(--color-accent); color: var(--color-accent-text);"
                  disabled={!project?.id}
                >
                  <Download size="18" />
                  Export Project
                </button>
              </div>
              
              <!-- Import Section -->
              <div class="p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-slate-800/50">
                <div class="flex items-center mb-4">
                  <div class="flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg mr-3">
                    <Upload size="20" class="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">Import Data</h4>
                    <p class="text-sm text-gray-600 dark:text-gray-400">Import from a project export file</p>
                  </div>
                </div>
                
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Import facts and documents from a previously exported project file. You can merge with existing data or create a new project.
                </p>
                
                <button
                  on:click={openImportModal}
                  class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-colors font-medium" 
                  style="background-color: var(--color-accent); color: var(--color-accent-text);"
                >
                  <Upload size="18" />
                  Import Data
                </button>
              </div>
            </div>
          </div>
        {:else if activeTab === 'general'}
          <div>
            <div class="space-y-6">
              <!-- Project Name -->
              <div>
                <label for="project-name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Project Name</label>
                <input 
                  id="project-name"
                  type="text" 
                  bind:value={projectName}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-slate-50 dark:bg-slate-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent" style="--tw-ring-color: var(--color-accent);"
                  placeholder="Enter project name"
                />
              </div>
              
                             <!-- Info Icon with Title -->
               <div>
                 <div class="flex items-center gap-2 mb-2">
                   <h4 class="text-sm font-medium text-blue-600 dark:text-blue-200">🎯 Critical for Wiskr Performance</h4>
                   <div class="relative group info-tooltip-container">
                     <button
                       on:click={() => showInfoTooltip = !showInfoTooltip}
                       class="h-4 w-4 text-blue-400 cursor-pointer hover:text-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300 rounded"
                       aria-label="Show project description help"
                     >
                       <svg viewBox="0 0 20 20" fill="currentColor">
                         <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                       </svg>
                     </button>
                                           <!-- Tooltip - Show on hover (desktop) or click (mobile) -->
                                             <div class="absolute top-full right-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg transition-opacity duration-200 pointer-events-none z-[99999] md:opacity-0 md:group-hover:opacity-100 {showInfoTooltip ? 'opacity-100' : 'opacity-0'} w-80">
                        <div class="text-center">
                          <p class="font-medium mb-1">The description below is the <strong>most important context</strong> for Wiskrs.</p>
                          <p class="text-gray-300">It's their <strong>"north star"</strong> for providing targeted assistance.</p>
                          <p class="text-gray-300 mt-1">This should clearly define:</p>
                                                     <ul class="text-left mt-1 space-y-0.5 ml-6">
                             <li>• What you're trying to achieve or build</li>
                             <li>• Your main goals and objectives</li>
                             <li>• The scope and focus areas, and any specifics or constraints</li>
                           </ul>
                        </div>
                                                 <!-- Arrow -->
                         <div class="absolute bottom-full right-4 w-0 h-0 border-b-4 border-l-4 border-r-4 border-transparent border-b-gray-900"></div>
                      </div>
                   </div>
                 </div>
               </div>
              <div>
                <div class="flex items-center justify-between mb-2">
                  <label for="project-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Project Description
                  </label>
                  
                  {#if projectDescription.trim()}
                    <FeatureGate user={{ ...user, tier: userTier }} feature="say-less" requiredTier={1} showBadge={false} let:hasAccess>
                      <SayLessButton
                        on:sayless={handleSayLessClick}
                        disabled={!projectDescription.trim() || !hasAccess}
                        size="sm"
                      />
                    </FeatureGate>
                  {/if}
                </div>
                <textarea 
                  id="project-description"
                  rows="5"
                  bind:value={projectDescription}
                  class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:border-transparent" style="--tw-ring-color: var(--color-accent);"
                  placeholder="Describe your project's goals, objectives, and what you're trying to achieve. Be specific about your aims and requirements. This helps the AI provide more targeted assistance."
                ></textarea>
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
                  class="flex items-center gap-2 px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors" style="background-color: var(--color-accent); color: var(--color-accent-text);"
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

<!-- SayLess Modal -->
{#if showSayLessModal}
  <SayLessModal
    bind:visible={showSayLessModal}
    originalText={saylessOriginalText}
    fieldType={saylessFieldType}
    on:close={handleSayLessModalClose}
    on:replace={handleSayLessReplace}
  />
{/if}

<!-- Export Modal -->
<ProjectExport
  bind:isOpen={showExportModal}
  project={project}
  user={{ ...user, tier: userTier }}
  on:close={closeExportModal}
/>

<!-- Import Modal -->
<ProjectImport
  bind:isOpen={showImportModal}
  on:close={closeImportModal}
  on:import-success={() => {
    // Handle successful import - maybe refresh the current project data or navigate
    console.log('Import completed successfully');
  }}
/>

<style>
  /* Info box styling with high specificity */
  .info-box {
    background-color: #eff6ff !important; /* bg-blue-50 */
    border-color: #bfdbfe !important; /* border-blue-200 */
  }
  
  /* Dark mode override with maximum specificity */
  :global(.dark) .info-box {
    background-color: #1f2937 !important; /* bg-gray-800 */
    border-color: #374151 !important; /* border-gray-700 */
    color: #e5e7eb !important; /* text-gray-200 */
  }
  
  /* Dark mode text colors for info box content with maximum specificity */
  :global(.dark) .info-box p,
  :global(.dark) .info-box ul,
  :global(.dark) .info-box li,
  :global(.dark) .info-box strong {
    color: #e5e7eb !important; /* text-gray-200 */
  }
  
  /* Override any Tailwind text color classes in dark mode - more specific */
  :global(.dark) .info-box .text-blue-700,
  :global(.dark) .info-box .text-blue-600,
  :global(.dark) .info-box .text-blue-800 {
    color: #e5e7eb !important; /* text-gray-200 */
  }
  
  /* Force text colors using CSS custom properties */
  :global(.dark) .info-box {
    --tw-text-opacity: 1;
  }
  
  :global(.dark) .info-box p,
  :global(.dark) .info-box ul,
  :global(.dark) .info-box li,
  :global(.dark) .info-box strong {
    color: #e5e7eb !important; /* text-gray-200 */
    --tw-text-opacity: 1 !important;
  }
  
  /* Additional specificity for dark mode overrides */
  :global(.dark) .info-box * {
    color: #e5e7eb !important;
  }
  
  /* Ensure modal is above other content */
  :global(body:has(.fixed.inset-0.backdrop-blur-sm)) {
    overflow: hidden;
  }
</style>
