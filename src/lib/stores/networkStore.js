// Network status store for reactive network state management
import { writable, derived } from 'svelte/store';
import { subscribeToNetworkStatus, getNetworkStatus } from '$lib/utils/networkUtils.js';

// Core network status
export const isOnline = writable(getNetworkStatus());

// Network quality indicator (can be extended)
export const networkQuality = writable('good'); // 'good', 'poor', 'offline'

// Pending network operations counter
export const pendingOperations = writable(0);

// Recent network errors
export const recentErrors = writable([]);

// Derived stores
export const connectionStatus = derived(
  [isOnline, networkQuality, pendingOperations],
  ([online, quality, pending]) => ({
    online,
    quality,
    pending,
    status: !online ? 'offline' : quality === 'poor' ? 'poor' : pending > 0 ? 'syncing' : 'connected'
  })
);

// Initialize network status subscription
if (typeof window !== 'undefined') {
  subscribeToNetworkStatus((online) => {
    isOnline.set(online);
    
    // Update network quality based on online status
    networkQuality.update(current => {
      if (!online) return 'offline';
      if (current === 'offline') return 'good'; // Coming back online
      return current;
    });
    
    // Clear errors when coming back online
    if (online) {
      recentErrors.set([]);
    }
  });
}

// Helper functions
export function incrementPendingOperations() {
  pendingOperations.update(count => count + 1);
}

export function decrementPendingOperations() {
  pendingOperations.update(count => Math.max(0, count - 1));
}

export function addNetworkError(error) {
  const errorEntry = {
    id: Date.now(),
    message: error.message || error,
    timestamp: new Date(),
    type: 'network'
  };
  
  recentErrors.update(errors => {
    const newErrors = [errorEntry, ...errors];
    // Keep only last 5 errors
    return newErrors.slice(0, 5);
  });
}

export function clearNetworkErrors() {
  recentErrors.set([]);
}
