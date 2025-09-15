<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { Search, X, ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { debounce } from 'lodash-es';

  export let projectId = null;
  
  const dispatch = createEventDispatcher();
  
  
  // Search state
  let searchTerm = '';
  let isSearching = false;
  let showDropdown = false;
  let dropdownDisabled = false; // Prevents dropdown from showing after result selection
  let searchResults = {
    cards: [],
    chatMessages: [],
    sessionGroups: [],
    totalSessions: 0
  };
  
  // Search highlighting
  let highlightedTerm = '';
  
  // Navigation state (kept for mobile search functionality)
  let totalHighlights = 0;
  let currentHighlightIndex = 0;
  let showNavigationControls = false;
  let sessionsWithResults = [];
  let currentSessionIndex = 0;
  let sessionNavigationMode = false;
  
  let searchInput;
  let searchContainer;
  let highlightTimeout;
  let portalContainer;
  
  // Debounced search function
  const debouncedSearch = debounce(performSearch, 300);
  
  // Debounced highlighting function with longer delay
  const debouncedHighlighting = debounce(() => {
    applyHighlighting();
  }, 1000);
  
  // Debounced scroll handler to avoid excessive calculations
  const debouncedScrollHandler = debounce(() => {
    if (showDropdown && hasResults()) {
      calculateDropdownPosition();
    }
  }, 100);
  
  // Clear search and reset highlighting
  function clearSearch() {
    searchTerm = '';
    // Only clear highlighting if user explicitly clears search
    highlightedTerm = '';
    showDropdown = false;
    
    // Clear any pending highlight timeout
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
      highlightTimeout = null;
    }
    
    // Clear highlight mode from localStorage
    if (browser) {
      localStorage.removeItem('wiskr-search-term');
      localStorage.removeItem('wiskr-highlight-mode');
    }
    
    // Exit search mode and return to normal chat view
    if (browser) {
      window.dispatchEvent(new CustomEvent('search:restore-chat'));
    }
    
    removeHighlights();
    dispatch('clear');
  }
  
  // Handle search input changes
  function handleSearchInput() {
    // Re-enable dropdown when user starts typing
    if (searchTerm.length >= 3) {
      dropdownDisabled = false;
    }
    
    // Only filter and highlight if search term is 3+ characters AND we're not just selecting a result
    if (searchTerm.length >= 3 && !dropdownDisabled) {
      // Dispatch single filter event for all content types (prevent duplicate highlighting)
      dispatch('filter', { type: 'all', query: searchTerm });
      
      // Activate the cards tab by default when searching
      dispatch('activate-tab', 'cards');
      
        // Always update highlighting when user types - treat as new search
        highlightedTerm = searchTerm;
        
        // Clear any existing highlight timeout
        if (highlightTimeout) {
          clearTimeout(highlightTimeout);
        }
        
        // Set new timeout for highlighting with 1 second delay
        highlightTimeout = setTimeout(() => {
          if (searchTerm.length >= 3 && highlightedTerm === searchTerm) {
            applyHighlighting();
          }
        }, 1000);
    } else if (searchTerm.length < 3) {
      // Clear filters when search is less than 3 characters
      dispatch('clear');
      // Remove highlights when search is cleared
      removeHighlights();
      highlightedTerm = '';
    }
     
     // Only search backend if 3+ characters AND dropdown is not disabled
     if (searchTerm.length >= 3 && !dropdownDisabled) {
       isSearching = true;
       debouncedSearch();
     } else {
       // Search results cleared
       
       // Don't clear search results if we're in highlight mode
       if (!browser || !localStorage.getItem('wiskr-highlight-mode')) {
         searchResults = { cards: [], chatMessages: [], sessionGroups: [], totalSessions: 0 };
         if (!dropdownDisabled) {
           showDropdown = false;
         }
       }
       
       if (searchTerm.length < 1) {
         // Clear highlights when search is completely empty
         highlightedTerm = '';
         if (browser) {
           localStorage.removeItem('wiskr-search-term');
           localStorage.removeItem('wiskr-highlight-mode');
         }
         forceRemoveHighlights();
         resetSessionNavigation();
       }
     }
      
      // Calculate dropdown position if we're showing it
      if (showDropdown && hasResults()) {
        calculateDropdownPosition();
      }
  }
  
  // Perform the actual search
  async function performSearch() {
    if (!projectId || searchTerm.length < 3) {
      isSearching = false;
      return;
    }
    
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          query: searchTerm,
          includeTypes: ['cards', 'chats']
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        searchResults = data.results || { cards: [], chatMessages: [], sessionGroups: [], totalSessions: 0 };
        
        // Search results populated
        
        // Update session navigation state
        updateSessionNavigation();
        
          showDropdown = !dropdownDisabled && hasResults();
          
          // Calculate dropdown position when showing
          if (showDropdown) {
            calculateDropdownPosition();
          }
          
          // Apply highlighting now that we have search results
          if (highlightedTerm && highlightedTerm === searchTerm) {
            // Apply highlighting immediately - don't auto-switch sessions
            applyHighlighting();
          }
      } else {
        console.error('Search failed:', await response.text());
        showDropdown = false;
      }
    } catch (error) {
      console.error('Search error:', error);
      showDropdown = false;
    } finally {
      isSearching = false;
    }
  }
  
  // Check if we have any results
  function hasResults() {
    return Object.values(searchResults).some(results => results.length > 0);
  }
  
  // Calculate dropdown position
  function calculateDropdownPosition() {
    if (!browser || !searchContainer) return;
    
    const rect = searchContainer.getBoundingClientRect();
    const left = rect.left;
    const top = rect.bottom + window.scrollY;
    
    // Set CSS custom properties for positioning
    document.documentElement.style.setProperty('--search-dropdown-left', `${left}px`);
    document.documentElement.style.setProperty('--search-dropdown-top', `${top}px`);
  }
  
     // Portal action to render dropdown at document body
   function createPortal(node) {
     // Create portal container if it doesn't exist
     if (!portalContainer) {
       portalContainer = document.createElement('div');
       portalContainer.id = 'search-dropdown-portal';
       portalContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 999999; pointer-events: none;';
       document.body.appendChild(portalContainer);
     }
     
     // Move the node to the portal container
     portalContainer.appendChild(node);
     
     // Enable pointer events on the dropdown itself
     node.style.pointerEvents = 'auto';
     
     // Return cleanup function
     return {
       destroy() {
         if (node.parentNode) {
           node.parentNode.removeChild(node);
         }
       }
     };
   }
  
  // Handle clicking on a search result - modeled after MobileSearch
  function selectResult(result, type) {
    if (type === 'chatMessages') {
      // For chat messages, navigate to the message and apply highlighting
      handleChatMessageSelection(result);
      return;
    }
    
    // Close dropdown first
    showDropdown = false;
    dropdownDisabled = true;
    
    // For other result types, scroll to the result without multiple dispatch events
    let searchText = '';
    if (type === 'cards') searchText = result.title;
    
    // Update search input with the result text
    searchTerm = searchText;
    
    // Set highlighted term for proper highlighting
    highlightedTerm = searchText;
    
    // Activate the appropriate tab and open panel (like MobileSearch does)
    dispatch('activate-tab', type);
    
    // Dispatch single filter event for this specific type only
    dispatch('filter', { type, query: searchText });
    
    // Clear any pending highlight timeout since this is immediate
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
    }
    
    // Apply highlighting immediately for clicked results (no delay needed)
    setTimeout(() => {
      applyHighlighting();
    }, 100);
    
    // Re-enable dropdown after a short delay so user can search again
    setTimeout(() => {
      dropdownDisabled = false;
    }, 300);
  }
  
  // Force remove all highlights regardless of highlight mode
  function forceRemoveHighlights() {
    if (!browser) return;
    
    
    // More aggressive cleanup - find all highlights and completely remove them
    let cleanupAttempts = 0;
    const maxAttempts = 3;
    
    while (cleanupAttempts < maxAttempts) {
      const highlights = document.querySelectorAll('.search-highlight');
      if (highlights.length === 0) break;
      
      
      const parents = new Set();
      
      highlights.forEach(highlight => {
        const parent = highlight.parentNode;
        if (parent) {
          // Replace the span with its text content
          const textNode = document.createTextNode(highlight.textContent);
          try {
            parent.replaceChild(textNode, highlight);
            parents.add(parent);
          } catch (e) {
            console.warn('Failed to replace highlight node:', e);
            // Fallback: remove the highlight node entirely
            try {
              parent.removeChild(highlight);
            } catch (e2) {
              console.warn('Failed to remove highlight node:', e2);
            }
          }
        }
      });
      
      // Normalize all affected parents to merge text nodes
      parents.forEach(parent => {
        if (parent && parent.normalize) {
          try {
            parent.normalize();
          } catch (e) {
            console.warn('Failed to normalize parent:', e);
          }
        }
      });
      
      cleanupAttempts++;
    }
    
    // Clear any highlight-related flags
    totalHighlights = 0;
    currentHighlightIndex = 0;
    showNavigationControls = false;
    
  }
  
  // Handle chat message selection - navigate to message and highlight
  function handleChatMessageSelection(message) {
    // Close dropdown but keep the search term for highlighting
    showDropdown = false;
    dropdownDisabled = true;
    
    // Preserve the current search term for highlighting
    highlightedTerm = searchTerm;
    
    // Store the search term in localStorage so it persists across navigation
    if (browser) {
      localStorage.setItem('wiskr-search-term', searchTerm);
      localStorage.setItem('wiskr-highlight-mode', 'true');
    }
    
    
    // Switch to the appropriate session first (if needed)
    const sessionId = message.sessionId || message.session_id;
    if (sessionId && browser) {
      window.dispatchEvent(new CustomEvent('search:navigate-session', {
        detail: {
          sessionId: sessionId,
          sessionName: message.session_name
        }
      }));
    }
    
    // Navigate to the specific message and branch using search:show-result for search mode
    if (browser) {
      window.dispatchEvent(new CustomEvent('search:show-result', {
        detail: {
          messageId: message.id,
          searchTerm: searchTerm
        }
      }));
    }
    
    // Re-enable dropdown after a delay so user can search again
    setTimeout(() => {
      dropdownDisabled = false;
    }, 1000);
  }
  
  // Handle enter key - filter and highlight
  function handleEnterKey() {
    if (showDropdown) {
      // If dropdown is open, select first result
      const firstResult = getFirstResult();
      if (firstResult.result && firstResult.type) {
        selectResult(firstResult.result, firstResult.type);
      }
      return;
    }
    
    // Filter and highlight results
    filterAndHighlight();
  }
  
  // Get first available result for enter key handling (left-to-right order)
  function getFirstResult() {
    // Check in left-to-right order: Cards -> Chat
    const orderedCategories = ['cards', 'chatMessages'];
    
    for (const category of orderedCategories) {
      const results = searchResults[category];
      if (results && results.length > 0) {
        return { result: results[0], type: category };
      }
    }
    return { result: null, type: null };
  }
  
  // Filter content and highlight matches
  function filterAndHighlight() {
    if (!searchTerm.trim()) return;
    
    highlightedTerm = searchTerm;
    showDropdown = false;
    
    // Dispatch filtering events based on results - simplified like MobileSearch
    const hasCardsResults = searchResults.cards.length > 0;
    const hasChatResults = searchResults.chatMessages.length > 0;
    
    // Activate appropriate tab (priority: cards > chat)
    if (hasCardsResults) {
      dispatch('activate-tab', 'cards');
    } else if (hasChatResults) {
      dispatch('activate-tab', 'chats');
    }
    
    // Single filter event for all types (like the 'all' type we added earlier)
    if (hasCardsResults || hasChatResults) {
      dispatch('filter', { type: 'all', query: searchTerm });
    }
    
    // Handle chat results
    if (hasChatResults) {
      const firstResult = searchResults.chatMessages[0];
      dispatch('navigate-chat', { messageId: firstResult.id, branchId: firstResult.branch_id });
    }
    
    // Apply highlighting immediately for Enter key
    applyHighlighting();
  }
  
  // Apply simple highlighting to current content
  function applyHighlighting() {
    if (!browser || !highlightedTerm || highlightedTerm.trim() === '') return;
    
    // Prevent multiple highlighting operations in quick succession
    if (window.wiskrHighlightingInProgress) {
      return;
    }
    
    window.wiskrHighlightingInProgress = true;
    
    // Force remove ALL existing highlights first
    forceRemoveHighlights();
    
    // Add a small delay to ensure DOM cleanup is complete
    setTimeout(() => {
      // Highlight what's currently visible
      highlightCurrentContent();
      
      // Clear the flag after highlighting is complete
      setTimeout(() => {
        window.wiskrHighlightingInProgress = false;
      }, 100);
    }, 50);
  }
  
  // Highlight content currently visible on the page
  async function highlightCurrentContent() {
    // Find containers that match the search term in specific content areas
    const contentAreas = [
      document.querySelector('.mobile-sidebar'),      // Left sidebar
      document.querySelector('.mobile-chat'),         // Chat area (legacy)
      document.querySelector('.searchable-chat-area') // New chat area class
    ].filter(Boolean);
    
    // Handle right column differently - only highlight individual cards, not the whole column
    const rightColumn = document.querySelector('.mobile-ideas-column');
    if (rightColumn) {
      contentAreas.push(rightColumn);
    }
    
    // If no specific content areas found, fall back to document.body
    const elementsToSearch = contentAreas.length > 0 ? contentAreas : [document.body];
    
    const highlightedContainers = [];
    
    elementsToSearch.forEach(element => {
      const containers = findContainersWithText(element, highlightedTerm);
      highlightedContainers.push(...containers);
    });
    
    // Apply word highlighting to all containers, but skip if already highlighted
    highlightedContainers.forEach(container => {
        // Skip if this container already has highlights
        if (!container.querySelector('.search-highlight')) {
          highlightTextInElement(container, highlightedTerm);
        }
      });
  }
  

  
  // Count how many times a term appears in text
  function countMatchesInText(text, searchTerm) {
    if (!text || !searchTerm) return 0;
    const regex = new RegExp(escapeRegex(searchTerm), 'gi');
    const matches = text.match(regex);
    return matches ? matches.length : 0;
  }
  
  // Calculate which highlight index we're currently at across all sessions
  async function calculateCurrentHighlightIndex() {
    // Always start at index 0 (first highlight) when we first apply highlighting
    currentHighlightIndex = 0;
    
    //console.log('🎯 Setting initial highlight index to 0 (first highlight)');
  }
  
  // Get current session ID from the actual app state, not search results
  function getCurrentSessionId() {
    // Method 1: Try to get from URL if it contains session info
    if (browser) {
      const url = window.location.href;
      const sessionMatch = url.match(/session[\/_-]([a-f0-9-]+)/i);
      if (sessionMatch) {
        //console.log('📍 Current session from URL:', sessionMatch[1]);
        return sessionMatch[1];
      }
    }
    
    // Method 2: Try to find session info in DOM
    if (browser) {
      // Look for session info in data attributes or similar
      const sessionElement = document.querySelector('[data-session-id]');
      if (sessionElement) {
        const sessionId = sessionElement.getAttribute('data-session-id');
        //console.log('📍 Current session from DOM:', sessionId);
        return sessionId;
      }
    }
    
    // Method 3: Fallback to search results (original logic)
    const activeSession = searchResults.sessionGroups?.find(s => s.is_active);
    const fallbackId = activeSession?.session_id || searchResults.sessionGroups?.[0]?.session_id;
    
    //console.log('📍 Current session fallback (from search results):', fallbackId);
    return fallbackId;
  }
  
  // Check if current session has any search results
  async function checkCurrentSessionHasResults() {
    if (!searchResults.sessionGroups || searchResults.sessionGroups.length === 0) {
      //console.log('🔍 No session groups found');
      return false;
    }
    
    const currentSessionId = getCurrentSessionId();
    const currentSession = searchResults.sessionGroups.find(s => s.session_id === currentSessionId);
    
    //console.log('🔍 Session detection debug:', {
    //  currentSessionId,
    //  allSessions: searchResults.sessionGroups.map(s => ({ id: s.session_id, name: s.session_name, is_active: s.is_active })),
    //  foundCurrentSession: !!currentSession
    //});
    
    if (!currentSession) {
      //console.log('🔍 Current session not found in search results');
      return false;
    }
    
    // Check if current session has any chat message results
    const currentSessionMessages = searchResults.chatMessages?.filter(m => m.session_id === currentSessionId) || [];
    
    // Also check if we have any cards (these are always visible)
    const hasNonSessionResults = (searchResults.cards?.length || 0) > 0;
    
    const hasCurrentSessionResults = currentSessionMessages.length > 0 || hasNonSessionResults;
    
    // console.log('🔍 Current session results check:', {
    //   currentSessionId,
    //   currentSessionName: currentSession.session_name,
    //   currentSessionMessages: currentSessionMessages.length,
    //   hasNonSessionResults,
    //   hasCurrentSessionResults,
    //   allChatMessages: searchResults.chatMessages?.map(m => ({ id: m.session_id, name: m.session_name })) || []
    // });
    
    return hasCurrentSessionResults;
  }
  
  // Scroll to first highlight in current view
  function scrollToFirstHighlight() {
    const highlights = document.querySelectorAll('.search-highlight');
    if (highlights.length > 0) {
      highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  // Recursively highlight text in element
  function highlightTextInElement(element, searchTerm) {
    if (!element || !searchTerm) return;
    
    // Skip script and style elements only
    if (element.nodeType === Node.ELEMENT_NODE && 
        (element.tagName === 'SCRIPT' || element.tagName === 'STYLE')) {
      return;
    }
    
    // Process text nodes
    if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent;
      const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
      
      if (regex.test(text)) {
        
        // Skip if already inside a highlight span
        const parent = element.parentNode;
        if (parent && parent.classList?.contains('search-highlight')) {
          return;
        }
        
        const highlightedText = text.replace(regex, '<span class="search-highlight">$1</span>');
        
        if (highlightedText !== text) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = highlightedText;
          
          // Replace the text node with highlighted content
          const fragment = document.createDocumentFragment();
          while (wrapper.firstChild) {
            fragment.appendChild(wrapper.firstChild);
          }
          
          if (parent) {
            parent.replaceChild(fragment, element);
          }
        }
      }
    } else if (element.nodeType === Node.ELEMENT_NODE) {
      // Process child elements
      const children = Array.from(element.childNodes);
      children.forEach(child => highlightTextInElement(child, searchTerm));
    }
  }
  
  // Escape special regex characters
  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  // Find containers that contain the search term
  function findContainersWithText(element, searchTerm) {
    const containers = [];
    const regex = new RegExp(escapeRegex(searchTerm), 'gi');
    
    // Find all text nodes that contain the search term
    function findTextNodesWithTerm(node) {
      const textNodes = [];
      
      if (node.nodeType === Node.TEXT_NODE) {
        if (regex.test(node.textContent)) {
          textNodes.push(node);
        }
      } else {
        // Skip script and style elements
        if (node.tagName !== 'SCRIPT' && node.tagName !== 'STYLE') {
          Array.from(node.childNodes).forEach(child => {
            textNodes.push(...findTextNodesWithTerm(child));
          });
        }
      }
      
      return textNodes;
    }
    
    // Get all text nodes containing the search term
    const matchingTextNodes = findTextNodesWithTerm(element);
    
    // For each text node, find its most appropriate container parent
    matchingTextNodes.forEach(textNode => {
      let container = textNode.parentElement;
      
      // Walk up the DOM to find a suitable container
      // Stop at elements that look like individual content items
      while (container && container !== element) {
        const tagName = container.tagName.toLowerCase();
        const classList = Array.from(container.classList || []);
        
        // Check if this looks like an individual content container
        const isContentContainer = (
          // List items
          tagName === 'li' ||
          // Elements with data-idea-id (specific to Ideas)
          container.hasAttribute('data-idea-id') ||
          // Elements with border/card-like styling
          classList.some(cls => cls.includes('border') || cls.includes('card') || cls.includes('rounded')) ||
          // Elements with specific padding that suggest content blocks
          classList.some(cls => cls.match(/^p-[2-6]$/)) ||
          // Message containers in chat
          classList.some(cls => cls.includes('message')) ||
          // Common content wrapper classes
          classList.some(cls => ['bg-white', 'bg-gray-50', 'bg-gray-100'].includes(cls)) ||
          // Fact and doc cards with borders and background colors
          (classList.some(cls => cls.includes('border-blue-') || cls.includes('border-green-') || 
                                cls.includes('border-purple-') || cls.includes('border-orange-') || 
                                cls.includes('border-red-') || cls.includes('border-yellow-') ||
                                cls.includes('border-pink-') || cls.includes('border-indigo-') ||
                                cls.includes('border-gray-'))) ||
          // Grid items that look like cards (common in fact/doc layouts)
          (classList.some(cls => cls.includes('bg-white') || cls.includes('dark:bg-gray-700')) && 
           classList.some(cls => cls.includes('border') && cls.includes('rounded')))
        );
        
        if (isContentContainer) {
          // Found a suitable container, add it if not already added
          if (!containers.includes(container)) {
            containers.push(container);
          }
          break;
        }
        
        // Check if we've reached a column container - don't go further
        if (classList.some(cls => cls.includes('column') || cls.includes('sidebar') || cls.includes('chat'))) {
          // Fall back to the previous container if we haven't found anything suitable
          const fallbackContainer = textNode.parentElement;
          if (fallbackContainer && !containers.includes(fallbackContainer)) {
            containers.push(fallbackContainer);
          }
          break;
        }
        
        container = container.parentElement;
      }
      
      // If we didn't find a suitable container, use the immediate parent
      if (!containers.some(c => c.contains(textNode))) {
        const immediateParent = textNode.parentElement;
        if (immediateParent && !containers.includes(immediateParent)) {
          containers.push(immediateParent);
        }
      }
    });
    
    return containers;
  }
  
  // Remove existing highlights
  function removeHighlights() {
    if (!browser) return;
    
    // Remove the body class for duplicate hiding
    document.body.classList.remove('search-highlight-active');
    
    // Don't remove highlights if we're in highlight mode and this isn't an explicit clear
    if (browser && localStorage.getItem('wiskr-highlight-mode') === 'true' && highlightedTerm) {
      return;
    }
    
    // Remove text highlights
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        // Create a new text node with the original content
        const textNode = document.createTextNode(highlight.textContent);
        parent.replaceChild(textNode, highlight);
        // Normalize to merge adjacent text nodes
        parent.normalize();
      }
    });
    
    
    totalHighlights = 0;
    currentHighlightIndex = 0;
    showNavigationControls = false;
  }
  
  // Navigate to next highlight (cross-session aware)
  async function nextHighlight() {
    // Close dropdown and prevent it from reopening
    showDropdown = false;
    dropdownDisabled = true;
    
    if (totalHighlights > 0) {
      // Calculate next highlight index
      const nextIndex = (currentHighlightIndex + 1) % totalHighlights;
      
      // console.log('🔍 Next highlight navigation:', {
      //   currentIndex: currentHighlightIndex,
      //   nextIndex,
      //   totalHighlights,
      //   currentSessionId: getCurrentSessionId()
      // });
      
      // First, try to find if this highlight exists in current visible content
      const targetHighlight = findHighlightAtIndex(nextIndex);
      
      if (targetHighlight) {
        // Highlight exists in current visible content - navigate directly
        //console.log('✅ Found target highlight in current view');
        currentHighlightIndex = nextIndex;
        navigateToCurrentHighlight();
        return;
      }
      
      // Target highlight not in current view - check if we need session switch
      const needsSessionSwitch = await shouldSwitchSessionForIndex(nextIndex);
      //console.log('🔄 Session switch check:', { needsSessionSwitch });
      
      if (needsSessionSwitch) {
        const targetSession = await getSessionForHighlightIndex(nextIndex);
        //console.log('🎯 Target session:', {
        //  sessionId: targetSession?.session_id,
        //  sessionName: targetSession?.session_name
        //});
        
        if (targetSession) {
          // Switch to the target session first
          if (browser) {
            //console.log('📡 Dispatching session switch event');
            window.dispatchEvent(new CustomEvent('search:navigate-session', {
              detail: {
                sessionId: targetSession.session_id,
                sessionName: targetSession.session_name
              }
            }));
          }
          
          // Update index and wait for session switch
          currentHighlightIndex = nextIndex;
          setTimeout(() => {
            applyHighlighting();
            navigateToCurrentHighlight();
          }, 400);
          return;
        }
      }
      
      // If we get here, something went wrong - log error and don't navigate
      console.error('⚠️ Could not navigate to highlight index:', {
        targetIndex: nextIndex,
        totalHighlights,
        visibleHighlights: document.querySelectorAll('.search-highlight').length,
        targetFound: !!targetHighlight,
        needsSessionSwitch
      });
    }
    
    // Re-enable dropdown after a delay so user can search again
    setTimeout(() => {
      dropdownDisabled = false;
    }, 1000);
  }
  
  // Navigate to previous highlight (cross-session aware)
  async function prevHighlight() {
    // Close dropdown and prevent it from reopening
    showDropdown = false;
    dropdownDisabled = true;
    
    if (totalHighlights > 0) {
      // Calculate previous highlight index
      const prevIndex = currentHighlightIndex > 0 ? currentHighlightIndex - 1 : totalHighlights - 1;
      
      // Determine if we need to switch sessions
      const needsSessionSwitch = await shouldSwitchSessionForIndex(prevIndex);
      
      if (needsSessionSwitch) {
        const targetSession = await getSessionForHighlightIndex(prevIndex);
        if (targetSession) {
          // Switch to the target session first
          if (browser) {
            window.dispatchEvent(new CustomEvent('search:navigate-session', {
              detail: {
                sessionId: targetSession.session_id,
                sessionName: targetSession.session_name
              }
            }));
          }
          
          // Update index and wait for session switch
          currentHighlightIndex = prevIndex;
          setTimeout(() => {
            applyHighlighting();
            navigateToCurrentHighlight();
          }, 400);
          return;
        }
      }
      
      // Navigate within current session
      currentHighlightIndex = prevIndex;
      navigateToCurrentHighlight();
    }
    
    // Re-enable dropdown after a delay so user can search again
    setTimeout(() => {
      dropdownDisabled = false;
    }, 1000);
  }
  
  // Helper function to check if switching sessions is needed for a given highlight index
  async function shouldSwitchSessionForIndex(targetIndex) {
    if (!searchResults.sessionGroups || searchResults.sessionGroups.length <= 1) {
      return false; // No session switching needed if only one or no sessions
    }
    
    const currentSessionId = getCurrentSessionId();
    const targetSessionId = await getSessionIdForHighlightIndex(targetIndex);
    
    return currentSessionId !== targetSessionId;
  }
  
  // Helper function to get which session a highlight index belongs to
  async function getSessionIdForHighlightIndex(targetIndex) {
    let runningIndex = 0;
    
    // Skip cards (they don't belong to specific sessions)
    searchResults.cards.forEach(card => {
      const titleMatches = countMatchesInText(card.title, highlightedTerm);
      const contentMatches = countMatchesInText(card.content, highlightedTerm);
      runningIndex += titleMatches + contentMatches;
    });
    
    
    // If target index is in non-session content, return current session
    if (targetIndex < runningIndex) {
      return getCurrentSessionId();
    }
    
    // Find which session the target index falls into
    const sortedSessions = [...searchResults.sessionGroups].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return a.session_name.localeCompare(b.session_name);
    });
    
    for (const sessionGroup of sortedSessions) {
      let sessionHighlights = 0;
      sessionGroup.messages.forEach(message => {
        const messageMatches = countMatchesInText(message.content, highlightedTerm);
        sessionHighlights += messageMatches;
      });
      
      if (targetIndex >= runningIndex && targetIndex < runningIndex + sessionHighlights) {
        return sessionGroup.session_id;
      }
      
      runningIndex += sessionHighlights;
    }
    
    // Fallback to current session
    return getCurrentSessionId();
  }
  
  // Helper function to get session object for a highlight index
  async function getSessionForHighlightIndex(targetIndex) {
    const sessionId = await getSessionIdForHighlightIndex(targetIndex);
    return searchResults.sessionGroups?.find(s => s.session_id === sessionId);
  }
  
  // Helper function to navigate to the current highlight in the visible content
  function navigateToCurrentHighlight() {
    const wordHighlights = document.querySelectorAll('.search-highlight');
    
    // Remove current class from all highlights
    wordHighlights.forEach(h => h.classList.remove('current'));
    
    // console.log('🎯 Navigating to current highlight:', {
    //   currentHighlightIndex,
    //   totalWordHighlights: wordHighlights.length
    // });
    
    // Try to find the specific highlight based on our index
    const targetHighlight = findHighlightAtIndex(currentHighlightIndex);
    
    if (targetHighlight) {
      targetHighlight.classList.add('current');

      // console.log('📍 Scrolling to specific highlight:', {
      // //   element: targetHighlight.tagName,
      // //   text: targetHighlight.textContent?.substring(0, 50),
      // //   index: currentHighlightIndex
      // });

      // Scroll to the specific highlight
      targetHighlight.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      flashCurrentHighlight(targetHighlight);
      
    } else if (wordHighlights.length > 0) {
      // Fallback: navigate to first visible highlight
      //console.log('⚠️ Fallback to first visible highlight');
      const firstVisibleHighlight = wordHighlights[0];
      firstVisibleHighlight.classList.add('current');
      firstVisibleHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashCurrentHighlight(firstVisibleHighlight);
      
    }
  }
  
  // Find the specific highlight element at the given index within visible content
  function findHighlightAtIndex(targetIndex) {
    // Get all word highlights in document order
    const allWordHighlights = document.querySelectorAll('.search-highlight');
    
    // console.log('🔍 Finding highlight at index:', {
    //   targetIndex,
    //   totalVisible: allWordHighlights.length
    // });
    
    // Simple approach: if we're not dealing with cross-session navigation,
    // just use the visible highlights directly
    if (!searchResults.sessionGroups || searchResults.sessionGroups.length === 0) {
      return allWordHighlights[targetIndex] || null;
    }
    
    // For cross-session navigation, we need to map the global index to visible content
    const currentSessionId = getCurrentSessionId();
    
    // Calculate how many highlights come from each category in the global count
    let globalRunningIndex = 0;
    
    // Count highlights in cards (always visible)
    let cardsHighlights = 0;
    if (searchResults.cards && searchResults.cards.length > 0) {
      searchResults.cards.forEach(card => {
        const titleMatches = countMatchesInText(card.title, highlightedTerm);
        const contentMatches = countMatchesInText(card.content, highlightedTerm);
        cardsHighlights += titleMatches + contentMatches;
      });
    }
    
    
    const nonSessionHighlights = cardsHighlights;
    globalRunningIndex = nonSessionHighlights;
    
    // console.log('🧮 Highlight distribution analysis:', {
    //   cardsHighlights,
    //   nonSessionHighlights,
    //   targetIndex,
    //   currentSessionId
    // });
    
    // If the target index is within non-session content (cards),
    // it maps directly to visible highlights
    if (targetIndex < nonSessionHighlights) {
      //console.log('📝 Target is in non-session content, using direct index:', targetIndex);
      return allWordHighlights[targetIndex] || null;
    }
    
    // Now we need to handle session-specific content
    // Find which session this target index belongs to
    const sortedSessions = [...searchResults.sessionGroups].sort((a, b) => {
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return a.session_name.localeCompare(b.session_name);
    });
    
    for (const sessionGroup of sortedSessions) {
      let sessionHighlights = 0;
      sessionGroup.messages.forEach(message => {
        const messageMatches = countMatchesInText(message.content, highlightedTerm);
        sessionHighlights += messageMatches;
      });
      
      if (targetIndex >= globalRunningIndex && targetIndex < globalRunningIndex + sessionHighlights) {
        // The target index is within this session
        if (sessionGroup.session_id === currentSessionId) {
          // This is the current session, calculate the visible index
          const indexWithinSession = targetIndex - globalRunningIndex;
          const visibleIndex = nonSessionHighlights + indexWithinSession;
          
          // console.log('💬 Target is in current session:', {
          //   sessionId: currentSessionId,
          //   sessionName: sessionGroup.session_name,
          //   globalIndex: targetIndex,
          //   indexWithinSession,
          //   visibleIndex,
          //   totalVisibleHighlights: allWordHighlights.length
          // });
          
          return allWordHighlights[visibleIndex] || null;
        } else {
          // Target is in a different session - return null to trigger session switch
          // console.log('🔄 Target is in different session:', {
          //   targetSessionId: sessionGroup.session_id,
          //   targetSessionName: sessionGroup.session_name,
          //   currentSessionId,
          //   needsSessionSwitch: true
          // });
          return null;
        }
      }
      
      globalRunningIndex += sessionHighlights;
    }
    
    //console.log('⚠️ Could not find target highlight, using fallback');
    return allWordHighlights[0] || null;
  }
  
  // Flash animation for current highlight
  function flashCurrentHighlight(element) {
    if (!element) return;
    
    // Add flashing class
    element.classList.add('flash-highlight');
    
    // Remove flashing class after animation completes
    setTimeout(() => {
      element.classList.remove('flash-highlight');
    }, 1000); // Duration matches CSS animation
  }
  
  // Handle box focus and click to re-enable dropdown
  function handleInputFocus() {
    // Only re-enable dropdown if user manually focused (not programmatically)
    // Add a small delay to avoid interfering with selectResult
    setTimeout(() => {
      if (document.activeElement === searchInput) {
        dropdownDisabled = false; // Re-enable dropdown when user focuses box
        if (searchTerm.length >= 3 && hasResults()) {
          showDropdown = true; // Show dropdown if we have results
          calculateDropdownPosition(); // Ensure proper positioning
        }
      }
    }, 100);
  }
  
  function handleInputClick() {
    // Always re-enable dropdown when user clicks box
    dropdownDisabled = false;
    
    if (searchTerm.length >= 3 && hasResults()) {
      showDropdown = true; // Show dropdown if we have results
      calculateDropdownPosition(); // Ensure proper positioning
    }
  }
  

  
  // Handle clicking outside to close dropdown
  function handleClickOutside(event) {
    if (!browser || !searchContainer) return;
    if (!searchContainer.contains(event.target)) {
      showDropdown = false;
    }
  }
  
  // Handle window resize to reposition dropdown
  function handleResize() {
    if (showDropdown && hasResults()) {
      calculateDropdownPosition();
    }
  }
  
  // Handle scroll to reposition dropdown
  function handleScroll() {
    debouncedScrollHandler();
  }
  
  // Handle escape key and navigation shortcuts
  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      if (showDropdown) {
        showDropdown = false;
      } else {
        clearSearch();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      handleEnterKey();
    } else if (event.key === 'F3' || (event.ctrlKey && event.key === 'g')) {
      // F3 or Ctrl+G for next highlight
      if (showNavigationControls) {
        event.preventDefault();
        nextHighlight();
      }
    } else if (event.shiftKey && event.key === 'F3' || (event.ctrlKey && event.shiftKey && event.key === 'G')) {
      // Shift+F3 or Ctrl+Shift+G for previous highlight
      if (showNavigationControls) {
        event.preventDefault();
        prevHighlight();
      }
    }
  }
  
  onMount(() => {
    if (browser) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      // Restore highlighting if we're in highlight mode
      const savedSearchTerm = localStorage.getItem('wiskr-search-term');
      const isHighlightMode = localStorage.getItem('wiskr-highlight-mode') === 'true';
      
      if (savedSearchTerm && isHighlightMode) {
        highlightedTerm = savedSearchTerm;
        searchTerm = savedSearchTerm;
        
        // Apply highlighting after a short delay to let the page load
        setTimeout(() => {
          applyHighlighting();
        }, 500);
        
        // Set up a MutationObserver to re-apply highlights when DOM changes
        const observer = new MutationObserver((mutations) => {
          if (highlightedTerm && mutations.some(mutation => 
            mutation.type === 'childList' && 
            mutation.addedNodes.length > 0 &&
            !document.querySelector('.search-highlight')
          )) {
            // Re-apply highlighting if highlights were lost
            setTimeout(() => {
              applyHighlighting();
            }, 100);
          }
        });
        
        // Observe changes to the document body
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Store observer reference for cleanup
        window.wiskrHighlightObserver = observer;
      }
    }
  });
  
  onDestroy(() => {
    if (browser) {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      removeHighlights();
      
      // Clear any pending highlight timeout
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      
      // Clean up the MutationObserver
      if (window.wiskrHighlightObserver) {
        window.wiskrHighlightObserver.disconnect();
        delete window.wiskrHighlightObserver;
      }
      
      // Clean up the portal container
      if (portalContainer && portalContainer.parentNode) {
        portalContainer.parentNode.removeChild(portalContainer);
        portalContainer = null;
      }
    }
  });
  
  // Session navigation functions
  function updateSessionNavigation() {
    if (!searchResults.sessionGroups || searchResults.sessionGroups.length === 0) {
      resetSessionNavigation();
      return;
    }
    
    sessionsWithResults = searchResults.sessionGroups.sort((a, b) => {
      // Sort by active session first, then by name
      if (a.is_active && !b.is_active) return -1;
      if (!a.is_active && b.is_active) return 1;
      return a.session_name.localeCompare(b.session_name);
    });
    
    currentSessionIndex = 0;
    sessionNavigationMode = sessionsWithResults.length > 1; // Enable session navigation if multiple sessions
  }
  
  function resetSessionNavigation() {
    sessionsWithResults = [];
    currentSessionIndex = 0;
    sessionNavigationMode = false;
  }
  
  // Navigate to next session with search results
  async function nextSession() {
    if (sessionsWithResults.length === 0) return;
    
    currentSessionIndex = (currentSessionIndex + 1) % sessionsWithResults.length;
    const targetSession = sessionsWithResults[currentSessionIndex];
    
    // Dispatch session switch event via window event (to maintain consistency with existing pattern)
    if (browser) {
      window.dispatchEvent(new CustomEvent('search:navigate-session', {
        detail: {
          sessionId: targetSession.session_id, 
          sessionName: targetSession.session_name 
        }
      }));
    }
    
    // Small delay to allow session switch, then re-apply highlighting
    setTimeout(() => {
      applyHighlighting();
    }, 300);
  }
  
  // Navigate to previous session with search results
  async function prevSession() {
    if (sessionsWithResults.length === 0) return;
    
    currentSessionIndex = currentSessionIndex > 0 ? currentSessionIndex - 1 : sessionsWithResults.length - 1;
    const targetSession = sessionsWithResults[currentSessionIndex];
    
    // Dispatch session switch event via window event (to maintain consistency with existing pattern)
    if (browser) {
      window.dispatchEvent(new CustomEvent('search:navigate-session', {
        detail: {
          sessionId: targetSession.session_id, 
          sessionName: targetSession.session_name 
        }
      }));
    }
    
    // Small delay to allow session switch, then re-apply highlighting
    setTimeout(() => {
      applyHighlighting();
    }, 300);
  }
  
  // Toggle between session navigation and highlight navigation modes
  function toggleNavigationMode() {
    if (sessionsWithResults.length > 1) {
      sessionNavigationMode = !sessionNavigationMode;
    }
  }
  
  // Enhanced navigation that handles both session and highlight navigation
  function enhancedNext() {
    // Close dropdown temporarily
    showDropdown = false;
    dropdownDisabled = true;
    
    if (sessionNavigationMode && sessionsWithResults.length > 1) {
      nextSession();
    } else {
      nextHighlight();
    }
    
    // Re-enable dropdown after a delay so user can search again
    setTimeout(() => {
      dropdownDisabled = false;
    }, 1000);
  }
  
  function enhancedPrev() {
    // Close dropdown temporarily
    showDropdown = false;
    dropdownDisabled = true;
    
    if (sessionNavigationMode && sessionsWithResults.length > 1) {
      prevSession();
    } else {
      prevHighlight();
    }
    
    // Re-enable dropdown after a delay so user can search again
    setTimeout(() => {
      dropdownDisabled = false;
    }, 1000);
  }
  
  // Reactive statement to handle search input changes
  $: if (searchTerm !== undefined) {
    handleSearchInput();
  }
</script>

<div class="relative w-full max-w-xl" bind:this={searchContainer} data-tutorial="global-search">

  <!-- Search Box -->
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search class="h-4 w-4" style="color: var(--text-header-secondary);" />
    </div>
         <input
       bind:this={searchInput}
       bind:value={searchTerm}
       on:focus={handleInputFocus}
       on:click={handleInputClick}
       type="text"
       class="block w-full pl-10 pr-12 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
       style="background-color: var(--bg-header-input) !important; border-color: var(--border-header-input) !important; color: var(--text-header) !important;"
       placeholder="Search anything..."
       autocomplete="off"
     />
     
     <!-- Loading/Clear Button -->
     <div class="absolute inset-y-0 right-0 flex items-center">
       {#if isSearching}
         <div class="mr-3">
           <div class="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
         </div>
       {:else if searchTerm}
         <button
           on:click={clearSearch}
           class="mr-3 p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
         >
           <X class="h-4 w-4" />
         </button>
       {/if}
     </div>
   </div>

  <!-- Search Results Dropdown - DISABLED (might reuse later) -->
  {#if false && showDropdown && hasResults()}
    {#if browser}
      <div use:createPortal>
        <div class="fixed z-[999999] w-full max-w-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto" style="background-color: var(--bg-modal); left: var(--search-dropdown-left, 0px); top: var(--search-dropdown-top, 0px);" on:click|stopPropagation on:keydown|stopPropagation role="dialog" aria-label="Search results" tabindex="0">
          <!-- Cards Results (Left Column) -->
          {#if searchResults.cards.length > 0}
            <div class="p-3 border-b border-gray-100 dark:border-gray-700">
              <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Cards</h4>
              {#each searchResults.cards.slice(0, 5) as card}
                <button
                  on:click={() => selectResult(card, 'cards')}
                  class="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors block"
                >
                  <div class="flex items-center justify-between mb-1">
                    <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{card.title}</div>
                    {#if card.similarity}
                      <div class="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {Math.round(card.similarity * 100)}%
                      </div>
                    {/if}
                  </div>
                  <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{card.snippet}</div>
                  <div class="flex items-center gap-2 mt-1">
                    {#if card.rarity}
                      <span class="text-xs px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {card.rarity}
                      </span>
                    {/if}
                    {#if card.mana_cost !== undefined}
                      <span class="text-xs px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                        {card.mana_cost} mana
                      </span>
                    {/if}
                  </div>
                </button>
              {/each}
            </div>
          {/if}
          
          <!-- Chat Messages Results (Middle Column) with Session Grouping -->
          {#if searchResults.chatMessages.length > 0}
            <div class="p-3 border-b border-gray-100 dark:border-gray-700">
              <div class="flex items-center justify-between mb-2">
                <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Chat Messages</h4>
                {#if searchResults.totalSessions > 1}
                  <span class="text-xs text-blue-600 dark:text-blue-400 font-medium">{searchResults.totalSessions} sessions</span>
                {/if}
              </div>
              
              {#if searchResults.sessionGroups.length > 0}
                <!-- Group by sessions when multiple sessions have results -->
                {#each searchResults.sessionGroups as sessionGroup}
                  <div class="mb-3 last:mb-0">
                    <div class="flex items-center gap-2 mb-1">
                      <div class="h-2 w-2 rounded-full {sessionGroup.is_active ? 'bg-green-500' : 'bg-gray-400'}"></div>
                      <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{sessionGroup.session_name}</span>
                      <span class="text-xs text-gray-500 dark:text-gray-400">
                        ({sessionGroup.messages.length} {sessionGroup.messages.length === 1 ? 'result' : 'results'}{sessionGroup.message_count > sessionGroup.messages.length ? ` of ${sessionGroup.message_count}` : ''})
                      </span>
                    </div>
                    {#each sessionGroup.messages as message}
                      <button
                        on:click={() => selectResult(message, 'chatMessages')}
                        class="w-full text-left p-2 ml-4 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors block border-l-2 border-gray-200 dark:border-gray-600 pl-3"
                      >
                        <div class="text-sm text-gray-900 dark:text-gray-100 truncate">{message.content.substring(0, 55)}...</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">in {message.branch_name || 'Main'}</div>
                      </button>
                    {/each}
                  </div>
                {/each}
              {:else}
                <!-- Fallback to regular message list if no session grouping -->
                {#each searchResults.chatMessages.slice(0, 5) as message}
                  <button
                    on:click={() => selectResult(message, 'chatMessages')}
                    class="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors block"
                  >
                    <div class="text-sm text-gray-900 dark:text-gray-100 truncate">{message.content.substring(0, 60)}...</div>
                    <div class="text-xs text-gray-500 dark:text-gray-400">in {message.branch_name || 'Main'} • {message.session_name || 'Unknown Session'}</div>
                  </button>
                {/each}
              {/if}
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/if}
</div>

 <style>
   /* Search highlighting styles for individual words - pink to match container borders */
   :global(.search-highlight) {
     display: inline !important;
     background-color: rgba(219, 39, 119, 0.8) !important;
     color: white !important;
     padding: 1px 2px;
     border-radius: 2px;
   }
   
   :global(.search-highlight.current) {
     background-color: rgba(190, 24, 93, 0.9) !important;
     box-shadow: 0 0 0 1px rgba(190, 24, 93, 0.9);
   }
   
   
   
   
   :global(.search-highlight.flash-highlight) {
     animation: flash-pink 1s ease-in-out;
   }
   
   @keyframes flash-pink {
     0% {
       background-color: #be185d;
     }
     50% {
       background-color: #f472b6;
       box-shadow: 0 0 8px rgba(244, 114, 182, 0.6);
     }
     100% {
       background-color: #be185d;
     }
   }
   
   @keyframes flash-container {
     0% {
       background-color: rgba(29, 78, 216, 0.15);
       border-color: rgba(29, 78, 216, 0.5);
     }
     50% {
       background-color: rgba(96, 165, 250, 0.25);
       border-color: rgba(96, 165, 250, 0.7);
       box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.3);
     }
     100% {
       background-color: rgba(29, 78, 216, 0.15);
       border-color: rgba(29, 78, 216, 0.5);
     }
   }
   
   /* Ensure the portal container has the highest z-index */
   :global(#search-dropdown-portal) {
     z-index: 999999 !important;
   }
   
 </style>
