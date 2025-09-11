import { json } from '@sveltejs/kit';
import { generateCardEmbedding } from '$lib/server/utils/embeddings.js';

export async function POST({ request, locals }) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get user from session
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all cards without embeddings
    const { data: cards, error: fetchError } = await locals.supabase
      .from('cards')
      .select('id, title, content')
      .eq('project_id', projectId)
      .is('embedding', null)
      .not('content', 'is', null)
      .not('title', 'is', null)
      .limit(50); // Process in batches

    if (fetchError) {
      return json({ error: fetchError.message }, { status: 500 });
    }

    if (!cards || cards.length === 0) {
      return json({ message: 'All cards already have embeddings', processed: 0 });
    }

    let processed = 0;
    let errors = 0;

    // Process each card
    for (const card of cards) {
      try {
        const embedding = await generateCardEmbedding(card.title, card.content);
        
        if (embedding) {
          const { error: updateError } = await locals.supabase
            .from('cards')
            .update({ embedding })
            .eq('id', card.id);
          
          if (updateError) {
            console.error(`Error updating card ${card.id}:`, updateError);
            errors++;
          } else {
            processed++;
          }
        } else {
          errors++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error processing card ${card.id}:`, error);
        errors++;
      }
    }

    return json({ 
      message: `Processed ${processed} cards, ${errors} errors`,
      processed,
      errors,
      total: cards.length
    });

  } catch (error) {
    console.error('Generate embeddings error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
