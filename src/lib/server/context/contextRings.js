// Context Rings Service - Allocates token budget across context rings
// Based on the strategy: 25% Global, 25% Local, 30-40% Target, 10-20% Neighbors

import { generateEmbedding } from '../utils/embeddings.js';
import { supabase } from '$lib/supabase.js';

// Token budget configurations
const BUDGET_CONFIGS = {
  low: { total: 3000, global: 750, local: 750, target: 1200, neighbors: 300 },
  medium: { total: 6000, global: 1500, local: 1500, target: 2400, neighbors: 600 },
  high: { total: 12000, global: 3000, local: 3000, target: 4800, neighbors: 1200 }
};

// Helper function to get time ago
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return `${Math.floor(diffDays / 7)}w ago`;
}

// Ring priorities for different operations
const OPERATION_PRIORITIES = {
  create: { global: 0.3, local: 0.2, target: 0.2, neighbors: 0.3 },
  edit: { global: 0.2, local: 0.3, target: 0.4, neighbors: 0.1 },
  merge: { global: 0.25, local: 0.25, target: 0.35, neighbors: 0.15 },
  split: { global: 0.25, local: 0.25, target: 0.35, neighbors: 0.15 },
  search: { global: 0.2, local: 0.2, target: 0.2, neighbors: 0.4 }
};

/**
 * Build context using the rings strategy
 * @param {Object} params
 * @param {Object} params.supabase - Supabase client
 * @param {string} params.projectId - Project ID
 * @param {string} params.operation - Operation type (create, edit, merge, split, search)
 * @param {Array} params.targetCards - Cards being acted upon
 * @param {string} params.deckId - Current deck ID (optional)
 * @param {string} params.sectionId - Current section ID (optional)
 * @param {string} params.userMessage - User's message/query
 * @param {string} params.budget - Token budget level (low, medium, high)
 * @returns {Promise<Object>} Context object with rings and token usage
 */
export async function buildContextRings({ 
  supabase, 
  projectId, 
  operation = 'create',
  targetCards = [],
  deckId = null,
  sectionId = null,
  userMessage = '',
  budget = 'medium'
}) {
  console.log('🎯 Building context rings for operation:', operation, 'budget:', budget);
  
  const config = BUDGET_CONFIGS[budget] || BUDGET_CONFIGS.medium;
  const priorities = OPERATION_PRIORITIES[operation] || OPERATION_PRIORITIES.create;
  
  // Calculate actual token budgets based on priorities
  const actualBudgets = {
    global: Math.floor(config.total * priorities.global),
    local: Math.floor(config.total * priorities.local),
    target: Math.floor(config.total * priorities.target),
    neighbors: Math.floor(config.total * priorities.neighbors)
  };
  
  console.log('📊 Token budgets:', actualBudgets);
  
  const context = {
    rings: {
      global: { content: '', tokens: 0, maxTokens: actualBudgets.global },
      local: { content: '', tokens: 0, maxTokens: actualBudgets.local },
      target: { content: '', tokens: 0, maxTokens: actualBudgets.target },
      neighbors: { content: '', tokens: 0, maxTokens: actualBudgets.neighbors }
    },
    totalTokens: 0,
    operation,
    budget
  };
  
  try {
    // Build each ring
    await Promise.all([
      buildGlobalRing(supabase, projectId, context.rings.global),
      buildLocalRing(supabase, projectId, deckId, sectionId, context.rings.local),
      buildTargetRing(targetCards, context.rings.target),
      buildNeighborsRing(supabase, projectId, targetCards, userMessage, context.rings.neighbors)
    ]);
    
    // Calculate total tokens
    context.totalTokens = Object.values(context.rings).reduce((sum, ring) => sum + ring.tokens, 0);
    
    console.log('✅ Context rings built successfully');
    console.log('📊 Token usage:', {
      global: context.rings.global.tokens,
      local: context.rings.local.tokens,
      target: context.rings.target.tokens,
      neighbors: context.rings.neighbors.tokens,
      total: context.totalTokens
    });
    
    console.log('🔍 Context rings calculated successfully');
    
    return context;
  } catch (error) {
    console.error('❌ Error building context rings:', error);
    throw error;
  }
}

/**
 * Build Global Ring - World synopsis and essential glossary
 */
async function buildGlobalRing(supabase, projectId, ring) {
  console.log('🌍 Building Global Ring...');
  
  try {
    // Get project description and brief
    const { data: project } = await supabase
      .from('projects')
      .select('name, description, brief_text')
      .eq('id', projectId)
      .single();
    
    if (!project) {
      ring.content = 'No project context available.';
      ring.tokens = estimateTokens(ring.content);
      return;
    }
    
    let content = `🌍 GLOBAL CONTEXT - ${project.name}\n\n`;
    
    // Add project description (200-400 tokens)
    if (project.description?.trim()) {
      const description = project.description.trim();
      content += `📋 PROJECT MISSION:\n${description}\n\n`;
    }
    
    // Add brief text if available
    if (project.brief_text?.trim()) {
      const brief = project.brief_text.trim();
      content += `📝 PROJECT BRIEF:\n${brief}\n\n`;
    }
    
    // Get essential glossary terms (50-150 tokens)
    const { data: pinnedCards } = await supabase
      .from('cards')
      .select('title, content, tags')
      .eq('project_id', projectId)
      .eq('pinned', true)
      .limit(10);
    
    console.log('🔍 Global Ring: Found pinned cards:', pinnedCards?.length || 0);
    
    if (pinnedCards?.length > 0) {
      content += `🔑 ESSENTIAL CONCEPTS:\n`;
      pinnedCards.forEach(card => {
        content += `• ${card.title}: ${card.content?.substring(0, 100)}${card.content?.length > 100 ? '...' : ''}\n`;
      });
    } else {
      // If no pinned cards, get recent cards as fallback
      const { data: recentCards } = await supabase
        .from('cards')
        .select('title, content, tags')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(5);
      
      console.log('🔍 Global Ring: No pinned cards, using recent cards:', recentCards?.length || 0);
      
      if (recentCards?.length > 0) {
        content += `🔑 RECENT CONCEPTS:\n`;
        recentCards.forEach(card => {
          content += `• ${card.title}: ${card.content?.substring(0, 100)}${card.content?.length > 100 ? '...' : ''}\n`;
        });
      }
    }
    
    ring.content = content;
    ring.tokens = estimateTokens(content);
    
    // Trim if over budget
    if (ring.tokens > ring.maxTokens) {
      ring.content = trimToTokens(ring.content, ring.maxTokens);
      ring.tokens = estimateTokens(ring.content);
    }
    
    console.log(`✅ Global Ring: ${ring.tokens}/${ring.maxTokens} tokens`);
  } catch (error) {
    console.error('❌ Error building Global Ring:', error);
    ring.content = 'Error loading global context.';
    ring.tokens = estimateTokens(ring.content);
  }
}

/**
 * Build Local Ring - Deck/section summaries
 */
async function buildLocalRing(supabase, projectId, deckId, sectionId, ring) {
  console.log('🏠 Building Local Ring...');
  
  try {
    let content = '🏠 LOCAL CONTEXT\n\n';
    
    // Get deck context if available
    if (deckId) {
      const { data: deck } = await supabase
        .from('decks')
        .select('name, description, context_summary')
        .eq('id', deckId)
        .single();
      
      if (deck) {
        content += `📚 DECK: ${deck.name}\n`;
        if (deck.description) {
          content += `Description: ${deck.description}\n`;
        }
        if (deck.context_summary) {
          content += `Context: ${deck.context_summary}\n`;
        }
        content += '\n';
      }
    }
    
    // Get section context if available
    if (sectionId) {
      const { data: section } = await supabase
        .from('deck_sections')
        .select('name, description, context_summary')
        .eq('id', sectionId)
        .single();
      
      if (section) {
        content += `📂 SECTION: ${section.name}\n`;
        if (section.description) {
          content += `Description: ${section.description}\n`;
        }
        if (section.context_summary) {
          content += `Context: ${section.context_summary}\n`;
        }
        content += '\n';
      }
    }
    
    // Get related decks/sections if no specific ones provided
    if (!deckId && !sectionId) {
      const { data: recentDecks } = await supabase
        .from('decks')
        .select('name, description, context_summary')
        .eq('project_id', projectId)
        .order('updated_at', { ascending: false })
        .limit(2);
      
      if (recentDecks?.length > 0) {
        content += `📚 RECENT DECKS:\n`;
        recentDecks.forEach(deck => {
          content += `• ${deck.name}: ${deck.description || 'No description'}\n`;
        });
        content += '\n';
      }
      
      // Also get recent cards for local context
      const { data: recentCards } = await supabase
        .from('cards')
        .select('title, content, tags, created_at')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(8);
      
      console.log('🔍 Local Ring: Found recent cards:', recentCards?.length || 0);
      if (recentCards?.length > 0) {
        console.log('🔍 Local Ring: Recent card titles:', recentCards.map(c => c.title));
      }
      
      if (recentCards?.length > 0) {
        content += `📝 RECENT CARDS:\n`;
        recentCards.forEach(card => {
          const timeAgo = getTimeAgo(card.created_at);
          content += `• ${card.title} (${timeAgo}): ${card.content?.substring(0, 80)}${card.content?.length > 80 ? '...' : ''}\n`;
        });
        content += '\n';
      } else {
        console.log('🔍 Local Ring: No recent cards found for project:', projectId);
      }
    }
    
    ring.content = content;
    ring.tokens = estimateTokens(content);
    
    // Trim if over budget
    if (ring.tokens > ring.maxTokens) {
      ring.content = trimToTokens(ring.content, ring.maxTokens);
      ring.tokens = estimateTokens(ring.content);
    }
    
    console.log(`✅ Local Ring: ${ring.tokens}/${ring.maxTokens} tokens`);
  } catch (error) {
    console.error('❌ Error building Local Ring:', error);
    ring.content = 'Error loading local context.';
    ring.tokens = estimateTokens(ring.content);
  }
}

/**
 * Build Target Ring - Selected cards being acted upon
 */
async function buildTargetRing(targetCards, ring) {
  console.log('🎯 Building Target Ring...');
  
  try {
    let content = '🎯 TARGET CARDS\n\n';
    
    if (targetCards.length === 0) {
      content += 'No target cards specified.';
    } else {
      targetCards.forEach((card, index) => {
        content += `CARD ${index + 1}: ${card.title || 'Untitled'}\n`;
        content += `Type: ${card.type || 'unknown'}\n`;
        content += `Rarity: ${card.rarity || 'common'}\n`;
        if (card.content) {
          content += `Content: ${card.content}\n`;
        }
        if (card.tags?.length > 0) {
          content += `Tags: ${card.tags.join(', ')}\n`;
        }
        content += '\n';
      });
    }
    
    ring.content = content;
    ring.tokens = estimateTokens(content);
    
    // Trim if over budget
    if (ring.tokens > ring.maxTokens) {
      ring.content = trimToTokens(ring.content, ring.maxTokens);
      ring.tokens = estimateTokens(ring.content);
    }
    
    console.log(`✅ Target Ring: ${ring.tokens}/${ring.maxTokens} tokens`);
  } catch (error) {
    console.error('❌ Error building Target Ring:', error);
    ring.content = 'Error loading target cards.';
    ring.tokens = estimateTokens(ring.content);
  }
}

/**
 * Build Neighbors Ring - Related cards from semantic search
 */
async function buildNeighborsRing(supabase, projectId, targetCards, userMessage, ring) {
  console.log('🔗 Building Neighbors Ring...');
  
  try {
    let content = '🔗 RELATED CARDS\n\n';
    
    if (targetCards.length === 0 && !userMessage) {
      content += 'No search context available.';
    } else {
      // Use the first target card or user message for search
      const searchQuery = targetCards[0]?.content || targetCards[0]?.title || userMessage || '';
      
      if (searchQuery) {
        // Generate embedding for search
        const queryEmbedding = await generateEmbedding(searchQuery);
        
        if (queryEmbedding) {
          // Search for related cards
          const { data: relatedCards } = await supabase.rpc('search_cards_semantic', {
            query_embedding: queryEmbedding,
            project_id: projectId,
            match_threshold: 0.3,
            match_count: 8
          });
          
          if (relatedCards?.length > 0) {
            relatedCards.forEach((card, index) => {
              content += `${index + 1}. ${card.title || 'Untitled'}\n`;
              content += `   Similarity: ${(card.similarity * 100).toFixed(1)}%\n`;
              if (card.content) {
                content += `   Content: ${card.content.substring(0, 120)}${card.content.length > 120 ? '...' : ''}\n`;
              }
              content += '\n';
            });
          } else {
            content += 'No related cards found.';
          }
        } else {
          content += 'Could not generate search embedding.';
        }
      } else {
        content += 'No search query available.';
      }
    }
    
    ring.content = content;
    ring.tokens = estimateTokens(content);
    
    // Trim if over budget
    if (ring.tokens > ring.maxTokens) {
      ring.content = trimToTokens(ring.content, ring.maxTokens);
      ring.tokens = estimateTokens(ring.content);
    }
    
    console.log(`✅ Neighbors Ring: ${ring.tokens}/${ring.maxTokens} tokens`);
  } catch (error) {
    console.error('❌ Error building Neighbors Ring:', error);
    ring.content = 'Error loading related cards.';
    ring.tokens = estimateTokens(ring.content);
  }
}

/**
 * Estimate token count for text (rough approximation)
 */
function estimateTokens(text) {
  if (!text) return 0;
  // Rough approximation: 1 token ≈ 4 characters for English text
  return Math.ceil(text.length / 4);
}

/**
 * Trim text to fit within token budget
 */
function trimToTokens(text, maxTokens) {
  if (!text) return '';
  
  const maxChars = maxTokens * 4; // Rough approximation
  if (text.length <= maxChars) return text;
  
  // Find the last complete sentence within the limit
  const trimmed = text.substring(0, maxChars);
  const lastSentence = trimmed.lastIndexOf('.');
  
  if (lastSentence > maxChars * 0.8) {
    return trimmed.substring(0, lastSentence + 1);
  }
  
  return trimmed + '...';
}

/**
 * Get context rings for a specific operation
 * @param {Object} params
 * @returns {Promise<Object>} Formatted context for AI consumption
 */
export async function getContextRings(params) {
  const context = await buildContextRings(params);
  
  // Format for AI consumption
  const formattedContext = {
    systemPrompt: `You are working within the following context rings:\n\n${context.rings.global.content}\n\n${context.rings.local.content}`,
    userContext: `${context.rings.target.content}\n\n${context.rings.neighbors.content}`,
    metadata: {
      operation: context.operation,
      budget: context.budget,
      tokenUsage: {
        total: context.totalTokens,
        global: context.rings.global.tokens,
        local: context.rings.local.tokens,
        target: context.rings.target.tokens,
        neighbors: context.rings.neighbors.tokens
      }
    }
  };
  
  return formattedContext;
}
