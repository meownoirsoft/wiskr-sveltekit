<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
     import { User, Palette, Sliders, Paintbrush, Info, Sun, Moon, Crown, Gift, ChevronDown, X, CreditCard } from 'lucide-svelte';
  import AvatarSelector from '$lib/components/AvatarSelector.svelte';
  import { getTierDisplayInfo } from '$lib/tiers.js';
  import { getBuildInfo } from '$lib/config/build.js';
  import UpgradeModal from '$lib/components/modals/UpgradeModal.svelte';
  import { createModalClickHandler } from '$lib/utils/modalClickHandler.js';
  
  const dispatch = createEventDispatcher();

  // Props
  export let isOpen = false;
  export let userData = null;
  export let userPreferences = { max_related_ideas: 8, accent_color: '#155DFC', display_name: null, avatar_type: 'default', avatar_value: null };
  export let savingPreferences = false;
  export let darkMode = false;
  export let userTier = 0;
  export let effectiveTier = 0;
  export let trialEndsAt = null;
  export let initialTab = 'account'; // Allow opening with a specific tab
  
  // Internal state
  let activeTab = initialTab; // 'account', 'profile', 'preferences', 'appearance', 'about'
  let wasOpen = false;
  let showDropdown = false;
  let managingSubscription = false;
  let portalContainer;
  let dropdownPosition = { top: 0, left: 0 };
  let dropdownButtonEl;
  let showUpgradeModal = false;
  
  // Build info
  const buildInfo = getBuildInfo();
  
  // Modal click handler for proper backdrop clicks
  const modalClickHandler = createModalClickHandler(() => {
    handleClose();
  });
  
  
  // Portal action to render dropdown at document body
  function createPortal(node) {
    // Create portal container if it doesn't exist
    if (!portalContainer) {
      portalContainer = document.createElement('div');
      portalContainer.id = 'settings-dropdown-portal';
      portalContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10000000;';
      document.body.appendChild(portalContainer);
    }

    // Move the node to the portal container
    portalContainer.appendChild(node);
    
    // Enable pointer events on the dropdown itself
    node.style.pointerEvents = 'auto';
    
    return {
      destroy() {
        if (node.parentNode) {
          node.parentNode.removeChild(node);
        }
      }
    };
  }
  
  // Update dropdown position
  function updateDropdownPosition() {
    if (dropdownButtonEl) {
      const rect = dropdownButtonEl.getBoundingClientRect();
      dropdownPosition = {
        top: rect.bottom + 4,
        left: rect.left
      };
    }
  }
  
  // Handle clicks outside dropdown
  function handleOutsideClick(event) {
    if (showDropdown && portalContainer && !portalContainer.contains(event.target) && 
        dropdownButtonEl && !dropdownButtonEl.contains(event.target)) {
      showDropdown = false;
    }
  }
  
  function handleUpgradeClick() {
    showUpgradeModal = true;
  }
  
  function handleUpgradeModalClose() {
    showUpgradeModal = false;
  }
  
  // Tab configuration
  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'profile', label: 'Avatar', icon: Palette },
    { id: 'appearance', label: 'Theme', icon: Paintbrush },
    { id: 'about', label: 'About', icon: Info }
  ];
  
  // Get current tab info
  $: currentTab = tabs.find(tab => tab.id === activeTab) || tabs[0];
  
  // Ensure activeTab is always a valid string
  $: if (typeof activeTab !== 'string' || !tabs.find(tab => tab.id === activeTab)) {
    activeTab = 'account';
  }
  
  // Reset tab only when modal is first opened
  $: if (isOpen && !wasOpen) {
    activeTab = initialTab;
    wasOpen = true;
  } else if (!isOpen) {
    wasOpen = false;
  }
  
  // Ensure modal content is ready when userData loads
  $: if (isOpen && userData && !wasOpen) {
    wasOpen = true;
  }
  

  
  // Theme and color utility functions
  function hexToRgb(hex) {
    const result = /^#?([a-f\\d]{2})([a-f\\d]{2})([a-f\\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  function getContrastColor(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return '#000000';
    
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  function applyAccentColor(color) {
    if (browser && color && document.documentElement) {
      document.documentElement.style.setProperty('--color-accent', color);
      
      const rgb = hexToRgb(color);
      if (rgb) {
        const hoverColor = darkMode ? lightenColor(color, 0.2) : darkenColor(color, 0.1);
        document.documentElement.style.setProperty('--color-accent-hover', hoverColor);
        document.documentElement.style.setProperty('--color-accent-light', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${darkMode ? 0.2 : 0.1})`);
        document.documentElement.style.setProperty('--color-accent-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${darkMode ? 0.4 : 0.3})`);
        document.documentElement.style.setProperty('--color-accent-text', getContrastColor(color));
      }
    }
  }
  
  function darkenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const r = Math.max(0, Math.floor(rgb.r * (1 - percent)));
    const g = Math.max(0, Math.floor(rgb.g * (1 - percent)));
    const b = Math.max(0, Math.floor(rgb.b * (1 - percent)));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  function lightenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * percent));
    const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * percent));
    const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * percent));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  function applyTheme() {
    if (browser && document.documentElement) {
      const root = document.documentElement;
      
      if (darkMode) {
        root.classList.add('dark');
        root.style.setProperty('--bg-primary', '#1a1a1a');
        root.style.setProperty('--bg-panel-left', '#1b1b1e');
        root.style.setProperty('--bg-panel-right', '#1b1b1e');
        root.style.setProperty('--bg-header', '#222226');
        root.style.setProperty('--bg-chat', '#222226');
        root.style.setProperty('--bg-chat-header', '#1b1b1e');
        root.style.setProperty('--bg-card', '#35353d');
        root.style.setProperty('--text-primary', '#ffffff');
        root.style.setProperty('--bg-modal', '#1b1b1e');
        root.style.setProperty('--bg-sessions-panel', '#222226');
        root.style.backgroundColor = '#1a1a1a';
      } else {
        root.classList.remove('dark');
        root.style.setProperty('--bg-primary', '#ffffff');
        root.style.setProperty('--bg-panel-left', '#EEF1FF');
        root.style.setProperty('--bg-panel-right', '#EEF1FF');
        root.style.setProperty('--bg-header', '#D2DAFF');
        root.style.setProperty('--bg-chat', '#D2DAFF');
        root.style.setProperty('--bg-chat-header', '#EEF1FF');
        root.style.setProperty('--bg-card', '#ffffff');
        root.style.setProperty('--text-primary', '#1f2937');
        root.style.setProperty('--bg-modal', '#ffffff');
        root.style.setProperty('--bg-sessions-panel', '#ffffff');
        root.style.backgroundColor = '#ffffff';
      }
      
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: { darkMode } }));
      }, 0);
    }
  }
  
  // Event handlers
  function handleClose() {
    dispatch('close');
  }
  
  function handleSavePreferences() {
    dispatch('save-preferences', userPreferences);
  }
  
  
  function handleAccentColorChange() {
    applyAccentColor(userPreferences.accent_color);
    handleSavePreferences();
  }
  
  function handleThemeChange(newDarkMode) {
    darkMode = newDarkMode;
    localStorage.setItem('wiskr_theme', darkMode ? 'dark' : 'light');
    applyTheme();
    dispatch('theme-changed', { darkMode });
  }
  
  function handleAvatarChange(event) {
    userPreferences.avatar_type = event.detail.type;
    userPreferences.avatar_value = event.detail.value;
    handleSavePreferences();
  }
  
  function handleTabSelect(tabId) {
    activeTab = tabId;
    showDropdown = false;
  }
  
  function handleClickOutside(event) {
    if (!event.target.closest('.settings-dropdown')) {
      showDropdown = false;
    }
  }
  
  async function handleManageSubscription() {
    if (!userData) return;
    
    managingSubscription = true;
    
    try {
      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.error) {
        console.error('Error creating portal session:', data.error);
        
        // Handle specific error cases
        if (data.code === 'NO_SUBSCRIPTION') {
          if (data.profileCreated) {
            alert('Profile created successfully! You can now subscribe to a plan from the Plans page.');
          } else {
            alert('You don\'t have an active subscription. Please subscribe to a plan first from the Plans page.');
          }
        } else if (data.code === 'NO_PROFILE') {
          alert('Profile not found. Please try logging out and back in.');
        } else if (data.code === 'STRIPE_PORTAL_NOT_CONFIGURED') {
          alert('Stripe Customer Portal is not configured yet.\n\nPlease visit the Stripe dashboard to set it up:\nhttps://dashboard.stripe.com/test/settings/billing/portal\n\nThis is a one-time setup required for subscription management.');
        } else if (data.code === 'STRIPE_ERROR') {
          alert(`Stripe Error: ${data.error}\n\nDetails: ${data.details}`);
        } else {
          alert(`Error: ${data.error}${data.details ? '\n\nDetails: ' + data.details : ''}`);
        }
      } else if (data.url) {
        // Redirect to Stripe customer portal
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to open customer portal:', err);
      alert('Failed to open subscription management. Please try again.');
    } finally {
      managingSubscription = false;
    }
  }
  
  // Add event listeners when dropdown is open
  $: if (showDropdown && typeof document !== 'undefined') {
    document.addEventListener('click', handleOutsideClick);
    window.addEventListener('resize', updateDropdownPosition);
    window.addEventListener('scroll', updateDropdownPosition, true);
  } else if (typeof document !== 'undefined') {
    document.removeEventListener('click', handleOutsideClick);
    window.removeEventListener('resize', updateDropdownPosition);
    window.removeEventListener('scroll', updateDropdownPosition, true);
  }
  
  // Cleanup portal on destroy
  onDestroy(() => {
    if (portalContainer && portalContainer.parentNode) {
      portalContainer.parentNode.removeChild(portalContainer);
      portalContainer = null;
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('click', handleOutsideClick);
      window.removeEventListener('resize', updateDropdownPosition);
      window.removeEventListener('scroll', updateDropdownPosition, true);
    }
  });
</script>

<style>
  /* Ensure dropdown appears above everything */
  :global(.settings-dropdown .absolute) {
    z-index: 99999999 !important;
  }
</style>

{#if isOpen}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div id="app-settings-modal" class="fixed inset-0 backdrop-blur-sm /50 dark:/70 flex items-center justify-center z-[99999]" on:mousedown={modalClickHandler.handleMouseDown} on:click={modalClickHandler.handleClick}>
    <div class="bg-white rounded-xl shadow-xl border-2 border-gray-200 dark:border-gray-600 w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden" style="background-color: var(--bg-modal, white);">
             <div class="flex items-center justify-between pl-6 pr-4 py-3 border-b border-gray-200 dark:border-gray-600">
         {#if !userData}
           <!-- Loading state for header -->
           <div class="flex items-center gap-3">
             <div class="w-24 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
           </div>
         {:else}
           <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h3>
         {/if}
                  <button 
            class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 w-12 h-12 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            on:click={handleClose}
          >
            <X size="32" />
          </button>
       </div>

      <div class="flex flex-col">
                          <!-- Mobile-friendly dropdown navigation -->
         <div class="p-4 border-b border-gray-200 dark:border-gray-600">
           {#if !userData}
             <!-- Loading state for tab navigation -->
             <div class="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
           {:else}
           <div class="relative settings-dropdown">
             <button
               bind:this={dropdownButtonEl}
               class="w-full flex items-center justify-between gap-3 px-4 py-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
               on:click={() => {
                 showDropdown = !showDropdown;
                 if (showDropdown) {
                   updateDropdownPosition();
                 }
               }}
             >
               <div class="flex items-center gap-3">
                 <svelte:component this={currentTab.icon} size="20" />
                 <span>{currentTab.label}</span>
               </div>
               <ChevronDown size="16" class="transition-transform {showDropdown ? 'rotate-180' : ''}" />
             </button>
            
          </div>
         {/if}
        </div>

        <!-- Tab Content -->
        <div class="flex-1 overflow-y-auto max-h-[60vh]">
          <div class="p-6">
            
            <!-- Account Tab -->
            {#if activeTab === 'account'}
              <div class="space-y-6">
                <div>
                   <div class="flex items-center justify-between mb-4">
                     <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">User Details</h4>
                     <a 
                       href="/logout" 
                       class="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors font-medium"
                       on:click={handleClose}
                     >
                       Logout
                     </a>
                   </div>
                   
                   <!-- Loading state while userData is being fetched -->
                   {#if !userData || userData === undefined}
                     <div class="text-center py-8">
                       <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                       <p class="text-sm text-gray-600 dark:text-gray-400">Loading user information...</p>
                     </div>
                   {:else if userData}
                    <div class="space-y-4">
                      <div class="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{userData.email}</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">Email Address</div>
                        </div>
                        <div class="text-xs text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900 px-2 py-1 rounded-full">
                          Verified
                        </div>
                      </div>
                      <!-- Subscription Tier Information -->
                      <div class="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div>
                          <div class="flex items-center gap-2">
                            {#if getTierDisplayInfo(userTier, trialEndsAt).status === 'trial'}
                              <Gift size="16" class="text-amber-500" />
                            {:else if userTier > 0}
                              <Crown size="16" class="text-amber-500" />
                            {/if}
                            <div class="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {getTierDisplayInfo(userTier, trialEndsAt).name}
                            </div>
                          </div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">Subscription Tier</div>
                          {#if getTierDisplayInfo(userTier, trialEndsAt).status === 'trial'}
                            <div class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              Trial ends: {new Date(trialEndsAt).toLocaleDateString()}
                            </div>
                          {:else if getTierDisplayInfo(userTier, trialEndsAt).status === 'expired'}
                            <div class="text-xs text-red-600 dark:text-red-400 mt-1">
                              Trial expired - Consider upgrading to Pro
                            </div>
                          {/if}
                        </div>
                        <div class="text-right flex flex-col items-end gap-2">
                          <div class="text-xs text-gray-500 dark:text-gray-400">
                            {#if getTierDisplayInfo(userTier, trialEndsAt).isUnlimited}
                              Unlimited projects
                            {:else}
                              Up to {getTierDisplayInfo(userTier, trialEndsAt).maxProjects} projects
                            {/if}
                          </div>
                          {#if effectiveTier === 0 || getTierDisplayInfo(userTier, trialEndsAt).status === 'trial' || getTierDisplayInfo(userTier, trialEndsAt).status === 'expired'}
                            <button 
                              on:click={handleUpgradeClick}
                              class="px-3 py-1 text-xs font-medium rounded-lg transition-colors border"
                              style="background-color: var(--color-accent); color: var(--color-accent-text); border-color: var(--color-accent);"
                              on:mouseenter={(e) => {
                                e.target.style.backgroundColor = 'var(--color-accent-hover)';
                                e.target.style.borderColor = 'var(--color-accent-hover)';
                              }}
                              on:mouseleave={(e) => {
                                e.target.style.backgroundColor = 'var(--color-accent)';
                                e.target.style.borderColor = 'var(--color-accent)';
                              }}
                            >
                              {#if getTierDisplayInfo(userTier, trialEndsAt).status === 'trial'}
                                Upgrade Now
                              {:else if getTierDisplayInfo(userTier, trialEndsAt).status === 'expired'}
                                Reactivate Pro
                              {:else}
                                Upgrade to Pro
                              {/if}
                            </button>
                          {:else if userTier > 0}
                            <button
                              on:click={handleManageSubscription}
                              disabled={managingSubscription}
                              class="px-3 py-1 text-xs font-medium rounded-lg transition-colors border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-1"
                            >
                              {#if managingSubscription}
                                <div class="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
                              {:else}
                                <CreditCard size="12" />
                              {/if}
                              Cancel Subscription
                            </button>
                          {/if}
                        </div>
                      </div>
                      <div class="space-y-6">
                        <!-- Preferred Name -->
                        <div>
                          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" for="preferred-name">Preferred Name</label>
                          <input 
                            type="text" 
                            maxlength="50" 
                            placeholder="Your name (e.g., Sym)"
                            bind:value={userPreferences.display_name}
                            on:change={handleSavePreferences}
                            class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2" 
                            style="--tw-ring-color: var(--color-accent);"
                          />
                          <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This name will appear in your chat messages</p>
                        </div>
                                                 <!-- Max Related Ideas - Hidden -->
                         <!-- <div>
                           <div class="flex items-center justify-between">
                             <div>
                               <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Max Related Ideas</div>
                               <div class="text-xs text-gray-500 dark:text-gray-400">Number of ideas generated (1-20)</div>
                             </div>
                             <div class="flex items-center gap-2">
                               <input 
                                 type="number" 
                                 min="1" 
                                 max="20" 
                                 bind:value={userPreferences.max_related_ideas}
                                 on:change={handleSavePreferences}
                                 class="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer" 
                                 style="--tw-ring-color: var(--color-accent);"
                               />
                               {#if savingPreferences}
                                 <span class="text-xs" style="color: var(--color-accent);">Saving...</span>
                               {/if}
                             </div>
                           </div>
                         </div> -->
                      </div>
                    </div>
                   {:else}
                    <div class="text-center py-8">
                      <div class="text-gray-400 dark:text-gray-500 mb-4">
                        <User size="48" class="mx-auto" />
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">You are not currently signed in</p>
                      <div class="flex gap-3 justify-center">
                        <a href="/login" 
                           class="px-4 py-2 text-sm rounded-lg transition-colors" 
                           style="background-color: var(--color-accent); color: var(--color-accent-text);"
                           on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
                           on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
                        >Sign In</a>
                        <a href="/signup" 
                           class="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                        >Sign Up</a>
                      </div>
                    </div>
                   {/if}
              </div> <!-- Close Account tab main container -->
            </div>
            <!-- Profile Tab -->
            {:else if activeTab === 'profile'}
              <div class="space-y-6">
                <div>
                  
                  <!-- Loading state while userData is being fetched -->
                  {#if !userData || userData === undefined}
                    <div class="text-center py-8">
                      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p class="text-sm text-gray-600 dark:text-gray-400">Loading user information...</p>
                    </div>
                  {:else if userData}
                    <div class="space-y-6">
                      <!-- Avatar Section -->
                      <div>
                        <AvatarSelector
                          currentAvatarType={userPreferences.avatar_type}
                          currentAvatarValue={userPreferences.avatar_value}
                          saving={savingPreferences}
                          user={userData}
                          userTier={effectiveTier}
                          trialEndsAt={trialEndsAt}
                          on:change={handleAvatarChange}
                        />
                      </div>
                    </div>
                  {:else}
                    <div class="text-center py-8">
                      <div class="w-16 h-16 mx-auto mb-4 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <Palette size="24" class="text-gray-400 dark:text-gray-500" />
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">You need to be signed in to customize your profile</p>
                      <div class="flex gap-3 justify-center">
                        <a href="/login" 
                           class="px-4 py-2 text-sm text-white rounded-lg transition-colors" 
                           style="background-color: var(--color-accent);" 
                           on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
                           on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
                        >Sign In</a>
                        <a href="/signup" 
                           class="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700"
                        >Sign Up</a>
                      </div>
                    </div>
                  {/if}
                </div>
              </div>
            
            <!-- Theme & Accent Tab -->
            {:else if activeTab === 'appearance'}
              <div class="space-y-6">
                    <!-- Theme section hidden for now -->
                    
                    <div>
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" for="accent-color">Accent Color</label>
                      <div class="flex items-center gap-4">
                        <input 
                          type="color" 
                          bind:value={userPreferences.accent_color}
                          on:change={handleAccentColorChange}
                          class="w-16 h-16 rounded-lg border-2 border-gray-300 dark:border-gray-600 cursor-pointer"
                          title="Choose accent color"
                        />
                        <div class="flex-1">
                          <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Custom Color</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400">Choose your preferred accent color</div>
                          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1 font-mono">{userPreferences.accent_color}</div>
                        </div>
                        <div 
                          class="w-12 h-12 rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-bold shadow-sm"
                          style="background-color: {userPreferences.accent_color}; color: {getContrastColor(userPreferences.accent_color)}"
                        >
                          Aa
                        </div>
                      </div>
                </div>
              </div>
            
            <!-- About Tab -->
            {:else if activeTab === 'about'}
              <div class="space-y-6">
                <div>
                  <div class="space-y-6">
                                         <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                       <div class="flex items-center justify-between">
                         <img src="/wiskr-logo.webp" alt="Wiskr" class="h-12" />
                         <div class="ml-auto">
                           <span class="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-full">{buildInfo.versionString}</span>
                         </div>
                       </div>
                      <!-- <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Wiskr helps you manage AI conversations across multiple models, organize context with facts and documents, and generate ideas for your projects.
                      </p> -->
                    </div>
                    
                    <!-- <div class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                       <h6 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Features</h6>
                       <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                        <li><b>Context Control</b> – Prevent context pollution and keep conversations focused.</li>

                        <li><b>Multi-Model Conversations</b> – Chat with GPT, Claude, Gemini, and others in the same thread.</li>
                        
                        <li><b>Project Workspaces</b> – Organize conversations, notes, and branches under each project.</li>
                        
                        <li><b>Conversation Branching</b> – Explore side ideas without disrupting your main flow.</li>
                        
                        <li><b>One-Click Export</b> – Format and save outputs as clean docs, posts, or code.</li>
                       </ul>
                    </div> -->
                    
                    <!-- Legal Links -->
                    <div class="flex items-center justify-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                      <a 
                        href="/terms" 
                        class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Terms of Service
                      </a>
                      <span class="text-xs text-gray-400 dark:text-gray-500">•</span>
                      <a 
                        href="/privacy" 
                        class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Privacy Policy
                      </a>
                      <span class="text-xs text-gray-400 dark:text-gray-500">•</span>
                      <a 
                        href="/support" 
                        class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Support
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            {/if}
            
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-slate-800">
        <div class="flex items-center justify-between">
                     {#if savingPreferences}
             <div class="flex items-center gap-2 text-sm" style="color: var(--color-accent);">
               <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
               Saving preferences...
             </div>
           {:else if activeTab == 'about'}
           <div class="text-xs text-gray-500 dark:text-gray-400">
            Thank you for using Wiskr!
          </div>
           {:else}
             <div class="text-xs text-gray-500 dark:text-gray-400">
               Changes are saved automatically
             </div>
           {/if}
          
          <button 
            class="px-4 py-2 text-white text-sm rounded-lg transition-colors font-medium" 
            style="background-color: var(--color-accent);" 
            on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
            on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
            on:click={handleClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Dropdown outside modal to avoid overflow clipping -->
{#if showDropdown && isOpen && typeof document !== 'undefined'}
  <div 
    id="settings-dropdown"
    class="fixed border rounded-lg shadow-lg"
    style="background-color: {typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#374151' : 'white'}; border-color: var(--border-header-input); top: {dropdownPosition.top}px; left: {dropdownPosition.left}px; z-index: 100000000; width: 256px;"
  >
    {#each tabs as tab}
      <button
        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors first:rounded-t-lg last:rounded-b-lg"
        on:click={(e) => {
          e.preventDefault();
          handleTabSelect(tab.id);
        }}
      >
        <svelte:component this={tab.icon} size="20" />
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>
{/if}

<!-- Upgrade Modal -->
<UpgradeModal
  bind:showModal={showUpgradeModal}
  targetTier={1}
  feature="pro-subscription"
  user={userData}
  on:close={handleUpgradeModalClose}
/>

