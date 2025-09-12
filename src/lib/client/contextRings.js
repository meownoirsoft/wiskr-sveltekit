// Client-side context rings service
// Provides easy access to the context rings API

/**
 * Get context rings for an operation
 * @param {Object} params
 * @param {string} params.operation - Operation type (create, edit, merge, split, search)
 * @param {Array} params.targetCards - Cards being acted upon
 * @param {string} params.deckId - Current deck ID (optional)
 * @param {string} params.sectionId - Current section ID (optional)
 * @param {string} params.userMessage - User's message/query
 * @param {string} params.budget - Token budget level (low, medium, high)
 * @param {string} params.projectId - Project ID
 * @returns {Promise<Object>} Context object with rings and token usage
 */
export async function getContextRings({
  operation = 'create',
  targetCards = [],
  deckId = null,
  sectionId = null,
  userMessage = '',
  budget = 'medium',
  projectId
}) {
  try {
    const response = await fetch('/api/context-rings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        operation,
        targetCards,
        deckId,
        sectionId,
        userMessage,
        budget,
        projectId
      })
    });
    
    if (!response.ok) {
      throw new Error(`Context rings API error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error getting context rings:', error);
    throw error;
  }
}

/**
 * Get context rings for card creation
 * @param {string} projectId - Project ID
 * @param {string} deckId - Deck ID (optional)
 * @param {string} sectionId - Section ID (optional)
 * @param {string} userMessage - User's message
 * @param {string} budget - Token budget level
 * @returns {Promise<Object>} Context for card creation
 */
export async function getCreationContext({
  projectId,
  deckId = null,
  sectionId = null,
  userMessage = '',
  budget = 'medium'
}) {
  return getContextRings({
    operation: 'create',
    targetCards: [],
    deckId,
    sectionId,
    userMessage,
    budget,
    projectId
  });
}

/**
 * Get context rings for card editing
 * @param {string} projectId - Project ID
 * @param {Object} targetCard - Card being edited
 * @param {string} deckId - Deck ID (optional)
 * @param {string} sectionId - Section ID (optional)
 * @param {string} userMessage - User's message
 * @param {string} budget - Token budget level
 * @returns {Promise<Object>} Context for card editing
 */
export async function getEditContext({
  projectId,
  targetCard,
  deckId = null,
  sectionId = null,
  userMessage = '',
  budget = 'medium'
}) {
  return getContextRings({
    operation: 'edit',
    targetCards: [targetCard],
    deckId,
    sectionId,
    userMessage,
    budget,
    projectId
  });
}

/**
 * Get context rings for card merging
 * @param {string} projectId - Project ID
 * @param {Array} targetCards - Cards being merged
 * @param {string} deckId - Deck ID (optional)
 * @param {string} sectionId - Section ID (optional)
 * @param {string} userMessage - User's message
 * @param {string} budget - Token budget level
 * @returns {Promise<Object>} Context for card merging
 */
export async function getMergeContext({
  projectId,
  targetCards = [],
  deckId = null,
  sectionId = null,
  userMessage = '',
  budget = 'medium'
}) {
  return getContextRings({
    operation: 'merge',
    targetCards,
    deckId,
    sectionId,
    userMessage,
    budget,
    projectId
  });
}

/**
 * Get context rings for card splitting
 * @param {string} projectId - Project ID
 * @param {Object} targetCard - Card being split
 * @param {string} deckId - Deck ID (optional)
 * @param {string} sectionId - Section ID (optional)
 * @param {string} userMessage - User's message
 * @param {string} budget - Token budget level
 * @returns {Promise<Object>} Context for card splitting
 */
export async function getSplitContext({
  projectId,
  targetCard,
  deckId = null,
  sectionId = null,
  userMessage = '',
  budget = 'medium'
}) {
  return getContextRings({
    operation: 'split',
    targetCards: [targetCard],
    deckId,
    sectionId,
    userMessage,
    budget,
    projectId
  });
}

/**
 * Get context rings for search operations
 * @param {string} projectId - Project ID
 * @param {string} userMessage - Search query
 * @param {string} budget - Token budget level
 * @returns {Promise<Object>} Context for search
 */
export async function getSearchContext({
  projectId,
  userMessage = '',
  budget = 'medium'
}) {
  return getContextRings({
    operation: 'search',
    targetCards: [],
    deckId: null,
    sectionId: null,
    userMessage,
    budget,
    projectId
  });
}

/**
 * Budget levels with descriptions
 */
export const BUDGET_LEVELS = {
  low: {
    name: 'Low Cost',
    description: '2,000-4,000 tokens - Basic context for simple operations',
    totalTokens: 3000
  },
  medium: {
    name: 'Medium Cost', 
    description: '4,000-8,000 tokens - Balanced context for most operations',
    totalTokens: 6000
  },
  high: {
    name: 'High Quality',
    description: '8,000-16,000 tokens - Rich context for complex operations',
    totalTokens: 12000
  }
};

/**
 * Operation types with descriptions
 */
export const OPERATION_TYPES = {
  create: {
    name: 'Create',
    description: 'Creating new cards - focuses on global context and neighbors',
    priorities: { global: 0.3, local: 0.2, target: 0.2, neighbors: 0.3 }
  },
  edit: {
    name: 'Edit',
    description: 'Editing existing cards - focuses on local context and target',
    priorities: { global: 0.2, local: 0.3, target: 0.4, neighbors: 0.1 }
  },
  merge: {
    name: 'Merge',
    description: 'Merging cards - balanced context with focus on target cards',
    priorities: { global: 0.25, local: 0.25, target: 0.35, neighbors: 0.15 }
  },
  split: {
    name: 'Split',
    description: 'Splitting cards - balanced context with focus on target card',
    priorities: { global: 0.25, local: 0.25, target: 0.35, neighbors: 0.15 }
  },
  search: {
    name: 'Search',
    description: 'Searching for cards - focuses on neighbors and global context',
    priorities: { global: 0.2, local: 0.2, target: 0.2, neighbors: 0.4 }
  }
};
