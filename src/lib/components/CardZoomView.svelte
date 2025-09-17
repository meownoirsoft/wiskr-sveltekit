<!-- CardZoomView.svelte - Large zoomed-in card view for editing -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { Pin, PinOff, Pencil, Trash, Star, Ungroup, Combine, Palette, X, Save, XCircle, Flag, Plus, Edit3, Trash2, ChevronsUp, ChevronsDown, Users } from 'lucide-svelte';
  import MergeModal from './MergeModal.svelte';
  import SplitModal from './SplitModal.svelte';
  import ArtManager from './ArtManager.svelte';
  import ArtFeedbackModal from './modals/ArtFeedbackModal.svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import WizardsCouncilModal from './WizardsCouncilModal.svelte';

  export let card = null;
  export let isOpen = false;
  export let userPreferences = { display_name: null };
  export let availableModels = [];
  export let userTier = 0;
  export let effectiveTier = 0;
  export let user = null;
  export let worldId = null;

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
      textColor: '#CA4A11',
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
  let tooltipLoading = false;
  
  
  // Tooltip data cache
  let tooltipNotes = [];
  let tooltipDecks = [];
  let tooltipResources = [];
  
  // Progress tooltip state
  let showProgressTooltip = false;
  let progressTooltipElement = null;
  
  // Markdown editor state
  let isFullScreen = false;
  
  // Modal states
  let showNotesModal = false;
  let showDecksModal = false;
  let showResourcesModal = false;
  let showFeedbackModal = false;
  let feedbackArtUrl = '';
  let showMergeModal = false;
  let showSplitModal = false;
  let showWizardsCouncil = false;
  
  // Notes management state
  let notes = [];
  let notesCount = 0;
  let decksCount = 0;
  let resourcesCount = 0;
  let editingNote = null;
  let newNoteContent = '';
  let showNoteEditor = false;
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
    // Load counts for the card after editedCard is set
    loadCounts();
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

    console.log('Saving content:', content);

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

    console.log('Updated card:', updatedCard);
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

  function handleBackgroundClick(event) {
    // Only close modal if not in edit mode
    if (!isEditing) {
      closeModal();
    }
  }

  function handleRarityUpgrade() {
    const rarities = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarities.indexOf(editedCard.rarity);
    if (currentIndex < rarities.length - 1) {
      editedCard.rarity = rarities[currentIndex + 1];
      // Update the card prop so modals get the updated data
      card = { ...card, rarity: editedCard.rarity };
      dispatch('rarity-updated', { card, rarity: editedCard.rarity });
    }
  }

  function handleRarityDowngrade() {
    const rarities = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarities.indexOf(editedCard.rarity);
    if (currentIndex > 0) {
      editedCard.rarity = rarities[currentIndex - 1];
      // Update the card prop so modals get the updated data
      card = { ...card, rarity: editedCard.rarity };
      dispatch('rarity-updated', { card, rarity: editedCard.rarity });
    }
  }

  function handleProgressClick(targetLevel) {
    editedCard.progress = targetLevel;
    // Update the card prop so modals get the updated data
    card = { ...card, progress: targetLevel };
    dispatch('progress-updated', { card, progress: targetLevel });
  }

  function togglePin() {
    editedCard.pinned = !editedCard.pinned;
    dispatch('toggle-pin', { card });
  }

  function addTag() {
    if (newTag.trim()) {
      // Split by comma and process each tag
      const newTags = newTag.split(',').map(tag => tag.trim()).filter(tag => tag);
      
      // Add only tags that don't already exist
      const uniqueNewTags = newTags.filter(tag => !tags.includes(tag));
      
      if (uniqueNewTags.length > 0) {
        tags = [...tags, ...uniqueNewTags];
      }
      
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
    showMergeModal = true;
  }

  function closeMergeModal() {
    showMergeModal = false;
  }

  function handleSaveCard(event) {
    // Handle saving a new card from combine operations
    dispatch('save-card', event.detail);
  }

  function handleSplit() {
    showSplitModal = true;
  }

  function closeSplitModal() {
    showSplitModal = false;
  }

  function handleSplitSaveCard(event) {
    // Handle saving distilled cards and close the distill modal
    dispatch('save-card', event.detail);
    showSplitModal = false;
    // Close the zoom view after successful split operation to show the reload effect
    dispatch('close');
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
    
    // Position all tooltips above their buttons
    const x = rect.left + rect.width / 2;
    const y = rect.top - 10;
    
    tooltipPosition = { x, y };
    tooltipType = type;
    tooltipLoading = true;
    showTooltip = true;
    
    // Load real data based on type
    switch (type) {
      case 'notes':
        if (tooltipNotes.length === 0) {
          await loadTooltipNotes();
        }
        tooltipContent = tooltipNotes;
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
    
    tooltipLoading = false;
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

  // Progress tooltip handlers
  function handleProgressHover(event) {
    showProgressTooltip = true;
    progressTooltipElement = event.currentTarget;
  }

  function handleProgressLeave() {
    showProgressTooltip = false;
    progressTooltipElement = null;
  }


  // Markdown rendering function
  function renderMarkdown(text) {
    if (!text) return '';
    // Simple markdown rendering
    return text
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2">$1</a>')
      .replace(/\n/gim, '<br>');
  }

  // Content modal functions
  function openContentModal(type) {
    switch (type) {
      case 'notes':
        showNotesModal = true;
        loadNotes();
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

  function openDeckView(deckId, deckName) {
    // Dispatch event to parent to open deck view
    dispatch('open-deck', { 
      deckId, 
      deckName
    });
  }

  function closeContentModal(type) {
    switch (type) {
      case 'notes':
        showNotesModal = false;
        showNoteEditor = false;
        editingNote = null;
        newNoteContent = '';
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
        notesCount = notes.length;
      } else {
        console.error('Failed to load notes');
        notes = [];
        notesCount = 0;
      }
    } catch (error) {
      console.error('Error loading notes:', error);
      notes = [];
      notesCount = 0;
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

  function handleWizardSelected(event) {
    const { wizard } = event.detail;
    console.log('🧙‍♂️ Wizard selected:', wizard);
    
    // Dispatch event to parent to handle wizard selection and chat opening
    dispatch('wizard-selected', { wizard });
  }

  function handleCardZoom(event) {
    // Open zoom view with the selected card from Wizard's Council
    const selectedCard = event.detail.card;
    if (selectedCard) {
      // Close the Wizard's Council modal first
      showWizardsCouncil = false;
      // Dispatch event to parent to open zoom view with the selected card
      dispatch('zoom-card', { card: selectedCard });
    }
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


  async function loadTooltipDecks() {
    if (!editedCard?.id) return;
    
    try {
      const response = await fetch(`/api/cards/${editedCard.id}/decks`);
      if (response.ok) {
        const decks = await response.json();
        tooltipDecks = decks;
      } else {
        tooltipDecks = [];
      }
    } catch (error) {
      console.error('Error loading tooltip decks:', error);
      tooltipDecks = [];
    }
  }

  async function loadTooltipResources() {
    // TODO: Implement when resources system is ready
    tooltipResources = [];
  }

  // Load counts for all content types
  async function loadCounts() {
    if (!editedCard?.id) return;
    
    // Load notes count
    try {
      const notesResponse = await fetch(`/api/cards/${editedCard.id}/notes`);
      if (notesResponse.ok) {
        const notesData = await notesResponse.json();
        notesCount = notesData.length;
      }
    } catch (error) {
      console.error('Error loading notes count:', error);
      notesCount = 0;
    }
    
    // Load decks count
    try {
      const decksResponse = await fetch(`/api/cards/${editedCard.id}/decks`);
      if (decksResponse.ok) {
        const decksData = await decksResponse.json();
        decksCount = decksData.length;
      }
    } catch (error) {
      console.error('Error loading decks count:', error);
      decksCount = 0;
    }
    
    // TODO: Load resources counts when their APIs are ready
    resourcesCount = 0;
  }

</script>

{#if isOpen && editedCard}
  <!-- Background -->
  <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" on:click={handleBackgroundClick}>
    
    <!-- Just the Card -->
    <div 
      class="card-container relative transition-all duration-200 z-[99]"
      style="width: 500px; height: 800px;"
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
        <div class="{isEditing ? 'mb-4' : 'mb-4'} -mx-4 {isEditing ? 'pt-2' : 'pt-4'}">
          <div 
            class="title-container relative overflow-hidden mx-4"
            style="background: #E1D5C4; border: 1px solid rgba(0, 0, 0, 0.1); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.2); padding: 4px 16px 4px 8px;"
          >
            {#if isEditing}
              <input
                bind:value={title}
                class="card-title w-full text-lg font-bold bg-transparent border-none outline-none truncate"
                style="color: {rarity.textColor}; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);"
                placeholder="Card title..."
              />
            {:else}
              <h3 
                class="card-title text-lg font-bold leading-tight truncate" 
                style="color: {rarity.textColor}; text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);"
                title={editedCard.title}
              >
                {editedCard.title}
              </h3>
            {/if}
          </div>
        </div>

        <!-- Art Area -->
        <div 
          class="art-area mb-4 mx-3 rounded-md flex items-center justify-center relative group -mt-4 z-20" 
          style="height: 256px;"
        >
          <!-- Mana Cost - Top Right -->
          {#if editedCard?.rarity === 'common'}
            <!-- Common cards with green gem socket -->
            <div class="absolute -top-3 -right-4 z-10 w-12 h-12">
              <img 
                src="/sockets/gem-socket-green.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{manaCost}</span>
              </div>
            </div>
          {:else if editedCard?.rarity === 'special'}
            <!-- Special cards with blue gem socket -->
            <div class="absolute -top-2 -right-3 z-10 w-10 h-13">
              <img 
                src="/sockets/gem-socket-blue.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{manaCost}</span>
              </div>
            </div>
          {:else if editedCard?.rarity === 'rare'}
            <!-- Rare cards with purple gem socket -->
            <div class="absolute -top-2 -right-3 z-10 w-14 h-14">
              <img 
                src="/sockets/gem-socket-purple.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center">
                <span class="text-white font-bold text-sm">{manaCost}</span>
              </div>
            </div>
          {:else if editedCard?.rarity === 'legendary'}
            <!-- Legendary cards with orange gem socket -->
            <div class="absolute -top-2 -right-2 z-10 w-12 h-12">
              <img 
                src="/sockets/gem-socket-orange.webp" 
                alt="Mana socket" 
                class="w-full h-full object-cover rounded-full"
              />
              <div class="absolute inset-0 flex items-center justify-center -mt-0.5">
                <span class="text-white font-bold text-sm">{manaCost}</span>
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

        <!-- Content Area with Tags -->
        <div class="mx-0 mb-4 -mt-2 relative">
          <!-- Main content area -->
          <div 
            class="card-content content-area text-sm leading-tight overflow-hidden relative z-10"
            style="padding: 8px 4px; margin-top: -8px; height: 340px; border-top: 1px solid rgba(0,0,0,0.1); box-shadow: 0 -2px 8px rgba(0,0,0,0.1);"
          >
            <!-- Tags -->
            <div class="h-6 pl-2 mb-2 mt-1 ml-2 mr-2 flex items-center">
              {#if isEditing}
                <div class="flex flex-wrap items-center gap-1">
                  {#each tags as tag}
                    <span 
                      class="card-tags inline-flex items-center gap-1 px-1.5 py-0 text-xs rounded-md flex-shrink-0 whitespace-nowrap"
                      style="background-color: {rarity.textColor}; color: {rarity.bgColor}; opacity: 0.8;"
                    >
                      {tag}
                      <button on:click={() => removeTag(tag)} class="text-gray-500 hover:text-red-500">
                        ×
                      </button>
                    </span>
                  {/each}
                  <div class="flex items-center gap-1 ml-2">
                    <input
                      id="new-tag"
                      bind:value={newTag}
                      on:keydown={handleKeydown}
                      class="w-30 px-1.5 py-0.5 text-xs border border-gray-300 dark:border-gray-600 rounded bg-transparent"
                      placeholder="Add..."
                    />
                    <button on:click={addTag} class="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                      +
                    </button>
                  </div>
                </div>
              {:else}
                {#if editedCard.tags && editedCard.tags.length > 0}
                  <div class="flex gap-1 overflow-hidden whitespace-nowrap">
                    {#each editedCard.tags.slice(0, 4) as tag}
                      <span 
                        class="card-tags text-xs px-1.5 py-0 rounded-md flex-shrink-0 whitespace-nowrap"
                        style="background-color: {rarity.textColor}; color: {rarity.bgColor}; opacity: 0.8;"
                      >
                        {tag}
                      </span>
                    {/each}
                    {#if editedCard.tags.length > 4}
                      <span 
                        class="card-tags text-xs px-1.5 py-0 rounded-md flex-shrink-0 whitespace-nowrap"
                        style="background-color: {rarity.textColor}; color: {rarity.bgColor}; opacity: 0.8;"
                      >
                        +{editedCard.tags.length - 1}
                      </span>
                    {/if}
                  </div>
                {/if}
              {/if}
            </div>

            <!-- Content Text -->
            <div 
              class="line-clamp-12 px-5 mt-1"
              style="color: {rarity.textColor};"
            >
              {#if isEditing}
                <!-- Markdown Editor -->
                <div class="overflow-hidden" style="height: 280px; padding-top: 5px;">
                  <MarkdownEditor
                    content={content}
                    placeholder="Enter your markdown content here..."
                    isFullScreen={false}
                    showPreview={false}
                    showSplitView={false}
                    forceLightMode={true}
                    on:content-change={(e) => {
                      console.log('Content changed:', e.detail);
                      content = e.detail.content;
                    }}
                  />
                </div>
              {:else}
                {@html renderMarkdown(editedCard.content)}
              {/if}
            </div>
          </div>
        </div>


        <!-- Content Links - Below Content -->
        <div class="px-4 mb-4 -mt-3">
          <div class="flex justify-between text-sm">
            <button
              class="underline hover:no-underline cursor-pointer transition-all duration-200 hover:opacity-80 py-1 font-serif"
              style="color: #e1d5c4;"
              on:click={() => openContentModal('notes')}
              on:mouseenter={(e) => showTooltipForType('notes', e)}
              on:mouseleave={hideTooltip}
            >
              Notes {notesCount > 0 ? `(${notesCount})` : ''}
            </button>
            <button
              class="underline hover:no-underline cursor-pointer transition-all duration-200 hover:opacity-80 py-1 font-serif"
              style="color: #e1d5c4;"
              on:click={() => openContentModal('decks')}
              on:mouseenter={(e) => showTooltipForType('decks', e)}
              on:mouseleave={hideTooltip}
            >
              Decks {decksCount > 0 ? `(${decksCount})` : ''}
            </button>
            <button
              class="underline hover:no-underline cursor-pointer transition-all duration-200 hover:opacity-80 py-1 font-serif"
              style="color: #e1d5c4;"
              on:click={() => openContentModal('resources')}
              on:mouseenter={(e) => showTooltipForType('resources', e)}
              on:mouseleave={hideTooltip}
            >
              Resources {resourcesCount > 0 ? `(${resourcesCount})` : ''}
            </button>
          </div>
        </div>

        <!-- Bottom Bar: Rarity and Progress -->
        <div class="absolute bottom-12 left-2 right-2 bottom-bar flex items-center justify-between flex-wrap gap-y-1" style="margin-bottom: 20px; padding-right: 8px;">
          <!-- Rarity -->
          <div class="flex items-center">
            <!-- Left Arrow (Upgrade) -->
            <div class="w-6 flex justify-center">
              {#if editedCard.rarity !== 'legendary'}
                <button 
                  class="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  on:click={handleRarityUpgrade}
                  title="Upgrade rarity"
                >
                  <ChevronsUp size={24} color={darkMode ? '#ffffff' : '#000000'} />
                </button>
              {/if}
            </div>
            
            <!-- Rarity Label -->
            <span 
              class="card-rarity text-sm font-bold uppercase bg-white dark:bg-white rounded px-2 py-1 mx-2 font-serif"
              style:color={rarity.textColor}
            >
              {editedCard.rarity}
            </span>
            
            <!-- Right Arrow (Downgrade) -->
            <div class="w-6 flex justify-center">
              {#if editedCard.rarity !== 'common'}
                <button 
                  class="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  on:click={handleRarityDowngrade}
                  title="Downgrade rarity"
                >
                  <ChevronsDown size={24} color={darkMode ? '#ffffff' : '#000000'} />
                </button>
              {/if}
            </div>
          </div>

          <!-- Progress Stars -->
          <div 
            class="flex flex-col items-center gap-1 relative"
            on:mouseenter={handleProgressHover}
            on:mouseleave={handleProgressLeave}
          >
            <!-- Stars -->
            <div class="flex items-center gap-1">
              {#each progressLevels as level}
                <button
                  class="transition-colors hover:scale-110 cursor-pointer"
                  on:click={() => handleProgressClick(level.level)}
                  title="Set to {level.name} ({level.level} star{level.level > 1 ? 's' : ''})"
                  style:color={editedCard.progress >= level.level ? '#ffffff' : (darkMode ? '#4b5563' : '#d1d5db')}
                >
                  <Star size="18" class="fill-current" />
                </button>
              {/each}
            </div>
            
            <!-- Custom Tooltip -->
            {#if showProgressTooltip}
              <div 
                class="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap z-50"
              >
                {progressLevels.find(level => level.level === editedCard.progress)?.name || 'Raw'} ({editedCard.progress || 1} star{(editedCard.progress || 1) > 1 ? 's' : ''})
              </div>
            {/if}
          </div>
        </div>

        <!-- Action Buttons with Metadata -->
        <div class="action-buttons absolute bottom-2 left-2 right-2 flex items-center justify-between pl-4 pr-2 py-2 border-t" style:border-color={darkMode ? '#4b5563' : '#e5e7eb'}>
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
              on:click={handleMerge}
              title="Combine cards"
              style:color={darkMode ? '#ffffff' : rarity.textColor}
            >
              <Combine size="20" />
            </button>
            <button
              class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
              on:click={handleSplit}
              title="Distill card"
              style:color={darkMode ? '#ffffff' : rarity.textColor}
            >
              <Ungroup size="20" />
            </button>
            <button
              class="p-1 rounded hover:bg-opacity-20 transition-colors cursor-pointer"
              on:click={() => {
                // Open Wizard's Council with current card data
                showWizardsCouncil = true;
                // Close the zoom view when opening Wizard's Council
                dispatch('close');
              }}
              title="Summon The Wizard's Council"
              style:color={darkMode ? '#ffffff' : rarity.textColor}
              style="display: none;"
            >
              <Users size="20" />
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
          {#if tooltipLoading}
            <div class="text-xs text-gray-400 dark:text-gray-500">Loading...</div>
          {:else if tooltipContent && tooltipContent.length > 0}
            {#each tooltipContent as note, index}
              <div class="text-xs text-gray-300 dark:text-gray-300 truncate">
                {index + 1}. {note}
              </div>
            {/each}
          {:else}
            <div class="text-xs text-gray-400 dark:text-gray-500">No notes yet</div>
          {/if}
        </div>
      {:else if tooltipType === 'decks'}
        <div class="space-y-1 max-h-32 overflow-y-auto">
          {#if tooltipLoading}
            <div class="text-xs text-gray-400 dark:text-gray-500">Loading...</div>
          {:else if tooltipContent && tooltipContent.length > 0}
            {#each tooltipContent as deck}
              <div 
                class="flex items-center gap-2 text-xs text-blue-300 dark:text-blue-400 hover:text-blue-200 dark:hover:text-blue-300 cursor-pointer underline hover:no-underline transition-colors"
                on:click={() => openDeckView(deck.id, deck.name)}
                on:click|stopPropagation
              >
                <svg class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
                <span class="truncate">{deck.name}</span>
              </div>
            {/each}
          {:else}
            <div class="text-xs text-gray-400 dark:text-gray-500">No decks yet</div>
          {/if}
        </div>
      {:else if tooltipType === 'resources'}
        <div class="space-y-1">
          {#if tooltipLoading}
            <div class="text-xs text-gray-400 dark:text-gray-500">Loading...</div>
          {:else if tooltipContent && tooltipContent.length > 0}
            {#each tooltipContent as resource}
              <div class="text-xs text-gray-300 dark:text-gray-300 flex items-center gap-2">
                <span>{resource.icon}</span>
                <span>{resource.name}</span>
              </div>
            {/each}
          {:else}
            <div class="text-xs text-gray-400 dark:text-gray-500">No resources yet</div>
          {/if}
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
  projectId={card?.project_id}
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
        <h3 class="font-logo text-lg font-semibold text-gray-900 dark:text-white">Notes for {editedCard?.title || 'Card'}</h3>
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
              <h4 class="font-logo text-md font-medium text-gray-900 dark:text-white">
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
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
                <span class="text-sm text-gray-900 dark:text-white">{deck.name}</span>
              </div>
              <button 
                class="text-blue-500 hover:text-blue-600 text-sm"
                on:click={() => openDeckView(deck.id, deck.name)}
              >
                View
              </button>
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

<!-- Merge Modal -->
<MergeModal
  bind:isOpen={showMergeModal}
  sourceCard={card}
  projectId={card?.project_id}
  on:close={closeMergeModal}
  on:save-card={handleSaveCard}
/>

<!-- Split Modal -->
<SplitModal
  bind:isOpen={showSplitModal}
  sourceCard={card}
  projectId={card?.project_id}
  on:close={closeSplitModal}
  on:save-card={handleSplitSaveCard}
/>

        <!-- Wizard's Council Modal -->
        <WizardsCouncilModal
          bind:isVisible={showWizardsCouncil}
          {effectiveTier}
          {user}
          {userTier}
          {worldId}
          {card}
          on:wizard-selected={handleWizardSelected}
          on:card-zoom={handleCardZoom}
          on:close={() => showWizardsCouncil = false}
        />


<style>
  .card-container {
    transform-style: preserve-3d;
  }
  
  .card-frame {
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }
  
</style>