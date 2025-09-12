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

    // Generate woven card using AI
    const wovenCard = await generateWovenCard(sourceCard, selectedCards, projectId);

    return json(wovenCard);

  } catch (error) {
    console.error('Error in weave API:', error);
    return json({ error: 'Weave operation failed' }, { status: 500 });
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

async function generateWovenCard(sourceCard, selectedCards, projectId) {
  try {
    const openai = createOpenAIClient();

    // Get context rings for merge operation
    const context = await getContextRings({
      supabase: supabaseAdmin,
      projectId,
      operation: 'merge',
      targetCards: [sourceCard, ...selectedCards],
      userMessage: 'Weave these cards into a unified concept',
      budget: 'medium'
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: context.systemPrompt + `\n\nYou are an AI that weaves together multiple concepts into a unified, coherent whole. Create a card that unifies and summarizes the key elements from the provided cards into a cohesive concept.

Guidelines:
- Create a title that captures the unified concept
- Write content that synthesizes and summarizes the key points from all cards
- Identify common themes and create a coherent narrative
- Use tags that represent the unified concept
- Make it feel like a natural summary that brings everything together
- Keep it concise but comprehensive (2-3 paragraphs max)`
        },
        {
          role: 'user',
          content: context.userContext + `\n\nWeave these cards into a unified concept.`
        }
      ],
      temperature: 0.6,
      max_tokens: 500
    });

    const generatedContent = response.choices[0].message.content;
    
    // Parse the generated content
    const lines = generatedContent.split('\n').filter(line => line.trim());
    
    let title = 'Woven Card';
    let content = generatedContent;
    let tags = [];

    // Try to extract title and content
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('Title:') || line.startsWith('**Title:**')) {
        title = toTitleCase(cleanMarkdown(line.replace(/^(Title:|\*\*Title:\*\*)\s*/, '').trim()));
      } else if (line.startsWith('Content:') || line.startsWith('**Content:**')) {
        content = cleanMarkdown(lines.slice(i + 1).join('\n').trim());
        break;
      } else if (line.startsWith('Tags:') || line.startsWith('**Tags:**')) {
        const tagString = cleanMarkdown(line.replace(/^(Tags:|\*\*Tags:\*\*)\s*/, '').trim());
        tags = tagString.split(',').map(tag => tag.trim()).filter(tag => tag);
      }
    }

    // If no clear structure, use the first line as title and rest as content
    if (title === 'Woven Card' && lines.length > 0) {
      title = toTitleCase(cleanMarkdown(lines[0].replace(/^#+\s*/, '').trim()));
      content = cleanMarkdown(lines.slice(1).join('\n').trim());
    }

    return {
      title: toTitleCase(cleanMarkdown(title)) || 'Woven Card',
      content: cleanMarkdown(content) || cleanMarkdown(generatedContent),
      tags: tags.length > 0 ? tags : ['woven', 'unified'],
      rarity: 'common',
      progress: 2,
      mana_cost: 1,
      generation_model: 'GPT-4o',
      art_model: 'Midjourney'
    };

  } catch (error) {
    console.error('Error generating woven card:', error);
    throw error;
  }
}
