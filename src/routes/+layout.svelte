<script>
  import { goto, beforeNavigate } from '$app/navigation';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
import { Settings, BarChart3, LogOut, ChevronsLeft, ChevronsRight, Boxes, Plus } from 'lucide-svelte';
import HeaderProjectSelector from '$lib/components/HeaderProjectSelector.svelte';
  import ContextQualityIndicator from '$lib/components/ContextQualityIndicator.svelte';
  import GlobalSearch from '$lib/components/GlobalSearch.svelte';
  import NewProjectModal from '$lib/components/modals/NewProjectModal.svelte';
  import ProjectExport from '$lib/components/ProjectExport.svelte';
import AppSettingsModal from '$lib/components/modals/AppSettingsModal.svelte';
import SayLessModal from '$lib/components/modals/SayLessModal.svelte';
  import { isOnline, connectionStatus } from '$lib/stores/networkStore.js';
  import { initAnalytics, trackPageView, trackProjectNavigation, identifyUser, resetUser, ANALYTICS_EVENTS, trackEvent } from '$lib/analytics.js';
  import { initTutorial, shouldShowTutorial } from '$lib/stores/tutorial.js';
  import TutorialOverlay from '$lib/components/TutorialOverlay.svelte';
  import ToastNotification from '$lib/components/ToastNotification.svelte';
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
        
        // Set contrasting text color for accent elements
        document.documentElement.style.setProperty('--color-accent-text', getContrastColor(color));
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
  
  // Check if we should show the logo (authenticated pages + public pages)
  $: shouldShowLogo = isProjectsPage || 
    $page.url.pathname.startsWith('/admin') ||
    $page.url.pathname.startsWith('/context-dashboard') ||
    $page.url.pathname.startsWith('/debug-context') ||
    $page.url.pathname.startsWith('/shared') ||
    $page.url.pathname === '/login' ||
    $page.url.pathname === '/signup' ||
    $page.url.pathname === '/legal' ||
    $page.url.pathname === '/support' ||
    $page.url.pathname === '/privacy' ||
    $page.url.pathname === '/terms' ||
    $page.url.pathname === '/plans';
  
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
    
    // PWA functionality removed for simplicity
    
    // Initialize tutorial system
    if (shouldShowTutorial($page.url.pathname)) {
      setTimeout(() => {
        initTutorial();
      }, 2000); // Wait for app to fully load
    }
    
    // Listen for panel state changes to update chevron icons
    window.addEventListener('sidebar:left-panel-changed', (e) => {
      showLeftPanel = e.detail.visible;
    });
    
    window.addEventListener('sidebar:right-panel-changed', (e) => {
      showRightPanel = e.detail.visible;
    });
    
    // Listen for panel state changes from PanelManager
    window.addEventListener('panel-state-changed', (e) => {
      if (e.detail && typeof e.detail.showLeftPanel === 'boolean') {
        showLeftPanel = e.detail.showLeftPanel;
      }
      if (e.detail && typeof e.detail.showRightPanel === 'boolean') {
        showRightPanel = e.detail.showRightPanel;
      }
    });
    
    // IMPORTANT: Don't load projects directly in layout - this bypasses RLS!
    // Projects should be loaded by the page server-side with proper auth context
    // The layout will get project data from page events instead
    
    // Try to get last selected project from localStorage (will be validated later)
    const lastId = localStorage.getItem('wiskr_last_project_id');
    // console.log('🎯 Layout: Found cached project ID:', lastId);
    
    // Listen for projects data from the projects page
    window.addEventListener('layout:update-projects', (e) => {
      const { projects: pageProjects, currentProjectId } = e.detail;
      // console.log('🎯 Layout: Received projects from page:', pageProjects.length, 'projects');
      
      projects = pageProjects || [];
      
      // Update current project based on page selection
      if (currentProjectId) {
        const foundProject = projects.find(p => p.id === currentProjectId);
        if (foundProject) {
          currentProject = foundProject;
          // console.log('🎯 Layout: Updated current project to:', foundProject.name);
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
    
    // Listen for mobile project menu toggle
    window.addEventListener('layout:toggle-project-menu', () => {
      showProjectMenu = !showProjectMenu;
    });
    
    // Listen for layout settings open event
    window.addEventListener('layout:open-settings', () => {
      openAppSettings();
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
  
  // Panel state tracking for mobile chevron icons
  let showLeftPanel = true; // Default state, will be synced with actual panel state
  let showRightPanel = true; // Default state, will be synced with actual panel state
  
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
        // Ensure avatar fields exist with defaults
        userPreferences = {
          ...prefs,
          avatar_type: prefs.avatar_type || 'default',
          avatar_value: prefs.avatar_value || null
        };
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
      // Clean up project menu toggle listener
      window.removeEventListener('layout:toggle-project-menu', () => {
        showProjectMenu = !showProjectMenu;
      });
      // Clean up layout settings open listener
      window.removeEventListener('layout:open-settings', () => {
        openAppSettings();
      });
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
  
  // Handle settings modal events
  function handleSettingsClose() {
    showAppSettings = false;
  }
  
  function handleSettingsSave(event) {
    userPreferences = event.detail;
    saveUserPreferences();
  }
  
  function handleSettingsThemeChange(event) {
    darkMode = event.detail.darkMode;
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
  <header class="h-16 border-b border-gray-200 dark:border-gray-700 backdrop-blur flex items-center relative z-[150] transition-colors" style="background-color: var(--bg-header);">
    <div class="w-full px-3 md:px-6 flex items-center justify-between gap-2 md:gap-4 relative">
      <!-- Left: Mobile Controls + Desktop Brand & Project Controls -->
      <div class="flex items-center gap-2">
        <!-- Mobile: Left-side controls (Facts & Projects) -->
        {#if isProjectsPage}
          <div class="{isDesktop ? 'hidden' : 'flex'} items-center gap-1">
            <!-- Left panel toggle (Context/Facts) -->
            <button
              type="button"
              class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              on:click={() => window.dispatchEvent(new CustomEvent('mobile:toggle-context'))}
              aria-label="Toggle Facts & Docs"
              title="Facts & Docs"
            >
              {#if showLeftPanel}
                <!-- Panel is open - chevrons pointing left (hide panel) -->
                <ChevronsLeft size="20" />
              {:else}
                <!-- Panel is closed - chevrons pointing right (show panel) -->
                <ChevronsRight size="20" />
              {/if}
              <span class="text-xs mt-1">Facts</span>
            </button>
            <!-- Project Menu Button -->
            <button
              type="button"
              class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              on:click={() => {
                window.dispatchEvent(new CustomEvent('mobile:toggle-projects'));
              }}
              aria-label="Projects and Tools"
            >
              <Boxes class="w-6 h-6" />
              <span class="text-xs mt-1">Projects</span>
            </button>
          </div>
        {/if}
        
        <!-- Desktop: Wiskr brand (show on authenticated pages + login/signup) -->
        {#if shouldShowLogo}
          <a href="/projects" class="{isDesktop ? 'flex' : 'hidden'} flex-shrink-0 items-center font-semibold text-gray-900 dark:text-gray-100 transition-colors">
            <span class="text-lg {isDesktop ? 'text-xl' : ''} inline-flex items-center">
              <img src="/wiskr-logo.png" alt="Wiskr" class="w-32 py-2 -ml-2 mb-0" />
            </span>
          </a>
        {/if}
        
        <!-- Desktop: Project controls (moved from right side) -->
        {#if isProjectsPage}
          <div class="{isDesktop ? 'flex' : 'hidden'} items-center gap-4">
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
              on:open-settings={(e) => { window.dispatchEvent(new CustomEvent('project:open-settings', { detail: e.detail })); }}
              on:export={(e) => {
                console.log('📤 Export event received in layout (desktop):', e.detail?.name);
                openProjectExport(e.detail);
              }}
              on:delete={async (e) => {
                const project = e.detail;
                if (projects.length <= 1) { alert('Create another project before deleting this one.'); return; }
                if (!confirm(`Delete "${project.name}"? This can't be undone.`)) return;
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
            
            <!-- New Project Button -->
            <button
              class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-all hover:scale-105 active:scale-95 font-medium shadow-sm"
              style="background-color: var(--color-accent); color: var(--color-accent-text);"
              on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
              on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
              on:click={() => { showNewProjectModal = true; }}
              title="Create New Project"
            >
              <Plus size="16" />
              <span>New</span>
            </button>
            
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
      
      <!-- Center: Mobile Wiskr logo -->
      {#if shouldShowLogo}
        <div class="{isDesktop ? 'hidden' : 'flex'} flex-1 justify-center">
          <a href="/projects" class="flex-shrink-0 flex items-center font-semibold text-gray-900 dark:text-gray-100 transition-colors">
            <span class="text-xl inline-flex items-center">
              <img src="/wiskr-logo.png" alt="Wiskr" class="w-28 py-2 mb-0" />
            </span>
          </a>
        </div>
      {:else}
        <!-- Spacer for when logo is not shown -->
        <div class="flex-1"></div>
      {/if}

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

          <!-- Mobile hamburger menu -->
          <div class="{isDesktop ? 'hidden' : 'block'} relative">
            <button
              type="button"
              class="p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              on:click={() => {
                window.dispatchEvent(new CustomEvent('mobile:toggle-menu'));
              }}
              aria-label="Menu"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          
          <!-- Mobile: Right panel control (Ideas) -->
          <div class="{isDesktop ? 'hidden' : 'flex'} items-center gap-1">
            <!-- Right panel toggle (Add-Ins) -->
            <button
              type="button"
              class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
              on:click={() => window.dispatchEvent(new CustomEvent('mobile:toggle-addins'))}
              aria-label="Toggle Questions & Ideas"
              title="Questions & Ideas"
            >
              {#if !showRightPanel}
                <!-- Chevrons pointing left (show panel) -->
                <ChevronsLeft size="20" />
              {:else}
                <!-- Chevrons pointing right (hide panel) -->
                <ChevronsRight size="20" />
              {/if}
              <span class="text-xs mt-1">Ideas</span>
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
        
      </div>
    </div>
  </header>

  <!-- Project Menu Drawer -->
  {#if showProjectMenu}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="fixed inset-0 z-[99999]" 
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
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">Projects</h3>
            <button
              class="flex items-center gap-1 text-xs text-white px-2 py-1 rounded transition-colors"
              style="background-color: var(--color-accent);"
              on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
              on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
              on:click={() => {
                showNewProjectModal = true;
                showProjectMenu = false;
              }}
            >
              <Plus size="14" />
              New
            </button>
          </div>
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
  <AppSettingsModal
    isOpen={showAppSettings}
    userData={data?.user}
    bind:userPreferences
    {savingPreferences}
    {darkMode}
    userTier={data?.userTier || 0}
    effectiveTier={data?.effectiveTier || 0}
    trialEndsAt={data?.trialEndsAt || null}
    on:close={handleSettingsClose}
    on:save-preferences={handleSettingsSave}
    on:theme-changed={handleSettingsThemeChange}
  />
  
  <!-- PWA functionality removed -->
  
  <!-- Tutorial Overlay -->
  <TutorialOverlay />
  
  <!-- Toast Notifications -->
  <ToastNotification />
</div>
