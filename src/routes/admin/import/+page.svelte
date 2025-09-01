<script>
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Upload, User, FileText, Package, AlertCircle, CheckCircle, X } from 'lucide-svelte';

  export let data;

  let selectedFile = null;
  let selectedUserId = '';
  let conflictMode = 'merge';
  let uploading = false;
  let uploadResult = null;
  let searchTerm = '';

  // Filter users based on search term
  $: filteredUsers = data.users?.filter(user => 
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      selectedFile = file;
      uploadResult = null;
    }
  }

  function removeFile() {
    selectedFile = null;
    const input = document.querySelector('input[type="file"]');
    if (input) input.value = '';
  }

  function getFileIcon(filename) {
    if (filename?.endsWith('.zip')) return Package;
    if (filename?.endsWith('.json')) return FileText;
    return Upload;
  }

  async function handleImport() {
    if (!selectedFile || !selectedUserId) {
      return;
    }

    uploading = true;
    uploadResult = null;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('targetUserId', selectedUserId);
      formData.append('conflictMode', conflictMode);

      const response = await fetch('/api/admin/import/project', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      
      if (response.ok) {
        uploadResult = { success: true, ...result };
        // Reset form on success
        selectedFile = null;
        selectedUserId = '';
        const input = document.querySelector('input[type="file"]');
        if (input) input.value = '';
      } else {
        uploadResult = { success: false, error: result.error };
      }
    } catch (error) {
      uploadResult = { success: false, error: 'Failed to upload file' };
    } finally {
      uploading = false;
    }
  }

  function closeResult() {
    uploadResult = null;
  }
</script>

<div class="max-w-4xl mx-auto">
  <!-- Header -->
  <div class="mb-8">
    <h1 class="text-3xl font-bold text-gray-900 dark:text-white">
      Import Project Data
    </h1>
    <p class="mt-2 text-gray-600 dark:text-gray-400">
      Upload JSON or ZIP files to import project data for users. Supports conflict resolution and data merging.
    </p>
  </div>

  <!-- Import Form -->
  <div class="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <div class="space-y-6">
      <!-- File Upload -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Project File
        </label>
        
        {#if selectedFile}
          <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div class="flex items-center">
              <svelte:component this={getFileIcon(selectedFile.name)} class="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p class="text-sm font-medium text-gray-900 dark:text-white">{selectedFile.name}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              on:click={removeFile}
              class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X class="h-5 w-5" />
            </button>
          </div>
        {:else}
          <div class="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
            <div class="space-y-2 text-center">
              <Upload class="mx-auto h-12 w-12 text-gray-400" />
              <div class="flex text-sm text-gray-600 dark:text-gray-400">
                <label for="file-upload" class="relative cursor-pointer bg-white dark:bg-slate-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                  <span>Upload a file</span>
                  <input
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".json,.zip"
                    class="sr-only"
                    on:change={handleFileSelect}
                  />
                </label>
                <p class="pl-1">or drag and drop</p>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                JSON or ZIP files up to 10MB
              </p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Target User Selection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target User
        </label>
        
        <!-- User Search -->
        <div class="mb-3">
          <input
            type="text"
            placeholder="Search users by email or name..."
            bind:value={searchTerm}
            class="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
          />
        </div>

        <!-- User List -->
        <div class="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
          {#each filteredUsers as user}
            <label class="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0">
              <input
                type="radio"
                name="targetUser"
                value={user.id}
                bind:group={selectedUserId}
                class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
              />
              <div class="ml-3">
                <div class="flex items-center">
                  <User class="h-4 w-4 text-gray-400 mr-2" />
                  <span class="text-sm font-medium text-gray-900 dark:text-white">
                    {user.full_name || 'Unknown User'}
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </label>
          {/each}
          
          {#if filteredUsers.length === 0}
            <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm ? 'No users found matching search' : 'No users available'}
            </div>
          {/if}
        </div>
      </div>

      <!-- Conflict Resolution -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Conflict Resolution
        </label>
        <div class="space-y-3">
          <label class="flex items-center">
            <input
              type="radio"
              name="conflictMode"
              value="merge"
              bind:group={conflictMode}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div class="ml-3">
              <span class="text-sm font-medium text-gray-900 dark:text-white">Merge</span>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Keep existing data, add new contexts only
              </p>
            </div>
          </label>
          
          <label class="flex items-center">
            <input
              type="radio"
              name="conflictMode"
              value="replace"
              bind:group={conflictMode}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div class="ml-3">
              <span class="text-sm font-medium text-gray-900 dark:text-white">Replace</span>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Replace existing project completely with imported data
              </p>
            </div>
          </label>
          
          <label class="flex items-center">
            <input
              type="radio"
              name="conflictMode"
              value="skip"
              bind:group={conflictMode}
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
            />
            <div class="ml-3">
              <span class="text-sm font-medium text-gray-900 dark:text-white">Skip</span>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                Skip import if project already exists
              </p>
            </div>
          </label>
        </div>
      </div>

      <!-- Import Button -->
      <div class="flex justify-end">
        <button
          type="button"
          on:click={handleImport}
          disabled={!selectedFile || !selectedUserId || uploading}
          class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if uploading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Importing...
          {:else}
            <Upload class="h-4 w-4 mr-2" />
            Import Project
          {/if}
        </button>
      </div>
    </div>
  </div>

  <!-- Results -->
  {#if uploadResult}
    <div class="mt-6 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div class="flex items-start justify-between">
        <div class="flex items-start">
          {#if uploadResult.success}
            <CheckCircle class="h-6 w-6 text-green-500 mr-3 mt-0.5" />
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Import Successful
              </h3>
              <div class="mt-2 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p><strong>Project:</strong> {uploadResult.projectName}</p>
                <p><strong>Status:</strong> {uploadResult.isNewProject ? 'New project created' : 'Existing project updated'}</p>
                <p><strong>Contexts imported:</strong> {uploadResult.contextsImported}</p>
                {#if uploadResult.contextsSkipped > 0}
                  <p><strong>Contexts skipped:</strong> {uploadResult.contextsSkipped}</p>
                  {#if uploadResult.skippedContexts?.length > 0}
                    <p class="text-xs">Skipped: {uploadResult.skippedContexts.join(', ')}</p>
                  {/if}
                {/if}
              </div>
            </div>
          {:else}
            <AlertCircle class="h-6 w-6 text-red-500 mr-3 mt-0.5" />
            <div>
              <h3 class="text-lg font-medium text-gray-900 dark:text-white">
                Import Failed
              </h3>
              <p class="mt-2 text-sm text-red-600 dark:text-red-400">
                {uploadResult.error}
              </p>
            </div>
          {/if}
        </div>
        
        <button
          type="button"
          on:click={closeResult}
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <X class="h-5 w-5" />
        </button>
      </div>
    </div>
  {/if}

  <!-- Help Section -->
  <div class="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
    <h3 class="text-lg font-medium text-blue-900 dark:text-blue-100 mb-3">
      Import File Formats
    </h3>
    
    <div class="space-y-4 text-sm">
      <div>
        <h4 class="font-medium text-blue-800 dark:text-blue-200">JSON Format</h4>
        <p class="text-blue-700 dark:text-blue-300 mt-1">
          Single JSON file containing project metadata and contexts.
        </p>
      </div>
      
      <div>
        <h4 class="font-medium text-blue-800 dark:text-blue-200">ZIP Format</h4>
        <p class="text-blue-700 dark:text-blue-300 mt-1">
          ZIP archive containing project.json and optional markdown files for contexts.
        </p>
      </div>
      
      <div>
        <h4 class="font-medium text-blue-800 dark:text-blue-200">Expected Structure</h4>
        <pre class="mt-2 text-xs bg-blue-100 dark:bg-blue-900/40 p-3 rounded text-blue-800 dark:text-blue-200 overflow-x-auto">
{`{
  "project": {
    "name": "My Project",
    "description": "Project description"
  },
  "contexts": [
    {
      "name": "Context 1",
      "description": "Optional description",
      "content": "Context content...",
      "type": "text"
    }
  ]
}`}
        </pre>
      </div>
    </div>
  </div>
</div>
