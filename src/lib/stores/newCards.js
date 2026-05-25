// newCards.js - Store for tracking newly created cards
import { writable } from 'svelte/store';

// Set of card IDs that are marked as "new"
export const newCardIds = writable(new Set());

// Add a card ID to the new cards set
export function markCardAsNew(cardId) {
  newCardIds.update(ids => {
    const newIds = new Set(ids);
    newIds.add(cardId);
    return newIds;
  });
}

// Remove a card ID from the new cards set
export function markCardAsSeen(cardId) {
  newCardIds.update(ids => {
    const newIds = new Set(ids);
    newIds.delete(cardId);
    return newIds;
  });
}

// Check if a card is new
export function isCardNew(cardId) {
  let isNew = false;
  newCardIds.subscribe(ids => {
    isNew = ids.has(cardId);
  })();
  return isNew;
}
