import { json } from '@sveltejs/kit';
import { 
  createCardRelationship, 
  getCardRelationships, 
  updateCardRelationship, 
  deleteCardRelationship,
  getCardRelationshipStats,
  findRelatedCards
} from '$lib/server/utils/cardRelationships.js';

export async function GET({ params, url, locals }) {
  try {
    const { cardId } = params;
    const direction = url.searchParams.get('direction') || 'both';
    const relationshipType = url.searchParams.get('type');
    const stats = url.searchParams.get('stats') === 'true';

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (stats) {
      const relationshipStats = await getCardRelationshipStats(cardId);
      return json({ stats: relationshipStats });
    }

    if (relationshipType) {
      const relatedCards = await findRelatedCards(cardId, relationshipType);
      return json({ relationships: relatedCards });
    }

    const relationships = await getCardRelationships(cardId, direction);
    return json({ relationships });

  } catch (error) {
    console.error('Error in card relationships GET API:', error);
    return json({ error: 'Failed to get card relationships' }, { status: 500 });
  }
}

export async function POST({ params, request, locals }) {
  try {
    const { cardId } = params;
    const { targetCardId, relationshipType, strength, notes } = await request.json();

    if (!targetCardId || !relationshipType) {
      return json({ error: 'targetCardId and relationshipType are required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const relationship = await createCardRelationship(
      cardId, 
      targetCardId, 
      relationshipType, 
      strength, 
      notes
    );

    return json({ relationship });

  } catch (error) {
    console.error('Error in card relationships POST API:', error);
    return json({ error: 'Failed to create card relationship' }, { status: 500 });
  }
}

export async function PUT({ params, request, locals }) {
  try {
    const { cardId } = params;
    const { relationshipId, updates } = await request.json();

    if (!relationshipId || !updates) {
      return json({ error: 'relationshipId and updates are required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const relationship = await updateCardRelationship(relationshipId, updates);
    return json({ relationship });

  } catch (error) {
    console.error('Error in card relationships PUT API:', error);
    return json({ error: 'Failed to update card relationship' }, { status: 500 });
  }
}

export async function DELETE({ params, request, locals }) {
  try {
    const { cardId } = params;
    const { relationshipId } = await request.json();

    if (!relationshipId) {
      return json({ error: 'relationshipId is required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    await deleteCardRelationship(relationshipId);
    return json({ success: true });

  } catch (error) {
    console.error('Error in card relationships DELETE API:', error);
    return json({ error: 'Failed to delete card relationship' }, { status: 500 });
  }
}
