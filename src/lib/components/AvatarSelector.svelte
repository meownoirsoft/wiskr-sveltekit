<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Upload, User, Check, Lock } from 'lucide-svelte';
  import { avatars, loadAvatars, needsRefresh } from '$lib/stores/avatars';
  import FeatureGate from '$lib/components/FeatureGate.svelte';
  import { isAvatarAllowed } from '$lib/config/tiers.js';
  import { getUserTier } from '$lib/utils/tiers.js';

  export let currentAvatarType = 'default';  
  export let currentAvatarValue = null;
  export const saving = false;
  export let user = null;
  export let userTier = 0;
  export let trialEndsAt = null;

  const dispatch = createEventDispatcher();
  
  let selectedType = currentAvatarType;
  let selectedValue = currentAvatarValue;
  let fileInput;
  let uploading = false;

  let premadeAvatars = [];
  let filteredAvatars = [];
  
  // Helper function to get avatar ID from filename for tier checking
  function getAvatarId(filename) {
    // Convert filename to lowercase and remove extension to match tier config
    return filename.toLowerCase().replace('.png', '');
  }
  
  // Helper function to check if avatar is allowed for current tier
  function isAvatarAllowedForUser(filename) {
    // If no user data, assume free tier for demonstration
    const effectiveUserTier = user ? getUserTier({...user, tier: userTier, trial_ends_at: trialEndsAt}) : 0;
    
    // Define free tier avatars (first 5 including default)
    const freeAvatars = ['mermia', 'ben-cipher', 'benji-fox', 'deerie'];
    
    if (effectiveUserTier === 0) {
      // Free tier - only allow specific avatars
      const avatarId = getAvatarId(filename);
      return freeAvatars.includes(avatarId);
    }
    
    // Pro/Studio tiers - all avatars allowed
    return true;
  }

  // Subscribe to avatars store
  avatars.subscribe(list => {
    premadeAvatars = list;
  });
  
  // Reactive statement to update filtered avatars when user data or avatars change
  $: {
    if (premadeAvatars.length > 0) {
      filteredAvatars = premadeAvatars.map(avatar => ({
        ...avatar,
        isLocked: !isAvatarAllowedForUser(avatar.file)
      }));
      //console.log('Filtered avatars:', filteredAvatars);
    }
  }

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
        {#each filteredAvatars as avatar}
          <div class="flex flex-col items-center gap-1">
            {#if avatar.isLocked}
              <!-- Locked Avatar -->
              <div class="relative">
                <button
                  class="relative opacity-50 cursor-not-allowed"
                  title="{avatar.name} (Requires Pro)"
                  disabled
                >
                  <div class="w-12 h-12 rounded-lg border-2 border-gray-300 dark:border-gray-600 overflow-hidden relative">
                    <img 
                      src="/avatars/users/{avatar.file}" 
                      alt={avatar.name} 
                      class="w-full h-full object-cover bg-white grayscale brightness-75 contrast-75"
                    />
                    <!-- Lock overlay -->
                    <div class="absolute inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
                      <Lock size="14" class="text-white drop-shadow-sm" />
                    </div>
                  </div>
                </button>
              </div>
            {:else}
              <!-- Available Avatar -->
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
            {/if}
            <span class="text-xs {avatar.isLocked ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'} text-center">{avatar.name}</span>
            {#if avatar.isLocked}
              <span class="text-xs text-amber-600 dark:text-amber-400 text-center font-medium">Pro</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Custom Upload -->
    <div>
      <div class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Upload your own</div>
      <FeatureGate 
        {user} 
        feature="custom-avatar"
        showBadge={true}
        badgeSize="sm"
        className="w-full"
      >
        <div class="flex items-center gap-3" slot="default" let:hasAccess>
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
            class="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
            class:text-gray-700={hasAccess}
            class:dark:text-gray-300={hasAccess}
            class:text-gray-400={!hasAccess}
            class:dark:text-gray-500={!hasAccess}
            class:cursor-not-allowed={!hasAccess}
            style="background-color: var(--bg-button-secondary);"
            on:mouseenter={(e) => {
              if (hasAccess) {
                e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)';
              }
            }}
            on:mouseleave={(e) => {
              if (hasAccess) {
                e.target.style.backgroundColor = 'var(--bg-button-secondary)';
              }
            }}
            on:click={() => {
              if (hasAccess) {
                fileInput?.click();
              }
            }}
            disabled={uploading || !hasAccess}
            title={hasAccess ? '' : 'Requires Pro subscription to upload custom avatars'}
          >
            <Upload size="16" class={hasAccess ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'} />
            {uploading ? 'Uploading...' : (hasAccess ? 'Choose File' : 'Choose File (Pro)')}
          </button>
          
          <div class="text-xs text-gray-500 dark:text-gray-400">
            Max 2MB, PNG/JPG
          </div>
        </div>
      </FeatureGate>
    </div>
  </div>
</div>
