<!-- ContextManager.svelte - Context (Facts & Docs) management logic extracted from projects/+page.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase.js';
  import { browser } from '$app/environment';
  import { robustFetch, robustFetchJSON, getNetworkStatus, offlineQueue } from '$lib/utils/networkUtils.js';
  import { incrementPendingOperations, decrementPendingOperations, addNetworkError } from '$lib/stores/networkStore.js';

  const dispatch = createEventDispatcher();

  // Props - passed from parent component
  export let current; // current project
  export let loadingFacts;

  // State that will be managed by this component
  export let facts = [];
  export let docs = [];
  
  // Form state for facts
  export let factType = 'character';
  export let factKey = '';
  export let factValue = '';
  export let factTags = '';
  export let showAddFactForm = false;
  
  // Form state for docs
  export let docTitle = '';
  export let docContent = '';
  export let docTags = '';
  export let showAddDocForm = false;

  // Utility function for parsing tags
  const parseTags = (s) =>
    s.split(',').map(t => t.trim()).filter(Boolean);

  // Context loading function
  export async function loadContext() {
    if (!current) return;
    loadingFacts = true;
    const [{ data: f }, { data: d }, { data: p }] = await Promise.all([
      supabase.from('facts').select('*').eq('project_id', current.id).order('created_at'),
      supabase.from('docs').select('*').eq('project_id', current.id).order('created_at').limit(10),
      supabase.from('projects').select('*').eq('id', current.id).single()
    ]);
    facts = f ?? [];
    docs = d ?? [];
    if (p) {
      // Update current project with fresh brief_text
      dispatch('project-updated', p);
    }
    loadingFacts = false;
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
        await loadContext();
      }
    } catch (error) {
      console.log('Auto-regeneration failed (not critical):', error);
      // Don't show error toasts for background operations
    }
  }

  // FACTS MANAGEMENT FUNCTIONS

  export async function addFact() {
    if (!current) return;
    if (!factKey?.trim() || !factValue?.trim()) return;

    // Parse tags
    const tags = factTags ? factTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Check if offline - queue the request
    if (!getNetworkStatus()) {
      offlineQueue.add(async () => {
        await robustFetchJSON('/api/facts/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: current.id,
            type: factType || 'note',
            key: factKey.trim(),
            value: factValue.trim(),
            tags: tags,
            pinned: false
          })
        });
        // Reload context after sync
        await loadContext();
      }, { type: 'create_fact', factKey: factKey.trim() });
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.offline('Fact will be saved when you come back online.');
      }
      
      // Clear form optimistically
      factKey = ''; factValue = ''; factTags = '';
      showAddFactForm = false;
      return;
    }

    incrementPendingOperations();
    
    try {
      const { fact } = await robustFetchJSON('/api/facts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: current.id,
          type: factType || 'note',
          key: factKey.trim(),
          value: factValue.trim(),
          tags: tags,
          pinned: false
        })
      }, {
        timeout: 15000,
        maxRetries: 2,
        onRetry: (attempt) => {
          if (browser && window.showNetworkToast) {
            window.showNetworkToast.retry('Retrying fact creation', attempt, 3);
          }
        }
      });
      
      // Dispatch event for context score refresh
      if (browser) {
        window.dispatchEvent(new CustomEvent('fact:created', {
          detail: { fact, projectId: current.id }
        }));
      }
      
      // clear form and hide
      factKey = ''; factValue = ''; factTags = '';
      showAddFactForm = false;

      // reload lists
      await loadContext();
      
      // Auto-regenerate summary since facts content changed
      await autoRegenerateSummary();
      
    } catch (error) {
      console.error('ContextManager: Error adding fact:', error);
      addNetworkError(error);
      
      const errorMessage = error.message.includes('Network connection failed') ?
        'Network error. Fact will be saved when connection is restored.' :
        error.message.includes('timeout') ?
        'Request timed out. Please try again.' :
        `Failed to save fact: ${error.message}`;
      
      if (browser && window.showNetworkToast) {
        window.showNetworkToast.error(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      decrementPendingOperations();
    }
  }

  export function startEditFact(f, i) {
    facts = facts.map((x, idx) => idx === i ? { ...x, _editing: true, _editKey: x.key, _editValue: x.value, _editTags: (x.tags || []).join(', ') } : x);
  }

  export function cancelEditFact(f, i) {
    facts = facts.map((x, idx) => idx === i ? { ...x, _editing: false } : x);
  }

  export async function saveFactEdit(f, { type, key, value, tags }) {
    const res = await fetch(`/api/facts/create/${f.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type, key, value,
        tags,
        reembed: 'auto' // re-embed if text changed
      })
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to update fact');
      return;
    }
    // Refresh lists
    await loadContext();
    
    // Auto-regenerate summary since fact content changed
    await autoRegenerateSummary();
  }

  export async function deleteFact(f, i) {
    if (!confirm('Delete this fact?')) return;
    const { error } = await supabase.from('facts').delete().eq('id', f.id);
    if (error) { alert(error.message); return; }
    facts = facts.filter((_, idx) => idx !== i);
    
    // Auto-regenerate summary since fact was deleted
    await autoRegenerateSummary();
  }

  export async function toggleFactPin(f) {
    const wasPinned = f.pinned;
    const willBePinned = !f.pinned;
    
    const res = await fetch(`/api/facts/create/${f.id}/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned: willBePinned, reembed: 'skip' }) // pin doesn't change meaning
    });
    if (!res.ok) {
      console.error(await res.text());
      alert('Failed to toggle pin');
      return;
    }
    
    const { fact } = await res.json();
    
    // Dispatch event for context score refresh when pinning status changes
    if (browser && wasPinned !== willBePinned) {
      const eventType = willBePinned ? 'fact:pinned' : 'fact:unpinned';
      window.dispatchEvent(new CustomEvent(eventType, {
        detail: { fact, projectId: current.id }
      }));
    }
    
    await loadContext();
  }

  // DOCS MANAGEMENT FUNCTIONS

  export async function addDoc() {
    if (!current) return;
    if (!docTitle?.trim()) return;

    // Parse tags
    const tags = docTags ? docTags.split(',').map(t => t.trim()).filter(Boolean) : [];

    // Check if offline - queue the request
    if (!getNetworkStatus()) {
      offlineQueue.add(async () => {
        await robustFetchJSON('/api/docs/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: current.id,
            title: docTitle.trim(),
            content: docContent || '',
            tags: tags,
            pinned: false
          })
        });
        await loadContext();
      }, { type: 'create_doc', docTitle: docTitle.trim() });
      
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
          title: docTitle.trim(),
          content: docContent || '',
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

      await loadContext();
      
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
    await loadContext();
    
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
    await loadContext();
  }

  // HELPER FUNCTIONS FOR PARENT COMPONENT

  // Clear fact form
  export function clearFactForm() {
    factKey = '';
    factValue = '';
    factTags = '';
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
    await loadContext();
  }
</script>

<!-- This component has no template - it's pure logic -->
