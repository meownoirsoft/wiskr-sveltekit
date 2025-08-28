<!-- src/lib/components/GoodQuestions.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { Plus, X, ChevronsLeft, Edit, Info } from 'lucide-svelte';
import InfoPopup from './InfoPopup.svelte';
import LoadingSpinner from './LoadingSpinner.svelte';
import { browser } from '$app/environment';

  export let goodQuestions = [];
  export let loadingQuestions = false;
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
    <div class="flex items-center justify-between mb-2" style="margin-left: 32px; margin-right: 4px;">
      <div class="flex items-center gap-2">
        <h3 class="font-semibold text-gray-800 dark:text-gray-200">Next Questions</h3>
        <InfoPopup
          title="Next Questions"
          content={`
            <p>Save next questions to ask so you don't forget by the time you get your last question answered.</p>
            <br /><p>You can click the chevrons to the left to add it to chat.</p>
          `}
          buttonTitle="Learn about Next Questions"
        />
      </div>
      <button 
        class="flex items-center gap-1 text-sm px-2 py-1 rounded cursor-pointer" 
        style="background-color: var(--color-accent); color: var(--color-accent-text); transition: background-color 0.2s ease;" 
        on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
        on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
        on:click={() => showAddForm = !showAddForm}
        title={showAddForm ? "Cancel" : "Add question"}
      >
        <Plus size="16" />
        {showAddForm ? "Cancel" : "Question"}
      </button>
    </div>

    {#if showAddForm}
      <div class="border border-gray-200 dark:border-gray-600 rounded p-3 mb-3" style="background-color: var(--bg-card);">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">New Question</span>
          <span class="text-xs text-zinc-500 dark:text-zinc-400">What do you want to explore next?</span>
        </div>
        <div class="flex gap-2">
          <input 
            class="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded p-2 flex-1" 
            placeholder="What if...? How does...? Why might...?" 
            bind:value={newQuestion}
            on:keydown={handleKeydown}
          />
          <button 
            class="rounded px-3 py-1 cursor-pointer" 
            style="background-color: var(--color-accent); color: var(--color-accent-text); transition: background-color 0.2s ease;" 
            on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'}
            on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
            on:click={addQuestion}
          >
            Add
          </button>
        </div>
      </div>
    {/if}
  </div>

  <!-- Questions List -->
  <div class="flex-1 min-h-0 overflow-hidden relative">
    {#if loadingQuestions}
      <LoadingSpinner overlay={true} text="Loading questions..." size="sm" />
    {/if}
    <div class="h-full overflow-y-auto pr-1">
      <ul class="space-y-1 px-2 md:px-0" style="margin-left: 32px;"> <!-- 32px for chevron space, mobile padding -->
      {#each goodQuestions as question, i}
        <li class="relative text-sm border border-gray-200 dark:border-gray-600 rounded p-2 md:p-2 group hover:bg-gray-50 dark:hover:bg-gray-600" style="background-color: var(--bg-card);">
          <!-- Chevron button outside card on the left, always visible -->
          <button 
            class="absolute p-2 flex-shrink-0 cursor-pointer z-10" 
            style="left: -20px; top: 50%; transform: translateX(-50%) translateY(-50%); color: var(--color-accent); transition: color 0.2s ease;" 
            on:mouseenter={(e) => e.target.style.color = 'var(--color-accent-hover)'}
            on:mouseleave={(e) => e.target.style.color = 'var(--color-accent)'}
            on:click={() => insertQuestion(question)}
            title="Add to chat input"
          >
            <ChevronsLeft size="20" />
          </button>
          
          {#if editingIndex === i}
            <!-- Edit mode -->
            <div class="flex gap-2">
              <textarea 
                class="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 rounded px-2 py-1 text-sm resize-none" 
                rows="3"
                bind:value={editingText}
                on:keydown={handleEditKeydown}
              ></textarea>
              <div class="flex flex-col gap-1">
                <button 
                  class="text-green-600 hover:text-green-700 p-1 md:p-1 cursor-pointer min-h-[44px] md:min-h-0 flex items-center justify-center" 
                  on:click={saveEdit}
                  title="Save"
                >
                  <span class="text-lg md:text-base">✓</span>
                </button>
                <button 
                  class="text-gray-500 hover:text-gray-700 p-1 md:p-1 cursor-pointer min-h-[44px] md:min-h-0 flex items-center justify-center" 
                  on:click={cancelEdit}
                  title="Cancel edit"
                >
                  <X size="20" class="md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          {:else}
            <!-- View mode -->
            <div class="flex gap-2">
              <!-- Left section: checkbox -->
              <input 
                type="checkbox" 
                class="rounded cursor-pointer mt-0.5 flex-shrink-0"
                checked={completedQuestions[i] || false}
                on:change={() => toggleCompleted(i)}
                title="Mark as answered"
              />
              
              <!-- Center section: question text -->
              <div class="flex-1 leading-snug {completedStates[i] ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}" style={completedStates[i] ? 'text-decoration: line-through !important;' : 'text-decoration: none;'}>
                {question}
              </div>
              
              <!-- Right section: edit and delete buttons -->
              <div class="flex items-start gap-1 opacity-0 md:group-hover:opacity-100 opacity-100 md:opacity-0 transition-opacity">
                <button 
                  class="text-gray-500 hover:text-gray-700 p-1 md:p-0.5 cursor-pointer min-h-[44px] md:min-h-0 flex items-center justify-center" 
                  on:click={() => startEdit(i)}
                  title="Edit question"
                >
                  <Edit size="20" class="md:w-4 md:h-4" />
                </button>
                <button 
                  class="text-red-500 hover:text-red-700 p-1 md:p-0.5 cursor-pointer min-h-[44px] md:min-h-0 flex items-center justify-center" 
                  on:click={() => removeQuestion(i)}
                  title="Remove question"
                >
                  <X size="20" class="md:w-4 md:h-4" />
                </button>
              </div>
            </div>
          {/if}
        </li>
      {/each}
      {#if !goodQuestions.length && !loadingQuestions}
        <li class="text-sm text-zinc-500 dark:text-zinc-400 italic ml-0"> <!-- Reset margin for empty state -->
          No questions yet. Add some thoughts to explore later!
        </li>
      {/if}
      </ul>
    </div>
  </div>
</div>
