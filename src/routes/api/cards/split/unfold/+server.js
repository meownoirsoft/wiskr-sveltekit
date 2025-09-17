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
      userMessage: 'Break this card down into sequential steps or timeline',
      budget: 'medium'
    });

    // AI prompt for unfolding timeline
    const prompt = `You are a world chronicler who documents the natural progression of events in this world. When given a concept, you reveal the sequential steps that have always been part of how this unfolds.

${context.systemPrompt}

Source Concept:
Title: ${card.title}
Content: ${card.content}
Tags: ${card.tags?.join(', ') || 'None'}

${context.userContext}

Task: Document 2-4 sequential steps that naturally unfold from this concept. Each step should be:
- A natural progression that has always existed in this world
- A complete, meaningful part of the sequence
- Building toward the natural outcome
- Clear and specific

For each step, provide:
Title: [A clear, descriptive title for this step]
Content: [2-3 sentences explaining what naturally happens in this step]
Tags: [3-5 relevant tags, comma-separated]

Format your response as:
Step 1:
Title: [title]
Content: [content]
Tags: [tag1, tag2, tag3]

Step 2:
Title: [title]
Content: [content]
Tags: [tag1, tag2, tag3]

[Continue for each step]`;

    // Call OpenAI
    const openai = createOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a creative writing assistant specializing in breaking down complex processes into clear, sequential steps.'
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
      { role: 'system', content: 'You are a creative writing assistant specializing in breaking down complex processes into clear, sequential steps.' },
      { role: 'user', content: prompt }
    ]);
    await trackAIUsage({
      userId: user.id,
      projectId,
      model: 'gpt-4o-mini',
      inputText,
      outputText: response,
      supabase: locals.supabase,
      operation: 'split-unfold'
    });
    
    // Parse the response
    const steps = parseUnfoldResponse(response);
    
    // Clean markdown from the results
    const cleanedSteps = steps.map(step => ({
      ...step,
      title: toTitleCase(cleanMarkdown(step.title)),
      content: cleanMarkdown(step.content),
      tags: step.tags.map(tag => cleanMarkdown(tag))
    }));

    return json({
      success: true,
      cards: cleanedSteps,
      originalCard: card
    });

  } catch (error) {
    console.error('Error in unfold split:', error);
    return json({ error: 'Failed to unfold card' }, { status: 500 });
  }
}

function parseUnfoldResponse(response) {
  const steps = [];
  const sections = response.split(/Step \d+:/i);
  
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
      
      steps.push({
        title: titleMatch[1].trim(),
        content: contentMatch[1].trim(),
        tags: tags,
        rarity: 'common',
        progress: 0,
        type: 'idea'
      });
    }
  }
  
  return steps;
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
