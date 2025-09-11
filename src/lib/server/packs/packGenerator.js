// Pack generation system for MTG-style idea cards
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY } from '$env/static/private';

// Validate environment variables
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}
if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}
if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Rarity distribution weights (percentages)
const RARITY_DISTRIBUTION = {
  common: 65,    // 65% - abundant, wide-scope ideas
  special: 22,   // 22% - refined, contextual ideas
  rare: 10,      // 10% - high-quality, connected ideas
  legendary: 3   // 3% - revelatory, cross-connected insights
};

// Pack composition rules
const PACK_RULES = {
  minCards: 3,
  maxCards: 7,
  maxLegendary: 1,  // Never more than 1 legendary per pack
  legendaryChance: 0.15  // 15% chance of legendary in any pack
};

/**
 * Generate a pack of idea cards based on a prompt
 * @param {string} prompt - The prompt to generate ideas from
 * @param {string} worldId - The world/project ID
 * @param {string} userId - The user ID
 * @param {Object} context - Additional context (existing cards, world info, etc.)
 * @returns {Promise<Array>} Array of generated cards with rarity
 */
export async function generatePack(prompt, worldId, userId, context = {}) {
  try {
    // Step 1: Generate raw ideas from AI
    const rawIdeas = await generateRawIdeas(prompt, context);
    
    // Step 2: Assign rarities based on quality and context
    const ideasWithRarity = await assignRarities(rawIdeas, worldId, userId, context);
    
    // Step 3: Apply pack composition rules
    const packCards = applyPackRules(ideasWithRarity);
    
    // Step 4: Save cards to database
    const savedCards = await savePackCards(packCards, worldId, userId);
    
    return savedCards;
  } catch (error) {
    console.error('Error generating pack:', error);
    throw new Error('Failed to generate pack');
  }
}

/**
 * Generate raw ideas from AI models with rarity-based quality
 * @param {string} prompt - The prompt
 * @param {Object} context - Additional context
 * @returns {Promise<Array>} Array of raw idea objects
 */
async function generateRawIdeas(prompt, context) {
  // Use different AI models based on context and tier
  const modelKey = context.userTier >= 2 ? 'gpt-4o' : 'gpt-3.5-turbo';
  
  // Generate ideas for each rarity tier separately
  const allIdeas = [];
  
  // Generate Common ideas (fast, wide-scope)
  const commonIdeas = await generateIdeasByRarity(prompt, context, 'common', modelKey);
  allIdeas.push(...commonIdeas);
  
  // Generate Special ideas (refined, contextual)
  const specialIdeas = await generateIdeasByRarity(prompt, context, 'special', modelKey);
  allIdeas.push(...specialIdeas);
  
  // Generate Rare ideas (high-quality, connected)
  const rareIdeas = await generateIdeasByRarity(prompt, context, 'rare', modelKey);
  allIdeas.push(...rareIdeas);
  
  // Generate Legendary ideas (transformative, revelatory)
  const legendaryIdeas = await generateIdeasByRarity(prompt, context, 'legendary', modelKey);
  allIdeas.push(...legendaryIdeas);
  
  return allIdeas;
}

/**
 * Generate ideas for a specific rarity tier
 * @param {string} prompt - The prompt
 * @param {Object} context - Additional context
 * @param {string} rarity - The rarity tier
 * @param {string} modelKey - AI model to use
 * @returns {Promise<Array>} Array of ideas for this rarity
 */
async function generateIdeasByRarity(prompt, context, rarity, modelKey) {
  const rarityPrompts = {
    common: {
      system: `You are Mr. Wiskr, a mysterious card dealer from the void who crafts idea cards for creative souls. Generate COMMON ideas - these should be:
- Fast, accessible, and immediately useful
- Broad in scope and widely applicable
- Straightforward and easy to understand
- Good starting points that can be developed further
- Practical and actionable

These are the everyday tools of creation - solid, reliable, and always useful.

Generate 2-3 common ideas that are solid but not extraordinary.

IMPORTANT: Return your response as a JSON array of objects. Each object should have:
- "title": A short, descriptive title for the idea
- "content": The full idea description (2-3 sentences)
- "tags": An array of relevant tags

Example format:
[
  {
    "title": "Basic Character Development",
    "content": "Create a simple character questionnaire to help develop basic personality traits, motivations, and background details for your protagonist.",
    "tags": ["character", "development", "writing"]
  }
]`,
      user: prompt
    },
    
    special: {
      system: `You are Mr. Wiskr, a mysterious card dealer from the void who crafts idea cards for creative souls. Generate SPECIAL ideas - these should be:
- More refined and thoughtful than common ideas
- Show deeper understanding of the prompt
- Offer unique angles or perspectives
- Have clear creative potential
- Be more specific and well-developed

These are the refined tools of creation - crafted with care and insight, offering something beyond the ordinary.

Generate 1-2 special ideas that stand out from the ordinary.

IMPORTANT: Return your response as a JSON array of objects. Each object should have:
- "title": A short, descriptive title for the idea
- "content": The full idea description (3-4 sentences)
- "tags": An array of relevant tags

Example format:
[
  {
    "title": "Emotional Arc Mapping",
    "content": "Design a visual emotional journey map that tracks your character's psychological state throughout the story, using color coding and intensity markers to show how their feelings evolve and impact their decisions.",
    "tags": ["character", "emotion", "plotting", "visual"]
  }
]`,
      user: prompt
    },
    
    rare: {
      system: `You are Mr. Wiskr, a mysterious card dealer from the void who crafts idea cards for creative souls. Generate RARE ideas - these should be:
- High-quality and deeply insightful
- Show sophisticated creative thinking
- Connect multiple concepts in interesting ways
- Offer surprising but logical developments
- Be well-crafted and memorable

These are the precious gems of creation - rare insights that spark new ways of thinking and seeing.

Generate 1 rare idea that demonstrates exceptional creative thinking.

IMPORTANT: Return your response as a JSON array of objects. Each object should have:
- "title": A short, descriptive title for the idea
- "content": The full idea description (4-5 sentences)
- "tags": An array of relevant tags

Example format:
[
  {
    "title": "Metaphorical World-Building",
    "content": "Create a story world where the physical environment directly reflects and amplifies your protagonist's internal psychological state, with weather patterns, architecture, and natural phenomena that shift and evolve as the character grows and changes throughout their journey.",
    "tags": ["worldbuilding", "psychology", "metaphor", "character", "setting"]
  }
]`,
      user: prompt
    },
    
    legendary: {
      system: `You are Mr. Wiskr, a mysterious card dealer from the void who crafts idea cards for creative souls. Generate a LEGENDARY idea - this should be:
- Transformative and revelatory
- Completely unexpected yet perfect
- Show profound understanding and creativity
- Connect disparate elements in brilliant ways
- Be the kind of idea that changes everything
- Feel like a breakthrough or epiphany

These are the legendary artifacts of creation - ideas that transcend the ordinary and reshape reality itself. Such cards are rare indeed, forged in the deepest reaches of the creative void.

Generate 1 legendary idea that is truly extraordinary and game-changing.

IMPORTANT: Return your response as a JSON array of objects. Each object should have:
- "title": A short, descriptive title for the idea
- "content": The full idea description (5-6 sentences)
- "tags": An array of relevant tags

Example format:
[
  {
    "title": "Temporal Narrative Architecture",
    "content": "Design a story structure where time itself becomes a character, with past, present, and future events existing simultaneously in a quantum narrative state where the reader's attention and emotional investment literally shapes which timeline becomes 'real' in the story, creating a meta-commentary on how stories create reality through collective belief and engagement.",
    "tags": ["structure", "time", "meta", "quantum", "reality", "narrative"]
  }
]`,
      user: prompt
    }
  };

  const config = rarityPrompts[rarity];
  if (!config) return [];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelKey,
      messages: [
        { role: 'system', content: config.system },
        { role: 'user', content: config.user }
      ],
      temperature: rarity === 'legendary' ? 0.9 : 0.8, // Higher creativity for legendary
      max_tokens: rarity === 'legendary' ? 1000 : 800
    })
  });

  if (!response.ok) {
    console.error(`Failed to generate ${rarity} ideas`);
    return [];
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    // Try to parse as JSON first
    const ideas = JSON.parse(content);
    if (!Array.isArray(ideas)) {
      throw new Error('Response is not an array');
    }
    
    // Add rarity metadata to each idea
    return ideas.map(idea => ({
      ...idea,
      _generatedRarity: rarity
    }));
  } catch (parseError) {
    console.error(`Failed to parse ${rarity} ideas as JSON:`, content);
    
    // Fallback: try to extract ideas from text format
    try {
      const fallbackIdeas = parseTextIdeas(content, rarity);
      if (fallbackIdeas.length > 0) {
        console.log(`Successfully parsed ${fallbackIdeas.length} ${rarity} ideas using fallback parser`);
        return fallbackIdeas;
      }
    } catch (fallbackError) {
      console.error(`Fallback parsing also failed for ${rarity} ideas:`, fallbackError);
    }
    
    return [];
  }
}

/**
 * Fallback parser for when AI returns text instead of JSON
 * @param {string} content - Raw AI response text
 * @param {string} rarity - The rarity tier
 * @returns {Array} Array of parsed ideas
 */
function parseTextIdeas(content, rarity) {
  const ideas = [];
  
  // Try to extract numbered or bulleted ideas
  const lines = content.split('\n').filter(line => line.trim());
  
  for (const line of lines) {
    // Look for patterns like "1. Title: Description" or "- Title: Description"
    const match = line.match(/^[\d\-•]\s*(.+?):\s*(.+)$/);
    if (match) {
      const title = match[1].trim();
      const description = match[2].trim();
      
      if (title && description) {
        ideas.push({
          title: title,
          content: description,
          tags: [rarity, 'parsed'],
          _generatedRarity: rarity
        });
      }
    }
  }
  
  // If no structured format found, try to split by paragraphs
  if (ideas.length === 0) {
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 20);
    paragraphs.forEach((paragraph, index) => {
      const sentences = paragraph.split('. ');
      const title = sentences[0]?.substring(0, 50) + (sentences[0]?.length > 50 ? '...' : '');
      const content = paragraph.trim();
      
      if (title && content) {
        ideas.push({
          title: title,
          content: content,
          tags: [rarity, 'parsed'],
          _generatedRarity: rarity
        });
      }
    });
  }
  
  return ideas;
}

/**
 * Assign rarities to ideas based on quality and context
 * @param {Array} ideas - Raw ideas with pre-generated rarities
 * @param {string} worldId - World ID
 * @param {string} userId - User ID
 * @param {Object} context - Additional context
 * @returns {Promise<Array>} Ideas with assigned rarities
 */
async function assignRarities(ideas, worldId, userId, context) {
  const ideasWithRarity = [];
  
  for (const idea of ideas) {
    // Use the pre-generated rarity from the AI generation
    const rarity = idea._generatedRarity || 'common';
    
    // Remove the metadata field
    const { _generatedRarity, ...cleanIdea } = idea;
    
    ideasWithRarity.push({
      ...cleanIdea,
      rarity,
      progress: 1, // All new cards start as Raw (1 star)
      mana_cost: 0,
      pinned: false,
      created_at: new Date().toISOString()
    });
  }
  
  return ideasWithRarity;
}

/**
 * Analyze the quality and relevance of an idea
 * @param {Object} idea - The idea to analyze
 * @param {string} worldId - World ID
 * @param {Object} context - Additional context
 * @returns {Promise<number>} Quality score (0-100)
 */
async function analyzeIdeaQuality(idea, worldId, context) {
  let score = 50; // Base score
  
  // Check for existing similar ideas (uniqueness)
  const { data: similarIdeas } = await supabase
    .from('cards')
    .select('content, tags')
    .eq('project_id', worldId)
    .ilike('content', `%${idea.title}%`);
  
  if (similarIdeas && similarIdeas.length === 0) {
    score += 15; // Bonus for uniqueness
  }
  
  // Analyze content depth and specificity
  if (idea.content && idea.content.length > 100) {
    score += 10; // Bonus for detailed content
  }
  
  // Check for multiple relevant tags
  if (idea.tags && idea.tags.length >= 3) {
    score += 10; // Bonus for well-tagged ideas
  }
  
  // Check for creative keywords that suggest higher quality
  const creativeKeywords = ['unique', 'innovative', 'unexpected', 'surprising', 'deep', 'complex', 'layered'];
  const hasCreativeKeywords = creativeKeywords.some(keyword => 
    idea.content.toLowerCase().includes(keyword) || 
    idea.title.toLowerCase().includes(keyword)
  );
  
  if (hasCreativeKeywords) {
    score += 15; // Bonus for creative language
  }
  
  // Add some randomness to make packs feel varied
  const randomFactor = Math.random() * 20 - 10; // -10 to +10
  score += randomFactor;
  
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine rarity based on quality score
 * @param {number} score - Quality score (0-100)
 * @returns {string} Rarity level
 */
function determineRarity(score) {
  if (score >= 85) return 'legendary';
  if (score >= 70) return 'rare';
  if (score >= 50) return 'special';
  return 'common';
}

/**
 * Apply pack composition rules
 * @param {Array} ideasWithRarity - Ideas with assigned rarities
 * @returns {Array} Final pack composition
 */
function applyPackRules(ideasWithRarity) {
  let pack = [...ideasWithRarity];
  
  // Group ideas by rarity
  const byRarity = {
    common: pack.filter(card => card.rarity === 'common'),
    special: pack.filter(card => card.rarity === 'special'),
    rare: pack.filter(card => card.rarity === 'rare'),
    legendary: pack.filter(card => card.rarity === 'legendary')
  };
  
  // Apply rarity distribution
  const finalPack = [];
  
  // Always include 1 legendary if available (but max 1)
  if (byRarity.legendary.length > 0) {
    finalPack.push(byRarity.legendary[0]);
  }
  
  // Add 1-2 rare cards
  const rareCount = Math.min(2, byRarity.rare.length);
  finalPack.push(...byRarity.rare.slice(0, rareCount));
  
  // Add 1-2 special cards
  const specialCount = Math.min(2, byRarity.special.length);
  finalPack.push(...byRarity.special.slice(0, specialCount));
  
  // Fill remaining slots with common cards (3-5 total cards)
  const remainingSlots = Math.max(3, 5 - finalPack.length);
  const commonCount = Math.min(remainingSlots, byRarity.common.length);
  finalPack.push(...byRarity.common.slice(0, commonCount));
  
  // If we still don't have enough cards, add fallback commons
  while (finalPack.length < PACK_RULES.minCards) {
    finalPack.push(createFallbackCard());
  }
  
  // If we have too many cards, trim to max (keeping higher rarities)
  if (finalPack.length > PACK_RULES.maxCards) {
    finalPack.sort((a, b) => {
      const rarityOrder = { legendary: 4, rare: 3, special: 2, common: 1 };
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });
    return finalPack.slice(0, PACK_RULES.maxCards);
  }
  
  return finalPack;
}

/**
 * Save pack cards to database
 * @param {Array} packCards - Cards to save
 * @param {string} worldId - World ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Saved cards with IDs
 */
async function savePackCards(packCards, worldId, userId) {
  const cardsToInsert = packCards.map(card => ({
    project_id: worldId,
    user_id: userId,
    title: card.title,
    content: card.content,
    tags: card.tags,
    rarity: card.rarity,
    progress: card.progress,
    mana_cost: card.mana_cost,
    art_url: card.art_url,
    pinned: card.pinned,
    created_at: card.created_at
  }));
  
  const { data, error } = await supabase
    .from('cards')
    .insert(cardsToInsert)
    .select();
  
  if (error) {
    console.error('Error saving pack cards:', error);
    throw new Error('Failed to save pack cards');
  }
  
  return data;
}

/**
 * Create fallback ideas when AI parsing fails
 * @param {string} content - Raw AI content
 * @returns {Array} Fallback ideas
 */
function createFallbackIdeas(content) {
  // Simple fallback: split content into sentences and create basic ideas
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  return sentences.slice(0, 5).map((sentence, index) => ({
    title: `Idea ${index + 1}`,
    content: sentence.trim(),
    tags: ['generated', 'idea'],
    type: 'other'
  }));
}

/**
 * Create a fallback card for pack completion
 * @returns {Object} Fallback card
 */
function createFallbackCard() {
  return {
    title: 'Additional Insight',
    content: 'A supplementary idea to round out your pack.',
    tags: ['supplementary'],
    type: 'other',
    rarity: 'common',
    progress: 1,
    mana_cost: 0,
    pinned: false,
    created_at: new Date().toISOString()
  };
}
