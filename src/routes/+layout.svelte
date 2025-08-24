<script>
  import { goto, beforeNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
import { Settings, BarChart3, LogOut, Settings2, Sun, Moon, Palette, ChevronsLeft, ChevronsRight, Boxes, GitBranch } from 'lucide-svelte';
import HeaderProjectSelector from '$lib/components/HeaderProjectSelector.svelte';
  import ContextQualityIndicator from '$lib/components/ContextQualityIndicator.svelte';
  import GlobalSearch from '$lib/components/GlobalSearch.svelte';
  import NewProjectModal from '$lib/components/NewProjectModal.svelte';
  import ProjectExport from '$lib/components/ProjectExport.svelte';
  import AvatarSelector from '$lib/components/AvatarSelector.svelte';
  import { initAnalytics, trackPageView, trackProjectNavigation, identifyUser, resetUser, ANALYTICS_EVENTS, trackEvent } from '$lib/analytics.js';
  import '../app.css';
  import '$lib/components/styles.css';
  
  export let data;
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
      // Check current state (HTML script may have already applied theme)
      const isDark = document.documentElement.classList.contains('dark');
      const savedTheme = localStorage.getItem('wiskr_theme');
      
      if (savedTheme) {
        darkMode = savedTheme === 'dark';
      } else {
        // Use detected state or check system preference
        darkMode = isDark || window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      
      // Ensure theme is applied (in case HTML script didn't run)
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
  
  // Track page views
  $: if (browser && $page.url.pathname) {
    trackPageView($page.url.pathname);
  }
  
  // Track user authentication state
  $: if (browser && data?.user) {
    identifyUser(data.user.id, {
      email: data.user.email,
      created_at: data.user.created_at
    });
  } else if (browser && !data?.user) {
    // Reset user identity when logged out
    resetUser();
  }
  
  onMount(async () => {
    if (!browser) return;
    
    // Initialize PostHog analytics
    initAnalytics();
    
    // IMPORTANT: Don't load projects directly in layout - this bypasses RLS!
    // Projects should be loaded by the page server-side with proper auth context
    // The layout will get project data from page events instead
    
    // Try to get last selected project from localStorage (will be validated later)
    const lastId = localStorage.getItem('wiskr_last_project_id');
    console.log('🎯 Layout: Found cached project ID:', lastId);
    
    // Listen for projects data from the projects page
    window.addEventListener('layout:update-projects', (e) => {
      const { projects: pageProjects, currentProjectId } = e.detail;
      console.log('🎯 Layout: Received projects from page:', pageProjects.length, 'projects');
      
      projects = pageProjects || [];
      
      // Update current project based on page selection
      if (currentProjectId) {
        const foundProject = projects.find(p => p.id === currentProjectId);
        if (foundProject) {
          currentProject = foundProject;
          console.log('🎯 Layout: Updated current project to:', foundProject.name);
          // Load context quality score for the new project
          loadContextQualityScore(foundProject.id);
        }
      }
    });
    
    // Listen for project updates
    window.addEventListener('projects:refresh', async (e) => {
      try {
        const { supabase } = await import('$lib/supabase.js');
        const { data } = await supabase
          .from('projects')
          .select('id, name, icon, color, brief_text, description, created_at')
          .order('created_at');
        projects = data || [];
        
        // Select the new project if one was just created
        if (e.detail?.id) {
          const newProject = projects.find(p => p.id === e.detail.id);
          if (newProject) {
            currentProject = newProject;
            // Track navigation to newly created project
            trackProjectNavigation(newProject.id, newProject.name);
          }
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
  let showNewProjectModal = false;
  let newProjectName = '';
  let newProjectDescription = '';
  let creatingProject = false;
  let createProjectErr = '';

  // APP SETTINGS modal state
  let showAppSettings = false;
  let userPreferences = { max_related_ideas: 8, accent_color: '#155DFC', display_name: null, avatar_type: 'default', avatar_value: null };
  let savingPreferences = false;
  
  // PROJECT EXPORT modal state
  let showProjectExport = false;
  let exportingProject = null;
  
  // Mobile menu state
  let showProjectMenu = false;
  let showMobileMenu = false;
  let showContextMenu = false;
  let showAddInsMenu = false;
  
  // Responsive state
  let isDesktop = false;
  
  // Context quality state
  let contextQualityScore = 0;
  let loadingContextScore = false;
  
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
  
  // Responsive screen detection for layout
  function checkScreenSize() {
    if (browser) {
      isDesktop = window.innerWidth >= 1280; // Custom breakpoint for mobile mode
    }
  }
  
  // Load preferences on mount
  onMount(() => {
    loadUserPreferences();
    
    // Setup responsive detection
    if (browser) {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);
    }
  });
  
  onDestroy(() => {
    if (browser) {
      window.removeEventListener('resize', checkScreenSize);
    }
  });
  
  // Track page leave events
  beforeNavigate(({ from, to, cancel }) => {
    if (browser && from) {
      console.log('Leaving page:', from.url.pathname);
      
      // Track the page leave event
      trackEvent(ANALYTICS_EVENTS.PAGE_LEAVE, {
        from_path: from.url.pathname,
        to_path: to?.url.pathname || 'external',
        time_on_page: document.visibilityState === 'visible' ? (Date.now() - window.performance.timing.navigationStart) / 1000 : undefined
      });
    }
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
  
  // Handle opening export modal
  function openProjectExport(project) {
    console.log('📤 Opening export modal for project:', project?.name, project?.id);
    exportingProject = project;
    showProjectExport = true;
  }
  async function createProject() {
    if (!newProjectName.trim()) { createProjectErr = 'Please enter a name.'; return; }
    createProjectErr = '';
    creatingProject = true;
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim()
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
        createProjectErr = msg || 'Failed to create project';
        creatingProject = false;
        return;
      }

      const { project } = await res.json();
      
      // Track project creation
      trackEvent(ANALYTICS_EVENTS.PROJECT_CREATED, {
        project_id: project.id,
        project_name: project.name,
        has_description: !!project.description?.trim()
      });
      
      showNewProjectModal = false;                 // close modal
      newProjectName = ''; newProjectDescription = ''; createProjectErr = '';

      window.dispatchEvent(new CustomEvent('projects:refresh', { detail: { id: project.id } }));
      await goto(`/projects`, { replaceState: true });

    } catch (e) {
      createProjectErr = e.message || 'Failed to create project';
      creatingProject = false;
    }
  }

  function handleNewProjectModalClose() {
    showNewProjectModal = false;
    newProjectName = '';
    newProjectDescription = '';
    createProjectErr = '';
  }

  function handleCreateProject(event) {
    const { name, description } = event.detail;
    newProjectName = name;
    newProjectDescription = description || '';
    createProject();
  }
  
  // Context quality functions
  async function loadContextQualityScore(projectId) {
    if (!projectId || !browser) return;
    
    loadingContextScore = true;
    try {
      // Import and initialize the context score store
      const { initContextScoreTracking, contextScore, contextScoreLoading } = await import('$lib/stores/contextScore.js');
      
      // Initialize tracking for this project (includes automatic event listeners)
      initContextScoreTracking(projectId);
      
      // Subscribe to store updates
      const unsubscribeScore = contextScore.subscribe(score => {
        contextQualityScore = score;
      });
      
      const unsubscribeLoading = contextScoreLoading.subscribe(loading => {
        loadingContextScore = loading;
      });
      
      // Store unsubscribe functions for cleanup
      if (!window.contextScoreUnsubscribes) {
        window.contextScoreUnsubscribes = [];
      }
      window.contextScoreUnsubscribes.push(unsubscribeScore, unsubscribeLoading);
      
    } catch (error) {
      console.error('Failed to initialize context quality score tracking:', error);
      loadingContextScore = false;
    }
  }
</script>

<!-- App shell: full height -->
<div class="flex flex-col min-h-screen bg-zinc-50 dark:bg-gray-900 text-zinc-900 dark:text-gray-100 transition-colors">

  <!-- Header -->
  <header class="h-16 border-b border-gray-200 dark:border-gray-700 backdrop-blur flex items-center relative z-50 transition-colors" style="background-color: var(--bg-header);">
    <div class="w-full px-3 md:px-6 flex items-center justify-between gap-2 md:gap-4 relative">
      <!-- Left: Wiskr Brand + Desktop Project Controls -->
      <div class="flex items-center gap-6">
        <!-- Desktop: Mr Wiskr brand -->
        <a href="/projects" class="{isDesktop ? 'flex' : 'hidden'} flex-shrink-0 items-center font-semibold text-gray-900 dark:text-gray-100 transition-colors">
          <span class="text-lg {isDesktop ? 'text-xl' : ''} inline-flex items-center">
            <img src="/wiskr-logo.png" alt="Wiskr" class="w-32 py-2 px-2 mb-0" />
            <!-- <ChevronsRight className="inline-block align-middle" size={18} style="color: white;" />
            <span style="color: #5d60dd">Mr Wiskr</span>
            <ChevronsLeft className="inline-block align-middle" size={18} style="color: white;" /> -->
          </span>
        </a>
        <!-- Mobile: Wiskr brand -->
        <a href="/projects" class="{isDesktop ? 'hidden' : 'flex'} flex-shrink-0 flex items-center font-semibold text-gray-900 dark:text-gray-100 transition-colors">
          <span class="text-lg inline-flex items-center">
            <ChevronsRight className="inline-block align-middle" size={18} style="color: white;" />
            <span style="color: #5d60dd" class="hidden xs:inline">Mr Wiskr</span>
            <span style="color: #5d60dd" class="xs:hidden">Wiskr</span>
            <ChevronsLeft className="inline-block align-middle" size={18} style="color: white;" />
          </span>
        </a>
        
        <!-- Desktop: Project controls (moved from right side) -->
        {#if isProjectsPage}
          <div class="{isDesktop ? 'flex' : 'hidden'} items-center gap-6">
            <HeaderProjectSelector 
              {projects}
              current={currentProject}
              bind:search={projectSearch}
              isMobile={false}
              on:select={(e) => {
                const previousProject = currentProject;
                currentProject = e.detail;
                if (browser) {
                  localStorage.setItem('wiskr_last_project_id', e.detail.id);
                  trackEvent(ANALYTICS_EVENTS.PROJECT_SELECTED, { project_id: e.detail.id, project_name: e.detail.name, previous_project_id: previousProject?.id, previous_project_name: previousProject?.name });
                  trackProjectNavigation(e.detail.id, e.detail.name);
                  window.dispatchEvent(new CustomEvent('project:selected', { detail: e.detail }));
                  loadContextQualityScore(e.detail.id);
                }
              }}
              on:create={() => { showNewProjectModal = true; }}
              on:open-settings={(e) => { window.dispatchEvent(new CustomEvent('project:open-settings', { detail: e.detail })); }}
              on:export={(e) => {
                console.log('📤 Export event received in layout (desktop):', e.detail?.name);
                openProjectExport(e.detail);
              }}
              on:delete={async (e) => {
                const project = e.detail;
                if (projects.length <= 1) { alert('Create another project before deleting this one.'); return; }
                if (!confirm(`Delete \"{project.name}\"? This can't be undone.`)) return;
                try {
                  const res = await fetch(`/api/projects/${project.id}/delete`, { method: 'POST' });
                  if (res.ok) {
                    window.dispatchEvent(new CustomEvent('projects:refresh'));
                  } else {
                    alert('Delete failed.');
                  }
                } catch (error) {
                  alert('Delete failed.');
                }
              }}
            />
            {#if currentProject?.id}
              <ContextQualityIndicator 
                score={contextQualityScore}
                loading={loadingContextScore}
                projectId={currentProject.id}
                on:open-dashboard={() => { goto(`/context-dashboard?projectId=${currentProject.id}`); }}
                on:open-settings={() => { window.dispatchEvent(new CustomEvent('project:open-settings', { detail: currentProject })); }}
                on:navigate-facts={() => { window.dispatchEvent(new CustomEvent('sidebar:switch-tab', { detail: 'facts' })); }}
                on:generate-entities={() => {
                  window.dispatchEvent(new CustomEvent('sidebar:switch-tab', { detail: 'entities' }));
                  window.dispatchEvent(new CustomEvent('entities:generate', { detail: currentProject }));
                }}
              />
            {/if}
          </div>
        {/if}
      </div>
      
      <!-- Spacer -->
      <div class="flex-1"></div>

      <!-- Right side: Menus and controls -->
      <div class="flex items-center gap-2 md:gap-4 flex-shrink-0">
        {#if isProjectsPage}
          <!-- Desktop: Global Search and Usage -->
          <div class="{isDesktop ? 'flex' : 'hidden'} items-center gap-4">
            <GlobalSearch 
              projectId={currentProject?.id}
              on:activate-tab={(e) => {
                window.dispatchEvent(new CustomEvent('search:activate-tab', { detail: e.detail }));
              }}
              on:filter={(e) => {
                window.dispatchEvent(new CustomEvent('search:filter', { detail: e.detail }));
              }}
              on:navigate-chat={(e) => {
                window.dispatchEvent(new CustomEvent('search:navigate-chat', { detail: e.detail }));
              }}
              on:clear={(e) => {
                window.dispatchEvent(new CustomEvent('search:clear', { detail: e.detail }));
              }}
            />
            
            <!-- Usage Stats Button -->
            <button
              type="button"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              title="Usage Stats"
              on:click={() => { window.dispatchEvent(new CustomEvent('usage:toggle')); }}
            >
              <BarChart3 size="16" />
              <span>Usage</span>
            </button>
          </div>

          <!-- Mobile: Menu buttons -->
          <div class="{isDesktop ? 'hidden' : 'flex'} items-center gap-1">
            <!-- Project Menu Button -->
            <button
              type="button"
              class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              on:click={() => showProjectMenu = !showProjectMenu}
              aria-label="Projects and Tools"
            >
              <Boxes class="w-6 h-6" />
              <span class="text-xs mt-1">Projects</span>
            </button>
            <!-- Context button -->
            <button
              type="button"
              class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              on:click={() => window.dispatchEvent(new CustomEvent('mobile:toggle-context'))}
              aria-label="Toggle Context Panel"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span class="text-xs mt-1">Context</span>
            </button>
            <!-- Add-Ins button -->
            <button
              type="button"
              class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              on:click={() => window.dispatchEvent(new CustomEvent('mobile:toggle-addins'))}
              aria-label="Toggle Add-Ins Panel"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <span class="text-xs mt-1">Add-Ins</span>
            </button>
          </div>
        {/if}

        <!-- Desktop navigation (>= 1200px) -->
        <div class="hidden xl:flex items-center gap-6">
          {#if data?.user}
             <!-- App/Account Settings -->
            <button 
              type="button"
              class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              title="Settings"
              on:click={openAppSettings}
            >
              <Settings size="16" />
              <span>Settings</span>
            </button>
            
            <!-- Logout -->
            <a href="/logout" class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors">
              <LogOut size="16" />
              <span>Logout</span>
            </a>
          {:else}
            <a href="/login" class="text-sm underline text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors">Login</a>
            <a href="/signup" class="text-sm underline text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors">Sign Up</a>
          {/if}
        </div>
        
        <!-- Mobile hamburger menu -->
        <div class="{isDesktop ? 'hidden' : 'block'} relative">
          <button
            type="button"
            class="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
            on:click={() => showMobileMenu = !showMobileMenu}
            aria-label="Menu"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          
          <!-- Mobile menu dropdown -->
          {#if showMobileMenu}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div 
              class="fixed inset-0 z-50" 
              on:click={() => showMobileMenu = false}
            >
              <div class="absolute top-16 right-6 bg-white border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl min-w-48 py-2" style="background-color: var(--bg-primary);">
                {#if isProjectsPage}
                  <!-- Sidebar Panel Toggles removed - now handled by dedicated Context/Add-Ins buttons -->
                  <button 
                    type="button"
                    class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" 
                    on:click={() => {
                      window.dispatchEvent(new CustomEvent('usage:toggle'));
                      showMobileMenu = false;
                    }}
                  >
                    <BarChart3 size="16" />
                    <span>Usage</span>
                  </button>
                  <a 
                    href="/context-dashboard{currentProject?.id ? `?projectId=${currentProject.id}` : ''}"
                    class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    on:click={() => showMobileMenu = false}
                  >
                    <Settings2 size="16" />
                    <span>Context Dashboard</span>
                  </a>
                {/if}
                
                {#if data?.user}
                  <button 
                    type="button"
                    class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    on:click={() => {
                      openAppSettings();
                      showMobileMenu = false;
                    }}
                  >
                    <Settings size="16" />
                    <span>Settings</span>
                  </button>
                  
                  <a 
                    href="/logout" 
                    class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    on:click={() => showMobileMenu = false}
                  >
                    <LogOut size="16" />
                    <span>Logout</span>
                  </a>
                {:else}
                  <a 
                    href="/login" 
                    class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    on:click={() => showMobileMenu = false}
                  >
                    Login
                  </a>
                  <a 
                    href="/signup" 
                    class="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    on:click={() => showMobileMenu = false}
                  >
                    Sign Up
                  </a>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </header>

  <!-- Project Menu Drawer -->
  {#if showProjectMenu}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="fixed inset-0 z-50" 
      on:click={(e) => {
        // Only close if clicking on the backdrop itself, not on dropdown content
        if (e.target === e.currentTarget) {
          showProjectMenu = false;
        }
      }}
    >
      <div class="absolute top-16 left-6 bg-white border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl w-80 max-w-[90vw] py-4" style="background-color: var(--bg-primary);">
        <!-- Header -->
        <div class="px-4 pb-3 border-b border-gray-200 dark:border-gray-600">
          <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Projects</h3>
        </div>
        
        <!-- Project Selector Section -->
        <div class="px-4 pt-4 pb-4">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Current Project</h4>
          <div class="space-y-3">
            <HeaderProjectSelector 
              {projects}
              current={currentProject}
              bind:search={projectSearch}
              isMobile={!isDesktop}
              on:select={(e) => {
                const previousProject = currentProject;
                currentProject = e.detail;
                if (browser) {
                  localStorage.setItem('wiskr_last_project_id', e.detail.id);
                  // Track project selection
                  trackEvent(ANALYTICS_EVENTS.PROJECT_SELECTED, {
                    project_id: e.detail.id,
                    project_name: e.detail.name,
                    previous_project_id: previousProject?.id,
                    previous_project_name: previousProject?.name
                  });
                  // Track project navigation as a virtual page view
                  trackProjectNavigation(e.detail.id, e.detail.name);
                  // Dispatch event to notify the projects page
                  window.dispatchEvent(new CustomEvent('project:selected', { detail: e.detail }));
                  // Load context quality score for the selected project
                  loadContextQualityScore(e.detail.id);
                }
                // Don't close project menu immediately - let user keep browsing projects
                // showProjectMenu = false;
              }}
              on:create={() => {
                showNewProjectModal = true;
                showProjectMenu = false;
              }}
              on:open-settings={(e) => {
                window.dispatchEvent(new CustomEvent('project:open-settings', { detail: e.detail }));
                showProjectMenu = false;
              }}
              on:export={(e) => {
                console.log('📤 Export event received in layout:', e.detail?.name);
                openProjectExport(e.detail);
                showProjectMenu = false;
              }}
              on:delete={async (e) => {
                const project = e.detail;
                if (projects.length <= 1) { alert('Create another project before deleting this one.'); return; }
                if (!confirm(`Delete "${project.name}"? This can't be undone.`)) return;
                
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
                showProjectMenu = false;
              }}
            />
          </div>
        </div>
        
        <!-- Context Quality Section -->
        {#if currentProject?.id}
          <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-600">
            <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wide">Context Quality</h4>
            <ContextQualityIndicator 
              score={contextQualityScore}
              loading={loadingContextScore}
              projectId={currentProject.id}
              isMobile={!isDesktop}
              on:open-dashboard={() => {
                goto(`/context-dashboard?projectId=${currentProject.id}`);
                showProjectMenu = false;
              }}
              on:open-settings={() => {
                window.dispatchEvent(new CustomEvent('project:open-settings', { detail: currentProject }));
                showProjectMenu = false;
              }}
              on:navigate-facts={() => {
                window.dispatchEvent(new CustomEvent('sidebar:switch-tab', { detail: 'facts' }));
                showProjectMenu = false;
              }}
              on:generate-entities={() => {
                window.dispatchEvent(new CustomEvent('sidebar:switch-tab', { detail: 'entities' }));
                window.dispatchEvent(new CustomEvent('entities:generate', { detail: currentProject }));
                showProjectMenu = false;
              }}
            />
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Page content fills the rest -->
  <main class="flex-1 min-h-0">
    <slot />
  </main>


  <!-- NEW PROJECT MODAL -->
  <NewProjectModal
    {showNewProjectModal}
    {newProjectName}
    {creatingProject}
    {createProjectErr}
    on:close={handleNewProjectModalClose}
    on:create={handleCreateProject}
  />

  <!-- PROJECT EXPORT MODAL -->
  <ProjectExport 
    project={exportingProject}
    isOpen={showProjectExport}
    on:close={() => {
      showProjectExport = false;
      exportingProject = null;
    }}
  />

  <!-- APP SETTINGS MODAL -->
  {#if showAppSettings}
    <div class="fixed inset-0 backdrop-blur-sm /50 dark:/70 flex items-center justify-center z-50">
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
                    class="p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:white transition-colors" 
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
              
              <!-- Avatar Section -->
              <div class="border-t border-gray-200 dark:border-gray-600 pt-3">
                <AvatarSelector
                  currentAvatarType={userPreferences.avatar_type}
                  currentAvatarValue={userPreferences.avatar_value}
                  saving={savingPreferences}
                  on:change={(e) => {
                    userPreferences.avatar_type = e.detail.type;
                    userPreferences.avatar_value = e.detail.value;
                    saveUserPreferences();
                  }}
                />
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
              <div class="flex gap-3 text-xs">
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
