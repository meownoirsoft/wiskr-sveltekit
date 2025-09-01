// Business logic extraction for project management
// Reduces component complexity by moving logic out of Svelte components

import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabase.js';

/**
 * Project management composable
 * Handles project CRUD operations and state management
 */
export function useProjectManagement() {
  const projects = writable([]);
  const currentProject = writable(null);
  const isLoading = writable(false);

  // Load projects from database
  async function loadProjects() {
    if (!browser) return;
    
    isLoading.set(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, icon, color, brief_text, description, created_at')
        .order('created_at');
      
      if (error) throw error;
      
      projects.set(data || []);
      
      // Try to restore last selected project
      const lastProjectId = localStorage.getItem('wiskr_last_project_id');
      const lastProject = lastProjectId ? data.find(p => p.id === lastProjectId) : null;
      const projectToSelect = lastProject || data[0];
      
      if (projectToSelect) {
        currentProject.set(projectToSelect);
      }
      
      return data;
    } catch (error) {
      console.error('Failed to load projects:', error);
      return [];
    } finally {
      isLoading.set(false);
    }
  }

  // Select project by ID
  async function selectProject(projectId) {
    if (!browser || !projectId) return;
    
    const projectsValue = await new Promise((resolve) => {
      const unsubscribe = projects.subscribe(value => {
        resolve(value);
        unsubscribe();
      });
    });
    
    const project = projectsValue.find(p => p.id === projectId);
    if (project) {
      currentProject.set(project);
      localStorage.setItem('wiskr_last_project_id', projectId);
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('project:selected', { 
        detail: project 
      }));
    }
  }

  // Create new project
  async function createProject(name, description = '') {
    if (!name?.trim()) {
      throw new Error('Project name is required');
    }

    isLoading.set(true);
    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to create project' }));
        throw new Error(errorData.message || 'Failed to create project');
      }

      const { project } = await response.json();
      
      // Reload projects and select the new one
      await loadProjects();
      await selectProject(project.id);
      
      return project;
    } finally {
      isLoading.set(false);
    }
  }

  // Delete project
  async function deleteProject(projectId) {
    if (!projectId) return;
    
    isLoading.set(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/delete`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete project');
      }
      
      // Reload projects
      await loadProjects();
    } finally {
      isLoading.set(false);
    }
  }

  return {
    projects,
    currentProject,
    isLoading,
    loadProjects,
    selectProject,
    createProject,
    deleteProject
  };
}

/**
 * Event handling composable for project page
 * Centralizes event management logic
 */
export function useProjectEvents() {
  const handlers = new Map();
  
  // Register event handler
  function on(eventName, handler) {
    if (!handlers.has(eventName)) {
      handlers.set(eventName, []);
    }
    handlers.get(eventName).push(handler);
    
    // Return cleanup function
    return () => {
      const eventHandlers = handlers.get(eventName);
      if (eventHandlers) {
        const index = eventHandlers.indexOf(handler);
        if (index > -1) {
          eventHandlers.splice(index, 1);
        }
      }
    };
  }
  
  // Emit event
  function emit(eventName, data) {
    const eventHandlers = handlers.get(eventName);
    if (eventHandlers) {
      eventHandlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${eventName}:`, error);
        }
      });
    }
  }
  
  // Clear all handlers
  function clear() {
    handlers.clear();
  }
  
  return { on, emit, clear };
}

/**
 * Modal management composable
 * Handles modal state and lazy loading
 */
export function useModals() {
  const modals = writable(new Map());
  
  // Show modal
  async function showModal(modalName, props = {}) {
    try {
      const { loadModal } = await import('$lib/utils/lazyModals.js');
      const ModalComponent = await loadModal(modalName);
      
      const modal = new ModalComponent({
        target: document.body,
        props: {
          ...props,
          isOpen: true
        }
      });
      
      // Update store
      modals.update(m => new Map(m.set(modalName, modal)));
      
      // Auto-cleanup on close
      modal.$on('close', () => {
        closeModal(modalName);
      });
      
      return modal;
    } catch (error) {
      console.error(`Failed to show modal ${modalName}:`, error);
    }
  }
  
  // Close modal
  function closeModal(modalName) {
    let modal;
    modals.update(m => {
      modal = m.get(modalName);
      if (modal) {
        m.delete(modalName);
      }
      return new Map(m);
    });
    
    if (modal) {
      modal.$destroy();
    }
  }
  
  // Close all modals
  function closeAllModals() {
    let currentModals;
    modals.update(m => {
      currentModals = Array.from(m.values());
      return new Map();
    });
    
    currentModals?.forEach(modal => modal.$destroy());
  }
  
  return {
    modals,
    showModal,
    closeModal,
    closeAllModals
  };
}

/**
 * Responsive layout composable
 * Handles screen size detection and panel management
 */
export function useResponsiveLayout() {
  const isDesktop = writable(false);
  const showLeftPanel = writable(false);
  const showRightPanel = writable(false);
  const leftPanelCollapsed = writable(false);
  const rightPanelCollapsed = writable(false);
  
  // Update screen size and panel states
  function checkScreenSize() {
    if (!browser) return;
    
    const width = window.innerWidth;
    const desktop = width >= 1280;
    
    isDesktop.update(current => {
      if (current !== desktop) {
        if (desktop) {
          showLeftPanel.set(true);
          showRightPanel.set(true);
        } else {
          showLeftPanel.set(false);
          showRightPanel.set(false);
        }
      }
      return desktop;
    });
  }
  
  // Panel toggle functions
  function toggleLeftPanel() {
    let currentIsDesktop, currentShowRight;
    
    const unsubscribe1 = isDesktop.subscribe(v => currentIsDesktop = v);
    const unsubscribe2 = showRightPanel.subscribe(v => currentShowRight = v);
    unsubscribe1();
    unsubscribe2();
    
    showLeftPanel.update(show => {
      if (!currentIsDesktop && !show && currentShowRight) {
        showRightPanel.set(false);
      }
      return !show;
    });
  }
  
  function toggleRightPanel() {
    let currentIsDesktop, currentShowLeft;
    
    const unsubscribe1 = isDesktop.subscribe(v => currentIsDesktop = v);
    const unsubscribe2 = showLeftPanel.subscribe(v => currentShowLeft = v);
    unsubscribe1();
    unsubscribe2();
    
    showRightPanel.update(show => {
      if (!currentIsDesktop && !show && currentShowLeft) {
        showLeftPanel.set(false);
      }
      return !show;
    });
  }
  
  // Initialize responsive behavior
  function initResponsive() {
    if (!browser) return () => {};
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }
  
  return {
    isDesktop,
    showLeftPanel,
    showRightPanel,
    leftPanelCollapsed,
    rightPanelCollapsed,
    toggleLeftPanel,
    toggleRightPanel,
    initResponsive
  };
}
