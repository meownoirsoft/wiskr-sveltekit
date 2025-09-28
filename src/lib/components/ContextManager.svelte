<!-- ContextManager.svelte - Context (Cards & Docs) management logic extracted from projects/+page.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { browser } from '$app/environment';
  import { robustFetch, robustFetchJSON, getNetworkStatus, offlineQueue } from '$lib/utils/networkUtils.js';
  import { incrementPendingOperations, decrementPendingOperations, addNetworkError } from '$lib/stores/networkStore.js';
  import { markCardAsNew } from '$lib/stores/newCards.js';
  import ConfirmModal from './ConfirmModal.svelte';

  const dispatch = createEventDispatcher();

  // Props - passed from parent component
  export let current; // current project
  
  // Track last load time to detect new cards
  let lastLoadTime = Date.now();
  export let loadingCards;
  
  // Track last loaded project to prevent unnecessary reloads
  let lastLoadedProjectId = null;
  let isLoading = false;
  
  // Function to clear cache and force reload
  export function clearCache() {
    lastLoadedProjectId = null;
    console.log('🔍 ContextManager: Cache cleared, next load will be forced');
  }
  
  // Function to detect and mark new cards
  function detectNewCards(newCards) {
    const currentTime = Date.now();
    const timeThreshold = 5000; // 5 seconds - cards created within this time are considered "new"
    
    newCards.forEach(card => {
      const cardCreatedTime = new Date(card.created_at).getTime();
      const timeDiff = currentTime - cardCreatedTime;
      
      // If card was created recently and after our last load, mark it as new
      if (timeDiff < timeThreshold && cardCreatedTime > lastLoadTime) {
        markCardAsNew(card.id);
      }
    });
    
    lastLoadTime = currentTime;
  }

  // State that will be managed by this component
  export let cards = [];
  export let docs = [];
  
  // Delete confirmation state
  let showDeleteConfirm = false;
  let cardToDelete = null;
  
  // Form state for cards
  export let cardType = 'character';
  export let cardTitle = '';
  export let cardContent = '';
  export let cardTags = '';
  export let showAddCardForm = false;
  
  // Form state for docs
  export let docTitle = '';
  export let docContent = '';
  export let docTags = '';
  export let showAddDocForm = false;

  // Utility function for parsing tags
  const parseTags = (s) =>
    s.split(',').map(t => t.trim()).filter(Boolean);

  // Context loading function
  export async function loadContext(force = false) {
    if (!current) return;
    
    // Prevent unnecessary reloads if we're already loading or if it's the same project
    if (isLoading) {
      console.log('🔍 ContextManager: Already loading, skipping duplicate request');
      return;
    }
    
    if (!force && lastLoadedProjectId === current.id) {
      console.log('🔍 ContextManager: Same project already loaded, skipping reload');
      return;
    }
    
    isLoading = true;
    loadingCards = true;
    
    console.log('🔍 ContextManager: Loading context for project:', current.id, force ? '(forced)' : '', 'lastLoaded:', lastLoadedProjectId);
    
    const [{ data: c }, { data: d }, { data: p }] = await Promise.all([
      supabase.from('cards').select('*').eq('project_id', current.id).order('created_at', { ascending: false }),
      supabase.from('docs').select('*').eq('project_id', current.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('projects').select('*').eq('id', current.id).single()
    ]);
    // Load cards directly from the cards table
    const rawCards = c ?? [];
    console.log('🔍 ContextManager: Loading cards, found', rawCards.length, 'total cards');
    
    // No mock cards - let users start with a clean slate
    
    cards = rawCards.map(card => {
      // console.log('🔍 ContextManager: Processing card:', {
      //   id: card.id,
      //   title: card.title,
      //   content: card.content?.substring(0, 50) + '...'
      // });
      
      // Cards are already in the correct format from the cards table
      return {
        id: card.id,
        title: card.title,
        content: card.content,
        tags: card.tags || [],
        type: 'card', // All cards are of type 'card'
        rarity: card.rarity || 'common',
        progress: card.progress || 1,
        mana_cost: card.mana_cost || 1,
        art_url: card.art_url,
        pinned: card.pinned || false,
        created_at: card.created_at,
        project_id: card.project_id,
        generation_model: card.generation_model || 'GPT-4o',
        art_model: card.art_model || 'Midjourney'
      };
    });
    
    // Detect and mark new cards (for pack opening, etc.)
    detectNewCards(rawCards);
    
    console.log('🎴 ContextManager: Final cards array:', cards.length, 'items');
    if (cards.length > 0) {
      console.log('🎴 ContextManager: First card:', {
        id: cards[0].id,
        title: cards[0].title,
        content: cards[0].content?.substring(0, 50) + '...',
        rarity: cards[0].rarity,
        hasContent: 'content' in cards[0]
      });
    }
    docs = d ?? [];
    if (p) {
      // Update current project with fresh brief_text
      dispatch('project-updated', p);
    }
    
    // Update tracking variables
    lastLoadedProjectId = current.id;
    isLoading = false;
    loadingCards = false;
  }

  // Helper function for auto-regenerating summary when content changes
  async function autoRegenerateSummary() {
    if (!current) return;
    
    try {
      // Only auto-regenerate if online - this is not critical
      if (getNetworkStatus()) {
        await robustFetchJSON('/api/brief/regenerate', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ projectId: current.id })
        }, {
          timeout: 10000,
          maxRetries: 1 // Keep retries low for background operations
        });
        
        // Reload context to refresh the UI with the new summary
        await loadContext(true);
      }
    } catch (error) {
      console.log('Auto-regeneration failed (not critical):', error);
      // Don't show error toasts for background operations
    }
  }

  // CARDS MANAGEMENT FUNCTIONS

  export async function addCard(cardData = null) {
    console.log('🎴 ContextManager: addCard called with data:', cardData);
    console.log('🎴 ContextManager: current project:', current?.id);
    
    if (!current) {
      console.error('🎴 ContextManager: No current project!');
      
      // Show user-friendly error message
      if (browser && window.showToast) {
        window.showToast(
          'Please select a project before creating a card.',
          'error'
        );
      }
      return;
    }

    // Use provided data or fall back to form variables
    const title = cardData?.title || cardTitle;
    const content = cardData?.content || cardContent;
    const tags = cardData?.tags || (cardTags ? cardTags.split(',').map(t => t.trim()).filter(Boolean) : []);
    const rarity = cardData?.rarity || 'common';
    const progress = cardData?.progress || 1;
    const manaCost = cardData?.mana_cost || 1;

    console.log('🎴 ContextManager: Using title:', title);
    console.log('🎴 ContextManager: Using content:', content?.substring(0, 50) + '...');
    console.log('🎴 ContextManager: Using tags:', tags);
    
    if (!title?.trim() || !content?.trim()) {
      console.error('🎴 ContextManager: Missing title or content!');
      
      // Show user-friendly error message
      if (browser && window.showToast) {
        const missingFields = [];
        if (!title?.trim()) missingFields.push('title');
        if (!content?.trim()) missingFields.push('content');
        
        window.showToast(
          `Please provide a ${missingFields.join(' and ')} for the card.`,
          'error'
        );
      }
      return;
    }

    // Check if offline - queue the request
    if (!getNetworkStatus()) {
      offlineQueue.add(async () => {
        await robustFetchJSON('/api/cards/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: current.id,
            title: title.trim(),
            content: content.trim(),
            tags: tags,
            pinned: false,
            rarity: rarity,
            progress: progress,
            mana_cost: manaCost
          })
        });
        // Reload context after sync
        await loadContext(true);
      }, { type: 'create_card', cardTitle: title.trim() });
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.offline('Card will be saved when you come back online.');
      }
      
      // Clear form optimistically
      cardTitle = ''; cardContent = ''; cardTags = '';
      showAddCardForm = false;
      return;
    }

    incrementPendingOperations();
    
    try {
      const { card } = await robustFetchJSON('/api/cards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: current.id,
          title: title.trim(),
          content: content.trim(),
          tags: tags,
          pinned: false,
          rarity: rarity,
          progress: progress,
          mana_cost: manaCost
        })
      }, {
        timeout: 15000,
        maxRetries: 2,
        onRetry: (attempt) => {
          if (browser && window.showNetworkToast) {
            window.showNetworkToast.retry('Retrying card creation', attempt, 3);
          }
        }
      });
      
      // Dispatch event for context score refresh
      if (browser) {
        window.dispatchEvent(new CustomEvent('card:created', {
          detail: { card, projectId: current.id }
        }));
      }
      
      // clear form and hide
      cardTitle = ''; cardContent = ''; cardTags = '';
      showAddCardForm = false;

      // reload lists
      await loadContext(true);
      
      // Auto-regenerate summary since cards content changed
      await autoRegenerateSummary();
      
    } catch (error) {
      console.error('ContextManager: Error adding card:', error);
      addNetworkError(error);
      
      const errorMessage = error.message.includes('Network connection failed') ?
        'Network error. Card will be saved when connection is restored.' :
        error.message.includes('timeout') ?
        'Request timed out. Please try again.' :
        `Failed to save card: ${error.message}`;
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.error(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      decrementPendingOperations();
    }
  }

  export async function addCardFromCombine(cardData) {
    if (!current) {
      console.error('ContextManager: No current project, cannot add card from combine');
      return;
    }
    
    console.log('ContextManager: Adding card from combine operation:', cardData);
    console.log('ContextManager: Current project:', current);
    
    // Check if offline - queue the request
    if (!getNetworkStatus()) {
      offlineQueue.add(async () => {
        await robustFetchJSON('/api/cards/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: current.id,
            title: cardData.title?.trim() || 'Untitled Card',
            content: cardData.content?.trim() || '',
            tags: cardData.tags || [],
            pinned: false,
            rarity: cardData.rarity || 'common',
            progress: cardData.progress || 1,
            mana_cost: cardData.mana_cost || 1
          })
        });
        // Reload context after sync
        await loadContext(true);
      }, { type: 'create_card', cardTitle: cardData.title?.trim() || 'Untitled Card' });
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.offline('Card will be saved when you come back online.');
      }
      return;
    }

    incrementPendingOperations();
    
    try {
      const { card } = await robustFetchJSON('/api/cards/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: current.id,
          title: cardData.title?.trim() || 'Untitled Card',
          content: cardData.content?.trim() || '',
          tags: cardData.tags || [],
          pinned: false,
          rarity: cardData.rarity || 'common',
          progress: cardData.progress || 1,
          mana_cost: cardData.mana_cost || 1
        })
      }, {
        timeout: 15000,
        maxRetries: 2,
        onRetry: (attempt) => {
          if (browser && window.showNetworkToast) {
            window.showNetworkToast.retry('Retrying card creation', attempt, 3);
          }
        }
      });
      
      // Dispatch event for context score refresh
      if (browser) {
        window.dispatchEvent(new CustomEvent('card:created', {
          detail: { card, projectId: current.id }
        }));
      }
      
      // reload lists
      await loadContext(true);
      
      // Auto-regenerate summary since cards content changed
      await autoRegenerateSummary();
      
      if (browser && window.showNetworkToast && window.showNetworkToast.success) {
        window.showNetworkToast.success('Card created successfully!');
      } else if (browser) {
        console.log('✅ Card created successfully!');
      }
      
    } catch (error) {
      console.error('ContextManager: Error adding card from combine:', error);
      addNetworkError(error);
      
      const errorMessage = error.message.includes('Network connection failed') ?
        'Network error. Card will be saved when connection is restored.' :
        error.message.includes('timeout') ?
        'Request timed out. Please try again.' :
        `Failed to save card: ${error.message}`;
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.error(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      decrementPendingOperations();
    }
  }

  export function startEditCard(f, i) {
    cards = cards.map((x, idx) => idx === i ? { ...x, _editing: true, _editTitle: x.title, _editContent: x.content, _editTags: (x.tags || []).join(', ') } : x);
  }

  export function cancelEditCard(f, i) {
    cards = cards.map((x, idx) => idx === i ? { ...x, _editing: false } : x);
  }

  export async function saveCardEdit(f, { type, title, content, tags }) {
    // Increment mana cost by 1 for each edit
    const newManaCost = (f.mana_cost || 0) + 1;
    
    const res = await fetch(`/api/cards/create/${f.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: title, 
        content: content,
        tags,
        mana_cost: newManaCost,
        reembed: 'auto' // re-embed if text changed
      })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to update card');
      return;
    }
    // Refresh lists
    await loadContext(true);
    
    // Auto-regenerate summary since card content changed
    await autoRegenerateSummary();
  }

  export async function deleteCard(f, i) {
    // Show confirmation modal
    showDeleteConfirm = true;
    cardToDelete = { card: f, index: i };
  }

  // Alternative delete function that doesn't require index
  export async function deleteCardById(cardId) {
    // Find the card and its index
    const cardIndex = cards.findIndex(f => f.id === cardId);
    if (cardIndex === -1) {
      console.error('Card not found:', cardId);
      return;
    }
    
    const card = cards[cardIndex];
    showDeleteConfirm = true;
    cardToDelete = { card: card, index: cardIndex };
  }

  async function confirmDelete() {
    if (!cardToDelete) return;
    
    const { card: f, index: i } = cardToDelete;
    
    // Close modal immediately
    showDeleteConfirm = false;
    cardToDelete = null;
    
    try {
      const { error } = await supabase.from('cards').delete().eq('id', f.id);
      if (error) { 
        alert(error.message); 
        return; 
      }
      
      // Remove from local array
      cards = cards.filter((_, idx) => idx !== i);
      
      // Auto-regenerate summary since card was deleted
      await autoRegenerateSummary();
      
    } catch (error) {
      console.error('Error deleting card:', error);
      alert('Failed to delete card');
    }
  }

  function cancelDelete() {
    showDeleteConfirm = false;
    cardToDelete = null;
  }

  export async function toggleCardPin(f) {
    const wasPinned = f.pinned;
    const willBePinned = !f.pinned;
    
    const res = await fetch(`/api/cards/create/${f.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: willBePinned })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to toggle pin');
      return;
    }
    
    const { card } = await res.json();
    
    // Dispatch event for context score refresh when pinning status changes
    if (browser && wasPinned !== willBePinned) {
      const eventType = willBePinned ? 'card:pinned' : 'card:unpinned';
      window.dispatchEvent(new CustomEvent(eventType, {
        detail: { card, projectId: current.id }
      }));
    }
    
    await loadContext(true);
  }

  // DOCS MANAGEMENT FUNCTIONS

  export async function addDoc(data = null) {
    if (!current) return;
    
    // Use passed data or fall back to bound variables
    const title = data?.title || docTitle;
    const content = data?.content || docContent;
    const tagsString = data?.tags ? data.tags.join(',') : docTags;
    
    if (!title?.trim()) return;

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Check if offline - queue the request
    if (!getNetworkStatus()) {
      offlineQueue.add(async () => {
        await robustFetchJSON('/api/docs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: current.id,
            title: title.trim(),
            content: content || '',
            tags: tags,
            pinned: false
          })
        });
        await loadContext(true);
      }, { type: 'create_doc', docTitle: title.trim() });
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.offline('Document will be saved when you come back online.');
      }
      
      // Clear form optimistically
      docTitle = ''; docContent = ''; docTags = '';
      showAddDocForm = false;
      return;
    }

    incrementPendingOperations();
    
    try {
      await robustFetchJSON('/api/docs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: current.id,
          title: title.trim(),
          content: content || '',
          tags: tags,
          pinned: false
        })
      }, {
        timeout: 20000, // Longer timeout for docs (might be larger)
        maxRetries: 2,
        onRetry: (attempt) => {
          if (browser && window.showNetworkToast) {
            window.showNetworkToast.retry('Retrying document creation', attempt, 3);
          }
        }
      });
      
      // Clear and hide form
      docTitle = ''; docContent = ''; docTags = '';
      showAddDocForm = false;

      await loadContext(true);
      
      // Auto-regenerate summary since docs content changed
      await autoRegenerateSummary();
      
    } catch (error) {
      console.error('ContextManager: Error adding document:', error);
      addNetworkError(error);
      
      const errorMessage = error.message.includes('Network connection failed') ?
        'Network error. Document will be saved when connection is restored.' :
        error.message.includes('timeout') ?
        'Request timed out. Please try again.' :
        `Failed to create document: ${error.message}`;
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.error(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      decrementPendingOperations();
    }
  }

  export function startEditDoc(d, i) {
    docs = docs.map((x, idx) =>
      idx === i ? { ...x, _editing: true, _editTitle: x.title, _editContent: x.content, _editTags: (x.tags || []).join(', ') } : x
    );
  }

  export function cancelEditDoc(d, i) {
    docs = docs.map((x, idx) => idx === i ? { ...x, _editing: false } : x);
  }

  export async function saveDocEdit(d, { title, content, tags }) {
    const res = await fetch(`/api/docs/${d.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title, content, tags,
        reembed: 'auto' // only re-embed if text changed
      })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to update doc');
      return;
    }
    await loadContext(true);
    
    // Auto-regenerate summary since doc content changed
    await autoRegenerateSummary();
  }

  export async function deleteDoc(d, i) {
    if (!confirm('Delete this doc?')) return;
    const { error } = await supabase.from('docs').delete().eq('id', d.id);
    if (error) { alert(error.message); return; }
    docs = docs.filter((_, idx) => idx !== i);
    
    // Auto-regenerate summary since doc was deleted
    await autoRegenerateSummary();
  }

  export async function toggleDocPin(d) {
    const res = await fetch(`/api/docs/${d.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: !d.pinned, reembed: 'skip' })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to toggle pin');
      return;
    }
    await loadContext(true);
  }

  // HELPER FUNCTIONS FOR PARENT COMPONENT

  // Clear card form
  export function clearCardForm() {
    cardTitle = '';
    cardContent = '';
    cardTags = '';
  }

  // Clear doc form  
  export function clearDocForm() {
    docTitle = '';
    docContent = '';
    docTags = '';
  }

  // Regenerate brief (exposed for external use)
  export async function regenerateBrief() {
    if (!current) return;
    await fetch('/api/brief/regenerate', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ projectId: current.id })
    });
    await loadContext(true);
  }
</script>

<!-- This component has no template - it's pure logic -->

<!-- Delete Confirmation Modal -->
<ConfirmModal
  bind:isOpen={showDeleteConfirm}
  title="Delete Card"
  message="Are you sure you want to delete this card? This action cannot be undone."
  confirmText="Delete"
  cancelText="Cancel"
  confirmClass="bg-red-600 hover:bg-red-700 text-white"
  on:confirm={confirmDelete}
  on:cancel={cancelDelete}
/>
