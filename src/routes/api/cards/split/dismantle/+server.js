import { json } from '@sveltejs/kit';
import { supabaseAdmin, requireAuth } from '$lib/server/supabaseClient.js';
import { createOpenAIClient } from '$lib/server/openrouter.js';
import { getContextRings } from '$lib/server/context/contextRings.js';
import { trackAIUsage } from '$lib/server/utils/usageTracker.js';

export async function POST({ request, locals }) {
  try {
    const user = await requireAuth(locals);
    const { cardId, projectId } = await request.json();

    if (!cardId || !projectId) {
      return json({ error: 'Card ID and Project ID are required' }, { status: 400 });
    }

    // Get the source card
    const { data: card, error: cardError } = await supabaseAdmin
      .from('cards')
      .select('*')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      return json({ error: 'Card not found' }, { status: 404 });
    }

    // Get context rings for split operation
    const context = await getContextRings({
      supabase: supabaseAdmin,
      projectId,
      operation: 'split',
      targetCards: [card],
      userMessage: 'Break this card down into distinct elements',
      budget: 'medium'
    });

    // AI prompt for dismantling elements
    const prompt = `You are a world analyst who documents the distinct components that naturally exist within concepts in this world. When given a concept, you reveal the separate elements that have always been part of it.

${context.systemPrompt}

Source Concept:
Title: ${card.title}
Content: ${card.content}
Tags: ${card.tags?.join(', ') || 'None'}

${context.userContext}

Task: Document 2-4 distinct elements that naturally exist within this concept. Each element should be:
- A complete, focused aspect that has always existed
- Self-contained and understandable on its own
- Related to but distinct from the whole
- A natural part of this world

For each element, provide:
Title: [A clear, descriptive title]
Content: [2-3 sentences explaining this element]
Tags: [3-5 relevant tags, comma-separated]

Format your response as:
Element 1:
Title: [title]
Content: [content]
Tags: [tag1, tag2, tag3]

Element 2:
Title: [title]
Content: [content]
Tags: [tag1, tag2, tag3]

[Continue for each element]`;

    // Call OpenAI
    const openai = createOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writing assistant specializing in breaking down complex ideas into focused, distinct elements.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    const response = completion.choices[0]?.message?.content || '';
    
    // Track usage
    const inputText = JSON.stringify([
      { role: 'system', content: 'You are a creative writing assistant specializing in breaking down complex ideas into focused, distinct elements.' },
      { role: 'user', content: prompt }
    ]);
    await trackAIUsage({
      userId: user.id,
      projectId,
      model: 'gpt-4o-mini',
      inputText,
      outputText: response,
      supabase: locals.supabase,
      operation: 'split-dismantle'
    });
    
    // Parse the response
    const elements = parseDismantleResponse(response);
    
    // Clean markdown from the results
    const cleanedElements = elements.map(element => ({
      ...element,
      title: toTitleCase(cleanMarkdown(element.title)),
      content: cleanMarkdown(element.content),
      tags: element.tags.map(tag => cleanMarkdown(tag))
    }));

    return json({
      success: true,
      cards: cleanedElements,
      originalCard: card
    });

  } catch (error) {
    console.error('Error in dismantle split:', error);
    return json({ error: 'Failed to dismantle card' }, { status: 500 });
  }
}

function parseDismantleResponse(response) {
  const elements = [];
  const sections = response.split(/Element \d+:/i);
  
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i].trim();
    if (!section) continue;
    
    const titleMatch = section.match(/Title:\s*(.+)/i);
    const contentMatch = section.match(/Content:\s*(.+?)(?=Tags:|$)/is);
    const tagsMatch = section.match(/Tags:\s*(.+)/i);
    
    if (titleMatch && contentMatch) {
      const tags = tagsMatch ? 
        tagsMatch[1].split(',').map(tag => tag.trim()).filter(tag => tag) : 
        [];
      
      elements.push({
        title: titleMatch[1].trim(),
        content: contentMatch[1].trim(),
        tags: tags,
        rarity: 'common',
        progress: 0,
        type: 'idea'
      });
    }
  }
  
  return elements;
}

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
