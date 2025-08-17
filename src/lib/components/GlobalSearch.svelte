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
    relatedIdeas: []
  };
  
  // Search highlighting
  let highlightedTerm = '';
  let currentHighlightIndex = 0;
  let totalHighlights = 0;
  let showNavigationControls = false;
  
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
      searchResults = { facts: [], docs: [], chatMessages: [], questions: [], relatedIdeas: [] };
      if (!dropdownDisabled) {
        showDropdown = false;
      }
      if (searchTerm.length < 1) {
        removeHighlights();
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
        searchResults = data.results || { facts: [], docs: [], chatMessages: [], questions: [], relatedIdeas: [] };
        showDropdown = !dropdownDisabled && hasResults();
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
    let text = '';
    if (type === 'facts') text = result.key;
    else if (type === 'docs') text = result.title;
    else if (type === 'chatMessages') text = result.content.substring(0, 50) + '...';
    else if (type === 'questions') text = result.question;
    
    // Close dropdown immediately and disable it
    showDropdown = false;
    dropdownDisabled = true;
    
    // Update search term (this will trigger reactive statement, but dropdown is disabled)
    searchTerm = text;
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
  
  // Apply container-based highlighting throughout the page
  function applyHighlighting() {
    if (!browser || !highlightedTerm) return;
    
    // Remove existing highlights
    removeHighlights();
    
    // Find containers that match the search term in specific content areas
    const contentAreas = [
      document.querySelector('.mobile-sidebar'),      // Left sidebar
      document.querySelector('.mobile-chat')          // Chat area
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
    
    // Count individual word highlights, not containers
    const wordHighlights = document.querySelectorAll('.search-highlight');
    totalHighlights = wordHighlights.length;
    currentHighlightIndex = 0;
    showNavigationControls = totalHighlights > 0;
    
    // Scroll to first highlight if any - prioritize visible content areas
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
        const chatArea = document.querySelector('.mobile-chat');
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
        
        // Find the index of the first word highlight in this container to set proper counter
        const wordHighlights = document.querySelectorAll('.search-highlight');
        const firstWordInContainer = firstVisibleHighlight.querySelector('.search-highlight');
        if (firstWordInContainer) {
          currentHighlightIndex = Array.from(wordHighlights).indexOf(firstWordInContainer);
        } else {
          currentHighlightIndex = 0;
        }
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
  
  // Navigate to next highlight
  function nextHighlight() {
    // Close dropdown and prevent it from reopening
    showDropdown = false;
    dropdownDisabled = true;
    
    if (totalHighlights > 0) {
      const wordHighlights = document.querySelectorAll('.search-highlight');
      const containerHighlights = document.querySelectorAll('.search-highlight-container');
      
      // Remove current class from all highlights
      wordHighlights.forEach(h => h.classList.remove('current'));
      containerHighlights.forEach(h => h.classList.remove('current'));
      
      // Move to next highlight
      currentHighlightIndex = (currentHighlightIndex + 1) % totalHighlights;
      
      // Add current class to word highlight and scroll to it
      if (wordHighlights[currentHighlightIndex]) {
        const currentWordHighlight = wordHighlights[currentHighlightIndex];
        currentWordHighlight.classList.add('current');
        currentWordHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashCurrentHighlight(currentWordHighlight);
        
        // Also highlight the container that contains this word
        const parentContainer = currentWordHighlight.closest('.search-highlight-container');
        if (parentContainer) {
          parentContainer.classList.add('current');
        }
      }
    }
  }
  
  // Navigate to previous highlight
  function prevHighlight() {
    // Close dropdown and prevent it from reopening
    showDropdown = false;
    dropdownDisabled = true;
    
    if (totalHighlights > 0) {
      const wordHighlights = document.querySelectorAll('.search-highlight');
      const containerHighlights = document.querySelectorAll('.search-highlight-container');
      
      // Remove current class from all highlights
      wordHighlights.forEach(h => h.classList.remove('current'));
      containerHighlights.forEach(h => h.classList.remove('current'));
      
      // Move to previous highlight
      currentHighlightIndex = currentHighlightIndex > 0 ? currentHighlightIndex - 1 : totalHighlights - 1;
      
      // Add current class to word highlight and scroll to it
      if (wordHighlights[currentHighlightIndex]) {
        const currentWordHighlight = wordHighlights[currentHighlightIndex];
        currentWordHighlight.classList.add('current');
        currentWordHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
        flashCurrentHighlight(currentWordHighlight);
        
        // Also highlight the container that contains this word
        const parentContainer = currentWordHighlight.closest('.search-highlight-container');
        if (parentContainer) {
          parentContainer.classList.add('current');
        }
      }
    }
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
  
  // Handle input focus and click to re-enable dropdown
  function handleInputFocus() {
    // Only re-enable dropdown if user manually focused (not programmatically)
    // Add a small delay to avoid interfering with selectResult
    setTimeout(() => {
      if (document.activeElement === searchInput) {
        dropdownDisabled = false; // Re-enable dropdown when user focuses input
        if (searchTerm.length >= 3 && hasResults()) {
          showDropdown = true; // Show dropdown if we have results
        }
      }
    }, 100);
  }
  
  function handleInputClick() {
    dropdownDisabled = false; // Re-enable dropdown when user clicks input
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
  
  // Reactive statement to handle search input changes
  $: if (searchTerm !== undefined) {
    handleSearchInput();
  }
</script>

<div class="relative w-full max-w-md" bind:this={searchContainer}>
  <!-- Search Input -->
  <div class="relative">
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <Search class="h-4 w-4 text-gray-400" />
    </div>
    <input
      bind:this={searchInput}
      bind:value={searchTerm}
      on:focus={handleInputFocus}
      on:click={handleInputClick}
      type="text"
      class="block w-full pl-10 pr-12 py-2 border rounded-lg text-sm text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
      style="background-color: #35353D !important; border-color: #4a4a52 !important;"
      placeholder="Search facts, docs, chat messages..."
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
            on:click={prevHighlight}
            class="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors rounded"
            disabled={totalHighlights === 0}
            title="Previous highlight"
          >
            <ChevronLeft class="h-3 w-3" />
          </button>
          <button
            on:click={handleCounterClick}
            class="px-2 py-1 bg-pink-500 text-white font-mono text-xs rounded font-medium shadow-sm hover:bg-pink-600 transition-colors cursor-pointer"
            title="Close search dropdown"
          >
            {currentHighlightIndex + 1}/{totalHighlights}
          </button>
          <button
            on:click={nextHighlight}
            class="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors rounded"
            disabled={totalHighlights === 0}
            title="Next highlight"
          >
            <ChevronRight class="h-3 w-3" />
          </button>
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
      
      <!-- Chat Messages Results (Middle Column) -->
      {#if searchResults.chatMessages.length > 0}
        <div class="p-3 border-b border-gray-100 dark:border-gray-700">
          <h4 class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Chat Messages</h4>
          {#each searchResults.chatMessages.slice(0, 5) as message}
            <button
              on:click={() => selectResult(message, 'chatMessages')}
              class="w-full text-left p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors block"
            >
              <div class="text-sm text-gray-900 dark:text-gray-100 truncate">{message.content.substring(0, 60)}...</div>
              <div class="text-xs text-gray-500 dark:text-gray-400">in {message.branch_name || 'Main'}</div>
            </button>
          {/each}
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
