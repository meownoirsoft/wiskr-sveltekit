<script>
  import { createEventDispatcher } from 'svelte';
  import { Calendar, MessageSquare, Plus, Settings, Trash2, Edit3, GitBranch } from 'lucide-svelte';
  
  export let sessions = [];
  export let currentSession = null;
  export let projectId = null;
  export const isVisible = false;
  export let isMobile = false;
  export let branches = [];
  export let currentBranchId = 'main';
  export let currentBranch = null;
  export let onClosePanel = null; // Function to close the panel

  const dispatch = createEventDispatcher();

  // Local state for creating new sessions
  let showNewSessionForm = false;
  let newSessionName = '';
  let isCreatingSession = false;
  let createError = '';

  // Local state for editing sessions
  let editingSessionId = null;
  let editingSessionName = '';

  function formatDate(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      // Format as "Mon, Jan 15"
      return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  function formatTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  function selectSession(session) {
    dispatch('select-session', session);
  }

  async function createSession() {
    if (!newSessionName.trim() || isCreatingSession) return;
    
    isCreatingSession = true;
    createError = '';
    
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId,
          sessionName: newSessionName.trim()
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        dispatch('session-created', data.session);
        // Reset form
        showNewSessionForm = false;
        newSessionName = '';
      } else {
        const error = await res.json();
        createError = error.error || 'Failed to create session';
      }
    } catch (error) {
      createError = 'Network error occurred';
    } finally {
      isCreatingSession = false;
    }
  }

  function startEditSession(session) {
    editingSessionId = session.id;
    editingSessionName = session.session_name;
  }

  function cancelEdit() {
    editingSessionId = null;
    editingSessionName = '';
  }

  async function saveEdit(sessionId) {
    if (!editingSessionName.trim()) return;
    
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          projectId,
          sessionId,
          sessionName: editingSessionName.trim()
        })
      });
      
      if (res.ok) {
        dispatch('session-updated');
        cancelEdit();
      }
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  }

  async function deleteSession(session) {
    if (!confirm(`Delete "${session.session_name}"? This will delete all messages and branches in this session.`)) {
      return;
    }
    
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          projectId,
          sessionId: session.id
        })
      });
      
      if (res.ok) {
        dispatch('session-deleted', session);
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to delete session');
      }
    } catch (error) {
      alert('Network error occurred');
    }
  }

  function onKeydown(event, action, ...args) {
    if (event.key === 'Enter') {
      event.preventDefault();
      action(...args);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (editingSessionId) cancelEdit();
    }
  }
</script>

<!-- Session Navigator Sidebar -->
<div class="border-r border-gray-200 dark:border-gray-700 flex flex-col {isMobile ? 'w-full' : 'w-80'} overflow-hidden shadow-lg" style="background-color: var(--bg-sessions-panel); height: calc(100vh - 4rem);">
  
  <!-- Split Layout: Chats (Top) and Branches (Bottom) -->
  <div class="grid grid-rows-2" style="height: calc(100vh - 4rem);">
    
    <!-- TOP HALF: Chats Section -->
    <div class="flex flex-col border-b border-gray-200 dark:border-gray-700">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center justify-between">
          <h3 class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare size="18" />
            Chats
          </h3>
          <button
            class="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
            title="New Chat"
            on:click={() => showNewSessionForm = true}
          >
            <Plus size="18" />
          </button>
        </div>

        <!-- New Session Form -->
        {#if showNewSessionForm}
          <div class="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <input
              type="text"
              class="w-full text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-md px-2 py-1 mb-2"
              placeholder="Chat name"
              bind:value={newSessionName}
              on:keydown={(e) => onKeydown(e, createSession)}
              disabled={isCreatingSession}
            />
            {#if createError}
              <div class="text-xs text-red-600 mb-2">{createError}</div>
            {/if}
            <div class="flex items-center gap-2">
              <button
                class="text-xs px-2 py-1 bg-blue-600 text-white rounded disabled:opacity-50"
                on:click={createSession}
                disabled={isCreatingSession || !newSessionName.trim()}
              >
                {isCreatingSession ? 'Creating...' : 'Create'}
              </button>
              <button
                class="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-600"
                on:click={() => {
                  showNewSessionForm = false;
                  newSessionName = '';
                  createError = '';
                }}
                disabled={isCreatingSession}
              >
                Cancel
              </button>
            </div>
          </div>
        {/if}
      </div>

      <!-- Sessions List -->
      <div class="flex-1 overflow-y-auto">
        {#if sessions.length === 0}
          <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No chats yet. Create your first one!
          </div>
        {:else}
          {#each sessions as session}
            <div 
              class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors group session-item"
              style="background-color: {currentSession?.id === session.id ? 'var(--color-accent-light)' : ''}; border-color: {currentSession?.id === session.id ? 'var(--color-accent-border)' : ''};"
              role="button"
              tabindex="0"
              aria-pressed={currentSession?.id === session.id}
              on:click={() => {
                selectSession(session);
                if (onClosePanel) onClosePanel();
              }}
              on:keydown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectSession(session);
                  if (onClosePanel) onClosePanel();
                }
              }}
            >
              <!-- Session Header -->
              <div class="flex items-start justify-between">
                <div class="flex-1 min-w-0">
                  {#if editingSessionId === session.id}
                    <input
                      type="text"
                      class="text-sm font-medium w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5"
                      bind:value={editingSessionName}
                      on:keydown={(e) => onKeydown(e, saveEdit, session.id)}
                      on:blur={() => saveEdit(session.id)}
                    />
                  {:else}
                    <h4 class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {session.session_name}
                    </h4>
                  {/if}

                  <div class="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <Calendar size="16" />
                    <span>{formatDate(session.session_date)}</span>
                    <span>•</span>
                    <MessageSquare size="16" />
                    <span>{session.message_count} msg{session.message_count !== 1 ? 's' : ''}</span>
                  </div>

                  {#if session.topic_summary}
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                      {session.topic_summary}
                    </p>
                  {/if}
                </div>

                <!-- Right side: Last Activity and Session Actions -->
                <div class="flex flex-col items-end gap-1 ml-2">
                  <!-- Last Activity -->
                  <div class="text-xs text-gray-400 dark:text-gray-500">
                    {formatTime(session.updated_at)}
                  </div>
                  
                  <!-- Session Actions -->
                  <div class="flex items-center gap-1 session-actions opacity-0 transition-opacity duration-200">
                    <button
                      class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400"
                      title="Edit Chat"
                      on:click|stopPropagation={() => startEditSession(session)}
                    >
                      <Edit3 size="16" />
                    </button>
                    <button
                      class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-red-600 dark:text-red-400"
                      title="Delete Chat"
                      on:click|stopPropagation={() => deleteSession(session)}
                    >
                      <Trash2 size="16" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>

    <!-- BOTTOM HALF: Branches Section -->
    <div class="flex flex-col">
      <!-- Header -->
      <div class="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 class="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <GitBranch size="18" />
          Branches
        </h3>
      </div>

      <!-- Branches List -->
      <div class="flex-1 overflow-y-auto">
        {#if !currentSession}
          <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            Select a chat to view branches
          </div>
        {:else if branches.length === 0}
          <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
            No branches yet. Create one from any message!
          </div>
        {:else}
          <div class="p-4 space-y-2">
            {#each branches as branch}
              <div 
                class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors branch-item {currentBranchId === branch.branch_id ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700' : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'}"
                role="button"
                tabindex="0"
                on:click={() => {
                  dispatch('branch-changed', branch.branch_id);
                  if (onClosePanel) onClosePanel();
                }}
                on:keydown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    dispatch('branch-changed', branch.branch_id);
                    if (onClosePanel) onClosePanel();
                  }
                }}
              >
                <div class="flex items-center gap-3">
                  <div class="w-3 h-3 rounded-full" style="background-color: {branch.color || '#6b7280'}"></div>
                  <div class="flex-1 min-w-0">
                    <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{branch.branch_name}</span>
                    {#if branch.branch_id === 'main'}
                      <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Main conversation</div>
                    {/if}
                  </div>
                </div>
                {#if currentBranchId === branch.branch_id}
                  <div class="w-2 h-2 rounded-full bg-blue-600"></div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  /* Show session actions on hover */
  :global(.group:hover .session-actions) {
    opacity: 1 !important;
  }
  
  /* Session item hover styling with accent color */
  .session-item:hover {
    background-color: var(--color-accent-light) !important;
    border-left: 3px solid var(--color-accent) !important;
  }
  
  /* Branch item hover styling */
  .branch-item:hover {
    background-color: var(--color-accent-light) !important;
    border-color: var(--color-accent-border) !important;
  }
</style>
