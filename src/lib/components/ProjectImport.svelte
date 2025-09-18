<!-- ProjectImport.svelte - Import modal component for Wiskr project data -->
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let isOpen = false;
  
  const dispatch = createEventDispatcher();
  
  let importOptions = {
    createNewProject: true,
    projectName: '',
    overwriteExisting: false,
    mergeWithExisting: false,
    existingProjectId: null
  };
  
  let isLoading = false;
  let importPreview = null;
  let error = null;
  let success = null;
  let uploadedFile = null;
  let fileInput = null;
  let existingProjects = [];
  let isDragOver = false;

  // Close modal function
  function closeModal() {
    isOpen = false;
    importPreview = null;
    error = null;
    success = null;
    uploadedFile = null;
    resetOptions();
    dispatch('close');
  }

  function resetOptions() {
    importOptions = {
      createNewProject: true,
      projectName: '',
      overwriteExisting: false,
      mergeWithExisting: false,
      existingProjectId: null
    };
  }

  // Handle backdrop click
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  // Load existing projects for merge/overwrite options
  async function loadExistingProjects() {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        existingProjects = data.projects || [];
      }
    } catch (err) {
      console.error('Error loading existing projects:', err);
    }
  }

  // Handle file selection
  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      uploadedFile = file;
      analyzeFile(file);
    }
  }

  // Handle drag and drop events
  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver = true;
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver = false;
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    isDragOver = false;
    
    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        uploadedFile = file;
        analyzeFile(file);
        // Clear the file input to show the dropped file
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        error = 'Please drop a JSON file exported from Wiskr';
      }
    }
  }

  // Analyze uploaded file to show preview
  async function analyzeFile(file) {
    if (!file) return;
    
    try {
      error = null;
      isLoading = true;
      
      // Basic file validation
      if (file.type !== 'application/json') {
        throw new Error('Please upload a JSON file exported from Wiskr');
      }
      
      // Read file content
      const text = await file.text();
      const data = JSON.parse(text);
      
      // Validate it's a Wiskr export
      if (!data.meta || data.meta.export_version !== '1.0' || !data.project) {
        throw new Error('This doesn\'t appear to be a valid Wiskr export file');
      }
      
      // Create preview (only show items we actually import)
      importPreview = {
        project_name: data.project.name || 'Untitled Project',
        personas_count: data.personas?.length || 0,
        decks_count: data.decks?.length || 0,
        deck_sections_count: data.deck_sections?.length || 0,
        deck_cards_count: data.deck_cards?.length || 0,
        cards_count: data.cards?.length || 0,
        export_date: data.meta.export_date,
        file_size: formatFileSize(file.size)
      };
      
      // Set default project name if creating new
      if (importOptions.createNewProject && !importOptions.projectName) {
        importOptions.projectName = data.project.name + ' (Imported)';
      }
      
    } catch (err) {
      console.error('File analysis error:', err);
      error = err.message;
      importPreview = null;
    } finally {
      isLoading = false;
    }
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Handle import
  async function handleImport() {
    if (!uploadedFile || !importPreview) return;
    
    try {
      isLoading = true;
      error = null;
      success = null;
      
      // Create form data
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('options', JSON.stringify(importOptions));
      
      const response = await fetch('/api/projects/import', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }
      
      // Create detailed success message including entity cards
      let successMessage = `Successfully imported project "${result.project.name}"`;
      
      if (result.statistics) {
        const stats = result.statistics;
        const totalImported = stats.total_imported || 0;
        
        if (totalImported > 0) {
          successMessage += ` with ${totalImported} items`;
          
          // Add entity cards info if generated
          if (stats.entity_cards_generated && stats.entity_cards_generated > 0) {
            successMessage += ` and ${stats.entity_cards_generated} entity cards automatically generated`;
          }
        }
      }
      
      success = successMessage;
      
      // Dispatch success event with project info
      dispatch('import-success', {
        project: result.project,
        statistics: result.statistics
      });
      
      // Close modal first, then refresh projects
      setTimeout(() => {
        closeModal();
        
        // Dispatch refresh event after modal closes
        setTimeout(() => {
          dispatch('refresh-projects', { projectId: result.project.id });
        }, 100);
      }, 1000);
      
    } catch (err) {
      console.error('Import error:', err);
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  // Load existing projects when modal opens
  $: if (isOpen) {
    loadExistingProjects();
  }

  // Reset file input when import options change
  $: if (importOptions.createNewProject !== undefined) {
    // Reactive statement for options change
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm bg-black/30"
    role="dialog"
    aria-modal="true"
    aria-labelledby="import-title"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
  >
    <div class="relative w-full max-w-2xl bg-white dark:bg-slate-800 rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b dark:border-gray-700">
        <h2 id="import-title" class="text-xl font-semibold text-gray-900 dark:text-white">
          Import Project
        </h2>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          on:click={closeModal}
          aria-label="Close import dialog"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[70vh]">
        {#if success}
          <!-- Success Message -->
          <div class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div class="ml-3">
                <p class="text-sm text-green-800 dark:text-green-200">
                  {success}
                </p>
              </div>
            </div>
          </div>
        {:else}
          <!-- File Upload Section -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
              Select Wiskr Export File
            </label>
            <div class="flex items-center justify-center w-full">
              <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 {isDragOver ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-500' : 'border-gray-300 bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:hover:border-gray-500'}"
                     on:dragover={handleDragOver}
                     on:dragenter={handleDragEnter}
                     on:dragleave={handleDragLeave}
                     on:drop={handleDrop}>
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg class="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p class="mb-2 text-sm {isDragOver ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">
                    {#if isDragOver}
                      <span class="font-semibold">Drop the file here</span>
                    {:else}
                      <span class="font-semibold">Click to upload</span> or drag and drop
                    {/if}
                  </p>
                  <p class="text-xs {isDragOver ? 'text-blue-500 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">JSON files only</p>
                </div>
                <input 
                  bind:this={fileInput}
                  type="file" 
                  class="hidden" 
                  accept=".json,application/json"
                  on:change={handleFileSelect}
                  disabled={isLoading}
                />
              </label>
            </div>
            {#if uploadedFile}
              <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Selected: {uploadedFile.name} ({formatFileSize(uploadedFile.size)})
              </p>
            {/if}
          </div>

          <!-- Import Preview -->
          {#if importPreview}
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <h4 class="font-medium text-blue-900 dark:text-blue-100 mb-3">Import Preview</h4>
              
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-blue-700 dark:text-blue-300">Project:</span>
                  <span class="ml-2 font-medium text-blue-900 dark:text-blue-100">
                    {importPreview.project_name}
                  </span>
                </div>
                
                
                <div>
                  <span class="text-blue-700 dark:text-blue-300">Decks:</span>
                  <span class="ml-2 font-medium text-blue-900 dark:text-blue-100">
                    {importPreview.decks_count}
                  </span>
                </div>
                
                <div>
                  <span class="text-blue-700 dark:text-blue-300">Sections:</span>
                  <span class="ml-2 font-medium text-blue-900 dark:text-blue-100">
                    {importPreview.deck_sections_count}
                  </span>
                </div>
                
                <div>
                  <span class="text-blue-700 dark:text-blue-300">Cards:</span>
                  <span class="ml-2 font-medium text-blue-900 dark:text-blue-100">
                    {importPreview.cards_count}
                  </span>
                </div>
                
                <div>
                  <span class="text-blue-700 dark:text-blue-300">Deck Cards:</span>
                  <span class="ml-2 font-medium text-blue-900 dark:text-blue-100">
                    {importPreview.deck_cards_count}
                  </span>
                </div>
                
                <div class="col-span-2">
                  <span class="text-blue-700 dark:text-blue-300">Exported:</span>
                  <span class="ml-2 font-medium text-blue-900 dark:text-blue-100">
                    {new Date(importPreview.export_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <!-- Import Options -->
            <div class="space-y-4 mb-6">
              <h4 class="font-medium text-gray-900 dark:text-white">Import Options</h4>
              
              <div class="space-y-3">
                <label class="flex items-start">
                  <input
                    type="radio"
                    bind:group={importOptions.createNewProject}
                    value={true}
                    class="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div class="ml-2">
                    <span class="text-sm text-gray-900 dark:text-gray-300 font-medium">
                      Create new project
                    </span>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Import as a new project (recommended)
                    </p>
                    {#if importOptions.createNewProject}
                      <input
                        type="text"
                        bind:value={importOptions.projectName}
                        class="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-[#1b1b1e] dark:text-white sm:text-sm"
                        placeholder="Enter project name..."
                        required
                      />
                    {/if}
                  </div>
                </label>
                
                <label class="flex items-start">
                  <input
                    type="radio"
                    bind:group={importOptions.createNewProject}
                    value={false}
                    class="mt-1 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                    disabled={existingProjects.length === 0}
                  />
                  <div class="ml-2">
                    <span class="text-sm text-gray-900 dark:text-gray-300 font-medium">
                      Combine with existing project
                    </span>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Add to an existing project (advanced)
                    </p>
                    {#if !importOptions.createNewProject && existingProjects.length > 0}
                      <select
                        bind:value={importOptions.existingProjectId}
                        class="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-[#1b1b1e] dark:text-white sm:text-sm"
                        required
                      >
                        <option value={null}>Select existing project...</option>
                        {#each existingProjects as project}
                          <option value={project.id}>{project.name}</option>
                        {/each}
                      </select>
                    {/if}
                    {#if existingProjects.length === 0}
                      <p class="text-xs text-gray-400 mt-2">No existing projects available</p>
                    {/if}
                  </div>
                </label>
              </div>
            </div>
          {/if}

          <!-- Error Display -->
          {#if error}
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <div class="flex">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.86-.833-2.598 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm text-red-800 dark:text-red-200">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer -->
      <div class="flex justify-end space-x-3 p-6 border-t dark:border-gray-700">
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-slate-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          on:click={closeModal}
          disabled={isLoading}
        >
          Cancel
        </button>
        
        {#if !success}
          <button
            type="button"
            class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            on:click={handleImport}
            disabled={isLoading || !importPreview || (importOptions.createNewProject && !importOptions.projectName.trim()) || (!importOptions.createNewProject && !importOptions.existingProjectId)}
          >
            {#if isLoading}
              <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Importing...
            {:else}
              Import Project
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  /* Ensure proper scrolling behavior */
  .overflow-y-auto {
    scrollbar-width: thin;
    scrollbar-color: rgba(156, 163, 175, 0.5) transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background-color: rgba(156, 163, 175, 0.5);
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background-color: rgba(156, 163, 175, 0.7);
  }
</style>
