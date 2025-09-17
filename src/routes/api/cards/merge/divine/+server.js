import { json } from '@sveltejs/kit';
import { createOpenAIClient } from '$lib/server/openrouter.js';
import { supabaseAdmin, requireAuth } from '$lib/server/supabaseClient.js';
import { getContextRings } from '$lib/server/context/contextRings.js';
import { trackAIUsage } from '$lib/server/utils/usageTracker.js';

export async function POST({ request, locals }) {
  try {
    const { sourceCardId, selectedCardIds, projectId } = await request.json();

    if (!sourceCardId || !selectedCardIds || !projectId) {
      return json({ error: 'sourceCardId, selectedCardIds, and projectId are required' }, { status: 400 });
    }

    // Check authentication
    const user = await requireAuth(locals);

    // Get source card
    const { data: sourceCard, error: sourceError } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('id', sourceCardId)
      .eq('project_id', projectId)
      .single();

    if (sourceError || !sourceCard) {
      return json({ error: 'Source card not found' }, { status: 404 });
    }

    // Get selected cards
    const { data: selectedCards, error: selectedError } = await supabaseAdmin
      .from('cards')
      .select('*')
      .in('id', selectedCardIds)
      .eq('project_id', projectId);

    if (selectedError || !selectedCards || selectedCards.length === 0) {
      return json({ error: 'Selected cards not found' }, { status: 404 });
    }

    // Generate divine cards using AI
    const divineCards = await generateDivineCards(sourceCard, selectedCards, projectId, user.id, locals.supabase);

    return json({ cards: divineCards });

  } catch (error) {
    console.error('Error in divine API:', error);
    return json({ error: 'Divine operation failed' }, { status: 500 });
  }
}

// Helper function to clean markdown formatting
function cleanMarkdown(text) {
  if (!text) return text;
  
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1')     // Remove italic formatting
    .replace(/^#+\s*/, '')           // Remove heading markers
    .replace(/^\s*[-*+]\s*/gm, '')   // Remove list markers
    .replace(/^\s*\d+\.\s*/gm, '')   // Remove numbered list markers
    .trim();
}

// Helper function to convert text to title case
function toTitleCase(text) {
  if (!text) return text;
  
  return text
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

async function generateDivineCards(sourceCard, selectedCards, projectId, userId, supabase) {
  try {
    const openai = createOpenAIClient();

    // Get context rings for merge operation
    const context = await getContextRings({
      supabase: supabaseAdmin,
      projectId,
      operation: 'merge',
      targetCards: [sourceCard, ...selectedCards],
      userMessage: 'Divine 3 new derivative cards from these concepts',
      budget: 'high'
    });

    const messages = [
      {
        role: 'system',
        content: context.systemPrompt + `\n\nYou are a world explorer who discovers different aspects of existing concepts. When given a concept, you naturally uncover three different facets or variations that have always existed in this world. Write as if you're documenting discoveries, not creating new things.

Guidelines:
- Write as if these three aspects have always existed in the world
- Never mention "cards", "derivatives", "variations", or "extensions" - these are just different aspects of what already exists
- Each aspect should feel like a natural part of the world
- Create titles that feel like they belong in this world
- Write content that flows naturally and feels like established lore
- Use tags that describe the actual content, themes, or concepts - avoid generic words like "conjured", "creative", "unified", "woven", "discovered"
- Focus on meaningful descriptors like character types, locations, themes, objects, or concepts from the content
- Keep each aspect concise but meaningful (1-2 paragraphs max)
- Format as: "Aspect 1: [Title] - [Content] - Tags: [tag1, tag2]"

Example format:
Aspect 1: [Title] - [Content] - Tags: [tag1, tag2]
Aspect 2: [Title] - [Content] - Tags: [tag1, tag2]  
Aspect 3: [Title] - [Content] - Tags: [tag1, tag2]`
      },
      {
        role: 'user',
        content: context.userContext + `\n\nDiscover three different aspects of these concepts in this world.`
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      max_tokens: 800
    });

    const generatedContent = response.choices[0].message.content;
    
    // Track usage
    const inputText = JSON.stringify(messages);
    await trackAIUsage({
      userId,
      projectId,
      model: 'gpt-4o-mini',
      inputText,
      outputText: generatedContent,
      supabase,
      operation: 'divine'
    });
    
    // Parse the generated cards
    const cards = parseDivineCards(generatedContent);

    return cards;

  } catch (error) {
    console.error('Error generating divine cards:', error);
    throw error;
  }
}

function parseDivineCards(content) {
  const cards = [];
  const lines = content.split('\n').filter(line => line.trim());
  
  let currentCard = null;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Look for aspect patterns
    if (trimmedLine.match(/^Aspect \d+:/i)) {
      // Save previous card if exists
      if (currentCard) {
        cards.push(currentCard);
      }
      
      // Simple array split approach for each aspect
      const parts = trimmedLine.split(' - Content: ');
      if (parts.length >= 2) {
        // Remove "Aspect X:" prefix and any "Title:" prefix
        let titlePart = parts[0].replace(/^Aspect \d+:\s*/i, '').trim();
        if (titlePart.startsWith('Title:')) {
          titlePart = titlePart.replace(/^Title:\s*/, '');
        }
        const title = toTitleCase(cleanMarkdown(titlePart));
        
        const contentAndTags = parts[1].split(' - Tags: ');
        if (contentAndTags.length >= 2) {
          const content = cleanMarkdown(contentAndTags[0].trim());
          const tags = contentAndTags[1].split(',').map(tag => cleanMarkdown(tag.trim())).filter(tag => tag);
          
          currentCard = {
            title,
            content,
            tags,
            rarity: 'common',
            progress: 1,
            mana_cost: 1,
            generation_model: 'GPT-4o',
            art_model: 'Midjourney'
          };
        } else {
          currentCard = {
            title,
            content: cleanMarkdown(contentAndTags[0].trim()),
            tags: [],
            rarity: 'common',
            progress: 1,
            mana_cost: 1,
            generation_model: 'GPT-4o',
            art_model: 'Midjourney'
          };
        }
      } else {
        // Fallback parsing
        const parts = trimmedLine.split(' - ');
        if (parts.length >= 2) {
          let titlePart = parts[0].replace(/^Aspect \d+:\s*/i, '').trim();
          if (titlePart.startsWith('Title:')) {
            titlePart = titlePart.replace(/^Title:\s*/, '');
          }
          currentCard = {
            title: toTitleCase(cleanMarkdown(titlePart)),
            content: cleanMarkdown(parts[1].trim()),
            tags: [],
            rarity: 'common',
            progress: 1,
            mana_cost: 1,
            generation_model: 'GPT-4o',
            art_model: 'Midjourney'
          };
        }
      }
    } else if (currentCard && trimmedLine) {
      // Add to current card content
      currentCard.content += ' ' + trimmedLine;
    }
  }
  
  // Add the last card
  if (currentCard) {
    cards.push(currentCard);
  }
  
  // Ensure we have exactly 3 cards
  while (cards.length < 3) {
    cards.push({
      title: `Divined Insight ${cards.length + 1}`,
      content: 'This is a divined insight that explores the source concept from a unique perspective.',
      tags: ['divined', 'insight'],
      rarity: 'common',
      progress: 1,
      mana_cost: 1,
      generation_model: 'GPT-4o',
      art_model: 'Midjourney'
    });
  }
  
  return cards.slice(0, 3);
}
