<script>
  import { createEventDispatcher } from 'svelte';
  import FeatureGate from './FeatureGate.svelte';
  
  export let project = null;
  export let isOpen = false;
  export let user = null; // User object with tier info
  
  const dispatch = createEventDispatcher();
  
  let exportOptions = {
    includeMessages: true,
    includeFacts: true,
    includeQuestions: true,
    format: 'json'
  };
  
  let isLoading = false;
  let exportPreview = null;
  let error = null;

  // Close modal function
  function closeModal() {
    isOpen = false;
    dispatch('close');
  }

  // Handle backdrop click
  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      closeModal();
    }
  }

  // Fetch export preview
  async function fetchPreview() {
    if (!project?.id) return;
    console.log('🔄 Fetching export preview for project:', project.name, project.id);
    
    try {
      error = null;
      const params = new URLSearchParams({
        includeMessages: exportOptions.includeMessages,
        includeFacts: exportOptions.includeFacts,
        includeQuestions: exportOptions.includeQuestions
      });
      
      console.log('📡 Making API call to:', `/api/projects/${project.id}/export?${params}`);
      const response = await fetch(`/api/projects/${project.id}/export?${params}`);
      console.log('📡 Response status:', response.status, response.statusText);
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ Export preview failed:', data);
        throw new Error(data.error || 'Failed to fetch export preview');
      }
      
      console.log('✅ Export preview data:', data);
      
      // Create preview summary
      exportPreview = {
        project_name: data.project?.name || 'Untitled Project',
        sessions_count: data.sessions?.length || 0,
        messages_count: data.messages?.length || 0,
        facts_count: data.facts?.length || 0,
        questions_count: data.questions?.length || 0,
        estimated_size: calculateSize(data),
        date_range: calculateDateRange(data)
      };
    } catch (err) {
      console.error('Export preview error:', err);
      error = err.message;
      exportPreview = null;
    }
  }

  // Calculate estimated file size
  function calculateSize(data) {
    const jsonString = JSON.stringify(data);
    const sizeInKB = Math.round(jsonString.length / 1024);
    return sizeInKB < 1024 ? `${sizeInKB} KB` : `${(sizeInKB / 1024).toFixed(1)} MB`;
  }

  // Calculate date range
  function calculateDateRange(data) {
    const dates = [];
    
    if (data.sessions) {
      dates.push(...data.sessions.map(s => s.created_at).filter(Boolean));
    }
    if (data.messages) {
      dates.push(...data.messages.map(m => m.created_at).filter(Boolean));
    }
    
    if (dates.length === 0) return 'No dates available';
    
    dates.sort();
    const earliest = new Date(dates[0]).toLocaleDateString();
    const latest = new Date(dates[dates.length - 1]).toLocaleDateString();
    
    return earliest === latest ? earliest : `${earliest} - ${latest}`;
  }

  // Handle export download
  async function handleExport() {
    if (!project?.id) return;
    console.log('⬇️ Starting export for project:', project.name, project.id);
    
    try {
      isLoading = true;
      error = null;
      
      const params = new URLSearchParams({
        format: exportOptions.format,
        includeMessages: exportOptions.includeMessages,
        includeFacts: exportOptions.includeFacts,
        includeQuestions: exportOptions.includeQuestions
      });
      
      console.log('📡 Making download API call to:', `/api/projects/${project.id}/export?${params}`);
      const response = await fetch(`/api/projects/${project.id}/export?${params}`);
      console.log('📡 Download response status:', response.status, response.statusText);
      console.log('📡 Response headers:', response.headers);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Export failed:', errorData);
        throw new Error(errorData.error || 'Export failed');
      }
      
      // Trigger download
      console.log('📦 Creating blob from response...');
      const blob = await response.blob();
      console.log('📦 Blob created, size:', blob.size, 'type:', blob.type);
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      
      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'wiskr_export.json';
      
      if (contentDisposition) {
        console.log('📁 Content-Disposition header:', contentDisposition);
        const matches = contentDisposition.match(/filename="([^"]+)"/);
        if (matches) {
          filename = matches[1];
        }
      }
      
      console.log('📁 Using filename:', filename);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      console.log('🖱️ Triggering download click...');
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      console.log('✅ Download completed!');
      
      // Close modal on successful export
      closeModal();
      
    } catch (err) {
      console.error('Export error:', err);
      error = err.message;
    } finally {
      isLoading = false;
    }
  }

  // Watch for changes to options and refetch preview
  $: if (isOpen && project) {
    console.log('🔄 Modal opened for project:', project.name);
    fetchPreview();
  }
  
  $: if (exportOptions.includeMessages || exportOptions.includeFacts || exportOptions.includeQuestions) {
    if (isOpen && project) {
      fetchPreview();
    }
  }
</script>

{#if isOpen}
  <div 
    class="fixed inset-0 z-[100000] flex items-center justify-center p-4 backdrop-blur-sm bg-black/30"
    role="dialog"
    aria-modal="true"
    aria-labelledby="export-title"
    on:click={handleBackdropClick}
    on:keydown={(e) => e.key === 'Escape' && closeModal()}
  >
    <div class="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-lg shadow-xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b dark:border-gray-700">
        <h2 id="export-title" class="text-xl font-semibold text-gray-900 dark:text-white">
          Export Project
        </h2>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          on:click={closeModal}
          aria-label="Close export dialog"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto">
        {#if project}
          <div class="mb-6">
            <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {project.name}
            </h3>
          </div>

          <!-- Export Options -->
          <div class="space-y-4 mb-6">
            <h4 class="font-medium text-gray-900 dark:text-white">Export Options</h4>
            
            <div class="space-y-3">
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={exportOptions.includeMessages}
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span class="ml-2 text-sm text-gray-900 dark:text-gray-300">
                  Include conversation messages
                </span>
              </label>
              
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={exportOptions.includeFacts}
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span class="ml-2 text-sm text-gray-900 dark:text-gray-300">
                  Include facts and fact types
                </span>
              </label>
              
              <label class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={exportOptions.includeQuestions}
                  class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700"
                />
                <span class="ml-2 text-sm text-gray-900 dark:text-gray-300">
                  Include saved questions
                </span>
              </label>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                Format
              </label>
              <FeatureGate
                featureKey="advanced-export"
                {user}
                requiredTier={1}
                let:hasAccess
              >
                <select
                  bind:value={exportOptions.format}
                  class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-[#1b1b1e] dark:text-white sm:text-sm"
                >
                  <option value="json">JSON (Complete data)</option>
                  {#if hasAccess}
                    <option value="markdown-single">Markdown (Single file) - Pro+</option>
                    <option value="markdown-multi">Markdown (Multiple files in ZIP) - Pro+</option>
                    <option value="docx">Microsoft Word (DOCX) - Pro+</option>
                  {/if}
                </select>
                
                {#if !hasAccess && (exportOptions.format !== 'json')}
                  <!-- Reset to JSON if user doesn't have access to selected format -->
                  {exportOptions.format = 'json'}
                {/if}
              </FeatureGate>
              
              {#if exportOptions.format.startsWith('markdown')}
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {#if exportOptions.format === 'markdown-single'}
                    📄 Single markdown file with all data organized in sections
                  {:else if exportOptions.format === 'markdown-multi'}
                    📁 ZIP archive with organized markdown files (README.md, conversations/, facts.md, etc.)
                  {/if}
                </p>
              {:else if exportOptions.format === 'docx'}
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  📝 Microsoft Word document with formatted text, headings, and proper document structure
                </p>
              {/if}
            </div>
          </div>

          <!-- Export Preview -->
          {#if exportPreview}
            <div class="bg-gray-50 dark:bg-[#35353d] p-4 rounded-lg mb-6">
              <h4 class="font-medium text-gray-900 dark:text-white mb-3">Export Preview</h4>
              
              <div class="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Sessions:</span>
                  <span class="ml-2 font-medium text-gray-900 dark:text-white">
                    {exportPreview.sessions_count}
                  </span>
                </div>
                
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Messages:</span>
                  <span class="ml-2 font-medium text-gray-900 dark:text-white">
                    {exportPreview.messages_count}
                  </span>
                </div>
                
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Facts:</span>
                  <span class="ml-2 font-medium text-gray-900 dark:text-white">
                    {exportPreview.facts_count}
                  </span>
                </div>
                
                <div>
                  <span class="text-gray-600 dark:text-gray-400">Questions:</span>
                  <span class="ml-2 font-medium text-gray-900 dark:text-white">
                    {exportPreview.questions_count}
                  </span>
                </div>
                
                <div class="col-span-2">
                  <span class="text-gray-600 dark:text-gray-400">Estimated size:</span>
                  <span class="ml-2 font-medium text-gray-900 dark:text-white">
                    {exportPreview.estimated_size}
                  </span>
                </div>
                
                <div class="col-span-2">
                  <span class="text-gray-600 dark:text-gray-400">Date range:</span>
                  <span class="ml-2 font-medium text-gray-900 dark:text-white">
                    {exportPreview.date_range}
                  </span>
                </div>
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
        
        <button
          type="button"
          class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={handleExport}
          disabled={isLoading || !exportPreview}
        >
          {#if isLoading}
            <svg class="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          {:else}
            Download Export
          {/if}
        </button>
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
