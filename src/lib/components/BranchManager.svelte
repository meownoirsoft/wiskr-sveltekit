<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { GitBranch, Plus } from 'lucide-svelte';

  export let currentProject;
  export let currentSession;
  export let branches = [];
  export let currentBranchId = 'main';
  export let currentBranch = null;

  const dispatch = createEventDispatcher();

  let isCreatingBranch = false;
  let newBranchName = '';
  let branchError = '';

  // Branch colors for visual distinction
  const branchColors = [
    'bg-red-100 text-red-800 border-red-200',
    'bg-yellow-100 text-yellow-800 border-yellow-200',
    'bg-green-100 text-green-800 border-green-200',
    'bg-blue-100 text-blue-800 border-blue-200',
    'bg-indigo-100 text-indigo-800 border-indigo-200',
    'bg-purple-100 text-purple-800 border-purple-200',
    'bg-pink-100 text-pink-800 border-pink-200',
    'bg-gray-100 text-gray-800 border-gray-200'
  ];

  // Load branches for current session
  export async function loadSessionBranches(sessionId) {
    if (!sessionId || !currentProject) return;
    
    console.log('🌳 Loading branches for session:', sessionId);
    
    const { data, error } = await supabase
      .from('conversation_branches')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at');
    
    if (error) {
      console.error('Error loading branches:', error);
      branchError = error.message;
      return;
    }
    
    branches = data || [];
    console.log('🌳 Loaded branches:', branches.length);
    
    // Set current branch
    currentBranch = branches.find(b => b.id === currentBranchId) || null;
    
    // If no branches exist, create main branch
    if (branches.length === 0) {
      await createMainBranch(sessionId);
    }
  }

  // Create main branch
  async function createMainBranch(sessionId) {
    try {
      const { data, error } = await supabase
        .from('conversation_branches')
        .insert([{
          session_id: sessionId,
          name: 'main',
          color: branchColors[0],
          is_main: true
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      branches = [data];
      currentBranchId = data.id;
      currentBranch = data;
      
      dispatch('branchChanged', { branch: data });
      
    } catch (error) {
      console.error('Error creating main branch:', error);
      branchError = error.message;
    }
  }

  // Select a branch
  export async function selectBranch(branch) {
    currentBranchId = branch.id;
    currentBranch = branch;
    
    console.log('🌳 Selected branch:', branch.name);
    dispatch('branchChanged', { branch });
  }

  // Create new branch
  async function createBranch() {
    if (!currentSession || !newBranchName?.trim()) return;
    
    isCreatingBranch = true;
    branchError = '';
    
    try {
      // Get next available color
      const colorIndex = branches.length % branchColors.length;
      
      const { data, error } = await supabase
        .from('conversation_branches')
        .insert([{
          session_id: currentSession.id,
          name: newBranchName.trim(),
          color: branchColors[colorIndex],
          is_main: false
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Add to branches and select it
      branches = [...branches, data];
      await selectBranch(data);
      
      // Reset form
      newBranchName = '';
      
      console.log('✅ Created branch:', data.name);
      
    } catch (error) {
      console.error('Error creating branch:', error);
      branchError = error.message;
    } finally {
      isCreatingBranch = false;
    }
  }
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
  <div class="flex items-center justify-between mb-4">
    <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Branches</h3>
    <button
      on:click={createBranch}
      disabled={isCreatingBranch || !newBranchName?.trim()}
      class="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 disabled:opacity-50"
    >
      <Plus class="w-4 h-4 mr-1" />
      New
    </button>
  </div>

  {#if branchError}
    <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
      <p class="text-sm text-red-600">{branchError}</p>
    </div>
  {/if}

  <!-- Create branch form -->
  <div class="mb-4">
    <div class="flex gap-2">
      <input
        type="text"
        bind:value={newBranchName}
        placeholder="Branch name..."
        class="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        on:keydown={(e) => e.key === 'Enter' && createBranch()}
      />
      <button
        on:click={createBranch}
        disabled={isCreatingBranch || !newBranchName?.trim()}
        class="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {isCreatingBranch ? 'Creating...' : 'Create'}
      </button>
    </div>
  </div>

  <!-- Branches list -->
  <div class="space-y-2">
    {#each branches as branch (branch.id)}
      <button
        on:click={() => selectBranch(branch)}
        class="w-full p-3 text-left rounded-lg border transition-colors {
          currentBranchId === branch.id
            ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20'
            : 'border-gray-200 hover:border-gray-300 dark:border-gray-600 dark:hover:border-gray-500'
        }"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            <GitBranch class="w-4 h-4 text-gray-400" />
            <div>
              <h4 class="font-medium text-gray-900 dark:text-white">
                {branch.name}
                {#if branch.is_main}
                  <span class="text-xs text-gray-500 ml-1">(main)</span>
                {/if}
              </h4>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            {#if branch.color}
              <div class="px-2 py-1 rounded-full border text-xs {branch.color}">
                {branches.findIndex(b => b.id === branch.id) + 1}
              </div>
            {/if}
            {#if currentBranchId === branch.id}
              <div class="w-2 h-2 bg-blue-500 rounded-full"></div>
            {/if}
          </div>
        </div>
      </button>
    {/each}

    {#if branches.length === 0}
      <div class="text-center py-8 text-gray-500 dark:text-gray-400">
        <GitBranch class="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p class="text-sm">No branches yet</p>
        <p class="text-xs">Branches will be created automatically</p>
      </div>
    {/if}
  </div>
</div>
