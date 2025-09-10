// Entity Detection Service
// Analyzes facts to automatically detect entities (characters, places, events) for card generation

import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Analyze cards to detect entities that should become cards
 * @param {Array} cards - Array of card objects with type, title, content
 * @returns {Array} - Array of detected entities with metadata
 */
export async function detectEntities(cards) {
  if (!cards || cards.length === 0) {
    return [];
  }

  console.log('🔍 EntityDetection: Analyzing', cards.length, 'cards for entities...');

  // Prepare cards for analysis
  const cardsText = cards.map(c => `[${c.type}] ${c.title}: ${c.content}`).join('\n');

  const prompt = `Analyze these cards and identify distinct entities (characters, places, events, organizations, concepts) that appear across multiple cards or are significant enough to warrant their own summary card.

CARDS:
${cardsText}

For each entity you identify, provide:
1. entity_name: The canonical name (e.g., "Sarah Connor", "New York City", "Battle of Hastings")
2. entity_type: One of: character, place, event, organization, concept, object, other
3. confidence: 0.0-1.0 score for how confident you are this is a distinct entity
4. card_indices: Array of card indices (0-based) that relate to this entity
5. reasoning: Brief explanation of why this is an entity worth summarizing

Return a JSON array of entities. Only include entities that:
- Appear in multiple cards OR are inherently significant
- Would benefit from a summary card
- Are concrete enough to be useful

Example response:
[
  {
    "entity_name": "Sarah Connor",
    "entity_type": "character", 
    "confidence": 0.95,
    "card_indices": [0, 3, 7],
    "reasoning": "Main character mentioned in multiple cards about appearance, background, and relationships"
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use fast model for entity detection
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at identifying entities from cards. Return only valid JSON arrays.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1, // Low temperature for consistent entity detection
      max_tokens: 2000
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      console.log('⚠️ EntityDetection: No response from AI');
      return [];
    }

    // Parse JSON response
    let entities;
    try {
      entities = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ EntityDetection: Failed to parse JSON:', parseError);
      console.error('Raw response:', content);
      return [];
    }

    // Validate and filter entities
    const validEntities = entities.filter(entity => {
      return entity.entity_name && 
             entity.entity_type && 
             entity.confidence >= 0.3 && // Minimum confidence threshold
             Array.isArray(entity.card_indices) &&
             entity.card_indices.length > 0;
    });

    console.log('✅ EntityDetection: Found', validEntities.length, 'valid entities');
    
    // Log detected entities for debugging
    validEntities.forEach(entity => {
      console.log(`📋 Entity: "${entity.entity_name}" (${entity.entity_type}) - confidence: ${entity.confidence.toFixed(2)}`);
    });

    return validEntities;

  } catch (error) {
    console.error('❌ EntityDetection: AI API error:', error.message);
    return [];
  }
}

/**
 * Map detected entities to cards and prepare for database insertion
 * @param {Array} detectedEntities - Entities from detectEntities()
 * @param {Array} cards - Original cards array  
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of entity card data ready for database
 */
export function mapEntitiesToCards(detectedEntities, cards, projectId) {
  return detectedEntities.map(entity => {
    // Get the cards that relate to this entity
    const relatedCards = entity.card_indices.map(index => cards[index]).filter(Boolean);
    
    return {
      projectId,
      entityName: entity.entity_name,
      entityType: entity.entity_type,
      confidenceScore: entity.confidence,
      cardCount: relatedCards.length,
      relatedCards: relatedCards.map((card, index) => ({
        cardId: card.id,
        relevanceScore: 1.0 - (index * 0.1) // First card is most relevant, others slightly less
      })),
      reasoning: entity.reasoning
    };
  });
}

/**
 * Analyze a single new card to see if it relates to existing entities
 * @param {Object} newCard - The new card to analyze
 * @param {Array} existingEntities - Current entity cards
 * @returns {Array} - Array of entity matches with relevance scores
 */
export async function matchCardToEntities(newCard, existingEntities) {
  if (!existingEntities || existingEntities.length === 0) {
    return [];
  }

  console.log('🔍 EntityDetection: Matching new card to', existingEntities.length, 'existing entities');

  const cardText = `[${newCard.type}] ${newCard.title}: ${newCard.content}`;
  const entitiesText = existingEntities.map(e => 
    `${e.entity_name} (${e.entity_type}): ${e.summary.substring(0, 200)}...`
  ).join('\n\n');

  const prompt = `Analyze this new card and determine which existing entities (if any) it relates to:

NEW CARD:
${cardText}

EXISTING ENTITIES:
${entitiesText}

For each entity this card relates to, return:
1. entity_name: Exact name from the existing entities
2. relevance_score: 0.0-1.0 score for how relevant this card is to the entity
3. reasoning: Brief explanation of the relationship

Only include entities with relevance_score >= 0.3.

Return JSON array:
[
  {
    "entity_name": "Sarah Connor",
    "relevance_score": 0.8,
    "reasoning": "This card provides new information about Sarah's background"
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You analyze relationships between cards and entities. Return valid JSON arrays only.' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 1000
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) return [];

    const matches = JSON.parse(content);
    const validMatches = matches.filter(match => 
      match.entity_name && 
      match.relevance_score >= 0.3 &&
      existingEntities.some(e => e.entity_name === match.entity_name)
    );

    console.log('✅ EntityDetection: Found', validMatches.length, 'entity matches for new card');
    return validMatches;

  } catch (error) {
    console.error('❌ EntityDetection: Error matching card to entities:', error.message);
    return [];
  }
}
