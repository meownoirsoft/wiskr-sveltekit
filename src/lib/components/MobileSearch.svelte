<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Search, X, ArrowRight } from 'lucide-svelte';
  
  export let isVisible = false;
  export let projectId = null;
  export let onClosePanel = null;
  export let onCloseAllPanels = null;
  export let onOpenPanel = null;
  export let onScrollToResult = null;
  
  const dispatch = createEventDispatcher();
  
  let searchInput = '';
  let searchResults = [];
  let isSearching = false;
  let searchInputElement;
  let showResults = false;
  let preventAutoSearch = false; // Flag to prevent auto-search after result click
  let lastSearchTerm = ''; // Track the last search term to prevent duplicate searches
  
  // Auto-focus input when panel opens
  $: if (isVisible && searchInputElement) {
    setTimeout(() => searchInputElement.focus(), 100);
  }
  
  // Auto-search as user types (with debouncing)
  let searchTimeout;
  $: if (searchInput && searchInput.length >= 2 && !preventAutoSearch) {
    // Only search if the term has actually changed
    if (searchInput.trim() !== lastSearchTerm) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch();
        lastSearchTerm = searchInput.trim();
      }, 800); // Wait 800ms after user stops typing
    }
  } else if (searchInput.length < 2) {
    // Only clear results if we don't have existing results to restore
    if (searchResults.length === 0) {
      showResults = false;
      lastSearchTerm = '';
    }
    // Don't clear searchResults array - keep it for restoration
  }
  
  // Reopen keyboard when user starts typing again (if they want to modify search)
  $: if (searchInput && searchInput.length > 0 && showResults && searchInputElement) {
    // Small delay to ensure the input is focused properly
    setTimeout(() => {
      if (searchInputElement && document.activeElement !== searchInputElement) {
        searchInputElement.focus();
      }
    }, 100);
  }
   
   
  
  async function performSearch() {
    if (!searchInput.trim() || isSearching) return;
    
    isSearching = true;
    lastSearchTerm = searchInput.trim(); // Update last search term
    
    try {
      // Search across all content types in the current project
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchInput.trim(),
          projectId: projectId,
          includeTypes: ['facts', 'docs', 'chats', 'questions', 'ideas']
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Convert structured results to flat array for mobile display
        const structuredResults = data.results || {};
        const flatResults = [];
        
        // Add facts results
        if (structuredResults.facts) {
          flatResults.push(...structuredResults.facts);
        }
        
        // Add docs results
        if (structuredResults.docs) {
          flatResults.push(...structuredResults.docs);
        }
        
        // Add chat messages results
        if (structuredResults.chatMessages) {
          flatResults.push(...structuredResults.chatMessages);
        }
        
        // Add questions results
        if (structuredResults.questions) {
          flatResults.push(...structuredResults.questions);
        }
        
        // Add ideas results
        if (structuredResults.relatedIdeas) {
          flatResults.push(...structuredResults.relatedIdeas);
        }
        
        searchResults = flatResults;
        showResults = true;
        
        // Close mobile keyboard when results are displayed to give more screen space
        if (searchInputElement) {
          searchInputElement.blur();
        }
      } else if (res.status === 429) {
        // Rate limit exceeded
        console.warn('Search rate limited, please wait a moment');
        // Don't clear results, just show a message
        if (searchResults.length === 0) {
          searchResults = [{ 
            type: 'error', 
            title: 'Rate Limited', 
            content: 'Please wait a moment before searching again' 
          }];
        }
        showResults = true;
      } else {
        console.error('Search failed:', res.status);
        searchResults = [];
        showResults = false;
      }
    } catch (error) {
      console.error('Search error:', error);
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }
  
  function handleSearch() {
    // PRIORITY 1: If we have results but they're hidden, show them again (GO button behavior)
    if (searchResults.length > 0 && !showResults) {
      showResults = true;
      // Close keyboard when showing existing results
      if (searchInputElement) {
        searchInputElement.blur();
      }
      return;
    }
    
    // PRIORITY 2: If the search term is the same as last time, just show the results again
    if (searchInput.trim() === lastSearchTerm && searchResults.length > 0) {
      showResults = true;
      // Close keyboard when showing existing results
      if (searchInputElement) {
        searchInputElement.blur();
      }
      return;
    }
    
    // Otherwise, perform a new search
    performSearch();
  }
  
  function handleKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSearch();
    }
  }
  
  function clearSearch() {
    searchInput = '';
    searchResults = [];
    showResults = false;
    lastSearchTerm = ''; // Clear last search term
    // Clear search filtering when clearing input
    window.dispatchEvent(new CustomEvent('search:clear-filter'));
  }
  
  function closeSearch() {
    // Clear search input and results when closing
    searchInput = '';
    searchResults = [];
    showResults = false;
    lastSearchTerm = '';
    preventAutoSearch = false;
    
    // Clear search filtering when closing
    window.dispatchEvent(new CustomEvent('search:clear-filter'));
    
    // Dispatch event to restore full chat view
    window.dispatchEvent(new CustomEvent('search:restore-chat'));
    
    if (onClosePanel) onClosePanel();
  }
  
  function handleResultClick(result) {
    
    // Validate that we have the required IDs for chat results
    if (result.type === 'chats') {
      if (!result.sessionId) {
        console.error('❌ MobileSearch: Chat result missing sessionId:', result);
      }
      if (!result.branch_id) {
        console.error('❌ MobileSearch: Chat result missing branch_id:', result);
      }

    }
    
    // Close all panels first
    if (onCloseAllPanels) onCloseAllPanels();
    
    // Open the relevant panel based on result type
    if (onOpenPanel) onOpenPanel(result.type);
    
    // For chat results, we need to handle them differently
    if (result.type === 'chats') {
      // Switch to the appropriate session first (if needed)
      if (result.sessionId) {
        window.dispatchEvent(new CustomEvent('search:navigate-session', {
          detail: {
            sessionId: result.sessionId,
            sessionName: result.session_name || 'Unknown Session'
          }
        }));
      } else {
        console.warn('⚠️ MobileSearch: Skipping session navigation - no sessionId available');
      }
      
      // Then dispatch chat navigation event
      if (result.branch_id) {
        window.dispatchEvent(new CustomEvent('search:navigate-chat', {
          detail: {
            messageId: result.id,
            branchId: result.branch_id,
            firstMatchIndex: result.firstMatchIndex || null,
            searchTerm: searchInput.trim()
          }
        }));
      } else {
        console.warn('⚠️ MobileSearch: Skipping chat navigation - no branch_id available');
      }
      
      // Also dispatch a search filter event to set the search term for highlighting
      window.dispatchEvent(new CustomEvent('search:filter', {
        detail: {
          type: 'chats',
          query: searchInput.trim()
        }
      }));
      
      // Also dispatch the highlight event for chat messages
      window.dispatchEvent(new CustomEvent('search:highlight-result', { 
        detail: { 
          result,
          searchTerm: searchInput.trim()
        } 
      }));
      
      // Hide results list but keep search panel open for chat results
      // User can continue searching or click other results
      showResults = false;
      preventAutoSearch = true; // Prevent auto-search from overriding showResults
      
      // Re-enable auto-search after a short delay
      setTimeout(() => {
        preventAutoSearch = false;
      }, 1000);
    } else {
      // For other result types, scroll to the result with search term for highlighting
      if (onScrollToResult) onScrollToResult({ ...result, searchTerm: searchInput.trim() });
      
      // For questions and ideas, hide results but allow GO button to restore them
      if (result.type === 'questions' || result.type === 'ideas') {
        // Store the current search term before hiding results
        const currentSearchTerm = searchInput.trim();
        
        // Hide results list but keep search panel open
        showResults = false;
        preventAutoSearch = true; // Prevent auto-search from overriding showResults
        
        // Re-enable auto-search after a short delay
        setTimeout(() => {
          preventAutoSearch = false;
        }, 1000);
        return;
      }
      
      // Hide results list but keep search panel open for other result types
      // User can type to search again or click another result
      showResults = false;
      preventAutoSearch = true; // Prevent auto-search from overriding showResults
      
      // Re-enable auto-search after a short delay
      setTimeout(() => {
        preventAutoSearch = false;
      }, 1000);
    }
  }
  
  function getTypeLabel(type) {
    const labels = {
      'facts': 'Facts',
      'docs': 'Docs', 
      'chats': 'Chats',
      'questions': 'Questions',
      'ideas': 'Related Ideas',
      'error': 'Rate Limited'
    };
    return labels[type] || type;
  }
  
  function getTypeIcon(type) {
    // You can add icons here if desired
    return '';
  }
</script>

<!-- Mobile Search Panel -->
{#if isVisible}
  <div class="fixed top-16 left-0 right-0 z-[300] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg" style="background-color: var(--bg-header);">
    
    <!-- Search Controls Row -->
    <div class="flex items-center gap-3 p-4">
      <!-- Search Input with Clear X -->
      <div class="flex-1 relative">
        <input
          bind:this={searchInputElement}
          type="text"
          bind:value={searchInput}
          placeholder="Search project..."
          class="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          on:keydown={handleKeydown}
        />
        {#if searchInput}
          <button
            class="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            on:click={clearSearch}
            title="Clear search"
          >
            <X size="16" />
          </button>
        {/if}
      </div>
      
      <!-- Go Button -->
      <button
        class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        on:click={() => {
          handleSearch();
        }}
        disabled={isSearching || !searchInput.trim()}
        title="Search"
      >
        {#if isSearching}
          <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        {:else}
          Go
        {/if}
      </button>
      
      <!-- Panel Close X -->
      <button
        class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        on:click={closeSearch}
        title="Close search"
      >
        <X size="20" />
      </button>
    </div>
    
    <!-- Divider -->
    <div class="border-t border-gray-200 dark:border-gray-700"></div>
    
    <!-- Search Results -->
    {#if showResults && searchResults.length > 0}
      <div class="max-h-[80vh] overflow-y-auto">
        <div class="p-4 space-y-3">
          {#each searchResults as result}
            <div 
              class="p-3 border border-gray-200 dark:border-gray-600 rounded-lg {result.type === 'error' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'} transition-colors"
              on:click={() => {
                if (result.type === 'error') return; // Don't handle clicks for error messages
                handleResultClick(result);
              }}
            >
              <!-- Result Header -->
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-medium {result.type === 'error' ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'} uppercase tracking-wide">
                  {result.type === 'error' ? 'Rate Limited' : getTypeLabel(result.type)}
                  {#if result.type === 'chats' && result.instanceCount > 1}
                    <span class="ml-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                      {result.instanceCount} matches
                    </span>
                  {/if}
                </span>
                <ArrowRight size="16" class="text-gray-400" />
              </div>
              
              <!-- Result Title -->
              <div class="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                {result.title || result.name || 'Untitled'}
              </div>
              
              <!-- Result Snippet -->
              {#if result.snippet}
                <div class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                  {result.snippet}
                </div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {:else if showResults && searchResults.length === 0 && searchInput && !isSearching}
      <!-- No Results -->
      <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        No results found for "{searchInput}"
      </div>
    {:else if !searchInput}
      <!-- Search Prompt -->
      <div class="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
        Type to search your project (minimum 2 characters)
      </div>
    {/if}
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
