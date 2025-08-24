<!-- SessionLogicManager.svelte - Pure logic extracted from projects/+page.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase.js';

  const dispatch = createEventDispatcher();

  // Props - passed from parent component
  export let current; // current project
  export let currentBranchId;
  export let loadingMessages;

  // State that will be managed by this component
  export let sessions = [];
  export let currentSession = null;
  export let messages = [];
  export let branches = [];
  export let currentBranch = null;
  
  // Chat state tracking
  let isChatting = false;

  // Session Management Functions
  export async function loadSessions() {
    if (!current) return;
    
    try {
      // Clear current session when loading for a new project
      // This ensures we don't show sessions from the previous project
      currentSession = null;
      sessions = [];
      messages = [];
      
      const res = await fetch(`/api/sessions?projectId=${current.id}`);
      if (res.ok) {
        const data = await res.json();
        sessions = data.sessions || [];
        
        // Select the active session or the first one if available
        if (sessions.length > 0) {
          const activeSession = sessions.find(s => s.is_active) || sessions[0];
          currentSession = activeSession;
          
          // Load messages and branches for the selected session
          if (currentSession) {
            await loadSessionMessages(currentSession.id);
            await loadSessionBranches(currentSession.id);
          }
        } else {
          // No sessions exist - create a default session for new users
          try {
            const createRes = await fetch('/api/sessions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create',
                projectId: current.id,
                sessionName: 'First Chat'
              })
            });
            
            if (createRes.ok) {
              const { session } = await createRes.json();
              sessions = [session];
              currentSession = session;
              
              console.log('✅ Created default session for new project:', session.session_name);
              
              // Load messages and branches for the new session
              await loadSessionMessages(session.id);
              await loadSessionBranches(session.id);
            } else {
              const errorText = await createRes.text();
              console.error('❌ Failed to create default session:', errorText);
              
              // Try to show user-friendly error
              if (errorText.includes('row-level security')) {
                console.error('🔒 RLS Policy Error: Please check database permissions');
              }
            }
          } catch (error) {
            console.error('❌ Error creating default session:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  }

  export async function selectSession(session) {
    if (session.id === currentSession?.id) return;
    
    try {
      // Activate this session
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate',
          projectId: current.id,
          sessionId: session.id
        })
      });
      
      if (res.ok) {
        currentSession = session;
        // Load messages and branches for this session
        await loadSessionMessages(session.id);
        await loadSessionBranches(session.id, true); // Skip currentBranch updates to prevent conflicts
        
        // Dispatch event to parent
        dispatch('session-selected', { session });
      }
    } catch (error) {
      console.error('Error selecting session:', error);
    }
  }

  export async function loadSessionMessages(sessionId) {
    if (!current || !sessionId) {
      console.warn('💾 loadSessionMessages: Missing requirements', { current: !!current, sessionId });
      return;
    }
    
    console.log('💾 loadSessionMessages: Starting', { sessionId, currentBranchId });
    loadingMessages = true;
    const startTime = Date.now();
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .eq('branch_id', currentBranchId)
        .order('created_at');
      
      // Ensure minimum loading duration
      const elapsed = Date.now() - startTime;
      const minDuration = 500;
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
      }
      
      if (error) {
        console.error('❌ Error loading session messages:', error);
      } else {
        console.log('✅ Loaded session messages:', { count: data?.length || 0, sessionId, branchId: currentBranchId });
        messages = data || [];
      }
    } catch (error) {
      console.error('❌ Error loading session messages:', error);
    } finally {
      loadingMessages = false;
    }
  }

  export async function loadSessionBranches(sessionId, skipCurrentBranchUpdate = false) {
    if (!current || !sessionId) return;
    
    console.log('🌿 loadSessionBranches called:', { sessionId, projectId: current?.id, skipCurrentBranchUpdate });
    
    try {
      const { data, error } = await supabase
        .from('conversation_branches')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at');
      
      if (error) {
        console.error('❌ Error loading session branches:', error);
      } else {
        const sessionBranches = data || [];
        console.log('🌿 Found branches:', sessionBranches.length, sessionBranches.map(b => `${b.branch_name} (${b.branch_id})`));
        
        // Always update branches array to ensure names are fresh (not just when IDs change)
        branches = sessionBranches;
        console.log('🌿 Updated branches array, length:', branches.length);
        
        // IMPORTANT: Only update currentBranch if specifically requested (not during reactive calls)
        // This prevents conflicts when switchToBranch() has already set the correct branch state
        if (!skipCurrentBranchUpdate && (!currentBranch || currentBranch.branch_id === 'main')) {
          const foundBranch = branches.find(b => b.branch_id === currentBranchId);
          const mainBranch = branches.find(b => b.branch_id === 'main');
          const newCurrentBranch = foundBranch || mainBranch || null;
          
          // Only update if we actually need to (prevents unnecessary resets)
          if (!currentBranch || (newCurrentBranch && currentBranch.branch_id !== newCurrentBranch.branch_id)) {
            currentBranch = newCurrentBranch;
          }
        }
      }
    } catch (error) {
      console.error('Error loading session branches:', error);
    }
  }

  // Event handler methods that can be called by parent
  export async function handleSessionCreated(event) {
    // Reload sessions and select the new one
    await loadSessions();
    if (event.detail) {
      await selectSession(event.detail);
    }
  }

  export async function handleSessionUpdated() {
    // Reload sessions to get updated data
    await loadSessions();
  }

  export async function handleSessionDeleted(event) {
    // Remove from local array and select another
    sessions = sessions.filter(s => s.id !== event.detail.id);
    
    if (currentSession?.id === event.detail.id) {
      // Select another session if available
      if (sessions.length > 0) {
        await selectSession(sessions[0]);
      } else {
        currentSession = null;
        messages = [];
        branches = [];
      }
    }
  }
</script>

<!-- This component has no template - it's pure logic -->
