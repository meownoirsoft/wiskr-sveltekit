// API endpoint for generating card packs
import { json } from '@sveltejs/kit';
import { generatePack } from '$lib/server/packs/packGenerator.js';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { prompt, worldId, cardId } = body;

    // Validate required fields
    if (!prompt && !cardId) {
      return json({ error: 'Either prompt or cardId is required' }, { status: 400 });
    }

    if (!worldId) {
      return json({ error: 'worldId is required' }, { status: 400 });
    }

    let finalPrompt = prompt;

    // If cardId is provided, get the card content to use as prompt
    if (cardId && !prompt) {
      const { data: card, error: cardError } = await locals.supabase
        .from('cards')
        .select('title, content, type')
        .eq('id', cardId)
        .single();

      if (cardError || !card) {
        return json({ error: 'Card not found' }, { status: 404 });
      }

      // Use the card data directly from the cards table
      let cardTitle = card.title;
      let cardContent = card.content;

      // Create a prompt based on the card content
      finalPrompt = `Based on this idea: "${cardTitle}" - ${cardContent}

Generate related and expanded ideas that build upon this concept. Consider different angles, developments, and creative directions.`;
    }

    // Get user context for better pack generation
    const { data: userPreferences } = await locals.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Get existing cards in the world for context
    const { data: existingCards } = await locals.supabase
      .from('cards')
      .select('title, content, tags, type, rarity')
      .eq('project_id', worldId)
      .eq('user_id', user.id)
      .limit(20); // Get recent cards for context

    // Build context object
    const context = {
      userTier: userPreferences?.tier || 0,
      existingCards: existingCards || [],
      worldId,
      userId: user.id
    };

    // Generate the pack
    const packCards = await generatePack(finalPrompt, worldId, user.id, context);

    return json({
      success: true,
      pack: packCards,
      message: `Generated ${packCards.length} cards for your pack!`
    });

  } catch (error) {
    console.error('Error generating pack:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate pack';
    if (error.message.includes('environment variable')) {
      errorMessage = 'Server configuration error. Please contact support.';
    } else if (error.message.includes('Unauthorized')) {
      errorMessage = 'Authentication error. Please try logging in again.';
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      errorMessage = 'Network error. Please check your connection and try again.';
    }
    
    return json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}
