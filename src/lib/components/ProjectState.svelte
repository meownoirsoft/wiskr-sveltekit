<!-- ProjectState.svelte - Project management state and logic extracted from projects/+page.svelte -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase.js';
  import { tick } from 'svelte';

  const dispatch = createEventDispatcher();

  // Props - passed from parent component  
  export let data; // Server-side data
  
  // Project state
  export let projects = data?.projects ?? [];
  export let selectedId = null;
  export let current = null;
  export let hasInit = false;
  
  // Model selection state
  export let modelKey = 'speed'; // 'speed' | 'quality' | 'micro' | etc.
  export let modelKeyLoaded = false; // Flag to prevent saving before loading
  
  // Usage statistics
  export let usage = { today:{in:0,out:0,cost:0}, week:{in:0,out:0,cost:0}, month:{in:0,out:0,cost:0}, tz:'UTC' };

  // Debug: Log initial projects state
  // $: if (browser && projects) {
  //   // console.log('🔍 Projects array updated:', {
  //   //   count: projects.length,
  //   //   projects: projects.map(p => ({ id: p.id, name: p.name, source: 'reactive' }))
  //   // });
  // }

  // Save modelKey to localStorage whenever it changes (but only after initial load)
  $: if (browser && modelKey && modelKeyLoaded) {
    localStorage.setItem('wiskr_model_key', modelKey);
  }

  // Initialize project selection with localStorage validation
  $: (async () => {
    if (!browser || hasInit || !projects?.length) return;
    const lastSelectedId = localStorage.getItem('wiskr_last_project_id');
    
    // Validate that the cached project ID actually exists for this user
    const foundByStorage = lastSelectedId ? projects.find(p => p.id === lastSelectedId) : null;
    
    let selectedId;
    if (foundByStorage) {
      // Use the cached project if it exists
      selectedId = foundByStorage.id;
      //console.log('✅ Using cached project:', foundByStorage.name);
    } else {
      // If cached project doesn't exist, use first project and clear bad cache
      selectedId = projects[0].id;
      if (lastSelectedId) {
        //console.log('🧽 Clearing invalid cached project ID:', lastSelectedId);
        localStorage.removeItem('wiskr_last_project_id');
      }
      console.log('✅ Using first available project:', projects[0].name);
    }
    
    hasInit = true;
    await selectProjectById(selectedId);
    
    // Send project data to layout for header dropdown
    window.dispatchEvent(new CustomEvent('layout:update-projects', {
      detail: {
        projects: projects,
        currentProjectId: selectedId
      }
    }));
  })();

  // Keep current derived from selectedId
  $: current = projects.find(p => p.id === selectedId) || null;

  // Project selection function
  export async function selectProjectById(id) {
    if (!id || selectedId === id) return;
    selectedId = id;

    // Save to localStorage for persistence across page reloads
    if (browser) {
      localStorage.setItem('wiskr_last_project_id', id);
    }

    // Wait for reactive update to set current project
    await tick();
    
    // Dispatch project changed event for other components to react
    dispatch('project-changed', { 
      projectId: id, 
      project: current 
    });

    // Load usage for this project
    await loadUsage();
  }

  // Reload projects from database
  export async function reloadProjects(selectId) {
    const { data: p, error } = await supabase
      .from('projects')
      .select('id, name, icon, color, brief_text, description, created_at')
      .order('created_at');
    if (error) {
      console.error('reloadProjects error', error);
      return;
    }
    projects = p ?? [];

    const nextId =
      (selectId && projects.find(x => x.id === selectId)?.id) ||
      (selectedId && projects.find(x => x.id === selectedId)?.id) ||
      projects[0]?.id;

    if (nextId) await selectProjectById(nextId);
  }

  // Project deletion function
  export async function deleteProject(p) {
    if (projects.length <= 1) { 
      alert('Create another project before deleting this one.'); 
      return; 
    }
    if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
    
    const res = await fetch(`/api/projects/${p.id}/delete`, { method: 'POST' });
    if (!res.ok) {
      console.error(await res.text());
      alert('Delete failed.');
      return;
    }
    
    // Remove locally
    const wasSelected = current?.id === p.id;
    projects = projects.filter(x => x.id !== p.id);

    // If we deleted the selected project, pick another
    if (wasSelected) {
      const next = projects[0] || null;
      if (next) {
        await selectProjectById(next.id);
      } else {
        // No projects left - clear selection
        selectedId = null;
      }
    }
  }

  // Load usage statistics
  export async function loadUsage() {
    if (!browser) return; 
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const res = await fetch(`/api/usage/summary?tz=${encodeURIComponent(tz)}`);
    if (res.ok) usage = await res.json();
  }

  // Utility function to clear stale localStorage data
  function clearStaleProjectData() {
    if (!browser) return;
    
    const lastProjectId = localStorage.getItem('wiskr_last_project_id');
    if (lastProjectId && !projects.find(p => p.id === lastProjectId)) {
      console.log('🧽 Clearing stale project data from localStorage');
      localStorage.removeItem('wiskr_last_project_id');
      
      // Also clear any project-specific data that might be stale
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('liked_ideas_') || key.includes('dismissed_ideas_'))) {
          // Check if this is for a project that no longer exists
          const projectId = key.split('_').pop();
          if (projectId && !projects.find(p => p.id === projectId)) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log('🧽 Removed stale localStorage key:', key);
      });
    }
  }

  // Initialize on mount
  onMount(async () => {
    // If the server didn't preload, fetch projects
    if (!projects.length) {
      console.log('📋 No projects preloaded, fetching from database...');
      const { data: p } = await supabase.from('projects').select('*').order('created_at');
      projects = p ?? [];
      console.log(`📊 Found ${projects.length} existing projects`);
      
      // If still no projects after fetching, create a default first project for new users
      if (projects.length === 0) {
        console.log('🆕 New user detected, creating first project...');
        try {
          const res = await fetch('/api/projects/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: 'My First Project',
              description: 'Welcome to Wiskr! This is your first project to get you started.'
            })
          });
          
          if (res.ok) {
            const { project } = await res.json();
            projects = [project];
            console.log('✅ Created first project for new user:', project.name);
          } else {
            console.error('❌ Failed to create first project:', await res.text());
          }
        } catch (error) {
          console.error('❌ Error creating first project:', error);
        }
      }
    }
    
    // Clean up any stale localStorage data
    clearStaleProjectData();

    // Load usage once on page load
    await loadUsage();
    
    // Load persisted model key from localStorage
    if (browser) {
      const savedModelKey = localStorage.getItem('wiskr_model_key');
      if (savedModelKey) {
        modelKey = savedModelKey;
      }
      // Enable localStorage saving now that we've loaded the initial value
      modelKeyLoaded = true;
    }
  });

  // Update current project data when externally updated (e.g., from ContextManager)
  export function updateCurrentProject(updatedProject) {
    if (current && updatedProject.id === current.id) {
      // Update the projects array with the new data
      projects = projects.map(p => 
        p.id === updatedProject.id ? { ...p, ...updatedProject } : p
      );
      // The reactive statement will automatically update current
    }
  }
</script>

<!-- ProjectState is a logical component with no template -->
