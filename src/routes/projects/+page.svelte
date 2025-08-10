<!-- src/routes/projects/+page.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase.js';
  
  export let data;
  let projects = data?.projects ?? [];
  let selectedId = null;
  let current = null;
  let hasInit = false;
  let modelKey = 'speed'; // 'speed' | 'quality'

  // init once - simple localStorage-only approach
  $: (async () => {
    if (!browser || hasInit || !projects?.length) return;
    const lastSelectedId = localStorage.getItem('wiskr_last_project_id');
    
    // Simple priority: localStorage > first project
    const foundByStorage = lastSelectedId ? projects.find(p => p.id === lastSelectedId) : null;
    const selectedId = foundByStorage?.id || projects[0].id;
    
    console.log('🎯 Project selection:', {
      selectedId,
      selectedName: projects.find(p => p.id === selectedId)?.name,
      reason: foundByStorage ? 'localStorage' : 'fallback to first',
      lastSelectedId
    });
    
    hasInit = true;
    await selectProjectById(selectedId);
  })();

  // keep current derived from id
  $: current = projects.find(p => p.id === selectedId) || null;

  async function selectProjectById(id) {
    if (!id || selectedId === id) return;
    selectedId = id;

    // Save to localStorage for persistence across page reloads
    if (browser) {
      localStorage.setItem('wiskr_last_project_id', id);
    }

    // load for this project
    await loadMessages();
    await loadContext();
    await loadUsage();
    await tick();
  }

  async function reloadProjects(selectId) {
    const { data: p, error } = await supabase
      .from('projects')
      .select('id, name, icon, color, brief_text, created_at')
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

  // Builder toggle via query param (?builder=1) - keeping this one for UI control
  $: builder = ($page.url?.searchParams.get('builder') === '1') || false;

  // Left column state
  let search = '';
  $: filtered = projects.filter(p =>
    !search.trim() ||
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    (p.brief_text ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // Chat state
  let input = '';
  let messages = [];

  // Context state
  let facts = [];
  let docs = [];
  let loadingFacts = false;

  // Add Fact form
  let factType = 'character';
  let factKey = '';
  let factValue = '';
  let factTags = '';

  // Add Doc form
  let docTitle = '';
  let docContent = '';
  let docTags = '';

  // Store the handler reference so it can be properly cleaned up
  let projectsRefreshHandler;

  onMount(async () => {
    // If the server didn't preload, fetch projects
    if (!projects.length) {
      const { data: p } = await supabase.from('projects').select('*').order('created_at');
      projects = p ?? [];
    }

    // Load usage once on page load
    await loadUsage();

    // Listen for "projects:refresh" after create (from +layout.svelte)
    projectsRefreshHandler = (e) => reloadProjects(e.detail?.id);
    window.addEventListener('projects:refresh', projectsRefreshHandler);
  });

  // Clean up event listener when component is destroyed
  onDestroy(() => {
    if (projectsRefreshHandler) {
      window.removeEventListener('projects:refresh', projectsRefreshHandler);
    }
  });


  async function pickProject(p) {
    await selectProjectById(p.id);
  }

  async function loadMessages() {
    if (!current) return;
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', current.id)
      .order('created_at');
    messages = data ?? [];
  }

  async function loadContext() {
    if (!current) return;
    loadingFacts = true;
    const [{ data: f }, { data: d }, { data: p }] = await Promise.all([
      supabase.from('facts').select('*').eq('project_id', current.id).order('created_at'),
      supabase.from('docs').select('*').eq('project_id', current.id).order('created_at').limit(10),
      supabase.from('projects').select('*').eq('id', current.id).single()
    ]);
    facts = f ?? [];
    docs = d ?? [];
    if (p) current = p; // keeps brief_text fresh
    loadingFacts = false;
  }

  async function send() {
    if (!current || !input.trim()) return;
    const userMsg = input;
    input = '';
    messages = [...messages, { role: 'user', content: userMsg }, { role: 'assistant', content: '' }];
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: current.id, message: userMsg, modelKey, tz })
    });
    if (res.status === 429) {
      const data = await res.json();
      messages = [...messages, { role: 'assistant', content: data.message || 'Daily limit reached.' }];
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let assistantText = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk === '[DONE]') break;
      assistantText += chunk;
     
      // live update last assistant message
      messages = messages.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: assistantText } : m);
      await loadUsage();
    }
}

  async function regenerateBrief() {
    if (!current) return;
    await fetch('/api/brief/regenerate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ projectId: current.id })
    });
    await loadContext();
  }

  const parseTags = (s) =>
    s.split(',').map(t => t.trim()).filter(Boolean);

  async function addFact() {
    if (!current) return;
    if (!factKey.trim() || !factValue.trim()) return;
    const payload = {
      project_id: current.id,
      type: factType.trim(),
      key: factKey.trim(),
      value: factValue.trim(),
      tags: parseTags(factTags)
    };
    const { data, error } = await supabase.from('facts').insert(payload).select('*').single();
    if (error) { alert(error.message); return; }
    facts = [data, ...facts];
    factKey = ''; factValue = ''; factTags = '';
  }

  async function addDoc() {
    if (!current) return;
    if (!docTitle.trim() || !docContent.trim()) return;
    const payload = {
      project_id: current.id,
      title: docTitle.trim(),
      content: docContent.trim(),
      tags: parseTags(docTags)
    };
    const { data, error } = await supabase.from('docs').insert(payload).select('*').single();
    if (error) { alert(error.message); return; }
    docs = [data, ...docs];
    docTitle = ''; docContent = ''; docTags = '';
  }

  function startEditFact(f, i) {
    facts = facts.map((x, idx) => idx === i ? { ...x, _editing: true, _editKey: x.key, _editValue: x.value } : x);
  }
  function cancelEditFact(f, i) {
    facts = facts.map((x, idx) => idx === i ? { ...x, _editing: false } : x);
  }
  async function saveFact(f, i) {
    const { data, error } = await supabase.from('facts')
      .update({ key: f._editKey.trim(), value: f._editValue.trim() })
      .eq('id', f.id)
      .select('*').single();
    if (error) { alert(error.message); return; }
    facts = facts.map((x, idx) => idx === i ? { ...data, _editing: false } : x);
  }
  async function deleteFact(f, i) {
    if (!confirm('Delete this fact?')) return;
    const { error } = await supabase.from('facts').delete().eq('id', f.id);
    if (error) { alert(error.message); return; }
    facts = facts.filter((_, idx) => idx !== i);
  }
  async function togglePin(f, i) {
    const { data, error } = await supabase.from('facts').update({ pinned: !f.pinned }).eq('id', f.id).select('*').single();
    if (error) { alert(error.message); return; }
    facts = facts.map((x, idx) => idx === i ? data : x);
  }

  function startEditDoc(d, i) {
  docs = docs.map((x, idx) =>
    idx === i ? { ...x, _editing: true, _editTitle: x.title, _editContent: x.content, _editTags: (x.tags || []).join(', ') } : x
  );
}
function cancelEditDoc(d, i) {
  docs = docs.map((x, idx) => idx === i ? { ...x, _editing: false } : x);
}
async function saveDoc(d, i) {
  const payload = {
    title: d._editTitle.trim(),
    content: d._editContent.trim(),
    tags: d._editTags.split(',').map(t => t.trim()).filter(Boolean)
  };
  const { data, error } = await supabase.from('docs').update(payload).eq('id', d.id).select('*').single();
  if (error) { alert(error.message); return; }
  docs = docs.map((x, idx) => idx === i ? { ...data, _editing: false } : x);
}
async function deleteDoc(d, i) {
  if (!confirm('Delete this doc?')) return;
  const { error } = await supabase.from('docs').delete().eq('id', d.id);
  if (error) { alert(error.message); return; }
  docs = docs.filter((_, idx) => idx !== i);
}
async function togglePinDoc(d, i) {
  const { data, error } = await supabase.from('docs').update({ pinned: !d.pinned }).eq('id', d.id).select('*').single();
  if (error) { alert(error.message); return; }
  docs = docs.map((x, idx) => idx === i ? data : x);
}

// RENAME / DELETE handlers
async function renameProject(p) {
  const name = window.prompt('Rename project:', p.name);
  if (!name || name.trim() === p.name) return;
  const res = await fetch(`/api/projects/${p.id}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: name.trim() })
  });
  if (!res.ok) {
    console.error(await res.text());
    alert('Rename failed.');
    return;
  }
  const { project } = await res.json();
  // update local list
  projects = projects.map(x => x.id === p.id ? project : x);
}

async function deleteProject(p) {
  if (projects.length <= 1) { alert('Create another project before deleting this one.'); return; }
  if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
  const res = await fetch(`/api/projects/${p.id}/delete`, { method: 'POST' });
  if (!res.ok) {
    console.error(await res.text());
    alert('Delete failed.');
    return;
  }
  // remove locally
  const wasSelected = current?.id === p.id;
  projects = projects.filter(x => x.id !== p.id);

  // if we deleted the selected project, pick another
  if (wasSelected) {
    const next = projects[0] || null;
    if (next) {
      await selectProjectById(next.id);
    } else {
      // no projects left - clear selection
      selectedId = null;
    }
  }
}


let usage = { today:{in:0,out:0,cost:0}, week:{in:0,out:0,cost:0}, month:{in:0,out:0,cost:0}, tz:'UTC' };

async function loadUsage() {
  if (!browser) return; 
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const res = await fetch(`/api/usage/summary?tz=${encodeURIComponent(tz)}`);
  if (res.ok) usage = await res.json();
}

</script>

<!-- Layout -->
 <div class="grid grid-cols-1 md:grid-cols-3 md:[grid-template-columns:240px_320px_1fr] h-[calc(100vh-4rem)]">

  <!-- LEFT: Project list -->
  <aside class="border-r p-3 overflow-auto bg-white">
    <input
      class="border rounded p-2 w-full mb-3"
      placeholder="Search projects..."
      bind:value={search}
    />
    <ul class="space-y-2">
      {#each filtered as project}
        <li>
          <div class="p-2 rounded hover:bg-zinc-100">
            <div class="flex items-start justify-between gap-2">
              <button
                class={`w-full text-left p-2 rounded hover:bg-zinc-100 ${current?.id === project.id ? 'bg-zinc-200' : ''}`}
                on:click={() => pickProject(project)}
              >
                <div class="font-semibold flex items-center gap-2">
                  <span>{project.icon ?? '📁'}</span>
                  <span>{project.name}</span>
                </div>
                {#if project.brief_text}
                  <div class="text-xs text-zinc-600 line-clamp-2 mt-1">
                    {project.brief_text}
                  </div>
                {/if}
              </button>
              <div class="shrink-0 flex items-center gap-2">
                <button class="text-xs underline" title="Rename" on:click={() => renameProject(project)}>Rename</button>
                <button class="text-xs underline text-red-600" title="Delete" on:click={() => deleteProject(project)}>Delete</button>
              </div>
            </div>
          </div>
        </li>
      {/each}
      {#if !filtered.length}
        <li class="text-sm text-zinc-500">No projects found.</li>
      {/if}
    </ul>
  </aside>

  <!-- MIDDLE: Brief + Facts/Docs (builder mode only) -->
  {#if builder}
    <section class="border-r p-3 overflow-auto bg-gray-50">
      {#if current}
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold">Brief</h3>
          <button class="text-sm underline" on:click={regenerateBrief}>Regenerate</button>
        </div>
        <pre class="text-sm whitespace-pre-wrap bg-white border rounded p-2">{current.brief_text || 'No brief yet.'}</pre>

        <!-- Add Fact -->
        <div class="mt-4 border rounded p-3 bg-white">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold">Add Fact</h3>
            <span class="text-xs text-zinc-500">Short, atomic facts work best</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <select class="border rounded p-2" bind:value={factType}>
              <option value="character">character</option>
              <option value="location">location</option>
              <option value="mechanic">mechanic</option>
              <option value="glossary">glossary</option>
              <option value="entity">entity</option>
            </select>
            <input class="border rounded p-2" placeholder="Key (e.g., Cheddar)" bind:value={factKey} />
            <input class="border rounded p-2 col-span-2" placeholder="Tags (comma-separated)" bind:value={factTags} />
            <textarea class="border rounded p-2 col-span-2" rows="3" placeholder="Value (≤120 words)" bind:value={factValue}></textarea>
          </div>
          <div class="mt-2">
            <button class="border rounded px-3 py-1" on:click={addFact}>Save Fact</button>
          </div>
        </div>

        <h3 class="font-semibold mt-4">Facts</h3>
        {#if loadingFacts}<div class="text-sm text-zinc-500">Loading…</div>{/if}
        <ul class="mt-1 space-y-1">
          {#each facts as f, i}
            <li class="text-sm border rounded p-2 bg-white">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <b>[{f.type}] {f.key}</b>{f.pinned ? ' 🌟' : ''}: {f.value}
                  {#if f.tags?.length}
                    <div class="text-xs text-zinc-500 mt-1">Tags: {f.tags.join(', ')}</div>
                  {/if}
                </div>
                <div class="shrink-0 flex gap-2">
                  <button class="text-xs underline" on:click={() => togglePin(f, i)}>{f.pinned ? 'Unpin' : 'Pin'}</button>
                  <button class="text-xs underline" on:click={() => startEditFact(f, i)}>Edit</button>
                  <button class="text-xs underline text-red-600" on:click={() => deleteFact(f, i)}>Delete</button>
                </div>
              </div>

              {#if f._editing}
                <div class="mt-2 grid gap-2">
                  <input class="border rounded p-2" bind:value={f._editKey} />
                  <textarea class="border rounded p-2" rows="3" bind:value={f._editValue}></textarea>
                  <div class="flex gap-2">
                    <button class="border rounded px-2" on:click={() => saveFact(f, i)}>Save</button>
                    <button class="border rounded px-2" on:click={() => cancelEditFact(f, i)}>Cancel</button>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
          {#if !facts.length && !loadingFacts}<li class="text-sm text-zinc-500">No facts.</li>{/if}
        </ul>


        <!-- Add Doc -->
        <div class="mt-6 border rounded p-3 bg-white">
          <div class="flex items-center justify-between mb-2">
            <h3 class="font-semibold">Add Doc</h3>
            <span class="text-xs text-zinc-500">Longer notes, lore, specs</span>
          </div>
          <div class="grid gap-2">
            <input class="border rounded p-2" placeholder="Title" bind:value={docTitle} />
            <input class="border rounded p-2" placeholder="Tags (comma-separated)" bind:value={docTags} />
            <textarea class="border rounded p-2" rows="6" placeholder="Content" bind:value={docContent}></textarea>
          </div>
          <div class="mt-2">
            <button class="border rounded px-3 py-1" on:click={addDoc}>Save Doc</button>
          </div>
        </div>

        <h3 class="font-semibold mt-4">Docs</h3>
        <ul class="mt-1 space-y-2">
          {#each docs as d, i}
            <li class="text-sm border rounded p-2 bg-white">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-medium">
                    {d.title}{d.pinned ? ' 🌟' : ''}
                  </div>
                  <div class="mt-1 text-xs whitespace-pre-wrap">
                    {d.content.slice(0, 400)}{d.content.length > 400 ? '…' : ''}
                  </div>
                  {#if d.tags?.length}
                    <div class="mt-1 text-[10px] text-zinc-500">Tags: {d.tags.join(', ')}</div>
                  {/if}
                </div>
                <div class="shrink-0 flex gap-2">
                  <button class="text-xs underline" on:click={() => togglePinDoc(d, i)}>{d.pinned ? 'Unpin' : 'Pin'}</button>
                  <button class="text-xs underline" on:click={() => startEditDoc(d, i)}>Edit</button>
                  <button class="text-xs underline text-red-600" on:click={() => deleteDoc(d, i)}>Delete</button>
                </div>
              </div>

              {#if d._editing}
                <div class="mt-2 grid gap-2">
                  <input class="border rounded p-2" placeholder="Title" bind:value={d._editTitle} />
                  <input class="border rounded p-2" placeholder="Tags (comma-separated)" bind:value={d._editTags} />
                  <textarea class="border rounded p-2" rows="6" placeholder="Content" bind:value={d._editContent}></textarea>
                  <div class="flex gap-2">
                    <button class="border rounded px-2" on:click={() => saveDoc(d, i)}>Save</button>
                    <button class="border rounded px-2" on:click={() => cancelEditDoc(d, i)}>Cancel</button>
                  </div>
                </div>
              {/if}
            </li>
          {/each}
          {#if !docs.length}<li class="text-sm text-zinc-500">No docs.</li>{/if}
        </ul>

      {:else}
        <p>Select a project</p>
      {/if}
    </section>
  {:else}
    <!-- keep the 3 columns aligned on md+ even when builder panel is off -->
    <section class="hidden md:block border-r bg-gray-50"></section>
  {/if}

  <!-- RIGHT: Chat -->
  <main class="flex flex-col bg-white">
    <div class="flex-1 overflow-auto p-4 space-y-3">
      {#if !current}
        <p>Select a project to start chatting.</p>
      {:else}
        {#each messages as m}
          <div class="max-w-prose">
            <div class="text-xs text-zinc-500 mb-1">{m.role}</div>
            <div class="rounded-lg p-3 border whitespace-pre-wrap">{m.content}</div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- Ask box -->
     <form class="p-3 border-t flex gap-2 items-center" on:submit|preventDefault={send}>
      <input class="border rounded p-2 w-full" bind:value={input} placeholder={current ? "Ask…" : "Pick a project"} disabled={!current}/>
      <select class="border rounded p-2" bind:value={modelKey} disabled={!current}>
        <option value="speed">Speed (4o-mini)</option>
        <option value="quality">Quality (4o)</option>
      </select>
      <button class="border rounded px-3" type="submit" disabled={!current || !input.trim()}>Send</button>
    </form>
    <!-- <form class="p-3 border-t flex gap-2" on:submit|preventDefault={send}>

      <input
        class="border rounded p-2 w-full"
        bind:value={input}
        placeholder={current ? "Ask or say what’s next…" : "Pick a project first"}
        disabled={!current}
      />
      <button class="border rounded px-3" type="submit" disabled={!current || !input.trim()}>
        Send
      </button>
    </form> -->
    {#if usage}
      <div class="px-3 pb-3 text-xs text-zinc-500 space-y-1">
        <div class="text-zinc-600 font-medium mb-1">Total Usage (All Projects):</div>
        <div>Today: {usage.today.in.toLocaleString()} in / {usage.today.out.toLocaleString()} out · ${usage.today.cost.toFixed(4)}</div>
        <div>Last 7 days: {usage.week.in.toLocaleString()} in / {usage.week.out.toLocaleString()} out · ${usage.week.cost.toFixed(4)}</div>
        <div>This month: {usage.month.in.toLocaleString()} in / {usage.month.out.toLocaleString()} out · ${usage.month.cost.toFixed(4)}</div>
      </div>
    {/if}
  </main>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
