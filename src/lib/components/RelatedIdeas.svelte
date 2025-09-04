<!-- src/lib/components/RelatedIdeas.svelte -->
<script>
import { createEventDispatcher, onMount } from 'svelte';
import { 
  RefreshCw, Lightbulb, ChevronsLeft, HeartCrack, Heart,
  BookOpen, Users, Target, Zap, Settings, Palette, Code, 
  TrendingUp, MessageSquare, Search, Camera, Music, 
  ShoppingBag, Globe, Shield, Database, Brain, Info
} from 'lucide-svelte';
import InfoPopup from './InfoPopup.svelte';
import LoadingSpinner from './LoadingSpinner.svelte';
import ProBadge from './ProBadge.svelte';
import { marked } from 'marked';
import { browser } from '$app/environment';

  export let ideas = [];
  export let isGeneratingIdeas = false;
  export let projectId = null;
  export let searchTerm = ''; // Search term for filtering and highlighting
  export const user = null; // User object with tier info
  
  // Local reactive variable for template use
  let isGenerating = false;
  
  // Rate limiting state
  let rateLimit = { used: 0, limit: 5, remaining: 5, canGenerate: true };
  let isLoadingUsage = false;
  
  // Update local variable when prop changes
  $: isGenerating = isGeneratingIdeas;

  const dispatch = createEventDispatcher();
  
  // Idea feedback storage (localStorage)
  let dismissedIdeas = [];
  let likedIdeas = [];
  let storedIdeas = [];
  let visibleIdeas = [];
  let likedIdeasSet = new Set();
  
  // Load feedback and stored ideas from localStorage on mount (proper timing)
  onMount(() => {
    if (browser && projectId) {
      loadIdeaFeedback();
      loadStoredIdeas();
      loadUsageStatus();
      loadIdeasFromDatabase();
    }
  });
  
  // Also load when projectId changes
  $: if (browser && projectId) {
    loadIdeaFeedback();
    loadStoredIdeas();
    loadIdeasFromDatabase();
  }
  
  // Create reactive liked ideas set AFTER localStorage loads
  $: likedIdeasSet = new Set(likedIdeas);
  
  function loadIdeaFeedback() {
    try {
      const dismissed = localStorage.getItem(`dismissed_ideas_${projectId}`);
      const liked = localStorage.getItem(`liked_ideas_${projectId}`);
      dismissedIdeas = dismissed ? JSON.parse(dismissed) : [];
      likedIdeas = liked ? JSON.parse(liked) : [];
    } catch (error) {
      console.error('Error loading idea feedback:', error);
      dismissedIdeas = [];
      likedIdeas = [];
    }
  }
  
  function saveIdeaFeedback() {
    if (!browser || !projectId) return;
    try {
      localStorage.setItem(`dismissed_ideas_${projectId}`, JSON.stringify(dismissedIdeas));
      localStorage.setItem(`liked_ideas_${projectId}`, JSON.stringify(likedIdeas));
    } catch (error) {
      console.error('Error saving idea feedback:', error);
    }
  }
  
  function loadStoredIdeas() {
    if (!browser || !projectId) return;
    try {
      const stored = localStorage.getItem(`stored_ideas_${projectId}`);
      storedIdeas = stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading stored ideas:', error);
      storedIdeas = [];
    }
  }
  
  function saveStoredIdeas() {
    if (!browser || !projectId) return;
    try {
      localStorage.setItem(`stored_ideas_${projectId}`, JSON.stringify(storedIdeas));
    } catch (error) {
      console.error('Error saving stored ideas:', error);
    }
  }

  // Load ideas from database
  async function loadIdeasFromDatabase() {
    if (!browser || !projectId) return;
    
    try {
      const res = await fetch(`/api/ideas/load?projectId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.ideas) {
          // Convert database ideas to the format expected by the component
          const dbIdeas = data.ideas.map(idea => ({
            id: idea.id,
            text: idea.text || idea.title || idea.description,
            title: idea.title || idea.text || idea.description,
            description: idea.description || idea.text || idea.title,
            created_at: idea.created_at
          }));
          
          // Merge with localStorage ideas (database takes precedence)
          const mergedIdeas = [...dbIdeas];
          
          // Add localStorage ideas that aren't in database
          storedIdeas.forEach(localIdea => {
            if (!mergedIdeas.find(dbIdea => dbIdea.text === localIdea.text)) {
              mergedIdeas.push(localIdea);
            }
          });
          
          // Update the ideas array with merged results
          if (mergedIdeas.length > 0) {
            ideas = mergedIdeas;
          }
          
      
        }
      } else {
        console.error('Failed to load ideas from database:', res.status);
      }
    } catch (error) {
      console.error('Error loading ideas from database:', error);
    }
  }

  // Highlight function for search results - exported for parent component access
  export function highlightIdea(ideaId, searchTerm) {
    // Find the idea element and scroll to it
    const ideaElement = document.querySelector(`[data-idea-id="${ideaId}"]`);
    
    if (ideaElement) {
      ideaElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add highlight effect
      ideaElement.classList.add('search-highlight-container');
      
      // Highlight search terms within the text content
      if (searchTerm && searchTerm.trim()) {
        highlightSearchTerms(ideaElement, searchTerm);
      }
      
      // Remove highlight after a longer delay
      setTimeout(() => {
        ideaElement.classList.remove('search-highlight-container');
        // Remove text highlighting
        removeSearchTermHighlights(ideaElement);
      }, 10000); // Increased to 10 seconds
    } else {
      console.error(`🔍 RelatedIdeas: Could not find idea element with data-idea-id="${ideaId}"`);
    }
  }

  // Function to highlight search terms within text content
  function highlightSearchTerms(element, searchTerm) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      textNodes.push(node);
    }
    
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      if (text.toLowerCase().includes(searchTerm.toLowerCase())) {
        const highlightedText = text.replace(
          new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
          '<mark class="search-highlight px-1 rounded">$1</mark>'
        );
        
        if (highlightedText !== text) {
          const span = document.createElement('span');
          span.innerHTML = highlightedText;
          textNode.parentNode.replaceChild(span, textNode);
        }
      }
    });
  }

  // Function to remove search term highlights
  function removeSearchTermHighlights(element) {
    const marks = element.querySelectorAll('mark.search-highlight');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent.nodeType === Node.ELEMENT_NODE && parent.tagName === 'SPAN') {
        // Replace the span with just the text content
        parent.parentNode.replaceChild(document.createTextNode(parent.textContent), parent);
      }
    });
  }
  

  function insertIdea(idea) {
    // Remove number prefix (e.g., "1. ", "2) ", "3: ") before inserting
    let cleanText = idea;
    const numberPattern = /^\d+[.):\s]+(.*)$/s;
    const numberMatch = idea.match(numberPattern);
    if (numberMatch) {
      cleanText = numberMatch[1].trim();
    }
    
    dispatch('insert-text', { text: cleanText });
  }

  // Load current usage status
  async function loadUsageStatus() {
    if (!browser) return;
    
    try {
      isLoadingUsage = true;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch(`/api/ideas-usage?tz=${encodeURIComponent(tz)}`);
      if (response.ok) {
        const data = await response.json();
        rateLimit = data;
      }
    } catch (error) {
      console.error('Failed to load usage status:', error);
    } finally {
      isLoadingUsage = false;
    }
  }

  function generateIdeas() {
    // Check if user can generate more ideas
    if (!rateLimit.canGenerate) return;
    
    // Proper behavior: Keep liked ideas, clear dismissed (so AI can avoid them), recycle neutral
    // Only clear dismissed ideas - this allows them to be used to inform AI to avoid similar ideas
    dismissedIdeas = [];
    // Keep likedIdeas - they should persist
    // Keep only liked idea objects in storedIdeas, remove neutral ones for recycling
    const likedIdeaObjects = storedIdeas.filter(idea => likedIdeas.includes(idea.id));
    storedIdeas = likedIdeaObjects;
    
    saveIdeaFeedback();
    saveStoredIdeas();
    
    dispatch('generate-ideas');
  }
  
  function handleRefreshHover(e) {
    if (!isGenerating) {
      e.target.style.backgroundColor = 'var(--color-accent-hover)';
    }
  }
  
  function handleRefreshLeave(e) {
    e.target.style.backgroundColor = 'var(--color-accent)';
  }
  
  function dismissIdea(ideaId) {
    if (!dismissedIdeas.includes(ideaId)) {
      dismissedIdeas = [...dismissedIdeas, ideaId];
      saveIdeaFeedback();
      // Force reactivity by reassigning the array
      dismissedIdeas = [...dismissedIdeas];
    }
  }
  
  function toggleLikeIdea(ideaId) {
    if (likedIdeas.includes(ideaId)) {
      // Unlike the idea - remove it from liked ideas
      likedIdeas = likedIdeas.filter(likedId => likedId !== ideaId);
    } else {
      // Like the idea - add it to liked ideas
      likedIdeas = [...likedIdeas, ideaId];
    }
    
    // Force reactivity by reassigning the array
    likedIdeas = [...likedIdeas];
    saveIdeaFeedback();
  }
  
  function isIdeaDismissed(ideaOrId) {
    const id = typeof ideaOrId === 'object' ? ideaOrId.id : ideaOrId;
    return dismissedIdeas.includes(id);
  }
  
  function isIdeaLiked(ideaOrId) {
    const id = typeof ideaOrId === 'object' ? ideaOrId.id : ideaOrId;
    return likedIdeas.includes(id);
  }
  
  // Use stored ideas if no new ideas provided, otherwise use new ideas and store them
  $: {
    if (ideas.length > 0 && !isGenerating) {
      // New ideas came in - convert to objects with consistent IDs
      const ideasWithIds = ideas.map((idea, index) => {
        if (typeof idea === 'string') {
          // Check if this idea already exists in stored ideas (by text match)
          const existingIdea = storedIdeas.find(stored => stored.text === idea);
          if (existingIdea) {
            return existingIdea; // Use existing ID to maintain consistency
          }
          // Create new idea with deterministic ID based on content
          const contentHash = idea.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 20);
          return {
            id: `idea_${contentHash}_${index}`,
            text: idea
          };
        }
        return idea; // Already has ID
      });
      
      // IMPORTANT: Merge new ideas with existing liked ideas, don't replace everything
      // Get currently liked idea objects that should be preserved
      const existingLikedIdeas = storedIdeas.filter(idea => likedIdeas.includes(idea.id));
      
      // Remove any duplicates between new ideas and existing liked ideas
      const newIdeasFiltered = ideasWithIds.filter(newIdea => 
        !existingLikedIdeas.some(likedIdea => likedIdea.text === newIdea.text || likedIdea.id === newIdea.id)
      );
      
      // Combine: existing liked ideas + new ideas
      storedIdeas = [...existingLikedIdeas, ...newIdeasFiltered];
      saveStoredIdeas();
      
      // Update rate limit after successful generation
      loadUsageStatus();
    }
  }
  
  // Use stored ideas if no current ideas, otherwise use current ideas
  // Always ensure we're working with objects that have IDs
  $: displayIdeas = ideas.length > 0 ? 
    ideas.map((idea, index) => {
      if (typeof idea === 'string') {
        // Find matching stored idea or create new object
        const existingIdea = storedIdeas.find(stored => stored.text === idea);
        return existingIdea || {
          id: `temp_${Date.now()}_${index}`,
          text: idea
        };
      }
      return idea;
    }) : storedIdeas;
  
  // Filter out dismissed ideas and add liked ideas that aren't already visible
  $: {
    // Filter current/stored ideas to exclude dismissed ones
    const filteredCurrentIdeas = displayIdeas.filter(idea => !isIdeaDismissed(idea));
    
    // Get ALL liked ideas from stored ideas that match liked IDs and aren't dismissed
    const likedIdeaObjects = storedIdeas.filter(idea => {
      const isLiked = likedIdeas.includes(idea.id);
      const isDismissed = isIdeaDismissed(idea);
      return isLiked && !isDismissed;
    });
    
    // Combine current ideas with liked ideas (avoiding duplicates)
    const currentIds = new Set(filteredCurrentIdeas.map(idea => idea.id));
    const additionalLikedIdeas = likedIdeaObjects.filter(idea => !currentIds.has(idea.id));
    
    // Sort: liked ideas first, then neutral ideas
    const likedIdeasFromCurrent = filteredCurrentIdeas.filter(idea => likedIdeas.includes(idea.id));
    const neutralIdeasFromCurrent = filteredCurrentIdeas.filter(idea => !likedIdeas.includes(idea.id));
    
    let allIdeas = [...likedIdeasFromCurrent, ...additionalLikedIdeas, ...neutralIdeasFromCurrent];
    
    // Apply search term filtering if provided
    if (searchTerm && searchTerm.trim()) {
      allIdeas = allIdeas.filter(idea => {
        const ideaText = typeof idea === 'string' ? idea : idea?.text || idea?.title || idea?.description || '';
        return ideaText.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }
    
    visibleIdeas = allIdeas;
  }
  
  // Parse idea into number, title and description
  function parseIdea(text) {
    let number = null;
    let cleanText = text;
    
    // Extract number at the beginning (e.g., "1. " or "1) " or "1: ")
    const numberPattern = /^(\d+)[.):\s]+(.*)$/s;
    const numberMatch = text.match(numberPattern);
    if (numberMatch) {
      number = numberMatch[1];
      cleanText = numberMatch[2].trim();
    }
    
    // Look for bold text anywhere in the cleaned text as title
    const boldPattern = /\*\*(.+?)\*\*/;
    const match = cleanText.match(boldPattern);
    
    if (match) {
      const title = match[1].trim();
      // Remove the entire bold portion and any following colon/punctuation
      let description = cleanText.replace(/\*\*(.+?)\*\*[:\s-]*/, '').trim();
      
      return {
        number: number,
        title: title,
        description: description
      };
    }
    
    // Fallback: use first sentence as title, rest as description
    const sentences = cleanText.split(/[.!?]/);
    if (sentences.length > 1 && sentences[0].length < 100) {
      return {
        number: number,
        title: sentences[0].trim(),
        description: sentences.slice(1).join('.').trim()
      };
    }
    
    // If no good split, use whole text as title
    return {
      number: number,
      title: cleanText.trim(),
      description: ''
    };
  }
  
  // Render markdown for descriptions
  function renderMarkdown(text) {
    if (!text) return '';
    return marked(text, { breaks: true, gfm: true });
  }
  
  // Icon component mapping
  const iconComponents = {
    BookOpen, Users, Target, Zap, Settings, Palette, Code, 
    TrendingUp, MessageSquare, Search, Camera, Music, 
    ShoppingBag, Globe, Heart, Shield, Database, Brain, Lightbulb
  };
  
  // Get appropriate icon for an idea based on its content
  function getIconForIdea(idea) {
    const text = idea.toLowerCase();
    
    // Research & Learning
    if (text.includes('research') || text.includes('study') || text.includes('learn') || 
        text.includes('book') || text.includes('read') || text.includes('article')) {
      return BookOpen;
    }
    
    // People & Community
    if (text.includes('user') || text.includes('audience') || text.includes('community') || 
        text.includes('people') || text.includes('customer') || text.includes('team')) {
      return Users;
    }
    
    // Goals & Strategy
    if (text.includes('goal') || text.includes('target') || text.includes('strategy') || 
        text.includes('plan') || text.includes('objective') || text.includes('mission')) {
      return Target;
    }
    
    // Technology & Development
    if (text.includes('code') || text.includes('develop') || text.includes('programming') || 
        text.includes('software') || text.includes('app') || text.includes('website') || 
        text.includes('api') || text.includes('tech')) {
      return Code;
    }
    
    // Data & Analytics
    if (text.includes('data') || text.includes('analytics') || text.includes('database') || 
        text.includes('metrics') || text.includes('statistics') || text.includes('track')) {
      return Database;
    }
    
    // Growth & Marketing
    if (text.includes('growth') || text.includes('market') || text.includes('scale') || 
        text.includes('expand') || text.includes('trend') || text.includes('viral')) {
      return TrendingUp;
    }
    
    // Communication & Content
    if (text.includes('content') || text.includes('message') || text.includes('communication') || 
        text.includes('post') || text.includes('social') || text.includes('blog')) {
      return MessageSquare;
    }
    
    // Search & Discovery
    if (text.includes('search') || text.includes('discover') || text.includes('find') || 
        text.includes('explore') || text.includes('seo') || text.includes('keyword')) {
      return Search;
    }
    
    // Creative & Design
    if (text.includes('design') || text.includes('creative') || text.includes('art') || 
        text.includes('visual') || text.includes('color') || text.includes('brand')) {
      return Palette;
    }
    
    // Media & Entertainment
    if (text.includes('video') || text.includes('photo') || text.includes('image') || 
        text.includes('camera') || text.includes('visual')) {
      return Camera;
    }
    
    // Music & Audio
    if (text.includes('music') || text.includes('audio') || text.includes('sound') || 
        text.includes('podcast') || text.includes('voice')) {
      return Music;
    }
    
    // Commerce & Sales
    if (text.includes('sell') || text.includes('buy') || text.includes('shop') || 
        text.includes('product') || text.includes('commerce') || text.includes('store')) {
      return ShoppingBag;
    }
    
    // Global & International
    if (text.includes('global') || text.includes('international') || text.includes('world') || 
        text.includes('country') || text.includes('region')) {
      return Globe;
    }
    
    // Performance & Speed
    if (text.includes('fast') || text.includes('speed') || text.includes('performance') || 
        text.includes('optimize') || text.includes('quick') || text.includes('efficient')) {
      return Zap;
    }
    
    // Settings & Configuration
    if (text.includes('setting') || text.includes('config') || text.includes('setup') || 
        text.includes('customize') || text.includes('option')) {
      return Settings;
    }
    
    // Security & Protection
    if (text.includes('security') || text.includes('safe') || text.includes('protect') || 
        text.includes('privacy') || text.includes('secure')) {
      return Shield;
    }
    
    // AI & Intelligence
    if (text.includes('ai') || text.includes('intelligence') || text.includes('smart') || 
        text.includes('machine learning') || text.includes('algorithm')) {
      return Brain;
    }
    
    // Personal & Emotional
    if (text.includes('love') || text.includes('like') || text.includes('favorite') || 
        text.includes('personal') || text.includes('emotional')) {
      return Heart;
    }
    
    // Default fallback
    return Lightbulb;
  }

</script>

<div class="flex flex-col h-full max-h-full overflow-hidden">
  <!-- Header -->
  <div class="flex-shrink-0">
    <div class="flex items-center justify-between mb-2" style="margin-left: 32px; margin-right: 4px;">
      <div class="flex items-center gap-2">
        <h3 class="font-semibold text-gray-800 dark:text-gray-200">Related Ideas</h3>
        <InfoPopup
          title="Related Ideas"
          content={`
            <p><strong>Related Ideas</strong> uses wiskrs to suggest concepts to enhance your project.</p>
            <p>You'll see related topics you might not have considered, areas to expand on, and new avenues to explore</p>
          `}
          buttonTitle="Learn about Related Ideas"
        />
      </div>
      <div class="flex items-center gap-2">
        <!-- Usage Counter -->
        {#if !isLoadingUsage}
          <div class="flex items-center gap-1 text-xs px-2 py-1 rounded" 
               class:text-gray-600={rateLimit.canGenerate}
               class:dark:text-gray-400={rateLimit.canGenerate}
               class:text-red-600={!rateLimit.canGenerate}
               class:dark:text-red-400={!rateLimit.canGenerate}
               class:bg-gray-100={rateLimit.canGenerate}
               class:dark:bg-gray-700={rateLimit.canGenerate}
               class:bg-red-50={!rateLimit.canGenerate}
               style={!rateLimit.canGenerate ? "background-color: rgba(127, 29, 29, 0.2);" : ""}>
            <span class="text-gray-500 dark:text-gray-400 text-xs mr-1">Daily:</span>
            <span class="font-medium">{rateLimit.used}/{rateLimit.limit}</span>
          </div>
        {/if}
        
        <!-- Refresh Button or Pro Badge when limit reached -->
        {#if !rateLimit.canGenerate}
          <div class="flex items-center gap-1">
            <button 
              id="related-ideas-refresh"
              class="flex items-center gap-1 text-sm px-2 py-1 rounded cursor-not-allowed opacity-50" 
              style="background-color: var(--color-accent);"
              disabled={true}
              title="Daily limit reached - upgrade to Pro for more generations"
            >
              <RefreshCw size="16" />
              Limit Reached
            </button>
            <ProBadge tier={1} size="xs" variant="solid" />
          </div>
        {:else}
          <button 
            id="related-ideas-refresh"
            class="flex items-center gap-1 text-sm text-white px-2 py-1 rounded cursor-pointer disabled:opacity-50" 
            style="background-color: var(--color-accent); transition: background-color 0.2s ease;"
            on:mouseenter={handleRefreshHover}
            on:mouseleave={handleRefreshLeave}
            on:click={generateIdeas}
            disabled={isGenerating}
            title="Generate new related ideas ({rateLimit.remaining} left today)"
          >
            <RefreshCw size="16" class={isGenerating ? "animate-spin" : ""} />
            {isGenerating ? "Generating..." : "Refresh"}
          </button>
        {/if}
      </div>
    </div>
    <div class="text-xs text-zinc-500 dark:text-zinc-400 mb-2" style="margin-left: 32px;">
      {#if isGenerating}
        <span class="font-medium" style="color: var(--color-accent);">🤖 Wiskr is thinking...</span>
      {:else}
        Wiskr-suggested concepts to expand your knowledge base
      {/if}
    </div>
  </div>

  <!-- Ideas List -->
  <div class="flex-1 min-h-0 overflow-hidden relative">
    <!-- Loading Overlay -->
    {#if isGenerating}
      <LoadingSpinner 
        overlay={true} 
        backgroundColor="rgba(27, 27, 30, 0.85)" 
        text="Generating Ideas..." 
        size="lg" 
      />
    {/if}
    
    <!-- Scrollable content container -->
    <div class="h-full overflow-y-auto pr-1 pb-4 md:pb-0">
    
    <ul class="space-y-1 px-2 md:px-0" style="margin-left: 32px;"> <!-- 32px for chevron space, mobile padding -->
      {#each visibleIdeas as idea, i (typeof idea === 'object' ? idea.id : idea)}
        {@const ideaText = typeof idea === 'object' ? idea.text : idea}
        {@const ideaId = typeof idea === 'object' ? idea.id : idea}
        {@const isLikedForDisplay = likedIdeasSet.has(ideaId)}
        <li 
          class="relative text-sm border border-gray-200 dark:border-gray-600 rounded px-1.5 py-1.5 group hover:bg-gray-50 dark:hover:bg-gray-700" 
          style="background-color: {likedIdeasSet.has(ideaId) ? 'var(--color-accent-light)' : 'var(--bg-card)'}; border-color: {likedIdeasSet.has(ideaId) ? 'var(--color-accent-border)' : ''};"
          data-idea-id={ideaId}
        >
          <!-- Chevron button outside card on the left, always visible -->
          <button 
            id="idea-insert-{ideaId}"
            class="absolute p-2 flex-shrink-0 cursor-pointer z-10 transition-colors"
            style="color: var(--color-accent); left: -20px; top: 50%; transform: translateX(-50%) translateY(-50%);"
            on:mouseenter={(e) => e.target.style.color = 'var(--color-accent-hover)'}
            on:mouseleave={(e) => e.target.style.color = 'var(--color-accent)'}
            on:click={() => insertIdea(ideaText)}
            title="Add to chat input"
          >
            <ChevronsLeft size="20" />
          </button>
          
          <!-- Title row with action buttons -->
          <div class="flex items-start gap-2 mb-1">
            <!-- Center section: icon and title -->
            <div class="flex items-start gap-2 flex-1">
              <div class="text-gray-900 dark:text-gray-100 flex-shrink-0 mt-0.5">
                <svelte:component this={getIconForIdea(ideaText)} size="16" />
              </div>
              <div class="font-semibold text-gray-800 dark:text-gray-200 leading-snug text-sm">
                {parseIdea(ideaText).title}
              </div>
            </div>
            
            <!-- Right section: action buttons -->
            <div class="flex items-center gap-1 flex-shrink-0">
              <!-- Always visible like button when liked, otherwise show on hover -->
              <button 
                id="idea-like-{ideaId}"
                class="p-1 cursor-pointer {likedIdeasSet.has(ideaId) ? '' : 'opacity-0 group-hover:opacity-100'}" 
                style="color: {likedIdeasSet.has(ideaId) ? 'var(--color-accent)' : 'var(--color-accent)'}"
                on:mouseenter={(e) => e.target.style.color = 'var(--color-accent-hover)'}
                on:mouseleave={(e) => e.target.style.color = 'var(--color-accent)'}
                on:click={() => toggleLikeIdea(ideaId)}
                title={likedIdeasSet.has(ideaId) ? 'Unlike this idea' : 'Love this idea!'}
              >
                <Heart size="16" class={likedIdeasSet.has(ideaId) ? 'fill-current' : ''} />
              </button>
              <!-- Hover-only buttons -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  id="idea-dismiss-{ideaId}"
                  class="p-1 cursor-pointer" 
                  style="color: var(--color-accent)"
                  on:mouseenter={(e) => e.target.style.color = 'var(--color-accent-hover)'}
                  on:mouseleave={(e) => e.target.style.color = 'var(--color-accent)'}
                  on:click={() => dismissIdea(ideaId)}
                  title="Don't like this idea"
                >
                  <HeartCrack size="16" />
                </button>
              </div>
            </div>
          </div>
          
          <!-- Description row (if exists) -->
          {#if parseIdea(ideaText).description}
            <div class="text-gray-600 dark:text-gray-400 text-sm leading-snug prose prose-sm max-w-none">
              {@html renderMarkdown(parseIdea(ideaText).description)}
            </div>
          {/if}
        </li>
      {/each}
      {#if !visibleIdeas.length && !isGenerating}
        <li class="text-sm text-zinc-500 dark:text-zinc-400 italic border border-gray-200 dark:border-gray-600 rounded p-2 ml-0" style="background-color: var(--bg-card);"> <!-- Reset margin for empty state -->
          <div>No ideas yet. Click "Refresh" to generate AI-powered suggestions based on your project context!</div>
        </li>
      {/if}
      {#if isGenerating}
        <!-- Loading message -->
        <li class="text-sm text-zinc-600 dark:text-zinc-300 border border-gray-200 dark:border-gray-600 rounded p-2" style="background-color: var(--color-accent-light);">
          <div class="flex items-center gap-2">
            <RefreshCw size="16" class="animate-spin" style="color: var(--color-accent);" />
            <div>Generating related ideas based on your current context...</div>
          </div>
        </li>
        
        <!-- Loading skeleton placeholders -->
        {#each Array(3) as _, i}
          <li class="text-sm border border-gray-200 dark:border-gray-600 rounded p-2 animate-pulse border-l-4 border-l-gray-200 dark:border-l-gray-600" style="background-color: var(--bg-card);">
            <div class="flex items-start gap-2">
              <div class="w-3.5 h-3.5 bg-gray-300 dark:bg-gray-600 rounded mt-0.5 flex-shrink-0"></div>
              <div class="flex-1 space-y-1">
                <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                <div class="h-3 bg-gray-300 dark:bg-gray-600 rounded w-{i === 0 ? '3/4' : i === 1 ? '5/6' : '2/3'}"></div>
              </div>
            </div>
          </li>
        {/each}
      {/if}
    </ul>
    </div>
  </div>
</div>
