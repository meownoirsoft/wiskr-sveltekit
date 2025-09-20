<!-- DeckView.svelte - Shows cards organized in deck sections -->
<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { X, Plus, Layers, ArrowLeft, Trash2, ChevronDown, ChevronUp, ChevronRight, Minimize2, Maximize2, ChevronsUp, ChevronsDown, Edit3, Check, X as XIcon } from 'lucide-svelte';
  import Card from './Card.svelte';
  import CardZoomView from './CardZoomView.svelte';
  import DeckContextIndicator from './DeckContextIndicator.svelte';
  import FannedCardDeck from './FannedCardDeck.svelte';
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
  let cardAdditionQueue = [];
  let isProcessingQueue = false;
  let hasLocalChanges = false;
  let hasContextChanges = false;
  let isEditingDeckName = false;
  let editingDeckName = '';

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
    // Generate context when component is destroyed (user navigated away)
    // Only if there were actual changes that warrant context generation
    if (deck?.id && hasContextChanges) {
      generateContextForDeck();
    }
  });

  // Initialize sections when deck changes
  $: if (deck && !hasLocalChanges) {
    console.log('🔄 Deck data changed, reloading sections. Current sections:', sections.length, 'New sections:', deck.sections?.length || 0);
    console.log('🔄 Current sections cards:', sections.map(s => ({ id: s.id, name: s.name, cardCount: s.cards?.length || 0 })));
    console.log('🔄 New sections cards:', deck.sections?.map(s => ({ id: s.id, name: s.name, cardCount: s.cards?.length || 0 })) || []);
    console.log('🔄 Has local changes:', hasLocalChanges);
    
    // Use deck sections from database
    if (deck.sections && deck.sections.length > 0) {
      sections = deck.sections;
    } else {
      // If no sections exist, create default ones
      sections = [
        { id: 'temp-1', name: 'New Section', cards: [] }
      ];
    }
    console.log('🔄 Sections updated to:', sections.length, 'sections');
    console.log('🔄 Final sections cards:', sections.map(s => ({ id: s.id, name: s.name, cardCount: s.cards?.length || 0 })));
  }
  
  // Log when deck changes but we skip due to local changes
  $: if (deck && hasLocalChanges) {
    console.log('🔄 Skipping deck data reload due to local changes');
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
    // Generate context when deck view is closed
    if (deck?.id) {
      generateContextForDeck();
    }
    // Reset local changes flag
    hasLocalChanges = false;
    hasContextChanges = false;
    dispatch('close-deck');
  }

  async function generateContextForDeck() {
    if (!deck?.id) return;
    
    try {
      console.log('🔄 Generating context for deck:', deck.id);
      
      // Generate context for the deck and all its sections
      const sectionIds = sections.map(s => s.id).filter(id => id && !id.startsWith('temp-'));
      
      const promises = [
        fetch(`/api/decks/${deck.id}/context`, { method: 'POST' }),
        ...sectionIds.map(sectionId => 
          fetch(`/api/deck-sections/${sectionId}/context`, { method: 'POST' })
        )
      ];
      
      await Promise.all(promises);
      console.log('✅ Context generation completed for deck and sections');
    } catch (error) {
      console.error('❌ Error generating context:', error);
    }
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
    
    // Mark that we have local changes to prevent deck data reload
    hasLocalChanges = true;
    
    // Also update the main cards array for the binder view
    dispatch('card-updated', { cardId: card.id, updates: { rarity } });
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
    
    // Mark that we have local changes to prevent deck data reload
    hasLocalChanges = true;
    
    // Also update the main cards array for the binder view
    dispatch('card-updated', { cardId: card.id, updates: { progress } });
  }

  function handleCardZoomFromWizard(event) {
    const { card } = event.detail;
    // Open zoom view with the card from Wizard's Council
    zoomedCard = card;
    showCardZoom = true;
  }

  function startEditingDeckName() {
    isEditingDeckName = true;
    editingDeckName = deck.name;
  }

  function cancelEditingDeckName() {
    isEditingDeckName = false;
    editingDeckName = '';
  }

  async function saveDeckName() {
    if (!editingDeckName.trim() || editingDeckName.trim() === deck.name) {
      cancelEditingDeckName();
      return;
    }

    try {
      const response = await fetch(`/api/decks/${deck.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingDeckName.trim()
        })
      });

      if (response.ok) {
        // Update local deck object
        deck = { ...deck, name: editingDeckName.trim() };
        isEditingDeckName = false;
        editingDeckName = '';
        
        // Dispatch event to parent to update the deck
        dispatch('deck-updated', { deck });
      } else {
        console.error('Failed to rename deck:', response.status);
        alert('Failed to rename deck. Please try again.');
      }
    } catch (error) {
      console.error('Error renaming deck:', error);
      alert('Error renaming deck. Please try again.');
    }
  }

  function handleDeckNameKeydown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveDeckName();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEditingDeckName();
    }
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
    console.log('🔍 Previous draggedCard was:', draggedCard?.id);
    draggedCard = card;
    console.log('🔍 Set draggedCard to:', draggedCard?.id);
    
    // Set drag effect (data is already set by FannedCardDeck)
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    
    event.target.style.opacity = '0.5';
    
    // Start auto-scroll when dragging begins
    startAutoScroll();
  }

  function handleDragEnd(event) {
    console.log('🔍 handleDragEnd called, draggedCard was:', draggedCard?.id, 'dragOverSection:', dragOverSection, 'dragOverIndex:', dragOverIndex);
    event.target.style.opacity = '1';
    
    // If we have a dragged card and we're over a valid drop zone, try to drop it
    // This is a fallback for when the drop event doesn't fire (e.g., releasing too quickly)
    if (draggedCard && dragOverSection && dragOverIndex !== undefined) {
      console.log('🔍 Attempting fallback drop on dragend, sectionId:', dragOverSection, 'cardIndex:', dragOverIndex);
      // Create a synthetic drop event
      const syntheticEvent = {
        isSynthetic: true,
        preventDefault: () => {},
        stopPropagation: () => {},
        dataTransfer: {
          getData: (type) => {
            if (type === 'application/json') {
              return JSON.stringify(draggedCard);
            }
            if (type === 'text/plain') {
              return JSON.stringify(draggedCard);
            }
            return '';
          }
        }
      };
      handleDrop(syntheticEvent, dragOverSection, dragOverIndex);
    } else {
      console.log('🔍 No fallback drop - draggedCard:', !!draggedCard, 'dragOverSection:', dragOverSection, 'dragOverIndex:', dragOverIndex);
    }
    
    // Don't reset draggedCard here - let handleDrop do it
    // But add a timeout to reset it if no drop occurs
    setTimeout(() => {
      // Only reset if we're not currently over a valid drop zone
      if (draggedCard && !dragOverSection) {
        console.log('🔄 Resetting draggedCard after timeout, was:', draggedCard.id);
        draggedCard = null;
      } else if (draggedCard && dragOverSection) {
        console.log('🔄 Keeping draggedCard due to active drop zone:', dragOverSection);
      }
      
      // Reset drag over state after timeout
      dragOverSection = null;
      dragOverIndex = -1;
    }, 1000);
    
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
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) {
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
    
    const intervalId = setInterval(() => {
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
    
    // Store interval ID and cleanup function
    autoScrollInterval = {
      id: intervalId,
      cleanup: () => {
        document.removeEventListener('dragover', trackMouse);
        document.removeEventListener('mousemove', trackMouse);
      }
    };
  }

  function stopAutoScroll() {
    if (autoScrollInterval) {
      // Clean up mouse event listener
      if (autoScrollInterval.cleanup) {
        autoScrollInterval.cleanup();
      }
      clearInterval(autoScrollInterval.id);
      autoScrollInterval = null;
    }
  }

  function handleDrop(event, sectionId, cardIndex) {
    event.preventDefault();
    event.stopPropagation();
    console.log('🔍 handleDrop called with sectionId:', sectionId, 'cardIndex:', cardIndex, 'draggedCard:', draggedCard?.id, 'isSynthetic:', event.isSynthetic, 'showCardLibrary:', showCardLibrary);
    
    // Try to get card from dataTransfer if draggedCard is null
    let cardToMove = draggedCard;
    if (!cardToMove) {
      try {
        // Try application/json first (full card object)
        let cardData = event.dataTransfer.getData('application/json');
        if (!cardData) {
          // Fallback to text/plain
          cardData = event.dataTransfer.getData('text/plain');
        }
        if (cardData) {
          cardToMove = JSON.parse(cardData);
          console.log('🔍 Retrieved card from dataTransfer:', cardToMove?.id);
        }
      } catch (error) {
        console.error('❌ Error parsing card data from dataTransfer:', error);
        console.log('🔍 Raw dataTransfer data:', event.dataTransfer.getData('text/plain'));
      }
    }
    
    if (cardToMove) {
      // Check if we're dropping on trash zone (when library is closed)
      if (!showCardLibrary && cardIndex === -1) {
        console.log('🗑️ Dropping card on trash zone - removing from deck');
        removeCardFromSection(cardToMove, sectionId);
        return;
      }
      
      // Find the source section and remove the card
      let sourceSectionId = null;
      let sourceCardIndex = -1;
      
      sections.forEach(section => {
        const index = section.cards.findIndex(c => c.id === cardToMove.id);
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
          queueCardAddition(movedCard.id, sectionId, newPosition);
        }
      } else {
        // Card is coming from the library
        console.log('🔍 Adding card from library:', cardToMove.id, 'to section:', sectionId);
        
        // Find the target section
        const targetSection = sections.find(s => s.id === sectionId);
        if (targetSection) {
          console.log('🔍 Target section found:', targetSection.name, 'current cards:', targetSection.cards.length);
          
          // Add card to section directly
          if (cardIndex === -1) {
            // Add to end of section
            targetSection.cards.push(cardToMove);
          } else {
            // Insert at specific position
            targetSection.cards.splice(cardIndex, 0, cardToMove);
          }
          
          console.log('🔍 After adding card, section has:', targetSection.cards.length, 'cards');
          
          // Force reactivity by creating a completely new sections array
          sections = sections.map(section => ({
            ...section,
            cards: [...section.cards]
          }));
          
          // Remove from available cards
          availableCards = availableCards.filter(c => c.id !== cardToMove.id);
          
          console.log('🔍 Available cards after removal:', availableCards.length);
          
          // Mark that we have local changes
          hasLocalChanges = true;
          hasContextChanges = true;
          
          // Save to database
          queueCardAddition(cardToMove.id, sectionId, cardIndex === -1 ? targetSection.cards.length - 1 : cardIndex);
        } else {
          console.error('❌ Target section not found:', sectionId);
        }
      }
    }
    
    // Don't reset drag over state here - let handleDragEnd do it
    // This allows the fallback mechanism to work properly
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
    
    // Mark that we have local changes
    hasLocalChanges = true;
    hasContextChanges = true;
    
    // Save section reorder to database - send the full section objects
    console.log('🔍 moveSectionUp: Sending sections to save:', newSections.map(s => ({ id: s.id, name: s.name, cards: s.cards?.length || 0, position: newSections.indexOf(s) })));
    saveDeckStructure(newSections);
  }

  function moveSectionDown(index) {
    if (index === sections.length - 1) return;
    
    const newSections = [...sections];
    const [movedSection] = newSections.splice(index, 1);
    newSections.splice(index + 1, 0, movedSection);
    sections = newSections;
    
    // Mark that we have local changes
    hasLocalChanges = true;
    hasContextChanges = true;
    
    // Save section reorder to database - send the full section objects
    console.log('🔍 moveSectionDown: Sending sections to save:', newSections.map(s => ({ id: s.id, name: s.name, cards: s.cards?.length || 0, position: newSections.indexOf(s) })));
    saveDeckStructure(newSections);
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
        const newSections = sections.filter(s => s.id !== sectionId);
        sections = newSections;
        
        // Mark that we have local changes
        hasLocalChanges = true;
        hasContextChanges = true;
        
        // Save section deletion to database
        console.log('🔍 deleteSection: Sending sections to save:', newSections.map(s => ({ id: s.id, name: s.name, cards: s.cards?.length || 0, position: newSections.indexOf(s) })));
        saveDeckStructure(newSections);
      }
    }
  }

  function toggleCardLibrary() {
    const wasOpen = showCardLibrary;
    showCardLibrary = !showCardLibrary;
    
    // Generate context when library is closed
    if (wasOpen && !showCardLibrary && deck?.id) {
      generateContextForDeck();
      // Reset local changes flag when library is closed
      hasLocalChanges = false;
      hasContextChanges = false;
    }
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
      
      // Mark that we have local changes
      hasLocalChanges = true;
      hasContextChanges = true;
      
      // Save to database
      saveCardRemoval(card.id);
    }
  }

  async function saveDeckStructure(sectionsToSave) {
    if (!deck || !deck.id) {
      console.log('🔍 saveDeckStructure: No deck or deck.id');
      return;
    }
    
    console.log('🔍 saveDeckStructure: Saving sections:', sectionsToSave.map(s => ({ id: s.id, name: s.name, position: sectionsToSave.indexOf(s) })));
    
    const requestBody = { sections: sectionsToSave };
    console.log('🔍 saveDeckStructure: Request body:', JSON.stringify(requestBody, null, 2));
    
    try {
      const response = await fetch(`/api/decks/${deck.id}/structure`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ saveDeckStructure failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to save deck structure: ${response.status} ${response.statusText}`);
      }
      
      console.log('✅ saveDeckStructure response:', response.status);

      if (response.ok) {
        const updatedDeck = await response.json();
        console.log('✅ saveDeckStructure success, updated deck:', updatedDeck);
        console.log('🔍 Fetched updated deck:', updatedDeck);
        sections = updatedDeck.sections || [];
        
        // Calculate card count for the deck
        const cardCount = sections.reduce((total, section) => total + (section.cards?.length || 0), 0);
        
        // Dispatch deck-updated event with the full deck object
        dispatch('deck-updated', { 
          deck: {
            id: updatedDeck.id,
            name: updatedDeck.name,
            description: updatedDeck.description,
            isPinned: updatedDeck.is_pinned,
            cardCount: cardCount
          }
        });
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


  function queueCardAddition(cardId, sectionId, position) {
    console.log('📝 Adding to queue:', { cardId, sectionId, position });
    cardAdditionQueue.push({ cardId, sectionId, position });
    console.log('📝 Queue now has:', cardAdditionQueue.length, 'items');
    processCardAdditionQueue();
  }

  async function processCardAdditionQueue() {
    if (isProcessingQueue || cardAdditionQueue.length === 0) {
      return;
    }

    isProcessingQueue = true;
    console.log('🔄 Processing card addition queue:', cardAdditionQueue.length, 'items');

    while (cardAdditionQueue.length > 0) {
      const { cardId, sectionId, position } = cardAdditionQueue.shift();
      console.log('🔄 Processing queue item:', { cardId, sectionId, position, remaining: cardAdditionQueue.length });
      await saveCardAddition(cardId, sectionId, position);
      
      // Add a small delay between requests to prevent race conditions
      if (cardAdditionQueue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    isProcessingQueue = false;
    console.log('✅ Card addition queue processing complete');
    // Reset local changes flag after a delay to prevent deck data refresh from overwriting changes
    setTimeout(() => {
      hasLocalChanges = false;
    }, 100);
  }

  async function saveCardAddition(cardId, sectionId, position) {
    if (!deck || !deck.id) {
      console.error('❌ No deck ID available for saving card');
      return;
    }
    
    try {
      console.log('💾 Starting save for card:', { cardId, sectionId, position, deckId: deck.id });
      
      const requestBody = {
        card_id: cardId,
        section_id: sectionId,
        position
      };
      
      console.log('💾 Request body:', requestBody);
      
      const response = await fetch(`/api/decks/${deck.id}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log('💾 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`Failed to add card to deck: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('✅ Card added to deck successfully:', result);
      
      // Dispatch event to update deck card count in parent
      dispatch('deck-updated', { 
        deck: {
          id: deck.id,
          name: deck.name,
          description: deck.description,
          isPinned: deck.isPinned,
          cardCount: sections.reduce((total, section) => total + (section.cards?.length || 0), 0)
        }
      });
      
      // Note: Deck data will be refreshed by the parent component
      // No need to refresh here as the local state is already updated
    } catch (error) {
      console.error('❌ Error adding card to deck:', error);
      // TODO: Show user-friendly error message and revert local state
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
      
      // Dispatch event to update deck card count in parent
      dispatch('deck-updated', { 
        deck: {
          id: deck.id,
          name: deck.name,
          description: deck.description,
          isPinned: deck.isPinned,
          cardCount: sections.reduce((total, section) => total + (section.cards?.length || 0), 0)
        }
      });
    } catch (error) {
      console.error('Error removing card from deck:', error);
      // TODO: Show user-friendly error message
    }
  }

  // Card action handlers
  async function handleProgressChange(event) {
    console.log('🔍 DeckView: handleProgressChange called with event:', event);
    const { card, targetLevel } = event.detail;
    console.log('DeckView: Updating card progress:', card.id, 'from', card.progress, 'to', targetLevel);

    // Update the card in the local sections array
    console.log('🔍 Before progress update - sections:', sections.map(s => ({ id: s.id, cards: s.cards.map(c => ({ id: c.id, progress: c.progress })) })));
    sections = sections.map(section => ({
      ...section,
      cards: section.cards.map(c => 
        c.id === card.id ? { ...c, progress: targetLevel } : c
      )
    }));
    console.log('🔍 After progress update - sections:', sections.map(s => ({ id: s.id, cards: s.cards.map(c => ({ id: c.id, progress: c.progress })) })));
    
    // Mark that we have local changes to prevent deck data reload
    hasLocalChanges = true;
    
    // Also update the main cards array for the binder view
    dispatch('card-updated', { cardId: card.id, updates: { progress: targetLevel } });

    try {
      const response = await fetch('/api/cards/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: card.id,
          newProgress: targetLevel
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update progress');
      }

      console.log('✅ Progress update successful');
    } catch (error) {
      console.error('❌ Error updating progress:', error);
      // Revert the optimistic update
      sections = sections.map(section => ({
        ...section,
        cards: section.cards.map(c => 
          c.id === card.id ? { ...c, progress: card.progress } : c
        )
      }));
    }
  }

  async function handleRarityUpgrade(event) {
    console.log('🔍 DeckView: handleRarityUpgrade called with event:', event);
    const { card } = event.detail;
    const rarityOrder = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarityOrder.indexOf(card.rarity);
    const newRarity = rarityOrder[Math.min(currentIndex + 1, rarityOrder.length - 1)];
    
    console.log('DeckView: Upgrading card rarity:', card.id, 'from', card.rarity, 'to', newRarity);

    // Update the card in the local sections array
    console.log('🔍 Before rarity upgrade - sections:', sections.map(s => ({ id: s.id, cards: s.cards.map(c => ({ id: c.id, rarity: c.rarity })) })));
    sections = sections.map(section => ({
      ...section,
      cards: section.cards.map(c => 
        c.id === card.id ? { ...c, rarity: newRarity } : c
      )
    }));
    console.log('🔍 After rarity upgrade - sections:', sections.map(s => ({ id: s.id, cards: s.cards.map(c => ({ id: c.id, rarity: c.rarity })) })));
    
    // Mark that we have local changes to prevent deck data reload
    hasLocalChanges = true;
    
    // Also update the main cards array for the binder view
    dispatch('card-updated', { cardId: card.id, updates: { rarity: newRarity } });

    try {
      const response = await fetch('/api/cards/rarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: card.id,
          newRarity: newRarity
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rarity');
      }

      console.log('✅ Rarity upgrade successful');
    } catch (error) {
      console.error('❌ Error upgrading rarity:', error);
      // Revert the optimistic update
      sections = sections.map(section => ({
        ...section,
        cards: section.cards.map(c => 
          c.id === card.id ? { ...c, rarity: card.rarity } : c
        )
      }));
    }
  }

  async function handleRarityDowngrade(event) {
    const { card } = event.detail;
    const rarityOrder = ['common', 'special', 'rare', 'legendary'];
    const currentIndex = rarityOrder.indexOf(card.rarity);
    const newRarity = rarityOrder[Math.max(currentIndex - 1, 0)];
    
    console.log('DeckView: Downgrading card rarity:', card.id, 'from', card.rarity, 'to', newRarity);

    // Update the card in the local sections array
    sections = sections.map(section => ({
      ...section,
      cards: section.cards.map(c => 
        c.id === card.id ? { ...c, rarity: newRarity } : c
      )
    }));
    
    // Mark that we have local changes to prevent deck data reload
    hasLocalChanges = true;
    
    // Also update the main cards array for the binder view
    dispatch('card-updated', { cardId: card.id, updates: { rarity: newRarity } });

    try {
      const response = await fetch('/api/cards/rarity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId: card.id,
          newRarity: newRarity
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rarity');
      }

      console.log('✅ Rarity downgrade successful');
    } catch (error) {
      console.error('❌ Error downgrading rarity:', error);
      // Revert the optimistic update
      sections = sections.map(section => ({
        ...section,
        cards: section.cards.map(c => 
          c.id === card.id ? { ...c, rarity: card.rarity } : c
        )
      }));
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen && deck}
  <div class="deck-view-container h-full flex flex-col bg-white dark:bg-gray-900">
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
        <div class="flex items-center gap-2">
          {#if isEditingDeckName}
            <div class="flex items-center gap-2">
              <input
                type="text"
                bind:value={editingDeckName}
                on:keydown={handleDeckNameKeydown}
                class="text-xl font-bold bg-transparent border-b-2 border-blue-500 focus:outline-none px-1 py-0.5"
                style="color: white !important; min-width: 200px;"
                autofocus
              />
              <button
                on:click={saveDeckName}
                class="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                title="Save name"
              >
                <Check size="16" />
              </button>
              <button
                on:click={cancelEditingDeckName}
                class="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                title="Cancel"
              >
                <XIcon size="16" />
              </button>
            </div>
          {:else}
            <h1 class="deck-name text-xl font-bold" style="color: white !important;">{deck.name}</h1>
            <button
              on:click={startEditingDeckName}
              class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Rename deck"
            >
              <Edit3 size="16" />
            </button>
          {/if}
          <p class="text-sm text-gray-500 dark:text-gray-400">{sections.reduce((total, section) => total + (section.cards?.length || 0), 0)} cards • {sections.length} sections</p>
          <!-- <DeckContextIndicator deckId={deck.id} darkMode={true} /> -->
        </div>
      </div>
      <div class="flex items-center gap-2">
        <!-- Collapse/Expand All Buttons -->
        <div class="flex items-center gap-1 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
          <button
            class="collapse-expand-button flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md"
            on:click={collapseAllSections}
            title="Collapse all sections"
          >
            <Minimize2 size="16" />
            <span class="text-xs">Collapse All</span>
          </button>
          <button
            class="collapse-expand-button flex items-center gap-1 px-2 py-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md"
            on:click={expandAllSections}
            title="Expand all sections"
          >
            <Maximize2 size="16" />
            <span class="text-xs">Expand All</span>
          </button>
        </div>
        
        <!-- Branching Paths Toggle - Hidden -->
        <!-- <button
          class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors {showBranchingPaths ? 'text-blue-500 dark:text-blue-400' : ''}"
          on:click={toggleBranchingPaths}
          title={showBranchingPaths ? "Hide branching paths" : "Show branching paths"}
        >
          <Layers size="20" />
        </button> -->
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
        <div class="section-container">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-3">
              <div class="flex gap-1">
                <button
                  class="section-move-button p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move section up"
                  disabled={sectionIndex === 0}
                  on:click={() => moveSectionUp(sectionIndex)}
                >
                  <ChevronsUp size="16" />
                </button>
                <button
                  class="section-move-button p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Move section down"
                  disabled={sectionIndex === sections.length - 1}
                  on:click={() => moveSectionDown(sectionIndex)}
                >
                  <ChevronsDown size="16" />
                </button>
              </div>
              {#if editingSection === section.id}
                <div class="flex items-center gap-2">
                  <input
                    bind:value={editingSectionName}
                    class="text-lg font-semibold text-gray-900 dark:text-white bg-transparent border-b border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:outline-none px-1 py-0.5"
                    on:keydown={(e) => {
                      if (e.key === 'Enter') saveSectionName();
                      if (e.key === 'Escape') cancelEditSection();
                    }}
                    autofocus
                  />
                  <button
                    on:click={saveSectionName}
                    class="p-1 text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                    title="Save name"
                  >
                    <Check size="16" />
                  </button>
                  <button
                    on:click={cancelEditSection}
                    class="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Cancel"
                  >
                    <XIcon size="16" />
                  </button>
                </div>
              {:else}
                <div class="flex items-center gap-2">
                  <h3
                    class="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                    on:click={() => startEditSection(section)}
                    title="Click to edit section name"
                  >
                    {section.name}
                  </h3>
                  <button
                    class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    on:click={() => startEditSection(section)}
                    title="Edit section name"
                  >
                    <Edit3 size="14" />
                  </button>
                </div>
              {/if}
            </div>
            <div class="flex items-center gap-2">
              <!-- Collapse/Expand Button -->
              <button
                class="section-collapse-button p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
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
              <!-- <DeckContextIndicator sectionId={section.id} darkMode={true} isMobile={false} /> -->
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
                      showRemoveButton={false}
                      on:remove={() => removeCardFromSection(lastCard, section.id)}
                    />
                  </div>
                {/if}
      
                <!-- Drop zone for library view -->
                <div
                  class="min-h-[350px] w-[125px] border-2 border-dashed border-white rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors {dragOverSection === section.id && dragOverIndex === -1 ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''}"
                  style="background-color: transparent !important;"
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
              <!-- Fanned Card Deck layout with drop zone on the right -->
              <div class="flex items-start gap-4">
                <!-- Fanned Card Deck - takes up most of the width -->
                <div class="flex-1">
                  {#if section.cards.length > 0}
                    <FannedCardDeck
                      cards={section.cards}
                      maxRotation={0}
                      cardSpacing={200}
                      containerHeight="h-[350px]"
                      allowSelection={false}
                      allowDrag={true}
                      allowReordering={true}
                      on:card-click={openCardZoom}
                      on:drag-start={(e) => handleDragStart(e.detail.event, e.detail.card)}
                      on:drag-end={(e) => handleDragEnd(e.detail.event)}
                      on:card-drag-over={(e) => handleDragOver(e.detail.event, section.id, e.detail.index)}
                      on:card-drag-leave={handleDragLeave}
                      on:card-drop={(e) => handleDrop(e.detail.event, section.id, e.detail.index)}
                      on:progress-change={handleProgressChange}
                      on:rarity-upgrade={handleRarityUpgrade}
                      on:rarity-downgrade={handleRarityDowngrade}
                    />
                  {:else}
                    <!-- Empty state when no cards -->
                    <div class="h-96 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                      <div class="text-center">
                        <Layers size="48" class="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p class="text-gray-500 dark:text-gray-400">No cards in this section</p>
                        <p class="text-sm text-gray-400 mt-1">Drop cards from the library</p>
                      </div>
                    </div>
                  {/if}
                </div>
                
                <!-- Drop zone on the right -->
                <div
                  class="min-h-[350px] w-[125px] border-2 border-dashed border-white rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:border-red-400 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors {dragOverSection === section.id && dragOverIndex === -1 ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}"
                  style="background-color: transparent !important;"
                  on:dragover={(e) => handleDragOver(e, section.id, -1)}
                  on:dragleave={handleDragLeave}
                  on:drop={(e) => handleDrop(e, section.id, -1)}
                  role="button"
                  tabindex="0"
                >
                  <div class="text-center">
                    <Trash2 size="32" class="mx-auto mb-2 opacity-50" />
                    <p class="text-sm">Drop to remove</p>
                    <p class="text-xs text-gray-400 mt-1">From the deck</p>
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
          <div class="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
            <div class="flex items-center justify-between">
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Drag cards to sections to add them
              </p>
              <button
                class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                on:click={toggleCardLibrary}
              >
                <X size="20" />
              </button>
            </div>
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
                    style="background-color: transparent !important;"
                    draggable="true"
                    on:dragstart={(e) => handleDragStart(e, card)}
                    on:dragend={handleDragEnd}
                    role="button"
                    tabindex="0"
                  >
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
        on:zoom-card={handleCardZoomFromWizard}
      />

<style>
  .deck-view-container :global(h1) {
    color: white !important;
  }
  
  .deck-view-container :global(input) {
    color: white !important;
  }
  
  .deck-view-container :global(.text-xl) {
    color: white !important;
  }
  
  .deck-view-container :global(.font-bold) {
    color: white !important;
  }
  
  .deck-view-container :global(.deck-name) {
    color: white !important;
    position: relative !important;
    z-index: 10 !important;
    background: transparent !important;
    text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5) !important;
  }
  
  .deck-view-container :global(.section-container) {
    border: 1px solid white;
    border-radius: 8px;
    padding: 12px 12px 8px 12px;
    transition: all 200ms ease;
  }
  
  /* Target only specific deck view buttons by their classes */
  .deck-view-container :global(.collapse-expand-button) {
    background: transparent !important;
    border: 1px solid white !important;
    color: white !important;
  }
  
  .deck-view-container :global(.collapse-expand-button:hover) {
    background: rgba(255, 255, 255, 0.1) !important;
  }
  
  .deck-view-container :global(.section-move-button) {
    background: transparent !important;
    border: 1px solid white !important;
    color: white !important;
  }
  
  .deck-view-container :global(.section-move-button:hover) {
    background: rgba(255, 255, 255, 0.1) !important;
  }
  
  .deck-view-container :global(.section-collapse-button) {
    background: transparent !important;
    border: 1px solid white !important;
    color: white !important;
  }
  
  .deck-view-container :global(.section-collapse-button:hover) {
    background: rgba(255, 255, 255, 0.1) !important;
  }
  
  /* Target only deck view specific text elements */
  .deck-view-container :global(.deck-name) {
    color: white !important;
  }
  
  .deck-view-container :global(.section-container h3),
  .deck-view-container :global(.section-container .section-title) {
    color: white !important;
  }
  
  .deck-view-container :global(.section-container input) {
    color: white !important;
  }
  
  /* Exclude fanned deck from deck view styling */
  .deck-view-container :global(.fanned-deck-container) {
    /* No styling applied - let fanned deck handle its own styling */
  }
  
  
</style>