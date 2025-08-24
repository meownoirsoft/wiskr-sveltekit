<!-- ChatManager.svelte - Manages all chat-related logic and state -->
<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { supabase } from '$lib/supabase.js';

  const dispatch = createEventDispatcher();

  // Props
  export let current = null; // Current project
  export let currentSession = null; // Current session
  export let sessionLogicManager = null; // Reference to session logic manager
  export let modelKey = 'speed';

  // Message state
  export let messages = [];
  export let loadingMessages = false;
  export let input = '';

  // Branch state
  export let currentBranchId = 'main';
  export let currentBranch = null;
  export let branches = [];
  export let messageBranches = []; // Branches for the specific message being branched

  // Questions state
  export let goodQuestions = [];
  export let loadingQuestions = false;

  // Format modal state
  export let showFormatModal = false;
  export let selectedText = '';
  export let selectedMessageIndex = -1;
  export let formattedContent = '';
  export let selectedPlatform = '';
  export let isFormatting = false;

  // Branch modal state
  export let showBranchModal = false;
  export let branchModalMessageIndex = -1;
  export let newBranchName = '';
  export let isCreatingBranch = false;
  export let branchCreateError = '';

  // Rainbow colors for branches
  const RAINBOW_COLORS = [
    { bg: 'bg-white', border: 'border-gray-200', name: 'Main' },        // Main branch
    { bg: 'bg-red-50', border: 'border-red-200', name: 'Red' },         // Red
    { bg: 'bg-orange-50', border: 'border-orange-200', name: 'Orange' }, // Orange  
    { bg: 'bg-yellow-50', border: 'border-yellow-200', name: 'Yellow' }, // Yellow
    { bg: 'bg-green-50', border: 'border-green-200', name: 'Green' },    // Green
    { bg: 'bg-blue-50', border: 'border-blue-200', name: 'Blue' },       // Blue
    { bg: 'bg-indigo-50', border: 'border-indigo-200', name: 'Indigo' }, // Indigo
    { bg: 'bg-purple-50', border: 'border-purple-200', name: 'Purple' }, // Purple
    { bg: 'bg-pink-50', border: 'border-pink-200', name: 'Pink' }        // Pink
  ];

  // Message Management Functions
  export async function loadMessages(projectId = null) {
    const id = projectId || current?.id;
    if (!id || !currentSession) {
      console.warn('Cannot load messages: missing project ID or session');
      return;
    }
    
    // For initial load, reset to main branch
    if (projectId) {
      currentBranchId = 'main';
      // Set the main branch object properly
      currentBranch = {
        project_id: id,
        branch_id: 'main',
        branch_name: 'Main',
        color_index: 0,
        colorClass: 'bg-white border-gray-200'
      };
    }
    
    loadingMessages = true;
    const startTime = Date.now();
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('project_id', id)
      .eq('branch_id', currentBranchId)
      .eq('session_id', currentSession?.id)
      .order('created_at');
    
    // Ensure minimum loading duration of 500ms so spinner is visible
    const elapsed = Date.now() - startTime;
    const minDuration = 500;
    if (elapsed < minDuration) {
      await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
    }
    
    if (error) {
      console.error('Error loading messages:', error);
    } else {
      messages = data ?? [];
    }
    loadingMessages = false;
  }

  export async function send(event) {
    if (!current || !currentSession || !event.detail.message.trim()) return;
    
    try {
      const userMsg = event.detail.message;
      input = '';
      
      // Generate temporary IDs to avoid Svelte key conflicts
      const tempUserMsgId = 'temp_user_' + Date.now();
      const tempAssistantMsgId = 'temp_assistant_' + Date.now();
      messages = [
        ...messages, 
        { id: tempUserMsgId, role: 'user', content: userMsg, created_at: new Date().toISOString() }, 
        { id: tempAssistantMsgId, role: 'assistant', content: '', model_key: modelKey, created_at: new Date().toISOString() }
      ];
      
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: current.id, sessionId: currentSession.id, message: userMsg, modelKey, tz, branchId: currentBranchId })
      });
      
      if (res.status === 429) {
        const data = await res.json();
        messages = [...messages, { role: 'assistant', content: data.message || 'Daily limit reached.' }];
        return;
      }
      
      if (!res.ok) {
        console.error('ChatManager: API request failed', { status: res.status, statusText: res.statusText });
        const errorText = await res.text();
        console.error('ChatManager: Error details:', errorText);
        messages = messages.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: 'Error: Failed to get response' } : m);
        return;
      }
      
      if (!res.body) {
        console.error('ChatManager: No response body for streaming');
        messages = messages.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: 'Error: No response body' } : m);
        return;
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';
      
      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          
          if (chunk === '[DONE]') break;
          
          assistantText += chunk;
         
          // Live update last assistant message
          messages = messages.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: assistantText } : m);
          dispatch('usage-update');
        }
      } catch (streamError) {
        console.error('ChatManager: Streaming error:', streamError);
        messages = messages.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: assistantText || 'Error during streaming: ' + streamError.message } : m);
      }
      
    } catch (error) {
      console.error('ChatManager: Fatal error in send function:', error);
      // Update the assistant message with error
      messages = messages.map((m, i, arr) => i === arr.length - 1 ? { ...m, content: 'Fatal error: ' + error.message } : m);
    }
  }

  // Questions Management Functions
  export async function loadQuestions() {
    if (!current) return;
    
    loadingQuestions = true;
    
    try {
      const res = await fetch(`/api/projects/${current.id}/questions`);
      if (res.ok) {
        const data = await res.json();
        goodQuestions = (data.questions || []).map(q => q.question);
      } else {
        console.error('Failed to load questions:', await res.text());
        goodQuestions = [];
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      goodQuestions = [];
    } finally {
      loadingQuestions = false;
    }
  }

  // Platform Formatting Functions
  export function openFormatModal(messageIndex) {
    selectedMessageIndex = messageIndex;
    selectedText = messages[messageIndex].content;
    showFormatModal = true;
    formattedContent = '';
    selectedPlatform = '';
  }

  export function closeFormatModal() {
    showFormatModal = false;
    selectedText = '';
    selectedMessageIndex = -1;
    formattedContent = '';
    selectedPlatform = '';
  }

  export async function formatForPlatform(platform) {
    if (!selectedText || isFormatting) return;
    
    isFormatting = true;
    selectedPlatform = platform;
    
    try {
      const res = await fetch('/api/format-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: selectedText,
          platform: platform
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        formattedContent = data.formatted || 'Error formatting content';
      } else {
        formattedContent = 'Error: Failed to format content';
      }
    } catch (error) {
      console.error('Format error:', error);
      formattedContent = 'Error: Network error';
    } finally {
      isFormatting = false;
    }
  }

  export async function copyToClipboard(text) {
    if (!text) return;
    
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // Branch Management Functions
  export async function openBranchModal(messageIndex) {
    branchModalMessageIndex = messageIndex;
    newBranchName = '';
    branchCreateError = ''; // Clear any previous errors
    
    // Load branches for this specific message
    if (current && currentSession && messages[messageIndex]?.id) {
      const messageId = messages[messageIndex].id;
      try {
        const res = await fetch('/api/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'listForMessage', 
            projectId: current.id,
            sessionId: currentSession.id,
            messageId: messageId
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          messageBranches = data.branches || [];
        } else {
          console.error('Failed to load branches for message');
          messageBranches = [];
        }
      } catch (error) {
        console.error('Error loading message branches:', error);
        messageBranches = [];
      }
    } else {
      messageBranches = [];
    }
    
    showBranchModal = true;
  }

  export function closeBranchModal() {
    showBranchModal = false;
    branchModalMessageIndex = -1;
    newBranchName = '';
  }

  export async function createBranch() {
    if (!current || branchModalMessageIndex < 0 || !newBranchName.trim() || isCreatingBranch) return;
    
    isCreatingBranch = true;
    
    try {
      const messageId = messages[branchModalMessageIndex]?.id;
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          projectId: current.id,
          messageId: messageId,
          branchName: newBranchName.trim()
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (sessionLogicManager) {
          await sessionLogicManager.loadSessionBranches(currentSession.id);
        }
        await switchToBranch(data.branch.branch_id);
        closeBranchModal();
        
        // Reload message branch counts in the ChatInterface component
        if (browser) {
          window.dispatchEvent(new CustomEvent('branches-updated'));
        }
      } else {
        // Handle error response from server
        try {
          const errorData = await res.json();
          branchCreateError = errorData.error || 'Failed to create branch. Please try again.';
        } catch {
          branchCreateError = 'Failed to create branch. Please try again.';
        }
        console.error('Failed to create branch:', branchCreateError);
      }
    } catch (error) {
      console.error('Error creating branch:', error);
      alert('Error creating branch. Please try again.');
    } finally {
      isCreatingBranch = false;
    }
  }

  export async function switchToBranch(branchId) {
    if (!current || branchId === currentBranchId) {
      return;
    }
    
    try {
      const requestBody = {
        action: 'switch',
        projectId: current.id,
        sessionId: currentSession?.id,
        branchId: branchId
      };
      
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (res.ok) {
        const data = await res.json();
        
        currentBranchId = branchId;
        currentBranch = data.branch;
        messages = data.messages || [];
      } else {
        console.error('Failed to switch branch:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('Error switching branch:', error);
    }
  }

  export function getBranchColor(branch) {
    if (!branch) return RAINBOW_COLORS[0];
    return RAINBOW_COLORS[branch.color_index % RAINBOW_COLORS.length];
  }

  // Legacy function - now replaced by loadSessionBranches
  export async function loadBranches() {
    // This function is now deprecated in favor of loadSessionBranches
    // We keep it for backward compatibility but redirect to loadSessionBranches
    if (currentSession && sessionLogicManager) {
      await sessionLogicManager.loadSessionBranches(currentSession.id);
    } else {
      console.warn('loadBranches called without currentSession - branches may not load correctly');
    }
  }

  // Method to handle branch creation from modal
  export function handleCreateBranch(branchName) {
    newBranchName = branchName;
    createBranch();
  }
</script>

<!-- This component has no template as it only manages logic -->
