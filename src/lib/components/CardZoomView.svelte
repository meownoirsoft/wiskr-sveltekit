<!-- CardZoomView.svelte - Large zoomed-in card view for editing -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Pin, PinOff, Pencil, Trash, Star, Split, Merge, Palette, X, Save, XCircle, Flag, Plus, Edit3, Trash2 } from 'lucide-svelte';
  import ArtManager from './ArtManager.svelte';
  import ArtFeedbackModal from './modals/ArtFeedbackModal.svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';

  export let card = null;
  export let isOpen = false;
  export let userPreferences = { display_name: null };

  const dispatch = createEventDispatcher();
  
  // Delete confirmation state

  function isDarkMode() {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark') || 
           window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }

  function isUserUploadedArt(artUrl) {
    if (!artUrl) return false;
    // Check if it's a default art URL or AI-generated
    return !artUrl.includes('/wiskr-art-default.webp') && 
           !artUrl.includes('midjourney') && 
           !artUrl.includes('dall-e') &&
           !artUrl.includes('stable-diffusion') &&
           !artUrl.includes('ai-art-') && // BunnyCDN AI art files
           !artUrl.includes('openai.com'); // Direct DALL-E URLs
  }

  function getGenerationLabel() {
    if (!editedCard?.generation_model || editedCard.generation_model === 'GPT-4o') {
      return `idea: ${userPreferences.display_name || 'User'}`;
    }
    return `gen: ${editedCard.generation_model}`;
  }

  function getArtLabel() {
    if (isUserUploadedArt(editedCard?.art_url)) {
      return `art: ${userPreferences.display_name || 'User'}`;
    }
    // Use the stored art_model if available, otherwise fall back to default
    return `art: ${editedCard?.art_model || 'Midjourney'}`;
  }

  // Progress levels (1-5 stars)
  const progressLevels = [
    { level: 1, name: 'Raw', color: '#6b7280' },
    { level: 2, name: 'Rough', color: '#f97316' },
    { level: 3, name: 'Crystal', color: '#ef4444' },
    { level: 4, name: 'Cut', color: '#1d4ed8' },
    { level: 5, name: 'Shimmer', color: '#7c3aed' }
  ];

  // Rarity configurations
  const rarityConfig = {
    common: {
      borderColor: '#14b8a6',
      bgColor: '#f0fdfa',
      bgColorDark: '#064e3b',
      textColor: '#0f766e',
      textColorDark: '#6ee7b7'
    },
    special: {
      borderColor: '#3b82f6',
      bgColor: '#eff6ff',
      bgColorDark: '#1e3a8a',
      textColor: '#1d4ed8',
      textColorDark: '#60a5fa'
    },
    rare: {
      borderColor: '#8b5cf6',
      bgColor: '#faf5ff',
      bgColorDark: '#581c87',
      textColor: '#7c3aed',
      textColorDark: '#a78bfa'
    },
    legendary: {
      borderColor: '#f59e0b',
      bgColor: '#fffbeb',
      bgColorDark: '#92400e',
      textColor: '#d97706',
      textColorDark: '#fbbf24'
    }
  };

  // Editable state
  let isEditing = false;
  let editedCard = null;
  let title = '';
  let content = '';
  let tags = [];
  let newTag = '';
  let artUrl = '';
  let showArtManager = false;
  
  // Tooltip state
  let showTooltip = false;
  let tooltipContent = '';
  let tooltipType = '';
  let tooltipPosition = { x: 0, y: 0 };
  let hoverTimeout = null;
  
  // Tooltip data cache
  let tooltipNotes = [];
  let tooltipBranches = [];
  let tooltipDecks = [];
  let tooltipResources = [];
  
  // Modal states
  let showNotesModal = false;
  let showBranchesModal = false;
  let showDecksModal = false;
  let showResourcesModal = false;
  let showFeedbackModal = false;
  let feedbackArtUrl = '';
  
  // Notes management state
  let notes = [];
  let editingNote = null;
  let newNoteContent = '';
  let showNoteEditor = false;
  let isFullScreen = false;
  let showPreview = false;
  let showSplitView = false;

  // Reactive values
  $: rarity = getRarityConfig(editedCard?.rarity || card?.rarity || 'common');
  $: progress = getProgressInfo(editedCard?.progress || card?.progress || 1);
  $: manaCost = editedCard?.mana_cost || card?.mana_cost || 0;
  $: darkMode = isDarkMode();
  
  // Force reactivity when editedCard changes
  $: if (editedCard) {
    console.log('🔍 editedCard changed, rarity:', editedCard.rarity);
  }

  // Update artUrl when card changes
  $: if (card && card.art_url !== artUrl) {
    artUrl = card.art_url || '';
    console.log('🔍 CardZoomView: Updated artUrl from card:', artUrl);
  }

  // Debug art display
  $: console.log('🔍 CardZoomView art display state:', {
    artUrl,
    editedCardArtUrl: editedCard?.art_url,
    isEditing,
    displayArt: artUrl || editedCard?.art_url
  });

  // Initialize edited card when modal opens
  $: if (isOpen && card) {
    console.log('🔍 CardZoomView received card:', card);
    // Clear previous state first
    editedCard = null;
    isEditing = false;
    title = '';
    content = '';
    tags = [];
    artUrl = '';
    initializeEditedCard();
  }

  function initializeEditedCard() {
    if (!card) return;
    
    console.log('🔍 CardZoomView initializing with card:', card);
    
    // Use card data directly from the new cards table structure
    editedCard = {
      ...card,
      title: card.title || 'Untitled Card',
      content: card.content || 'No content',
      tags: card.tags || [],
      art_url: card.art_url || null,
      rarity: card.rarity || 'common',
      progress: card.progress || 1,
      mana_cost: card.mana_cost || 0,
      pinned: card.pinned || false,
      generation_model: card.generation_model || 'GPT-4o',
      art_model: card.art_model || 'Midjourney',
      created_at: card.created_at || new Date().toISOString()
    };

    console.log('🔍 Final editedCard:', editedCard);

    title = editedCard.title;
    content = editedCard.content;
    tags = [...editedCard.tags];
    artUrl = editedCard.art_url || '';
  }

  function getRarityConfig(rarity) {
    return rarityConfig[rarity] || rarityConfig.common;
  }

  function getProgressInfo(level) {
    return progressLevels.find(p => p.level === level) || progressLevels[0];
  }

  function startEditing() {
    isEditing = true;
  }

  function cancelEditing() {
    isEditing = false;
    initializeEditedCard();
  }

  function saveCard() {
    if (!editedCard) return;

    // Increment mana cost by 1 for each edit
    const newManaCost = (editedCard.mana_cost || 0) + 1;

    const updatedCard = {
      ...editedCard,
      title,
      content,
      tags: tags.filter(tag => tag.trim()),
      art_url: artUrl.trim() || null,
      mana_cost: newManaCost
    };

    dispatch('save', { card: updatedCard });
    isEditing = false;
  }

  function deleteCard(event) {
    event.stopPropagation();
    event.preventDefault();
    dispatch('delete', { card });
  }

  function closeModal() {
    dispatch('close');
  }

  function handleRarityUpgrade() {
    const rarities = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarities.indexOf(editedCard.rarity);
    if (currentIndex < rarities.length - 1) {
      editedCard.rarity = rarities[currentIndex + 1];
      dispatch('rarity-change', { card, newRarity: editedCard.rarity });
    }
  }

  function handleRarityDowngrade() {
    const rarities = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarities.indexOf(editedCard.rarity);
    if (currentIndex > 0) {
      editedCard.rarity = rarities[currentIndex - 1];
      dispatch('rarity-change', { card, newRarity: editedCard.rarity });
    }
  }

  function handleProgressClick(targetLevel) {
    editedCard.progress = targetLevel;
    dispatch('progress-change', { card, targetLevel });
  }

  function togglePin() {
    editedCard.pinned = !editedCard.pinned;
    dispatch('toggle-pin', { card });
  }

  function addTag() {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      tags = [...tags, newTag.trim()];
      newTag = '';
    }
  }

  function removeTag(tagToRemove) {
    tags = tags.filter(tag => tag !== tagToRemove);
  }

  function handleKeydown(event) {
    if (event.key === 'Enter' && event.target.id === 'new-tag') {
      addTag();
    }
  }

  function handleMerge() {
    dispatch('merge', { card });
  }

  function handleSplit() {
    dispatch('split', { card });
  }

  function handleGenerateArt() {
    showArtManager = true;
  }

  function handleArtSelected(event) {
    const { artUrl: newArtUrl, source, model } = event.detail;
    console.log('🔍 Art selected:', { newArtUrl, source, model });
    
    artUrl = newArtUrl;
    if (editedCard) {
      editedCard.art_url = newArtUrl;
      if (model && source === 'ai') {
        editedCard.art_model = model;
      }
    }
    showArtManager = false;
    
    // Update the original card object to keep everything in sync
    if (card) {
      card.art_url = newArtUrl;
      if (model && source === 'ai') {
        card.art_model = model;
      }
    }
    
    console.log('🔍 Updated artUrl:', artUrl, 'editedCard.art_url:', editedCard?.art_url, 'art_model:', editedCard?.art_model);
    
    // Dispatch to parent with updated card
    dispatch('generate-art', { card, artUrl: newArtUrl, source, model });
  }

  function closeArtManager() {
    showArtManager = false;
  }

  function reportBadArt(artUrl) {
    feedbackArtUrl = artUrl;
    showFeedbackModal = true;
  }

  async function handleFeedbackSubmit(event) {
    const { artUrl, cardId, reason, details } = event.detail;
    
    try {
      const response = await fetch('/api/art/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artUrl,
          cardId,
          reason,
          details
        })
      });

      if (!response.ok) {
        throw new Error('Failed to submit feedback');
      }

      alert('Thank you for your feedback! This helps us improve art generation.');
      showFeedbackModal = false;
    } catch (error) {
      console.error('Feedback submission failed:', error);
      alert('Failed to submit feedback. Please try again.');
    }
  }

  function closeFeedbackModal() {
    showFeedbackModal = false;
    feedbackArtUrl = '';
  }

  // Tooltip functions
  async function showTooltipForType(type, event) {
    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    tooltipPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    };
    tooltipType = type;
    showTooltip = true;
    
    // Load real data based on type
    switch (type) {
      case 'notes':
        if (tooltipNotes.length === 0) {
          await loadTooltipNotes();
        }
        tooltipContent = tooltipNotes;
        break;
      case 'branches':
        if (tooltipBranches.length === 0) {
          await loadTooltipBranches();
        }
        tooltipContent = tooltipBranches;
        break;
      case 'decks':
        if (tooltipDecks.length === 0) {
          await loadTooltipDecks();
        }
        tooltipContent = tooltipDecks;
        break;
      case 'resources':
        if (tooltipResources.length === 0) {
          await loadTooltipResources();
        }
        tooltipContent = tooltipResources;
        break;
    }
  }

  function hideTooltip() {
    // Add a small delay before hiding to allow mouse to move to tooltip
    hoverTimeout = setTimeout(() => {
      showTooltip = false;
    }, 150);
  }

  function keepTooltipVisible() {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
      hoverTimeout = null;
    }
  }

  // Content modal functions
  function openContentModal(type) {
    switch (type) {
      case 'notes':
        showNotesModal = true;
        loadNotes();
        break;
      case 'branches':
        showBranchesModal = true;
        break;
      case 'decks':
        showDecksModal = true;
        break;
      case 'resources':
        showResourcesModal = true;
        break;
    }
    hideTooltip();
  }

  function closeContentModal(type) {
    switch (type) {
      case 'notes':
        showNotesModal = false;
        showNoteEditor = false;
        editingNote = null;
        newNoteContent = '';
        break;
      case 'branches':
        showBranchesModal = false;
        break;
      case 'decks':
        showDecksModal = false;
        break;
      case 'resources':
        showResourcesModal = false;
        break;
    }
  }

  // Notes management functions
  async function loadNotes() {
    if (!editedCard?.id) return;
    
    try {
      const response = await fetch(`/api/cards/${editedCard.id}/notes`);
      if (response.ok) {
        notes = await response.json();
      } else {
        console.error('Failed to load notes');
        notes = [];
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      notes = [];
    }
  }

  function startNewNote() {
    editingNote = null;
    newNoteContent = '';
    showNoteEditor = true;
  }

  function startEditNote(note) {
    editingNote = note;
    newNoteContent = note.content;
    showNoteEditor = true;
  }

  function cancelNoteEdit() {
    editingNote = null;
    newNoteContent = '';
    showNoteEditor = false;
  }

  async function saveNote() {
    if (!newNoteContent.trim()) return;
    
    try {
      const url = editingNote 
        ? `/api/cards/${editedCard.id}/notes/${editingNote.id}`
        : `/api/cards/${editedCard.id}/notes`;
      
      const method = editingNote ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent.trim() })
      });
      
      if (response.ok) {
        await loadNotes(); // Reload notes
        // Clear tooltip cache so it refreshes next time
        tooltipNotes = [];
        cancelNoteEdit();
      } else {
        console.error('Failed to save note');
        alert('Failed to save note');
      }
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Error saving note');
    }
  }

  async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) return;
    
    try {
      const response = await fetch(`/api/cards/${editedCard.id}/notes/${noteId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await loadNotes(); // Reload notes
        // Clear tooltip cache so it refreshes next time
        tooltipNotes = [];
      } else {
        console.error('Failed to delete note');
        alert('Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Error deleting note');
    }
  }

  // Markdown editor event handlers
  function handleMarkdownContentChange(event) {
    newNoteContent = event.detail.content;
  }

  function handleMarkdownFullscreenToggle(event) {
    isFullScreen = event.detail.isFullScreen;
  }

  function handleMarkdownPreviewToggle(event) {
    showPreview = event.detail.showPreview;
  }

  function handleMarkdownSplitToggle(event) {
    showSplitView = event.detail.showSplitView;
  }

  // Tooltip data loading functions
  async function loadTooltipNotes() {
    if (!editedCard?.id) return;
    
    try {
      const response = await fetch(`/api/cards/${editedCard.id}/notes`);
      if (response.ok) {
        const notes = await response.json();
        // Create short excerpts (first 100 characters) for tooltip display
        tooltipNotes = notes.map(note => {
          const excerpt = note.content.length > 100 
            ? note.content.substring(0, 100) + '...'
            : note.content;
          return excerpt;
        });
      } else {
        tooltipNotes = [];
      }
    } catch (error) {
      console.error('Error loading tooltip notes:', error);
      tooltipNotes = [];
    }
  }

  async function loadTooltipBranches() {
    // TODO: Implement when branches system is ready
    tooltipBranches = ['Character Development Branch', 'World Building Branch', 'Plot Twist Branch'];
  }

  async function loadTooltipDecks() {
    // TODO: Implement when decks system is ready
    tooltipDecks = ['Main Story Deck', 'Character Arcs Deck', 'World Building Deck'];
  }

  async function loadTooltipResources() {
    // TODO: Implement when resources system is ready
    tooltipResources = [
      { name: 'Character Concept Art', type: 'image', icon: '🎨' },
      { name: 'Voice Recording Sample', type: 'audio', icon: '🎵' },
      { name: 'World Map Video', type: 'video', icon: '🎬' }
    ];
  }

  // Simple markdown rendering function
  function renderMarkdown(text) {
    if (!text) return '';
    
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      .replace(/\n/gim, '<br>');
  }
</script>

{#if isOpen && editedCard}
  <!-- Background -->
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" on:click={closeModal}>
    
    <!-- Just the Card -->
    <div 
      class="card-container relative transition-all duration-200"
      style="width: 500px; height: 700px;"
      on:click|stopPropagation
    >
      <!-- Card Frame -->
      <div 
        class="card-frame border-2 rounded-lg h-full flex flex-col"
        style="
          border-color: {rarity.borderColor};
          background-color: {darkMode ? rarity.bgColorDark : rarity.bgColor};
          color: {darkMode ? rarity.textColorDark : rarity.textColor};
        "
      >

        <!-- Header: Title -->
        <div class="{isEditing ? 'mb-2' : 'mb-4'} px-4 {isEditing ? 'pt-2' : 'pt-4'}">
          {#if isEditing}
            <input
              bind:value={title}
              class="w-full text-lg font-bold bg-transparent border-none outline-none"
              style:color={darkMode ? '#f9fafb' : '#111827'}
              placeholder="Card title..."
            />
          {:else}
            <h3 class="text-lg font-bold leading-tight" style:color={darkMode ? '#f9fafb' : '#111827'}>
              {editedCard.title}
            </h3>
          {/if}
        </div>

        <!-- Art Area -->
        <div 
          class="art-area mb-4 mx-4 rounded-md flex items-center justify-center relative group" 
          style="height: 256px;"
        >
          <!-- Mana Cost - Top Right -->
          {#if editedCard?.rarity === 'common'}
            <!-- Common cards with green gem socket -->
            <div class="absolute -top-3 -right-2 z-10 w-12 h-12">
              <img 
                src="/sockets/gem-socket-green.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else if editedCard?.rarity === 'special'}
            <!-- Special cards with blue gem socket -->
            <div class="absolute -top-3 -right-2 z-10 w-10 h-13">
              <img 
                src="/sockets/gem-socket-blue.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else if editedCard?.rarity === 'rare'}
            <!-- Rare cards with purple gem socket -->
            <div class="absolute -top-4 -right-3 z-10 w-14 h-14">
              <img 
                src="/sockets/gem-socket-purple.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else if editedCard?.rarity === 'legendary'}
            <!-- Legendary cards with orange gem socket -->
            <div class="absolute -top-3 -right-2 z-10 w-12 h-12">
              <img 
                src="/sockets/gem-socket-orange.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center -mt-0.5">
                <span class="text-white font-bold text-xs">{manaCost}</span>
              </div>
            </div>
          {:else}
            <!-- Other rarities with white background -->
            <div 
              class="absolute -top-2 -right-2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold"
              style:background-color={darkMode ? '#ffffff' : '#ffffff'} 
              style:color={rarity.textColor}
            >
              <span>{manaCost}</span>
            </div>
          {/if}

          <!-- Art Image (always show default or custom art) -->
          <img 
            src={artUrl || editedCard.art_url || '/wiskr-art-default.webp'} 
            alt="Card art" 
            class="w-full h-full object-cover rounded-md" 
          />
          
          <!-- Art Edit Button - Bottom Right Corner -->
          <button
            class="absolute bottom-2 right-2 flex items-center gap-2 px-3 py-2 rounded-full bg-black/50 hover:bg-black/70 transition-all cursor-pointer"
            on:click={handleGenerateArt}
            title="Replace art"
          >
            <span class="text-white text-sm font-medium">Replace Art</span>
            <Palette size="16" class="text-white" />
          </button>
          
          <!-- Art Feedback Button - Bottom Left Corner (only show if custom art) -->
          {#if artUrl || editedCard.art_url}
            <button
              class="absolute bottom-2 left-2 p-2 rounded-full bg-orange-500/50 hover:bg-orange-500/70 transition-all cursor-pointer"
              on:click={() => reportBadArt(artUrl || editedCard.art_url)}
              title="Report art issue"
            >
              <Flag size="16" class="text-white" />
            </button>
          {/if}
        </div>

        <!-- Tags -->
        <div class="px-4 mb-4">
          {#if isEditing}
            <div class="space-y-2">
              <div class="flex flex-wrap gap-1">
                {#each tags as tag}
                  <span class="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-md">
                    {tag}
                    <button on:click={() => removeTag(tag)} class="text-gray-500 hover:text-red-500">
                      ×
                    </button>
                  </span>
                {/each}
              </div>
              <div class="flex gap-2">
                <input
                  id="new-tag"
                  bind:value={newTag}
                  on:keydown={handleKeydown}
                  class="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                  placeholder="Add tag..."
                />
                <button on:click={addTag} class="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                  Add
                </button>
              </div>
            </div>
          {:else}
            <div class="flex flex-wrap gap-1">
              {#each editedCard.tags as tag}
                <span class="px-1.5 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 rounded-md">
                  {tag}
                </span>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Content -->
        <div class="flex-1 px-4 mb-4">
          {#if isEditing}
            <textarea
              bind:value={content}
              class="w-full h-40 text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded resize-none"
              placeholder="Card content..."
            ></textarea>
          {:else}
            <div class="text-sm leading-tight" style:color={darkMode ? '#d1d5db' : '#374151'}>
              {editedCard.content}
            </div>
          {/if}
        </div>

        <!-- Link Buttons -->
        <div class="px-4 mb-3">
          <div class="flex items-center justify-between text-xs">
            <button
              class="underline hover:no-underline cursor-pointer transition-all duration-200 hover:opacity-80"
              style:color={darkMode ? '#9ca3af' : '#6b7280'}
              on:click={() => openContentModal('notes')}
              on:mouseenter={(e) => showTooltipForType('notes', e)}
              on:mouseleave={hideTooltip}
            >
              Notes
            </button>
            <button
              class="underline hover:no-underline cursor-pointer transition-all duration-200 hover:opacity-80"
              style:color={darkMode ? '#9ca3af' : '#6b7280'}
              on:click={() => openContentModal('branches')}
              on:mouseenter={(e) => showTooltipForType('branches', e)}
              on:mouseleave={hideTooltip}
            >
              Branches
            </button>
            <button
              class="underline hover:no-underline cursor-pointer transition-all duration-200 hover:opacity-80"
              style:color={darkMode ? '#9ca3af' : '#6b7280'}
              on:click={() => openContentModal('decks')}
              on:mouseenter={(e) => showTooltipForType('decks', e)}
              on:mouseleave={hideTooltip}
            >
              Decks
            </button>
            <button
              class="underline hover:no-underline cursor-pointer transition-all duration-200 hover:opacity-80"
              style:color={darkMode ? '#9ca3af' : '#6b7280'}
              on:click={() => openContentModal('resources')}
              on:mouseenter={(e) => showTooltipForType('resources', e)}
              on:mouseleave={hideTooltip}
            >
              Resources
            </button>
          </div>
        </div>

        <!-- Bottom Bar: Rarity and Progress -->
        <div class="bottom-bar flex items-center justify-between px-4 mb-4">
          <!-- Rarity -->
          <div class="flex items-center">
            <!-- Left Arrow (Upgrade) -->
            <div class="w-6 flex justify-center">
              {#if editedCard.rarity !== 'legendary'}
                <button 
                  class="text-lg font-bold opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  on:click={handleRarityUpgrade}
                  title="Upgrade rarity"
                  style:color={darkMode ? '#ffffff' : '#000000'}
                >
                  ↑
                </button>
              {/if}
            </div>
            
            <!-- Rarity Label -->
            <span 
              class="text-sm font-bold uppercase bg-white dark:bg-white rounded px-2 py-1 mx-2"
              style:color={rarity.textColor}
            >
              {editedCard.rarity}
            </span>
            
            <!-- Right Arrow (Downgrade) -->
            <div class="w-6 flex justify-center">
              {#if editedCard.rarity !== 'common'}
                <button 
                  class="text-lg font-bold opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  on:click={handleRarityDowngrade}
                  title="Downgrade rarity"
                  style:color={darkMode ? '#ffffff' : '#000000'}
                >
                  ↓
                </button>
              {/if}
            </div>
          </div>

          <!-- Progress Stars -->
          <div class="flex flex-col items-center gap-1">
            <!-- Stars -->
            <div class="flex items-center gap-1">
              {#each progressLevels as level}
                <button
                  class="transition-colors hover:scale-110 cursor-pointer"
                  on:click={() => handleProgressClick(level.level)}
                  title="Set to {level.name} ({level.level} star{level.level > 1 ? 's' : ''})"
                  style:color={editedCard.progress >= level.level ? '#ffffff' : (darkMode ? '#4b5563' : '#d1d5db')}
                >
                  <Star size="16" class="fill-current" />
                </button>
              {/each}
            </div>
            
            <!-- Progress Level Label -->
            <div class="text-xs font-medium uppercase" style:color={darkMode ? '#d1d5db' : '#374151'}>
              {progressLevels.find(level => level.level === editedCard.progress)?.name || 'Raw'}
            </div>
          </div>
        </div>

        <!-- Action Buttons with Metadata -->
        <div class="action-buttons flex items-center justify-between pl-4 pr-2 py-2 border-t" style:border-color={darkMode ? '#4b5563' : '#e5e7eb'}>
          <!-- Metadata Section -->
          <div class="flex items-center gap-6 text-xs" style:color={darkMode ? '#9ca3af' : '#6b7280'}>
            <!-- Generation info -->
            <div class="flex flex-col">
              <div>{getGenerationLabel()}</div>
              <div class="italic">{formatDate(editedCard.created_at)}</div>
            </div>
            
            <!-- Art info -->
            <div class="flex flex-col">
              <div>{getArtLabel()}</div>
              <div class="italic">{formatDate(editedCard.created_at)}</div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="flex items-center gap-1">
            {#if isEditing}
              <button
                class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
                on:click={saveCard}
                title="Save changes"
                style:color={darkMode ? '#ffffff' : rarity.textColor}
              >
                <Save size="20" />
              </button>
              <button
                class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
                on:click={cancelEditing}
                title="Cancel editing"
                style:color={darkMode ? '#ffffff' : rarity.textColor}
              >
                <XCircle size="20" />
              </button>
            {:else}
              <button
                class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
                on:click={startEditing}
                title="Edit card"
                style:color={darkMode ? '#ffffff' : rarity.textColor}
              >
                <Pencil size="20" />
              </button>
              <button
                class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
                on:click={deleteCard}
                title="Delete card"
                style:color={darkMode ? '#ffffff' : rarity.textColor}
              >
                <Trash size="20" />
              </button>
            {/if}
            <button
              class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
              on:click={handleSplit}
              title="Split card"
              style:color={darkMode ? '#ffffff' : rarity.textColor}
            >
              <Split size="20" />
            </button>
            <button
              class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
              on:click={handleMerge}
              title="Merge cards"
              style:color={darkMode ? '#ffffff' : rarity.textColor}
            >
              <Merge size="20" />
            </button>
            <button
              class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
              on:click={togglePin}
              title="Pin card"
              style:color={darkMode ? '#ffffff' : rarity.textColor}
            >
              {#if editedCard.pinned}
                <PinOff size="20" />
              {:else}
                <Pin size="20" class="fill-current" />
              {/if}
            </button>
            <button
              class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
              on:click={closeModal}
              title="Close card"
              style:color={darkMode ? '#ffffff' : rarity.textColor}
            >
              <X size="20" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Tooltip -->
  {#if showTooltip}
    <div 
      class="fixed z-[10000] bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 rounded-lg shadow-lg p-3 max-w-xs border border-gray-700 dark:border-gray-600 cursor-pointer hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
      style:left="{tooltipPosition.x}px" style:top="{tooltipPosition.y}px" style:transform="translateX(-50%) translateY(-100%)"
      on:mouseenter={keepTooltipVisible}
      on:mouseleave={hideTooltip}
      on:click={() => openContentModal(tooltipType)}
    >
      <div class="text-sm font-medium mb-2 capitalize text-white dark:text-gray-100">{tooltipType}</div>
      
      {#if tooltipType === 'notes'}
        <div class="space-y-1">
          {#each tooltipContent as note, index}
            <div class="text-xs text-gray-300 dark:text-gray-300 truncate">
              {index + 1}. {note}
            </div>
          {/each}
        </div>
      {:else if tooltipType === 'branches'}
        <div class="space-y-1">
          {#each tooltipContent as branch}
            <div class="text-xs text-gray-300 dark:text-gray-300">
              • {branch}
            </div>
          {/each}
        </div>
      {:else if tooltipType === 'decks'}
        <div class="space-y-1 max-h-32 overflow-y-auto">
          {#each tooltipContent as deck}
            <div class="text-xs text-gray-300 dark:text-gray-300">
              • {deck}
            </div>
          {/each}
        </div>
      {:else if tooltipType === 'resources'}
        <div class="space-y-1">
          {#each tooltipContent as resource}
            <div class="text-xs text-gray-300 dark:text-gray-300 flex items-center gap-2">
              <span>{resource.icon}</span>
              <span>{resource.name}</span>
            </div>
          {/each}
        </div>
      {/if}
      
      <div class="mt-2 pt-2 border-t border-gray-700 dark:border-gray-600">
        <div class="text-xs text-gray-400 dark:text-gray-400 text-center">
          Click to edit
        </div>
      </div>
    </div>
  {/if}
{/if}

<!-- Art Manager Modal -->
<ArtManager 
  bind:isOpen={showArtManager}
  {card}
  currentArtUrl={artUrl}
  on:art-selected={handleArtSelected}
  on:close={closeArtManager}
/>

<!-- Notes Modal -->
{#if showNotesModal}
  <div class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" on:mousedown={() => closeContentModal('notes')}>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" on:mousedown|stopPropagation>
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Notes for {editedCard?.title || 'Card'}</h3>
        <button
          class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          on:click={() => closeContentModal('notes')}
        >
          <X size="20" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-hidden flex flex-col">
        {#if showNoteEditor}
          <!-- Note Editor -->
          <div class="flex-1 flex flex-col p-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-md font-medium text-gray-900 dark:text-white">
                {editingNote ? 'Edit Note' : 'New Note'}
              </h4>
              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  on:click={cancelNoteEdit}
                >
                  Cancel
                </button>
                <button
                  class="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                  on:click={saveNote}
                  disabled={!newNoteContent.trim()}
                >
                  {editingNote ? 'Update Note' : 'Save Note'}
                </button>
              </div>
            </div>
            
            <!-- Markdown Editor -->
            <div class="flex-1 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden" style="min-height: 400px;">
              <MarkdownEditor
                content={newNoteContent}
                placeholder="Enter your note content here... (supports markdown)"
                bind:isFullScreen
                bind:showPreview
                bind:showSplitView
                on:content-change={handleMarkdownContentChange}
                on:fullscreen-toggle={handleMarkdownFullscreenToggle}
                on:preview-toggle={handleMarkdownPreviewToggle}
                on:split-toggle={handleMarkdownSplitToggle}
              />
            </div>
          </div>
        {:else}
          <!-- Notes List -->
          <div class="flex-1 overflow-y-auto p-6">
            <div class="flex items-center justify-between mb-4">
              <h4 class="text-md font-medium text-gray-900 dark:text-white">
                Notes ({notes.length})
              </h4>
              <button
                class="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                on:click={startNewNote}
              >
                <Plus size="16" />
                Add Note
              </button>
            </div>
            
            {#if notes.length === 0}
              <div class="text-center py-12">
                <div class="text-gray-400 dark:text-gray-500 mb-4">
                  <Flag size="48" class="mx-auto" />
                </div>
                <p class="text-gray-500 dark:text-gray-400 mb-4">No notes yet</p>
                <button
                  class="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                  on:click={startNewNote}
                >
                  Add your first note
                </button>
              </div>
            {:else}
              <div class="space-y-4">
                {#each notes as note (note.id)}
                  <div 
                    class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                    on:click={() => startEditNote(note)}
                    role="button"
                    tabindex="0"
                    on:keydown={(e) => e.key === 'Enter' && startEditNote(note)}
                  >
                    <div class="flex items-start justify-between mb-2">
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.created_at).toLocaleDateString()} at {new Date(note.created_at).toLocaleTimeString()}
                      </div>
                      <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          on:click|stopPropagation={() => startEditNote(note)}
                          title="Edit note"
                        >
                          <Edit3 size="14" />
                        </button>
                        <button
                          class="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          on:click|stopPropagation={() => deleteNote(note.id)}
                          title="Delete note"
                        >
                          <Trash2 size="14" />
                        </button>
                      </div>
                    </div>
                    <div class="prose prose-sm max-w-none dark:prose-invert">
                      {@html renderMarkdown(note.content)}
                    </div>
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Branches Modal -->
{#if showBranchesModal}
  <div class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" on:click={() => closeContentModal('branches')}>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" on:click|stopPropagation>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Branches for {editedCard?.title || 'Card'}</h3>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            on:click={() => closeContentModal('branches')}
          >
            <X size="20" />
          </button>
        </div>
        <div class="space-y-2">
          {#each tooltipContent as branch}
            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <span class="text-sm text-gray-900 dark:text-white">{branch}</span>
              <button class="text-blue-500 hover:text-blue-600 text-sm">View</button>
            </div>
          {/each}
        </div>
        <div class="mt-4 flex justify-end">
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            on:click={() => closeContentModal('branches')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Decks Modal -->
{#if showDecksModal}
  <div class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" on:click={() => closeContentModal('decks')}>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" on:click|stopPropagation>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Decks for {editedCard?.title || 'Card'}</h3>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            on:click={() => closeContentModal('decks')}
          >
            <X size="20" />
          </button>
        </div>
        <div class="space-y-2 max-h-96 overflow-y-auto">
          {#each tooltipContent as deck}
            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <span class="text-sm text-gray-900 dark:text-white">{deck}</span>
              <button class="text-blue-500 hover:text-blue-600 text-sm">View</button>
            </div>
          {/each}
        </div>
        <div class="mt-4 flex justify-end">
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            on:click={() => closeContentModal('decks')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Resources Modal -->
{#if showResourcesModal}
  <div class="fixed inset-0 z-[10001] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" on:click={() => closeContentModal('resources')}>
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden" on:click|stopPropagation>
      <div class="p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Resources for {editedCard?.title || 'Card'}</h3>
          <button
            class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            on:click={() => closeContentModal('resources')}
          >
            <X size="20" />
          </button>
        </div>
        <div class="space-y-2">
          {#each tooltipContent as resource}
            <div class="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-between">
              <div class="flex items-center gap-3">
                <span class="text-lg">{resource.icon}</span>
                <span class="text-sm text-gray-900 dark:text-white">{resource.name}</span>
              </div>
              <button class="text-blue-500 hover:text-blue-600 text-sm">Open</button>
            </div>
          {/each}
        </div>
        <div class="mt-4 flex justify-end">
          <button
            class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            on:click={() => closeContentModal('resources')}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Art Feedback Modal -->
<ArtFeedbackModal
  bind:isOpen={showFeedbackModal}
  artUrl={feedbackArtUrl}
  cardId={card?.id}
  cardTitle={card?.title}
  on:submit={handleFeedbackSubmit}
  on:close={closeFeedbackModal}
/>

<style>
  .card-container {
    transform-style: preserve-3d;
  }
  
  .card-frame {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
</style>