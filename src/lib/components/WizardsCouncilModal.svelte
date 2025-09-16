<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { X, Users, Lock, Crown, Star } from 'lucide-svelte';
  import { getAIInfo, getAllAIModels } from '$lib/config/aiAvatars.js';
  import { robustStreamingFetch } from '$lib/utils/networkUtils.js';
  import ProBadge from './ProBadge.svelte';
  import ChatInterface from './ChatInterface.svelte';
  import VirtualMessageList from './VirtualMessageList.svelte';

  export let isVisible = false;
  export let effectiveTier = 0;
  export let user = null;
  export let userTier = 0;
  export let worldId = null;

  const dispatch = createEventDispatcher();
  
  // Selected wizard state
  let selectedWizard = null;
  
  // Chat state
  let messages = [];
  let loadingMessages = false;
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
        avatarPath: `/avatars/wizard-${name}.png`, // Override with wizard avatar images
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
    
    selectedWizard = wizard;
    initializeChat(wizard);
  }

  function initializeChat(wizard) {
    // Initialize chat state for the selected wizard
    hasInit = true;
    current = {
      id: worldId || 'wizards-council', // Use the current project ID or fallback
      name: 'Wizard\'s Council',
      model: wizard.key,
      created_at: new Date().toISOString()
    };
    
    // Initialize with a welcome message from the wizard
    const welcomeMessage = {
      id: `welcome-${Date.now()}`,
      role: 'assistant',
      content: `Greetings! I am ${wizard.name} from the ${getCompanyDisplayName(wizard.company)} Order. ${wizard.description} I'm here to help you with ${wizard.bestFor}. How may I assist you today?`,
      created_at: new Date().toISOString(),
      model: wizard.key,
      model_key: wizard.key  // This is what MessageItem uses for getAIAvatar
    };
    
    messages = [welcomeMessage];
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
    
    selectedWizard = randomWizard;
    initializeChat(randomWizard);
  }

  function closeModal() {
    dispatch('close');
  }

  // Send message function for Wizard's Council
  async function send(event) {
    if (!selectedWizard || !current || !event.detail.message.trim()) return;
    
    const userMsg = event.detail.message;
    input = '';
    
    // Optimistic UI - show user message immediately
    const tempUserMsgId = 'temp_user_' + Date.now();
    const tempAssistantMsgId = 'temp_assistant_' + Date.now();
    
    messages = [
      ...messages, 
      { id: tempUserMsgId, role: 'user', content: userMsg, created_at: new Date().toISOString() }, 
      { 
        id: tempAssistantMsgId, 
        role: 'assistant', 
        content: '', 
        model_key: selectedWizard.key, 
        created_at: new Date().toISOString(),
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
      
      // Use the same streaming API as regular chat
      await robustStreamingFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId: current.id, 
          sessionId: 'wizards-council-session', // Use a fixed session for Wizard's Council
          message: userMsg, 
          modelKey: selectedWizard.key, 
          tz, 
          branchId: 'main' // Use main branch for Wizard's Council
        })
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
      
      // Update the assistant message with error
      const errorMessage = error.message.includes('Network connection failed') ?
        'Network error. Please check your connection and try again.' :
        error.message.includes('timeout') ?
        'Request timed out. Please try again.' :
        `Error: ${error.message}`;
      
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
        <button
          on:click={closeModal}
          class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Close"
        >
          <X size={20} class="text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex h-[calc(90vh-120px)]">
        <!-- Left Side: Wizards List -->
        <div class="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <!-- Instructions -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
              Select a wizard to begin your magical consultation
            </p>
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
                  title={wizard.description}
                  disabled={!wizard.isAvailable}
                >
                <!-- Tier Tag -->
                <div class="absolute top-2 right-2 {wizard.isAvailable ? getTierTagColor(wizard.tier) : 'bg-gray-500'} text-white text-xs font-bold px-2 py-1 rounded-lg">
                  {getTierTagText(wizard.tier)}
                </div>
                
                <div class="flex items-stretch h-full">
                  <!-- Portrait -->
                  <div class="w-16 h-full overflow-hidden border-r-2 rounded-l-xl {wizard.isAvailable 
                    ? getPortraitBorderClass(wizard.tier) 
                    : 'border-gray-300 dark:border-gray-600 grayscale'} flex-shrink-0"
                  >
                    <img 
                      src={wizard.avatarPath} 
                      alt={wizard.name}
                      class="w-full h-full object-cover rounded-l-xl"
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
        
        <!-- Right Side: Chat Interface -->
        <div class="w-2/3 flex flex-col">
          {#if selectedWizard}
            <!-- Chat Header -->
            <div class="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full overflow-hidden border-2 {getPortraitBorderClass(selectedWizard.tier)}">
                  <img 
                    src={selectedWizard.avatarPath} 
                    alt={selectedWizard.name}
                    class="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 class="font-semibold text-gray-900 dark:text-white">
                    {selectedWizard.name}
                  </h3>
                  <p class="text-xs text-gray-600 dark:text-gray-400">
                    {getCompanyDisplayName(selectedWizard.company)} Order • {selectedWizard.bestFor}
                  </p>
                </div>
              </div>
            </div>
            
            <!-- Chat Interface -->
            <div class="flex-1 overflow-hidden">
              <ChatInterface 
                {current}
                {hasInit}
                {messages}
                {loadingMessages}
                bind:input={input}
                modelKey={selectedWizard.key}
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
                on:submit={send}
                on:message-sent={handleMessageSent}
                on:input-change={handleInputChange}
                on:branch-change={handleBranchChange}
                on:session-change={handleSessionChange}
              />
            </div>
          {:else}
            <!-- No Wizard Selected State -->
            <div class="flex-1 flex items-center justify-center p-8">
              <div class="text-center">
                <div class="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users size={32} class="text-purple-600 dark:text-purple-400" />
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Choose Your Wizard
                </h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">
                  Select a wizard from the left to begin your magical consultation
                </p>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <!-- Footer -->
      <div class="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div class="flex items-center justify-center">
          <div class="flex items-center gap-3">
            <p class="text-sm font-medium text-purple-600 dark:text-purple-400 italic">
              Let the winds of fate wiskr you away!
            </p>
            <button
              on:click={surpriseMe}
              class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105"
              title="Let the winds of fate wiskr you away!"
            >
              ✨ Surprise me
            </button>
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
</style>
