<script>
import { createEventDispatcher, tick } from 'svelte';
import { marked } from 'marked';
import { Clipboard, GitBranch, Edit2, Trash2, Check, X, Type, MousePointer2, MessageSquare, Info, RotateCcw, ChevronsLeft, ChevronsRight } from 'lucide-svelte';
import TextSelectionMenu from './TextSelectionMenu.svelte';
import InfoPopup from './InfoPopup.svelte';
import MrWiskrPopup from './MrWiskrPopup.svelte';
import ModelDropdown from './ModelDropdown.svelte';
import TLDRModal from './TLDRModal.svelte';
import TLDRButton from './TLDRButton.svelte';
import FeedbackButtons from './FeedbackButtons.svelte';
import FeedbackModal from './FeedbackModal.svelte';
import GlobalSearch from './GlobalSearch.svelte';
import { getAIName, getAIAvatar, getAIInfo } from '$lib/config/aiAvatars.js';
import { getModelFriendlyName } from '$lib/client/modelHelpers.js';
import LoadingSpinner from './LoadingSpinner.svelte';
import BranchPickerModal from './BranchPickerModal.svelte';
import VirtualMessageList from './VirtualMessageList.svelte';

  export let current = null;
  export let hasInit = false;
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
  export let isMobile = false;

  // Mobile-only UI state
  let showBranchPicker = false;

  const dispatch = createEventDispatcher();
  let chatContainer;
  let messageBranchCounts = {}; // Store branch counts per message
  let availableModels = []; // Store available AI models
  let userPreferences = { display_name: null }; // User preferences for display name
  let hasLastUserMessage = false; // Track if there's a last user message for ReAsk button
  
  // Branch management state
  let isEditingBranch = false;
  let editBranchName = '';
  let isSavingBranchName = false;
  let isDeletingBranch = false;
  
  
  // Mr Wiskr state
  let mrWiskrVisible = false;
  let mrWiskrX = 0;
  let mrWiskrY = 0;
  let mrWiskrThinking = false;
  let mrWiskrResponse = '';
  let mrWiskrError = '';
  let mrWiskrShowOptions = true; // Show options menu by default
  let mrWiskrOriginalText = ''; // Store original message text
  let mrWiskrFriendName = ''; // Store the friend's name who wrote the message
  
  // TL;DR state
  let showTLDRModal = false;
  let tldrOriginalText = '';
  let tldrFieldType = 'ask-prompt';
  
  // Problem Report Modal state
  let showProblemReportModal = false;
  let problemReportMessageContent = '';
  let problemReportAiName = '';
  let isSubmittingProblemReport = false;

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

  // Note: Scroll functionality is now handled by VirtualMessageList
  // The chatContainer ref is kept for compatibility but scrolling is managed internally

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

  // Mobile: select branch from modal
  function selectBranchFromPicker(id) {
    if (!id || id === currentBranchId) { showBranchPicker = false; return; }
    dispatch('switch-branch', id);
    showBranchPicker = false;
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
        
        // Ensure the current model is available, if not switch to the first available one
        const currentModel = availableModels.find(m => m.key === modelKey);
        if (!currentModel || currentModel.isAvailable === false) {
          const firstAvailable = availableModels.find(m => m.isAvailable !== false);
          if (firstAvailable) {
            modelKey = firstAvailable.key;
          }
        }
      } else {
        console.error('Failed to load models');
        // Fallback to hardcoded options
        availableModels = [
          { key: 'speed', name: 'Speed (GPT-4o-mini)', provider: 'openai', isAvailable: true },
          { key: 'quality', name: 'Quality (GPT-4o)', provider: 'openai', isAvailable: true }
        ];
      }
    } catch (error) {
      console.error('Error loading models:', error);
      // Fallback to hardcoded options
      availableModels = [
        { key: 'speed', name: 'Speed (GPT-4o-mini)', provider: 'openai', isAvailable: true },
        { key: 'quality', name: 'Quality (GPT-4o)', provider: 'openai', isAvailable: true }
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
    import AskForm from './AskForm.svelte';
  onMountChatInterface(() => {
    // Load available models and user preferences on mount
    loadAvailableModels();
    loadUserPreferences();
    
    // Note: Auto-scroll is now handled by VirtualMessageList
    
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

  function selectAllMessage(event) {
    // Extract the actual index from event.detail
    const messageIndex = event.detail || event;
    
    const message = messages[messageIndex];
    if (message && message.role === 'assistant' && message.content.trim()) {
      // Dispatch the format-text event directly with the full message content
      dispatch('format-text', { text: message.content.trim() });
    }
  }
  
  function toggleSessionNavigator() {
    dispatch('toggle-session-navigator');
  }
  
  // Mr Wiskr functions - now shows options menu first
  function showMrWiskrOptions(text, x = 0, y = 0, friendName = '') {
    // Hide any existing Mr Wiskr
    mrWiskrVisible = false;
    
    // Store original text and friend name for potential follow-ups
    mrWiskrOriginalText = text;
    mrWiskrFriendName = friendName;
    
    // Reset state to show options
    mrWiskrResponse = '';
    mrWiskrError = '';
    mrWiskrThinking = false;
    mrWiskrShowOptions = true;
    
    // Position Mr Wiskr (use provided coordinates or calculate from event)
    mrWiskrX = x || window.innerWidth - 400;
    mrWiskrY = y || 100;
    
    // Show Mr Wiskr options menu
    mrWiskrVisible = true;
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
        body: JSON.stringify({ text, type, projectContext, friendName: mrWiskrFriendName })
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
    mrWiskrShowOptions = true;
    mrWiskrOriginalText = '';
    mrWiskrFriendName = '';
  }
  
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
      mrWiskrResponse = "I'd love to suggest one of my other friends to help, but it looks like there's only one friend available right now. You might want to check if there are other friends you can access!";
      mrWiskrThinking = false;
      return;
    }
    
    // Logic to pick a better friend:
    // 1. If using micro/speed, suggest quality or claude
    // 2. If using quality/claude, suggest a different premium friend
    // 3. Prefer friends that are better but not much more expensive
    
    let bestSuggestion = null;
    const currentTier = currentModel.tier?.toLowerCase() || '';
    
    if (currentModel.key === 'micro' || currentModel.key === 'speed') {
      // From micro/speed, suggest quality models
      bestSuggestion = availableModels.find(m => m.key === 'quality') || 
                      availableModels.find(m => m.key.includes('claude')) ||
                      availableModels.find(m => m.tier?.toLowerCase().includes('quality'));
    } else if (currentModel.key === 'quality') {
      // From quality, suggest Claude or other premium friends
      bestSuggestion = availableModels.find(m => m.key.includes('claude')) ||
                      availableModels.find(m => m.key.includes('llama') && m.tier?.toLowerCase().includes('quality')) ||
                      availableModels.find(m => m.key !== modelKey && m.tier?.toLowerCase().includes('premium'));
    } else {
      // From other friends, suggest quality if not already using it
      bestSuggestion = availableModels.find(m => m.key === 'quality') ||
                      availableModels.find(m => m.key !== modelKey && (m.tier?.toLowerCase().includes('quality') || m.tier?.toLowerCase().includes('premium')));
    }
    
    // Fallback: pick any different friend
    if (!bestSuggestion) {
      bestSuggestion = availableModels.find(m => m.key !== modelKey);
    }
    
    if (!bestSuggestion) {
      mrWiskrResponse = "Hmm, I'm not finding any other friends to suggest right now. You might want to check if there are other friends available!";
      mrWiskrThinking = false;
      return;
    }
    
    suggestedModel = bestSuggestion;
    
    // Get a friendly name for the suggested model using our avatar config
    const modelName = getAIName(bestSuggestion.key);
    const currentModelName = getAIName(currentModel.key);
    
    mrWiskrResponse = `What I think ${currentModelName} shared is helpful, but sometimes a different friend can explain things better! 

I'd like to ask **${modelName}** the same question for you. They often have a different perspective and might give you the clarity you're looking for.

Should I set that up? I'll switch to your new friend and copy your original question so you just need to hit Enter.`;
    mrWiskrThinking = false;
  }
  
  function handleConfirmModelSwitch() {
    if (!suggestedModel || !lastUserQuestion) {
      mrWiskrResponse = "Oops, something went wrong setting that up. Please try selecting a different friend manually!";
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
  
  function openMrWiskrForMessage(messageIndex, event) {
    const message = messages[messageIndex];
    if (!message || message.role !== 'assistant' || !message.content.trim()) return;
    
    // Store the last user question (find the user message that prompted this response)
    if (messageIndex > 0) {
      const userMessage = messages[messageIndex - 1];
      if (userMessage && userMessage.role === 'user') {
        lastUserQuestion = userMessage.content.trim();
      }
    }
    
    // Get the friend's name from the message
    const friendName = message.model_key ? getAIName(message.model_key) : '';
    
    // Get button center position for Mr Wiskr positioning
    const rect = event.target.getBoundingClientRect();
    const centerX = rect.left + (rect.width / 2);
    const centerY = rect.top + (rect.height / 2);
    
    // Show Mr Wiskr options menu instead of directly translating
    showMrWiskrOptions(message.content.trim(), centerX, centerY, friendName);
  }
  
  // Handle help option selection from Mr Wiskr popup
  function handleMrWiskrHelpRequested(event) {
    const { type, text } = event.detail;
    
    // Special handling for report-problem option
    if (type === 'report-problem') {
      // Open the problem report modal
      problemReportMessageContent = text;
      problemReportAiName = mrWiskrFriendName || 'Assistant';
      showProblemReportModal = true;
      
      // Dismiss Mr Wiskr since we're opening the modal
      dismissMrWiskr();
      return;
    }
    
    // Hide options and start thinking
    mrWiskrShowOptions = false;
    mrWiskrThinking = true;
    mrWiskrResponse = '';
    mrWiskrError = '';
    
    // Map the help type to the appropriate API call
    let apiType = type;
    switch (type) {
      case 'examples':
        apiType = 'show-examples';
        break;
      case 'next-steps':
        apiType = 'next-steps';
        break;
      case 'critique':
        apiType = 'critique';
        break;
      case 'alternative':
        apiType = 'ask-someone-else';
        break;
      default:
        apiType = 'translate'; // Default to translate for 'translate' type
    }
    
    // If it's the alternative option, handle it specially
    if (type === 'alternative') {
      handleAskSomeoneElse();
      return;
    }
    
    // Call Mr Wiskr with the selected help type
    askMrWiskr(text, apiType);
  }
  
  // Handle back to options from Mr Wiskr popup
  function handleMrWiskrBackToOptions() {
    // Reset to show options menu again
    mrWiskrShowOptions = true;
    mrWiskrResponse = '';
    mrWiskrError = '';
    mrWiskrThinking = false;
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
      const message = messages[i];
      
      if (message.role === 'user' && message.content.trim()) {
        return message.content.trim();
      }
    }
    
    return null;
  }
  
  // Reactive variable to track if there's a last user message
  $: {
    // Guard against race condition - only run when messages are properly loaded
    if (!loadingMessages && messages && Array.isArray(messages)) {
      const lastUserMsg = getLastUserMessage();
      hasLastUserMessage = lastUserMsg !== null;
    } else {
      // Messages not ready yet - keep button hidden
      hasLastUserMessage = false;
    }
  }
  
  // ReAsk function - copy last user question to box
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
  
  // Problem Report Modal handlers
  async function handleProblemReportSubmit(event) {
    const { rating, comment } = event.detail;
    
    if (isSubmittingProblemReport) return;
    
    isSubmittingProblemReport = true;
    
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit-problem-report',
          projectId: current?.id,
          rating: 'problem',
          comment: comment || 'Problem reported via Mr Wiskr',
          context: problemReportMessageContent ? problemReportMessageContent.slice(0, 200) + '...' : 'Problem report',
          aiName: problemReportAiName,
          reportType: 'problem-report'
        })
      });
      
      if (response.ok) {
        // Close the modal
        showProblemReportModal = false;
        // Optional: show success message
        console.log('Problem report submitted successfully');
      } else {
        console.error('Failed to submit problem report');
      }
    } catch (error) {
      console.error('Error submitting problem report:', error);
    } finally {
      isSubmittingProblemReport = false;
    }
  }
  
  function handleProblemReportCancel() {
    showProblemReportModal = false;
    problemReportMessageContent = '';
    problemReportAiName = '';
  }
</script>

<main class="flex flex-col h-full overflow-hidden overflow-x-hidden mobile-chat" style="background-color: var(--bg-chat);">
  <!-- Chat Header -->
  {#if current}
    <div class="border-gray-200 dark:border-gray-700 border-b px-3 md:px-4 py-2 md:py-3 flex-shrink-0" style="background-color: var(--bg-chat-header);">
      {#if isMobile}
        <!-- Mobile: Compact controls moved from header -->
        <div class="flex items-center justify-between w-full">
          <button
            type="button"
            class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
            data-mobile-sessions-button
            on:click={toggleSessionNavigator}
            aria-label="Chats"
          >
            <MessageSquare class="w-6 h-6" />
            <span class="text-xs">Chats</span>
          </button>
          
          <!-- Mobile Global Search -->
          {#if current?.id}
            <div class="flex flex-col items-center p-2">
              <GlobalSearch 
                projectId={current?.id}
                isMobile={true}
                on:activate-tab={(e) => {
                  window.dispatchEvent(new CustomEvent('search:activate-tab', { detail: e.detail }));
                }}
                on:filter={(e) => {
                  window.dispatchEvent(new CustomEvent('search:filter', { detail: e.detail }));
                }}
                on:navigate-chat={(e) => {
                  window.dispatchEvent(new CustomEvent('search:navigate-chat', { detail: e.detail }));
                }}
                on:clear={(e) => {
                  window.dispatchEvent(new CustomEvent('search:clear', { detail: e.detail }));
                }}
              />
            </div>
          {/if}
          
          <button
            type="button"
            class="flex flex-col items-center p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
            on:click={() => { showBranchPicker = true; }}
            aria-label="Branches"
          >
            <GitBranch class="w-6 h-6" />
            <span class="text-xs">Branches</span>
          </button>
        </div>
      {:else}
      <!-- Two Column Layout with padding for collapse buttons -->
      <div class="grid grid-cols-2 gap-4" style="padding-left: 3rem; padding-right: 3rem;">
        <!-- Sessions Column -->
        <div class="flex flex-col gap-1">
          <!-- Sessions Label -->
          <div class="flex items-center gap-1">
            <span class="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Chat:</span>
            <!-- Hide InfoPopup on mobile -->
            <div class="hidden md:block">
              <InfoPopup
                title="Chats"
                content="<p><strong>Chats</strong> help you organize different conversation flows within a project.</p><p>Each chat maintains its own conversation history, allowing you to:</p><ul><li><strong>Separate topics</strong> - Keep different discussion threads organized</li><li><strong>Switch contexts</strong> - Jump between different aspects of your project</li><li><strong>Preserve history</strong> - Each chat remembers its own conversation</li></ul><p>Use the Chats button to toggle the chat navigator and easily switch between conversations.</p>"
                buttonTitle="Learn about Chats"
              />
            </div>
          </div>
          <!-- Sessions Button -->
          <button 
            data-sessions-button
            class="flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200 text-sm w-full {showSessionNavigator ? '' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}" 
            style="background-color: {showSessionNavigator ? 'var(--color-accent-light)' : 'var(--bg-sessions-button)'}; border-color: {showSessionNavigator ? 'var(--color-accent-border)' : ''}; touch-action: manipulation;"
            title="{showSessionNavigator ? 'Hide Chats' : 'Show Chats'}"
            on:click={toggleSessionNavigator}
          >
            <MessageSquare size="16" class="flex-shrink-0" style="color: {showSessionNavigator ? 'var(--color-accent)' : ''};" />
            <div class="flex flex-col items-start min-w-0 flex-1">
              {#if currentSession}
                <span class="text-xs text-gray-500 dark:text-gray-400 truncate w-full text-left {showSessionNavigator ? '' : 'text-gray-700 dark:text-gray-100'}" style="color: {showSessionNavigator ? 'var(--color-accent)' : ''};">{currentSession.session_name}</span>
              {/if}
            </div>
          </button>
        </div>

        <!-- Branch Controls Column (only show if branches exist) -->
        {#if branches.length > 0}
          <div class="flex flex-col gap-1">
            <!-- Branch Label -->
            <div class="flex items-center gap-1">
              <span class="text-xs md:text-sm font-medium text-gray-600 dark:text-gray-400">Branch:</span>
              <!-- Info icon (only show on main branch and desktop) -->
              {#if currentBranchId === 'main'}
                <div class="hidden md:block">
                  <InfoPopup
                    title="Conversation Branches"
                    content="<p><strong>Branches</strong> let you explore different conversation paths from any message.</p><p>Think of them like parallel universes for your chat:</p><ul><li><strong>Branch from any message</strong> - Click 'Branch' next to assistant replies to start a new path</li><li><strong>Explore alternatives</strong> - Try different approaches without losing your main conversation</li><li><strong>Visual organization</strong> - Each branch has its own color theme</li><li><strong>Independent history</strong> - Changes in one branch don't affect others</li></ul><p>Perfect for A/B testing ideas, exploring different solutions, or keeping your main conversation clean while trying experimental directions.</p>"
                    buttonTitle="Learn about Branches"
                  />
                </div>
              {/if}
            </div>
            
            <!-- Branch Controls -->
            {#if isEditingBranch}
              <!-- Edit mode -->
              <div class="flex items-center gap-2">
                <input 
                  type="text" 
                  bind:value={editBranchName}
                  class="bg-white border border-gray-300 dark:border-gray-600 rounded px-2 py-2 text-sm font-medium text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                  style="background-color: white; color: #1f2937;"
                  data-theme-bg="#1b1b1e"
                  maxlength="100"
                  disabled={isSavingBranchName}
                />
                <button
                  class="p-1.5 disabled:opacity-50"
                  style="color: var(--color-accent);"
                  on:mouseenter={handleAccentHover}
                  on:mouseleave={handleAccentLeave}
                  on:click={saveBranchName}
                  disabled={isSavingBranchName || !editBranchName.trim()}
                  title="Save"
                >
                  {#if isSavingBranchName}
                    <div class="animate-spin rounded-full h-4 w-4 border-2 border-t-transparent" style="border-color: var(--color-accent); border-top-color: transparent;"></div>
                  {:else}
                    <Check size="16" />
                  {/if}
                </button>
                <button
                  class="p-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300 disabled:opacity-50"
                  on:click={cancelEditingBranch}
                  disabled={isSavingBranchName}
                  title="Cancel"
                >
                  <X size="16" />
                </button>
              </div>
            {:else}
              <!-- Normal mode -->
              <div class="flex items-center gap-2">
                <select 
                  class="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-xs font-medium text-gray-800 dark:text-gray-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 truncate" 
                  style="background-color: var(--bg-chat-controls); touch-action: manipulation;"
                  bind:value={currentBranchId} 
                  on:change={switchToBranch}
                  disabled={isDeletingBranch}
                >
                  {#each branches as branch}
                    <option value={branch.branch_id} style="">{branch.branch_name}</option>
                  {/each}
                </select>
                
                <!-- Branch management buttons (only show for non-main branches) -->
                {#if currentBranch && currentBranchId !== 'main'}
                  <div class="flex items-center gap-1">
                    <button
                      class="p-1.5 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 disabled:opacity-50"
                      on:click={startEditingBranch}
                      disabled={isDeletingBranch}
                      title="Edit branch name"
                    >
                      <Edit2 size="16" />
                    </button>
                    <button
                      class="p-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 disabled:opacity-50"
                      on:click={deleteBranch}
                      disabled={isDeletingBranch}
                      title="Delete branch"
                    >
                      {#if isDeletingBranch}
                        <div class="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                      {:else}
                        <Trash2 size="16" />
                      {/if}
                    </button>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {:else}
          <!-- Empty column when no branches -->
          <div></div>
        {/if}
      </div>
      {/if}
    </div>
  {/if}
  
  <!-- Chat Messages (Virtual Scrolling) -->
  <VirtualMessageList
    bind:this={chatContainer}
    {messages}
    {loadingMessages}
    {current}
    {hasInit}
    {currentBranch}
    {currentBranchId}
    {messageBranchCounts}
    {userPreferences}
    bufferSize={8}
    estimatedMessageHeight={120}
    debugMode={false}
    on:select-all={selectAllMessage}
    on:open-branch-modal={openBranchModal}
    on:open-mr-wiskr={({ detail }) => openMrWiskrForMessage(detail.index, detail.event)}
  />

  <!-- Fixed Ask Form at Bottom -->
  <AskForm
    {current}
    bind:input={input}
    bind:modelKey={modelKey}
    {availableModels}
    {hasLastUserMessage}
    {isMobile}
    on:submit={send}
    on:reask={reAskLastQuestion}
    on:tldr={handleTLDRClick}
  />
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
    showOptions={mrWiskrShowOptions}
    originalText={mrWiskrOriginalText}
    projectId={current?.id}
    on:dismiss={dismissMrWiskr}
    on:follow-up={handleMrWiskrFollowUp}
    on:help-requested={handleMrWiskrHelpRequested}
    on:back-to-options={handleMrWiskrBackToOptions}
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
  
  <!-- Branch Picker (Mobile) -->
  <BranchPickerModal
    visible={showBranchPicker}
    {branches}
    {currentBranchId}
    on:close={() => showBranchPicker = false}
    on:select={(e) => selectBranchFromPicker(e.detail)}
  />

  <!-- Problem Report Modal -->
  <FeedbackModal
    bind:visible={showProblemReportModal}
    rating={null}
    isSubmitting={isSubmittingProblemReport}
    messageContent={problemReportMessageContent}
    aiName={problemReportAiName}
    on:submit={handleProblemReportSubmit}
    on:cancel={handleProblemReportCancel}
  />

