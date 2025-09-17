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
      userMessage: 'Break this card down into different perspectives or viewpoints',
      budget: 'medium'
    });

    // AI prompt for refracting perspectives
    const prompt = `You are a world observer who documents different aspects of concepts in this world. When given a concept, you naturally reveal the different dimensions that have always existed within it.

${context.systemPrompt}

Source Concept:
Title: ${card.title}
Content: ${card.content}
Tags: ${card.tags?.join(', ') || 'None'}

${context.userContext}

Task: Document 2-4 different aspects of this concept that naturally exist in this world. Each aspect should focus on a different dimension:
- Characters: Who are the people involved? What are their motivations, relationships, conflicts?
- Setting: Where does this take place? What is the environment, atmosphere, world-building?
- Conflict: What are the tensions, obstacles, or problems? What drives the drama?
- Theme: What are the deeper meanings, messages, or ideas? What is this really about?

For each aspect, provide:
Title: [A clear, descriptive title for this aspect]
Content: [2-3 sentences exploring this aspect]
Tags: [3-5 relevant tags, comma-separated]

Format your response as:
Aspect 1:
Title: [title]
Content: [content]
Tags: [tag1, tag2, tag3]

Aspect 2:
Title: [title]
Content: [content]
Tags: [tag1, tag2, tag3]

[Continue for each aspect]`;

    // Call OpenAI
    const openai = createOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writing assistant specializing in narrative analysis and perspective exploration.'
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
      { role: 'system', content: 'You are a creative writing assistant specializing in narrative analysis and perspective exploration.' },
      { role: 'user', content: prompt }
    ]);
    await trackAIUsage({
      userId: user.id,
      projectId,
      model: 'gpt-4o-mini',
      inputText,
      outputText: response,
      supabase: locals.supabase,
      operation: 'split-refract'
    });
    
    // Parse the response
    const perspectives = parseRefractResponse(response);
    
    // Clean markdown from the results
    const cleanedPerspectives = perspectives.map(perspective => ({
      ...perspective,
      title: toTitleCase(cleanMarkdown(perspective.title)),
      content: cleanMarkdown(perspective.content),
      tags: perspective.tags.map(tag => cleanMarkdown(tag))
    }));

    return json({
      success: true,
      cards: cleanedPerspectives,
      originalCard: card
    });

  } catch (error) {
    console.error('Error in refract split:', error);
    return json({ error: 'Failed to refract card' }, { status: 500 });
  }
}

function parseRefractResponse(response) {
  const aspects = [];
  const sections = response.split(/Aspect \d+:/i);
  
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
      
      aspects.push({
        title: titleMatch[1].trim(),
        content: contentMatch[1].trim(),
        tags: tags,
        rarity: 'common',
        progress: 0,
        type: 'idea'
      });
    }
  }
  
  return aspects;
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
