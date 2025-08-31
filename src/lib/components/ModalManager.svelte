<!-- ModalManager.svelte - Centralized modal state management extracted from projects/+page.svelte -->
<script>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  // Platform formatting modal state
  export let showFormatModal = false;
  export let selectedText = '';
  export let selectedMessageIndex = -1;
  export let formattedContent = '';
  export let selectedPlatform = '';
  export let isFormatting = false;

  // Branching modal state
  export let showBranchModal = false;
  export let branchModalMessageIndex = -1;
  export let newBranchName = '';
  export let isCreatingBranch = false;
  export let branchCreateError = '';
  export let messageBranches = []; // Branches for the specific message being branched

  // New Project modal state
  export let showNewProjectModal = false;
  export let newProjectName = '';
  export let newProjectDescription = '';
  export let creatingProject = false;
  export let createProjectErr = '';

  // Project Settings modal state
  export let showProjectSettingsModal = false;
  export let projectSettingsProject = null;
  
  // Mr Wiskr modal state
  export let showMrWiskrModal = false;
  export const mrWiskrLoading = false;

  // Usage stats modal/popover state
  export let showUsageStats = false;
  export let showUsagePopover = false;
  export const usageButtonElement = null;

  // Platform formatting functions
  export function openFormatModal(messageIndex, text = null) {
    selectedMessageIndex = messageIndex;
    selectedText = text || ''; // Can be passed directly for selected text
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
      dispatch('copy-success', { text });
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      dispatch('copy-success', { text });
    }
  }

  // Branching modal functions
  export async function openBranchModal(messageIndex, current, currentSession, messages) {
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
    branchCreateError = '';
  }

  export async function createBranch(current, currentSession, messages) {
    if (!current || branchModalMessageIndex < 0 || !newBranchName.trim() || isCreatingBranch) return;
    
    isCreatingBranch = true;
    branchCreateError = '';
    
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
        closeBranchModal();
        
        // Dispatch event for parent to handle branch switching and updates
        dispatch('branch-created', { 
          branch: data.branch,
          sessionId: currentSession.id 
        });
        
        return data.branch;
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
      branchCreateError = 'Error creating branch. Please try again.';
    } finally {
      isCreatingBranch = false;
    }
  }

  // New Project modal functions
  export function openNewProjectModal() {
    showNewProjectModal = true;
    newProjectName = '';
    newProjectDescription = '';
    createProjectErr = '';
  }

  export function closeNewProjectModal() {
    showNewProjectModal = false;
    newProjectName = '';
    newProjectDescription = '';
    createProjectErr = '';
  }

  export async function createProject() {
    if (!newProjectName.trim()) { 
      createProjectErr = 'Please enter a name.'; 
      return; 
    }
    
    createProjectErr = '';
    creatingProject = true;
    
    try {
      const res = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProjectName.trim(),
          description: newProjectDescription.trim()
        })
      });

      if (!res.ok) {
        const raw = await res.text();
        console.error('Create project failed:', raw);
        // Try to extract a short message
        let msg = '';
        try { msg = (JSON.parse(raw).message) || raw; } catch { msg = raw; }
        // Strip tags and truncate
        msg = msg.replace(/<[^>]+>/g, '').slice(0, 200);
        createProjectErr = msg || 'Failed to create project';
        return;
      }

      const { project } = await res.json();
      closeNewProjectModal();

      // Dispatch event for parent to handle project reload and selection
      dispatch('project-created', { project });

    } catch (e) {
      createProjectErr = e.message || 'Failed to create project';
    } finally {
      creatingProject = false;
    }
  }

  // Project Settings modal functions
  export function openProjectSettingsModal(project) {
    projectSettingsProject = project;
    showProjectSettingsModal = true;
  }

  export function closeProjectSettingsModal() {
    showProjectSettingsModal = false;
    projectSettingsProject = null;
    
    // Dispatch event so parent can handle any necessary refreshes
    dispatch('project-settings-closed');
  }

  // Mr Wiskr modal functions
  export function openMrWiskrModal() {
    showMrWiskrModal = true;
  }

  export function closeMrWiskrModal() {
    showMrWiskrModal = false;
  }

  // Usage stats functions
  export function toggleUsageStats() {
    showUsageStats = !showUsageStats;
  }

  export function toggleUsagePopover() {
    showUsagePopover = !showUsagePopover;
  }

  export function closeUsagePopover() {
    showUsagePopover = false;
  }

  // Close any open modals (utility function)
  export function closeAllModals() {
    closeFormatModal();
    closeBranchModal();
    closeNewProjectModal();
    closeProjectSettingsModal();
    closeMrWiskrModal();
    closeUsagePopover();
  }

  // Check if any modal is currently open
  export function hasOpenModal() {
    return showFormatModal || 
           showBranchModal || 
           showNewProjectModal || 
           showProjectSettingsModal || 
           showMrWiskrModal ||
           showUsagePopover;
  }
</script>

<!-- ModalManager is a logical component with no template -->
