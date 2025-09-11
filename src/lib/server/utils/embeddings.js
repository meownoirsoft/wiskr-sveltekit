import { createOpenAIClient } from '$lib/server/openrouter.js';

/**
 * Generate embedding for text using OpenAI's text-embedding-3-small model
 * @param {string} text - Text to embed
 * @param {number} maxLength - Maximum length of text to embed (default: 4000)
 * @returns {Promise<number[]|null>} - Embedding vector or null if failed
 */
export async function generateEmbedding(text, maxLength = 4000) {
  if (!text || !text.trim()) {
    return null;
  }

  try {
    const openai = createOpenAIClient();
    const textToEmbed = text.slice(0, maxLength);
    
    const emb = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed
    });
    
    return emb.data[0]?.embedding || null;
  } catch (error) {
    console.error('Embedding generation error:', error?.message || error);
    return null;
  }
}

/**
 * Generate embedding for card content (title + content)
 * @param {string} title - Card title
 * @param {string} content - Card content
 * @param {number} maxLength - Maximum length of text to embed (default: 4000)
 * @returns {Promise<number[]|null>} - Embedding vector or null if failed
 */
export async function generateCardEmbedding(title, content, maxLength = 4000) {
  const textToEmbed = `${title || ''}\n\n${content || ''}`.trim();
  return generateEmbedding(textToEmbed, maxLength);
}
