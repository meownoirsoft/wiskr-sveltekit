import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './embeddings.js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Split text into chunks of specified token length
 * @param {string} text - Text to chunk
 * @param {number} maxTokens - Maximum tokens per chunk
 * @returns {Array} - Array of text chunks
 */
export function chunkText(text, maxTokens = 512) {
  if (!text || text.trim().length === 0) {
    return [];
  }

  // Simple token estimation (4 characters per token average)
  const estimatedTokens = Math.ceil(text.length / 4);
  
  if (estimatedTokens <= maxTokens) {
    return [text];
  }

  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let currentTokens = 0;

  for (const sentence of sentences) {
    const sentenceTokens = Math.ceil(sentence.length / 4);
    
    if (currentTokens + sentenceTokens > maxTokens && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence.trim();
      currentTokens = sentenceTokens;
    } else {
      currentChunk += (currentChunk ? '. ' : '') + sentence.trim();
      currentTokens += sentenceTokens;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Create chunks for a card if it's long enough
 * @param {string} cardId - ID of the card
 * @param {string} content - Card content
 * @param {number} maxTokens - Maximum tokens per chunk
 * @returns {Promise<Array>} - Array of created chunks
 */
export async function createCardChunks(cardId, content, maxTokens = 512) {
  try {
    // Check if card needs chunking
    const estimatedTokens = Math.ceil(content.length / 4);
    if (estimatedTokens <= maxTokens) {
      return [];
    }

    // Delete existing chunks
    await supabase
      .from('card_chunks')
      .delete()
      .eq('card_id', cardId);

    // Create new chunks
    const textChunks = chunkText(content, maxTokens);
    const chunks = [];

    for (let i = 0; i < textChunks.length; i++) {
      const chunkContent = textChunks[i];
      const tokenCount = Math.ceil(chunkContent.length / 4);
      
      // Generate embedding for chunk
      const embedding = await generateEmbedding(chunkContent);

      const { data, error } = await supabase
        .from('card_chunks')
        .insert({
          card_id: cardId,
          chunk_index: i,
          content: chunkContent,
          token_count: tokenCount,
          embedding
        })
        .select()
        .single();

      if (error) throw error;
      chunks.push(data);
    }

    return chunks;
  } catch (error) {
    console.error('Error creating card chunks:', error);
    throw error;
  }
}

/**
 * Get chunks for a card
 * @param {string} cardId - ID of the card
 * @returns {Promise<Array>} - Array of chunks
 */
export async function getCardChunks(cardId) {
  try {
    const { data, error } = await supabase
      .from('card_chunks')
      .select('*')
      .eq('card_id', cardId)
      .order('chunk_index', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting card chunks:', error);
    throw error;
  }
}

/**
 * Delete chunks for a card
 * @param {string} cardId - ID of the card
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteCardChunks(cardId) {
  try {
    const { error } = await supabase
      .from('card_chunks')
      .delete()
      .eq('card_id', cardId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting card chunks:', error);
    throw error;
  }
}

/**
 * Search within card chunks using semantic similarity
 * @param {string} query - Search query
 * @param {string} projectId - Project ID to limit search
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - Array of matching chunks
 */
export async function searchCardChunks(query, projectId, limit = 10) {
  try {
    // Generate embedding for query
    const queryEmbedding = await generateEmbedding(query);
    if (!queryEmbedding) {
      return [];
    }

    // Search using vector similarity
    const { data, error } = await supabase.rpc('search_card_chunks_semantic', {
      query_embedding: queryEmbedding,
      project_id: projectId,
      match_threshold: 0.3,
      match_count: limit
    });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error searching card chunks:', error);
    throw error;
  }
}

/**
 * Update card chunks when content changes
 * @param {string} cardId - ID of the card
 * @param {string} newContent - New card content
 * @returns {Promise<Array>} - Array of updated chunks
 */
export async function updateCardChunks(cardId, newContent) {
  try {
    // Delete existing chunks
    await deleteCardChunks(cardId);
    
    // Create new chunks
    return await createCardChunks(cardId, newContent);
  } catch (error) {
    console.error('Error updating card chunks:', error);
    throw error;
  }
}
