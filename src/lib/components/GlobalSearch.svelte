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
    facts: [],
    docs: [],
    chatMessages: [],
    questions: [],
    relatedIdeas: [],
    sessionGroups: [],
    totalSessions: 0
  };
  
  // Search highlighting
  let highlightedTerm = '';
  let currentHighlightIndex = 0;
  let totalHighlights = 0;
  let showNavigationControls = false;
  
  // Session navigation state
  let currentSessionIndex = 0;
  let sessionsWithResults = [];
  let currentSessionHighlights = 0;
  let sessionNavigationMode = false; // Toggle between highlight navigation and session navigation
  
  let searchInput;
  let searchContainer;
  let highlightTimeout;
  
  // Debounced search function
  const debouncedSearch = debounce(performSearch, 300);
  
  // Debounced highlighting function with longer delay
  const debouncedHighlighting = debounce(() => {
    applyHighlighting();
  }, 1000);
  
  // Clear search and reset highlighting
  function clearSearch() {
    searchTerm = '';
    highlightedTerm = '';
    showDropdown = false;
    showNavigationControls = false;
    
    // Clear any pending highlight timeout
    if (highlightTimeout) {
      clearTimeout(highlightTimeout);
      highlightTimeout = null;
    }
    
    removeHighlights();
    dispatch('clear');
  }
  
  // Handle search input changes
  function handleSearchInput() {
    // Only filter and highlight if search term is 3+ characters
    if (searchTerm.length >= 3) {
      // Dispatch real-time filtering for all content types
      dispatch('filter', { type: 'facts', query: searchTerm });
      dispatch('filter', { type: 'docs', query: searchTerm });
      dispatch('filter', { type: 'questions', query: searchTerm });
      dispatch('filter', { type: 'ideas', query: searchTerm });
      
      // Activate the facts tab by default when searching
      dispatch('activate-tab', 'facts');
      
      // Apply highlighting with delay to let user type
      highlightedTerm = searchTerm;
      
      // Clear any existing highlight timeout
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
      }
      
      // Set new timeout for highlighting
      highlightTimeout = setTimeout(() => {
        applyHighlighting();
      }, 1000);
    } else {
      // Clear filters when search is less than 3 characters
      dispatch('clear');
      removeHighlights();
    }
    
    // Only search backend if 3+ characters AND dropdown is not disabled
    if (searchTerm.length >= 3 && !dropdownDisabled) {
      isSearching = true;
      debouncedSearch();
      } else {
        // Debug: Log when search results are cleared
        console.log('🧹 Search results cleared:', {
          timestamp: new Date().toISOString(),
          reason: searchTerm.length < 3 ? 'Search term too short' : 'Dropdown disabled',
          searchTerm,
          dropdownDisabled
        });
        
        searchResults = { facts: [], docs: [], chatMessages: [], questions: [], relatedIdeas: [], sessionGroups: [], totalSessions: 0 };
        if (!dropdownDisabled) {
          showDropdown = false;
        }
        if (searchTerm.length < 1) {
          removeHighlights();
          resetSessionNavigation();
        }
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
          query: searchTerm
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        searchResults = data.results || { facts: [], docs: [], chatMessages: [], questions: [], relatedIdeas: [], sessionGroups: [], totalSessions: 0 };
        
        // Debug: Log when search results are populated
        console.log('🔍 Search results populated:', {
          timestamp: new Date().toISOString(),
          searchTerm,
          factsCount: searchResults.facts?.length || 0,
          docsCount: searchResults.docs?.length || 0,
          questionsCount: searchResults.questions?.length || 0,
          chatMessagesCount: searchResults.chatMessages?.length || 0,
          sessionGroupsCount: searchResults.sessionGroups?.length || 0
        });
        
        // Update session navigation state
        updateSessionNavigation();
        
        showDropdown = !dropdownDisabled && hasResults();
        
        // Apply highlighting now that we have search results
        if (highlightedTerm && highlightedTerm === searchTerm) {
          console.log('🎯 Applying highlighting with fresh search results');
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
  
  // Handle clicking on a search result
  function selectResult(result, type) {
    if (type === 'chatMessages') {
      // For chat messages, navigate to the message and apply highlighting
      handleChatMessageSelection(result);
      return;
    }
    
    // For other result types, populate the search input as before
    let text = '';
    if (type === 'facts') text = result.key;
    else if (type === 'docs') text = result.title;
    else if (type === 'questions') text = result.question;
    
    // Close dropdown immediately and disable it
    showDropdown = false;
    dropdownDisabled = true;
    
    // Update search term (this will trigger reactive statement, but dropdown is disabled)
    searchTerm = text;
  }
  
  // Handle chat message selection - navigate to message and highlight
  function handleChatMessageSelection(message) {
    // Close dropdown but keep the search term for highlighting
    showDropdown = false;
    dropdownDisabled = true;
    
    // Preserve the current search term for highlighting
    highlightedTerm = searchTerm;
    
    // Switch to the appropriate session first (if needed)
    if (message.session_id && browser) {
      window.dispatchEvent(new CustomEvent('search:navigate-session', {
        detail: {
          sessionId: message.session_id,
          sessionName: message.session_name
        }
      }));
    }
    
    // Navigate to the specific message and branch
    if (browser) {
      window.dispatchEvent(new CustomEvent('search:navigate-chat', {
        detail: {
          messageId: message.id,
          branchId: message.branch_id
        }
      }));
    }
    
    // Apply highlighting after a longer delay to allow navigation to complete
    // Also ensure we show navigation controls
    setTimeout(() => {
      applyHighlighting();
      // Force show navigation controls if we have highlights
      if (totalHighlights > 0) {
        showNavigationControls = true;
      }
    }, 800);
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
    // Check in left-to-right order: Facts -> Docs -> Chat -> Questions
    const orderedCategories = ['facts', 'docs', 'chatMessages', 'questions'];
    
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
    
    // Dispatch filtering events based on results
    const hasFactsResults = searchResults.facts.length > 0;
    const hasDocsResults = searchResults.docs.length > 0;
    const hasChatResults = searchResults.chatMessages.length > 0;
    const hasQuestionsResults = searchResults.questions.length > 0;
    
    // Activate appropriate tab and filter
    if (hasFactsResults) {
      dispatch('activate-tab', 'facts');
      dispatch('filter', { type: 'facts', query: searchTerm });
    } else if (hasDocsResults) {
      dispatch('activate-tab', 'docs');  
      dispatch('filter', { type: 'docs', query: searchTerm });
    }
    
    // Handle questions
    if (hasQuestionsResults) {
      dispatch('activate-tab', 'questions');
      dispatch('filter', { type: 'questions', query: searchTerm });
    }
    
    // Handle chat results
    if (hasChatResults) {
      const firstResult = searchResults.chatMessages[0];
      dispatch('navigate-chat', { messageId: firstResult.id, branchId: firstResult.branch_id });
    }
    
    // Apply highlighting immediately for Enter key
    applyHighlighting();
  }
  
  // Apply container-based highlighting throughout the page including all sessions
  async function applyHighlighting() {
    if (!browser || !highlightedTerm) return;
    
    // Remove existing highlights
    removeHighlights();
    
    // First, highlight what's currently visible
    await highlightCurrentContent();
    
    // Then, calculate total highlights across all sessions that have search results
    await calculateCrossSessionHighlights();
    
    showNavigationControls = totalHighlights > 0;
    
    // Scroll to first highlight in current view
    scrollToFirstHighlight();
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
    
    // Filter containers to only highlight the most immediate ones (remove nested highlighting)
    const immediateContainers = highlightedContainers.filter(container => {
      // Check if this container is nested inside another container in our list
      return !highlightedContainers.some(otherContainer => {
        return otherContainer !== container && otherContainer.contains(container);
      });
    });
    
    // Apply container highlighting only to immediate containers, but word highlighting to all
    immediateContainers.forEach(container => {
      container.classList.add('search-highlight-container');
    });
    
    // Apply word highlighting to all containers (even nested ones)
    highlightedContainers.forEach(container => {
      highlightTextInElement(container, highlightedTerm);
    });
  }
  
  // Calculate total highlights across all sessions with search results
  async function calculateCrossSessionHighlights() {
    // Get actual visible highlights first
    const wordHighlights = document.querySelectorAll('.search-highlight');
    const visibleHighlightsCount = wordHighlights.length;
    
    // Calculate theoretical highlights from search results data
    let theoreticalHighlights = 0;
    
    // Count highlights in facts
    if (searchResults.facts && searchResults.facts.length > 0) {
      searchResults.facts.forEach(fact => {
        const keyMatches = countMatchesInText(fact.key, highlightedTerm);
        const valueMatches = countMatchesInText(fact.value, highlightedTerm);
        theoreticalHighlights += keyMatches + valueMatches;
      });
    }
    
    // Count highlights in docs
    if (searchResults.docs && searchResults.docs.length > 0) {
      searchResults.docs.forEach(doc => {
        const titleMatches = countMatchesInText(doc.title, highlightedTerm);
        const contentMatches = countMatchesInText(doc.content || '', highlightedTerm);
        theoreticalHighlights += titleMatches + contentMatches;
      });
    }
    
    // Count highlights in questions
    if (searchResults.questions && searchResults.questions.length > 0) {
      searchResults.questions.forEach(question => {
        const questionMatches = countMatchesInText(question.question, highlightedTerm);
        theoreticalHighlights += questionMatches;
      });
    }
    
    // Count highlights in all chat messages across all sessions
    if (searchResults.chatMessages && searchResults.chatMessages.length > 0) {
      searchResults.chatMessages.forEach(message => {
        const messageMatches = countMatchesInText(message.content, highlightedTerm);
        theoreticalHighlights += messageMatches;
      });
    }
    
    // Debug logging to help troubleshoot
    console.log('🔍 Highlight count comparison:', {
      searchTerm: highlightedTerm,
      visibleHighlightsCount,
      theoreticalHighlights,
      difference: theoreticalHighlights - visibleHighlightsCount,
      willUseVisible: visibleHighlightsCount > 0
    });
    
    // Use visible highlights count if we have highlights, otherwise fall back to theoretical
    if (visibleHighlightsCount > 0) {
      totalHighlights = visibleHighlightsCount;
      console.log('✅ Using visible highlights count:', totalHighlights);
    } else if (theoreticalHighlights > 0) {
      totalHighlights = theoreticalHighlights;
      console.log('✅ Using theoretical highlights count:', totalHighlights);
    } else {
      totalHighlights = 0;
      console.log('📍 No highlights found');
    }
    
    // Set current index
    await calculateCurrentHighlightIndex();
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
    
    console.log('🎯 Setting initial highlight index to 0 (first highlight)');
  }
  
  // Get current session ID from the actual app state, not search results
  function getCurrentSessionId() {
    // Method 1: Try to get from URL if it contains session info
    if (browser) {
      const url = window.location.href;
      const sessionMatch = url.match(/session[\/_-]([a-f0-9-]+)/i);
      if (sessionMatch) {
        console.log('📍 Current session from URL:', sessionMatch[1]);
        return sessionMatch[1];
      }
    }
    
    // Method 2: Try to find session info in DOM
    if (browser) {
      // Look for session info in data attributes or similar
      const sessionElement = document.querySelector('[data-session-id]');
      if (sessionElement) {
        const sessionId = sessionElement.getAttribute('data-session-id');
        console.log('📍 Current session from DOM:', sessionId);
        return sessionId;
      }
    }
    
    // Method 3: Fallback to search results (original logic)
    const activeSession = searchResults.sessionGroups?.find(s => s.is_active);
    const fallbackId = activeSession?.session_id || searchResults.sessionGroups?.[0]?.session_id;
    
    console.log('📍 Current session fallback (from search results):', fallbackId);
    return fallbackId;
  }
  
  // Check if current session has any search results
  async function checkCurrentSessionHasResults() {
    if (!searchResults.sessionGroups || searchResults.sessionGroups.length === 0) {
      console.log('🔍 No session groups found');
      return false;
    }
    
    const currentSessionId = getCurrentSessionId();
    const currentSession = searchResults.sessionGroups.find(s => s.session_id === currentSessionId);
    
    console.log('🔍 Session detection debug:', {
      currentSessionId,
      allSessions: searchResults.sessionGroups.map(s => ({ id: s.session_id, name: s.session_name, is_active: s.is_active })),
      foundCurrentSession: !!currentSession
    });
    
    if (!currentSession) {
      console.log('🔍 Current session not found in search results');
      return false;
    }
    
    // Check if current session has any chat message results
    const currentSessionMessages = searchResults.chatMessages?.filter(m => m.session_id === currentSessionId) || [];
    
    // Also check if we have any facts, docs, or questions (these are always visible)
    const hasNonSessionResults = (searchResults.facts?.length || 0) + (searchResults.docs?.length || 0) + (searchResults.questions?.length || 0) > 0;
    
    const hasCurrentSessionResults = currentSessionMessages.length > 0 || hasNonSessionResults;
    
    console.log('🔍 Current session results check:', {
      currentSessionId,
      currentSessionName: currentSession.session_name,
      currentSessionMessages: currentSessionMessages.length,
      hasNonSessionResults,
      hasCurrentSessionResults,
      allChatMessages: searchResults.chatMessages?.map(m => ({ id: m.session_id, name: m.session_name })) || []
    });
    
    return hasCurrentSessionResults;
  }
  
  // Scroll to first highlight in current view
  function scrollToFirstHighlight() {
    const highlightedContainers = document.querySelectorAll('.search-highlight-container');
    
    if (highlightedContainers.length > 0) {
      // Find the first highlight in a visible panel
      let firstVisibleHighlight = null;
      
      // Check left panel first (facts/docs)
      const leftPanel = document.querySelector('.mobile-sidebar');
      if (leftPanel && !leftPanel.classList.contains('w-0')) {
        const leftHighlights = leftPanel.querySelectorAll('.search-highlight-container');
        if (leftHighlights.length > 0) {
          firstVisibleHighlight = leftHighlights[0];
        }
      }
      
      // If no highlight in left panel, check right panel (ideas/questions)
      if (!firstVisibleHighlight) {
        const rightPanel = document.querySelector('.mobile-ideas-column');
        if (rightPanel && !rightPanel.classList.contains('w-0')) {
          const rightHighlights = rightPanel.querySelectorAll('.search-highlight-container');
          if (rightHighlights.length > 0) {
            firstVisibleHighlight = rightHighlights[0];
          }
        }
      }
      
      // If no highlight in panels, check chat
      if (!firstVisibleHighlight) {
        const chatArea = document.querySelector('.mobile-chat, .searchable-chat-area');
        if (chatArea) {
          const chatHighlights = chatArea.querySelectorAll('.search-highlight-container');
          if (chatHighlights.length > 0) {
            firstVisibleHighlight = chatHighlights[0];
          }
        }
      }
      
      // Fallback to first highlight found anywhere
      if (!firstVisibleHighlight) {
        firstVisibleHighlight = highlightedContainers[0];
      }
      
      if (firstVisibleHighlight) {
        firstVisibleHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstVisibleHighlight.classList.add('current');
      }
    }
  }
  
  // Recursively highlight text in element
  function highlightTextInElement(element, searchTerm) {
    if (!element || !searchTerm) return;
    
    // Skip script, style, and already highlighted elements
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE' || 
        element.classList?.contains('search-highlight')) {
      return;
    }
    
    // Process text nodes
    if (element.nodeType === Node.TEXT_NODE) {
      const text = element.textContent;
      const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
      if (regex.test(text)) {
        const highlightedText = text.replace(regex, '<span class="search-highlight">$1</span>');
        const wrapper = document.createElement('div');
        wrapper.innerHTML = highlightedText;
        
        // Replace the text node with highlighted content
        const fragment = document.createDocumentFragment();
        while (wrapper.firstChild) {
          fragment.appendChild(wrapper.firstChild);
        }
        element.parentNode?.replaceChild(fragment, element);
      }
    } else {
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
    
    // Remove text highlights
    const highlights = document.querySelectorAll('.search-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
      parent.normalize();
    });
    
    // Remove container highlights
    const containerHighlights = document.querySelectorAll('.search-highlight-container');
    containerHighlights.forEach(container => {
      container.classList.remove('search-highlight-container', 'current');
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
      
      console.log('🔍 Next highlight navigation:', {
        currentIndex: currentHighlightIndex,
        nextIndex,
        totalHighlights,
        currentSessionId: getCurrentSessionId()
      });
      
      // First, try to find if this highlight exists in current visible content
      const targetHighlight = findHighlightAtIndex(nextIndex);
      
      if (targetHighlight) {
        // Highlight exists in current visible content - navigate directly
        console.log('✅ Found target highlight in current view');
        currentHighlightIndex = nextIndex;
        navigateToCurrentHighlight();
        return;
      }
      
      // Target highlight not in current view - check if we need session switch
      const needsSessionSwitch = await shouldSwitchSessionForIndex(nextIndex);
      console.log('🔄 Session switch check:', { needsSessionSwitch });
      
      if (needsSessionSwitch) {
        const targetSession = await getSessionForHighlightIndex(nextIndex);
        console.log('🎯 Target session:', {
          sessionId: targetSession?.session_id,
          sessionName: targetSession?.session_name
        });
        
        if (targetSession) {
          // Switch to the target session first
          if (browser) {
            console.log('📡 Dispatching session switch event');
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
    
    // Skip facts, docs, and questions (they don't belong to specific sessions)
    searchResults.facts.forEach(fact => {
      const keyMatches = countMatchesInText(fact.key, highlightedTerm);
      const valueMatches = countMatchesInText(fact.value, highlightedTerm);
      runningIndex += keyMatches + valueMatches;
    });
    
    searchResults.docs.forEach(doc => {
      const titleMatches = countMatchesInText(doc.title, highlightedTerm);
      const contentMatches = countMatchesInText(doc.content || '', highlightedTerm);
      runningIndex += titleMatches + contentMatches;
    });
    
    searchResults.questions.forEach(question => {
      const questionMatches = countMatchesInText(question.question, highlightedTerm);
      runningIndex += questionMatches;
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
    const containerHighlights = document.querySelectorAll('.search-highlight-container');
    
    // Remove current class from all highlights
    wordHighlights.forEach(h => h.classList.remove('current'));
    containerHighlights.forEach(h => h.classList.remove('current'));
    
    console.log('🎯 Navigating to current highlight:', {
      currentHighlightIndex,
      totalWordHighlights: wordHighlights.length,
      totalContainerHighlights: containerHighlights.length
    });
    
    // Try to find the specific highlight based on our index
    const targetHighlight = findHighlightAtIndex(currentHighlightIndex);
    
    if (targetHighlight) {
      targetHighlight.classList.add('current');
      
      console.log('📍 Scrolling to specific highlight:', {
        element: targetHighlight.tagName,
        text: targetHighlight.textContent?.substring(0, 50),
        index: currentHighlightIndex
      });
      
      // Scroll to the specific highlight
      targetHighlight.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      flashCurrentHighlight(targetHighlight);
      
      // Also highlight the container that contains this word
      const parentContainer = targetHighlight.closest('.search-highlight-container');
      if (parentContainer) {
        parentContainer.classList.add('current');
      }
    } else if (wordHighlights.length > 0) {
      // Fallback: navigate to first visible highlight
      console.log('⚠️ Fallback to first visible highlight');
      const firstVisibleHighlight = wordHighlights[0];
      firstVisibleHighlight.classList.add('current');
      firstVisibleHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
      flashCurrentHighlight(firstVisibleHighlight);
      
      const parentContainer = firstVisibleHighlight.closest('.search-highlight-container');
      if (parentContainer) {
        parentContainer.classList.add('current');
      }
    }
  }
  
  // Find the specific highlight element at the given index within visible content
  function findHighlightAtIndex(targetIndex) {
    // Get all word highlights in document order
    const allWordHighlights = document.querySelectorAll('.search-highlight');
    
    console.log('🔍 Finding highlight at index:', {
      targetIndex,
      totalVisible: allWordHighlights.length
    });
    
    // Simple approach: if we're not dealing with cross-session navigation,
    // just use the visible highlights directly
    if (!searchResults.sessionGroups || searchResults.sessionGroups.length === 0) {
      return allWordHighlights[targetIndex] || null;
    }
    
    // For cross-session navigation, we need to map the global index to visible content
    const currentSessionId = getCurrentSessionId();
    
    // Calculate how many highlights come from each category in the global count
    let globalRunningIndex = 0;
    
    // Count highlights in facts (always visible)
    let factsHighlights = 0;
    if (searchResults.facts && searchResults.facts.length > 0) {
      searchResults.facts.forEach(fact => {
        const keyMatches = countMatchesInText(fact.key, highlightedTerm);
        const valueMatches = countMatchesInText(fact.value, highlightedTerm);
        factsHighlights += keyMatches + valueMatches;
      });
    }
    
    // Count highlights in docs (always visible)
    let docsHighlights = 0;
    if (searchResults.docs && searchResults.docs.length > 0) {
      searchResults.docs.forEach(doc => {
        const titleMatches = countMatchesInText(doc.title, highlightedTerm);
        const contentMatches = countMatchesInText(doc.content || '', highlightedTerm);
        docsHighlights += titleMatches + contentMatches;
      });
    }
    
    // Count highlights in questions (always visible)
    let questionsHighlights = 0;
    if (searchResults.questions && searchResults.questions.length > 0) {
      searchResults.questions.forEach(question => {
        const questionMatches = countMatchesInText(question.question, highlightedTerm);
        questionsHighlights += questionMatches;
      });
    }
    
    const nonSessionHighlights = factsHighlights + docsHighlights + questionsHighlights;
    globalRunningIndex = nonSessionHighlights;
    
    console.log('🧮 Highlight distribution analysis:', {
      factsHighlights,
      docsHighlights,
      questionsHighlights,
      nonSessionHighlights,
      targetIndex,
      currentSessionId
    });
    
    // If the target index is within non-session content (facts, docs, questions),
    // it maps directly to visible highlights
    if (targetIndex < nonSessionHighlights) {
      console.log('📝 Target is in non-session content, using direct index:', targetIndex);
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
          
          console.log('💬 Target is in current session:', {
            sessionId: currentSessionId,
            sessionName: sessionGroup.session_name,
            globalIndex: targetIndex,
            indexWithinSession,
            visibleIndex,
            totalVisibleHighlights: allWordHighlights.length
          });
          
          return allWordHighlights[visibleIndex] || null;
        } else {
          // Target is in a different session - return null to trigger session switch
          console.log('🔄 Target is in different session:', {
            targetSessionId: sessionGroup.session_id,
            targetSessionName: sessionGroup.session_name,
            currentSessionId,
            needsSessionSwitch: true
          });
          return null;
        }
      }
      
      globalRunningIndex += sessionHighlights;
    }
    
    console.log('⚠️ Could not find target highlight, using fallback');
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
        }
      }
    }, 100);
  }
  
  function handleInputClick() {
    dropdownDisabled = false; // Re-enable dropdown when user clicks box
    if (searchTerm.length >= 3 && hasResults()) {
      showDropdown = true; // Show dropdown if we have results
    }
  }
  
  // Handle counter click to close dropdown
  function handleCounterClick() {
    showDropdown = false;
    dropdownDisabled = true;
  }
  
  // Handle clicking outside to close dropdown
  function handleClickOutside(event) {
    if (!browser || !searchContainer) return;
    if (!searchContainer.contains(event.target)) {
      showDropdown = false;
    }
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
    }
  });
  
  onDestroy(() => {
    if (browser) {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      removeHighlights();
      
      // Clear any pending highlight timeout
      if (highlightTimeout) {
        clearTimeout(highlightTimeout);
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
    // Close dropdown and prevent it from reopening
    showDropdown = false;
    dropdownDisabled = true;
    
    if (sessionNavigationMode && sessionsWithResults.length > 1) {
      nextSession();
    } else {
      nextHighlight();
    }
  }
  
  function enhancedPrev() {
    // Close dropdown and prevent it from reopening
    showDropdown = false;
    dropdownDisabled = true;
    
    if (sessionNavigationMode && sessionsWithResults.length > 1) {
      prevSession();
    } else {
      prevHighlight();
    }
  }
  
  // Reactive statement to handle search input changes
  $: if (searchTerm !== undefined) {
    handleSearchInput();
  }
</script>

<div class="relative w-full max-w-md" bind:this={searchContainer}>
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
      
      <!-- Navigation Controls with Highlighted Counter -->
      {#if showNavigationControls && totalHighlights > 0}
        <div class="mr-3 flex items-center gap-1 text-xs bg-gray-100 dark:bg-gray-700 rounded px-2 py-1">
          <button
            on:click={enhancedPrev}
            class="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors rounded"
            disabled={totalHighlights === 0 && (!sessionNavigationMode || sessionsWithResults.length === 0)}
            title={sessionNavigationMode ? 'Previous session with results' : 'Previous highlight'}
          >
            <ChevronLeft class="h-3 w-3" />
          </button>
          
          <!-- Counter button with session info when applicable -->
          {#if sessionNavigationMode && sessionsWithResults.length > 1}
            <button
              on:click={toggleNavigationMode}
              class="px-2 py-1 bg-blue-500 text-white font-mono text-xs rounded font-medium shadow-sm hover:bg-blue-600 transition-colors cursor-pointer"
              title="Toggle to highlight navigation • Click to switch modes"
            >
              {currentSessionIndex + 1}/{sessionsWithResults.length} sessions
            </button>
          {:else}
            <button
              on:click={sessionNavigationMode ? toggleNavigationMode : handleCounterClick}
              class="px-2 py-1 {sessionNavigationMode ? 'bg-blue-500 hover:bg-blue-600' : 'bg-pink-500 hover:bg-pink-600'} text-white font-mono text-xs rounded font-medium shadow-sm transition-colors cursor-pointer"
              title={sessionNavigationMode ? 'Toggle to highlight navigation' : 'Close search dropdown'}
            >
              {#if sessionNavigationMode && sessionsWithResults.length === 1}
                1/1 session
              {:else}
                {currentHighlightIndex + 1}/{totalHighlights}
              {/if}
            </button>
          {/if}
          
          <button
            on:click={enhancedNext}
            class="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors rounded"
            disabled={totalHighlights === 0 && (!sessionNavigationMode || sessionsWithResults.length === 0)}
            title={sessionNavigationMode ? 'Next session with results' : 'Next highlight'}
          >
            <ChevronRight class="h-3 w-3" />
          </button>
          
          <!-- Session mode toggle button (only show when multiple sessions exist) -->
          {#if sessionsWithResults.length > 1}
            <div class="ml-1 pl-1 border-l border-gray-300 dark:border-gray-500">
              <button
                on:click={toggleNavigationMode}
                class="p-1 text-xs {sessionNavigationMode ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} hover:text-gray-700 dark:hover:text-gray-200 transition-colors rounded"
                title={sessionNavigationMode ? 'Switch to highlight navigation' : 'Switch to session navigation'}
              >
                {sessionNavigationMode ? 'S' : 'H'}
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Search Results Dropdown -->
  {#if showDropdown && hasResults()}
    <div class="absolute z-50 w-full mt-1 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto" style="background-color: var(--bg-modal);">
      <!-- Facts Results (Left Column) -->
      {#if searchResults.facts.length > 0}
        <div class="p-3 border-b border-gray-100 dark:border-gray-700">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Facts</h4>
          {#each searchResults.facts.slice(0, 5) as fact}
            <button
              on:click={() => selectResult(fact, 'facts')}
              class="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors block"
            >
              <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{fact.key}</div>
              <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{fact.value}</div>
            </button>
          {/each}
        </div>
      {/if}
      
      <!-- Docs Results (Left Column) -->
      {#if searchResults.docs.length > 0}
        <div class="p-3 border-b border-gray-100 dark:border-gray-700">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Documents</h4>
          {#each searchResults.docs.slice(0, 5) as doc}
            <button
              on:click={() => selectResult(doc, 'docs')}
              class="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors block"
            >
              <div class="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">{doc.title}</div>
              {#if doc.content}
                <div class="text-xs text-gray-600 dark:text-gray-400 truncate">{doc.content.substring(0, 80)}...</div>
              {/if}
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
            {#each searchResults.sessionGroups.slice(0, 3) as sessionGroup}
              <div class="mb-3 last:mb-0">
                <div class="flex items-center gap-2 mb-1">
                  <div class="h-2 w-2 rounded-full {sessionGroup.is_active ? 'bg-green-500' : 'bg-gray-400'}"></div>
                  <span class="text-xs font-medium text-gray-700 dark:text-gray-300">{sessionGroup.session_name}</span>
                  <span class="text-xs text-gray-500 dark:text-gray-400">({sessionGroup.message_count} {sessionGroup.message_count === 1 ? 'message' : 'messages'})</span>
                </div>
                {#each sessionGroup.messages.slice(0, 2) as message}
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
      
      <!-- Questions Results (Right Column) -->
      {#if searchResults.questions.length > 0}
        <div class="p-3">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Questions</h4>
          {#each searchResults.questions.slice(0, 5) as question}
            <button
              on:click={() => selectResult(question, 'questions')}
              class="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors block"
            >
              <div class="text-sm text-gray-900 dark:text-gray-100">{question.question}</div>
            </button>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Search highlighting styles for individual words */
  :global(.search-highlight) {
    background-color: #db2777;
    color: white;
    padding: 1px 2px;
    border-radius: 2px;
  }
  
  :global(.search-highlight.current) {
    background-color: #be185d;
    box-shadow: 0 0 0 1px #be185d;
  }
  
  /* Container highlighting styles */
  :global(.search-highlight-container) {
    background-color: rgba(219, 39, 119, 0.1);
    border: 1px solid rgba(219, 39, 119, 0.3);
    border-radius: 4px;
    transition: all 0.2s ease-in-out;
  }
  
  :global(.search-highlight-container.current) {
    background-color: rgba(190, 24, 93, 0.15);
    border-color: rgba(190, 24, 93, 0.5);
    box-shadow: 0 0 0 2px rgba(190, 24, 93, 0.2);
  }
  
  /* Dark mode container highlighting with increased opacity */
  :global(.dark .search-highlight-container) {
    background-color: rgba(219, 39, 119, 0.7);
    border: 1px solid rgba(219, 39, 119, 0.8);
  }
  
  :global(.dark .search-highlight-container.current) {
    background-color: rgba(190, 24, 93, 0.7);
    border-color: rgba(190, 24, 93, 0.8);
    box-shadow: 0 0 0 2px rgba(190, 24, 93, 0.8);
  }
  
  /* Flashing animation for current highlight containers */
  :global(.search-highlight-container.flash-highlight) {
    animation: flash-container 1s ease-in-out;
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
</style>
