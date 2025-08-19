<script>
  import { onMount } from 'svelte';
  import { Share2, Copy, RefreshCw, Lock, Eye, EyeOff, Key } from 'lucide-svelte';
  
  export let projectId;
  
  console.log('ProjectSharingSettings component loaded with projectId:', projectId);
  
  let sharing = {
    isPublic: false,
    shareId: null,
    hasPassword: false
  };
  let password = '';
  let showPassword = false;
  let loading = false;
  let saving = false;
  let copied = false;
  let saveSuccess = false;
  
  $: shareUrl = sharing.shareId ? `${window?.location?.origin || ''}/shared/${sharing.shareId}` : '';
  
  onMount(async () => {
    console.log('ProjectSharingSettings onMount called');
    await loadSharingSettings();
  });
  
  async function loadSharingSettings() {
    console.log('loadSharingSettings called for projectId:', projectId);
    loading = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/sharing`);
      console.log('loadSharingSettings response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('loadSharingSettings data received:', data);
        sharing = data;
      } else {
        console.log('loadSharingSettings failed with status:', response.status);
      }
    } catch (error) {
      console.error('Error loading sharing settings:', error);
    } finally {
      loading = false;
    }
  }
  
  async function saveSharingSettings() {
    console.log('saveSharingSettings called with projectId:', projectId);
    console.log('Current sharing state:', sharing);
    console.log('Password:', password ? 'SET' : 'EMPTY');
    
    saving = true;
    try {
      const requestData = {
        isPublic: sharing.isPublic,
        password: password.trim() || null
      };
      console.log('Sending request data:', requestData);
      
      const response = await fetch(`/api/projects/${projectId}/sharing`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const updated = await response.json();
        sharing = {
          ...sharing,
          ...updated,
          hasPassword: updated.hasPassword || !!password.trim()
        };
        
        // Clear password field after saving
        if (password.trim()) {
          password = '';
        }
        
        // Show success message
        saveSuccess = true;
        setTimeout(() => {
          saveSuccess = false;
        }, 3000);
      } else {
        const error = await response.json();
        alert('Failed to save sharing settings: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving sharing settings:', error);
      alert('Error saving sharing settings. Please try again.');
    } finally {
      saving = false;
    }
  }
  
  async function resetShareLink() {
    if (!confirm('Are you sure you want to reset the share link? The current link will stop working.')) {
      return;
    }
    
    loading = true;
    try {
      const response = await fetch(`/api/projects/${projectId}/sharing`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const updated = await response.json();
        sharing = { ...sharing, ...updated };
        alert('Share link has been reset successfully.');
      } else {
        const error = await response.json();
        alert('Failed to reset share link: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error resetting share link:', error);
      alert('Error resetting share link. Please try again.');
    } finally {
      loading = false;
    }
  }
  
  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link to clipboard');
    }
  }
</script>

<div class="space-y-6">
  <!-- Public Sharing Toggle -->
  <div class="flex items-center justify-between p-4 rounded-lg border border-gray-300 dark:border-gray-600" style="background-color: var(--bg-secondary, #f8f9fa);">
    <div class="flex items-center gap-3">
      <div class="p-2 rounded-lg" style="background-color: rgba(59, 130, 246, 0.1); color: #3B82F6;">
        {#if sharing.isPublic}
          <Eye size="20" />
        {:else}
          <EyeOff size="20" />
        {/if}
      </div>
      <div>
        <h3 class="font-medium text-gray-900 dark:text-gray-100">Public Sharing</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400">
          {sharing.isPublic ? 'This project is publicly accessible via share link' : 'This project is private'}
        </p>
      </div>
    </div>
    <label class="relative inline-flex items-center cursor-pointer">
      <input 
        type="checkbox" 
        bind:checked={sharing.isPublic} 
        class="sr-only peer"
        disabled={loading || saving}
      />
      <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
    </label>
  </div>

  {#if sharing.isPublic && sharing.shareId}
    <!-- Share Link Section -->
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Share Link</label>
        <div class="flex gap-2">
          <input
            type="text"
            readonly
            value={shareUrl}
            class="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            on:click={copyShareLink}
            class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1 transition-colors"
            title="Copy link"
          >
            <Copy size="16" />
            {copied ? 'Copied!' : ''}
          </button>
          <button
            type="button"
            on:click={resetShareLink}
            class="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            title="Reset link"
            disabled={loading}
          >
            <RefreshCw size="16" class={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <p class="text-xs text-gray-500 mt-1">
          Anyone with this link can view your project. Reset the link to invalidate the current URL.
        </p>
      </div>

      <!-- Password Protection -->
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Password Protection (Optional)
        </label>
        <div class="space-y-3">
          <div class="flex gap-2">
            <div class="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                bind:value={password}
                placeholder={sharing.hasPassword ? 'Enter new password (leave blank to keep current)' : 'Enter password to protect this project'}
                class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                on:click={() => showPassword = !showPassword}
                class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {#if showPassword}
                  <EyeOff size="16" />
                {:else}
                  <Eye size="16" />
                {/if}
              </button>
            </div>
          </div>
          
          {#if sharing.hasPassword}
            <div class="flex items-center gap-2 text-green-400 text-sm">
              <Lock size="14" />
              <span>Password protection is currently enabled</span>
            </div>
          {/if}
          
          <p class="text-xs text-gray-500">
            {#if sharing.hasPassword}
              Leave blank to keep the current password, or enter a new one to change it.
            {:else}
              Add a password to restrict access to your shared project.
            {/if}
          </p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Save Success Message -->
  {#if saveSuccess}
    <div class="p-3 rounded-lg border border-green-500/20" style="background-color: rgba(34, 197, 94, 0.1);">
      <div class="flex items-center">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm font-medium text-green-400">✅ Sharing settings updated successfully!</p>
        </div>
      </div>
    </div>
  {/if}

  <!-- Save Button -->
  <div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
    <button
      type="button"
      on:click={saveSharingSettings}
      disabled={saving || loading}
      class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      <Share2 size="16" />
      {saving ? 'Saving...' : 'Save Sharing Settings'}
    </button>
  </div>

  <!-- Info Box -->
  <div class="p-4 rounded-lg border border-blue-200 dark:border-blue-800" style="background-color: rgba(59, 130, 246, 0.1);">
    <div class="flex items-start gap-3">
      <div class="flex-shrink-0 mt-0.5">
        <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
      </div>
      <div>
        <h4 class="text-sm font-medium text-blue-300 mb-1">About Project Sharing</h4>
        <div class="text-sm text-blue-200 space-y-1">
          <p>• Shared projects are read-only for viewers</p>
          <p>• Viewers can see all conversations and messages</p>
          <p>• Password protection adds an extra layer of security</p>
          <p>• You can disable sharing or reset the link at any time</p>
        </div>
      </div>
    </div>
  </div>
</div>
