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

    // Generate woven card using AI
    const wovenCard = await generateWovenCard(sourceCard, selectedCards, projectId, user.id, locals.supabase);

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

async function generateWovenCard(sourceCard, selectedCards, projectId, userId, supabase) {
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

    const messages = [
      {
        role: 'system',
        content: context.systemPrompt + `\n\nYou are a world chronicler who documents how different elements naturally come together in this world. When given multiple concepts, you reveal the underlying unity that has always connected them. Write as if you're documenting established lore, not creating something new.

Guidelines:
- Write as if this unified concept has always existed in the world
- Never mention "cards", "weaving", "unifying", or "synthesizing" - this is just how things naturally are
- Create a title that feels like it belongs in this world
- Write content that flows naturally and feels like established lore
- Use tags that describe the actual content, themes, or concepts - avoid generic words like "conjured", "creative", "unified", "woven"
- Focus on meaningful descriptors like character types, locations, themes, objects, or concepts from the content
- Keep it concise but comprehensive (2-3 paragraphs max)
- Format as: Title: [title] - Content: [content] - Tags: [tag1, tag2, tag3]`
      },
      {
        role: 'user',
        content: context.userContext + `\n\nReveal how these concepts naturally connect in this world.`
      }
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.6,
      max_tokens: 500
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
      operation: 'weave'
    });
    
    // Parse the generated content
    const lines = generatedContent.split('\n').filter(line => line.trim());
    
    let title = 'Woven Card';
    let content = generatedContent;
    let tags = [];

    // Simple array split approach
    const parts = generatedContent.split(' - Content: ');
    if (parts.length >= 2) {
      // Remove "Title:" prefix if present
      let titlePart = parts[0].trim();
      if (titlePart.startsWith('Title:')) {
        titlePart = titlePart.replace(/^Title:\s*/, '');
      }
      title = toTitleCase(cleanMarkdown(titlePart));
      
      const contentAndTags = parts[1].split(' - Tags: ');
      if (contentAndTags.length >= 2) {
        content = cleanMarkdown(contentAndTags[0].trim());
        tags = contentAndTags[1].split(',').map(tag => cleanMarkdown(tag.trim())).filter(tag => tag);
      } else {
        content = cleanMarkdown(contentAndTags[0].trim());
      }
    } else {
      // Fallback - use first line as title, rest as content
      if (lines.length > 0) {
        let firstLine = lines[0].replace(/^#+\s*/, '').trim();
        if (firstLine.startsWith('Title:')) {
          firstLine = firstLine.replace(/^Title:\s*/, '');
        }
        title = toTitleCase(cleanMarkdown(firstLine));
        content = cleanMarkdown(lines.slice(1).join('\n').trim());
      }
    }

    // Final cleanup - remove any remaining labels from content
    content = content
      .replace(/^Title:\s*/gm, '')
      .replace(/^Content:\s*/gm, '')
      .replace(/^Tags:\s*/gm, '')
      .replace(/^\*\*Title:\*\*\s*/gm, '')
      .replace(/^\*\*Content:\*\*\s*/gm, '')
      .replace(/^\*\*Tags:\*\*\s*/gm, '')
      .trim();

    return {
      title: toTitleCase(cleanMarkdown(title)) || 'Woven Card',
      content: cleanMarkdown(content) || cleanMarkdown(generatedContent),
      tags: tags.length > 0 ? tags : [],
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
