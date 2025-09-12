import { json } from '@sveltejs/kit';
import { createOpenAIClient } from '$lib/server/openrouter.js';
import { supabaseAdmin, requireAuth } from '$lib/server/supabaseClient.js';
import { getContextRings } from '$lib/server/context/contextRings.js';

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
    const divineCards = await generateDivineCards(sourceCard, selectedCards, projectId);

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

async function generateDivineCards(sourceCard, selectedCards, projectId) {
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

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: context.systemPrompt + `\n\nYou are an AI that divines new insights and derivative concepts from existing cards. Generate exactly 3 new cards that explore different aspects, variations, or extensions of the provided concepts.

Guidelines:
- Create 3 distinct cards that each explore a different angle or aspect
- Each card should be a meaningful derivative, not just a copy
- Make them feel like natural extensions or variations of the source material
- Each card should have a unique title, content, and relevant tags
- Keep each card concise but meaningful (1-2 paragraphs max)
- Format as: "Card 1: [Title] - [Content] - Tags: [tag1, tag2]"

Example format:
Card 1: [Title] - [Content] - Tags: [tag1, tag2]
Card 2: [Title] - [Content] - Tags: [tag1, tag2]  
Card 3: [Title] - [Content] - Tags: [tag1, tag2]`
        },
        {
          role: 'user',
          content: context.userContext + `\n\nDivine 3 new derivative cards from these concepts.`
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });

    const generatedContent = response.choices[0].message.content;
    
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
    
    // Look for card patterns
    if (trimmedLine.match(/^Card \d+:/i)) {
      // Save previous card if exists
      if (currentCard) {
        cards.push(currentCard);
      }
      
      // Start new card
      const cardMatch = trimmedLine.match(/^Card \d+:\s*(.+?)\s*-\s*(.+?)\s*-\s*Tags?:\s*(.+)$/i);
      if (cardMatch) {
        currentCard = {
          title: toTitleCase(cleanMarkdown(cardMatch[1].trim())),
          content: cleanMarkdown(cardMatch[2].trim()),
          tags: cardMatch[3].split(',').map(tag => cleanMarkdown(tag.trim())).filter(tag => tag),
          rarity: 'common',
          progress: 1,
          mana_cost: 1,
          generation_model: 'GPT-4o',
          art_model: 'Midjourney'
        };
      } else {
        // Fallback parsing
        const parts = trimmedLine.split(' - ');
        if (parts.length >= 2) {
          currentCard = {
            title: toTitleCase(cleanMarkdown(parts[0].replace(/^Card \d+:\s*/i, '').trim())),
            content: cleanMarkdown(parts[1].trim()),
            tags: ['divined'],
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
