<script>
  import '../app.css';
  export let data;
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';
  import HeaderProjectSelector from '$lib/components/HeaderProjectSelector.svelte';
  
  // Project selector state
  let projects = [];
  let currentProject = null;
  let projectSearch = '';
  
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
<div class="flex flex-col min-h-screen bg-zinc-50 text-zinc-900">

  <!-- Header -->
  <header class="h-16 border-b bg-white/80 backdrop-blur flex items-center">
    <div class="w-full px-6 flex items-center gap-4">
      <!-- Left: brand and project selector -->
      <div class="flex items-center gap-4">
        <a href="/projects" class="flex items-center gap-2 font-semibold">
          <span class="text-xl">🐈‍⬛ MrWiskr</span>
          <!-- <span class="text-xs text-zinc-500">Projects</span> -->
        </a>
        
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
            on:open-settings={(e) => {
              // Navigate to settings or dispatch event
              console.log('Open settings for:', e.detail);
            }}
          />
        </div>
      </div>

      <!-- Right: spacer and user -->
      <div class="flex-1"></div>
      <div class="flex items-center gap-3">
        {#if data?.user}
          <span class="text-sm text-zinc-600 hidden sm:inline">{truncateEmail(data.user.email)}</span>
          <a href="/logout" class="text-sm underline">Logout</a>
        {:else}
          <a href="/login" class="text-sm underline">Login</a>
          <a href="/signup" class="text-sm underline">Sign Up</a>
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
    <div class="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div class="bg-white rounded-xl shadow-xl w-[90vw] max-w-md p-4">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">Create Project</h3>
          <button class="text-sm" on:click={() => !creating && (showNew = false)}>✕</button>
        </div>

        <div class="grid gap-2">
          <label class="text-xs text-zinc-600" for="newName">Name</label>
          <input class="border rounded p-2" name="newName" placeholder="e.g., BEDNOMANCER 2" bind:value={newName} />

          <div class="grid grid-cols-2 gap-2 mt-2">
            <div>
              <label class="text-xs text-zinc-600" for="newIcon">Icon (emoji)</label>
              <input class="border rounded p-2" name="newIcon" bind:value={newIcon} />
            </div>
            <div>
              <label class="text-xs text-zinc-600" for="newColor">Color</label>
              <input class="border rounded p-2" type="color" name="newColor" bind:value={newColor} />
            </div>
          </div>

          {#if createErr}
            <div class="text-xs text-red-600 mt-1">{createErr}</div>
          {/if}

          <div class="flex items-center justify-end gap-2 mt-3">
            <button class="text-sm px-3 py-1 border rounded" on:click={() => !creating && (showNew = false)}>Cancel</button>
            <button class="text-sm px-3 py-1 border rounded bg-indigo-600 text-white disabled:opacity-50"
              on:click={createProject} disabled={creating}>
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
