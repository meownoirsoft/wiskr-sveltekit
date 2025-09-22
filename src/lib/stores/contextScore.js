// src/lib/stores/contextScore.js
// Client-side context score management and automatic refresh system

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Context score store
export const contextScore = writable(0);
export const contextScoreLoading = writable(false);

// Track which project we're currently watching
let currentProjectId = null;
let refreshTimeout = null;
let isInitialized = false;

/**
 * Load/refresh the context quality score for a project
 * @param {string} projectId - Project ID to load score for
 * @param {boolean} force - Force refresh even if recently loaded
 * @returns {Promise<number>} The context quality score
 */
export async function refreshContextScore(projectId, force = false) {
  if (!projectId || !browser) return 0;
  
  console.log('🎯 Context score: Starting refresh for project', projectId, 'force:', force);
  contextScoreLoading.set(true);
  
  try {
    // Use the context score utility endpoint (we need to create this)
    let response;
    try {
      console.log('🎯 Context score: Fetching from /api/context-score/', projectId);
      response = await fetch(`/api/context-score/${projectId}`);
    } catch {
      console.log('🎯 Context score: Fallback to /api/context/analyze');
      // Fallback to full analysis if dedicated endpoint doesn't exist
      response = await fetch('/api/context/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          userMessage: "Quick context quality check" 
        })
      });
    }
    
    if (response.ok) {
      const data = await response.json();
      const score = data.score || data.summary?.contextQualityScore || 0;
      console.log('🎯 Context score: Got score', score, 'from API');
      contextScore.set(score);
      return score;
    } else {
      console.log('🎯 Context score: API response not ok', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Failed to load context quality score:', error);
  } finally {
    contextScoreLoading.set(false);
  }
  
  return 0;
}

/**
 * Initialize context score management for a project
 * @param {string} projectId - Project ID to track
 */
export function initContextScoreTracking(projectId) {
  if (!browser || !projectId) return;
  
  // Prevent multiple initializations for the same project
  if (isInitialized && currentProjectId === projectId) {
    console.log('🎯 Context score: Already initialized for project', projectId, '- skipping');
    return;
  }
  
  // If switching projects, clean up first
  if (isInitialized && currentProjectId !== projectId) {
    console.log('🎯 Context score: Switching projects from', currentProjectId, 'to', projectId);
    cleanupContextScoreTracking();
  }
  
  currentProjectId = projectId;
  isInitialized = true;
  
  console.log('🎯 Context score: Initializing tracking for project', projectId);
  
  // Load initial score
  refreshContextScore(projectId);
  
  // Set up event listeners for automatic refresh
  setupEventListeners();
}

/**
 * Set up event listeners for automatic context score refresh
 */
function setupEventListeners() {
  if (!browser) return;
  
  // Remove existing listeners to prevent duplicates
  window.removeEventListener('card:created', handleCardEvent);
  window.removeEventListener('card:updated', handleCardEvent);
  window.removeEventListener('card:pinned', handleCardEvent);
  window.removeEventListener('card:unpinned', handleCardEvent);
  window.removeEventListener('project:updated', handleProjectEvent);
  
  // Add new listeners
  window.addEventListener('card:created', handleCardEvent);
  window.addEventListener('card:updated', handleCardEvent);
  window.addEventListener('card:pinned', handleCardEvent);
  window.addEventListener('card:unpinned', handleCardEvent);
  window.addEventListener('project:updated', handleProjectEvent);
}

/**
 * Handle card-related events that affect context score
 */
function handleCardEvent(event) {
  const { card, projectId } = event.detail || {};
  
  console.log('🎯 Context score: Card event received', { card: card?.title, projectId, currentProjectId });
  
  // Only refresh if this event is for our current project
  if (projectId && projectId === currentProjectId) {
    console.log('🎯 Context score: Scheduling refresh for project', projectId);
    scheduleRefresh(projectId);
  } else {
    console.log('🎯 Context score: Event not for current project', { projectId, currentProjectId });
  }
}

/**
 * Handle project-related events that affect context score
 */
function handleProjectEvent(event) {
  const { project } = event.detail || {};
  
  // Only refresh if this event is for our current project
  if (project?.id === currentProjectId) {
    scheduleRefresh(project.id);
  }
}

/**
 * Schedule a context score refresh with debouncing
 * @param {string} projectId - Project ID to refresh score for
 */
function scheduleRefresh(projectId) {
  if (!browser) return;
  
  console.log('🎯 Context score: Scheduling refresh for project', projectId);
  
  // Clear existing timeout to debounce rapid updates
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  // Schedule refresh after a brief delay
  refreshTimeout = setTimeout(() => {
    console.log('🎯 Context score: Executing refresh for project', projectId);
    refreshContextScore(projectId, true);
  }, 1500); // 1.5 second delay to allow server-side score calculation
}

/**
 * Clean up event listeners and timeouts
 */
export function cleanupContextScoreTracking() {
  if (!browser) return;
  
  window.removeEventListener('card:created', handleCardEvent);
  window.removeEventListener('card:updated', handleCardEvent);
  window.removeEventListener('card:pinned', handleCardEvent);
  window.removeEventListener('card:unpinned', handleCardEvent);
  window.removeEventListener('project:updated', handleProjectEvent);
  
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  
  currentProjectId = null;
  isInitialized = false;
}
