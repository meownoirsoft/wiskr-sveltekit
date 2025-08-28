import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create a writable store with initial value
export const avatars = writable([]);

// Flag to track if avatars have been loaded
let loaded = false;

// Function to load avatars from the server
export async function loadAvatars(force = false) {
  // Skip if already loaded and not forced
  if (loaded && !force) return;
  
  try {
    const response = await fetch('/api/avatars');
    if (!response.ok) throw new Error('Failed to fetch avatars');
    const data = await response.json();
    avatars.set(data);
    loaded = true;

    // Cache the avatars list with timestamp
    if (browser) {
      localStorage.setItem('wiskr_avatars', JSON.stringify({
        list: data,
        timestamp: Date.now()
      }));
    }
  } catch (error) {
    console.error('Error loading avatars:', error);
    // On error, try to load from cache
    if (browser) {
      const cached = localStorage.getItem('wiskr_avatars');
      if (cached) {
        try {
          const { list } = JSON.parse(cached);
          avatars.set(list);
        } catch (e) {
          console.error('Error parsing cached avatars:', e);
        }
      }
    }
  }
}

// Function to check if avatars need refresh (older than 24 hours)
export function needsRefresh() {
  if (!browser) return false;
  
  const cached = localStorage.getItem('wiskr_avatars');
  if (!cached) return true;
  
  try {
    const { timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;
    // Refresh if older than 24 hours
    return age > 24 * 60 * 60 * 1000;
  } catch (e) {
    return true;
  }
}
