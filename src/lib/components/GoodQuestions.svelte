<!-- src/lib/components/GoodQuestions.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, X, ChevronsRight, Edit } from 'lucide-svelte';
  import { browser } from '$app/environment';

  export let goodQuestions = [];
  export let projectId = null;

  const dispatch = createEventDispatcher();
  
  // Track completed questions (per project) - use array of booleans indexed by question position
  let completedQuestions = [];
  
  let newQuestion = '';
  let showAddForm = false;
  let editingIndex = -1;
  let editingText = '';

  function addQuestion() {
    if (newQuestion.trim()) {
      const updatedQuestions = [...goodQuestions, newQuestion.trim()];
      goodQuestions = updatedQuestions;
      dispatch('update', { questions: updatedQuestions });
      newQuestion = '';
      showAddForm = false;
    }
  }

  function removeQuestion(index) {
    const updatedQuestions = goodQuestions.filter((_, i) => i !== index);
    goodQuestions = updatedQuestions;
    dispatch('update', { questions: updatedQuestions });
  }

  function insertQuestion(question) {
    dispatch('insert-text', { text: question });
  }

  function startEdit(index) {
    editingIndex = index;
    editingText = goodQuestions[index];
  }

  function cancelEdit() {
    editingIndex = -1;
    editingText = '';
  }

  function saveEdit() {
    if (editingText.trim() && editingIndex >= 0) {
      const updatedQuestions = [...goodQuestions];
      updatedQuestions[editingIndex] = editingText.trim();
      goodQuestions = updatedQuestions;
      dispatch('update', { questions: updatedQuestions });
      editingIndex = -1;
      editingText = '';
    }
  }

  function handleKeydown(event) {
    if (event.key === 'Enter') {
      addQuestion();
    } else if (event.key === 'Escape') {
      showAddForm = false;
      newQuestion = '';
    }
  }

  function handleEditKeydown(event) {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      // Ctrl+Enter or Cmd+Enter to save
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      cancelEdit();
    }
    // Regular Enter now creates new lines in textarea
  }
  
  // Load completed questions from localStorage
  function loadCompletedQuestions() {
    if (!browser || !projectId) return [];
    try {
      const stored = localStorage.getItem(`completed_questions_${projectId}`);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading completed questions:', error);
      return [];
    }
  }
  
  // Save completed questions to localStorage
  function saveCompletedQuestions() {
    if (!browser || !projectId) return;
    try {
      localStorage.setItem(`completed_questions_${projectId}`, JSON.stringify(completedQuestions));
    } catch (error) {
      console.error('Error saving completed questions:', error);
    }
  }
  
  function toggleCompleted(index) {
    completedQuestions[index] = !completedQuestions[index];
    // Trigger reactivity by reassigning the array
    completedQuestions = [...completedQuestions];
    // Save to localStorage
    saveCompletedQuestions();
  }
  
  function isCompleted(question, index) {
    return completedQuestions[index] || false;
  }
  
  // Load completed questions from localStorage when projectId changes
  $: if (browser && projectId) {
    const storedCompleted = loadCompletedQuestions();
    // Initialize with stored data or empty array
    if (goodQuestions.length > 0) {
      const newCompleted = new Array(goodQuestions.length).fill(false);
      // Apply stored completion states
      for (let i = 0; i < Math.min(storedCompleted.length, goodQuestions.length); i++) {
        newCompleted[i] = storedCompleted[i] || false;
      }
      completedQuestions = newCompleted;
    }
  }
  
  // Keep completedQuestions array synchronized with goodQuestions length
  $: {
    // Ensure completedQuestions array matches goodQuestions length
    if (completedQuestions.length !== goodQuestions.length && goodQuestions.length > 0) {
      const storedCompleted = loadCompletedQuestions();
      const newCompleted = new Array(goodQuestions.length).fill(false);
      // Preserve existing completion states from localStorage and current state
      for (let i = 0; i < goodQuestions.length; i++) {
        // Priority: current state > stored state > false
        newCompleted[i] = completedQuestions[i] || storedCompleted[i] || false;
      }
      completedQuestions = newCompleted;
    }
  }
  
  // Create reactive computed properties for UI updates
  $: completedStates = completedQuestions.map(Boolean);
</script>

<div class="flex flex-col h-full max-h-full overflow-hidden">
  <!-- Header -->
  <div class="flex-shrink-0">
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-gray-800">Good Questions (to ask next)</h3>
      <button 
        class="flex items-center gap-1 text-sm bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 cursor-pointer" 
        on:click={() => showAddForm = !showAddForm}
        title={showAddForm ? "Cancel" : "Add question"}
      >
        <Plus size="16" />
        {showAddForm ? "Cancel" : "Add"}
      </button>
    </div>

    {#if showAddForm}
      <div class="border rounded p-3 bg-white mb-3">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700">New Question</span>
          <span class="text-xs text-zinc-500">What do you want to explore next?</span>
        </div>
        <div class="flex gap-2">
          <input 
            class="border rounded p-2 flex-1" 
            placeholder="What if...? How does...? Why might...?" 
            bind:value={newQuestion}
            on:keydown={handleKeydown}
          />
          <button 
            class="bg-green-500 text-white rounded px-3 py-1 hover:bg-green-600 cursor-pointer" 
            on:click={addQuestion}
          >
            Add
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Questions List -->
  <div class="flex-1 min-h-0 overflow-hidden">
    <div class="h-full overflow-y-auto pr-1">
      <ul class="space-y-1">
      {#each goodQuestions as question, i}
        <li class="text-sm border rounded p-2 bg-white group hover:bg-gray-50">
          {#if editingIndex === i}
            <!-- Edit mode -->
            <div class="flex gap-2">
              <textarea 
                class="flex-1 border rounded px-2 py-1 text-sm resize-none" 
                rows="3"
                bind:value={editingText}
                on:keydown={handleEditKeydown}
              ></textarea>
              <div class="flex flex-col gap-1">
                <button 
                  class="text-green-600 hover:text-green-700 p-1 cursor-pointer" 
                  on:click={saveEdit}
                  title="Save changes"
                >
                  ✓
                </button>
                <button 
                  class="text-gray-500 hover:text-gray-700 p-1 cursor-pointer" 
                  on:click={cancelEdit}
                  title="Cancel edit"
                >
                  <X size="16" />
                </button>
              </div>
            </div>
          {:else}
            <!-- View mode -->
            <div class="flex gap-2">
              <!-- Left column: checkbox and edit/delete buttons -->
              <div class="flex flex-col items-center gap-1">
                <input 
                  type="checkbox" 
                  class="rounded cursor-pointer"
                  checked={completedQuestions[i] || false}
                  on:change={() => toggleCompleted(i)}
                  title="Mark as answered"
                />
                <!-- Edit and Delete buttons below checkbox -->
                <div class="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    class="text-gray-500 hover:text-gray-700 p-0.5 cursor-pointer" 
                    on:click={() => startEdit(i)}
                    title="Edit question"
                  >
                    <Edit size="14" />
                  </button>
                  <button 
                    class="text-red-500 hover:text-red-700 p-0.5 cursor-pointer" 
                    on:click={() => removeQuestion(i)}
                    title="Remove question"
                  >
                    <X size="14" />
                  </button>
                </div>
              </div>
              
              <!-- Right section: text and chevron -->
              <div class="flex-1 flex items-start justify-between gap-2">
                <div class="flex-1 leading-relaxed {completedStates[i] ? 'text-gray-400' : 'text-gray-900'}" style={completedStates[i] ? 'text-decoration: line-through !important;' : 'text-decoration: none;'}>
                  {question}
                </div>
                <!-- Chevron button in top right -->
                <button 
                  class="text-blue-500 hover:text-blue-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 cursor-pointer" 
                  on:click={() => insertQuestion(question)}
                  title="Add to chat input"
                >
                  <ChevronsRight size="16" />
                </button>
              </div>
            </div>
          {/if}
        </li>
      {/each}
      {#if !goodQuestions.length}
        <li class="text-sm text-zinc-500 italic">
          No questions yet. Add some thoughts to explore later!
        </li>
      {/if}
      </ul>
    </div>
  </div>
</div>
