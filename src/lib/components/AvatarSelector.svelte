<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Upload, User, Check } from 'lucide-svelte';
  import { avatars, loadAvatars, needsRefresh } from '$lib/stores/avatars';

  export let currentAvatarType = 'default';  
  export let currentAvatarValue = null;
  export let saving = false;

  const dispatch = createEventDispatcher();
  
  let selectedType = currentAvatarType;
  let selectedValue = currentAvatarValue;
  let fileInput;
  let uploading = false;

  let premadeAvatars = [];

  // Subscribe to avatars store
  avatars.subscribe(list => {
    premadeAvatars = list;
  });

  onMount(async () => {
    selectedType = currentAvatarType;
    selectedValue = currentAvatarValue;

    // Load avatars if needed
    if (needsRefresh()) {
      await loadAvatars(true);
    } else {
      await loadAvatars();
    }
  });

  function selectDefault() {
    selectedType = 'default';
    selectedValue = null;
    dispatch('change', { type: 'default', value: null });
  }

  function selectPremade(avatarFile) {
    selectedType = 'premade';
    selectedValue = avatarFile;
    dispatch('change', { type: 'premade', value: avatarFile });
  }

  async function handleFileSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be smaller than 2MB');
      return;
    }

    uploading = true;
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      selectedType = 'custom';
      selectedValue = data.url;
      dispatch('change', { type: 'custom', value: data.url });
    } catch (error) {
      console.error('Avatar upload failed:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      uploading = false;
    }
  }

  function getAvatarUrl(type, value) {
    if (type === 'premade') {
      return `/avatars/users/${value}`; // User avatars are in /avatars/users/
    }
    if (type === 'custom') {
      return value; // Should be a full URL from storage
    }
    // For default type, return null so we show the User icon component
    return null;
  }

  $: previewUrl = getAvatarUrl(selectedType, selectedValue);
  $: showUserIcon = selectedType === 'default';
</script>

<div class="space-y-4">
  <!-- Current Avatar Preview -->
  <div class="flex items-center gap-4">
    <div class="w-16 h-16 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden" style="border-color: var(--color-accent);">
      {#if showUserIcon}
        <div class="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <User size="24" class="text-gray-400 dark:text-gray-500" />
        </div>
      {:else}
        <img 
          src={previewUrl} 
          alt="Avatar preview" 
          class="w-full h-full object-cover bg-white"
        />
      {/if}
    </div>
    <div>
      <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">Selected Avatar</h4>
      <p class="text-xs text-gray-500 dark:text-gray-400">This will appear next to your messages in chat</p>
    </div>
  </div>

  <!-- Avatar Options -->
  <div class="space-y-3">
    <!-- Avatar Grid -->
    <div>
      <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Choose an avatar</div>
      <div class="grid grid-cols-5 gap-3">
        <!-- Default Option (First in Grid) -->
        <div class="flex flex-col items-center gap-1">
          <button
            class="relative"
            on:click={selectDefault}
            title="Default"
          >
            <div class="w-12 h-12 rounded-lg border-2 overflow-hidden" 
                 style="border-color: var(--color-accent);">
              <div class="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <User size="20" class="text-gray-400 dark:text-gray-500" />
              </div>
            </div>
            {#if selectedType === 'default'}
              <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style="background-color: var(--color-accent);">
                <Check size="12" style="color: var(--color-accent-text);" />
              </div>
            {/if}
          </button>
          <span class="text-xs text-gray-500 dark:text-gray-400 text-center">Default</span>
        </div>
        
        <!-- Premade Avatars -->
        {#each premadeAvatars as avatar}
          <div class="flex flex-col items-center gap-1">
            <button
              class="relative"
              on:click={() => selectPremade(avatar.file)}
              title={avatar.name}
            >
            <div class="w-12 h-12 rounded-lg border-2 overflow-hidden" 
                style="border-color: var(--color-accent);">
                <img 
                  src="/avatars/users/{avatar.file}" 
                  alt={avatar.name} 
                  class="w-full h-full object-cover bg-white"
                />
              </div>
              {#if selectedType === 'premade' && selectedValue === avatar.file}
                <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style="background-color: var(--color-accent);">
                  <Check size="12" class="text-white" />
                </div>
              {/if}
            </button>
            <span class="text-xs text-gray-500 dark:text-gray-400 text-center">{avatar.name}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Custom Upload -->
    <div>
      <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload your own</div>
      <div class="flex items-center gap-3">
        {#if selectedType === 'custom' && selectedValue}
          <div class="relative">
            <div class="w-12 h-12 rounded-lg border-2 overflow-hidden" style="border-color: var(--color-accent);">
              <img 
                src={selectedValue} 
                alt="Custom avatar" 
                class="w-full h-full object-cover bg-white"
              />
            </div>
            <div class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center" style="background-color: var(--color-accent);">
              <Check size="12" class="text-white" />
            </div>
          </div>
        {/if}
        
        <input
          bind:this={fileInput}
          type="file"
          accept="image/*"
          on:change={handleFileSelect}
          class="hidden"
        />
        
        <button
          class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
          style="background-color: var(--bg-button-secondary);"
          on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)'}
          on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary)'}
          on:click={() => fileInput?.click()}
          disabled={uploading}
        >
          <Upload size="16" class="text-gray-700 dark:text-gray-300" />
          {uploading ? 'Uploading...' : 'Choose File'}
        </button>
        
        <div class="text-xs text-gray-500 dark:text-gray-400">
          Max 2MB, PNG/JPG
        </div>
      </div>
    </div>
  </div>
</div>
