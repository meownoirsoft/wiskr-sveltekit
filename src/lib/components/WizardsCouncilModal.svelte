<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { X, Users, Lock, Crown, Star } from 'lucide-svelte';
  import { getAIInfo, getAllAIModels } from '$lib/config/aiAvatars.js';
  import { robustStreamingFetch } from '$lib/utils/networkUtils.js';
  import ProBadge from './ProBadge.svelte';
  import ChatInterface from './ChatInterface.svelte';
  import VirtualMessageList from './VirtualMessageList.svelte';
  import Card from './Card.svelte';
  import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';

  // Custom avatar function for wizard council
  function getWizardAvatar(modelKey) {
    // Map model keys to wizard names (using the same keys as getModelKeyFromWizardName)
    const modelToWizardMap = {
      'qwen-72b': 'quest',
      'llama-70b': 'tina', 
      'micro': 'spark',
      'gpt-oss': 'prism',
      'deepseek-v3': 'sage',
      'llama-405b': 'titan',
      'speed': 'ember',
      'gemini-pro': 'gem',
      'mistral-large': 'gale',
      'gpt4': 'aurora',
      'gpt-5': 'vega',
      'quality': 'verse',
      'gpt4-turbo': 'dash',
      'claude-opus': 'opal'
    };
    
    const wizardName = modelToWizardMap[modelKey] || 'quest';
    return `/avatars/wizard-${wizardName}.png`;
  }


  export let isVisible = false;
  export let effectiveTier = 0;
  export let user = null;
  export let userTier = 0;
  export let worldId = null;
  export let card = null; // The card data to display in the left column
  
  // Store the card data when modal becomes visible
  let storedCard = null;
  let currentCardId = null; // Track the current card ID for branch generation

  // Initialize when modal opens with a card
  $: if (isVisible && card && card.id !== currentCardId) {
    // Store the card and set current card ID
    storedCard = card;
    currentCardId = card.id;
    
    // Clear previous state
    messages = [];
    current = null;
    branches = [];
    currentBranch = null;
    currentBranchId = 'main';
    sessionId = null;
    hasInit = false; // Reset hasInit for new card
    loadingMessages = false;
    
    // Initialize chat for this card
    setTimeout(() => {
      initializeChat();
    }, 0);
  }

  const dispatch = createEventDispatcher();
  
  // Selected wizard state
  let selectedWizard = null;
  
  // Computed disabled state for input - disabled until wizard is selected
  $: isInputDisabled = !selectedWizard;
  
  // Chat state
  let messages = [];
  let loadingMessages = false;
  
  // Messages and loading state
  let input = '';
  let current = null;
  let hasInit = false;
  let branches = [];
  let currentBranch = null;
  let currentBranchId = 'main';
  let usage = null;
  let showUsageStats = false;
  let showSessionNavigator = false;
  let sessions = [];
  let currentSession = null;
  let isMobile = false;
  let sessionId = null; // Session ID for persisting messages
  let branchId = null; // Branch ID for the current conversation

  // Wizard tier mapping (based on the model dropdown logic)
  const WIZARD_TIERS = {
    'free': 0,
    'pro': 1,
    'studio': 2
  };

  // Get unique wizard models with tier information
  $: wizardModels = getUniqueWizardModels().map(model => {
    const tier = getWizardTier(model.key);
    const isAvailable = isWizardAvailable(model.key, tier);
    
    return {
      ...model,
      tier,
      isAvailable,
      tierName: getTierName(tier)
    };
  });

  // Group wizards by tier
  $: freeWizards = wizardModels.filter(w => w.tier === WIZARD_TIERS.free);
  $: proWizards = wizardModels.filter(w => w.tier === WIZARD_TIERS.pro);
  $: studioWizards = wizardModels.filter(w => w.tier === WIZARD_TIERS.studio);

  function getUniqueWizardModels() {
    // Create a unique list of wizards based on their names
    const wizardNames = [
      'quest', 'tina', 'spark', 'prism', 'sage',  // Free
      'titan', 'ember', 'gem', 'gale', 'aurora', 'vega',  // Pro
      'verse', 'dash', 'opal'  // Studio
    ];
    
    return wizardNames.map(name => {
      // Find the first model key that maps to this wizard name
      const modelKey = getModelKeyFromWizardName(name);
      const aiInfo = getAIInfo(modelKey);
      
      const wizardData = {
        ...aiInfo, // Spread all aiInfo properties first
        key: modelKey,
        avatarPath: getWizardAvatar(modelKey), // Use custom wizard avatar function (override aiInfo.avatar)
        avatar: `wizard-${name}.png`, // Also override the avatar property
        tier: getWizardTier(modelKey),
        isAvailable: isWizardAvailable(getWizardTier(modelKey))
      };
      
      return wizardData;
    });
  }

  function getModelKeyFromWizardName(wizardName) {
    // Map wizard names back to their primary model keys
    const wizardToModelMap = {
      'quest': 'qwen-72b',
      'tina': 'llama-70b', 
      'spark': 'micro',
      'prism': 'gpt-oss',
      'sage': 'deepseek-v3',
      'titan': 'llama-405b',
      'ember': 'speed',
      'gem': 'gemini-pro',
      'gale': 'mistral-large',
      'aurora': 'gpt4',
      'vega': 'gpt-5',
      'verse': 'quality',
      'dash': 'gpt4-turbo',
      'opal': 'claude-opus'
    };
    
    return wizardToModelMap[wizardName] || 'speed';
  }

  function getWizardTier(modelKey) {
    // Map wizard names to tiers based on the new tier structure
    const freeWizards = ['quest', 'tina', 'spark', 'prism', 'sage'];
    const proWizards = ['titan', 'ember', 'gem', 'gale', 'aurora', 'vega'];
    const studioWizards = ['verse', 'dash', 'opal'];
    
    // Get the wizard name from the model key
    const wizardName = getWizardNameFromModelKey(modelKey);
    
    if (freeWizards.includes(wizardName)) return WIZARD_TIERS.free;
    if (proWizards.includes(wizardName)) return WIZARD_TIERS.pro;
    if (studioWizards.includes(wizardName)) return WIZARD_TIERS.studio;
    
    return WIZARD_TIERS.free; // Default to free
  }

  function getWizardNameFromModelKey(modelKey) {
    // Map model keys to wizard names based on the AI avatars config
    const modelToWizardMap = {
      'speed': 'ember',
      'quality': 'verse', 
      'gpt4': 'aurora',
      'micro': 'spark',
      'gpt-oss': 'prism',
      'gpt4-turbo': 'dash',
      'claude-opus': 'opal',
      'gemini-pro': 'gem',
      'llama-70b': 'tina',
      'llama-405b': 'titan',
      'mistral-large': 'gale',
      'qwen-72b': 'quest',
      'deepseek-v3': 'sage',
      'gpt-5': 'vega',
      // Full model names
      'claude-3-haiku': 'ember',
      'claude-3-5-sonnet': 'verse',
      'gpt-4o': 'aurora',
      'gemini-flash-1.5': 'spark',
      'gpt-4o-mini-2024-07-18': 'prism',
      'gpt-4-turbo': 'dash',
      'claude-3-opus': 'opal',
      'gemini-pro-1.5': 'gem',
      'llama-3.1-70b-instruct': 'tina',
      'llama-3.1-405b-instruct': 'titan',
      'qwen-2.5-72b-instruct': 'quest'
    };
    
    return modelToWizardMap[modelKey] || 'ember'; // Default to ember
  }

  function isWizardAvailable(modelKey, tier) {
    return effectiveTier >= tier;
  }

  function getTierName(tier) {
    switch (tier) {
      case WIZARD_TIERS.free: return 'Free';
      case WIZARD_TIERS.pro: return 'Pro';
      case WIZARD_TIERS.studio: return 'Studio';
      default: return 'Free';
    }
  }

  function getCompanyDisplayName(company) {
    const companyNames = {
      'anthropic': 'Anthropic',
      'openai': 'OpenAI',
      'google': 'Google',
      'meta': 'Meta',
      'mistral': 'Mistral',
      'alibaba': 'Alibaba',
      'deepseek': 'DeepSeek'
    };
    
    return companyNames[company] || 'Independent';
  }

  function getWizardCardClasses(tier, isSelected = false) {
    const baseClasses = 'transition-all duration-200 hover:shadow-lg hover:scale-105';
    const selectedClasses = isSelected ? 'ring-4 ring-purple-400 dark:ring-purple-500 shadow-2xl scale-105' : '';
    
    switch (tier) {
      case WIZARD_TIERS.free:
        return `bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 ${baseClasses} ${selectedClasses}`;
      case WIZARD_TIERS.pro:
        return `bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800 ${baseClasses} ${selectedClasses}`;
      case WIZARD_TIERS.studio:
        return `bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200 dark:border-purple-800 ${baseClasses} ${selectedClasses}`;
      default:
        return `bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 ${baseClasses} ${selectedClasses}`;
    }
  }

  function getTierTagColor(tier) {
    switch (tier) {
      case WIZARD_TIERS.free:
        return 'bg-green-500';
      case WIZARD_TIERS.pro:
        return 'bg-blue-500';
      case WIZARD_TIERS.studio:
        return 'bg-purple-500';
      default:
        return 'bg-green-500';
    }
  }

  function getTierTagText(tier) {
    switch (tier) {
      case WIZARD_TIERS.free:
        return 'FREE';
      case WIZARD_TIERS.pro:
        return 'PRO';
      case WIZARD_TIERS.studio:
        return 'STUDIO';
      default:
        return 'FREE';
    }
  }

  function getPortraitBorderClass(tier) {
    switch (tier) {
      case WIZARD_TIERS.free:
        return 'border-green-300 dark:border-green-700';
      case WIZARD_TIERS.pro:
        return 'border-blue-300 dark:border-blue-700';
      case WIZARD_TIERS.studio:
        return 'border-purple-300 dark:border-purple-700';
      default:
        return 'border-green-300 dark:border-green-700';
    }
  }

  function getOrderTextColor(tier) {
    switch (tier) {
      case WIZARD_TIERS.free:
        return 'text-green-600 dark:text-green-400';
      case WIZARD_TIERS.pro:
        return 'text-blue-600 dark:text-blue-400';
      case WIZARD_TIERS.studio:
        return 'text-purple-600 dark:text-purple-400';
      default:
        return 'text-green-600 dark:text-green-400';
    }
  }

  function getTierIcon(tier) {
    switch (tier) {
      case WIZARD_TIERS.free: return '🆓';
      case WIZARD_TIERS.pro: return '👑';
      case WIZARD_TIERS.studio: return '⭐';
      default: return '🆓';
    }
  }

  function selectWizard(wizard) {
    if (!wizard.isAvailable) return;
    
    console.log('🧙‍♂️ Selecting wizard:', wizard.name, 'Key:', wizard.key);
    
    // If it's the same wizard, don't do anything
    if (selectedWizard?.key === wizard.key) {
      console.log('🧙‍♂️ Same wizard selected, keeping current messages');
      return;
    }
    
    selectedWizard = wizard;
    
    // Update the model if chat is initialized
    if (current && hasInit) {
      current.model = wizard.key;
      console.log('🧙‍♂️ Updated model to:', wizard.key, 'Messages preserved:', messages.length);
    } else {
      console.log('🧙‍♂️ Chat not initialized yet, messages:', messages.length);
    }
  }

  async function initializeChat() {
    // Prevent multiple initializations
    if (hasInit) {
      return;
    }
    
    // Initialize chat state for the selected wizard
    hasInit = true;
    
    // Use the current card ID to generate consistent session and branch IDs
    const cardId = currentCardId || storedCard?.id || card?.id;
    if (!cardId) {
      console.error('🧙‍♂️ No card ID available for initialization');
      return;
    }
    
    // Create a card-specific session ID for this card's wizard conversations
    const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'; // DNS namespace
    const name = `card-${cardId}-${worldId || 'council'}`;
    sessionId = uuidv5(name, namespace);
    
    // Chat initialized for card
    
    // Ensure we have a valid project ID
    if (!worldId) {
      console.error('🧙‍♂️ No project ID provided to Wizards Council');
      return;
    }
    
    console.log('🧙‍♂️ Project ID for branches:', worldId);
    
    current = {
      id: worldId, // Use the current project ID
      name: 'Wizard\'s Council',
      model: 'ember', // Default model, will be updated when wizard is selected
      created_at: new Date().toISOString(),
      project_id: worldId // Use the actual project ID
    };
    
    // Create a session object
    const cardTitle = storedCard?.title || card?.title || 'Untitled Card';
    
    // Generate consistent branch ID for this card
    branchId = `branch-${cardId}`;
    
    currentSession = {
      id: sessionId,
      session_name: `${cardTitle} - Wizard's Council`,
      created_at: new Date().toISOString()
    };
    
    // Use the dummy session ID for all Wizards Council conversations
    // But each card will have its own branch within that session
    sessionId = '00000000-0000-0000-0000-000000000001';
    currentSession.id = sessionId;
    currentSession.session_name = `Wizards Council - ${cardTitle}`;

    console.log('🧙‍♂️ Using dummy session ID for Wizards Council:', sessionId);
    
    // Check if branch already exists for this card, create if not
    console.log('🧙‍♂️ Checking for existing branch for card:', branchId);
    
    try {
      // First, try to list existing branches to see if this one exists
      const listResponse = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'list',
          projectId: worldId,
          sessionId: sessionId
        })
      });
      
      let branchExists = false;
      let listData = null;
      if (listResponse.ok) {
        listData = await listResponse.json();
        console.log('🧙‍♂️ All branches found:', listData.branches?.map(b => ({ name: b.branch_name, id: b.branch_id })) || []);
        console.log('🧙‍♂️ Looking for branch:', branchId);
        branchExists = listData.branches?.some(b => b.branch_id === branchId);
        console.log('🧙‍♂️ Branch exists check:', branchExists, 'Total branches:', listData.branches?.length || 0);
      }
      
      // Only create the branch if it doesn't exist
      if (!branchExists) {
        const branchData = {
          action: 'create',
          projectId: worldId,
          sessionId: sessionId,
          messageId: null, // No parent message for card-specific branches
          branchName: `${cardTitle} - Wizard's Council`,
          branchId: branchId // Use our pre-generated branch ID
        };
        
        console.log('🧙‍♂️ Creating branch with data:', branchData);
        
        const branchResponse = await fetch('/api/branches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(branchData)
        });
        
        console.log('🧙‍♂️ Branch response status:', branchResponse.status);
        
        if (branchResponse.ok) {
          const branchResult = await branchResponse.json();
          console.log('🧙‍♂️ Branch created successfully:', branchResult);
          // Keep using our pre-generated branch ID
        } else {
          const errorText = await branchResponse.text();
          console.error('Failed to create branch:', branchResponse.status, errorText);
          // Keep using our pre-generated branch ID as fallback
        }
      } else {
        console.log('🧙‍♂️ Branch already exists, using:', branchId);
      }
    } catch (error) {
      console.error('Error managing branch:', error);
      // Continue anyway with the generated branch ID
    }
    
    // Update branch state
    currentBranchId = branchId;
    currentBranch = {
      branch_id: branchId,
      branch_name: `${cardTitle} - Wizard's Council`,
      colorClass: 'bg-white border-gray-200',
      color_index: 0 // Default to main branch color
    };
    
    
    // Load all branches for this session
    try {
      const listBranchesResponse = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'list',
          projectId: worldId,
          sessionId: sessionId
        })
      });
      
      if (listBranchesResponse.ok) {
        const listData = await listBranchesResponse.json();
        branches = listData.branches || [];
      } else {
        console.error('Failed to load branches:', listBranchesResponse.status, await listBranchesResponse.text());
        branches = [];
      }
    } catch (error) {
      console.error('Error loading branches:', error);
      branches = [];
    }
    
    // Load existing messages for this branch
    await loadExistingMessages();
  }

  async function loadExistingMessages() {
    if (!worldId || !sessionId || !branchId) {
      console.error('🧙‍♂️ Missing required IDs for message loading');
      return;
    }
    
    // Loading messages for this card's branch
    
    loadingMessages = true;
    
    try {
      const response = await fetch('/api/branches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get-messages',
          projectId: worldId,
          sessionId: sessionId,
          branchId: branchId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Messages loaded successfully
        
        if (data.messages && data.messages.length > 0) {
          // Load existing messages, ensuring correct wizard avatar paths
          messages = data.messages.map(msg => ({
            ...msg,
            // Ensure correct wizard avatar paths
            avatar: msg.avatar || `wizard-${getWizardNameFromModelKey(msg.model_key)}.png`,
            avatarPath: getWizardAvatar(msg.model_key) || `/avatars/wizard-ember.png`,
            model_key: msg.model_key
          }));
          // Messages loaded successfully
        } else {
          // No messages found for this card
        }
      } else {
        console.error('🧙‍♂️ Failed to load messages:', response.status);
      }
    } catch (error) {
      console.error('🧙‍♂️ Error loading messages:', error);
    } finally {
      loadingMessages = false;
    }
  }

  function surpriseMe() {
    // Get only available wizards for the current tier
    const availableWizards = wizardModels.filter(wizard => wizard.isAvailable);
    
    if (availableWizards.length === 0) {
      // If no wizards are available, show a message or do nothing
      return;
    }
    
    // Randomly select one of the available wizards
    const randomIndex = Math.floor(Math.random() * availableWizards.length);
    const randomWizard = availableWizards[randomIndex];
    
    // If it's the same wizard, don't do anything
    if (selectedWizard?.key === randomWizard.key) {
      console.log('🧙‍♂️ Same wizard selected in surprise me, keeping current messages');
      return;
    }
    
    selectedWizard = randomWizard;
    
    // Only initialize chat if it hasn't been initialized yet
    if (!hasInit) {
      initializeChat();
    } else {
      // Load existing messages for this wizard without reinitializing
      loadExistingMessages();
    }
  }

  function closeModal() {
    // Don't reset chat state - keep messages for next time
    dispatch('close');
  }

  // Send message function for Wizard's Council
  async function send(event) {
    console.log('🧙‍♂️ Send function called:', { 
      event, 
      selectedWizard: !!selectedWizard, 
      current: !!current, 
      message: event.detail?.message,
      hasEventDetail: !!event.detail,
      eventType: event.type,
      eventDetail: event.detail
    });
    
    if (!current || !event.detail?.message?.trim()) {
      console.log('🧙‍♂️ Send function early return:', { 
        current: !!current, 
        message: event.detail?.message,
        messageTrimmed: event.detail?.message?.trim()
      });
      return;
    }
    
    const userMsg = event.detail.message;
    input = '';
    
    // Don't add card context to user message - AI will have it from system context
    const userMessageWithContext = userMsg;
    
    // Optimistic UI - show user message immediately
    const userMsgId = uuidv4();
    const assistantMsgId = uuidv4();
    
    messages = [
      ...messages, 
      { id: userMsgId, role: 'user', content: userMsg, created_at: new Date().toISOString() }, 
      { 
        id: assistantMsgId, 
        role: 'assistant', 
        content: '', 
        model_key: selectedWizard?.key || 'ember', 
        created_at: new Date().toISOString(),
        avatar: selectedWizard?.avatar || '/avatars/wizard-ember.png',  // Use the wizard's avatar
        avatarPath: selectedWizard?.avatarPath || '/avatars/wizard-ember.png',  // Use the wizard's avatar path
        wizard_name: selectedWizard?.name || 'Ember',  // Store the wizard's name
        wizard_company: selectedWizard?.company || 'anthropic',  // Store the wizard's company
        isLoading: true // Add loading indicator
      }
    ];

    // Trigger scroll to bottom after adding new messages
    if (browser) {
      // Immediate scroll trigger
      window.dispatchEvent(new CustomEvent('chat:scroll-to-bottom'));
      
      // Also trigger after a short delay to ensure DOM updates
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('chat:scroll-to-bottom'));
      }, 50);
    }
    
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      let assistantText = '';
      
      // Prepare card context for AI (sent separately, not concatenated with user message)
      const currentCard = storedCard || card;
      const cardContext = currentCard ? `

[SYSTEM: You are helping with this specific card. Do not repeat this information to the user unless they ask about it directly.]
Card: ${currentCard.title || 'Untitled Card'}
Type: ${currentCard.type || 'Unknown'} | Rarity: ${currentCard.rarity || 'common'}
${currentCard.content ? `Content: ${currentCard.content}` : ''}
${currentCard.tags && currentCard.tags.length > 0 ? `Tags: ${currentCard.tags.join(', ')}` : ''}
[/SYSTEM]` : '';

      // Use the same streaming API as regular chat
      const chatPayload = { 
        projectId: current.id, 
        sessionId: sessionId, // Use the dynamic session ID
        message: userMsg, // User message only (no system context concatenated)
        systemContext: cardContext, // System context sent separately
        modelKey: selectedWizard?.key || 'ember', 
        tz, 
        branchId: currentBranchId // Use the card-specific branch ID
      };
      
      // Send message to chat API
      
      await robustStreamingFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatPayload)
      }, (chunk) => {
        if (chunk === '[DONE]') return;
        
        assistantText += chunk;
        
        // Live update last assistant message
        messages = messages.map((m, i, arr) => 
          i === arr.length - 1 ? 
          { ...m, content: assistantText, isLoading: false } : 
          m
        );
      }, {
        timeout: 120000, // 2 minutes for chat
        maxRetries: 2,
        onRetry: (attempt, error, delay) => {
          // Show retry indicator in message
          messages = messages.map((m, i, arr) => 
            i === arr.length - 1 ? 
            { ...m, content: `Retrying... (${attempt}/3)`, isLoading: true, isRetrying: true } : 
            m
          );
        }
      });
      
    } catch (error) {
      console.error('Wizard Council: Error sending message:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      console.error('Error string:', String(error));
      
      // Update the assistant message with error
      const errorMessage = error?.message?.includes('Network connection failed') ?
        'Network error. Please check your connection and try again.' :
        error?.message?.includes('timeout') ?
        'Request timed out. Please try again.' :
        `Error: ${error?.message || String(error) || 'Unknown error'}`;
      
      messages = messages.map((m, i, arr) => 
        i === arr.length - 1 ? 
        { ...m, content: errorMessage, isLoading: false, isError: true } : 
        m
      );
    }
  }

  // Chat event handlers
  function handleMessageSent(event) {
    // Handle message sent from chat interface
    const { message } = event.detail;
    messages = [...messages, message];
  }

  function handleInputChange(event) {
    // Handle input change from chat interface
    input = event.detail.value;
  }

  function handleBranchChange(event) {
    // Handle branch change from chat interface
    currentBranch = event.detail.branch;
    currentBranchId = event.detail.branchId;
  }

  function handleSessionChange(event) {
    // Handle session change from chat interface
    currentSession = event.detail.session;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      closeModal();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
</script>

<!-- Modal Overlay -->
{#if isVisible}
  <div 
    class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
    style="background: rgba(0, 0, 0, 0.8); backdrop-filter: blur(4px);"
    on:click={closeModal}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="wizards-council-title"
    tabindex="-1"
  >
    <!-- Modal Content -->
    <div 
      class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700"
      on:click|stopPropagation
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <div class="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
            <Users size={24} class="text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h2 id="wizards-council-title" class="text-2xl font-bold text-gray-900 dark:text-white">
              The Wizard's Council
            </h2>
            <p class="text-sm text-gray-600 dark:text-gray-400">
              Summon wise magical experts to aid your creative projects
            </p>
          </div>
        </div>
        
        <!-- Surprise Me Button -->
        <div class="flex items-center gap-3">
          <div class="text-right">
            <p class="text-sm font-medium text-purple-600 dark:text-purple-400 italic">
              Let the winds of fate<br />wiskr you away!
            </p>
          </div>
          <button
            on:click={surpriseMe}
            class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
            title="Let the winds of fate wiskr you away!"
          >
            ✨ Surprise me
          </button>
          <button
            on:click={closeModal}
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Close"
          >
            <X size={20} class="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="flex h-[calc(90vh-120px)]">
        <!-- Left Side: Card View -->
        <div class="w-1/4 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Selected Card</h3>
          </div>
          <div class="flex-1 overflow-y-auto p-4">
            {#if storedCard}
              <!-- Card Display - Using Card component like merge/split modals -->
              <div class="flex justify-center">
                <div 
                  class="cursor-pointer"
                  on:click={() => dispatch('card-zoom', { card: storedCard })}
                  role="button"
                  tabindex="0"
                  on:keydown={(e) => e.key === 'Enter' && dispatch('card-zoom', { card: storedCard })}
                  aria-label="Zoom card: {storedCard.title || 'Untitled Card'}"
                >
                  <Card 
                    card={storedCard}
                    searchTerm=""
                    showActions={false}
                    xPaddingClass="px-2"
                    key={storedCard?.id || 'no-id'}
                  />
                </div>
              </div>
            {:else}
              <div class="text-center text-gray-500 dark:text-gray-400">
                <p class="text-sm">No card selected</p>
              </div>
            {/if}
          </div>
        </div>
        
        <!-- Middle: Chat Interface -->
        <div class="w-1/2 flex flex-col overflow-hidden">
          <!-- Chat Interface -->
          <div class="flex-1 overflow-hidden">
            <ChatInterface 
              {current}
              {hasInit}
              {messages}
              {loadingMessages}
              bind:input={input}
              modelKey={selectedWizard?.key || 'ember'}
              availableModels={wizardModels}
              {branches}
              {currentBranch}
              {currentBranchId}
              {usage}
              {showUsageStats}
              {showSessionNavigator}
              {sessions}
              {currentSession}
              {isMobile}
              {user}
              {userTier}
              {effectiveTier}
              hideModelDropdown={true}
              hideInfoPopup={true}
              disableBranches={true}
              hideSessions={true}
              disableInput={isInputDisabled}
              on:send={send}
              on:message-sent={handleMessageSent}
              on:input-change={handleInputChange}
              on:branch-change={handleBranchChange}
              on:session-change={handleSessionChange}
            />
          </div>
        </div>
        
        <!-- Right Side: Wizards List -->
        <div class="w-1/4 border-l border-gray-200 dark:border-gray-700 flex flex-col">
          <!-- Select a wizard text -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 text-center">Select a wizard...</h3>
          </div>
          
          <!-- Wizards Scrollable List -->
          <div class="flex-1 overflow-y-auto p-4">
            <div class="grid grid-cols-1 gap-3">
              {#each wizardModels as wizard}
                <button
                  on:click={() => selectWizard(wizard)}
                  class="w-full group relative rounded-xl border transition-all duration-200 min-h-[100px] {wizard.isAvailable 
                    ? getWizardCardClasses(wizard.tier, selectedWizard?.key === wizard.key) 
                    : 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border-gray-200 dark:border-gray-700 opacity-60 cursor-not-allowed'}"
                  data-wizard-key={wizard.key}
                  data-selected={selectedWizard?.key === wizard.key}
                  title={wizard.description}
                  disabled={!wizard.isAvailable}
                >
                <!-- Tier Tag -->
                <div class="wizards-tier-tag absolute top-2 right-2 {wizard.isAvailable ? getTierTagColor(wizard.tier) : 'bg-gray-500'} text-white font-bold px-2 py-1 rounded-lg">
                  {getTierTagText(wizard.tier)}
                </div>
                
                <div class="flex items-stretch h-full">
                  <!-- Portrait -->
                  <div class="wizards-portrait w-16 h-full overflow-hidden border-r-2 rounded-l-xl {wizard.isAvailable 
                    ? getPortraitBorderClass(wizard.tier) 
                    : 'border-gray-300 dark:border-gray-600 grayscale'} flex-shrink-0"
                  >
                    <img 
                      src={wizard.avatarPath} 
                      alt={wizard.name}
                      class="wizards-portrait-img w-full h-full object-cover rounded-l-xl"
                    />
                  </div>
                  
                  <!-- Info -->
                  <div class="flex-1 text-left min-w-0 p-3">
                    <div class="flex items-center gap-2 mb-1">
                      <h3 class="font-semibold text-gray-900 dark:text-white text-sm">
                        {wizard.name}
                      </h3>
                    </div>
                    <p class="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                      {wizard.bestFor}
                    </p>
                    <p class="text-xs {wizard.isAvailable ? getOrderTextColor(wizard.tier) : 'text-gray-500 dark:text-gray-400'} font-medium mt-1">
                      {getCompanyDisplayName(wizard.company)} Order
                    </p>
                  </div>
                </div>
              </button>
              {/each}
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for the modal content */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: transparent;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.3);
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.5);
  }

  /* Namespaced styles for wizards modal to prevent global CSS interference */
  .wizards-tier-tag {
    font-size: 0.75rem !important; /* text-xs equivalent */
    line-height: 1rem !important;
    z-index: 10 !important;
  }

  .wizards-portrait {
    width: 4rem !important; /* w-16 equivalent */
    height: 100% !important;
    overflow: hidden !important;
    flex-shrink: 0 !important;
  }

  .wizards-portrait-img {
    width: 100% !important;
    height: 100% !important;
    object-fit: cover !important;
    object-position: center !important;
  }
</style>
