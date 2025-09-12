import { json } from '@sveltejs/kit';
import { createOpenAIClient } from '$lib/server/openrouter.js';
import { supabaseAdmin, requireAuth } from '$lib/server/supabaseClient.js';
import { getContextRings } from '$lib/server/context/contextRings.js';

export async function POST({ request, locals }) {
  try {
    console.log('Conjure API called');
    const { sourceCardId, selectedCardIds, projectId } = await request.json();
    console.log('Conjure request data:', { sourceCardId, selectedCardIds, projectId });

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

    // Generate conjured card using AI
    console.log('Generating conjured card...');
    const conjuredCard = await generateConjuredCard(sourceCard, selectedCards, projectId);
    console.log('Generated conjured card:', conjuredCard);

    return json(conjuredCard);

  } catch (error) {
    console.error('Error in conjure API:', error);
    console.error('Error stack:', error.stack);
    return json({ error: 'Conjure operation failed', details: error.message }, { status: 500 });
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

async function generateConjuredCard(sourceCard, selectedCards, projectId) {
  try {
    const openai = createOpenAIClient();

    // Get context rings for merge operation
    const context = await getContextRings({
      supabase: supabaseAdmin,
      projectId,
      operation: 'merge',
      targetCards: [sourceCard, ...selectedCards],
      userMessage: 'Conjure a new creative card by combining these cards',
      budget: 'medium'
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: context.systemPrompt + `\n\nYou are a creative AI that conjures new ideas by combining existing concepts. Create a completely new card that creatively combines elements from the provided cards. The result should be innovative, coherent, and add new value beyond just merging the content.

Guidelines:
- Create a unique title that captures the essence of the combined concept
- Write content that synthesizes ideas from the source cards into something new
- Use tags that reflect the new combined concept
- Make it feel like a natural evolution or creative leap from the source material
- Keep it concise but meaningful (2-3 paragraphs max)`
        },
        {
          role: 'user',
          content: context.userContext + `\n\nConjure a new creative card by combining these cards.`
        }
      ],
      temperature: 0.8,
      max_tokens: 500
    });

    const generatedContent = response.choices[0].message.content;
    
    // Parse the generated content
    const lines = generatedContent.split('\n').filter(line => line.trim());
    
    let title = 'Conjured Card';
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
    if (title === 'Conjured Card' && lines.length > 0) {
      title = toTitleCase(cleanMarkdown(lines[0].replace(/^#+\s*/, '').trim()));
      content = cleanMarkdown(lines.slice(1).join('\n').trim());
    }

    return {
      title: toTitleCase(cleanMarkdown(title)) || 'Conjured Card',
      content: cleanMarkdown(content) || cleanMarkdown(generatedContent),
      tags: tags.length > 0 ? tags : ['conjured', 'creative'],
      rarity: 'special',
      progress: 1,
      mana_cost: 1,
      generation_model: 'GPT-4o',
      art_model: 'Midjourney'
    };

  } catch (error) {
    console.error('Error generating conjured card:', error);
    throw error;
  }
}
