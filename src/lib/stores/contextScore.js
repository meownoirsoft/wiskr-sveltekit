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

/**
 * Load/refresh the context quality score for a project
 * @param {string} projectId - Project ID to load score for
 * @param {boolean} force - Force refresh even if recently loaded
 * @returns {Promise<number>} The context quality score
 */
export async function refreshContextScore(projectId, force = false) {
  if (!projectId || !browser) return 0;
  
  contextScoreLoading.set(true);
  
  try {
    // Use the context score utility endpoint (we need to create this)
    let response;
    try {
      response = await fetch(`/api/context-score/${projectId}`);
    } catch {
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
      contextScore.set(score);
      return score;
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
  
  currentProjectId = projectId;
  
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
  window.removeEventListener('fact:created', handleFactEvent);
  window.removeEventListener('fact:updated', handleFactEvent);
  window.removeEventListener('fact:pinned', handleFactEvent);
  window.removeEventListener('fact:unpinned', handleFactEvent);
  window.removeEventListener('project:updated', handleProjectEvent);
  
  // Add new listeners
  window.addEventListener('fact:created', handleFactEvent);
  window.addEventListener('fact:updated', handleFactEvent);
  window.addEventListener('fact:pinned', handleFactEvent);
  window.addEventListener('fact:unpinned', handleFactEvent);
  window.addEventListener('project:updated', handleProjectEvent);
}

/**
 * Handle fact-related events that affect context score
 */
function handleFactEvent(event) {
  const { fact, projectId } = event.detail || {};
  
  // Only refresh if this event is for our current project
  if (projectId && projectId === currentProjectId) {
    scheduleRefresh(projectId);
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
  
  // Clear existing timeout to debounce rapid updates
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  
  // Schedule refresh after a brief delay
  refreshTimeout = setTimeout(() => {
    refreshContextScore(projectId, true);
  }, 1500); // 1.5 second delay to allow server-side score calculation
}

/**
 * Clean up event listeners and timeouts
 */
export function cleanupContextScoreTracking() {
  if (!browser) return;
  
  window.removeEventListener('fact:created', handleFactEvent);
  window.removeEventListener('fact:updated', handleFactEvent);
  window.removeEventListener('fact:pinned', handleFactEvent);
  window.removeEventListener('fact:unpinned', handleFactEvent);
  window.removeEventListener('project:updated', handleProjectEvent);
  
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
    refreshTimeout = null;
  }
  
  currentProjectId = null;
}
