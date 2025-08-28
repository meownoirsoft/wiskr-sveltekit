<script>
  import { createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { User, Palette, Sliders, Paintbrush, Info, Sun, Moon, Crown, Gift } from 'lucide-svelte';
  import AvatarSelector from '$lib/components/AvatarSelector.svelte';
  import { getTierDisplayInfo } from '$lib/tiers.js';
  
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
  
  // Internal state
  let activeTab = 'account'; // 'account', 'profile', 'preferences', 'appearance', 'about'
  let wasOpen = false;
  
  // Reset tab only when modal is first opened
  $: if (isOpen && !wasOpen) {
    activeTab = 'account';
    wasOpen = true;
  } else if (!isOpen) {
    wasOpen = false;
  }
  
  // Theme and color utility functions (copied from layout)
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
    
    // Calculate relative luminance using sRGB
    const { r, g, b } = rgb;
    const [rs, gs, bs] = [r / 255, g / 255, b / 255].map(c => {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    const luminance = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    
    // Use white text if background is dark, black if it's light
    return luminance > 0.5 ? '#000000' : '#ffffff';
  }
  
  function applyAccentColor(color) {
    if (browser && color) {
      document.documentElement.style.setProperty('--color-accent', color);
      
      // Calculate hover and light variants
      const rgb = hexToRgb(color);
      if (rgb) {
        const hoverColor = darkMode ? lightenColor(color, 0.2) : darkenColor(color, 0.1);
        document.documentElement.style.setProperty('--color-accent-hover', hoverColor);
        document.documentElement.style.setProperty('--color-accent-light', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${darkMode ? 0.2 : 0.1})`);
        document.documentElement.style.setProperty('--color-accent-border', `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${darkMode ? 0.4 : 0.3})`);
        
        // Set contrasting text color for accent elements
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
    if (browser) {
      const root = document.documentElement;
      
      if (darkMode) {
        root.classList.add('dark');
        // Force update CSS variables for dark mode
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
        // Force update CSS variables for light mode
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
      
      // Force a repaint to ensure all components update
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
</script>

{#if isOpen}
  <div class="fixed inset-0 backdrop-blur-sm /50 dark:/70 flex items-center justify-center z-[99999]">
    <div class="bg-white rounded-xl shadow-xl w-[90vw] max-w-2xl max-h-[90vh] overflow-hidden" style="background-color: var(--bg-modal, white);">
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-600">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h3>
        <button 
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
          on:click={handleClose}
        >
          ✕
        </button>
      </div>

      <div class="flex">
        <!-- Tab Navigation -->
        <div class="w-40 border-r border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
          <nav class="p-4 space-y-2">
            <button
              class="w-full flex items-center gap-3 px-2 py-2 text-sm rounded-lg transition-colors {activeTab === 'account' ? '' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
              style={activeTab === 'account' ? 'background-color: var(--color-accent); color: var(--color-accent-text);' : ''}
              on:click={() => activeTab = 'account'}
            >
              <User size="20" />
              Account
            </button>
            
            <button
              class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors {activeTab === 'profile' ? '' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
              style={activeTab === 'profile' ? 'background-color: var(--color-accent); color: var(--color-accent-text);' : ''}
              on:click={() => activeTab = 'profile'}
            >
              <Palette size="20" />
              Avatar
            </button>
            
            <button
              class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors {activeTab === 'appearance' ? '' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
              style={activeTab === 'appearance' ? 'background-color: var(--color-accent); color: var(--color-accent-text);' : ''}
              on:click={() => activeTab = 'appearance'}
            >
              <Paintbrush size="20" />
              Theme
            </button>
            
            <button
              class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors {activeTab === 'about' ? '' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
              style={activeTab === 'about' ? 'background-color: var(--color-accent); color: var(--color-accent-text);' : ''}
              on:click={() => activeTab = 'about'}
            >
              <Info size="20" />
              About
            </button>
          </nav>
        </div>

        <!-- Tab Content -->
        <div class="flex-1 overflow-y-auto max-h-[70vh]">
          <div class="p-6">
            
            <!-- Account Tab -->
            {#if activeTab === 'account'}
              <div class="space-y-6">
                <div>
                  <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">User Details</h4>
                  {#if userData}
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
                            <a 
                              href="/upgrade" 
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
                            </a>
                          {/if}
                        </div>
                      </div>
                      
                      <div>
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
                          class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2" 
                          style="background-color: #1b1b1e; --tw-ring-color: var(--color-accent);"
                        />
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This name will appear in your chat messages</p>
                      </div>
                      
                      <!-- Max Related Ideas -->
                      <div>
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
                              class="w-20 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2" 
                              style="background-color: #1b1b1e; --tw-ring-color: var(--color-accent);"
                            />
                            {#if savingPreferences}
                              <span class="text-xs" style="color: var(--color-accent);">Saving...</span>
                            {/if}
                          </div>
                        </div>
                      </div>
                    </div>
                </div>
                <div class="border-t border-gray-200 dark:border-gray-600 pt-4">
                        <div class="flex items-center justify-between">
                          <div>
                            <h5 class="text-sm font-medium text-gray-900 dark:text-gray-100">Sign Out</h5>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Sign out of your account</p>
                          </div>
                          <a 
                            href="/logout" 
                            class="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors font-medium"
                            on:click={handleClose}
                          >
                            Logout
                          </a>
                        </div>
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
                </div>
              </div>
            
            <!-- Profile Tab -->
            {:else if activeTab === 'profile'}
              <div class="space-y-6">
                <div>
                  {#if userData}
                    <div class="space-y-6">
                      <!-- Avatar Section -->
                      <div>
                        <AvatarSelector
                          currentAvatarType={userPreferences.avatar_type}
                          currentAvatarValue={userPreferences.avatar_value}
                          saving={savingPreferences}
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
                <div>
                  <div class="space-y-6">
                    <div>
                      <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3" for="theme">Theme</label>
                      <div class="grid grid-cols-2 gap-3">
                        <button
                          class="flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all {!darkMode ? 'border-2' : 'border-gray-200 dark:border-gray-600'}"
                          style={!darkMode ? 'border-color: var(--color-accent); background-color: var(--color-accent-light);' : ''}
                          on:click={() => handleThemeChange(false)}
                        >
                          <Sun size="20" style={!darkMode ? 'color: var(--color-accent);' : ''} />
                          <span class="text-sm font-medium">Light Mode</span>
                        </button>
                        
                        <button
                          class="flex items-center justify-center gap-2 p-4 border-2 rounded-lg transition-all {darkMode ? 'border-2' : 'border-gray-200 dark:border-gray-600'}"
                          style={darkMode ? 'border-color: var(--color-accent); background-color: var(--color-accent-light);' : ''}
                          on:click={() => handleThemeChange(true)}
                        >
                          <Moon size="20" style={darkMode ? 'color: var(--color-accent);' : ''} />
                          <span class="text-sm font-medium">Dark Mode</span>
                        </button>
                      </div>
                    </div>
                    
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
                </div>
              </div>
            
            <!-- About Tab -->
            {:else if activeTab === 'about'}
              <div class="space-y-6">
                <div>
                  <div class="space-y-6">
                    <div class="bg-gray-50 dark:bg-gray-700 rounded-xl p-6">
                      <div class="flex items-center gap-4 mb-4">
                        <img src="/wiskr-logo.png" alt="Wiskr" class="h-12" />
                        <div>
                          <h5 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Wiskr</h5>
                          <p class="text-sm text-gray-500 dark:text-gray-400">AI-powered conversation manager</p>
                        </div>
                        <div class="ml-auto">
                          <span class="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded-full">v1.0.0</span>
                        </div>
                      </div>
                      <p class="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        Wiskr helps you manage AI conversations across multiple models, organize context with facts and documents, and generate ideas for your projects.
                      </p>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <h6 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Features</h6>
                        <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Multi-model conversations</li>
                          <li>• Context management</li>
                          <li>• Project organization</li>
                          <li>• Conversation branching</li>
                          <li>• Content formatting</li>
                        </ul>
                      </div>
                      
                      <div class="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                        <h6 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Support</h6>
                        <ul class="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Built with SvelteKit</li>
                          <li>• Powered by Supabase</li>
                          <li>• OpenRouter</li>
                          <li>• Real-time sync</li>
                          <li>• Mobile responsive</li>
                        </ul>
                      </div>
                    </div>
                    
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
      <div class="border-t border-gray-200 dark:border-gray-600 p-4 bg-gray-50 dark:bg-gray-800">
        <div class="flex items-center justify-between">
          {#if savingPreferences}
            <div class="flex items-center gap-2 text-sm" style="color: var(--color-accent);">
              <div class="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              Saving preferences...
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
