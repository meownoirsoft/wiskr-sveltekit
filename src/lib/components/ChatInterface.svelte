<script>
  import { createEventDispatcher, tick } from 'svelte';
  import { marked } from 'marked';
  import { Clipboard, GitBranch, Edit2, Trash2, Check, X, Type, MousePointer2 } from 'lucide-svelte';
  import TextSelectionMenu from './TextSelectionMenu.svelte';
  import { getModelFriendlyName } from '$lib/client/modelHelpers.js';

  export let current = null;
  export let messages = [];
  export let loadingMessages = false;
  export let input = '';
  export let modelKey = 'speed';
  export let branches = [];
  export let currentBranch = null;
  export let currentBranchId = 'main';
  export let usage = null;
  export let showUsageStats = false;

  const dispatch = createEventDispatcher();
  let chatContainer;
  let messageBranchCounts = {}; // Store branch counts per message
  let availableModels = []; // Store available AI models
  
  // Branch management state
  let isEditingBranch = false;
  let editBranchName = '';
  let isSavingBranchName = false;
  let isDeletingBranch = false;

  // Configure marked for better rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  // Rainbow colors for branches
  const RAINBOW_COLORS = [
    { bg: 'bg-white', border: 'border-gray-200', accent: 'border-l-gray-300', name: 'Main' },
    { bg: 'bg-red-50', border: 'border-red-200', accent: 'border-l-red-400', name: 'Red' },
    { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'border-l-orange-400', name: 'Orange' },
    { bg: 'bg-yellow-50', border: 'border-yellow-200', accent: 'border-l-yellow-400', name: 'Yellow' },
    { bg: 'bg-green-50', border: 'border-green-200', accent: 'border-l-green-400', name: 'Green' },
    { bg: 'bg-blue-50', border: 'border-blue-200', accent: 'border-l-blue-400', name: 'Blue' },
    { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'border-l-indigo-400', name: 'Indigo' },
    { bg: 'bg-purple-50', border: 'border-purple-200', accent: 'border-l-purple-400', name: 'Purple' },
    { bg: 'bg-pink-50', border: 'border-pink-200', accent: 'border-l-pink-400', name: 'Pink' }
  ];

  function renderMarkdown(content) {
    if (!content || typeof content !== 'string') return '';
    return marked(content);
  }

  function getBranchColor(branch) {
    if (!branch) return RAINBOW_COLORS[0];
    return RAINBOW_COLORS[branch.color_index % RAINBOW_COLORS.length];
  }

  function scrollToBottom() {
    if (chatContainer) {
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 100);
    }
  }

  // Auto-scroll when messages change
  $: if (messages && messages.length > 0) {
    scrollToBottom();
  }

  function send() {
    if (!current || !input.trim()) return;
    dispatch('send', { message: input.trim() });
  }

  function switchToBranch(event) {
    console.log('ChatInterface: switchToBranch called with:', event.target.value);
    dispatch('switch-branch', event.target.value);
  }

  function openFormatModal(index) {
    dispatch('open-format-modal', index);
  }

  function openBranchModal(index) {
    dispatch('open-branch-modal', index);
  }

  function toggleUsageStats() {
    showUsageStats = !showUsageStats;
  }

  // Load available AI models from the API
  async function loadAvailableModels() {
    try {
      const res = await fetch('/api/models');
      if (res.ok) {
        const data = await res.json();
        availableModels = data.models || [];
      } else {
        console.error('Failed to load models');
        // Fallback to hardcoded options
        availableModels = [
          { key: 'speed', name: 'Speed (GPT-4o-mini)', provider: 'openai' },
          { key: 'quality', name: 'Quality (GPT-4o)', provider: 'openai' }
        ];
      }
    } catch (error) {
      console.error('Error loading models:', error);
      // Fallback to hardcoded options
      availableModels = [
        { key: 'speed', name: 'Speed (GPT-4o-mini)', provider: 'openai' },
        { key: 'quality', name: 'Quality (GPT-4o)', provider: 'openai' }
      ];
    }
  }

  // Load branch counts for all messages in a single efficient API call
  async function loadMessageBranchCounts() {
    if (!current) {
      messageBranchCounts = {};
      return;
    }
    
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getBranchCounts', 
          projectId: current.id
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        messageBranchCounts = data.counts || {};
      } else {
        console.error('Failed to load branch counts');
        messageBranchCounts = {};
      }
    } catch (error) {
      console.error('Error loading branch counts:', error);
      messageBranchCounts = {};
    }
  }
  
  // Load branch counts when messages or current project change
  $: if (current && messages.length > 0) {
    loadMessageBranchCounts();
  }
  
  // Listen for branch updates
  function handleBranchesUpdated() {
    loadMessageBranchCounts();
  }
  
  // Add event listener for branch updates on mount
  import { onMount as onMountChatInterface } from 'svelte';
  onMountChatInterface(() => {
    // Load available models on mount
    loadAvailableModels();
    
    window.addEventListener('branches-updated', handleBranchesUpdated);
    return () => {
      window.removeEventListener('branches-updated', handleBranchesUpdated);
    };
  });
  
  // Branch management functions
  function startEditingBranch() {
    if (currentBranch && currentBranchId !== 'main') {
      isEditingBranch = true;
      editBranchName = currentBranch.branch_name || '';
    }
  }
  
  function cancelEditingBranch() {
    isEditingBranch = false;
    editBranchName = '';
  }
  
  async function saveBranchName() {
    if (!current || !currentBranch || !editBranchName.trim() || currentBranchId === 'main') return;
    
    isSavingBranchName = true;
    
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          projectId: current.id,
          branchId: currentBranchId,
          newName: editBranchName.trim()
        })
      });
      
      if (res.ok) {
        // Dispatch event to parent to reload branches
        dispatch('branch-renamed', { branchId: currentBranchId, newName: editBranchName.trim() });
        isEditingBranch = false;
        editBranchName = '';
      } else {
        const error = await res.text();
        console.error('Failed to rename branch:', error);
        alert('Failed to rename branch. Please try again.');
      }
    } catch (error) {
      console.error('Error renaming branch:', error);
      alert('Error renaming branch. Please try again.');
    } finally {
      isSavingBranchName = false;
    }
  }
  
  async function deleteBranch() {
    if (!current || !currentBranch || currentBranchId === 'main') return;
    
    if (!confirm(`Are you sure you want to delete the branch "${currentBranch.branch_name}"? This action cannot be undone.`)) {
      return;
    }
    
    isDeletingBranch = true;
    
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          projectId: current.id,
          branchId: currentBranchId
        })
      });
      
      if (res.ok) {
        // Dispatch event to parent to switch to main and reload branches
        dispatch('branch-deleted', { branchId: currentBranchId });
      } else {
        const error = await res.text();
        console.error('Failed to delete branch:', error);
        alert('Failed to delete branch. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting branch:', error);
      alert('Error deleting branch. Please try again.');
    } finally {
      isDeletingBranch = false;
    }
  }

  // Text selection handlers
  function handleAddToFacts(event) {
    dispatch('add-to-facts', event.detail);
  }

  function handleAddToDocs(event) {
    dispatch('add-to-docs', event.detail);
  }

  function handleAddToQuestions(event) {
    dispatch('add-to-questions', event.detail);
  }

  function handleFormatText(event) {
    dispatch('format-text', event.detail);
  }

  function selectAllMessage(messageIndex) {
    const message = messages[messageIndex];
    if (message && message.role === 'assistant' && message.content.trim()) {
      // Dispatch the format-text event directly with the full message content
      dispatch('format-text', { text: message.content.trim() });
    }
  }
</script>

<main class="flex flex-col bg-white h-full overflow-hidden mobile-chat">
  <!-- Branch Navigation Bar -->
  {#if current && branches.length > 0}
    <div class="bg-gray-50 border-gray-200 border-b px-4 py-2 flex-shrink-0">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium text-gray-700">Branch:</span>
          
          {#if isEditingBranch}
            <!-- Edit mode -->
            <div class="flex items-center gap-2">
              <input 
                type="text" 
                bind:value={editBranchName}
                class="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxlength="100"
                disabled={isSavingBranchName}
              />
              <button
                class="p-1 text-green-600 hover:text-green-800 disabled:opacity-50"
                on:click={saveBranchName}
                disabled={isSavingBranchName || !editBranchName.trim()}
                title="Save"
              >
                {#if isSavingBranchName}
                  <div class="animate-spin rounded-full h-3 w-3 border-2 border-green-600 border-t-transparent"></div>
                {:else}
                  <Check size="16" />
                {/if}
              </button>
              <button
                class="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
                on:click={cancelEditingBranch}
                disabled={isSavingBranchName}
                title="Cancel"
              >
                <X size="16" />
              </button>
            </div>
          {:else}
            <!-- Normal mode -->
            <select 
              class="bg-transparent border-none text-sm font-medium text-gray-800 cursor-pointer focus:outline-none"
              bind:value={currentBranchId} 
              on:change={switchToBranch}
              disabled={isDeletingBranch}
            >
              {#each branches as branch}
                <option value={branch.branch_id}>{branch.branch_name}</option>
              {/each}
            </select>
            
            <!-- Branch management buttons (only show for non-main branches) -->
            {#if currentBranch && currentBranchId !== 'main'}
              <div class="flex items-center gap-1">
                <button
                  class="p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  on:click={startEditingBranch}
                  disabled={isDeletingBranch}
                  title="Edit branch name"
                >
                  <Edit2 size="14" />
                </button>
                <button
                  class="p-1 text-red-600 hover:text-red-800 disabled:opacity-50"
                  on:click={deleteBranch}
                  disabled={isDeletingBranch}
                  title="Delete branch"
                >
                  {#if isDeletingBranch}
                    <div class="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent"></div>
                  {:else}
                    <Trash2 size="14" />
                  {/if}
                </button>
              </div>
            {/if}
          {/if}
        </div>
        
        <!-- <div class="text-xs text-gray-600">
          {branches.length} branch{branches.length === 1 ? '' : 'es'}
        </div> -->
      </div>
    </div>
  {/if}
  
  <!-- Chat Messages (scrollable) -->
  <div class="flex-1 overflow-y-auto p-4 space-y-3" bind:this={chatContainer}>
    {#if !current}
      <p>Select a project to start chatting.</p>
    {:else if loadingMessages}
      <div class="text-center text-zinc-500 py-8">
        <div class="inline-flex items-center gap-3">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 border-t-blue-500"></div>
          <div class="text-sm">Loading conversation history...</div>
        </div>
      </div>
    {:else if messages.length === 0}
      <div class="text-center text-zinc-500 py-8">
        <div class="text-sm">No conversation history yet.</div>
        <div class="text-xs mt-1">Start chatting to build context with this project!</div>
      </div>
    {:else}
      {#each messages as m, index}
        {@const branchColor = getBranchColor(currentBranch)}
        <div class="{m.role === 'user' ? 'max-w-2xl ml-auto' : 'max-w-4xl group'}">
          <div class="text-sm font-medium text-zinc-600 mb-1 {m.role === 'user' ? 'text-right' : ''}">
            {#if m.role === 'user'}
              You
            {:else}
              {m.model_key ? getModelFriendlyName(m.model_key) : 'Assistant'}
            {/if}
            {#if index === 0}
              <span class="text-xs text-zinc-400 font-normal ml-2">• conversation start</span>
            {/if}
          </div>
          <div class="rounded-lg p-3 border border-l-4 transition-colors relative {m.role === 'user' ? `bg-blue-50 border-blue-200 ml-8 whitespace-pre-wrap ${branchColor.accent}` : `bg-gray-50 border-gray-200 mr-8 assistant-message ${branchColor.accent}`}">
            {#if m.role === 'assistant'}
              <div class="prose prose-sm max-w-none">
                {@html renderMarkdown(m.content)}
              </div>
              <!-- Select All button for assistant messages (bottom right) -->
              <button
                class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity bg-white border border-gray-300 rounded px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-50 shadow-sm"
                on:click={() => selectAllMessage(index)}
                title="Select all and format & post"
              >
                <MousePointer2 size="12" class="inline mr-1" />
                Select All
              </button>
            {:else}
              {m.content}
            {/if}
          </div>
          <div class="flex justify-between items-center {m.role === 'user' ? '' : 'mr-8'} mt-2 gap-2">
            <!-- Highlight-to-add feature hint (only for assistant messages) -->
            {#if m.role === 'assistant' && m.content.trim()}
              <div class="flex items-center gap-2 text-sm text-gray-500 italic">
                <Type size="16" />
                Highlight text to capture, or format & post
              </div>
            {:else}
              <div></div>
            {/if}
            
            <div class="flex gap-2">
              {#if m.content.trim() && currentBranchId === 'main'}
                {@const messageBranchCount = messageBranchCounts[m.id] || 0}
                <button
                  class="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 px-2 py-1 rounded border border-green-200 hover:bg-green-50 transition-colors relative"
                  on:click={() => openBranchModal(index)}
                  title="Create new branch from here"
                >
                  <GitBranch size="12" />
                  Branch
                  {#if messageBranchCount > 0}
                    <span class="bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center leading-none ml-1">
                      {messageBranchCount}
                    </span>
                  {/if}
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Fixed Ask Form at Bottom -->
  <div class="flex-shrink-0 bg-white">
    <!-- Usage Stats (if enabled) -->
    {#if usage && showUsageStats}
      <div class="px-3 border-t">
        <div class="text-xs text-zinc-500 space-y-1 py-2">
          <div class="text-zinc-600 font-medium mb-1">Total Usage (All Projects):</div>
          <div>Today: {usage.today.in.toLocaleString()} in / {usage.today.out.toLocaleString()} out · ${usage.today.cost.toFixed(4)}</div>
          <div>Last 7 days: {usage.week.in.toLocaleString()} in / {usage.week.out.toLocaleString()} out · ${usage.week.cost.toFixed(4)}</div>
          <div>This month: {usage.month.in.toLocaleString()} in / {usage.month.out.toLocaleString()} out · ${usage.month.cost.toFixed(4)}</div>
        </div>
      </div>
    {/if}
    
    <!-- Ask Form -->
    <div class="border-t">
      <!-- Top Row: Usage Button and Model Selection -->
      <div class="px-3 pt-2 pb-1 flex justify-between items-center">
        {#if usage}
          <button 
            type="button"
            class="text-xs text-blue-600 hover:text-blue-800 underline" 
            on:click={toggleUsageStats}
          >
            {showUsageStats ? 'Hide Usage Info' : 'Usage Info'}
          </button>
        {:else}
          <div></div>
        {/if}
        
        <div class="flex items-center gap-2">
          <label for="model-select" class="text-xs text-zinc-500">Model:</label>
          <select class="border rounded p-1 text-xs min-w-[280px]" bind:value={modelKey} disabled={!current}>
            {#if availableModels.length > 0}
              {#each availableModels as model}
                <option value={model.key} title={`${model.name} (${model.provider})\n${model.category}\nInput: $${model.costPer1kTokens.input}/1k • Output: $${model.costPer1kTokens.output}/1k`}>
                  {#if model.key === 'speed'}
                    🚀 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key === 'quality'}
                    ⭐ {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key === 'micro'}
                    💰 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key === 'claude-opus'}
                    👑 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key.startsWith('gpt')}
                    🤖 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key.startsWith('llama')}
                    🦙 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key.startsWith('gemini')}
                    💎 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key.startsWith('mistral')}
                    🌪️ {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key.startsWith('qwen')}
                    🏮 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else if model.key.startsWith('deepseek')}
                    🌊 {model.name.split('/')[1] || model.name} • {model.tier}
                  {:else}
                    🔬 {model.name.split('/')[1] || model.name} • {model.tier || 'Standard'}
                  {/if}
                </option>
              {/each}
            {:else}
              <!-- Fallback options while models are loading -->
              <option value="speed">🚀 Loading models...</option>
              <option value="quality">⭐ Loading models...</option>
            {/if}
          </select>
        </div>
      </div>
      
      <!-- Input and Send -->
      <form class="px-3 pb-3 flex gap-2 items-start" on:submit|preventDefault={send}>
        <textarea class="border rounded p-2 w-full resize-none" rows="3" bind:value={input} placeholder={current ? "Ask…" : "Pick a project"} disabled={!current}></textarea>
        <button class="border rounded px-3 py-2" type="submit" disabled={!current || !input.trim()}>Wisk Away!</button>
      </form>
    </div>
  </div>
</main>

<!-- Text Selection Menu -->
<TextSelectionMenu 
  projectId={current?.id}
  on:add-to-facts={handleAddToFacts}
  on:add-to-docs={handleAddToDocs}
  on:add-to-questions={handleAddToQuestions}
  on:format-text={handleFormatText}
/>

