<!-- DeckView.svelte - Shows cards organized in deck sections -->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { X, Plus, Layers, ArrowLeft, Trash2, ChevronDown, ChevronUp, ChevronRight, Minimize2, Maximize2 } from 'lucide-svelte';
  import Card from './Card.svelte';
  import CardZoomView from './CardZoomView.svelte';
  import { v4 as uuidv4 } from 'uuid';

  export let deck = null;
  export let cards = [];
  export let isOpen = false;
  export let projectId = null;
  export let userPreferences = { display_name: null }; // User preferences


  const dispatch = createEventDispatcher();

  let showCardZoom = false;
  let zoomedCard = null;
  let sections = [];
  let draggedCard = null;
  let dragOverSection = null;
  let dragOverIndex = -1;
  let autoScrollInterval = null;
  let mouseY = 0;
  let editingSection = null;
  let editingSectionName = '';
  let showCardLibrary = false;
  let availableCards = [];
  let showBranchingPaths = false;
  let branchConnections = [];
  let allSectionsCollapsed = false;
  let sectionCollapsedStates = {};

  // Set up global drag prevention and cleanup
  onMount(() => {
    // Prevent default drag behavior on document to avoid tab switching
    const preventDefaultDrag = (e) => {
      e.preventDefault();
    };
    
    document.addEventListener('dragover', preventDefaultDrag);
    document.addEventListener('drop', preventDefaultDrag);
    
    // Cleanup function
    return () => {
      document.removeEventListener('dragover', preventDefaultDrag);
      document.removeEventListener('drop', preventDefaultDrag);
    };
  });

  // Cleanup auto-scroll interval when component is destroyed
  onDestroy(() => {
    stopAutoScroll();
  });

  // Initialize sections when deck changes
  $: if (deck) {
    // Use deck sections from database
    if (deck.sections && deck.sections.length > 0) {
      sections = deck.sections;
    } else {
      // If no sections exist, create default ones
      sections = [
        { id: 'temp-1', name: 'Opening', cards: [] },
        { id: 'temp-2', name: 'Development', cards: [] },
        { id: 'temp-3', name: 'Climax', cards: [] },
        { id: 'temp-4', name: 'Resolution', cards: [] }
      ];
    }
  }

  // Force reactivity for collapse states
  $: console.log('🔍 Collapse state changed - allSectionsCollapsed:', allSectionsCollapsed, 'sectionCollapsedStates:', sectionCollapsedStates);
  
  // Create a reactive variable to force re-evaluation of section collapse states
  $: sectionCollapseStates = sectionCollapsedStates;
  $: allCollapsed = allSectionsCollapsed;
  
  // Create a reactive object that maps section IDs to their collapsed state
  $: sectionCollapsedMap = sections.reduce((acc, section) => {
    acc[section.id] = allCollapsed || sectionCollapseStates[section.id] || false;
    return acc;
  }, {});
  
  $: console.log('🔍 sectionCollapsedMap updated:', sectionCollapsedMap);

  // Collapse/Expand functionality
  function collapseAllSections() {
    // Prevent duplicate calls during drag
    if (allSectionsCollapsed) {
      console.log('🔍 collapseAllSections called but already collapsed - skipping');
      return;
    }
    console.log('🔍 collapseAllSections called');
    allSectionsCollapsed = true;
    sectionCollapsedStates = {};
    sections.forEach(section => {
      sectionCollapsedStates[section.id] = true;
    });
    console.log('🔍 After collapseAllSections - allSectionsCollapsed:', allSectionsCollapsed, 'sectionCollapsedStates:', sectionCollapsedStates);
  }

  function expandAllSections() {
    console.log('🔍 expandAllSections called');
    allSectionsCollapsed = false;
    sectionCollapsedStates = {};
    sections.forEach(section => {
      sectionCollapsedStates[section.id] = false;
    });
    console.log('🔍 After expandAllSections - allSectionsCollapsed:', allSectionsCollapsed, 'sectionCollapsedStates:', sectionCollapsedStates);
  }

  function toggleSectionCollapse(sectionId) {
    console.log('🔍 toggleSectionCollapse called for:', sectionId, 'current state:', sectionCollapsedStates[sectionId]);
    sectionCollapsedStates[sectionId] = !sectionCollapsedStates[sectionId];
    console.log('🔍 After toggle - new state:', sectionCollapsedStates[sectionId]);
  }

  function isSectionCollapsed(sectionId) {
    const collapsed = allCollapsed || sectionCollapseStates[sectionId] || false;
    console.log('🔍 isSectionCollapsed:', sectionId, 'allCollapsed:', allCollapsed, 'sectionState:', sectionCollapseStates[sectionId], 'result:', collapsed);
    return collapsed;
  }


  // Calculate available cards (cards not in any section)
  $: {
    const assignedCardIds = new Set();
    sections.forEach(section => {
      section.cards.forEach(card => assignedCardIds.add(card.id));
    });
    availableCards = cards.filter(card => !assignedCardIds.has(card.id));
    
    console.log('🔍 Available cards structure:', availableCards.map(card => ({
      id: card.id,
      title: card.title,
      content: card.content,
      hasTitle: !!card.title
    })));
    
    // Regenerate connections if branching paths are shown
    if (showBranchingPaths) {
      generateBranchConnections();
    }
  }

  function closeDeck() {
    dispatch('close-deck');
  }

  function openCardZoom(event) {
    zoomedCard = event.detail.card;
    showCardZoom = true;
  }

  function closeCardZoom() {
    showCardZoom = false;
    zoomedCard = null;
  }

  async function handleCardZoomGenerateArt(event) {
    // Handle art generation from zoom view
    const { card, artUrl, source, model } = event.detail;
    
    // Update the card in the sections
    sections = sections.map(section => ({
      ...section,
      cards: section.cards.map(c => 
        c.id === card.id ? { 
          ...c, 
          art_url: artUrl,
          ...(model && source === 'ai' ? { art_model: model } : {})
        } : c
      )
    }));
    
    // Save art URL to database
    try {
      const response = await fetch('/api/cards/art', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cardId: card.id,
          artUrl: artUrl,
          artModel: model
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save art URL to database');
      }
      
      console.log('✅ Art URL saved to database successfully');
    } catch (error) {
      console.error('❌ Error saving art URL to database:', error);
      // TODO: Show user-friendly error message
    }
  }

  function handleCardZoomUpdateRarity(event) {
    const { card, rarity } = event.detail;
    
    // Update the card in the sections
    sections = sections.map(section => ({
      ...section,
      cards: section.cards.map(c => 
        c.id === card.id ? { ...c, rarity } : c
      )
    }));
  }

  function handleCardZoomUpdateProgress(event) {
    const { card, progress } = event.detail;
    
    // Update the card in the sections
    sections = sections.map(section => ({
      ...section,
      cards: section.cards.map(c => 
        c.id === card.id ? { ...c, progress } : c
      )
    }));
  }

  async function addNewSection() {
    const newSection = {
      id: `section-${uuidv4()}`,
      name: 'New Section',
      cards: []
    };
    const updatedSections = [...sections, newSection];
    await saveDeckStructure(updatedSections);
  }

  function startEditSection(section) {
    editingSection = section.id;
    editingSectionName = section.name;
  }

  function saveSectionName() {
    if (editingSection && editingSectionName.trim()) {
      sections = sections.map(section => 
        section.id === editingSection 
          ? { ...section, name: editingSectionName.trim() }
          : section
      );
      
      // Save section name change to database
      saveDeckStructure(sections);
    }
    editingSection = null;
    editingSectionName = '';
  }

  function cancelEditSection() {
    editingSection = null;
    editingSectionName = '';
  }

  function handleDragStart(event, card) {
    console.log('🔍 handleDragStart called with card:', card.id);
    console.log('🔍 Card data structure:', {
      id: card.id,
      title: card.title,
      content: card.content,
      hasTitle: !!card.title
    });
    
    draggedCard = card;
    
    // Set drag data to prevent browser navigation/tab switching
    event.dataTransfer.setData('text/plain', card.id);
    event.dataTransfer.setData('application/json', JSON.stringify({ type: 'card', id: card.id }));
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    
    event.target.style.opacity = '0.5';
    
    // Start auto-scroll when dragging begins
    startAutoScroll();
  }

  function handleDragEnd(event) {
    console.log('🔍 handleDragEnd called, draggedCard was:', draggedCard?.id);
    event.target.style.opacity = '1';
    draggedCard = null;
    dragOverSection = null;
    dragOverIndex = -1;
    
    // Stop auto-scroll when dragging ends
    stopAutoScroll();
  }

  function handleDragOver(event, sectionId, cardIndex) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    dragOverSection = sectionId;
    dragOverIndex = cardIndex;
    console.log('🔍 handleDragOver called with sectionId:', sectionId, 'cardIndex:', cardIndex);
  }

  function handleDragLeave(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dragOverSection = null;
      dragOverIndex = -1;
    }
  }

  function startAutoScroll() {
    if (autoScrollInterval) return;
    
    // Track mouse movement during drag operations
    const trackMouse = (e) => {
      mouseY = e.clientY;
    };
    
    // Use dragover instead of mousemove for better drag tracking
    document.addEventListener('dragover', trackMouse);
    document.addEventListener('mousemove', trackMouse);
    
    autoScrollInterval = setInterval(() => {
      const scrollContainer = document.querySelector('.deck-view-container') || document.documentElement;
      const viewportHeight = window.innerHeight;
      
      // Calculate normalized position (0 = top edge, 1 = bottom edge)
      const normalizedY = mouseY / viewportHeight;
      
      // Create smooth linear acceleration curves with much larger bottom zone
      let scrollSpeed = 0;
      
      // Check if we can scroll (prevent infinite scrolling)
      const canScrollDown = scrollContainer.scrollTop < scrollContainer.scrollHeight - scrollContainer.clientHeight - 10;
      const canScrollUp = scrollContainer.scrollTop > 10;
      
      // Scroll down when in bottom 30% of screen (70%-100%) - more limited zone
      if (normalizedY > 0.7 && canScrollDown) {
        const bottomDistance = (normalizedY - 0.7) / 0.3; // 0 to 1 as we approach bottom
        // Use a smoother curve: starts slow, accelerates gradually
        scrollSpeed = Math.pow(bottomDistance, 0.7) * 6; // Smoother acceleration, max 6px
      }
      // Scroll up when in top 30% of screen (0%-30%) - balanced zone
      else if (normalizedY < 0.3 && canScrollUp) {
        const topDistance = (0.3 - normalizedY) / 0.3; // 0 to 1 as we approach top
        // Use a smoother curve: starts slow, accelerates gradually
        scrollSpeed = -Math.pow(topDistance, 0.7) * 4; // Smoother acceleration, max 4px up
      }
      // No scrolling in middle 40% (30%-70%) - much larger neutral zone
      
      // Apply scroll if we have any meaningful speed
      if (Math.abs(scrollSpeed) > 0.5) {
        scrollContainer.scrollBy(0, scrollSpeed);
        console.log('Auto-scroll:', { mouseY, normalizedY, scrollSpeed, canScrollDown, canScrollUp });
      }
    }, 20); // 50fps for smoother, less jumpy response
    
    // Store cleanup function
    autoScrollInterval.cleanup = () => {
      document.removeEventListener('dragover', trackMouse);
      document.removeEventListener('mousemove', trackMouse);
    };
  }

  function stopAutoScroll() {
    if (autoScrollInterval) {
      // Clean up mouse event listener
      if (autoScrollInterval.cleanup) {
        autoScrollInterval.cleanup();
      }
      clearInterval(autoScrollInterval);
      autoScrollInterval = null;
    }
  }

  function handleDrop(event, sectionId, cardIndex) {
    event.preventDefault();
    event.stopPropagation();
    console.log('🔍 handleDrop called with sectionId:', sectionId, 'cardIndex:', cardIndex, 'draggedCard:', draggedCard?.id);
    
    if (draggedCard) {
      // Find the source section and remove the card
      let sourceSectionId = null;
      let sourceCardIndex = -1;
      
      sections.forEach(section => {
        const index = section.cards.findIndex(c => c.id === draggedCard.id);
        if (index !== -1) {
          sourceSectionId = section.id;
          sourceCardIndex = index;
        }
      });

      if (sourceSectionId && sourceCardIndex !== -1) {
        // Move card to new position
        const newSections = [...sections];
        const sourceSection = newSections.find(s => s.id === sourceSectionId);
        const targetSection = newSections.find(s => s.id === sectionId);
        
        if (sourceSection && targetSection) {
          // Remove from source
          const [movedCard] = sourceSection.cards.splice(sourceCardIndex, 1);
          
          // Add to target
          let newPosition;
          if (cardIndex === -1) {
            // Add to end of section
            targetSection.cards.push(movedCard);
            newPosition = targetSection.cards.length - 1;
          } else {
            // Insert at specific position
            targetSection.cards.splice(cardIndex, 0, movedCard);
            newPosition = cardIndex;
          }
          
          sections = newSections;
          
          // Save to database
          saveCardAddition(movedCard.id, sectionId, newPosition);
        }
      } else {
        // Card is coming from the library
        console.log('🔍 Adding card from library:', draggedCard.id, 'to section:', sectionId);
        
        // Find the target section
        const targetSection = sections.find(s => s.id === sectionId);
        if (targetSection) {
          console.log('🔍 Target section found:', targetSection.name, 'current cards:', targetSection.cards.length);
          
          // Add card to section directly
          if (cardIndex === -1) {
            // Add to end of section
            targetSection.cards.push(draggedCard);
          } else {
            // Insert at specific position
            targetSection.cards.splice(cardIndex, 0, draggedCard);
          }
          
          console.log('🔍 After adding card, section has:', targetSection.cards.length, 'cards');
          
          // Force reactivity by creating a completely new sections array
          sections = sections.map(section => ({
            ...section,
            cards: [...section.cards]
          }));
          
          // Remove from available cards
          availableCards = availableCards.filter(c => c.id !== draggedCard.id);
          
          console.log('🔍 Available cards after removal:', availableCards.length);
          
          // Save to database
          saveCardAddition(draggedCard.id, sectionId, cardIndex === -1 ? targetSection.cards.length - 1 : cardIndex);
        } else {
          console.error('❌ Target section not found:', sectionId);
        }
      }
    }
    
    dragOverSection = null;
    dragOverIndex = -1;
  }

  function handleKeydown(event) {
    if (event.key === 'Escape' && isOpen) {
      closeDeck();
    }
  }

  function toggleBranchingPaths() {
    showBranchingPaths = !showBranchingPaths;
    if (showBranchingPaths) {
      generateBranchConnections();
    }
  }

  function generateBranchConnections() {
    // Generate connections between cards in different sections
    // This creates a visual flow showing how cards relate across sections
    branchConnections = [];
    
    // Wait for DOM to update, then calculate positions
    setTimeout(() => {
      const connections = [];
      
      for (let i = 0; i < sections.length - 1; i++) {
        const currentSection = sections[i];
        const nextSection = sections[i + 1];
        
        // Connect each card in current section to cards in next section
        currentSection.cards.forEach((fromCard, fromIndex) => {
          nextSection.cards.forEach((toCard, toIndex) => {
            // Create connections with some randomness to avoid overcrowding
            if (Math.random() > 0.6) { // 40% chance of connection
              const fromElement = document.querySelector(`[data-card-id="${fromCard.id}"]`);
              const toElement = document.querySelector(`[data-card-id="${toCard.id}"]`);
              
              if (fromElement && toElement) {
                const fromRect = fromElement.getBoundingClientRect();
                const toRect = toElement.getBoundingClientRect();
                const containerRect = document.querySelector('.space-y-6').getBoundingClientRect();
                
                const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
                const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
                const toX = toRect.left + toRect.width / 2 - containerRect.left;
                const toY = toRect.top + toRect.height / 2 - containerRect.top;
                
                // Calculate control point for curved path
                const controlX = (fromX + toX) / 2;
                const controlY = Math.min(fromY, toY) - 50;
                
                connections.push({
                  id: `${fromCard.id}-${toCard.id}`,
                  from: { x: fromX, y: fromY },
                  to: { x: toX, y: toY },
                  controlX,
                  controlY,
                  type: 'flow' // Could be 'flow', 'conflict', 'parallel', etc.
                });
              }
            }
          });
        });
      }
      
      branchConnections = connections;
    }, 100);
  }

  // Section reordering functions
  function moveSectionUp(index) {
    if (index === 0) return;
    
    const newSections = [...sections];
    const [movedSection] = newSections.splice(index, 1);
    newSections.splice(index - 1, 0, movedSection);
    sections = newSections;
    
    // Save section reorder to database
    saveDeckStructure(sections);
  }

  function moveSectionDown(index) {
    if (index === sections.length - 1) return;
    
    const newSections = [...sections];
    const [movedSection] = newSections.splice(index, 1);
    newSections.splice(index + 1, 0, movedSection);
    sections = newSections;
    
    // Save section reorder to database
    saveDeckStructure(sections);
  }



  function deleteSection(sectionId) {
    if (confirm('Are you sure you want to delete this section? All cards in this section will be moved to the first section.')) {
      const sectionIndex = sections.findIndex(s => s.id === sectionId);
      if (sectionIndex > 0) { // Don't delete the first section
        const sectionToDelete = sections[sectionIndex];
        const firstSection = sections[0];
        
        // Move all cards from deleted section to first section
        firstSection.cards = [...firstSection.cards, ...sectionToDelete.cards];
        
        // Remove the section
        sections = sections.filter(s => s.id !== sectionId);
      }
    }
  }

  function toggleCardLibrary() {
    showCardLibrary = !showCardLibrary;
  }

  function addCardToSection(card, sectionId) {
    const newSections = [...sections];
    const section = newSections.find(s => s.id === sectionId);
    if (section) {
      // Add card to section
      section.cards = [...section.cards, card];
      
      // Update sections array to trigger reactivity
      sections = newSections;
      
      // Remove from available cards
      availableCards = availableCards.filter(c => c.id !== card.id);
    }
  }

  function removeCardFromSection(card, sectionId) {
    const newSections = [...sections];
    const section = newSections.find(s => s.id === sectionId);
    if (section) {
      // Remove card from section
      section.cards = section.cards.filter(c => c.id !== card.id);
      
      // Update sections array to trigger reactivity
      sections = newSections;
      
      // Add back to available cards
      availableCards = [...availableCards, card];
      
      // Save to database
      saveCardRemoval(card.id);
    }
  }

  async function saveDeckStructure(sectionsToSave) {
    if (!deck || !deck.id) {
      console.log('🔍 saveDeckStructure: No deck or deck.id');
      return;
    }
    
    console.log('🔍 saveDeckStructure: Saving sections:', sectionsToSave.map(s => s.name));
    
    try {
      const response = await fetch(`/api/decks/${deck.id}/structure`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sections: sectionsToSave })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save deck structure: ${response.status} ${response.statusText}`);
      }
      
      console.log('🔍 saveDeckStructure response:', response.status);

      if (response.ok) {
        const updatedDeck = await response.json();
        console.log('🔍 Fetched updated deck:', updatedDeck);
        sections = updatedDeck.sections || [];
        dispatch('deck-updated', updatedDeck);
      } else {
        const errorText = await response.text();
        console.error('🔍 Error saving deck structure:', `Failed to save deck structure: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Failed to save deck structure: ${response.status} ${response.statusText}`);
      }
      
      console.log('🔍 Deck structure saved successfully');
    } catch (error) {
      console.error('🔍 Error saving deck structure:', error);
      // TODO: Show user-friendly error message
    }
  }


  async function saveCardAddition(cardId, sectionId, position) {
    if (!deck || !deck.id) return;
    
    try {
      const response = await fetch(`/api/decks/${deck.id}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_id: cardId,
          section_id: sectionId,
          position
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to add card to deck');
      }
      
      console.log('Card added to deck successfully');
      
      // Note: Deck data will be refreshed by the parent component
      // No need to refresh here as the local state is already updated
    } catch (error) {
      console.error('Error adding card to deck:', error);
      // TODO: Show user-friendly error message
    }
  }

  async function saveCardRemoval(cardId) {
    if (!deck || !deck.id) return;
    
    try {
      const response = await fetch(`/api/decks/${deck.id}/cards`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          card_id: cardId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove card from deck');
      }
      
      console.log('Card removed from deck successfully');
    } catch (error) {
      console.error('Error removing card from deck:', error);
      // TODO: Show user-friendly error message
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && deck}
  <div class="h-full flex flex-col bg-white dark:bg-gray-900">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
      <div class="flex items-center gap-3">
        <button
          class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          on:click={closeDeck}
          title="Close deck view"
        >
          <ArrowLeft size="20" />
        </button>
        <div>
          <h1 class="text-xl font-bold text-gray-900 dark:text-white">{deck.name}</h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">{cards.length} cards • {sections.length} sections</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Collapse/Expand All Buttons -->
        <div class="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            on:click={collapseAllSections}
            title="Collapse all sections"
          >
            <Minimize2 size="16" />
          </button>
          <button
            class="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            on:click={expandAllSections}
            title="Expand all sections"
          >
            <Maximize2 size="16" />
          </button>
        </div>
        
        <!-- Branching Paths Toggle -->
        <button
          class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors {showBranchingPaths ? 'text-blue-500 dark:text-blue-400' : ''}"
          on:click={toggleBranchingPaths}
          title={showBranchingPaths ? "Hide branching paths" : "Show branching paths"}
        >
          <Layers size="20" />
        </button>
        <button
          class="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          on:click={toggleCardLibrary}
        >
          <Layers size="16" />
          Card Library ({availableCards.length})
        </button>
        <button
          class="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          on:click={addNewSection}
        >
          <Plus size="16" />
          Add Section
        </button>
      </div>
    </div>

    <!-- Deck Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Main Deck Content -->
      <div 
        class="flex-1 overflow-y-auto p-4 pb-20 deck-view-container"
        role="application"
        on:dragover|preventDefault
        on:drop|preventDefault
      >
      <div class="space-y-4 relative">
        <!-- Branching Paths Overlay -->
        {#if showBranchingPaths}
          <div class="absolute inset-0 pointer-events-none z-10">
            <svg class="w-full h-full">
              {#each branchConnections as connection}
                <path
                  d="M {connection.from.x} {connection.from.y} Q {connection.controlX} {connection.controlY} {connection.to.x} {connection.to.y}"
                  stroke="url(#gradient-{connection.type})"
                  stroke-width="2"
                  fill="none"
                  opacity="0.6"
                  class="animate-pulse"
                />
              {/each}
              <defs>
                <linearGradient id="gradient-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="gradient-conflict" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#f97316;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="gradient-parallel" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        {/if}
        
        
        {#each sections as section, sectionIndex}
        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 transition-all">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-3">
              <div class="flex flex-col gap-1">
                <button
                  class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move section up"
                  disabled={sectionIndex === 0}
                  on:click={() => moveSectionUp(sectionIndex)}
                >
                  <ChevronUp size="16" />
                </button>
                <button
                  class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move section down"
                  disabled={sectionIndex === sections.length - 1}
                  on:click={() => moveSectionDown(sectionIndex)}
                >
                  <ChevronDown size="16" />
                </button>
              </div>
              {#if editingSection === section.id}
                <input
                  bind:value={editingSectionName}
                  class="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none"
                  on:blur={saveSectionName}
                  on:keydown={(e) => {
                    if (e.key === 'Enter') saveSectionName();
                    if (e.key === 'Escape') cancelEditSection();
                  }}
                  autofocus
                />
              {:else}
                <h3
                  class="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  on:click={() => startEditSection(section)}
                  title="Click to edit section name"
                >
                  {section.name}
                </h3>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <!-- Collapse/Expand Button -->
              <button
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                on:click={() => toggleSectionCollapse(section.id)}
                title={sectionCollapsedMap[section.id] ? "Expand section" : "Collapse section"}
              >
                {#if sectionCollapsedMap[section.id]}
                  <ChevronRight size="16" />
                {:else}
                  <ChevronDown size="16" />
                {/if}
              </button>
      
              <span class="text-sm text-gray-500 dark:text-gray-400">{section.cards.length} cards</span>
              {#if sectionIndex > 0}
                <button
                  class="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  on:click={() => deleteSection(section.id)}
                  title="Delete section"
                >
                  <Trash2 size="16" />
                </button>
              {/if}
            </div>
          </div>
      
          <!-- Cards Grid (only show when not collapsed) -->
          {#if !sectionCollapsedMap[section.id]}
            {#if showCardLibrary}
              <!-- Simplified FLEX layout when library is open -->
              <div class="flex items-start gap-2">
                {#if section.cards.length > 0}
                  {@const lastCard = section.cards[section.cards.length - 1]}
                  <div class="relative group w-fit" data-card-id={lastCard.id}>
                    <Card
                      card={lastCard}
                      showActions={false}
                      on:card-click={openCardZoom}
                      showRemoveButton={true}
                      on:remove={() => removeCardFromSection(lastCard, section.id)}
                      xPaddingClass="px-4"
                    />
                  </div>
                {/if}
      
                <!-- Drop zone for library view -->
                <div
                  class="min-h-[350px] w-[250px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors {dragOverSection === section.id && dragOverIndex === -1 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}"
                  on:dragover={(e) => handleDragOver(e, section.id, -1)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(e, section.id, -1)}
                  role="button"
                  tabindex="0"
                >
                  <div class="text-center">
                    <Layers size="24" class="mx-auto mb-2 opacity-50" />
                    <p class="text-sm">Drop card here</p>
                  </div>
                </div>
              </div>
            {:else}
              <!-- Original GRID layout for full drag-and-drop functionality -->
              <div class="grid gap-2" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
                <!-- Drop zone at beginning of section (for first position) -->
                {#if section.cards.length === 0}
                  <div
                    class="min-h-[350px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors {dragOverSection === section.id && dragOverIndex === 0 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}"
                    on:dragover={(e) => handleDragOver(e, section.id, 0)}
                    on:dragleave={handleDragLeave}
                    on:drop={(e) => handleDrop(e, section.id, 0)}
                    role="button"
                    tabindex="0"
                  >
                    <div class="text-center">
                      <Layers size="24" class="mx-auto mb-2 opacity-50" />
                      <p class="text-sm">Drop cards here</p>
                      <p class="text-xs text-gray-400 mt-1">First position in section</p>
                    </div>
                  </div>
                {/if}
      
                {#each section.cards as card, index}
                  <div
                    class="relative group w-fit mx-auto"
                    data-card-id={card.id}
                    draggable="true"
                    on:dragstart={(e) => {
                      if (allSectionsCollapsed) {
                        e.preventDefault();
                        return;
                      }
                      handleDragStart(e, card);
                    }}
                    on:dragend={handleDragEnd}
                    on:dragover={(e) => handleDragOver(e, section.id, index)}
                    on:dragleave={handleDragLeave}
                    on:drop={(e) => handleDrop(e, section.id, index)}
                    role="button"
                    tabindex="0"
                  >
                    <Card
                      {card}
                      showActions={false}
                      on:card-click={openCardZoom}
                      showRemoveButton={true}
                      on:remove={() => removeCardFromSection(card, section.id)}
                      xPaddingClass="px-4"
                    />
                    <!-- Drop indicator -->
                    {#if dragOverSection === section.id && dragOverIndex === index}
                      <div class="absolute inset-0 border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-lg pointer-events-none"></div>
                    {/if}
                  </div>
                {/each}
      
                <!-- Drop zone at end of section -->
                <div
                  class="min-h-[350px] border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 transition-colors {dragOverSection === section.id && dragOverIndex === -1 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}"
                  on:dragover={(e) => handleDragOver(e, section.id, -1)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(e, section.id, -1)}
                  role="button"
                  tabindex="0"
                >
                  <div class="text-center">
                    <Layers size="24" class="mx-auto mb-2 opacity-50" />
                    <p class="text-sm">Drop cards here</p>
                    <p class="text-xs text-gray-400 mt-1">From library or other sections</p>
                  </div>
                </div>
              </div>
            {/if}
          {/if}
        </div>
      {/each}
      </div>
      </div>
      
      <!-- Card Library Panel -->
      {#if showCardLibrary}
        <div class="w-[70%] border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex flex-col">
          <div class="p-4 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Card Library</h3>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                on:click={toggleCardLibrary}
              >
                <X size="20" />
              </button>
            </div>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Drag cards to sections to add them
            </p>
          </div>
      
          <div class="flex-1 overflow-y-auto p-4">
            {#if availableCards.length === 0}
              <div class="text-center py-8">
                <Layers size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <p class="text-gray-500 dark:text-gray-400">All cards are assigned to sections</p>
              </div>
            {:else}
              <div class="grid gap-1" style="grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));">
                {#each availableCards as card}
                  <div
                    class="relative w-fit mx-auto"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, card)}
                <div on:dragend={handleDragEnd}>
                    <Card
                      {card}
                      showActions={false}
                      on:card-click={openCardZoom}
                    />
                  </div>
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/if}
      </div>
      </div>
      {/if}
      
      <!-- Card Zoom View -->
      <CardZoomView
        bind:isOpen={showCardZoom}
        card={zoomedCard}
        userPreferences={userPreferences}
        on:close={closeCardZoom}
        on:art-selected={handleCardZoomGenerateArt}
        on:rarity-updated={handleCardZoomUpdateRarity}
        on:progress-updated={handleCardZoomUpdateProgress}
      />