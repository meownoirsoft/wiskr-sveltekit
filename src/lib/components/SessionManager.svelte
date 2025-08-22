<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { DateTime } from 'luxon';
  import { Plus, Calendar } from 'lucide-svelte';

  export let currentProject;
  export let sessions = [];
  export let currentSession;
  export let currentBranchId = 'main';

  const dispatch = createEventDispatcher();

  let isCreatingSession = false;
  let newSessionName = '';
  let sessionsError = '';

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
      <button
        on:click={() => selectSession(session)}
        class="w-full p-3 text-left rounded-lg border transition-colors {
          currentSession?.id === session.id
            ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
        }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <Calendar class="w-4 h-4 text-gray-400" />
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">{session.name}</h4>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {formatSessionDate(session.created_at)}
              </p>
            </div>
          </div>
          {#if currentSession?.id === session.id}
            <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
          {/if}
        </div>
      </button>
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
