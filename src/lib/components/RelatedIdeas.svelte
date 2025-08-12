<!-- src/lib/components/RelatedIdeas.svelte -->
<script>
import { createEventDispatcher } from 'svelte';
import { 
  RefreshCw, Lightbulb, ChevronsRight, HeartCrack, Heart,
  BookOpen, Users, Target, Zap, Settings, Palette, Code, 
  TrendingUp, MessageSquare, Search, Camera, Music, 
  ShoppingBag, Globe, Shield, Database, Brain
} from 'lucide-svelte';
import { marked } from 'marked';
import { browser } from '$app/environment';

  export let ideas = [];
  export let isGeneratingIdeas = false;
  export let projectId = null;
  
  // Local reactive variable for template use
  let isGenerating = false;
  
  // Update local variable when prop changes
  $: isGenerating = isGeneratingIdeas;

  const dispatch = createEventDispatcher();
  
  // Idea feedback storage (localStorage)
  let dismissedIdeas = [];
  let likedIdeas = [];
  let storedIdeas = [];
  let visibleIdeas = [];
  let likedIdeasSet = new Set();
  
  // Create reactive liked ideas set for better reactivity
  $: likedIdeasSet = new Set(likedIdeas);
  
  // Load feedback and stored ideas from localStorage on mount
  $: if (browser && projectId) {
    loadIdeaFeedback();
    loadStoredIdeas();
  }
  
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

  function generateIdeas() {
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
  
  function dismissIdea(ideaId) {
    console.log('dismissIdea called for:', ideaId, 'current dismissed:', dismissedIdeas);
    if (!dismissedIdeas.includes(ideaId)) {
      dismissedIdeas = [...dismissedIdeas, ideaId];
      console.log('Dismissed idea, new dismissedIdeas:', dismissedIdeas);
      saveIdeaFeedback();
      // Force reactivity by reassigning the array
      dismissedIdeas = [...dismissedIdeas];
    }
  }
  
  function toggleLikeIdea(ideaId) {
    console.log('toggleLikeIdea called for:', ideaId, 'current liked state:', likedIdeas.includes(ideaId));
    
    if (likedIdeas.includes(ideaId)) {
      // Unlike the idea - remove it from liked ideas
      likedIdeas = likedIdeas.filter(likedId => likedId !== ideaId);
      console.log('Unliked idea, new likedIdeas:', likedIdeas);
    } else {
      // Like the idea - add it to liked ideas
      likedIdeas = [...likedIdeas, ideaId];
      console.log('Liked idea, new likedIdeas:', likedIdeas);
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
      console.log('🔄 Merged new ideas with existing liked ideas:', {
        existingLikedIdeas: existingLikedIdeas.length,
        newIdeasFiltered: newIdeasFiltered.length,
        totalStoredIdeas: storedIdeas.length
      });
      
      saveStoredIdeas();
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
    console.log('Reactive visibility update triggered.');
    console.log('  dismissedIdeas:', dismissedIdeas);
    console.log('  likedIdeas:', likedIdeas);
    console.log('  storedIdeas:', storedIdeas.map(idea => ({ id: idea.id, text: idea.text.substring(0, 50) + '...' })));
    console.log('  displayIdeas:', displayIdeas.map(idea => ({ id: idea.id, text: idea.text.substring(0, 50) + '...' })));
    
    // Filter current/stored ideas to exclude dismissed ones
    const filteredCurrentIdeas = displayIdeas.filter(idea => !isIdeaDismissed(idea));
    console.log('  filteredCurrentIdeas:', filteredCurrentIdeas.length);
    
    // Get ALL liked ideas from stored ideas that match liked IDs and aren't dismissed
    console.log('  Looking for liked ideas. likedIdeas array:', likedIdeas);
    console.log('  Available storedIdeas IDs:', storedIdeas.map(idea => idea.id));
    
    const likedIdeaObjects = storedIdeas.filter(idea => {
      const isLiked = likedIdeas.includes(idea.id);
      const isDismissed = isIdeaDismissed(idea);
      console.log(`    Idea "${idea.text.substring(0, 30)}..." (${idea.id}): liked=${isLiked}, dismissed=${isDismissed}`);
      return isLiked && !isDismissed;
    });
    console.log('  likedIdeaObjects found:', likedIdeaObjects.length);
    
    // Debug: Check if liked IDs are missing from storedIdeas (but don't clean up here to avoid cycles)
    const missingLikedIds = likedIdeas.filter(likedId => !storedIdeas.find(idea => idea.id === likedId));
    if (missingLikedIds.length > 0) {
      console.log('  ⚠️  Missing liked idea objects for IDs:', missingLikedIds);
      // Note: Cleanup moved to separate function to avoid cyclical dependency
    }
    
    // Combine current ideas with liked ideas (avoiding duplicates)
    const currentIds = new Set(filteredCurrentIdeas.map(idea => idea.id));
    const additionalLikedIdeas = likedIdeaObjects.filter(idea => !currentIds.has(idea.id));
    console.log('  additionalLikedIdeas to add:', additionalLikedIdeas.length);
    
    // Sort: liked ideas first, then neutral ideas
    const likedIdeasFromCurrent = filteredCurrentIdeas.filter(idea => likedIdeas.includes(idea.id));
    const neutralIdeasFromCurrent = filteredCurrentIdeas.filter(idea => !likedIdeas.includes(idea.id));
    
    visibleIdeas = [...likedIdeasFromCurrent, ...additionalLikedIdeas, ...neutralIdeasFromCurrent];
    console.log('  Sorted order: liked from current + additional liked + neutral');
    console.log('  Final counts: { likedFromCurrent:', likedIdeasFromCurrent.length, ', additionalLiked:', additionalLikedIdeas.length, ', neutral:', neutralIdeasFromCurrent.length, '}');
    
    console.log('Final visibleIdeas:', {
      displayIdeas: displayIdeas.length,
      dismissedCount: dismissedIdeas.length,
      filteredCurrentIdeas: filteredCurrentIdeas.length,
      additionalLikedIdeas: additionalLikedIdeas.length,
      newTotal: visibleIdeas.length
    });
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
    <div class="flex items-center justify-between mb-2">
      <h3 class="font-semibold text-gray-800">Related Ideas</h3>
      <button 
        class="flex items-center gap-1 text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 cursor-pointer disabled:opacity-50" 
        on:click={generateIdeas}
        disabled={isGenerating}
        title="Generate new related ideas"
      >
        <RefreshCw size="14" class={isGenerating ? "animate-spin" : ""} />
        {isGenerating ? "Generating..." : "Refresh"}
      </button>
    </div>
    <div class="text-xs text-zinc-500 mb-2">
      {#if isGenerating}
        <span class="text-blue-600 font-medium">🤖 AI is thinking...</span>
      {:else}
        AI-suggested concepts to expand your knowledge base
      {/if}
    </div>
  </div>

  <!-- Ideas List -->
  <div class="flex-1 min-h-0 overflow-hidden relative">
    <!-- Loading Overlay -->
    {#if isGenerating}
      <div class="absolute inset-0 bg-white bg-opacity-85 flex items-center justify-center z-50 rounded">
        <div class="text-center">
          <RefreshCw size="28" class="animate-spin mx-auto mb-3 text-blue-500" />
          <div class="text-base font-medium text-gray-700">Generating Ideas...</div>
          <div class="text-sm text-gray-500 mt-1">Using AI to analyze your project</div>
          <div class="text-xs text-green-600 mt-2 font-medium">💚 Any ideas you've liked will stay visible</div>
        </div>
      </div>
    {/if}
    
    <!-- Scrollable content container -->
    <div class="h-full overflow-y-auto pr-1">
    
    <ul class="space-y-1">
      {#each visibleIdeas as idea, i (typeof idea === 'object' ? idea.id : idea)}
        {@const ideaText = typeof idea === 'object' ? idea.text : idea}
        {@const ideaId = typeof idea === 'object' ? idea.id : idea}
        {@const isLikedForDisplay = likedIdeasSet.has(ideaId)}
        {@const isInLikedArray = likedIdeas.includes(ideaId)}
        <li class="text-sm border rounded px-1.5 py-1.5 bg-white group hover:bg-blue-50 border-l-4 border-l-blue-200 {likedIdeasSet.has(ideaId) ? 'ring-1 ring-green-200 bg-green-50' : ''}">
          <!-- Title row with action buttons -->
          <div class="flex items-start justify-between gap-2 mb-1">
            <div class="flex items-start gap-2 flex-1">
              <div class="text-blue-600 flex-shrink-0 mt-0.5">
                <svelte:component this={getIconForIdea(ideaText)} size="16" />
              </div>
              <div class="font-semibold text-gray-800 leading-tight text-sm">
                {parseIdea(ideaText).title}
              </div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
              <!-- Always visible like button when liked, otherwise show on hover -->
              <button 
                class="text-red-500 hover:text-red-700 p-1 cursor-pointer {likedIdeasSet.has(ideaId) ? 'text-green-500 hover:text-green-700' : 'opacity-0 group-hover:opacity-100'}" 
                on:click={() => toggleLikeIdea(ideaId)}
                title={likedIdeasSet.has(ideaId) ? 'Unlike this idea' : 'Love this idea!'}
              >
                <Heart size="16" class={likedIdeasSet.has(ideaId) ? 'fill-current' : ''} />
              </button>
              <!-- Hover-only buttons -->
              <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  class="text-red-500 hover:text-red-700 p-1 cursor-pointer" 
                  on:click={() => dismissIdea(ideaId)}
                  title="Don't like this idea"
                >
                  <HeartCrack size="16" />
                </button>
                <button 
                  class="text-blue-500 hover:text-blue-700 p-1 cursor-pointer" 
                  on:click={() => insertIdea(ideaText)}
                  title="Add to chat input"
                >
                  <ChevronsRight size="18" />
                </button>
              </div>
            </div>
          </div>
          
          <!-- Description row (if exists) -->
          {#if parseIdea(ideaText).description}
            <div class="text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none">
              {@html renderMarkdown(parseIdea(ideaText).description)}
            </div>
          {/if}
        </li>
      {/each}
      {#if !visibleIdeas.length && !isGenerating}
        <li class="text-sm text-zinc-500 italic border rounded p-2 bg-gray-50">
          <div>No ideas yet. Click "Refresh" to generate AI-powered suggestions based on your project context!</div>
        </li>
      {/if}
      {#if isGenerating}
        <!-- Loading message -->
        <li class="text-sm text-zinc-600 border rounded p-2 bg-blue-50 border-l-4 border-l-blue-300">
          <div class="flex items-center gap-2">
            <RefreshCw size="14" class="animate-spin text-blue-500" />
            <div>Generating related ideas based on your current context...</div>
          </div>
        </li>
        
        <!-- Loading skeleton placeholders -->
        {#each Array(3) as _, i}
          <li class="text-sm border rounded p-2 bg-gray-100 animate-pulse border-l-4 border-l-gray-200">
            <div class="flex items-start gap-2">
              <div class="w-3.5 h-3.5 bg-gray-300 rounded mt-0.5 flex-shrink-0"></div>
              <div class="flex-1 space-y-1">
                <div class="h-3 bg-gray-300 rounded w-full"></div>
                <div class="h-3 bg-gray-300 rounded w-{i === 0 ? '3/4' : i === 1 ? '5/6' : '2/3'}"></div>
              </div>
            </div>
          </li>
        {/each}
      {/if}
    </ul>
    </div>
  </div>
</div>
