<script>
import { createEventDispatcher, tick } from 'svelte';
import { marked } from 'marked';
import { Clipboard, GitBranch, Edit2, Trash2, Check, X, Type, MousePointer2, MessageSquare, Info, RotateCcw } from 'lucide-svelte';
import TextSelectionMenu from './TextSelectionMenu.svelte';
import InfoPopup from './InfoPopup.svelte';
import MrWiskrPopup from './MrWiskrPopup.svelte';
import ModelDropdown from './ModelDropdown.svelte';
import TLDRModal from './TLDRModal.svelte';
import TLDRButton from './TLDRButton.svelte';
import { getAIName, getAIAvatar, getAIInfo } from '$lib/config/aiAvatars.js';
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
  export let showSessionNavigator = false;
  export let sessions = [];
  export let currentSession = null;

  const dispatch = createEventDispatcher();
  let chatContainer;
  let messageBranchCounts = {}; // Store branch counts per message
  let availableModels = []; // Store available AI models
  let userPreferences = { display_name: null }; // User preferences for display name
  
  // Branch management state
  let isEditingBranch = false;
  let editBranchName = '';
  let isSavingBranchName = false;
  let isDeletingBranch = false;
  
  // Debug: Track branch state changes
  $: {
    console.log('🔄 ChatInterface branch state changed:', {
      currentBranchId,
      currentBranch: currentBranch ? {
        branch_id: currentBranch.branch_id,
        branch_name: currentBranch.branch_name
      } : null,
      branchesLength: branches.length,
      showIcons: !!(currentBranch && currentBranchId !== 'main'),
      timestamp: new Date().toISOString()
    });
  }
  
  // Mr Wiskr state
  let mrWiskrVisible = false;
  let mrWiskrX = 0;
  let mrWiskrY = 0;
  let mrWiskrThinking = false;
  let mrWiskrResponse = '';
  let mrWiskrError = '';
  
  // TL;DR state
  let showTLDRModal = false;
  let tldrOriginalText = '';
  let tldrFieldType = 'ask-prompt';

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

  function handleKeydown(event) {
    // Submit on Enter (without Shift), allow Shift+Enter for new lines
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  }

  function switchToBranch(event) {
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
    if (!current || !currentSession) {
      messageBranchCounts = {};
      return;
    }
    
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'getBranchCounts', 
          projectId: current.id,
          sessionId: currentSession.id
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
  
  // Load user preferences
  async function loadUserPreferences() {
    try {
      const res = await fetch('/api/user-preferences');
      if (res.ok) {
        const prefs = await res.json();
        userPreferences = prefs;
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }
  
  // Handle user preferences updates
  function handleUserPreferencesUpdated() {
    loadUserPreferences();
  }
  
  // Add event listener for branch updates and user preferences updates on mount
  import { onMount as onMountChatInterface } from 'svelte';
  onMountChatInterface(() => {
    // Load available models and user preferences on mount
    loadAvailableModels();
    loadUserPreferences();
    
    // Scroll to bottom on mount (helpful for page reloads/hot reloads)
    if (messages && messages.length > 0) {
      scrollToBottom();
    }
    
    window.addEventListener('branches-updated', handleBranchesUpdated);
    window.addEventListener('user-preferences-updated', handleUserPreferencesUpdated);
    return () => {
      window.removeEventListener('branches-updated', handleBranchesUpdated);
      window.removeEventListener('user-preferences-updated', handleUserPreferencesUpdated);
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
          sessionId: currentSession?.id,
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
          sessionId: currentSession?.id,
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
  
  function handleSimplifyThis(event) {
    const { text } = event.detail;
    showMrWiskr(text, 'selection');
  }

  function selectAllMessage(messageIndex) {
    const message = messages[messageIndex];
    if (message && message.role === 'assistant' && message.content.trim()) {
      // Dispatch the format-text event directly with the full message content
      dispatch('format-text', { text: message.content.trim() });
    }
  }
  
  function toggleSessionNavigator() {
    dispatch('toggle-session-navigator');
  }
  
  // Mr Wiskr functions
  function showMrWiskr(text, type = 'translate', x = 0, y = 0) {
    // Hide any existing Mr Wiskr
    mrWiskrVisible = false;
    
    // Store original text for potential follow-ups
    mrWiskrOriginalText = text;
    
    // Reset state
    mrWiskrResponse = '';
    mrWiskrError = '';
    mrWiskrThinking = true;
    
    // Position Mr Wiskr (use provided coordinates or calculate from event)
    mrWiskrX = x || window.innerWidth - 400;
    mrWiskrY = y || 100;
    
    // Show Mr Wiskr
    mrWiskrVisible = true;
    
    // Call the API
    askMrWiskr(text, type);
  }
  
  async function askMrWiskr(text, type = 'translate') {
    try {
      // Build project context for Mr Wiskr
      const projectContext = current ? {
        id: current.id,
        name: current.name,
        description: current.description,
        currentFocus: 'AI chat assistance and simplification'
      } : null;

      const response = await fetch('/api/mr-wiskr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type, projectContext })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        mrWiskrError = "Sorry, Mr Wiskr is having trouble checking his notes right now.";
        mrWiskrThinking = false;
        return;
      }
      
      const data = await response.json();
      mrWiskrResponse = data.response;
      mrWiskrThinking = false;
      
    } catch (error) {
      console.error('Mr Wiskr error:', error);
      mrWiskrError = "Mr Wiskr seems to be having connection issues. Please try again!";
      mrWiskrThinking = false;
    }
  }
  
  function dismissMrWiskr() {
    mrWiskrVisible = false;
    mrWiskrResponse = '';
    mrWiskrError = '';
    mrWiskrThinking = false;
  }
  
  // Store original text for follow-ups
  let mrWiskrOriginalText = '';
  
  // Track the last user question for "ask someone else" feature
  let lastUserQuestion = '';
  
  function handleMrWiskrFollowUp(event) {
    const { action, originalResponse } = event.detail;
    
    // Reset to thinking state
    mrWiskrThinking = true;
    mrWiskrResponse = '';
    mrWiskrError = '';
    
    // Determine follow-up prompt based on action
    let followUpText = '';
    switch (action) {
      case 'simplify-more':
        followUpText = `Please make this even simpler and more basic:\n\n${originalResponse}`;
        break;
      case 'show-examples':
        followUpText = `Can you give me practical examples to illustrate this:\n\n${originalResponse}`;
        break;
      case 'ask-someone-else':
        // Find the best alternative model and offer to set it up
        handleAskSomeoneElse();
        return;
      case 'confirm-model-switch':
        // User confirmed they want to switch models
        handleConfirmModelSwitch();
        return;
      default:
        followUpText = originalResponse;
    }
    
    // Call Mr Wiskr with the follow-up
    askMrWiskr(followUpText, 'follow-up');
  }
  
  // Store suggested model for "ask someone else" feature
  let suggestedModel = null;
  
  function handleAskSomeoneElse() {
    // Find the best alternative model based on current selection
    const currentModel = availableModels.find(m => m.key === modelKey);
    if (!currentModel || availableModels.length <= 1) {
      mrWiskrResponse = "I'd love to suggest someone else to help, but it looks like there's only one model available right now. You might want to check if there are other AI models you can access!";
      mrWiskrThinking = false;
      return;
    }
    
    // Logic to pick a better model:
    // 1. If using micro/speed, suggest quality or claude
    // 2. If using quality/claude, suggest a different premium model
    // 3. Prefer models that are better but not much more expensive
    
    let bestSuggestion = null;
    const currentTier = currentModel.tier?.toLowerCase() || '';
    
    if (currentModel.key === 'micro' || currentModel.key === 'speed') {
      // From micro/speed, suggest quality models
      bestSuggestion = availableModels.find(m => m.key === 'quality') || 
                      availableModels.find(m => m.key.includes('claude')) ||
                      availableModels.find(m => m.tier?.toLowerCase().includes('quality'));
    } else if (currentModel.key === 'quality') {
      // From quality, suggest Claude or other premium models
      bestSuggestion = availableModels.find(m => m.key.includes('claude')) ||
                      availableModels.find(m => m.key.includes('llama') && m.tier?.toLowerCase().includes('quality')) ||
                      availableModels.find(m => m.key !== modelKey && m.tier?.toLowerCase().includes('premium'));
    } else {
      // From other models, suggest quality if not already using it
      bestSuggestion = availableModels.find(m => m.key === 'quality') ||
                      availableModels.find(m => m.key !== modelKey && (m.tier?.toLowerCase().includes('quality') || m.tier?.toLowerCase().includes('premium')));
    }
    
    // Fallback: pick any different model
    if (!bestSuggestion) {
      bestSuggestion = availableModels.find(m => m.key !== modelKey);
    }
    
    if (!bestSuggestion) {
      mrWiskrResponse = "Hmm, I'm not finding any other AI models to suggest right now. You might want to check if there are other options available!";
      mrWiskrThinking = false;
      return;
    }
    
    suggestedModel = bestSuggestion;
    
    // Get a friendly name for the suggested model using our avatar config
    const modelName = getAIName(bestSuggestion.key);
    const currentModelName = getAIName(currentModel.key);
    
    mrWiskrResponse = `What I think ${currentModelName} meant is helpful, but sometimes a different AI personality can explain things better! 

I'd like to ask **${modelName}** the same question for you. They often have a different perspective and might give you the clarity you're looking for.

Should I set that up? I'll switch the model and copy your original question so you just need to hit Enter.`;
    mrWiskrThinking = false;
  }
  
  function handleConfirmModelSwitch() {
    if (!suggestedModel || !lastUserQuestion) {
      mrWiskrResponse = "Oops, something went wrong setting that up. Please try selecting a different model manually!";
      mrWiskrThinking = false;
      return;
    }
    
    // Switch the model
    modelKey = suggestedModel.key;
    
    // Set the input to the last user question
    input = lastUserQuestion;
    
    // Get friendly name using our avatar config
    const modelName = getAIName(suggestedModel.key);
    
    mrWiskrResponse = `Perfect! I've switched you to **${modelName}** and copied your original question into the ask box. 

Just hit **Enter** or click **Send** and they'll give you their take on it. You're all set! 🎯`;
    mrWiskrThinking = false;
    
    // Clear the suggestion
    suggestedModel = null;
  }
  
  function translateFullMessage(messageIndex, event) {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant' || !message.content.trim()) return;
    
    // Store the last user question (find the user message that prompted this response)
    if (messageIndex > 0) {
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.role === 'user') {
        lastUserQuestion = userMessage.content.trim();
      }
    }
    
    // Get button center position for Mr Wiskr positioning
    const rect = event.target.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    
    showMrWiskr(message.content.trim(), 'translate', centerX, centerY);
  }
  
  // Hover handlers for accent color buttons
  function handleAccentHover(event) {
    event.target.style.color = 'var(--color-accent-hover)';
  }
  
  function handleAccentLeave(event) {
    event.target.style.color = 'var(--color-accent)';
  }
  
  // TL;DR handlers
  function handleTLDRClick() {
    if (!input.trim()) return;
    tldrOriginalText = input;
    tldrFieldType = 'ask-prompt';
    showTLDRModal = true;
  }
  
  function handleTLDRModalClose() {
    showTLDRModal = false;
    tldrOriginalText = '';
  }
  
  function handleTLDRReplace(event) {
    const { tldrText } = event.detail;
    input = tldrText;
    showTLDRModal = false;
    tldrOriginalText = '';
  }
  
  function handleTLDRCopy(event) {
    const { tldrText } = event.detail;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tldrText).then(() => {
        // Optional: show success feedback
      });
    }
    showTLDRModal = false;
    tldrOriginalText = '';
  }
  
  // ReAsk functionality - get the last user message from current conversation
  function getLastUserMessage() {
    if (!messages || messages.length === 0) return null;
    
    // Find the last user message in the current conversation
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user' && messages[i].content.trim()) {
        return messages[i].content.trim();
      }
    }
    return null;
  }
  
  // ReAsk function - copy last user question to input
  function reAskLastQuestion() {
    const lastQuestion = getLastUserMessage();
    if (lastQuestion) {
      input = lastQuestion;
      // Focus the textarea after a brief delay to ensure it's rendered
      setTimeout(() => {
        const textarea = document.getElementById('ask-box');
        if (textarea) {
          textarea.focus();
          // Move cursor to end
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }
      }, 50);
    }
  }
</script>

<main class="flex flex-col h-full overflow-hidden mobile-chat" style="background-color: var(--bg-chat);">
  <!-- Chat Header -->
  {#if current}
    <div class="border-gray-200 dark:border-gray-700 border-b px-4 py-3 flex-shrink-0" style="background-color: var(--bg-chat-header);">
      <!-- Title and Branch Controls Row -->
      <div class="flex items-center justify-between">
        <!-- Sessions Toggle Button and Info -->
        <div class="flex items-center gap-2">
          <button 
            data-sessions-button
class="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 {showSessionNavigator ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}" style="background-color: {showSessionNavigator ? 'var(--color-accent-light)' : 'var(--bg-sessions-button)'}; border-color: {showSessionNavigator ? 'var(--color-accent-border)' : ''};"
            title="{showSessionNavigator ? 'Hide Sessions' : 'Show Sessions'}"
            on:click={toggleSessionNavigator}
          >
            <MessageSquare size="16" style="color: {showSessionNavigator ? 'var(--color-accent)' : ''};" class="{showSessionNavigator ? '' : 'text-gray-600 dark:text-gray-400'}" />
            <span class="text-sm font-medium {showSessionNavigator ? '' : 'text-gray-700 dark:text-gray-100'}" style="color: {showSessionNavigator ? 'var(--color-accent)' : ''};">Sessions</span>
            {#if currentSession}
              <span class="text-xs text-gray-500 dark:text-gray-400">• {currentSession.session_name}</span>
            {/if}
          </button>
          <InfoPopup
            title="Sessions"
            content="<p><strong>Sessions</strong> help you organize different conversation flows within a project.</p><p>Each session maintains its own chat history, allowing you to:</p><ul><li><strong>Separate topics</strong> - Keep different discussion threads organized</li><li><strong>Switch contexts</strong> - Jump between different aspects of your project</li><li><strong>Preserve history</strong> - Each session remembers its own conversation</li></ul><p>Use the Sessions button to toggle the session navigator and easily switch between conversations.</p>"
            buttonTitle="Learn about Sessions"
          />
        </div>
        
        <!-- Branch Controls (only show if branches exist) -->
        {#if branches.length > 0}
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600 dark:text-gray-400">Branch:</span>
            
            {#if isEditingBranch}
              <!-- Edit mode -->
              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  bind:value={editBranchName}
                  class="bg-white border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style="background-color: white; color: #1f2937;"
                  data-theme-bg="#1b1b1e"
                  maxlength="100"
                  disabled={isSavingBranchName}
                />
                <button
                  class="p-1 disabled:opacity-50"
                  style="color: var(--color-accent);"
                  on:mouseenter={handleAccentHover}
                  on:mouseleave={handleAccentLeave}
                  on:click={saveBranchName}
                  disabled={isSavingBranchName || !editBranchName.trim()}
                  title="Save"
                >
                  {#if isSavingBranchName}
                    <div class="animate-spin rounded-full h-3 w-3 border-2 border-t-transparent" style="border-color: var(--color-accent); border-top-color: transparent;"></div>
                  {:else}
                    <Check size="16" />
                  {/if}
                </button>
                <button
                  class="p-1 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 disabled:opacity-50"
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
class="w-48 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500" style="background-color: var(--bg-chat-controls);"
                bind:value={currentBranchId} 
                on:change={switchToBranch}
                disabled={isDeletingBranch}
              >
                {#each branches as branch}
                  <option value={branch.branch_id}>{branch.branch_name}</option>
                {/each}
              </select>
              
              <!-- Info icon (only show on main branch) -->
              {#if currentBranchId === 'main'}
                <InfoPopup
                  title="Conversation Branches"
                  content="<p><strong>Branches</strong> let you explore different conversation paths from any message.</p><p>Think of them like parallel universes for your chat:</p><ul><li><strong>Branch from any message</strong> - Click 'Branch' next to assistant replies to start a new path</li><li><strong>Explore alternatives</strong> - Try different approaches without losing your main conversation</li><li><strong>Visual organization</strong> - Each branch has its own color theme</li><li><strong>Independent history</strong> - Changes in one branch don't affect others</li></ul><p>Perfect for A/B testing ideas, exploring different solutions, or keeping your main conversation clean while trying experimental directions.</p>"
                  buttonTitle="Learn about Branches"
                />
              {/if}
              
              <!-- Branch management buttons (only show for non-main branches) -->
              <!-- DEBUG: currentBranch={currentBranch?.branch_name}, currentBranchId={currentBranchId} -->
              {#if currentBranch && currentBranchId !== 'main'}
                <div class="flex items-center gap-1">
                  <button
                    class="p-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                    on:click={startEditingBranch}
                    disabled={isDeletingBranch}
                    title="Edit branch name"
                  >
                    <Edit2 size="20" />
                  </button>
                  <button
                    class="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                    on:click={deleteBranch}
                    disabled={isDeletingBranch}
                    title="Delete branch"
                  >
                    {#if isDeletingBranch}
                      <div class="animate-spin rounded-full h-3 w-3 border-2 border-red-600 border-t-transparent"></div>
                    {:else}
                      <Trash2 size="20" />
                    {/if}
                  </button>
                </div>
              {/if}
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
  
  <!-- Chat Messages (scrollable) -->
  <div class="flex-1 overflow-y-auto py-4 pl-4 space-y-3" bind:this={chatContainer}>
    {#if !current}
      <p class="text-gray-600 dark:text-gray-400">Select a project to start chatting.</p>
    {:else if loadingMessages}
      <div class="text-center text-zinc-500 dark:text-zinc-400 py-8">
        <div class="inline-flex items-center gap-3">
          <div class="animate-spin rounded-full h-6 w-6 border-2 border-zinc-300 dark:border-zinc-600 border-t-blue-500"></div>
          <div class="text-sm">Loading conversation history...</div>
        </div>
      </div>
    {:else if messages.length === 0}
      <div class="text-center text-zinc-500 dark:text-zinc-400 py-8">
        <div class="text-sm">Look at this brand new chat ready for action!</div>
        <div class="text-xs mt-1">What do you want to do next?</div>
      </div>
    {:else}
      {#each messages as m, index}
        {@const branchColor = getBranchColor(currentBranch)}
        <div class="{m.role === 'user' ? 'max-w-2xl ml-auto mr-4' : 'max-w-4xl group'}">
          <div class="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1 {m.role === 'user' ? 'text-right' : 'flex items-center gap-3'}">
            {#if m.role === 'user'}
              <span class="text-base font-bold">{userPreferences.display_name || 'You'}</span>
            {:else}
              {#if m.model_key}
                <div class="w-12 h-12 rounded-full bg-white dark:bg-white shadow-sm border-2 flex items-center justify-center p-1" style="border-color: var(--color-accent);">
                  <img src={getAIAvatar(m.model_key)} alt="AI Avatar" class="w-10 h-10 rounded-full" />
                </div>
                <span class="text-base font-bold text-zinc-700 dark:text-zinc-300">{getAIName(m.model_key)}</span>
              {:else}
                <div class="w-12 h-12 rounded-full bg-white dark:bg-white shadow-sm border-2 flex items-center justify-center p-1" style="border-color: var(--color-accent);">
                  <img src="/avatars/default-ai.png" alt="AI Avatar" class="w-10 h-10 rounded-full" />
                </div>
                <span class="text-base font-bold text-zinc-700 dark:text-zinc-300">Assistant</span>
              {/if}
            {/if}
          </div>
          <div class="rounded-lg p-3 border border-l-4 transition-colors relative {m.role === 'user' ? `ml-8 whitespace-pre-wrap ${branchColor.accent}` : `mr-8 assistant-message ${branchColor.accent}`}" style="background-color: {m.role === 'user' ? 'var(--bg-message-user)' : 'var(--bg-message-assistant)'}; border-color: {m.role === 'user' ? 'var(--color-accent)' : '#4a4a52'}; border-left-color: {m.role === 'user' ? 'var(--color-accent)' : '#5D60DD'}; box-shadow: {m.role === 'user' ? '0 0 0 1px var(--color-accent-light)' : '-2px 0 8px rgba(93, 96, 221, 0.15)'}; color: var(--text-primary);">
            {#if m.role === 'assistant'}
              <div class="prose prose-sm max-w-none prose-gray dark:prose-invert">
                {@html renderMarkdown(m.content)}
              </div>
              <!-- Select All button for assistant messages (bottom right) -->
              <button
                class="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 shadow-sm"
                style="background-color: var(--bg-button-secondary);" 
                on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary-hover)'} 
                on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--bg-button-secondary)'}
                on:click={() => selectAllMessage(index)}
                title="Select all and format for posts"
              >
                <MousePointer2 size="12" class="inline mr-1" />
                Select All
              </button>
            {:else}
              <div class="text-sm">
                {m.content}
              </div>
            {/if}
          </div>
          <div class="flex justify-between items-center {m.role === 'user' ? '' : 'mr-8'} mt-2 gap-2">
            <!-- Highlight-to-add feature hint (only for assistant messages) -->
            {#if m.role === 'assistant' && m.content.trim()}
              <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 italic">
                <Type size="16" />
                Highlight text to capture or format
              </div>
            {:else}
              <div></div>
            {/if}
            
            <div class="flex gap-2">
              {#if m.content.trim() && currentBranchId === 'main'}
                {@const messageBranchCount = messageBranchCounts[m.id] || 0}
                <button id="branch-button-{index}"
                  class="flex items-center gap-1 text-sm px-2 py-1 rounded border transition-colors relative"
                  style="color: var(--color-accent);"
                  on:mouseenter={(e) => { e.target.style.backgroundColor = 'var(--color-accent-light)'; e.target.style.color = 'var(--color-accent-hover)'; }}
                  on:mouseleave={(e) => { e.target.style.backgroundColor = ''; e.target.style.color = 'var(--color-accent)'; }}
                  on:click={() => openBranchModal(index)}
                  title="Create new branch from here"
                >
                  <GitBranch size="12" />
                  Branch
                  {#if messageBranchCount > 0}
                    <span class="text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center leading-none ml-1" style="background-color: var(--color-accent);">
                      {messageBranchCount}
                    </span>
                  {/if}
                </button>
              {/if}
              {#if m.role === 'assistant' && m.content.trim()}
                
                <button
                  class="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors text-white font-medium shadow-sm hover:shadow-md"
                  style="background-color: #5D60DD; border-color: #5D60DD;"
                  on:mouseenter={(e) => { e.target.style.backgroundColor = '#4B4BC7'; e.target.style.borderColor = '#4B4BC7'; }}
                  on:mouseleave={(e) => { e.target.style.backgroundColor = '#5D60DD'; e.target.style.borderColor = '#5D60DD'; }}
                  on:click={(e) => translateFullMessage(index, e)}
                  title="Ask Mr Wiskr to simplify this response"
                >
                  <img src="/mr-wiskr-emoji.png" alt="Mr Wiskr" class="w-6 h-6" />
                  Mr Wiskr
                </button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {/if}
  </div>

  <!-- Fixed Ask Form at Bottom -->
  <div class="flex-shrink-0" style="background-color: var(--bg-ask-form);">
    <!-- Usage Stats (if enabled) -->
    {#if usage && showUsageStats}
      <div class="px-3 border-t border-gray-200 dark:border-gray-700">
        <div class="text-xs text-zinc-500 dark:text-zinc-400 space-y-1 py-2">
          <div class="text-zinc-600 dark:text-zinc-300 font-medium mb-1">Total Usage (All Projects):</div>
          <div>Today: {usage.today.in.toLocaleString()} in / {usage.today.out.toLocaleString()} out · ${usage.today.cost.toFixed(4)}</div>
          <div>Last 7 days: {usage.week.in.toLocaleString()} in / {usage.week.out.toLocaleString()} out · ${usage.week.cost.toFixed(4)}</div>
          <div>This month: {usage.month.in.toLocaleString()} in / {usage.month.out.toLocaleString()} out · ${usage.month.cost.toFixed(4)}</div>
        </div>
      </div>
    {/if}
    
    <!-- Ask Form -->
    <div class="border-t border-gray-200 dark:border-gray-700">
      <!-- Top Row: Model Selection and ReAsk -->
      <div class="px-3 pt-2 pb-1 flex justify-between items-center">
        
        <div class="flex items-center gap-2 pb-2">
          <label for="model-select" class="text-xs text-zinc-500 dark:text-zinc-400">Model:</label>
          <ModelDropdown
            bind:modelKey
            {availableModels}
            disabled={!current}
            on:change={(e) => { modelKey = e.detail.value; }}
          />
          <InfoPopup
            title="AI Models"
            content="<p><strong>AI Models</strong> are different language models with varying capabilities and costs:</p><ul><li><strong>🚀 Speed Models</strong> - Fast and cost-effective for quick questions and simple tasks</li><li><strong>⭐ Quality Models</strong> - More sophisticated reasoning and better for complex tasks</li><li><strong>👑 Premium Models</strong> - Highest capability for challenging problems requiring deep analysis</li><li><strong>💰 Micro Models</strong> - Ultra-efficient for simple text processing tasks</li></ul><p>Each model has different pricing tiers:</p><ul><li><strong>Input tokens</strong> - Cost for your questions and context</li><li><strong>Output tokens</strong> - Cost for the AI's responses</li></ul><p>Choose based on your task complexity vs. cost preferences. Speed models work great for most conversations!</p>"
            buttonTitle="Learn about AI Models"
          />
        </div>
        
        <!-- TL;DR Button and ReAsk Button -->
        <div class="pb-2 flex gap-2">
          {#if input.trim()}
            <TLDRButton
              on:tldr={handleTLDRClick}
              disabled={!current || !input.trim()}
              size="sm"
            />
          {/if}
        </div>
        
        <!-- ReAsk Button (always visible when there's a last message) -->
        {#if getLastUserMessage()}
          <div class="pb-2">
            <button
              class="flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition-colors font-medium"
              style="background-color: var(--bg-sessions-button); color: var(--color-accent); border-color: var(--color-accent-light);"
              on:mouseenter={(e) => { e.target.style.backgroundColor = 'var(--color-accent-light)'; e.target.style.borderColor = 'var(--color-accent)'; }}
              on:mouseleave={(e) => { e.target.style.backgroundColor = 'var(--bg-sessions-button)'; e.target.style.borderColor = 'var(--color-accent-light)'; }}
              on:click={reAskLastQuestion}
              disabled={!current}
              title="Copy your last question to the input box"
            >
              <RotateCcw size="14" />
              ReAsk
            </button>
          </div>
        {/if}
      </div>
      
      <!-- Input and Send -->
      <form class="px-3 pb-3 flex gap-2 items-start" on:submit|preventDefault={send}>
        <div class="relative w-full">
          <textarea id="ask-box" class="border border-gray-300 dark:border-gray-600 bg-white text-gray-900 dark:text-gray-100 rounded p-2 pr-8 w-full resize-none" rows="3" bind:value={input} placeholder={current ? "Ask…" : "Pick a project"} disabled={!current} on:keydown={handleKeydown} style="background-color: white;" data-theme-bg="#1b1b1e"></textarea>
          {#if input.trim()}
            <button
              type="button"
              class="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
              on:click={() => input = ''}
              title="Clear input"
            >
              <X size="20" />
            </button>
          {/if}
        </div>
        <button class="border border-gray-300 dark:border-gray-600 text-white rounded px-3 py-2 mt-3 transition-colors" type="submit" disabled={!current || !input.trim()} 
        style="background-color: var(--color-accent);" 
        on:mouseenter={(e) => e.target.style.backgroundColor = 'var(--color-accent-hover)'} 
        on:mouseleave={(e) => e.target.style.backgroundColor = 'var(--color-accent)'}
        >
          &gt;&gt;&nbsp;Wiskr&nbsp;&lt;&lt;<br />Away
        </button>
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
    on:simplify-this={handleSimplifyThis}
  />
  
  <!-- Mr Wiskr Popup -->
  <MrWiskrPopup 
    visible={mrWiskrVisible}
    x={mrWiskrX}
    y={mrWiskrY}
    isThinking={mrWiskrThinking}
    response={mrWiskrResponse}
    error={mrWiskrError}
    on:dismiss={dismissMrWiskr}
    on:follow-up={handleMrWiskrFollowUp}
  />
  
  <!-- TL;DR Modal -->
  <TLDRModal 
    bind:visible={showTLDRModal}
    originalText={tldrOriginalText}
    fieldType={tldrFieldType}
    projectContext={current ? { name: current.name, description: current.description } : null}
    on:close={handleTLDRModalClose}
    on:replace={handleTLDRReplace}
    on:copy={handleTLDRCopy}
  />

