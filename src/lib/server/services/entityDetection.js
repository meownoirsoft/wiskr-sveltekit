// Entity Detection Service
// Analyzes facts to automatically detect entities (characters, places, events) for card generation

import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/**
 * Analyze facts to detect entities that should become cards
 * @param {Array} facts - Array of fact objects with type, key, value
 * @returns {Array} - Array of detected entities with metadata
 */
export async function detectEntities(facts) {
  if (!facts || facts.length === 0) {
    return [];
  }

  console.log('🔍 EntityDetection: Analyzing', facts.length, 'facts for entities...');

  // Prepare facts for analysis
  const factsText = facts.map(f => `[${f.type}] ${f.key}: ${f.value}`).join('\n');

  const prompt = `Analyze these facts and identify distinct entities (characters, places, events, organizations, concepts) that appear across multiple facts or are significant enough to warrant their own summary card.

FACTS:
${factsText}

For each entity you identify, provide:
1. entity_name: The canonical name (e.g., "Sarah Connor", "New York City", "Battle of Hastings")
2. entity_type: One of: character, place, event, organization, concept, object, other
3. confidence: 0.0-1.0 score for how confident you are this is a distinct entity
4. fact_indices: Array of fact indices (0-based) that relate to this entity
5. reasoning: Brief explanation of why this is an entity worth summarizing

Return a JSON array of entities. Only include entities that:
- Appear in multiple facts OR are inherently significant
- Would benefit from a summary card
- Are concrete enough to be useful

Example response:
[
  {
    "entity_name": "Sarah Connor",
    "entity_type": "character", 
    "confidence": 0.95,
    "fact_indices": [0, 3, 7],
    "reasoning": "Main character mentioned in multiple facts about appearance, background, and relationships"
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Use fast model for entity detection
      messages: [
        { 
          role: 'system', 
          content: 'You are an expert at identifying entities from facts. Return only valid JSON arrays.' 
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
             Array.isArray(entity.fact_indices) &&
             entity.fact_indices.length > 0;
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
 * Map detected entities to facts and prepare for database insertion
 * @param {Array} detectedEntities - Entities from detectEntities()
 * @param {Array} facts - Original facts array  
 * @param {string} projectId - Project ID
 * @returns {Array} - Array of entity card data ready for database
 */
export function mapEntitiesToFacts(detectedEntities, facts, projectId) {
  return detectedEntities.map(entity => {
    // Get the facts that relate to this entity
    const relatedFacts = entity.fact_indices.map(index => facts[index]).filter(Boolean);
    
    return {
      projectId,
      entityName: entity.entity_name,
      entityType: entity.entity_type,
      confidenceScore: entity.confidence,
      factCount: relatedFacts.length,
      relatedFacts: relatedFacts.map((fact, index) => ({
        factId: fact.id,
        relevanceScore: 1.0 - (index * 0.1) // First fact is most relevant, others slightly less
      })),
      reasoning: entity.reasoning
    };
  });
}

/**
 * Analyze a single new fact to see if it relates to existing entities
 * @param {Object} newFact - The new fact to analyze
 * @param {Array} existingEntities - Current entity cards
 * @returns {Array} - Array of entity matches with relevance scores
 */
export async function matchFactToEntities(newFact, existingEntities) {
  if (!existingEntities || existingEntities.length === 0) {
    return [];
  }

  console.log('🔍 EntityDetection: Matching new fact to', existingEntities.length, 'existing entities');

  const factText = `[${newFact.type}] ${newFact.key}: ${newFact.value}`;
  const entitiesText = existingEntities.map(e => 
    `${e.entity_name} (${e.entity_type}): ${e.summary.substring(0, 200)}...`
  ).join('\n\n');

  const prompt = `Analyze this new fact and determine which existing entities (if any) it relates to:

NEW FACT:
${factText}

EXISTING ENTITIES:
${entitiesText}

For each entity this fact relates to, return:
1. entity_name: Exact name from the existing entities
2. relevance_score: 0.0-1.0 score for how relevant this fact is to the entity
3. reasoning: Brief explanation of the relationship

Only include entities with relevance_score >= 0.3.

Return JSON array:
[
  {
    "entity_name": "Sarah Connor",
    "relevance_score": 0.8,
    "reasoning": "This fact provides new information about Sarah's background"
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: 'You analyze relationships between facts and entities. Return valid JSON arrays only.' 
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

    console.log('✅ EntityDetection: Found', validMatches.length, 'entity matches for new fact');
    return validMatches;

  } catch (error) {
    console.error('❌ EntityDetection: Error matching fact to entities:', error.message);
    return [];
  }
}
