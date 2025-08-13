<!-- src/routes/projects/+page.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase.js';
  import { marked } from 'marked';
  
  // Import components
  import Sidebar from '$lib/components/Sidebar.svelte';
  import IdeasColumn from '$lib/components/IdeasColumn.svelte';
  import ChatInterface from '$lib/components/ChatInterface.svelte';
  import FormatModal from '$lib/components/FormatModal.svelte';
  import BranchModal from '$lib/components/BranchModal.svelte';
  import NewProjectModal from '$lib/components/NewProjectModal.svelte';
  import SettingsModal from '$lib/components/SettingsModal.svelte';
  import HeaderProjectSelector from '$lib/components/HeaderProjectSelector.svelte';
  
  // Import Lucide icons
  import { Music, Camera, Video, ShoppingBag, MessageCircle, Briefcase, Shirt, MapPin, Users, MessageSquare, FileText, Hash } from 'lucide-svelte';
  
  // Import styles
  import '$lib/components/styles.css';
  
  // Configure marked for better rendering
  marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true, // Enable GitHub flavored markdown
  });
  
  export let data;
  let projects = data?.projects ?? [];
  let selectedId = null;
  let current = null;
  let hasInit = false;
  let modelKey = 'speed'; // 'speed' | 'quality' | 'micro' | etc.
  let modelKeyLoaded = false; // Flag to prevent saving before loading

  // Save modelKey to localStorage whenever it changes (but only after initial load)
  $: if (browser && modelKey && modelKeyLoaded) {
    localStorage.setItem('wiskr_model_key', modelKey);
  }

  // init once - simple localStorage-only approach
  $: (async () => {
    if (!browser || hasInit || !projects?.length) return;
    const lastSelectedId = localStorage.getItem('wiskr_last_project_id');
    
    // Simple priority: localStorage > first project
    const foundByStorage = lastSelectedId ? projects.find(p => p.id === lastSelectedId) : null;
    const selectedId = foundByStorage?.id || projects[0].id;
    
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

    // Wait for reactive update to set current project
    await tick();
    
    // load for this project (now that current is set)
    await loadBranches();
    await loadMessages(id);
    await loadContext();
    await loadUsage();
    
    // Load questions for this project from database
    await loadQuestions();
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

  // Always show sidebar (removed builder mode)

  // Left column state
  let search = '';

  function clearSearch() {
    search = '';
  }

  // Chat state
  let input = '';
  let messages = [];
  let loadingMessages = false;

  // Platform formatting state
  let showFormatModal = false;
  let selectedText = '';
  let selectedMessageIndex = -1;
  let formattedContent = '';
  let selectedPlatform = '';
  let isFormatting = false;

  // Branching state
  let currentBranchId = 'main';
  let currentBranch = null;
  let branches = [];
  let messageBranches = []; // Branches for the specific message being branched
  let showBranchModal = false;
  let branchModalMessageIndex = -1;
  let newBranchName = '';
  let isCreatingBranch = false;
  let branchCreateError = '';

  // Context state
  let facts = [];
  let docs = [];
  let loadingFacts = false;

  // Add Fact form
  let factType = 'character';
  let factKey = '';
  let factValue = '';
  let factTags = '';
  let showAddFactForm = false;

  // Add Doc form
  let docTitle = '';
  let docContent = '';
  let docTags = '';
  let showAddDocForm = false;

  // Usage stats visibility
  let showUsageStats = false;


  // New Project modal state
  let showNewProjectModal = false;
  let newProjectName = '';
  let newProjectIcon = '📁';
  let newProjectColor = '#6366f1';
  let creatingProject = false;
  let createProjectErr = '';

  // Settings modal state
  let showSettingsModal = false;
  let settingsProject = null;
  
  // Component references
  let sidebarComponent;

  // Ideas Column state
  let goodQuestions = [];
  let relatedIdeas = [];
  let isGeneratingIdeas = false;
  
  // Sidebar tab state
  let activeTab = 'facts';
  
  // Panel visibility state - responsive defaults
  let showLeftPanel = false;   // Facts/Docs panel
  let showRightPanel = false;  // Questions/Ideas panel
  let isDesktop = false;       // Track if we're on desktop
  

  // Store the handler reference so it can be properly cleaned up
  let projectsRefreshHandler;

  // Responsive screen detection
  function checkScreenSize() {
    if (browser) {
      isDesktop = window.innerWidth >= 1024; // lg breakpoint
      // On desktop, show both panels by default
      if (isDesktop) {
        showLeftPanel = true;
        showRightPanel = true;
      } else {
        // On mobile/tablet, collapse both panels by default
        showLeftPanel = false;
        showRightPanel = false;
      }
    }
  }

  onMount(async () => {
    // If the server didn't preload, fetch projects
    if (!projects.length) {
      const { data: p } = await supabase.from('projects').select('*').order('created_at');
      projects = p ?? [];
    }

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

    // Setup responsive detection (browser-only)
    if (browser) {
      checkScreenSize();
      window.addEventListener('resize', checkScreenSize);

      // Listen for "projects:refresh" after create (from +layout.svelte)
      projectsRefreshHandler = (e) => reloadProjects(e.detail?.id);
      window.addEventListener('projects:refresh', projectsRefreshHandler);
      
      // Listen for project selection from header
      window.addEventListener('project:selected', (e) => {
        if (e.detail?.id) {
          selectProjectById(e.detail.id);
        }
      });
      
      // Listen for project settings from header
      window.addEventListener('project:open-settings', (e) => {
        if (e.detail) {
          handleProjectOpenSettings({ detail: e.detail });
        }
      });
      
      // Listen for search events from global search
      window.addEventListener('search:activate-tab', handleSearchActivateTab);
      window.addEventListener('search:filter', handleSearchFilter);
      window.addEventListener('search:navigate-chat', handleSearchNavigateChat);
      window.addEventListener('search:clear', handleSearchClear);
    }
  });

  // Clean up event listener when component is destroyed
  onDestroy(() => {
    if (browser) {
      if (projectsRefreshHandler) {
        window.removeEventListener('projects:refresh', projectsRefreshHandler);
      }
      // Clean up search event listeners
      window.removeEventListener('search:activate-tab', handleSearchActivateTab);
      window.removeEventListener('search:filter', handleSearchFilter);
      window.removeEventListener('search:navigate-chat', handleSearchNavigateChat);
      window.removeEventListener('search:clear', handleSearchClear);
    }
  });

  async function loadMessages(projectId = null) {
    const id = projectId || current?.id;
    if (!id) return;
    
    // For initial load, reset to main branch
    if (projectId) {
      currentBranchId = 'main';
      // Set the main branch object properly
      currentBranch = {
        project_id: id,
        branch_id: 'main',
        branch_name: 'Main',
        color_index: 0,
        colorClass: 'bg-white border-gray-200'
      };
    }
    
    loadingMessages = true;
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', id)
      .eq('branch_id', currentBranchId)
      .order('created_at');
    
    // Ensure minimum loading duration of 500ms so spinner is visible
    const elapsed = Date.now() - startTime;
    const minDuration = 500;
    if (elapsed < minDuration) {
      await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
    }
    
    if (error) {
      console.error('Error loading messages:', error);
    } else {
      messages = data ?? [];
    }
    loadingMessages = false;
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

  async function loadQuestions() {
    if (!current) return;
    
    try {
      const res = await fetch(`/api/projects/${current.id}/questions`);
      if (res.ok) {
        const data = await res.json();
        goodQuestions = (data.questions || []).map(q => q.question);
      } else {
        console.error('Failed to load questions:', await res.text());
        goodQuestions = [];
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      goodQuestions = [];
    }
  }

  async function send(event) {
    if (!current || !event.detail.message.trim()) return;
    const userMsg = event.detail.message;
    input = '';
    messages = [...messages, { role: 'user', content: userMsg }, { role: 'assistant', content: '', model_key: modelKey }];
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: current.id, message: userMsg, modelKey, tz, branchId: currentBranchId })
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
    if (!factKey?.trim() || !factValue?.trim()) return;

    // Parse tags
    const tags = factTags ? factTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const res = await fetch('/api/facts/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: current.id,
        type: factType || 'note',
        key: factKey.trim(),
        value: factValue.trim(),
        tags: tags,
        pinned: false
      })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to save fact');
      return;
    }
    // clear form and hide
    factKey = ''; factValue = ''; factTags = '';
    showAddFactForm = false;

    // reload lists
    await loadContext();
  }

  async function addDoc() {
    if (!current) return;
    if (!docTitle?.trim()) return;

    // Parse tags
    const tags = docTags ? docTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    const res = await fetch('/api/docs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: current.id,
        title: docTitle.trim(),
        content: docContent || '',
        tags: tags,
        pinned: false
      })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to create doc');
      return;
    }
    // clear and hide
    docTitle = ''; docContent = ''; docTags = '';
    showAddDocForm = false;

    await loadContext();
  }

  function startEditFact(f, i) {
    facts = facts.map((x, idx) => idx === i ? { ...x, _editing: true, _editKey: x.key, _editValue: x.value, _editTags: (x.tags || []).join(', ') } : x);
  }
  function cancelEditFact(f, i) {
    facts = facts.map((x, idx) => idx === i ? { ...x, _editing: false } : x);
  }

  async function saveFactEdit(f, { type, key, value, tags }) {
    const res = await fetch(`/api/facts/create/${f.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type, key, value,
        tags,
        reembed: 'auto' // re-embed if text changed
      })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to update fact');
      return;
    }
    // Refresh lists
    await loadContext();
  }

  async function deleteFact(f, i) {
    if (!confirm('Delete this fact?')) return;
    const { error } = await supabase.from('facts').delete().eq('id', f.id);
    if (error) { alert(error.message); return; }
    facts = facts.filter((_, idx) => idx !== i);
  }

async function toggleFactPin(f) {
    console.log('Toggling fact pin for:', f.key, 'from', f.pinned, 'to', !f.pinned);
    const res = await fetch(`/api/facts/create/${f.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !f.pinned, reembed: 'skip' }) // pin doesn't change meaning
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to toggle pin');
      return;
    }
    await loadContext();
  }

  function startEditDoc(d, i) {
    docs = docs.map((x, idx) =>
      idx === i ? { ...x, _editing: true, _editTitle: x.title, _editContent: x.content, _editTags: (x.tags || []).join(', ') } : x
    );
  }
function cancelEditDoc(d, i) {
  docs = docs.map((x, idx) => idx === i ? { ...x, _editing: false } : x);
}
async function saveDocEdit(d, { title, content, tags }) {
    const res = await fetch(`/api/docs/${d.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, content, tags,
        reembed: 'auto' // only re-embed if text changed
      })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to update doc');
      return;
    }
    await loadContext();
  }
async function deleteDoc(d, i) {
  if (!confirm('Delete this doc?')) return;
  const { error } = await supabase.from('docs').delete().eq('id', d.id);
  if (error) { alert(error.message); return; }
  docs = docs.filter((_, idx) => idx !== i);
}

async function toggleDocPin(d) {
    const res = await fetch(`/api/docs/${d.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !d.pinned, reembed: 'skip' })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to toggle pin');
      return;
    }
    await loadContext();
  }

// DELETE handlers

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


// Platform formatting functions
function openFormatModal(messageIndex) {
  selectedMessageIndex = messageIndex;
  selectedText = messages[messageIndex].content;
  showFormatModal = true;
  formattedContent = '';
  selectedPlatform = '';
}

function closeFormatModal() {
  showFormatModal = false;
  selectedText = '';
  selectedMessageIndex = -1;
  formattedContent = '';
  selectedPlatform = '';
}

async function formatForPlatform(platform) {
  if (!selectedText || isFormatting) return;
  
  isFormatting = true;
  selectedPlatform = platform;
  
  try {
    const res = await fetch('/api/format-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: selectedText,
        platform: platform
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      formattedContent = data.formatted || 'Error formatting content';
    } else {
      formattedContent = 'Error: Failed to format content';
    }
  } catch (error) {
    console.error('Format error:', error);
    formattedContent = 'Error: Network error';
  } finally {
    isFormatting = false;
  }
}

async function copyToClipboard(text) {
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    // Could add a toast notification here
  } catch (error) {
    console.error('Failed to copy:', error);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

// Conversation branching functions
async function loadBranches() {
  if (!current) return;
  
  try {
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', projectId: current.id })
    });
    
    if (res.ok) {
      const data = await res.json();
      branches = data.branches || [];
      
      // Set current branch info
      currentBranch = branches.find(b => b.branch_id === currentBranchId) || 
                     branches.find(b => b.branch_id === 'main') || null;
    }
  } catch (error) {
    console.error('Error loading branches:', error);
  }
}

async function openBranchModal(messageIndex) {
  branchModalMessageIndex = messageIndex;
  newBranchName = '';
  branchCreateError = ''; // Clear any previous errors
  
  // Load branches for this specific message
  if (current && messages[messageIndex]?.id) {
    const messageId = messages[messageIndex].id;
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'listForMessage', 
          projectId: current.id,
          messageId: messageId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        messageBranches = data.branches || [];
      } else {
        console.error('Failed to load branches for message');
        messageBranches = [];
      }
    } catch (error) {
      console.error('Error loading message branches:', error);
      messageBranches = [];
    }
  } else {
    messageBranches = [];
  }
  
  showBranchModal = true;
}

function closeBranchModal() {
  showBranchModal = false;
  branchModalMessageIndex = -1;
  newBranchName = '';
}

async function createBranch() {
  if (!current || branchModalMessageIndex < 0 || !newBranchName.trim() || isCreatingBranch) return;
  
  isCreatingBranch = true;
  
  try {
    const messageId = messages[branchModalMessageIndex]?.id;
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        projectId: current.id,
        messageId: messageId,
        branchName: newBranchName.trim()
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      await loadBranches();
      await switchToBranch(data.branch.branch_id);
      closeBranchModal();
      
      // Reload message branch counts in the ChatInterface component
      if (browser) {
        window.dispatchEvent(new CustomEvent('branches-updated'));
      }
    } else {
      // Handle error response from server
      try {
        const errorData = await res.json();
        branchCreateError = errorData.error || 'Failed to create branch. Please try again.';
      } catch {
        branchCreateError = 'Failed to create branch. Please try again.';
      }
      console.error('Failed to create branch:', branchCreateError);
    }
  } catch (error) {
    console.error('Error creating branch:', error);
    alert('Error creating branch. Please try again.');
  } finally {
    isCreatingBranch = false;
  }
}

async function switchToBranch(branchId) {
  console.log('Parent: switchToBranch called with:', branchId, 'current branchId:', currentBranchId);
  console.log('Parent: current object:', current);
  console.log('Parent: current.id:', JSON.stringify(current?.id), 'type:', typeof current?.id, 'length:', current?.id?.length);
  if (!current || branchId === currentBranchId) {
    console.log('Parent: switchToBranch early return - no current or same branch');
    return;
  }
  
  try {
    console.log('Parent: Making API call to switch branch');
    const requestBody = {
      action: 'switch',
      projectId: current.id,
      branchId: branchId
    };
    console.log('Parent: Request body:', JSON.stringify(requestBody));
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('Parent: API response:', data);
      currentBranchId = branchId;
      currentBranch = data.branch;
      messages = data.messages || [];
      console.log('Parent: Updated messages:', messages.length, 'messages');
    } else {
      console.error('Parent: API response not ok:', res.status, res.statusText);
    }
  } catch (error) {
    console.error('Error switching branch:', error);
  }
}

function getBranchColor(branch) {
  if (!branch) return RAINBOW_COLORS[0];
  return RAINBOW_COLORS[branch.color_index % RAINBOW_COLORS.length];
}

// Platform definitions with Lucide icons
const platforms = [
  { id: 'tiktok', name: 'TikTok', icon: 'Music' },
  { id: 'instagram', name: 'Instagram', icon: 'Camera' },
  { id: 'youtube', name: 'YouTube', icon: 'Video' },
  { id: 'etsy', name: 'Etsy', icon: 'ShoppingBag' },
  { id: 'twitter', name: 'X/Twitter', icon: 'MessageCircle' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'Briefcase' },
  { id: 'teepublic', name: 'TeePublic', icon: 'Shirt' },
  { id: 'pinterest', name: 'Pinterest', icon: 'MapPin' },
  { id: 'facebook', name: 'Facebook', icon: 'Users' },
  { id: 'reddit', name: 'Reddit', icon: 'MessageSquare' },
  { id: 'plaintext', name: 'Plain Text', icon: 'FileText' },
  { id: 'markdown', name: 'Markdown', icon: 'Hash' },
];

// Icon component mapping
const iconComponents = {
  Music,
  Camera,
  Video,
  ShoppingBag,
  MessageCircle,
  Briefcase,
  Shirt,
  MapPin,
  Users,
  MessageSquare,
  FileText,
  Hash
};

let usage = { today:{in:0,out:0,cost:0}, week:{in:0,out:0,cost:0}, month:{in:0,out:0,cost:0}, tz:'UTC' };

async function loadUsage() {
  if (!browser) return; 
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const res = await fetch(`/api/usage/summary?tz=${encodeURIComponent(tz)}`);
  if (res.ok) usage = await res.json();
}

// New Project creation function
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
        icon: newProjectIcon,
        color: newProjectColor
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
    showNewProjectModal = false;
    newProjectName = ''; createProjectErr = '';

    // Refresh projects and select the new one
    await reloadProjects(project.id);

  } catch (e) {
    createProjectErr = e.message || 'Failed to create project';
    creatingProject = false;
  }
}

// Rainbow colors for branches
const RAINBOW_COLORS = [
  { bg: 'bg-white', border: 'border-gray-200', name: 'Main' },        // Main branch
  { bg: 'bg-red-50', border: 'border-red-200', name: 'Red' },         // Red
  { bg: 'bg-orange-50', border: 'border-orange-200', name: 'Orange' }, // Orange  
  { bg: 'bg-yellow-50', border: 'border-yellow-200', name: 'Yellow' }, // Yellow
  { bg: 'bg-green-50', border: 'border-green-200', name: 'Green' },    // Green
  { bg: 'bg-blue-50', border: 'border-blue-200', name: 'Blue' },       // Blue
  { bg: 'bg-indigo-50', border: 'border-indigo-200', name: 'Indigo' }, // Indigo
  { bg: 'bg-purple-50', border: 'border-purple-200', name: 'Purple' }, // Purple
  { bg: 'bg-pink-50', border: 'border-pink-200', name: 'Pink' }        // Pink
];


// Event handlers for components
function handleProjectSelect(event) {
  selectProjectById(event.detail.id);
}


function handleProjectDelete(event) {
  deleteProject(event.detail);
}

function handleFactAdd(event) {
  const { type, key, value, tags } = event.detail;
  factType = type;
  factKey = key;
  factValue = value;
  factTags = tags ? tags.join(', ') : '';
  addFact();
}

function handleFactStartEdit(event) {
  startEditFact(event.detail.fact, event.detail.index);
}

function handleFactCancelEdit(event) {
  cancelEditFact(event.detail.fact, event.detail.index);
}

function handleFactSaveEdit(event) {
  saveFactEdit(event.detail.fact, event.detail.editData);
}

function handleFactDelete(event) {
  deleteFact(event.detail.fact, event.detail.index);
}

function handleFactTogglePin(event) {
  toggleFactPin(event.detail);
}

function handleDocAdd(event) {
  const { title, content, tags } = event.detail;
  docTitle = title;
  docContent = content;
  docTags = tags ? tags.join(', ') : '';
  addDoc();
}

function handleDocStartEdit(event) {
  startEditDoc(event.detail.doc, event.detail.index);
}

function handleDocCancelEdit(event) {
  cancelEditDoc(event.detail.doc, event.detail.index);
}

function handleDocSaveEdit(event) {
  saveDocEdit(event.detail.doc, event.detail.editData);
}

function handleDocDelete(event) {
  deleteDoc(event.detail.doc, event.detail.index);
}

function handleDocTogglePin(event) {
  toggleDocPin(event.detail);
}

function handleSwitchToBranch(event) {
  console.log('Parent: handleSwitchToBranch called with event.detail:', event.detail);
  switchToBranch(event.detail);
}

function handleOpenFormatModal(event) {
  openFormatModal(event.detail);
}

function handleOpenBranchModal(event) {
  openBranchModal(event.detail);
}

function handleFormatModalClose() {
  closeFormatModal();
}

function handleFormatForPlatform(event) {
  formatForPlatform(event.detail);
}

function handleCopyToClipboard(event) {
  copyToClipboard(event.detail);
}

function handleBranchModalClose() {
  closeBranchModal();
}

function handleCreateBranch(event) {
  newBranchName = event.detail;
  createBranch();
}

function handleNewProjectModalClose() {
  showNewProjectModal = false;
  newProjectName = '';
  createProjectErr = '';
}

function handleCreateProject(event) {
  const { name, icon, color } = event.detail;
  newProjectName = name;
  newProjectIcon = icon;
  newProjectColor = color;
  createProject();
}

function handleProjectOpenSettings(event) {
  settingsProject = event.detail;
  showSettingsModal = true;
}

function handleSettingsModalClose() {
  // Close the modal
  showSettingsModal = false;
  settingsProject = null;
  
  // Refresh fact types in the Sidebar to ensure they are up-to-date
  if (sidebarComponent && activeTab === 'facts') {
    sidebarComponent.refreshFactTypes();
  }
}

async function handleBranchRenamed(event) {
  // Reload branches to get updated branch info
  await loadBranches();
}

async function handleBranchDeleted(event) {
  // Switch to main branch and reload branches
  await switchToBranch('main');
  await loadBranches();
}

// Ideas Column event handlers
async function handleQuestionsUpdate(event) {
  goodQuestions = event.detail.questions;
  // Save to database
  if (current) {
    try {
      const res = await fetch(`/api/projects/${current.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_all',
          questions: goodQuestions
        })
      });
      
      if (!res.ok) {
        console.error('Failed to save questions:', await res.text());
        // Could show user notification here
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      // Could show user notification here
    }
  }
}

function handleInsertText(event) {
  // Insert text into the chat input
  const textToInsert = event.detail.text;
  if (input) {
    input += (input ? ' ' : '') + textToInsert;
  } else {
    input = textToInsert;
  }
  
  // Focus the chat input (we'll need to dispatch this to ChatInterface)
  if (browser) {
    window.dispatchEvent(new CustomEvent('focus-chat-input'));
  }
}

async function handleGenerateIdeas() {
  if (!current || isGeneratingIdeas) return;
  
  isGeneratingIdeas = true;
  
  try {
    // Get count of liked ideas and dismissed ideas from localStorage
    let likedIdeasCount = 0;
    let dismissedIdeas = [];
    try {
      const liked = localStorage.getItem(`liked_ideas_${current.id}`);
      if (liked) {
        const likedIdeas = JSON.parse(liked);
        likedIdeasCount = likedIdeas.length;
      }
      
      const dismissed = localStorage.getItem(`dismissed_ideas_${current.id}`);
      if (dismissed) {
        dismissedIdeas = JSON.parse(dismissed);
      }
    } catch (error) {
      console.error('Error reading ideas from localStorage:', error);
    }
    
    const res = await fetch('/api/generate-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: current.id,
        facts: facts.slice(0, 10), // Send first 10 facts for context
        docs: docs.slice(0, 5),    // Send first 5 docs for context
        recentMessages: messages.slice(-5), // Send last 5 messages for context
        likedIdeasCount: likedIdeasCount, // Send count of already liked ideas
        dismissedIdeas: dismissedIdeas // Send dismissed ideas to avoid regenerating
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      relatedIdeas = data.ideas || [];
    } else {
      console.error('Failed to generate ideas:', await res.text());
      relatedIdeas = ['Error generating ideas. Please try again.'];
    }
  } catch (error) {
    console.error('Error generating ideas:', error);
    relatedIdeas = ['Network error. Please try again.'];
  } finally {
    isGeneratingIdeas = false;
  }
}

// Text selection handlers from ChatInterface
function handleTextAddToFacts(event) {
  const text = event.detail.text;
  // Auto-populate fact form with selected text
  factKey = text.length > 50 ? text.substring(0, 50) + '...' : text;
  factValue = text;
  factType = 'note'; // Default type for selected text
  showAddFactForm = true;
  // Switch to facts tab
  activeTab = 'facts';
}

function handleTextAddToDocs(event) {
  const text = event.detail.text;
  // Auto-populate doc form with selected text
  docTitle = text.length > 100 ? text.substring(0, 100) + '...' : text;
  docContent = text;
  showAddDocForm = true;
  // Switch to docs tab
  activeTab = 'docs';
}

  function handleTextAddToQuestions(event) {
    const text = event.detail.text;
    // Add to good questions list
    if (text && !goodQuestions.includes(text)) {
      goodQuestions = [...goodQuestions, text];
      // Save to database
      if (current) {
        handleQuestionsUpdate({ detail: { questions: goodQuestions } });
      }
    }
  }

  function handleFormatText(event) {
    const text = event.detail.text;
    // Open format modal with selected text
    selectedText = text;
    showFormatModal = true;
    formattedContent = '';
    selectedPlatform = '';
    selectedMessageIndex = -1; // Since this is selected text, not a full message
  }

  // Panel toggle functions - independent on mobile, desktop shows both by default
  function toggleLeftPanel() {
    showLeftPanel = !showLeftPanel;
    // Only close right panel on mobile/tablet (not desktop)
    if (!isDesktop && showLeftPanel && showRightPanel) {
      showRightPanel = false;
    }
  }

  function toggleRightPanel() {
    showRightPanel = !showRightPanel;
    // Only close left panel on mobile/tablet (not desktop)
    if (!isDesktop && showRightPanel && showLeftPanel) {
      showLeftPanel = false;
    }
  }
  
  // Global search event handlers
  function handleSearchActivateTab(event) {
    const tabName = event.detail;
    if (tabName === 'facts' || tabName === 'docs') {
      activeTab = tabName;
      showLeftPanel = true;
      // On mobile, close right panel if both are open
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (tabName === 'questions' || tabName === 'ideas') {
      showRightPanel = true;
      // On mobile, close left panel if both are open
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    }
  }
  
  function handleSearchFilter(event) {
    const { type, query } = event.detail;
    
    // Set the search term for all components
    search = query;
    
    if (type === 'facts') {
      activeTab = 'facts';
      showLeftPanel = true;
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (type === 'docs') {
      activeTab = 'docs';
      showLeftPanel = true;
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (type === 'questions') {
      showRightPanel = true;
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    } else if (type === 'ideas') {
      showRightPanel = true;
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    }
  }
  
  function handleSearchNavigateChat(event) {
    const { messageId, branchId } = event.detail;
    // Switch to the appropriate branch if needed
    if (branchId && branchId !== currentBranchId) {
      switchToBranch(branchId);
    }
    // Scroll to the message (we could enhance ChatInterface to support this)
    // For now, just ensure the message is visible by switching branches
  }
  
  function handleSearchClear(event) {
    // Clear any active search filters
    search = '';
    // Could also clear filters in other components if needed
  }
</script>

<!-- Layout -->
<div class="flex h-[calc(100vh-4rem)] relative overflow-hidden">
  
  <!-- LEFT PANEL: Facts/Docs -->
  <div class="{showLeftPanel ? (isDesktop ? 'flex-1' : 'w-80') : 'w-0'} transition-all duration-300 ease-in-out bg-gray-50 border-r overflow-hidden flex-shrink-0">
    {#if showLeftPanel}
      <Sidebar 
        bind:this={sidebarComponent}
        {current}
        {facts}
        {docs}
        {loadingFacts}
        {search}
        bind:showAddFactForm
        bind:factType
        bind:factKey
        bind:factValue
        bind:factTags
        bind:showAddDocForm
        bind:docTitle
        bind:docContent
        bind:docTags
        bind:activeTab
        on:brief-regenerate={regenerateBrief}
        on:fact-add={handleFactAdd}
        on:fact-cancel-add={() => { factKey = ''; factValue = ''; factTags = ''; }}
        on:fact-start-edit={handleFactStartEdit}
        on:fact-cancel-edit={handleFactCancelEdit}
        on:fact-save-edit={handleFactSaveEdit}
        on:fact-delete={handleFactDelete}
        on:fact-toggle-pin={handleFactTogglePin}
        on:doc-add={handleDocAdd}
        on:doc-cancel-add={() => { docTitle = ''; docContent = ''; docTags = ''; }}
        on:doc-start-edit={handleDocStartEdit}
        on:doc-cancel-edit={handleDocCancelEdit}
        on:doc-save-edit={handleDocSaveEdit}
        on:doc-delete={handleDocDelete}
        on:doc-toggle-pin={handleDocTogglePin}
      />
    {/if}
  </div>

  <!-- Left Toggle Button (Mobile/Tablet Only) -->
  <div class="absolute left-0 top-1/2 -translate-y-1/2 z-30 flex items-center lg:hidden">
    <button 
      class="bg-white border border-gray-300 rounded-r-lg px-3 py-6 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center gap-2 min-w-[60px] {showLeftPanel ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}" 
      on:click={toggleLeftPanel}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{showLeftPanel ? 'text-blue-600' : 'text-gray-600'}">
        {#if showLeftPanel}
          <path d="M15 18l-6-6 6-6"/>
        {:else}
          <path d="M9 18l6-6-6-6"/>
        {/if}
      </svg>
      <div class="text-xs font-medium text-center leading-tight {showLeftPanel ? 'text-blue-700' : 'text-gray-700'}">
        Facts<br/>& Docs
      </div>
    </button>
  </div>

  <!-- Right Toggle Button (Mobile/Tablet Only) -->
  <div class="absolute right-0 top-1/2 -translate-y-1/2 z-30 flex items-center lg:hidden">
    <button 
      class="bg-white border border-gray-300 rounded-l-lg px-3 py-6 shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center gap-2 min-w-[60px] {showRightPanel ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'}" 
      on:click={toggleRightPanel}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="{showRightPanel ? 'text-purple-600' : 'text-gray-600'}">
        {#if showRightPanel}
          <path d="M9 18l6-6-6-6"/>
        {:else}
          <path d="M15 18l-6-6 6-6"/>
        {/if}
      </svg>
      <div class="text-xs font-medium text-center leading-tight {showRightPanel ? 'text-purple-700' : 'text-gray-700'}">
        Questions & Ideas
      </div>
    </button>
  </div>

  <!-- MAIN AREA: Chat (Center) -->
  <div class="flex-1 flex justify-center relative">
    <!-- Chat Container -->
    <div class="w-full flex flex-col relative">

    <ChatInterface 
      {current}
      {messages}
      {loadingMessages}
      bind:input
      bind:modelKey
      {branches}
      {currentBranch}
      {currentBranchId}
      {usage}
      bind:showUsageStats
      on:send={send}
      on:switch-branch={handleSwitchToBranch}
      on:open-format-modal={handleOpenFormatModal}
      on:open-branch-modal={handleOpenBranchModal}
      on:branch-renamed={handleBranchRenamed}
      on:branch-deleted={handleBranchDeleted}
      on:add-to-facts={handleTextAddToFacts}
      on:add-to-docs={handleTextAddToDocs}
      on:add-to-questions={handleTextAddToQuestions}
      on:format-text={handleFormatText}
    />
    </div>
  </div>

  <!-- RIGHT PANEL: Questions/Ideas -->
  <div class="{showRightPanel ? (isDesktop ? 'flex-1' : 'w-80') : 'w-0'} transition-all duration-300 ease-in-out bg-zinc-50 border-l overflow-hidden flex-shrink-0">
    {#if showRightPanel}
      <IdeasColumn 
        {goodQuestions}
        {relatedIdeas}
        {isGeneratingIdeas}
        {search}
        projectId={current?.id}
        on:questions-update={handleQuestionsUpdate}
        on:insert-text={handleInsertText}
        on:generate-ideas={handleGenerateIdeas}
      />
    {/if}
  </div>
</div>

<!-- Modals -->
<FormatModal 
  {showFormatModal}
  {selectedText}
  {selectedPlatform}
  {formattedContent}
  {isFormatting}
  on:close={handleFormatModalClose}
  on:format={handleFormatForPlatform}
  on:copy={handleCopyToClipboard}
/>

<BranchModal
  {showBranchModal}
  {branchModalMessageIndex}
  {newBranchName}
  {isCreatingBranch}
  {messages}
  branches={messageBranches}
  {currentBranchId}
  createError={branchCreateError}
  on:close={handleBranchModalClose}
  on:create={handleCreateBranch}
  on:switch-branch={handleSwitchToBranch}
/>

<NewProjectModal
  {showNewProjectModal}
  {newProjectName}
  {newProjectIcon}
  {newProjectColor}
  {creatingProject}
  {createProjectErr}
  on:close={handleNewProjectModalClose}
  on:create={handleCreateProject}
/>

<SettingsModal
  {showSettingsModal}
  project={settingsProject}
  on:close={handleSettingsModalClose}
/>

