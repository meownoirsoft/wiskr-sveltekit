<!-- src/routes/projects/+page.svelte -->
<script>
  import { onMount, onDestroy, tick } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase.js';
  import { loadAvatars } from '$lib/stores/avatars.js';
  import { marked } from 'marked';
  import { markCardAsNew } from '$lib/stores/newCards.js';
  
// Import components
import Binder from '$lib/components/Binder.svelte';
import IdeasColumn from '$lib/components/IdeasColumn.svelte';
import ChatInterface from '$lib/components/ChatInterface.svelte';
import FormatModal from '$lib/components/modals/FormatModal.svelte';
import BranchModal from '$lib/components/modals/BranchModal.svelte';
import NewProjectModal from '$lib/components/modals/NewProjectModal.svelte';
import ProjectSettingsModal from '$lib/components/modals/ProjectSettingsModal.svelte';
import HeaderProjectSelector from '$lib/components/HeaderProjectSelector.svelte';
import SessionNavigator from '$lib/components/SessionNavigator.svelte';
import BranchManager from '$lib/components/BranchManager.svelte';
import SessionLogicManager from '$lib/components/SessionLogicManager.svelte';
import ContextManager from '$lib/components/ContextManager.svelte';
import ChatManager from '$lib/components/ChatManager.svelte';
import DeckDrawer from '$lib/components/DeckDrawer.svelte';
import DeckView from '$lib/components/DeckView.svelte';

// New management components
import ProjectState from '$lib/components/ProjectState.svelte';
import ModalManager from '$lib/components/ModalManager.svelte';
import PanelManager from '$lib/components/PanelManager.svelte';

  
  // Import Lucide icons
  import { Music, Camera, Video, ShoppingBag, MessageCircle, Briefcase, Shirt, MapPin, Users, MessageSquare, FileText, Hash, ChevronsLeft, ChevronsRight, BarChart3, Settings, Settings2, LogOut, X } from 'lucide-svelte';
  import MobileSearch from '$lib/components/MobileSearch.svelte';

  // Import styles
  import '$lib/components/styles.css';
  
  // Configure marked for better rendering
  marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true, // Enable GitHub flavored markdown
  });
  
  export let data;
  
  // Project state is now managed by ProjectState component
  // These will be bound to ProjectState component
  let projects = data?.projects ?? [];
  
  // Test project removed - context menu positioning fix is complete
  
  let selectedId = null;
  let current = null;
  let hasInit = false;
  let modelKey = 'speed'; // 'speed' | 'quality' | 'micro' | etc.
  let modelKeyLoaded = false; // Flag to prevent saving before loading
  

  // Project selection is now handled by ProjectState component
  async function selectProjectById(id) {
    if (projectState) {
      await projectState.selectProjectById(id);
    }
  }

  async function reloadProjects(selectId) {
    const { data: p, error } = await supabase
      .from('projects')
      .select('id, name, icon, color, brief_text, description, created_at')
      .order('created_at');
    if (error) {
      console.error('reloadProjects error', error);
      return;
    }
    projects = p ?? [];

    const nextId =
      (selectId && projects.find(x => x.id === selectId)?.id) ||
      (selectedId && projects.find(x => x.id === selectedId)?.id) ||
      projects[0]?.id;
    
    // Notify layout about updated projects (same as initial load)
    if (browser && projects.length > 0) {
      window.dispatchEvent(new CustomEvent('layout:update-projects', {
        detail: {
          projects: projects,
          currentProjectId: nextId
        }
      }));
    }
    
    if (nextId) await selectProjectById(nextId);
  }

  // Always show binder (removed builder mode)

  // Mobile Search state
  let showMobileSearch = false;
  let searchInput = '';

  // Left column state
  let search = '';

  function clearSearch() {
    search = '';
  }

  // Mobile Search functions
  function toggleMobileSearch() {
    if (showMobileSearch) {
      // Second click: close and clear
      showMobileSearch = false;
      search = ''; // Clear search filtering when closing search
    } else {
      // First click: open
      showMobileSearch = true;
    }
  }

  // Listen for mobile search toggle event
  onMount(() => {
    if (browser) {
      window.addEventListener('mobile:toggle-search', toggleMobileSearch);
      window.addEventListener('mobile:close-search', () => {
        showMobileSearch = false;
      });
      window.addEventListener('search:clear-filter', () => {
        search = '';
      });
    }
    
    return () => {
      if (browser) {
        window.removeEventListener('mobile:toggle-search', toggleMobileSearch);
        window.removeEventListener('mobile:close-search', () => {
          showMobileSearch = false;
        });
        window.removeEventListener('search:clear-filter', () => {
          search = '';
        });
      }
    };
  });

  function closeAllPanels() {
    showSessionNavigator = false;
    showLeftPanel = false;
    showRightPanel = false;
    // Clear search filtering when closing panels
    search = '';
    // Add other panels as needed
  }

  function openPanel(panelType) {
    closeAllPanels();
    
    switch (panelType) {
      case 'cards':
        showLeftPanel = true;
        break;
      case 'questions':
      case 'ideas':
        showRightPanel = true;
        break;
      case 'chats':
        showSessionNavigator = true;
        break;
      // Add other panel types as needed
    }
  }

  function scrollToResult(result) {
    // Implementation will depend on the result type
    
    // Set the search term to filter content in panels
    const searchTerm = result.searchTerm || '';
    search = searchTerm;
    
    // Dispatch event to highlight and scroll to result
    window.dispatchEvent(new CustomEvent('search:highlight-result', { 
      detail: { 
        result,
        searchTerm: searchTerm
      } 
    }));
    
    // Handle different result types
    switch (result.type) {
      case 'cards':
        // Scroll to cards panel and highlight the card
        if (binderComponent) {
          binderComponent.highlightCard(result.id, searchTerm);
        }
        break;
        
      case 'docs':
        // Scroll to docs panel and highlight the doc
        if (binderComponent) {
          binderComponent.highlightDoc(result.id, searchTerm);
        }
        break;
        
      case 'chats':
        // Scroll to chat message
        if (chatManager) {
          chatManager.scrollToMessage(result.messageId, searchTerm);
        }
        break;
        
      case 'questions':
        // Open questions panel and highlight the question
        showRightPanel = true;
        // On mobile, close left panel if both are open
        if (!isDesktop && showLeftPanel) {
          showLeftPanel = false;
        }
        // Wait for panel to open, then highlight
        setTimeout(() => {
          if (ideasColumnComponent && typeof ideasColumnComponent.highlightQuestion === 'function') {
            ideasColumnComponent.highlightQuestion(result.id, searchTerm);
          }
        }, 100);
        break;
        
      case 'ideas':
        // Open ideas panel and highlight the idea
        showRightPanel = true;
        // On mobile, close left panel if both are open
        if (!isDesktop && showLeftPanel) {
          showLeftPanel = false;
        }
        // Wait for panel to open, then highlight
        setTimeout(() => {
          if (ideasColumnComponent && typeof ideasColumnComponent.highlightIdea === 'function') {
            ideasColumnComponent.highlightIdea(result.id, searchTerm);
          }
        }, 100);
        break;
    }
  }

  // Platform formatting state (kept in main page as these are UI modals)
  let showFormatModal = false;
  let selectedText = '';
  let selectedMessageIndex = -1;
  let formattedContent = '';
  let selectedPlatform = '';
  let isFormatting = false;

  // Branching state (kept in main page as these are UI modals)
  let messageBranches = []; // Branches for the specific message being branched
  let showBranchModal = false;
  let branchModalMessageIndex = -1;
  let newBranchName = '';
  let isCreatingBranch = false;
  let branchCreateError = '';

  // Chat state - managed by ChatManager
  let input = '';
  let messages = [];
  let loadingMessages = false;
  let currentBranchId = 'main';
  let currentBranch = null;
  let branches = [];

  // Questions state - managed by ChatManager
  let goodQuestions = [];
  let loadingQuestions = false;

  // Context state
  let cards = [];
  let docs = [];
  let loadingCards = false;
  
  // User preferences
  let userPreferences = data?.userPreferences || { cards_grid_size: 3 };
  
  // Listen for user preferences updates from Account Settings
  onMount(() => {
    const handlePreferencesUpdate = (event) => {
      userPreferences = event.detail;
    };
    
    window.addEventListener('user-preferences-updated', handlePreferencesUpdate);
    
    return () => {
      window.removeEventListener('user-preferences-updated', handlePreferencesUpdate);
    };
  });

  // Add Card form
  let cardType = 'character';
  let cardTitle = '';
  let cardContent = '';
  let cardTags = '';
  let showAddCardForm = false;

  // Add Doc form
  let docTitle = '';
  let docContent = '';
  let docTags = '';
  let showAddDocForm = false;

  // Usage stats visibility and popover
  let showUsageStats = false;
  let showUsagePopover = false;
  let usageButtonElement;


  // New Project modal state
  let showNewProjectModal = false;
  let newProjectName = '';
  let newProjectDescription = '';
  let creatingProject = false;
  let createProjectErr = '';

  // Project Settings modal state
  let showProjectSettingsModal = false;
  let projectSettingsProject = null;
  
  // Mr Wiskr modal state
  let showMrWiskrModal = false;
  let mrWiskrLoading = false;
  
  
  // Component references
  let binderComponent;
  let sessionLogicManager;
  let contextManager;
  let chatManager;
  let projectState;
  let modalManager;
  let panelManager;
  let ideasColumnComponent;

  // Ideas Column state
  let relatedIdeas = [];
  let isGeneratingIdeas = false;
  
  // Binder tab state
  let activeTab = 'cards';
  
  // Session management state
  let sessions = [];
  let currentSession = null;
  let showSessionNavigator = false;
  let sessionNavigatorElement;
  

  
  
  // Panel visibility state - responsive defaults
  let showLeftPanel = true;    // Facts/Docs panel - always show for cards
  let showRightPanel = false;  // Questions/Ideas panel - hidden
  let isDesktop = false;       // Track if we're on desktop
  
  // Dark mode state - get from DOM
  let darkMode = false;
  
  // Initialize dark mode from DOM
  onMount(() => {
    if (browser) {
      darkMode = document.documentElement.classList.contains('dark');
      
      // Listen for theme changes
      const handleThemeChange = () => {
        darkMode = document.documentElement.classList.contains('dark');
      };
      
      window.addEventListener('theme-changed', handleThemeChange);
      
      return () => {
        window.removeEventListener('theme-changed', handleThemeChange);
      };
    }
  });
  
  // Mobile menu state
  let showMobileMenu = false;  // Mobile hamburger menu
  
  
  // Desktop-only collapse state for panels
  let leftPanelCollapsed = false;   // Whether left panel is collapsed on desktop
  let rightPanelCollapsed = false;  // Whether right panel is collapsed on desktop
  
  // Deck drawer state
  let showDeckDrawer = false;
  let currentDeck = null;
  let decks = [];
  let showDeckView = false;


  // Load decks from database when project changes
  $: if (current?.id && projects.length > 0) {
    loadDecks(current.id);
  }

  async function loadDecks(projectId) {
    try {
      const response = await fetch(`/api/projects/${projectId}/decks`);
      if (response.ok) {
        const data = await response.json();
        decks = data.decks || [];
        console.log('🔄 Decks loaded:', decks.length, decks.map(d => d.name));
      } else {
        console.error('Failed to load decks:', response.status);
        decks = [];
      }
    } catch (error) {
      console.error('Error loading decks:', error);
      decks = [];
    }
  }

  // Deck drawer functions
  function toggleDeckDrawer() {
    showDeckDrawer = !showDeckDrawer;
  }

  function handleDeckDrawerToggle(event) {
    showDeckDrawer = event.detail.isOpen;
  }

  async function handleCreateDeck() {
    if (!current?.id) return;
    
    const deckName = prompt('Enter deck name:');
    if (!deckName) return;
    
    try {
      const response = await fetch(`/api/projects/${current.id}/decks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: deckName,
          description: ''
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        // Reload decks to include the new one
        await loadDecks(current.id);
        console.log('Deck created successfully:', data.deck);
      } else {
        console.error('Failed to create deck:', response.status);
        alert('Failed to create deck. Please try again.');
      }
    } catch (error) {
      console.error('Error creating deck:', error);
      alert('Error creating deck. Please try again.');
    }
  }

  async function handleViewDeck(event) {
    const { deck } = event.detail;
    
    // Reload the deck data to get the latest section order
    try {
      const response = await fetch(`/api/projects/${current.id}/decks`);
      if (response.ok) {
        const data = await response.json();
        const updatedDeck = data.decks.find(d => d.id === deck.id);
        if (updatedDeck) {
          currentDeck = updatedDeck;
          // Also update the deck in the main decks array
          const deckIndex = decks.findIndex(d => d.id === deck.id);
          if (deckIndex !== -1) {
            decks[deckIndex] = updatedDeck;
            decks = [...decks]; // trigger reactivity
          }
        } else {
          currentDeck = deck; // fallback to original deck
        }
      } else {
        currentDeck = deck; // fallback to original deck
      }
    } catch (error) {
      console.error('Error reloading deck data:', error);
      currentDeck = deck; // fallback to original deck
    }
    
    showDeckDrawer = false;
    showDeckView = true;
  }

  function handleTogglePin(event) {
    const { deck } = event.detail;
    const deckIndex = decks.findIndex(d => d.id === deck.id);
    if (deckIndex !== -1) {
      decks[deckIndex].isPinned = !decks[deckIndex].isPinned;
      decks = [...decks]; // Trigger reactivity
    }
  }

  function handleReorderDeck(event) {
    const { deckId, fromIndex, toIndex } = event.detail;
    console.log('🔄 REORDER RECEIVED:', { deckId, fromIndex, toIndex });
    console.log('🔄 BEFORE REORDER:', decks.map((d, i) => ({ index: i, name: d.name, id: d.id })));
    
    // Simple reorder - just move the deck in the array
    if (fromIndex !== toIndex && fromIndex >= 0 && toIndex >= 0) {
      const newDecks = [...decks];
      const [movedDeck] = newDecks.splice(fromIndex, 1);
      newDecks.splice(toIndex, 0, movedDeck);
      decks = newDecks;
      console.log('🔄 AFTER REORDER:', decks.map((d, i) => ({ index: i, name: d.name, id: d.id })));
      
      // Save reorder to database
      saveDeckOrder();
      console.log('Deck reordered successfully');
    }
  }

  async function saveDeckOrder() {
    if (!current?.id) return;
    
    try {
      // Create deck orders array with current positions
      const deckOrders = decks.map((deck, index) => ({
        deckId: deck.id,
        position: index
      }));
      
      const response = await fetch('/api/decks/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: current.id,
          deckOrders
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        console.error('Error saving deck order:', error);
      } else {
        console.log('Deck order saved successfully');
      }
    } catch (error) {
      console.error('Error saving deck order:', error);
    }
  }

  function closeDeck() {
    currentDeck = null;
    showDeckView = false;
  }

  function handleDeckUpdated(event) {
    console.log('--- handleDeckUpdated received ---');
    const { deck } = event.detail;
    console.log('Updated deck data:', deck);

    // Update currentDeck if it's the same deck
    if (currentDeck && currentDeck.id === deck.id) {
      currentDeck = { ...currentDeck, ...deck };
      console.log('Current deck updated:', currentDeck);
    }

    // Update the deck in the main decks list
    const index = decks.findIndex(d => d.id === deck.id);
    console.log(`Deck found in main list at index: ${index}`);
    if (index !== -1) {
      decks[index] = { ...decks[index], ...deck };
      decks = [...decks]; // trigger reactivity
      console.log('Main decks array updated:', deck);
    } else {
      console.log('Deck NOT found in main list. State will be stale.');
    }
  }

  function handleCardUpdated(event) {
    console.log('--- handleCardUpdated received ---');
    const { cardId, updates } = event.detail;
    console.log('Card updated:', { cardId, updates });

    // Update the card in the main cards array
    const cardIndex = cards.findIndex(c => c.id === cardId);
    if (cardIndex !== -1) {
      cards[cardIndex] = { ...cards[cardIndex], ...updates };
      cards = [...cards]; // trigger reactivity
      console.log('Card updated in main cards array:', cards[cardIndex]);
    } else {
      console.log('Card not found in main cards array');
    }
  }

  // Listen for deck drawer toggle events and ESC key
  onMount(() => {
    const handleToggleDeckDrawer = () => {
      toggleDeckDrawer();
    };

    const handleKeyDown = (event) => {
      // ESC key to close deck view
      if (event.key === 'Escape' && showDeckView) {
        closeDeck();
      }
    };

    window.addEventListener('toggle-deck-drawer', handleToggleDeckDrawer);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('toggle-deck-drawer', handleToggleDeckDrawer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  });
  

  // Store the handler reference so it can be properly cleaned up
  let projectsRefreshHandler;
  let usageToggleHandler;
  
  // Upgrade success message state
  let upgradeMessage = '';
  let upgradeMessageType = 'success';

  // Check for upgrade success messages from URL parameters
  function checkUpgradeMessages() {
    if (browser && typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const upgraded = urlParams.get('upgraded');
        const tier = urlParams.get('tier');
        const canceled = urlParams.get('upgrade_canceled');
        
        if (upgraded === 'true' && tier) {
          const tierName = tier === '1' ? 'Pro' : tier === '2' ? 'Studio' : 'Premium';
          upgradeMessage = `🎉 Welcome to ${tierName}! Your subscription is now active.`;
          upgradeMessageType = 'success';
          
          // Clear the URL parameters
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete('upgraded');
          newUrl.searchParams.delete('tier');
          newUrl.searchParams.delete('session_id');
          window.history.replaceState({}, '', newUrl);
        } else if (canceled === 'true') {
          upgradeMessage = 'Upgrade was canceled. You can try again anytime.';
          upgradeMessageType = 'info';
          
          // Clear the URL parameters
          const newUrl = new URL(window.location);
          newUrl.searchParams.delete('upgrade_canceled');
          window.history.replaceState({}, '', newUrl);
        }
      } catch (error) {
        console.warn('Error checking upgrade messages:', error);
      }
    }
  }
  
  // Check for upgrade messages on mount (browser-only)
  $: if (browser) {
    checkUpgradeMessages();
  }
  
  // Responsive screen detection
  function checkScreenSize() {
    if (browser) {
      const width = window.innerWidth;
      const wasDesktop = isDesktop;
      isDesktop = width >= 1280; // Custom breakpoint for mobile mode
      
      // Initial load - set panel state based on screen size
      if (wasDesktop !== isDesktop) {
        if (isDesktop) {
          // Switch to desktop mode - show cards panel only
          showLeftPanel = true;
          showRightPanel = false;
        } else {
          // Switch to mobile mode - show cards panel only
          showLeftPanel = true;
          showRightPanel = false;
        }
      }
    }
  }

  // Utility function to clear stale localStorage data
  function clearStaleProjectData() {
    if (!browser) return;
    
    const lastProjectId = localStorage.getItem('wiskr_last_project_id');
    if (lastProjectId && !projects.find(p => p.id === lastProjectId)) {
      localStorage.removeItem('wiskr_last_project_id');
      
      // Also clear any project-specific data that might be stale
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('liked_ideas_') || key.includes('dismissed_ideas_'))) {
          // Check if this is for a project that no longer exists
          const projectId = key.split('_').pop();
          if (projectId && !projects.find(p => p.id === projectId)) {
            keysToRemove.push(key);
          }
        }
      }
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    }
  }

  onMount(async () => {
    // Server should have preloaded projects (including creating default for new users)
    // Only fetch fresh if server didn't preload properly
    if (!projects || projects.length === 0) {
      const { data: p, error } = await supabase.from('projects').select('*').order('created_at');
      
      if (error) {
        console.error('❌ Error fetching projects:', error);
        projects = [];
      } else {
        projects = p ?? [];
      }
      
      // Note: Default project creation is now handled server-side in +page.server.js
      // This prevents race conditions and duplicate projects
      if (projects.length === 0) {
      }
    } 
    
    // Clean up stale localStorage data
    clearStaleProjectData();

    // Check for avatar refresh cookie
    const needsAvatarRefresh = document.cookie.includes('wiskr_refresh_avatars=1');
    if (needsAvatarRefresh) {
      // Clear the cookie
      document.cookie = 'wiskr_refresh_avatars=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT';
      // Force refresh avatars
      await loadAvatars(true);
    }
    
    // Notify layout about projects and current project
    if (browser && projects.length > 0) {
      // Try to restore last selected project or use first available
      const lastProjectId = localStorage.getItem('wiskr_last_project_id');
      const lastProject = lastProjectId ? projects.find(p => p.id === lastProjectId) : null;
      const projectToSelect = lastProject || projects[0];
      
      //console.log('🎯 Notifying layout of projects and current selection:', projectToSelect?.name);
      
      // Dispatch event to notify layout about projects and current selection
      window.dispatchEvent(new CustomEvent('layout:update-projects', {
        detail: {
          projects: projects,
          currentProjectId: projectToSelect.id
        }
      }));
      
      // Also dispatch project selection if we have a project
      if (projectToSelect && projectState) {
        await projectState.selectProjectById(projectToSelect.id);
      }
    }

    // Load usage once on page load
    await loadUsage();
    
    // Load persisted model key from localStorage
    if (browser) {
      const savedModelKey = localStorage.getItem('wiskr_model_key');
      if (savedModelKey) {
        modelKey = savedModelKey;
      }
      // Enable localStorage saving now that we've loaded the initial value
      modelKeyLoaded = true;
    }

    // Setup responsive detection (browser-only)
    if (browser) {
      checkScreenSize();
      
      // Check for upgrade success messages
      checkUpgradeMessages();
      
      // Force initial panel state after checkScreenSize runs
      if (isDesktop) {
        showLeftPanel = true;
        showRightPanel = false;
      } else {
        showLeftPanel = true;
        showRightPanel = false;
      }
      
      window.addEventListener('resize', checkScreenSize);

      // Listen for "projects:refresh" after create (from +layout.svelte)
      projectsRefreshHandler = (e) => reloadProjects(e.detail?.id);
      window.addEventListener('projects:refresh', projectsRefreshHandler);
      
      // Listen for logo click to reload projects (for dev)
      window.addEventListener('reload-projects', () => {
        reloadProjects();
      });
      
      // Listen for project selection from header
      window.addEventListener('project:selected', (e) => {
        if (e.detail?.id) {
          selectProjectById(e.detail.id);
        }
      });
      
      // Listen for project settings from header
      window.addEventListener('project:open-settings', (e) => {
        if (e.detail) {
          handleProjectOpenSettings({ detail: e.detail });
        }
      });
      
      // Listen for search events from global search
      window.addEventListener('search:activate-tab', handleSearchActivateTab);
      window.addEventListener('search:filter', handleSearchFilter);
      window.addEventListener('search:navigate-chat', handleSearchNavigateChat);
      window.addEventListener('search:navigate-session', handleSearchNavigateSession);
      window.addEventListener('search:clear', handleSearchClear);
      window.addEventListener('search:restore-chat', handleSearchRestore);
      window.addEventListener('search:show-result', handleSearchShowResult);
      
      // Listen for usage toggle from header
      usageToggleHandler = () => {
        showUsagePopover = !showUsagePopover;
      };
      window.addEventListener('usage:toggle', usageToggleHandler);
      
      // Listen for Mr Wiskr button from header
      window.addEventListener('mrwiskr:open', handleMrWiskrOpen);
      
      // Listen for new card creation to mark as new
      window.addEventListener('card:created', (event) => {
        const { card } = event.detail;
        if (card && card.id) {
          markCardAsNew(card.id);
        }
      });
      
      // Listen for mobile menu events
      window.addEventListener('mobile:show-context', handleMobileShowContext);
      window.addEventListener('mobile:show-addins', handleMobileShowAddins);
      
      // Listen for mobile toggle events
      window.addEventListener('mobile:toggle-context', handleMobileToggleContext);
      window.addEventListener('mobile:toggle-addins', handleMobileToggleAddins);
      window.addEventListener('mobile:toggle-sessions', handleMobileToggleSessions);
      
      // Listen for mobile menu toggle from header hamburger button
      window.addEventListener('mobile:toggle-menu', () => {
        showMobileMenu = !showMobileMenu;
        // Hide panels when mobile menu is opened for maximum content space
        if (showMobileMenu) {
          showLeftPanel = false;
          showRightPanel = false;
        }
      });
      
      // Listen for mobile menu close event
      window.addEventListener('mobile:close-menu', () => {
        showMobileMenu = false;
      });
      
    // Listen for project menu toggle from mobile menu button
    window.addEventListener('mobile:toggle-projects', () => {
      window.dispatchEvent(new CustomEvent('layout:toggle-project-menu'));
    });
      
        // Add click outside listener for sessions panel
        document.addEventListener('click', handleClickOutside);
      }
    });

  // Clean up event listener when component is destroyed
  onDestroy(() => {
    if (browser) {
      if (projectsRefreshHandler) {
        window.removeEventListener('projects:refresh', projectsRefreshHandler);
      }
      window.removeEventListener('reload-projects', () => {
        reloadProjects();
      });
      if (usageToggleHandler) {
        window.removeEventListener('usage:toggle', usageToggleHandler);
      }
      // Clean up search event listeners
      window.removeEventListener('search:activate-tab', handleSearchActivateTab);
      window.removeEventListener('search:filter', handleSearchFilter);
      window.removeEventListener('search:navigate-chat', handleSearchNavigateChat);
      window.removeEventListener('search:navigate-session', handleSearchNavigateSession);
      window.removeEventListener('search:clear', handleSearchClear);
      window.removeEventListener('search:restore-chat', handleSearchRestore);
      window.removeEventListener('search:show-result', handleSearchShowResult);
      
      // Clean up Mr Wiskr event listener
      window.removeEventListener('mrwiskr:open', handleMrWiskrOpen);
      
      // Clean up mobile menu event listeners
      window.removeEventListener('mobile:show-context', handleMobileShowContext);
      window.removeEventListener('mobile:show-addins', handleMobileShowAddins);
      window.removeEventListener('mobile:toggle-context', handleMobileToggleContext);
      window.removeEventListener('mobile:toggle-addins', handleMobileToggleAddins);
      window.removeEventListener('mobile:toggle-sessions', handleMobileToggleSessions);
      window.removeEventListener('mobile:toggle-menu', () => {
        showMobileMenu = !showMobileMenu;
        // Hide panels when mobile menu is opened for maximum content space
        if (showMobileMenu) {
          showLeftPanel = false;
          showRightPanel = false;
        }
      });
      window.removeEventListener('mobile:close-menu', () => {
        showMobileMenu = false;
      });
      window.removeEventListener('mobile:toggle-projects', () => {
        window.dispatchEvent(new CustomEvent('layout:toggle-project-menu'));
      });
      
      // Remove click outside listener
      document.removeEventListener('click', handleClickOutside);
    }
  });

  // Delegate send events to ChatManager
  async function send(event) {
    if (chatManager) {
      await chatManager.send(event);
    }
  }

  async function regenerateBrief() {
    if (!current) return;
    if (contextManager) {
      await contextManager.regenerateBrief();
    }
  }



// DELETE handlers

async function deleteProject(p) {
  if (projects.length <= 1) { alert('Create another project before deleting this one.'); return; }
  if (!confirm(`Delete "${p.name}"? This can't be undone.`)) return;
  const res = await fetch(`/api/projects/${p.id}/delete`, { method: 'POST' });
  if (!res.ok) {
    console.error(await res.text());
    alert('Delete failed.');
    return;
  }
  // remove locally
  const wasSelected = current?.id === p.id;
  projects = projects.filter(x => x.id !== p.id);

  // Notify layout about updated projects (same as reloadProjects)
  if (browser && projects.length > 0) {
    const nextId = projects[0]?.id;
    window.dispatchEvent(new CustomEvent('layout:update-projects', {
      detail: {
        projects: projects,
        currentProjectId: nextId
      }
    }));
  }

  // if we deleted the selected project, pick another
  if (wasSelected) {
    const next = projects[0] || null;
    if (next) {
      await selectProjectById(next.id);
    } else {
      // no projects left - clear selection
      selectedId = null;
    }
  }
}


// Platform formatting functions
function openFormatModal(messageIndex) {
  selectedMessageIndex = messageIndex;
  selectedText = messages[messageIndex].content;
  showFormatModal = true;
  formattedContent = '';
  selectedPlatform = '';
}

function closeFormatModal() {
  showFormatModal = false;
  selectedText = '';
  selectedMessageIndex = -1;
  formattedContent = '';
  selectedPlatform = '';
}

async function formatForPlatform(platform) {
  if (!selectedText || isFormatting) return;
  
  isFormatting = true;
  selectedPlatform = platform;
  
  try {
    const res = await fetch('/api/format-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: selectedText,
        platform: platform
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      formattedContent = data.formatted || 'Error formatting content';
    } else {
      formattedContent = 'Error: Failed to format content';
    }
  } catch (error) {
    console.error('Format error:', error);
    formattedContent = 'Error: Network error';
  } finally {
    isFormatting = false;
  }
}

async function copyToClipboard(text) {
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    // Could add a toast notification here
  } catch (error) {
    console.error('Failed to copy:', error);
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
}

// Conversation branching functions
// Legacy function - now replaced by loadSessionBranches
async function loadBranches() {
  // This function is now deprecated in favor of loadSessionBranches
  // We keep it for backward compatibility but redirect to loadSessionBranches
  if (currentSession && sessionLogicManager) {
    await sessionLogicManager.loadSessionBranches(currentSession.id);
  } else {
    console.warn('loadBranches called without currentSession - branches may not load correctly');
  }
}

async function openBranchModal(messageIndex) {
  branchModalMessageIndex = messageIndex;
  newBranchName = '';
  branchCreateError = ''; // Clear any previous errors
  
  // Load branches for this specific message
  if (current && currentSession && messages[messageIndex]?.id) {
    const messageId = messages[messageIndex].id;
    try {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'listForMessage', 
          projectId: current.id,
          sessionId: currentSession.id,
          messageId: messageId
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        messageBranches = data.branches || [];
      } else {
        console.error('Failed to load branches for message');
        messageBranches = [];
      }
    } catch (error) {
      console.error('Error loading message branches:', error);
      messageBranches = [];
    }
  } else {
    messageBranches = [];
  }
  
  showBranchModal = true;
}

function closeBranchModal() {
  showBranchModal = false;
  branchModalMessageIndex = -1;
  newBranchName = '';
}

async function createBranch() {
  if (!current || branchModalMessageIndex < 0 || !newBranchName.trim() || isCreatingBranch) return;
  
  isCreatingBranch = true;
  
  try {
    const messageId = messages[branchModalMessageIndex]?.id;
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        projectId: current.id,
        messageId: messageId,
        branchName: newBranchName.trim()
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      if (sessionLogicManager) {
        await sessionLogicManager.loadSessionBranches(currentSession.id);
      }
      await switchToBranch(data.branch.branch_id);
      closeBranchModal();
      
      // Reload message branch counts in the ChatInterface component
      if (browser) {
        window.dispatchEvent(new CustomEvent('branches-updated'));
      }
    } else {
      // Handle error response from server
      try {
        const errorData = await res.json();
        branchCreateError = errorData.error || 'Failed to create branch. Please try again.';
      } catch {
        branchCreateError = 'Failed to create branch. Please try again.';
      }
      console.error('Failed to create branch:', branchCreateError);
    }
  } catch (error) {
    console.error('Error creating branch:', error);
    alert('Error creating branch. Please try again.');
  } finally {
    isCreatingBranch = false;
  }
}

async function switchToBranch(branchId) {
  if (!current || branchId === currentBranchId) {
    return;
  }
  
  try {
    const requestBody = {
      action: 'switch',
      projectId: current.id,
      sessionId: currentSession?.id,
      branchId: branchId
    };
    
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    if (res.ok) {
      const data = await res.json();
      
      currentBranchId = branchId;
      currentBranch = data.branch;
      messages = data.messages || [];
    } else {
      console.error('Failed to switch branch:', res.status, res.statusText);
    }
  } catch (error) {
    console.error('Error switching branch:', error);
  }
}

function getBranchColor(branch) {
  if (!branch) return RAINBOW_COLORS[0];
  return RAINBOW_COLORS[branch.color_index % RAINBOW_COLORS.length];
}

// Platform definitions with Lucide icons
const platforms = [
  { id: 'tiktok', name: 'TikTok', icon: 'Music' },
  { id: 'instagram', name: 'Instagram', icon: 'Camera' },
  { id: 'youtube', name: 'YouTube', icon: 'Video' },
  { id: 'etsy', name: 'Etsy', icon: 'ShoppingBag' },
  { id: 'twitter', name: 'X/Twitter', icon: 'MessageCircle' },
  { id: 'linkedin', name: 'LinkedIn', icon: 'Briefcase' },
  { id: 'teepublic', name: 'TeePublic', icon: 'Shirt' },
  { id: 'pinterest', name: 'Pinterest', icon: 'MapPin' },
  { id: 'facebook', name: 'Facebook', icon: 'Users' },
  { id: 'reddit', name: 'Reddit', icon: 'MessageSquare' },
  { id: 'plaintext', name: 'Plain Text', icon: 'FileText' },
  { id: 'markdown', name: 'Markdown', icon: 'Hash' },
];

// Icon component mapping
const iconComponents = {
  Music,
  Camera,
  Video,
  ShoppingBag,
  MessageCircle,
  Briefcase,
  Shirt,
  MapPin,
  Users,
  MessageSquare,
  FileText,
  Hash
};

let usage = { today:{in:0,out:0,cost:0}, week:{in:0,out:0,cost:0}, month:{in:0,out:0,cost:0}, tz:'UTC' };

async function loadUsage() {
  if (!browser) return; 
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const res = await fetch(`/api/usage/summary?tz=${encodeURIComponent(tz)}`);
  if (res.ok) usage = await res.json();
}

// New Project creation function
async function createProject() {
  if (!newProjectName.trim()) { createProjectErr = 'Please enter a name.'; return; }
  createProjectErr = '';
  creatingProject = true;
  try {
    const res = await fetch('/api/projects/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newProjectName.trim(),
        description: newProjectDescription.trim()
      })
    });

    if (!res.ok) {
      try {
        const errorData = await res.json();
        console.error('Create project failed:', errorData);
        
        // Handle specific project limit error
        if (errorData.error === 'PROJECT_LIMIT_EXCEEDED') {
          createProjectErr = `${errorData.message} Consider upgrading to Pro for unlimited projects.`;
        } else {
          createProjectErr = errorData.message || 'Failed to create project';
        }
      } catch {
        // Fallback for non-JSON responses
        const raw = await res.text();
        console.error('Create project failed:', raw);
        let msg = raw.replace(/<[^>]+>/g, '').slice(0, 200);
        createProjectErr = msg || 'Failed to create project';
      }
      creatingProject = false;
      return;
    }

    const { project } = await res.json();
    showNewProjectModal = false;
    newProjectName = '';
    newProjectDescription = '';
    createProjectErr = '';

    // Refresh projects and select the new one
    await reloadProjects(project.id);

  } catch (e) {
    createProjectErr = e.message || 'Failed to create project';
    creatingProject = false;
  }
}

// Rainbow colors for branches
const RAINBOW_COLORS = [
  { bg: 'bg-white', border: 'border-gray-200', name: 'Main' },        // Main branch
  { bg: 'bg-red-50', border: 'border-red-200', name: 'Red' },         // Red
  { bg: 'bg-orange-50', border: 'border-orange-200', name: 'Orange' }, // Orange  
  { bg: 'bg-yellow-50', border: 'border-yellow-200', name: 'Yellow' }, // Yellow
  { bg: 'bg-green-50', border: 'border-green-200', name: 'Green' },    // Green
  { bg: 'bg-blue-50', border: 'border-blue-200', name: 'Blue' },       // Blue
  { bg: 'bg-indigo-50', border: 'border-indigo-200', name: 'Indigo' }, // Indigo
  { bg: 'bg-purple-50', border: 'border-purple-200', name: 'Purple' }, // Purple
  { bg: 'bg-pink-50', border: 'border-pink-200', name: 'Pink' }        // Pink
];


// Event handlers for components
function handleProjectSelect(event) {
  selectProjectById(event.detail.id);
}


function handleProjectDelete(event) {
  deleteProject(event.detail);
}

function handleCardAdd(event) {
  console.log('🎴 Main page: handleCardAdd called with event:', event);
  console.log('🎴 Main page: contextManager available:', !!contextManager);
  console.log('🎴 Main page: event.detail:', event.detail);
  
  if (contextManager) {
    // Pass the event data to the context manager
    contextManager.addCard(event.detail);
  } else {
    console.error('🎴 Main page: ContextManager not available!');
  }
}

function handleReloadContext(event) {
  if (contextManager) {
    contextManager.loadContext();
  }
}

function handleCardStartEdit(event) {
  if (contextManager) {
    contextManager.startEditCard(event.detail.card, event.detail.index);
  }
}

function handleCardCancelEdit(event) {
  if (contextManager) {
    contextManager.cancelEditCard(event.detail.card, event.detail.index);
  }
}

function handleCardSaveEdit(event) {
  if (contextManager) {
    contextManager.saveCardEdit(event.detail.card, event.detail.editData);
  }
}

function handleCardDelete(event) {
  if (contextManager) {
    const card = event.detail.card;
    // Use the simpler delete function that finds the card internally
    contextManager.deleteCardById(card.id);
  }
}

function handleCardTogglePin(event) {
  if (contextManager) {
    contextManager.toggleCardPin(event.detail);
  }
}

function handleCardSave(event) {
  // Handle saving a new card from combine operations
  console.log('Main page: handleCardSave called with event:', event);
  
  if (contextManager) {
    const cardData = event.detail;
    console.log('Main page: Saving card from combine operation:', cardData);
    console.log('Main page: ContextManager available:', !!contextManager);
    
    // Add the card using the context manager
    contextManager.addCardFromCombine(cardData);
  } else {
    console.error('Main page: ContextManager not available!');
  }
}

function handleCardOpenDeck(event) {
  const { deckId, deckName } = event.detail;
  
  // Find the deck in our decks array
  const deck = decks.find(d => d.id === deckId);
  if (deck) {
    currentDeck = deck;
    showDeckView = true;
  } else {
    console.error('Deck not found:', deckId);
  }
}

function handleDocAdd(event) {
  if (contextManager) {
    contextManager.addDoc(event.detail);
  }
}

function handleDocStartEdit(event) {
  if (contextManager) {
    contextManager.startEditDoc(event.detail.doc, event.detail.index);
  }
}

function handleDocCancelEdit(event) {
  if (contextManager) {
    contextManager.cancelEditDoc(event.detail.doc, event.detail.index);
  }
}

function handleDocSaveEdit(event) {
  if (contextManager) {
    contextManager.saveDocEdit(event.detail.doc, event.detail.editData);
  }
}

function handleDocDelete(event) {
  if (contextManager) {
    contextManager.deleteDoc(event.detail.doc, event.detail.index);
  }
}

function handleDocTogglePin(event) {
  if (contextManager) {
    contextManager.toggleDocPin(event.detail);
  }
}

function handleSwitchToBranch(event) {
  switchToBranch(event.detail);
}

function handleOpenFormatModal(event) {
  openFormatModal(event.detail);
}

function handleOpenBranchModal(event) {
  openBranchModal(event.detail);
}

function handleFormatModalClose() {
  closeFormatModal();
}

function handleFormatForPlatform(event) {
  formatForPlatform(event.detail);
}

function handleCopyToClipboard(event) {
  copyToClipboard(event.detail);
}

function handleBranchModalClose() {
  closeBranchModal();
}

function handleCreateBranch(event) {
  newBranchName = event.detail;
  createBranch();
}

function handleNewProjectModalClose() {
  showNewProjectModal = false;
  newProjectName = '';
  createProjectErr = '';
}

function handleCreateProject(event) {
  const { name, description } = event.detail;
  newProjectName = name;
  newProjectDescription = description || '';
  createProject();
}

function handleProjectOpenSettings(event) {
  projectSettingsProject = event.detail;
  showProjectSettingsModal = true;
}

function handleProjectSettingsModalClose() {
  // Close the modal
  showProjectSettingsModal = false;
  projectSettingsProject = null;
  
  // Refresh fact types in the Binder to ensure they are up-to-date
  if (binderComponent && activeTab === 'cards') {
    binderComponent.refreshCardTypes();
  }
}

function handleRefreshProjects(event) {
  // Reload projects to refresh the project selector
  const projectId = event.detail?.projectId;
  reloadProjects(projectId);
}

async function handleBranchRenamed(event) {
  // Reload branches to get updated branch info
  if (currentSession && sessionLogicManager) {
    await sessionLogicManager.loadSessionBranches(currentSession.id);
    
    // Also update the current branch object with the new name
    if (currentBranch && event.branchId === currentBranch.branch_id) {
      const updatedBranch = branches.find(b => b.branch_id === currentBranch.branch_id);
      if (updatedBranch) {
        currentBranch = updatedBranch;
      }
    }
  }
}

async function handleBranchDeleted(event) {
  // Switch to main branch and reload branches
  await switchToBranch('main');
  if (currentSession && sessionLogicManager) {
    await sessionLogicManager.loadSessionBranches(currentSession.id);
  }
}

// Ideas Column event handlers
async function handleQuestionsUpdate(event) {
  goodQuestions = event.detail.questions;
  // Save to database
  if (current) {
    try {
      const res = await fetch(`/api/projects/${current.id}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_all',
          questions: goodQuestions
        })
      });
      
      if (!res.ok) {
        console.error('Failed to save questions:', await res.text());
        // Could show user notification here
      }
    } catch (error) {
      console.error('Error saving questions:', error);
      // Could show user notification here
    }
  }
}

function handleInsertText(event) {
  // Insert text into the chat box
  const textToInsert = event.detail.text;
  if (input) {
    input += (input ? ' ' : '') + textToInsert;
  } else {
    input = textToInsert;
  }
  
  // Focus the chat box (we'll need to dispatch this to ChatInterface)
  if (browser) {
    window.dispatchEvent(new CustomEvent('focus-chat-box'));
  }
}

async function handleGenerateIdeas() {
  if (!current || isGeneratingIdeas) return;
  
  isGeneratingIdeas = true;
  
  try {
    // Get count of liked ideas and dismissed ideas from localStorage
    let likedIdeasCount = 0;
    let dismissedIdeas = [];
    try {
      const liked = localStorage.getItem(`liked_ideas_${current.id}`);
      if (liked) {
        const likedIdeas = JSON.parse(liked);
        likedIdeasCount = likedIdeas.length;
      }
      
      const dismissed = localStorage.getItem(`dismissed_ideas_${current.id}`);
      if (dismissed) {
        dismissedIdeas = JSON.parse(dismissed);
      }
    } catch (error) {
      console.error('Error reading ideas from localStorage:', error);
    }
    
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const res = await fetch('/api/generate-ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: current.id,
        cards: cards.slice(0, 10), // Send first 10 cards for context
        docs: docs.slice(0, 5),    // Send first 5 docs for context
        recentMessages: messages.slice(-5), // Send last 5 messages for context
        likedIdeasCount: likedIdeasCount, // Send count of already liked ideas
        dismissedIdeas: dismissedIdeas, // Send dismissed ideas to avoid regenerating
        tz: tz // Send user's timezone for proper rate limiting
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      relatedIdeas = data.ideas || [];
    } else {
      console.error('Failed to generate ideas:', await res.text());
      relatedIdeas = ['Error generating ideas. Please try again.'];
    }
  } catch (error) {
    console.error('Error generating ideas:', error);
    relatedIdeas = ['Network error. Please try again.'];
  } finally {
    isGeneratingIdeas = false;
  }
}

// Text selection handlers from ChatInterface
function handleTextAddToCards(event) {
  const text = event.detail.text;
  // Auto-populate card form with selected text
  cardTitle = text.length > 50 ? text.substring(0, 50) + '...' : text;
  cardContent = text;
  cardType = 'note'; // Default type for selected text
  showAddCardForm = true;
  // Switch to cards tab and ensure left panel is visible
  activeTab = 'cards';
  showLeftPanel = true;
  // On mobile, close right panel if both are open
  if (!isDesktop && showRightPanel) {
    showRightPanel = false;
  }
}

function handleTextAddToDocs(event) {
  const text = event.detail.text;
  // Auto-populate doc form with selected text
  docTitle = text.length > 100 ? text.substring(0, 100) + '...' : text;
  docContent = text;
  showAddDocForm = true;
  // Switch to docs tab and ensure left panel is visible
  activeTab = 'docs';
  showLeftPanel = true;
  // On mobile, close right panel if both are open
  if (!isDesktop && showRightPanel) {
    showRightPanel = false;
  }
}

  function handleTextAddToQuestions(event) {
    const text = event.detail.text;
    // Add to good questions list
    if (text && !goodQuestions.includes(text)) {
      goodQuestions = [...goodQuestions, text];
      // Save to database
      if (current) {
        handleQuestionsUpdate({ detail: { questions: goodQuestions } });
      }
    }
  }

  function handleFormatText(event) {
    const text = event.detail.text;
    // Open format modal with selected text
    selectedText = text;
    showFormatModal = true;
    formattedContent = '';
    selectedPlatform = '';
    selectedMessageIndex = -1; // Since this is selected text, not a full message
  }

  // Panel toggle functions - independent on mobile, desktop shows both by default
  function toggleLeftPanel() {
    showLeftPanel = !showLeftPanel;
    // Only close right panel on mobile/tablet (not desktop)
    if (!isDesktop && showLeftPanel && showRightPanel) {
      showRightPanel = false;
    }
  }

  function toggleRightPanel() {
    showRightPanel = !showRightPanel;
    // Only close left panel on mobile/tablet (not desktop)
    if (!isDesktop && showRightPanel && showLeftPanel) {
      showLeftPanel = false;
    }
  }
  
  // Panel collapse functions (work on both desktop and mobile)
  function toggleLeftPanelCollapse() {
    if (showDeckView) {
      // If in deck view, close it instead of collapsing
      closeDeck();
    } else {
      leftPanelCollapsed = !leftPanelCollapsed;
    }
  }
  
  function toggleRightPanelCollapse() {
    rightPanelCollapsed = !rightPanelCollapsed;
  }
  
  // Global search event handlers
  function handleSearchActivateTab(event) {
    const tabName = event.detail;
    if (tabName === 'cards' || tabName === 'docs') {
      activeTab = tabName;
      showLeftPanel = true;
      // On mobile, close right panel if both are open
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (tabName === 'questions' || tabName === 'ideas') {
      showRightPanel = true;
      // On mobile, close left panel if both are open
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    }
  }
  
  function handleSearchFilter(event) {
    const { type, query } = event.detail;
    
    // Set the search term for all components
    search = query;
    
    
    // Normal search behavior
    if (type === 'all') {
      // Handle unified search - default to cards tab
      activeTab = 'cards';
      showLeftPanel = true;
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (type === 'cards') {
      activeTab = 'cards';
      showLeftPanel = true;
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (type === 'docs') {
      activeTab = 'docs';
      showLeftPanel = true;
      if (!isDesktop && showRightPanel) {
        showRightPanel = false;
      }
    } else if (type === 'questions') {
      showRightPanel = true;
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    } else if (type === 'ideas') {
      showRightPanel = true;
      if (!isDesktop && showLeftPanel) {
        showLeftPanel = false;
      }
    }
  }
  
  async function handleSearchNavigateChat(event) {
    const { messageId, branchId, firstMatchIndex } = event.detail;
    
    // Set the search term for highlighting
    search = event.detail.searchTerm || '';
    
    // Switch to the appropriate branch if needed and wait for it to complete
    if (branchId && branchId !== currentBranchId) {
      await switchToBranch(branchId);
    } else {
    }
    
    // Ensure the chat area is visible and scroll to the message
    // Use a retry mechanism to ensure chatManager is available
    let retryCount = 0;
    const maxRetries = 25; // Increased retries for message loading
    const retryDelay = 200; // Slightly longer delay between retries
    
    const attemptScroll = () => {
      if (chatManager) {
        
        // Check if messages are loaded and the target message exists
        const messageExists = messages.some(m => m.id === messageId);
        
        if (!messageExists) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptScroll, retryDelay);
            return;
          } else {
            console.error('Main page: Target message never loaded after retries');
            return;
          }
        }
        
        // Additional check: wait for the message to be rendered in the DOM
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (!messageElement) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(attemptScroll, retryDelay);
            return;
          } else {
            console.error('Main page: Message never rendered in DOM after retries');
            return;
          }
        }
        
        // Pass the current search term for highlighting
        const searchTerm = search || '';
        chatManager.scrollToMessage(messageId, searchTerm, firstMatchIndex);
      } else if (retryCount < maxRetries) {
        retryCount++;
        setTimeout(attemptScroll, retryDelay);
      } else {
        console.error('Main page: chatManager still not available after retries');
      }
    };
    
    setTimeout(attemptScroll, 2000); // Longer delay to ensure session AND branch switches complete
  }
  
  function handleSearchNavigateSession(event) {
    const { sessionId, sessionName } = event.detail;
    
    // Find the session in our sessions list and switch to it
    const targetSession = sessions.find(s => s.id === sessionId);
    if (targetSession && sessionLogicManager) {
      sessionLogicManager.selectSession(targetSession);
    } else {
    }
  }
  
  function handleSearchClear(event) {
    // Clear any active search filters
    search = '';
    // Could also clear filters in other components if needed
  }
  
  // Helper function to get card type display name
  function getCardTypeDisplayName(cardType) {
    const typeMap = {
      'character': 'Character',
      'location': 'Location', 
      'item': 'Item',
      'event': 'Event',
      'concept': 'Concept',
      'organization': 'Organization',
      'faction': 'Faction',
      'creature': 'Creature',
      'spell': 'Spell',
      'ability': 'Ability',
      'skill': 'Skill',
      'trait': 'Trait',
      'relationship': 'Relationship',
      'backstory': 'Backstory',
      'plot': 'Plot',
      'theme': 'Theme',
      'worldbuilding': 'Worldbuilding',
      'magic': 'Magic',
      'technology': 'Technology',
      'culture': 'Culture',
      'history': 'History',
      'lore': 'Lore',
      'rule': 'Rule',
      'mechanic': 'Mechanic',
      'system': 'System',
      'process': 'Process',
      'method': 'Method',
      'technique': 'Technique',
      'strategy': 'Strategy',
      'approach': 'Approach',
      'principle': 'Principle',
      'philosophy': 'Philosophy',
      'belief': 'Belief',
      'value': 'Value',
      'goal': 'Goal',
      'objective': 'Objective',
      'purpose': 'Purpose',
      'mission': 'Mission',
      'vision': 'Vision',
      'dream': 'Dream',
      'aspiration': 'Aspiration',
      'ambition': 'Ambition',
      'desire': 'Desire',
      'wish': 'Wish',
      'hope': 'Hope',
      'fear': 'Fear',
      'concern': 'Concern',
      'worry': 'Worry',
      'anxiety': 'Anxiety',
      'challenge': 'Challenge',
      'obstacle': 'Obstacle',
      'problem': 'Problem',
      'issue': 'Issue',
      'conflict': 'Conflict',
      'tension': 'Tension',
      'dilemma': 'Dilemma',
      'paradox': 'Paradox',
      'mystery': 'Mystery',
      'secret': 'Secret',
      'revelation': 'Revelation',
      'discovery': 'Discovery',
      'insight': 'Insight',
      'realization': 'Realization',
      'epiphany': 'Epiphany',
      'breakthrough': 'Breakthrough',
      'innovation': 'Innovation',
      'invention': 'Invention',
      'creation': 'Creation',
      'artwork': 'Artwork',
      'design': 'Design',
      'pattern': 'Pattern',
      'structure': 'Structure',
      'framework': 'Framework',
      'model': 'Model',
      'template': 'Template',
      'blueprint': 'Blueprint',
      'plan': 'Plan',
      'scheme': 'Scheme',
      'strategy': 'Strategy',
      'tactic': 'Tactic',
      'approach': 'Approach',
      'method': 'Method',
      'technique': 'Technique',
      'process': 'Process',
      'procedure': 'Procedure',
      'protocol': 'Protocol',
      'system': 'System',
      'mechanism': 'Mechanism',
      'device': 'Device',
      'tool': 'Tool',
      'instrument': 'Instrument',
      'apparatus': 'Apparatus',
      'equipment': 'Equipment',
      'gear': 'Gear',
      'supplies': 'Supplies',
      'materials': 'Materials',
      'resources': 'Resources',
      'assets': 'Assets',
      'capital': 'Capital',
      'wealth': 'Wealth',
      'treasure': 'Treasure',
      'fortune': 'Fortune',
      'riches': 'Riches',
      'valuables': 'Valuables',
      'possessions': 'Possessions',
      'belongings': 'Belongings',
      'property': 'Property',
      'estate': 'Estate',
      'territory': 'Territory',
      'domain': 'Domain',
      'realm': 'Realm',
      'kingdom': 'Kingdom',
      'empire': 'Empire',
      'nation': 'Nation',
      'country': 'Country',
      'state': 'State',
      'province': 'Province',
      'region': 'Region',
      'area': 'Area',
      'zone': 'Zone',
      'district': 'District',
      'neighborhood': 'Neighborhood',
      'community': 'Community',
      'society': 'Society',
      'group': 'Group',
      'team': 'Team',
      'crew': 'Crew',
      'gang': 'Gang',
      'band': 'Band',
      'clan': 'Clan',
      'tribe': 'Tribe',
      'family': 'Family',
      'house': 'House',
      'lineage': 'Lineage',
      'bloodline': 'Bloodline',
      'ancestry': 'Ancestry',
      'heritage': 'Heritage',
      'background': 'Background',
      'origin': 'Origin',
      'source': 'Source',
      'root': 'Root',
      'foundation': 'Foundation',
      'basis': 'Basis',
      'ground': 'Ground',
      'base': 'Base',
      'platform': 'Platform',
      'stage': 'Stage',
      'arena': 'Arena',
      'field': 'Field',
      'battlefield': 'Battlefield',
      'warzone': 'Warzone',
      'front': 'Front',
      'line': 'Line',
      'border': 'Border',
      'boundary': 'Boundary',
      'edge': 'Edge',
      'perimeter': 'Perimeter',
      'circumference': 'Circumference',
      'outline': 'Outline',
      'contour': 'Contour',
      'shape': 'Shape',
      'form': 'Form',
      'figure': 'Figure',
      'silhouette': 'Silhouette',
      'profile': 'Profile',
      'aspect': 'Aspect',
      'facet': 'Facet',
      'side': 'Side',
      'angle': 'Angle',
      'perspective': 'Perspective',
      'viewpoint': 'Viewpoint',
      'standpoint': 'Standpoint',
      'position': 'Position',
      'stance': 'Stance',
      'posture': 'Posture',
      'attitude': 'Attitude',
      'mood': 'Mood',
      'temperament': 'Temperament',
      'disposition': 'Disposition',
      'personality': 'Personality',
      'character': 'Character',
      'nature': 'Nature',
      'essence': 'Essence',
      'core': 'Core',
      'heart': 'Heart',
      'soul': 'Soul',
      'spirit': 'Spirit',
      'mind': 'Mind',
      'consciousness': 'Consciousness',
      'awareness': 'Awareness',
      'perception': 'Perception',
      'sensation': 'Sensation',
      'feeling': 'Feeling',
      'emotion': 'Emotion',
      'passion': 'Passion',
      'desire': 'Desire',
      'longing': 'Longing',
      'yearning': 'Yearning',
      'craving': 'Craving',
      'hunger': 'Hunger',
      'thirst': 'Thirst',
      'need': 'Need',
      'want': 'Want',
      'wish': 'Wish',
      'hope': 'Hope',
      'dream': 'Dream',
      'aspiration': 'Aspiration',
      'ambition': 'Ambition',
      'goal': 'Goal',
      'objective': 'Objective',
      'target': 'Target',
      'aim': 'Aim',
      'purpose': 'Purpose',
      'mission': 'Mission',
      'vision': 'Vision',
      'ideal': 'Ideal',
      'standard': 'Standard',
      'criterion': 'Criterion',
      'measure': 'Measure',
      'metric': 'Metric',
      'indicator': 'Indicator',
      'sign': 'Sign',
      'signal': 'Signal',
      'symbol': 'Symbol',
      'mark': 'Mark',
      'token': 'Token',
      'badge': 'Badge',
      'emblem': 'Emblem',
      'insignia': 'Insignia',
      'crest': 'Crest',
      'coat': 'Coat',
      'arms': 'Arms',
      'banner': 'Banner',
      'flag': 'Flag',
      'pennant': 'Pennant',
      'streamer': 'Streamer',
      'ribbon': 'Ribbon',
      'band': 'Band',
      'strip': 'Strip',
      'stripe': 'Stripe',
      'line': 'Line',
      'bar': 'Bar',
      'rod': 'Rod',
      'stick': 'Stick',
      'pole': 'Pole',
      'post': 'Post',
      'pillar': 'Pillar',
      'column': 'Column',
      'support': 'Support',
      'prop': 'Prop',
      'brace': 'Brace',
      'strut': 'Strut',
      'beam': 'Beam',
      'girder': 'Girder',
      'rafter': 'Rafter',
      'joist': 'Joist',
      'stud': 'Stud',
      'timber': 'Timber',
      'lumber': 'Lumber',
      'wood': 'Wood',
      'log': 'Log',
      'branch': 'Branch',
      'twig': 'Twig',
      'leaf': 'Leaf',
      'needle': 'Needle',
      'cone': 'Cone',
      'acorn': 'Acorn',
      'nut': 'Nut',
      'seed': 'Seed',
      'fruit': 'Fruit',
      'berry': 'Berry',
      'flower': 'Flower',
      'bloom': 'Bloom',
      'blossom': 'Blossom',
      'petal': 'Petal',
      'stem': 'Stem',
      'stalk': 'Stalk',
      'root': 'Root',
      'bulb': 'Bulb',
      'tuber': 'Tuber',
      'rhizome': 'Rhizome',
      'corm': 'Corm',
      'rhizome': 'Rhizome',
      'corm': 'Corm',
      'bulb': 'Bulb',
      'tuber': 'Tuber',
      'root': 'Root',
      'stalk': 'Stalk',
      'stem': 'Stem',
      'petal': 'Petal',
      'blossom': 'Blossom',
      'bloom': 'Bloom',
      'flower': 'Flower',
      'berry': 'Berry',
      'fruit': 'Fruit',
      'seed': 'Seed',
      'nut': 'Nut',
      'acorn': 'Acorn',
      'cone': 'Cone',
      'needle': 'Needle',
      'leaf': 'Leaf',
      'twig': 'Twig',
      'branch': 'Branch',
      'log': 'Log',
      'wood': 'Wood',
      'lumber': 'Lumber',
      'timber': 'Timber',
      'stud': 'Stud',
      'joist': 'Joist',
      'rafter': 'Rafter',
      'girder': 'Girder',
      'beam': 'Beam',
      'strut': 'Strut',
      'brace': 'Brace',
      'prop': 'Prop',
      'support': 'Support',
      'column': 'Column',
      'pillar': 'Pillar',
      'post': 'Post',
      'pole': 'Pole',
      'stick': 'Stick',
      'rod': 'Rod',
      'bar': 'Bar',
      'line': 'Line',
      'stripe': 'Stripe',
      'strip': 'Strip',
      'band': 'Band',
      'ribbon': 'Ribbon',
      'streamer': 'Streamer',
      'pennant': 'Pennant',
      'flag': 'Flag',
      'banner': 'Banner',
      'arms': 'Arms',
      'coat': 'Coat',
      'crest': 'Crest',
      'insignia': 'Insignia',
      'emblem': 'Emblem',
      'badge': 'Badge',
      'token': 'Token',
      'mark': 'Mark',
      'symbol': 'Symbol',
      'signal': 'Signal',
      'sign': 'Sign',
      'indicator': 'Indicator',
      'metric': 'Metric',
      'measure': 'Measure',
      'criterion': 'Criterion',
      'standard': 'Standard',
      'ideal': 'Ideal',
      'vision': 'Vision',
      'mission': 'Mission',
      'purpose': 'Purpose',
      'aim': 'Aim',
      'target': 'Target',
      'objective': 'Objective',
      'goal': 'Goal',
      'ambition': 'Ambition',
      'aspiration': 'Aspiration',
      'dream': 'Dream',
      'hope': 'Hope',
      'wish': 'Wish',
      'want': 'Want',
      'need': 'Need',
      'thirst': 'Thirst',
      'hunger': 'Hunger',
      'craving': 'Craving',
      'yearning': 'Yearning',
      'longing': 'Longing',
      'desire': 'Desire',
      'passion': 'Passion',
      'emotion': 'Emotion',
      'feeling': 'Feeling',
      'sensation': 'Sensation',
      'perception': 'Perception',
      'awareness': 'Awareness',
      'consciousness': 'Consciousness',
      'mind': 'Mind',
      'spirit': 'Spirit',
      'soul': 'Soul',
      'heart': 'Heart',
      'core': 'Core',
      'essence': 'Essence',
      'nature': 'Nature',
      'character': 'Character',
      'personality': 'Personality',
      'disposition': 'Disposition',
      'temperament': 'Temperament',
      'mood': 'Mood',
      'attitude': 'Attitude',
      'posture': 'Posture',
      'stance': 'Stance',
      'position': 'Position',
      'standpoint': 'Standpoint',
      'viewpoint': 'Viewpoint',
      'perspective': 'Perspective',
      'angle': 'Angle',
      'side': 'Side',
      'facet': 'Facet',
      'aspect': 'Aspect',
      'profile': 'Profile',
      'silhouette': 'Silhouette',
      'figure': 'Figure',
      'form': 'Form',
      'shape': 'Shape',
      'contour': 'Contour',
      'outline': 'Outline',
      'circumference': 'Circumference',
      'perimeter': 'Perimeter',
      'edge': 'Edge',
      'boundary': 'Boundary',
      'border': 'Border',
      'line': 'Line',
      'front': 'Front',
      'warzone': 'Warzone',
      'battlefield': 'Battlefield',
      'field': 'Field',
      'arena': 'Arena',
      'stage': 'Stage',
      'platform': 'Platform',
      'base': 'Base',
      'ground': 'Ground',
      'basis': 'Basis',
      'foundation': 'Foundation',
      'root': 'Root',
      'source': 'Source',
      'origin': 'Origin',
      'background': 'Background',
      'heritage': 'Heritage',
      'ancestry': 'Ancestry',
      'bloodline': 'Bloodline',
      'lineage': 'Lineage',
      'house': 'House',
      'family': 'Family',
      'tribe': 'Tribe',
      'clan': 'Clan',
      'band': 'Band',
      'gang': 'Gang',
      'crew': 'Crew',
      'team': 'Team',
      'group': 'Group',
      'society': 'Society',
      'community': 'Community',
      'neighborhood': 'Neighborhood',
      'district': 'District',
      'zone': 'Zone',
      'area': 'Area',
      'region': 'Region',
      'province': 'Province',
      'state': 'State',
      'country': 'Country',
      'nation': 'Nation',
      'empire': 'Empire',
      'kingdom': 'Kingdom',
      'realm': 'Realm',
      'domain': 'Domain',
      'territory': 'Territory',
      'estate': 'Estate',
      'property': 'Property',
      'belongings': 'Belongings',
      'possessions': 'Possessions',
      'valuables': 'Valuables',
      'riches': 'Riches',
      'fortune': 'Fortune',
      'treasure': 'Treasure',
      'wealth': 'Wealth',
      'capital': 'Capital',
      'assets': 'Assets',
      'resources': 'Resources',
      'materials': 'Materials',
      'supplies': 'Supplies',
      'gear': 'Gear',
      'equipment': 'Equipment',
      'apparatus': 'Apparatus',
      'instrument': 'Instrument',
      'tool': 'Tool',
      'device': 'Device',
      'mechanism': 'Mechanism',
      'system': 'System',
      'protocol': 'Protocol',
      'procedure': 'Procedure',
      'process': 'Process',
      'technique': 'Technique',
      'method': 'Method',
      'approach': 'Approach',
      'tactic': 'Tactic',
      'strategy': 'Strategy',
      'scheme': 'Scheme',
      'plan': 'Plan',
      'blueprint': 'Blueprint',
      'template': 'Template',
      'model': 'Model',
      'framework': 'Framework',
      'structure': 'Structure',
      'pattern': 'Pattern',
      'design': 'Design',
      'artwork': 'Artwork',
      'creation': 'Creation',
      'invention': 'Invention',
      'innovation': 'Innovation',
      'breakthrough': 'Breakthrough',
      'epiphany': 'Epiphany',
      'realization': 'Realization',
      'insight': 'Insight',
      'discovery': 'Discovery',
      'revelation': 'Revelation',
      'secret': 'Secret',
      'mystery': 'Mystery',
      'paradox': 'Paradox',
      'dilemma': 'Dilemma',
      'tension': 'Tension',
      'conflict': 'Conflict',
      'issue': 'Issue',
      'problem': 'Problem',
      'obstacle': 'Obstacle',
      'challenge': 'Challenge',
      'anxiety': 'Anxiety',
      'worry': 'Worry',
      'concern': 'Concern',
      'fear': 'Fear',
      'hope': 'Hope',
      'wish': 'Wish',
      'desire': 'Desire',
      'ambition': 'Ambition',
      'aspiration': 'Aspiration',
      'dream': 'Dream',
      'vision': 'Vision',
      'mission': 'Mission',
      'purpose': 'Purpose',
      'objective': 'Objective',
      'goal': 'Goal',
      'principle': 'Principle',
      'philosophy': 'Philosophy',
      'belief': 'Belief',
      'value': 'Value',
      'approach': 'Approach',
      'strategy': 'Strategy',
      'method': 'Method',
      'technique': 'Technique',
      'process': 'Process',
      'system': 'System',
      'mechanic': 'Mechanic',
      'rule': 'Rule',
      'lore': 'Lore',
      'history': 'History',
      'culture': 'Culture',
      'technology': 'Technology',
      'magic': 'Magic',
      'worldbuilding': 'Worldbuilding',
      'theme': 'Theme',
      'plot': 'Plot',
      'backstory': 'Backstory',
      'relationship': 'Relationship',
      'trait': 'Trait',
      'skill': 'Skill',
      'ability': 'Ability',
      'spell': 'Spell',
      'creature': 'Creature',
      'faction': 'Faction',
      'organization': 'Organization',
      'concept': 'Concept',
      'event': 'Event',
      'item': 'Item',
      'location': 'Location',
      'character': 'Character'
    };
    
    return typeMap[cardType] || cardType;
  }
  

  function handleSearchRestore() {
    // The VirtualMessageList and ChatInterface components will handle the actual restoration
    // This function is here for any main page specific cleanup if needed in the future
  }

  function handleSearchShowResult(event) {
    const { messageId, searchTerm } = event.detail;
    
    // Set the search term for highlighting
    search = searchTerm || '';
    
    // The ChatInterface will handle the actual showSearchResult call
    // This is just for logging and any main page level handling if needed
  }


  // Session event handlers for SessionNavigator
  function handleSessionSelect(event) {
    if (sessionLogicManager) {
      sessionLogicManager.selectSession(event.detail);
    }
    // Close the session navigator panel after selecting a session
    showSessionNavigator = false;
  }

  async function handleSessionCreated(event) {
    // Reload sessions and select the new one
    if (sessionLogicManager) {
      await sessionLogicManager.loadSessions();
      if (event.detail) {
        await sessionLogicManager.selectSession(event.detail);
      }
    }
  }

  async function handleSessionUpdated() {
    // Reload sessions to get updated data
    if (sessionLogicManager) {
      await sessionLogicManager.loadSessions();
    }
  }

  async function handleSessionDeleted(event) {
    // Remove from local array and select another
    sessions = sessions.filter(s => s.id !== event.detail.id);
    
    if (currentSession?.id === event.detail.id) {
      // Select another session if available
      if (sessions.length > 0 && sessionLogicManager) {
        await sessionLogicManager.selectSession(sessions[0]);
      } else {
        currentSession = null;
        messages = [];
        branches = [];
      }
    }
  }

  function handleToggleSessionNavigator() {
    showSessionNavigator = !showSessionNavigator;
  }



  // Click outside handler for sessions panel
  function handleClickOutside(event) {
    if (showSessionNavigator && sessionNavigatorElement && !sessionNavigatorElement.contains(event.target)) {
      // Check if click is not on the Sessions button in the header (desktop) or mobile session button
      const isSessionsButton = event.target.closest('[data-sessions-button]');
      const isMobileSessionButton = event.target.closest('[data-mobile-sessions-button]');
      if (!isSessionsButton && !isMobileSessionButton) {
        showSessionNavigator = false;
      }
    }
    

  }
  
  // Mr Wiskr modal event handlers
  function handleMrWiskrOpen() {
    showMrWiskrModal = true;
  }
  
  function handleMrWiskrClose() {
    showMrWiskrModal = false;
  }
  
  async function handleMrWiskrAsk(event) {
    const { question } = event.detail;
    
    if (!question || mrWiskrLoading) return;
    
    mrWiskrLoading = true;
    
    try {
      // Simulate Mr Wiskr's helpful response (you can replace this with actual API call)
      const responses = [
        "Purr-fect question! 🐱 Here's what I'd recommend based on my experience helping users with Wiskr...",
        "Meow! That's a great question. Let me share some wisdom from my digital catnap observations...",
        "*stretches paws* Ah yes, I've seen this before! Here's how you can tackle that...",
        "*adjusts wizard hat* Excellent question, human! Based on my extensive cat-alog of user interactions...",
        "*purrs thoughtfully* I've helped many users with similar issues. Here's my feline-tuned advice..."
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      // Add some context-specific help
      let contextHelp = "";
      if (question.toLowerCase().includes('bug') || question.toLowerCase().includes('error')) {
        contextHelp = "\n\nFor bugs, I recommend checking the browser console (F12) for error messages and noting exactly what steps led to the issue. You can also try refreshing the page or clearing your browser cache.";
      } else if (question.toLowerCase().includes('project') || question.toLowerCase().includes('organize')) {
        contextHelp = "\n\nFor project organization, remember that you can use tags in facts and docs to categorize information, and the branch system lets you explore different conversation paths without losing your main thread.";
      } else if (question.toLowerCase().includes('ai') || question.toLowerCase().includes('model')) {
        contextHelp = "\n\nWhen working with AI models, try the Speed model for quick questions and Quality model for complex tasks. If an AI starts hallucinating, try rephrasing your question or breaking it into smaller parts.";
      }
      
      const fullResponse = randomResponse + "\n\n" + question + contextHelp + "\n\n*whiskers twitch with satisfaction* 😸";
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
      
              // Set response in the modal
        // TODO: Implement Mr Wiskr response handling
    } catch (error) {
      console.error('Error asking Mr Wiskr:', error);
              // TODO: Handle Mr Wiskr error response
    } finally {
      mrWiskrLoading = false;
    }
  }
  
  // Event handlers for new management components
  
  // ProjectState event handlers
  async function handleProjectChanged(event) {
    const { projectId, project } = event.detail;
    
    // Reset branch state when switching projects
    currentBranchId = 'main';
    currentBranch = null;
    branches = [];
    
    // Load sessions first, then select active session
    if (sessionLogicManager) {
      await sessionLogicManager.loadSessions();
    }
    
    // Load context for this project
    if (contextManager) {
      await contextManager.loadContext(true); // Force reload when switching projects
    }
    
    // Load questions and messages for this project using ChatManager
    if (chatManager) {
      await chatManager.loadQuestions();
    }
  }
  
  // ModalManager event handlers
  async function handleBranchCreated(event) {
    const { branch, sessionId } = event.detail;
    
    // Reload branches for the session
    if (sessionLogicManager) {
      await sessionLogicManager.loadSessionBranches(sessionId);
    }
    
    // Switch to the new branch
    await switchToBranch(branch.branch_id);
    
    // Reload message branch counts in the ChatInterface component
    if (browser) {
      window.dispatchEvent(new CustomEvent('branches-updated'));
    }
  }
  
  async function handleProjectCreatedFromModal(event) {
    const { project } = event.detail;
    
    // Refresh projects using ProjectState and select the new one
    if (projectState) {
      await projectState.reloadProjects(project.id);
    }
  }
  
  function handleCopySuccess(event) {
    // Could add a toast notification here
  }
  
  // Mobile menu event handlers
  function handleMobileShowContext() {
    if (panelManager) {
      panelManager.handleMobileShowContext();
    }
  }
  
  function handleMobileShowAddins() {
    if (panelManager) {
      panelManager.handleMobileShowAddins();
    }
  }
  
  // Mobile toggle event handlers - directly update local variables
  function handleMobileToggleContext() {
    if (showLeftPanel) {
      // If context panel is open, close it
      showLeftPanel = false;
    } else {
      // If context panel is closed, open it and close add-ins  
      showRightPanel = false;
      showLeftPanel = true;
    }
  }
  
  function handleMobileToggleAddins() {
    if (showRightPanel) {
      // If add-ins panel is open, close it
      showRightPanel = false;
    } else {
      // If add-ins panel is closed, open it and close context
      showLeftPanel = false;
      showRightPanel = true;
    }
  }
  
  function handleMobileToggleSessions() {
    showSessionNavigator = !showSessionNavigator;
  }

  function handleWizardSelected(event) {
    const { wizard } = event.detail;
    console.log('🧙‍♂️ Projects page: Wizard selected:', wizard);
    
    // TODO: Implement chat interface opening with selected wizard
    // For now, just log the selection
    alert(`Wizard ${wizard.name} selected! Chat interface coming soon...`);
  }

</script>

  <!-- Layout -->
<div id="projects-page-layout" class="flex h-[calc(100vh-4rem)] relative overflow-hidden">
  
  <!-- LEFT PANEL: Binder or Deck View (Full Width) -->
<div id="left-panel" class="{showLeftPanel ? (isDesktop && !leftPanelCollapsed ? 'w-full' : isDesktop && leftPanelCollapsed ? 'w-0' : 'fixed inset-0 z-50 w-full') : (isDesktop ? 'w-0' : 'fixed inset-0 z-50 w-full')} {!isDesktop ? 'mobile-panel' : ''} {!isDesktop && showLeftPanel ? 'mobile-panel-enter' : ''} {!isDesktop && !showLeftPanel ? 'mobile-panel-exit' : ''} transition-all duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 panel-scrollbar safe-area-inset-bottom" style="background-color: var(--bg-panel-left);" style:top={!isDesktop ? '4rem' : ''}>
  {#if showLeftPanel}
      {#if showDeckView && currentDeck}
        <DeckView
          deck={currentDeck}
          cards={cards}
          isOpen={showDeckView}
          projectId={current?.id}
          userPreferences={userPreferences}
          on:close-deck={closeDeck}
          on:deck-updated={handleDeckUpdated}
          on:card-updated={handleCardUpdated}
        />
      {:else}
        <Binder
          bind:this={binderComponent}
          {current}
          {cards}
          {docs}
          loadingCards={loadingCards}
          {search}
          {isDesktop}
          user={data?.user}
          userTier={data?.userTier}
          effectiveTier={data?.effectiveTier}
          userPreferences={userPreferences}
          showCollapseButton={isDesktop}
          isCollapsed={leftPanelCollapsed}
          onToggleCollapse={toggleLeftPanelCollapse}
          bind:showAddCardForm
          bind:cardType
          worldId={current?.id}
          bind:cardTitle
          bind:cardContent
          bind:cardTags
          bind:showAddDocForm
          bind:docTitle
          bind:docContent
          bind:docTags
          bind:activeTab
          on:brief-regenerate={regenerateBrief}
          on:card-add={handleCardAdd}
          on:card-cancel-add={() => { contextManager?.clearCardForm(); }}
          on:card-start-edit={handleCardStartEdit}
          on:card-cancel-edit={handleCardCancelEdit}
          on:card-save-edit={handleCardSaveEdit}
          on:card-delete={handleCardDelete}
          on:card-toggle-pin={handleCardTogglePin}
          on:save-card={handleCardSave}
          on:card-open-deck={handleCardOpenDeck}
          on:doc-add={handleDocAdd}
          on:doc-cancel-add={() => { contextManager?.clearDocForm(); }}
          on:doc-start-edit={handleDocStartEdit}
          on:doc-cancel-edit={handleDocCancelEdit}
          on:doc-save-edit={handleDocSaveEdit}
          on:doc-delete={handleDocDelete}
          on:doc-toggle-pin={handleDocTogglePin}
          on:reload-context={handleReloadContext}
          on:wizard-selected={handleWizardSelected}
        />
      {/if}
    {/if}
  </div>



  <!-- MAIN AREA: Chat (Center) -->
  <div id="main-chat-area" class="{isDesktop ? (leftPanelCollapsed && !rightPanelCollapsed ? 'w-[50%]' : !leftPanelCollapsed && rightPanelCollapsed ? 'w-[70%]' : 'flex-1') : 'flex-1'} flex flex-col relative">
    <!-- Upgrade Success Message -->
                {#if upgradeMessage}
              <div class="w-full p-4 mb-4 rounded-lg border transition-all duration-300 {upgradeMessageType === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' : 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'}" data-testid="upgrade-success">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            {upgradeMessageType === 'success' ? '🎉' : 'ℹ️'}
            <span class="font-medium">{upgradeMessage}</span>
          </div>
          <button 
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            on:click={() => upgradeMessage = ''}
            aria-label="Dismiss message"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
      </div>
    {/if}
    
    <!-- Chat Container - Hidden for Cards UI -->
    <!-- <div class="w-full h-full flex flex-col relative">

    <ChatInterface
      {current}
      {hasInit}
      {messages}
      {loadingMessages}
      bind:input
      bind:modelKey
      {branches}
      {currentBranch}
      {currentBranchId}
      {usage}
      bind:showUsageStats
      {showSessionNavigator}
      {sessions}
      {currentSession}
      isMobile={!isDesktop}
      user={data?.user}
      userTier={data?.userTier}
      effectiveTier={data?.effectiveTier}
      data-tutorial="chat-area"
      on:send={send}
      on:switch-branch={handleSwitchToBranch}
      on:open-format-modal={handleOpenFormatModal}
      on:open-branch-modal={handleOpenBranchModal}
      on:branch-renamed={handleBranchRenamed}
      on:branch-deleted={handleBranchDeleted}
      on:add-to-cards={handleTextAddToCards}
      on:add-to-docs={handleTextAddToDocs}
      on:add-to-questions={handleTextAddToQuestions}
      on:format-text={handleFormatText}
      on:toggle-session-navigator={handleToggleSessionNavigator}

    />
    </div> -->
    
    <!-- Fixed position collapse/expand buttons with changing icons -->
    {#if isDesktop}
      <!-- Left panel toggle button (always visible, icon changes based on state) -->
      <div class="absolute left-0 top-0 z-50">
        <button
          class="flex items-center text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
          on:click={toggleLeftPanelCollapse}
          title={showDeckView ? "Close Deck View" : leftPanelCollapsed ? "Expand Cards & Docs" : "Collapse Cards & Docs"}
        >
          {#if showDeckView}
            <!-- X icon for closing deck view -->
            <X size="32" />
          {:else if leftPanelCollapsed}
            <!-- Double chevrons pointing right (expand) -->
            <ChevronsRight size="32" />
          {:else}
            <!-- Double chevrons pointing left (collapse) -->
            <ChevronsLeft size="32" />
          {/if}
        </button>
      </div>
      
      <!-- Right panel toggle button - HIDDEN -->
      <!-- <div class="absolute right-0 top-0 z-50">
        <button
          class="flex items-center text-xs text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-blue-400 transition-colors"
          on:click={toggleRightPanelCollapse}
          title={rightPanelCollapsed ? "Expand Questions & Ideas" : "Collapse Questions & Ideas"}
        >
          {#if rightPanelCollapsed}
            <ChevronsLeft size="32" />
          {:else}
            <ChevronsRight size="32" />
          {/if}
        </button>
      </div> -->
    {/if}
    
    <!-- MOBILE SEARCH PANEL -->
    <MobileSearch
      isVisible={showMobileSearch && !isDesktop}
      projectId={current?.id}
      onClosePanel={() => showMobileSearch = false}
      onCloseAllPanels={closeAllPanels}
      onOpenPanel={openPanel}
      onScrollToResult={scrollToResult}
    />

    <!-- SESSION NAVIGATOR (overlays chat below header) -->
    <div 
      bind:this={sessionNavigatorElement}
      class="absolute z-50 transition-all duration-300 ease-in-out {showSessionNavigator ? 'translate-x-0 visible opacity-100' : '-translate-x-full invisible opacity-0'} {isDesktop ? 'left-0 top-16 bottom-0 w-80' : 'fixed inset-0 top-16 w-full h-full'}"
      data-tutorial="sessions-panel"
    >
      {#if showSessionNavigator && !isDesktop}
        <!-- Mobile session navigator header - hidden to save space -->
        <!-- <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800" style="background-color: var(--bg-header);">
          <h2 class="text-lg font-semibold" style="color: var(--text-primary);">Chats & Branches</h2>
          <button 
            class="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            on:click={() => showSessionNavigator = false}
            aria-label="Close chats"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div> -->
        <!-- Mobile session navigator content -->
        <div class="flex-1 overflow-hidden w-full" style="background-color: var(--bg-sessions-panel);">
          <SessionNavigator 
            {sessions}
            {currentSession}
            projectId={current?.id}
            isVisible={showSessionNavigator}
            isMobile={!isDesktop}
            {branches}
            {currentBranchId}
            {currentBranch}
            onClosePanel={() => showSessionNavigator = false}
            on:select-session={handleSessionSelect}
            on:session-created={handleSessionCreated}
            on:session-updated={handleSessionUpdated}
            on:session-deleted={handleSessionDeleted}
            on:branch-changed={handleSwitchToBranch}
          />
        </div>
      {:else if showSessionNavigator}
        <!-- Desktop session navigator (no header needed) -->
        <SessionNavigator 
          {sessions}
          {currentSession}
          projectId={current?.id}
          isVisible={showSessionNavigator}
          isMobile={false}
          {branches}
          {currentBranchId}
          {currentBranch}
          onClosePanel={() => showSessionNavigator = false}
          on:select-session={handleSessionSelect}
          on:session-created={handleSessionCreated}
          on:session-updated={handleSessionUpdated}
          on:session-deleted={handleSessionDeleted}
          on:branch-changed={handleSwitchToBranch}
        />
      {/if}
    </div>
    </div>
  </div>



  <!-- RIGHT PANEL: Questions/Ideas - Hidden for Cards UI -->
  <!-- <div id="right-panel" class="{showRightPanel ? (isDesktop && !rightPanelCollapsed ? (leftPanelCollapsed ? 'w-[50%]' : 'w-[30%]') : isDesktop && rightPanelCollapsed ? 'w-0' : 'fixed inset-0 z-40 w-full') : (isDesktop ? 'w-0' : 'fixed inset-0 z-40 w-full')} {!isDesktop ? 'mobile-panel-right' : ''} {!isDesktop && showRightPanel ? 'mobile-panel-right-enter' : ''} {!isDesktop && !showRightPanel ? 'mobile-panel-right-exit' : ''} transition-all duration-300 ease-in-out border-l border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0 panel-scrollbar safe-area-inset-bottom" style="background-color: var(--bg-panel-right); {!isDesktop ? 'top: 4rem;' : ''}">
    {#if showRightPanel}
      <IdeasColumn
        bind:this={ideasColumnComponent}
        {goodQuestions}
        {relatedIdeas}
        {isGeneratingIdeas}
        {loadingQuestions}
        {search}
        {isDesktop}
        projectId={current?.id}
        on:questions-update={handleQuestionsUpdate}
        on:insert-text={handleInsertText}
        on:generate-ideas={handleGenerateIdeas}
      />
    {/if}
  </div> -->

<!-- Mobile Hamburger Menu (positioned after columns for proper z-order) -->
{#if showMobileMenu && !isDesktop}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 z-[200]" 
        on:click={() => {
          showMobileMenu = false;
          // Keep cards panel visible for full screen cards UI
          if (!isDesktop) {
            showLeftPanel = true;
            showRightPanel = false;
          }
        }}
  >
          <div id="mobile-hamburger-menu" 
          class="absolute top-16 right-2 sm:right-6 rounded-lg shadow-xl min-w-48 max-w-[90vw] py-2 z-[201]" 
          style:background-color={typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#0f172a' : '#93c5fd'} 
          style:border={`2px solid ${typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? '#1e293b' : '#60a5fa'}`} 
          style:color="white">
      <!-- Usage Stats -->
      <button 
        type="button"
        class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-blue-600 transition-colors" 
        on:click={() => {
          showUsagePopover = !showUsagePopover;
          showMobileMenu = false;
          showLeftPanel = true;
          showRightPanel = false;
        }}
      >
        <BarChart3 size="16" />
        <span>Usage</span>
      </button>
      
      <!-- Context Dashboard (Admin Only) -->
      {#if data?.isAdmin}
        <a 
          href="/context-dashboard{current?.id ? `?projectId=${current.id}` : ''}"
          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-blue-600 transition-colors"
          on:click={() => {
            showMobileMenu = false;
            showLeftPanel = true;
            showRightPanel = false;
          }}
        >
          <Settings2 size="16" />
          <span>Context Dashboard</span>
        </a>
      {/if}
      
      {#if data?.user}
        <!-- Settings Button -->
        <button 
          type="button"
          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-blue-600 transition-colors"
          on:click={() => {
            window.dispatchEvent(new CustomEvent('layout:open-settings', { detail: { tab: 'account' } }));
            showMobileMenu = false;
            showLeftPanel = true;
            showRightPanel = false;
          }}
        >
          <Settings size="16" />
          <span>Settings</span>
        </button>
        
        <!-- Logout -->
        <a 
          href="/logout" 
          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-blue-600 transition-colors"
          on:click={() => {
            showMobileMenu = false;
            showLeftPanel = true;
            showRightPanel = false;
          }}
        >
          <LogOut size="16" />
          <span>Logout</span>
        </a>
      {:else}
        <!-- Login -->
        <a 
          href="/login" 
          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-blue-600 transition-colors"
          on:click={() => {
            showMobileMenu = false;
            showLeftPanel = true;
            showRightPanel = false;
          }}
        >
          Login
        </a>
        
        <!-- Sign Up -->
        <a 
          href="/signup" 
          class="w-full flex items-center gap-3 px-4 py-3 text-sm text-white hover:bg-blue-600 transition-colors"
          on:click={() => {
            showMobileMenu = false;
            showLeftPanel = true;
            showRightPanel = false;
          }}
        >
          Sign Up
        </a>
      {/if}
    </div>
  </div>
{/if}

<!-- Usage Popover -->
{#if showUsagePopover && usage}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="fixed inset-0 backdrop-blur-sm /50 dark:/70 z-[1000] flex items-start justify-end pt-20 pr-6" on:click={() => showUsagePopover = false}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="bg-white border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4 min-w-[300px]" style="background-color: var(--bg-modal, white);" on:click|stopPropagation>
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-200">Usage Stats</h3>
        <button 
          on:click={() => showUsagePopover = false}
          class="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
          title="Close"
        >
          ✕
        </button>
      </div>
      
      <div class="text-xs text-gray-600 dark:text-gray-400 space-y-2">
        <div class="text-gray-700 dark:text-gray-300 font-medium mb-2">Total Usage (All Projects):</div>
        
        <div class="bg-gray-50 dark:bg-gray-700 rounded p-2">
          <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Today</div>
          <div class="text-gray-600 dark:text-gray-400">
            <span class="font-medium">{usage.today.in.toLocaleString()}</span> tokens in / 
            <span class="font-medium">{usage.today.out.toLocaleString()}</span> tokens out
          </div>
          <!-- <div class="font-medium text-gray-700 dark:text-gray-300">${usage.today.cost.toFixed(4)}</div> -->
        </div>
        
        <div class="bg-gray-50 dark:bg-gray-700 rounded p-2">
          <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">Last 7 days</div>
          <div class="text-gray-600 dark:text-gray-400">
            <span class="font-medium">{usage.week.in.toLocaleString()}</span> tokens in / 
            <span class="font-medium">{usage.week.out.toLocaleString()}</span> tokens out
          </div>
          <!-- <div class="font-medium text-gray-700 dark:text-gray-300">${usage.week.cost.toFixed(4)}</div> -->
        </div>
        
        <div class="bg-gray-50 dark:bg-gray-700 rounded p-2">
          <div class="font-medium text-gray-700 dark:text-gray-300 mb-1">This month</div>
          <div class="text-gray-600 dark:text-gray-400">
            <span class="font-medium">{usage.month.in.toLocaleString()}</span> tokens in / 
            <span class="font-medium">{usage.month.out.toLocaleString()}</span> tokens out
          </div>
          <!-- <div class="font-medium">${usage.month.cost.toFixed(4)}</div> -->
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Session Logic Manager (hidden component for session management) -->
<!-- <SessionLogicManager 
  bind:this={sessionLogicManager}
  {current}
  bind:sessions
  bind:currentSession
  bind:currentBranchId
  bind:messages
  bind:branches
  bind:loadingMessages
  bind:currentBranch
/> -->

<!-- Context Manager (hidden component for facts/docs management) -->
<ContextManager
  bind:this={contextManager}
  {current}
  bind:loadingCards
  bind:cards
  bind:docs
  bind:cardType
  bind:cardTitle
  bind:cardContent
  bind:cardTags
  bind:showAddCardForm
  bind:docTitle
  bind:docContent
  bind:docTags
  bind:showAddDocForm
  on:project-updated={(e) => current = e.detail}
/>

<!-- Chat Manager (hidden component for chat/messages/questions management) -->
<!-- <ChatManager 
  bind:this={chatManager}
  {current}
  {currentSession}
  {sessionLogicManager}
  {modelKey}
  bind:input
  bind:messages
  bind:loadingMessages
  bind:currentBranchId
  bind:currentBranch
  bind:branches
  bind:goodQuestions
  bind:loadingQuestions
  on:usage-updated={() => loadUsage()}
/> -->

<!-- Modals -->
<FormatModal
  {showFormatModal}
  {selectedText}
  {selectedPlatform}
  {formattedContent}
  {isFormatting}
  on:close={handleFormatModalClose}
  on:format={handleFormatForPlatform}
  on:copy={handleCopyToClipboard}
/>

<BranchModal
  {showBranchModal}
  {branchModalMessageIndex}
  {newBranchName}
  {isCreatingBranch}
  {messages}
  branches={messageBranches}
  {currentBranchId}
  createError={branchCreateError}
  on:close={handleBranchModalClose}
  on:create={handleCreateBranch}
  on:switch-branch={handleSwitchToBranch}
/>

<NewProjectModal
  {showNewProjectModal}
  {newProjectName}
  {creatingProject}
  {createProjectErr}
  on:close={handleNewProjectModalClose}
  on:create={handleCreateProject}
/>

<ProjectSettingsModal
  {showProjectSettingsModal}
  project={projectSettingsProject}
  user={data?.user}
  userTier={data?.userTier}
  effectiveTier={data?.effectiveTier}
  on:close={handleProjectSettingsModalClose}
  on:refresh-projects={handleRefreshProjects}
/>

<!-- Project State Manager (handles project CRUD, selection, usage) -->
<ProjectState 
  bind:this={projectState}
  {data}
  bind:projects
  bind:selectedId
  bind:current
  bind:hasInit
  bind:modelKey
  bind:modelKeyLoaded
  bind:usage
  on:project-changed={handleProjectChanged}
/>

<!-- Modal Manager (handles all modal states) -->
<ModalManager 
  bind:this={modalManager}
  bind:showFormatModal
  bind:selectedText
  bind:selectedMessageIndex
  bind:formattedContent
  bind:selectedPlatform
  bind:isFormatting
  bind:showBranchModal
  bind:branchModalMessageIndex
  bind:newBranchName
  bind:isCreatingBranch
  bind:branchCreateError
  bind:messageBranches
  bind:showNewProjectModal
  bind:newProjectName
  bind:newProjectDescription
  bind:creatingProject
  bind:createProjectErr
  bind:showProjectSettingsModal
  bind:projectSettingsProject
  bind:showMrWiskrModal
  bind:mrWiskrLoading
  bind:showUsageStats
  bind:showUsagePopover
  bind:usageButtonElement
  on:branch-created={handleBranchCreated}
  on:project-created={handleProjectCreatedFromModal}
  on:project-settings-closed={handleProjectSettingsModalClose}
  on:copy-success={handleCopySuccess}
/>

<!-- Panel Manager (handles responsive UI state) -->
<PanelManager 
  bind:this={panelManager}
  showLeftPanel={showLeftPanel}
  showRightPanel={showRightPanel}
  bind:isDesktop
  bind:activeTab
  bind:showSessionNavigator
  bind:sessionNavigatorElement
  bind:search
/>

<!-- Deck Drawer -->
<DeckDrawer
  bind:isOpen={showDeckDrawer}
  currentWorld={current?.name || 'Current World'}
  {decks}
  on:toggle={handleDeckDrawerToggle}
  on:create-deck={handleCreateDeck}
  on:view-deck={handleViewDeck}
  on:toggle-pin={handleTogglePin}
  on:reorder-deck={handleReorderDeck}
/>

