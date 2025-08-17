<script>
  import '../app.css';
  export let data;
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import HeaderProjectSelector from '$lib/components/HeaderProjectSelector.svelte';
  import GlobalSearch from '$lib/components/GlobalSearch.svelte';
  import MrWiskrModal from '$lib/components/MrWiskrModal.svelte';
  import { Settings, Settings2, Moon, Sun, BarChart3, LogOut } from 'lucide-svelte';
  
  // Project selector state
  let projects = [];
  let currentProject = null;
  let projectSearch = '';
  
  // Theme state
  let darkMode = false;
  
  // Apply theme when darkMode changes
  $: {
    if (browser && darkMode !== undefined) {
      applyTheme();
    }
  }
  
  // Apply accent color when it changes
  $: {
    if (browser && userPreferences.accent_color) {
      applyAccentColor(userPreferences.accent_color);
    }
  }
  
  // Initialize theme from localStorage or system preference
  onMount(() => {
    if (browser) {
      // Check localStorage first
      const savedTheme = localStorage.getItem('wiskr_theme');
      if (savedTheme) {
        darkMode = savedTheme === 'dark';
      } else {
        // Check system preference
        darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      // Apply theme
      applyTheme();
      
      // Listen for system theme changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem('wiskr_theme')) {
          darkMode = e.matches;
          applyTheme();
        }
      });
    }
  });
  
  function applyTheme() {
    if (browser) {
      if (darkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
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
      }
    }
  }
  
  function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
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
  
  function toggleTheme() {
    darkMode = !darkMode;
    localStorage.setItem('wiskr_theme', darkMode ? 'dark' : 'light');
  }
  
  // Check if we're on the projects page
  $: isProjectsPage = $page.url.pathname === '/projects';
  
  onMount(async () => {
    if (!browser) return;
    
    try {
      const { supabase } = await import('$lib/supabase.js');
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, icon, color, brief_text, created_at')
        .order('created_at');
      
      if (!error) {
        projects = data || [];
        // Try to get last selected project from localStorage
        const lastId = localStorage.getItem('wiskr_last_project_id');
        currentProject = projects.find(p => p.id === lastId) || projects[0] || null;
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
    
    // Listen for project updates
    window.addEventListener('projects:refresh', async (e) => {
      try {
        const { supabase } = await import('$lib/supabase.js');
        const { data } = await supabase
          .from('projects')
          .select('id, name, icon, color, brief_text, created_at')
          .order('created_at');
        projects = data || [];
        
        // Select the new project if one was just created
        if (e.detail?.id) {
          currentProject = projects.find(p => p.id === e.detail.id) || currentProject;
        }
      } catch (error) {
        console.error('Error refreshing projects:', error);
      }
    });
  });

  // tiny helper
  function truncateEmail(email) {
    if (!email) return '';
    const [u, d] = email.split('@');
    return (u.length > 12 ? u.slice(0, 12) + '…' : u) + '@' + d;
  }

  // NEW PROJECT modal state
  let showNew = false;
  let newName = '';
  let newIcon = '📁';
  let newColor = '#6366f1';
  let creating = false;
  let createErr = '';

  // APP SETTINGS modal state
  let showAppSettings = false;
  let userPreferences = { max_related_ideas: 8, accent_color: '#155DFC', display_name: null };
  let savingPreferences = false;
  
  // Load user preferences when modal opens
  async function loadUserPreferences() {
    if (!data?.user) return;
    
    try {
      const res = await fetch('/api/user-preferences');
      if (res.ok) {
        const prefs = await res.json();
        userPreferences = prefs;
        // Apply accent color immediately
        if (prefs.accent_color) {
          applyAccentColor(prefs.accent_color);
        }
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }
  
  // Load preferences on mount
  onMount(() => {
    loadUserPreferences();
  });
  
  // Save user preferences
  async function saveUserPreferences() {
    if (!data?.user || savingPreferences) return;
    
    savingPreferences = true;
    try {
      const res = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userPreferences)
      });
      
      if (!res.ok) {
        console.error('Failed to save preferences:', await res.text());
        alert('Failed to save preferences. Please try again.');
      } else {
        // Dispatch event to notify other components of preference updates
        window.dispatchEvent(new CustomEvent('user-preferences-updated', { 
          detail: userPreferences 
        }));
      }
    } catch (error) {
      console.error('Error saving user preferences:', error);
      alert('Failed to save preferences. Please try again.');
    } finally {
      savingPreferences = false;
    }
  }
  
  // Handle accent color change
  function handleAccentColorChange() {
    applyAccentColor(userPreferences.accent_color);
    saveUserPreferences();
  }
  
  // Handle opening settings modal
  function openAppSettings() {
    showAppSettings = true;
    loadUserPreferences();
  }
  async function createProject() {
    if (!newName.trim()) { createErr = 'Please enter a name.'; return; }
    createErr = '';
    creating = true;
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          icon: newIcon,
          color: newColor
        })
      });

      if (!res.ok) {
        const raw = await res.text();
        console.error('Create project failed:', raw);
        // Try to extract a short message
        let msg = '';
        try { msg = (JSON.parse(raw).message) || raw; } catch { msg = raw; }
        // Strip tags and truncate
        msg = msg.replace(/<[^>]+>/g, '').slice(0, 200);
        createErr = msg || 'Failed to create project';
        creating = false;
        return;
      }

      const { project } = await res.json();
      showNew = false;                 // close modal
      newName = ''; createErr = '';

      window.dispatchEvent(new CustomEvent('projects:refresh', { detail: { id: project.id } }));

      
      await goto(`/projects`, { replaceState: true });


    } catch (e) {
      createErr = e.message || 'Failed to create project';
      creating = false;
    }
  }
</script>

<!-- App shell: full height -->
<div class="flex flex-col min-h-screen bg-zinc-50 dark:bg-gray-900 text-zinc-900 dark:text-gray-100 transition-colors">

  <!-- Header -->
  <header class="h-16 border-b border-gray-200 dark:border-gray-700 backdrop-blur flex items-center relative z-50 transition-colors" style="background-color: var(--bg-header);">
    <div class="w-full px-6 flex items-center gap-4 relative">
      <!-- Left: brand and project selector -->
      <div class="flex items-center gap-4 flex-shrink-0">
        <a href="/projects" class="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100 transition-colors">
          <span class="text-2xl"><span style="color: #5d60dd">&gt;&gt;</span> Mr. Wiskr <span style="color: #5d60dd">&lt;&lt;</span></span>
          <!-- <span class="text-xs text-zinc-500">Projects</span> -->
        </a>
        {#if isProjectsPage}
          <div class="flex items-center gap-2">
            <div class="max-w-sm">
              <HeaderProjectSelector 
                {projects}
                current={currentProject}
                bind:search={projectSearch}
                on:select={(e) => {
                  currentProject = e.detail;
                  if (browser) {
                    localStorage.setItem('wiskr_last_project_id', e.detail.id);
                    // Dispatch event to notify the projects page
                    window.dispatchEvent(new CustomEvent('project:selected', { detail: e.detail }));
                  }
                }}
                on:create={() => showNew = true}
                on:delete={async (e) => {
                  const project = e.detail;
                  if (projects.length <= 1) { alert('Create another project before deleting this one.'); return; }
                  if (!confirm(`Delete "${project.name}"? This can\'t be undone.`)) return;
                  
                  try {
                    const res = await fetch(`/api/projects/${project.id}/delete`, { method: 'POST' });
                    if (res.ok) {
                      // Refresh projects list
                      window.dispatchEvent(new CustomEvent('projects:refresh'));
                    } else {
                      alert('Delete failed.');
                    }
                  } catch (error) {
                    alert('Delete failed.');
                  }
                }}
              />
            </div>
            <!-- Settings button for current project -->
            {#if currentProject}
              <button
                class="flex items-center justify-center w-8 h-8 rounded-lg border text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
                style="background-color: var(--bg-input); border-color: var(--border-input);"
                title="Project Settings: {currentProject.name}"
                on:click={() => {
                  // Dispatch event that the projects page can listen to
                  window.dispatchEvent(new CustomEvent('project:open-settings', { detail: currentProject }));
                }}
              >
                <Settings2 size="20" />
              </button>
            {/if}
          </div>
        {/if}
      </div>

      <!-- Center: Global Search - Absolutely positioned to center above chat -->
      {#if isProjectsPage}
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4 pointer-events-auto z-10">
          <GlobalSearch 
            projectId={currentProject?.id}
            on:activate-tab={(e) => {
              // Dispatch event for the projects page to handle tab activation
              window.dispatchEvent(new CustomEvent('search:activate-tab', { detail: e.detail }));
            }}
            on:filter={(e) => {
              // Dispatch event for the projects page to handle filtering
              window.dispatchEvent(new CustomEvent('search:filter', { detail: e.detail }));
            }}
            on:navigate-chat={(e) => {
              // Dispatch event for the projects page to handle chat navigation
              window.dispatchEvent(new CustomEvent('search:navigate-chat', { detail: e.detail }));
            }}
            on:clear={(e) => {
              // Dispatch event for the projects page to handle clearing
              window.dispatchEvent(new CustomEvent('search:clear', { detail: e.detail }));
            }}
          />
        </div>
      {/if}

      <!-- Right: usage and user -->
      <div class="flex items-center gap-6 flex-shrink-0 ml-auto">
        {#if isProjectsPage}
          
          <!-- Usage link (only on projects page) -->
          <button 
            type="button"
            class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors" 
            on:click={() => {
              // Dispatch event for the projects page to handle usage toggle
              window.dispatchEvent(new CustomEvent('usage:toggle'));
            }}
          >
            <BarChart3 size="16" />
            <span>Usage</span>
          </button>
        {/if}
        
        <!-- App/Account Settings -->
        <button 
          type="button"
          class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          title="Settings"
          on:click={openAppSettings}
        >
          <Settings size="16" />
          <span>Settings</span>
        </button>
        
        {#if data?.user}
          <a href="/logout" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
            <LogOut size="16" />
            <span>Logout</span>
          </a>
        {:else}
          <a href="/login" class="text-sm underline text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Login</a>
          <a href="/signup" class="text-sm underline text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">Sign Up</a>
        {/if}
      </div>
    </div>
  </header>

  <!-- Page content fills the rest -->
  <main class="flex-1 min-h-0">
    <slot />
  </main>


  <!-- NEW PROJECT MODAL -->
  {#if showNew}
    <div class="fixed inset-0 backdrop-blur-sm bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl w-[90vw] max-w-md p-4" style="background-color: var(--bg-modal, white);">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100">Create Project</h3>
          <button class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200" on:click={() => !creating && (showNew = false)}>✕</button>
        </div>

        <div class="grid gap-2">
          <label class="text-xs text-zinc-600 dark:text-zinc-400" for="newName">Name</label>
          <input class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-2" name="newName" placeholder="e.g., BEDNOMANCER 2" bind:value={newName} />

          <div class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label class="text-xs text-zinc-600 dark:text-zinc-400" for="newIcon">Icon (emoji)</label>
              <input class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded p-2" name="newIcon" bind:value={newIcon} />
            </div>
            <div>
              <label class="text-xs text-zinc-600 dark:text-zinc-400" for="newColor">Color</label>
              <input class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded p-2" type="color" name="newColor" bind:value={newColor} />
            </div>
          </div>

          {#if createErr}
            <div class="text-xs text-red-600 dark:text-red-400 mt-1">{createErr}</div>
          {/if}

          <div class="flex items-center justify-end gap-2 mt-3">
            <button class="text-sm px-3 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded" style="background-color: var(--bg-button-secondary);" on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)'} on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary)'} on:click={() => !creating && (showNew = false)}>Cancel</button>
            <button class="text-sm px-3 py-1 border rounded text-white disabled:opacity-50 transition-colors" 
              style="background-color: var(--color-accent);" 
              on:mouseenter={(e) => !creating && (e.target.style.backgroundColor = 'var(--color-accent-hover)')}
              on:mouseleave={(e) => !creating && (e.target.style.backgroundColor = 'var(--color-accent)')}
              on:click={createProject} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- APP SETTINGS MODAL -->
  {#if showAppSettings}
    <div class="fixed inset-0 backdrop-blur-sm bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl w-[90vw] max-w-lg p-6" style="background-color: var(--bg-modal, white);">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Account Settings</h3>
          <button 
            class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
            on:click={() => showAppSettings = false}
          >
            ✕
          </button>
        </div>

        <div class="space-y-6">
          <!-- Account Section -->
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Account</h4>
            <div class="space-y-3">
              {#if data?.user}
                <div class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100">{data.user.email}</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">Logged in</div>
                  </div>
                  <a 
                    href="/logout" 
                    class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium"
                    on:click={() => showAppSettings = false}
                  >
                    Logout
                  </a>
                </div>
              {:else}
                <div class="text-center py-4">
                  <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">Not logged in</p>
                  <div class="flex gap-2 justify-center">
                    <a href="/login" 
                       class="text-sm text-white px-4 py-2 rounded transition-colors" 
                       style="background-color: var(--color-accent);" 
                       on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
                       on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
                    >Login</a>
                    <a href="/signup" class="text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded transition-colors" 
                    style="background-color: var(--bg-button-secondary);" 
                    on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)'} 
                    on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary)'}>Sign Up</a>
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Preferences Section -->
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Preferences</h4>
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Theme</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Choose your preferred theme</div>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" 
                    style={!darkMode ? 'background-color: var(--color-accent-light); border-color: var(--color-accent-border);' : ''}
                    title="Light mode"
                    on:click={() => {
                      darkMode = false;
                      localStorage.setItem('wiskr_theme', 'light');
                      applyTheme();
                    }}
                  >
                    <Sun size="16" class={!darkMode ? '' : 'text-gray-500 dark:text-gray-400'} style={!darkMode ? 'color: var(--color-accent);' : ''} />
                  </button>
                  <button
                    class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors" 
                    style={darkMode ? 'background-color: var(--color-accent-light); border-color: var(--color-accent-border);' : ''}
                    title="Dark mode"
                    on:click={() => {
                      darkMode = true;
                      localStorage.setItem('wiskr_theme', 'dark');
                      applyTheme();
                    }}
                  >
                    <Moon size="16" class={darkMode ? '' : 'text-gray-500 dark:text-gray-400'} style={darkMode ? 'color: var(--color-accent);' : ''} />
                  </button>
                </div>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Display Name</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Your name in chat messages</div>
                </div>
                <div class="flex items-center gap-2">
                  <input 
                    type="text" 
                    maxlength="50" 
                    placeholder="Your name (e.g., Sym)"
                    bind:value={userPreferences.display_name}
                    on:change={saveUserPreferences}
                    class="w-32 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);"
                  />
                  {#if savingPreferences}
                    <span class="text-xs" style="color: var(--color-accent);">Saving...</span>
                  {/if}
                </div>
              </div>
              
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
                    on:change={saveUserPreferences}
                    class="w-16 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded focus:outline-none focus:ring-2" style="--tw-ring-color: var(--color-accent);"
                  />
                  {#if savingPreferences}
                    <span class="text-xs" style="color: var(--color-accent);">Saving...</span>
                  {/if}
                </div>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Accent Color</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Choose your preferred accent color</div>
                </div>
                <div class="flex items-center gap-2">
                  <input 
                    type="color" 
                    bind:value={userPreferences.accent_color}
                    on:change={handleAccentColorChange}
                    class="w-12 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                    title="Choose accent color"
                  />
                  <div 
                    class="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-mono text-gray-600 dark:text-gray-400"
                    style="background-color: {userPreferences.accent_color}; color: {userPreferences.accent_color === '#FFFFFF' || userPreferences.accent_color === '#ffffff' ? '#000' : '#fff'}"
                  >
                    ✓
                  </div>
                </div>
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-gray-100">Notifications</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">Enable browser notifications</div>
                </div>
                <input type="checkbox" class="rounded" checked />
              </div>
            </div>
          </div>

          <!-- About Section -->
          <div>
            <h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">About</h4>
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Mr. Wiskr</span>
                <span class="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">v1.0.0</span>
              </div>
              <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">
                AI-powered project knowledge management and chat interface.
              </p>
              <div class="flex gap-3 text-xs">
                <a href="#" 
                   class="transition-colors" 
                   style="color: var(--color-accent);" 
                   on:mouseenter={(e) => e.target.style.color = 'var(--color-accent-hover)'}
                   on:mouseleave={(e) => e.target.style.color = 'var(--color-accent)'}
                >Documentation</a>
                <a href="#" 
                   class="transition-colors" 
                   style="color: var(--color-accent);" 
                   on:mouseenter={(e) => e.target.style.color = 'var(--color-accent-hover)'}
                   on:mouseleave={(e) => e.target.style.color = 'var(--color-accent)'}
                >Support</a>
                <a href="#" 
                   class="transition-colors" 
                   style="color: var(--color-accent);" 
                   on:mouseenter={(e) => e.target.style.color = 'var(--color-accent-hover)'}
                   on:mouseleave={(e) => e.target.style.color = 'var(--color-accent)'}
                >Privacy</a>
              </div>
            </div>
          </div>
        </div>

        <!-- Close button -->
        <div class="flex justify-end mt-6">
          <button 
            class="px-4 py-2 text-white text-sm rounded-lg transition-colors" 
            style="background-color: var(--color-accent);" 
            on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
            on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
            on:click={() => showAppSettings = false}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
