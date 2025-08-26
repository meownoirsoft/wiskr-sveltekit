<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { DateTime } from 'luxon';
  import { Plus, Calendar, Edit2, Check, X, RotateCcw } from 'lucide-svelte';
  import { robustFetchJSON, getNetworkStatus, offlineQueue } from '$lib/utils/networkUtils.js';
  import { incrementPendingOperations, decrementPendingOperations, addNetworkError } from '$lib/stores/networkStore.js';
  import { browser } from '$app/environment';

  export let currentProject;
  export let sessions = [];
  export let currentSession;
  export let currentBranchId = 'main';

  const dispatch = createEventDispatcher();

  let isCreatingSession = false;
  let newSessionName = '';
  let sessionsError = '';
  
  // Title editing state
  let editingSessionId = null;
  let editingTitle = '';
  let isUpdatingTitle = false;
  let isRegeneratingTitle = false;

  // Load sessions for the current project
  export async function loadSessions() {
    if (!currentProject) return;
    
    console.log('📅 Loading sessions for project:', currentProject.id);
    
    const { data, error } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading sessions:', error);
      sessionsError = error.message;
      return;
    }
    
    sessions = data || [];
    console.log('📅 Loaded sessions:', sessions.length);
    
    // Auto-select first session if none selected
    if (sessions.length > 0 && !currentSession) {
      await selectSession(sessions[0]);
    } else if (sessions.length === 0) {
      // Create default session if none exist
      await createNewSession('General Discussion');
    }
  }

  // Select a session
  export async function selectSession(session) {
    currentSession = session;
    console.log('📅 Selected session:', session.name);
    dispatch('sessionSelected', { session });
  }

  // Create new session
  async function createNewSession(name = newSessionName) {
    if (!currentProject || !name?.trim()) return;
    
    isCreatingSession = true;
    sessionsError = '';
    
    try {
      const { data, error } = await supabase
        .from('conversation_sessions')
        .insert([{
          project_id: currentProject.id,
          name: name.trim(),
          branch_id: currentBranchId
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to sessions list and select it
      sessions = [data, ...sessions];
      await selectSession(data);
      
      // Reset form
      newSessionName = '';
      
      console.log('✅ Created new session:', data.name);
    } catch (error) {
      console.error('Error creating session:', error);
      sessionsError = error.message;
    } finally {
      isCreatingSession = false;
    }
  }

  // Format session date
  function formatSessionDate(dateString) {
    const date = DateTime.fromISO(dateString);
    const now = DateTime.now();
    const diff = now.diff(date, 'days').days;
    
    if (diff < 1) return 'Today';
    if (diff < 2) return 'Yesterday';
    if (diff < 7) return date.toFormat('cccc'); // Day name
    return date.toFormat('MMM d'); // Month day
  }

  // Title editing functions
  function startEditingTitle(session, event) {
    event.stopPropagation();
    editingSessionId = session.id;
    editingTitle = session.session_name || session.name;
  }

  function cancelEditingTitle() {
    editingSessionId = null;
    editingTitle = '';
  }

  async function saveTitle(sessionId) {
    if (!editingTitle.trim() || isUpdatingTitle) return;
    
    const newTitle = editingTitle.trim();
    const originalSession = sessions.find(s => s.id === sessionId);
    const originalTitle = originalSession?.session_name || originalSession?.name;
    
    // Optimistic update
    sessions = sessions.map(s => 
      s.id === sessionId 
        ? { ...s, session_name: newTitle, name: newTitle }
        : s
    );
    
    if (currentSession?.id === sessionId) {
      currentSession = { ...currentSession, session_name: newTitle, name: newTitle };
    }
    
    cancelEditingTitle();
    
    // Check if offline - queue the request
    if (!getNetworkStatus()) {
      offlineQueue.add(async () => {
        await robustFetchJSON('/api/sessions/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update',
            sessionId,
            projectId: currentProject.id,
            customTitle: newTitle
          })
        });
      }, { type: 'update_session_title', sessionId, newTitle });
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.offline('Session title will be updated when you come back online.');
      }
      return;
    }
    
    isUpdatingTitle = true;
    incrementPendingOperations();
    
    try {
      const result = await robustFetchJSON('/api/sessions/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          sessionId,
          projectId: currentProject.id,
          customTitle: newTitle
        })
      }, {
        timeout: 10000,
        maxRetries: 2,
        onRetry: (attempt) => {
          if (browser && window.showNetworkToast) {
            window.showNetworkToast.retry('Retrying session title update', attempt, 3);
          }
        }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update title');
      }
      
      // Confirm the update with server response
      sessions = sessions.map(s => 
        s.id === sessionId 
          ? { ...s, session_name: result.title, name: result.title }
          : s
      );
      
      if (currentSession?.id === sessionId) {
        currentSession = { ...currentSession, session_name: result.title, name: result.title };
      }
      
    } catch (error) {
      console.error('SessionManager: Error updating session title:', error);
      addNetworkError(error);
      
      // Revert optimistic update
      sessions = sessions.map(s => 
        s.id === sessionId 
          ? { ...s, session_name: originalTitle, name: originalTitle }
          : s
      );
      
      if (currentSession?.id === sessionId) {
        currentSession = { ...currentSession, session_name: originalTitle, name: originalTitle };
      }
      
      const errorMessage = error.message.includes('Network connection failed') ?
        'Network error. Please try again when connection is restored.' :
        error.message.includes('timeout') ?
        'Request timed out. Please try again.' :
        `Failed to update title: ${error.message}`;
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.error(errorMessage);
      } else {
        sessionsError = errorMessage;
      }
    } finally {
      isUpdatingTitle = false;
      decrementPendingOperations();
    }
  }

  async function regenerateTitle(sessionId, event) {
    event.stopPropagation();
    if (isRegeneratingTitle) return;
    
    isRegeneratingTitle = true;
    try {
      const response = await fetch('/api/sessions/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          sessionId,
          projectId: currentProject.id
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Update local sessions array
        sessions = sessions.map(s => 
          s.id === sessionId 
            ? { ...s, session_name: result.title, name: result.title }
            : s
        );
        
        // Update current session if it's the one being regenerated
        if (currentSession?.id === sessionId) {
          currentSession = { ...currentSession, session_name: result.title, name: result.title };
        }
      } else {
        sessionsError = result.error || 'Failed to regenerate title';
      }
    } catch (error) {
      console.error('Error regenerating session title:', error);
      sessionsError = 'Failed to regenerate title';
    } finally {
      isRegeneratingTitle = false;
    }
  }

  // Check if a title is generic
  function isGenericTitle(title) {
    const genericTitles = ['New Session', 'General Discussion', 'New Chat', 'First Chat'];
    return genericTitles.includes(title);
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Sessions</h3>
    <button
      on:click={() => createNewSession('New Session')}
      disabled={isCreatingSession}
      class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
    >
      <Plus class="w-4 h-4 mr-1" />
      New
    </button>
  </div>

  {#if sessionsError}
    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm text-red-600">{sessionsError}</p>
    </div>
  {/if}

  <!-- Create session form -->
  <div class="mb-4">
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={newSessionName}
        placeholder="Session name..."
        class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        on:keydown={(e) => e.key === 'Enter' && createNewSession()}
      />
      <button
        on:click={() => createNewSession()}
        disabled={isCreatingSession || !newSessionName?.trim()}
        class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isCreatingSession ? 'Creating...' : 'Create'}
      </button>
    </div>
  </div>

  <!-- Sessions list -->
  <div class="space-y-2 max-h-96 overflow-y-auto">
    {#each sessions as session (session.id)}
      <div class="relative rounded-lg border transition-colors {
          currentSession?.id === session.id
            ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
        }">
        
        {#if editingSessionId === session.id}
          <!-- Editing mode -->
          <div class="p-3">
            <div class="flex items-center space-x-2">
              <Calendar class="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                bind:value={editingTitle}
                on:keydown={(e) => {
                  if (e.key === 'Enter') saveTitle(session.id);
                  if (e.key === 'Escape') cancelEditingTitle();
                }}
                class="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-#1b1b1e dark:bg-#1b1b1e text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Session title..."
                disabled={isUpdatingTitle}
              />
              <button
                on:click={() => saveTitle(session.id)}
                disabled={isUpdatingTitle || !editingTitle.trim()}
                class="p-1 text-green-600 hover:text-green-700 disabled:opacity-50"
                title="Save title"
              >
                <Check class="w-4 h-4" />
              </button>
              <button
                on:click={cancelEditingTitle}
                disabled={isUpdatingTitle}
                class="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
                title="Cancel"
              >
                <X class="w-4 h-4" />
              </button>
            </div>
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
              {formatSessionDate(session.created_at)}
            </p>
          </div>
        {:else}
          <!-- Display mode -->
          <button
            on:click={() => selectSession(session)}
            class="w-full p-3 text-left group"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-3 flex-1 min-w-0">
                <Calendar class="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div class="flex-1 min-w-0">
                  <div class="flex items-center space-x-2">
                    <h4 class="font-medium text-gray-900 dark:text-white truncate">
                      {session.session_name || session.name}
                    </h4>
                    {#if isGenericTitle(session.session_name || session.name)}
                      <span class="text-xs px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-nowrap" title="This session could have a smarter auto-generated title">
                        auto-title ready
                      </span>
                    {/if}
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {formatSessionDate(session.created_at)}
                  </p>
                </div>
              </div>
              
              <div class="flex items-center space-x-1">
                <!-- Title actions - only show on current session -->
                {#if currentSession?.id === session.id}
                  <button
                    on:click={(e) => startEditingTitle(session, e)}
                    class="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Edit title"
                  >
                    <Edit2 class="w-3 h-3" />
                  </button>
                  
                  {#if isGenericTitle(session.session_name || session.name)}
                    <button
                      on:click={(e) => regenerateTitle(session.id, e)}
                      disabled={isRegeneratingTitle}
                      class="p-1 text-blue-500 hover:text-blue-600 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Generate smart title"
                    >
                      {#if isRegeneratingTitle}
                        <div class="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      {:else}
                        <RotateCcw class="w-3 h-3" />
                      {/if}
                    </button>
                  {/if}
                {/if}
                
                <!-- Active indicator -->
                {#if currentSession?.id === session.id}
                  <div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                {/if}
              </div>
            </div>
          </button>
        {/if}
      </div>
    {/each}

    {#if sessions.length === 0}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <Calendar class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p class="text-sm">No sessions yet</p>
        <p class="text-xs">Create your first session to get started</p>
      </div>
    {/if}
  </div>
</div>
