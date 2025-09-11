import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Create a relationship between two cards
 * @param {string} sourceCardId - ID of the source card
 * @param {string} targetCardId - ID of the target card
 * @param {string} relationshipType - Type of relationship
 * @param {number} strength - Strength of relationship (0.0 to 1.0)
 * @param {string} notes - Optional notes
 * @returns {Promise<Object>} - Created relationship
 */
export async function createCardRelationship(sourceCardId, targetCardId, relationshipType, strength = 1.0, notes = '') {
  try {
    const { data, error } = await supabase
      .from('card_relationships')
      .insert({
        source_card_id: sourceCardId,
        target_card_id: targetCardId,
        relationship_type: relationshipType,
        strength,
        notes
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating card relationship:', error);
    throw error;
  }
}

/**
 * Get all relationships for a card
 * @param {string} cardId - ID of the card
 * @param {string} direction - 'outgoing', 'incoming', or 'both'
 * @returns {Promise<Array>} - Array of relationships
 */
export async function getCardRelationships(cardId, direction = 'both') {
  try {
    let query = supabase
      .from('card_relationships')
      .select(`
        *,
        source_card:cards!card_relationships_source_card_id_fkey(id, title, content),
        target_card:cards!card_relationships_target_card_id_fkey(id, title, content)
      `);

    if (direction === 'outgoing') {
      query = query.eq('source_card_id', cardId);
    } else if (direction === 'incoming') {
      query = query.eq('target_card_id', cardId);
    } else {
      query = query.or(`source_card_id.eq.${cardId},target_card_id.eq.${cardId}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting card relationships:', error);
    throw error;
  }
}

/**
 * Update a card relationship
 * @param {string} relationshipId - ID of the relationship
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} - Updated relationship
 */
export async function updateCardRelationship(relationshipId, updates) {
  try {
    const { data, error } = await supabase
      .from('card_relationships')
      .update(updates)
      .eq('id', relationshipId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating card relationship:', error);
    throw error;
  }
}

/**
 * Delete a card relationship
 * @param {string} relationshipId - ID of the relationship
 * @returns {Promise<boolean>} - Success status
 */
export async function deleteCardRelationship(relationshipId) {
  try {
    const { error } = await supabase
      .from('card_relationships')
      .delete()
      .eq('id', relationshipId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting card relationship:', error);
    throw error;
  }
}

/**
 * Get relationship statistics for a card
 * @param {string} cardId - ID of the card
 * @returns {Promise<Object>} - Relationship statistics
 */
export async function getCardRelationshipStats(cardId) {
  try {
    const { data, error } = await supabase
      .from('card_relationships')
      .select('relationship_type, strength')
      .or(`source_card_id.eq.${cardId},target_card_id.eq.${cardId}`);

    if (error) throw error;

    const stats = {
      total: data.length,
      byType: {},
      averageStrength: 0
    };

    let totalStrength = 0;
    data.forEach(rel => {
      stats.byType[rel.relationship_type] = (stats.byType[rel.relationship_type] || 0) + 1;
      totalStrength += rel.strength;
    });

    stats.averageStrength = data.length > 0 ? totalStrength / data.length : 0;

    return stats;
  } catch (error) {
    console.error('Error getting card relationship stats:', error);
    throw error;
  }
}

/**
 * Find cards with specific relationship types
 * @param {string} cardId - ID of the source card
 * @param {string} relationshipType - Type of relationship to find
 * @returns {Promise<Array>} - Array of related cards
 */
export async function findRelatedCards(cardId, relationshipType) {
  try {
    const { data, error } = await supabase
      .from('card_relationships')
      .select(`
        *,
        target_card:cards!card_relationships_target_card_id_fkey(id, title, content, tags, rarity)
      `)
      .eq('source_card_id', cardId)
      .eq('relationship_type', relationshipType)
      .order('strength', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error finding related cards:', error);
    throw error;
  }
}
