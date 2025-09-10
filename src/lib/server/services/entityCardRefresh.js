// Auto-refresh system for entity cards when cards change
import { detectEntities, mapEntitiesToCards, matchCardToEntities } from './entityDetection.js';
import { getModelConfig } from '$lib/server/openrouter.js';

/**
 * Handle when a new card is added - check if it relates to existing entities or creates new ones
 * @param {Object} supabase - Supabase client
 * @param {Object} newCard - The newly created card
 * @returns {Object} - Summary of actions taken
 */
export async function handleNewCard(supabase, newCard) {
  console.log('🔄 EntityCardRefresh: Processing new card:', newCard.title);
  
  try {
    const projectId = newCard.project_id;
    
    // Get existing entity cards for this project
    const { data: existingCards, error: cardsError } = await supabase
      .from('entity_cards')
      .select('*')
      .eq('project_id', projectId);
    
    if (cardsError) {
      console.error('❌ EntityCardRefresh: Error fetching existing cards:', cardsError);
      return { error: 'Failed to fetch existing cards' };
    }
    
    let actionsPerformed = {
      newEntitiesDetected: 0,
      existingEntitiesUpdated: 0,
      cardRelationshipsAdded: 0
    };
    
    // Check if this card relates to existing entities
    if (existingCards && existingCards.length > 0) {
      const entityMatches = await matchCardToEntities(newCard, existingCards);
      
      if (entityMatches.length > 0) {
        console.log('🔗 EntityCardRefresh: Found', entityMatches.length, 'entity matches for new card');
        
        for (const match of entityMatches) {
          const entity = existingCards.find(e => e.entity_name === match.entity_name);
          if (entity) {
            // Add relationship between card and entity
            const { error: relationError } = await supabase
              .from('entity_card_cards')
              .upsert({
                entity_card_id: entity.id,
                card_id: newCard.id,
                relevance_score: match.relevance_score
              }, {
                onConflict: 'entity_card_id,card_id',
                ignoreDuplicates: false
              });
            
            if (relationError) {
              console.error('❌ EntityCardRefresh: Error adding card relationship:', relationError);
            } else {
              actionsPerformed.cardRelationshipsAdded++;
              
              // Update entity card's card count and last check time
              const { error: updateError } = await supabase
                .from('entity_cards')
                .update({
                  card_count: entity.card_count + 1,
                  last_cards_check: new Date().toISOString()
                })
                .eq('id', entity.id);
              
              if (!updateError) {
                actionsPerformed.existingEntitiesUpdated++;
                console.log('✅ EntityCardRefresh: Updated entity card for', entity.entity_name);
                
                // Trigger summary regeneration for this entity (async)
                regenerateEntitySummary(supabase, entity.id).catch(error => {
                  console.error('❌ EntityCardRefresh: Error regenerating summary:', error);
                });
              }
            }
          }
        }
      }
    }
    
    // Check if this card creates new entities (run periodically, not for every card)
    const shouldCheckForNewEntities = Math.random() < 0.2; // 20% chance to check for new entities
    
    if (shouldCheckForNewEntities) {
      console.log('🔍 EntityCardRefresh: Checking for new entities (periodic check)');
      
      // Get recent cards (including the new one) to check for new entities
      const { data: recentCards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50); // Check last 50 cards for new entities
      
      if (cardsError) {
        console.error('❌ EntityCardRefresh: Error fetching recent cards:', cardsError);
      } else {
        const detectedEntities = await detectEntities(recentCards);
        const entityCardsData = mapEntitiesToCards(detectedEntities, recentCards, projectId);
        
        // Only create entity cards for truly new entities
        for (const entityData of entityCardsData) {
          const existsAlready = existingCards?.some(card => 
            card.entity_name === entityData.entityName && 
            card.entity_type === entityData.entityType
          );
          
          if (!existsAlready && entityData.confidenceScore > 0.7) {
            console.log('🆕 EntityCardRefresh: Creating new entity card for', entityData.entityName);
            const created = await createEntityCard(supabase, entityData, recentCards);
            if (created) {
              actionsPerformed.newEntitiesDetected++;
            }
          }
        }
      }
    }
    
    console.log('✅ EntityCardRefresh: New card processing complete:', actionsPerformed);
    return { success: true, actions: actionsPerformed };
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error processing new card:', error);
    return { error: error.message };
  }
}

/**
 * Handle when a card is updated - update related entity cards
 * @param {Object} supabase - Supabase client  
 * @param {Object} updatedCard - The updated card
 * @returns {Object} - Summary of actions taken
 */
export async function handleUpdatedCard(supabase, updatedCard) {
  console.log('🔄 EntityCardRefresh: Processing updated card:', updatedCard.title);
  
  try {
    // Find entity cards that reference this card
    const { data: relatedCards, error: cardsError } = await supabase
      .from('entity_card_cards')
      .select(`
        entity_card_id,
        entity_cards(id, entity_name, entity_type)
      `)
      .eq('card_id', updatedCard.id);
    
    if (cardsError) {
      console.error('❌ EntityCardRefresh: Error fetching related cards:', cardsError);
      return { error: 'Failed to fetch related cards' };
    }
    
    if (!relatedCards || relatedCards.length === 0) {
      console.log('⚠️ EntityCardRefresh: No entity cards affected by card update');
      return { success: true, actions: { entitiesUpdated: 0 } };
    }
    
    let entitiesUpdated = 0;
    
    // Update last_cards_check timestamp for affected entities and trigger summary regeneration
    for (const relation of relatedCards) {
      const entityCard = relation.entity_cards;
      if (entityCard) {
        // Update timestamp
        const { error: updateError } = await supabase
          .from('entity_cards')
          .update({ last_cards_check: new Date().toISOString() })
          .eq('id', entityCard.id);
        
        if (!updateError) {
          entitiesUpdated++;
          console.log('🔄 EntityCardRefresh: Marked entity for refresh:', entityCard.entity_name);
          
          // Trigger summary regeneration (async)
          regenerateEntitySummary(supabase, entityCard.id).catch(error => {
            console.error('❌ EntityCardRefresh: Error regenerating summary:', error);
          });
        }
      }
    }
    
    console.log('✅ EntityCardRefresh: Updated card processing complete:', { entitiesUpdated });
    return { success: true, actions: { entitiesUpdated } };
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error processing updated card:', error);
    return { error: error.message };
  }
}

/**
 * Handle when a card is deleted - remove from entity relationships and potentially delete entity cards
 * @param {Object} supabase - Supabase client
 * @param {string} deletedCardId - ID of the deleted card
 * @returns {Object} - Summary of actions taken
 */
export async function handleDeletedCard(supabase, deletedCardId) {
  console.log('🗑️ EntityCardRefresh: Processing deleted card:', deletedCardId);
  
  try {
    // Find and remove entity-card relationships
    const { data: relationships, error: fetchError } = await supabase
      .from('entity_card_cards')
      .select(`
        entity_card_id,
        entity_cards(id, entity_name, card_count)
      `)
      .eq('card_id', deletedCardId);
    
    if (fetchError) {
      console.error('❌ EntityCardRefresh: Error fetching card relationships:', fetchError);
      return { error: 'Failed to fetch relationships' };
    }
    
    if (!relationships || relationships.length === 0) {
      console.log('⚠️ EntityCardRefresh: No entity relationships to remove');
      return { success: true, actions: { relationshipsRemoved: 0, entitiesDeleted: 0 } };
    }
    
    // Remove relationships
    const { error: deleteError } = await supabase
      .from('entity_card_cards')
      .delete()
      .eq('card_id', deletedCardId);
    
    if (deleteError) {
      console.error('❌ EntityCardRefresh: Error removing relationships:', deleteError);
      return { error: 'Failed to remove relationships' };
    }
    
    let entitiesUpdated = 0;
    let entitiesDeleted = 0;
    
    // Update affected entity cards
    for (const relation of relationships) {
      const entityCard = relation.entity_cards;
      if (entityCard) {
        const newCardCount = Math.max(0, entityCard.card_count - 1);
        
        // If entity has no more cards, delete the card
        if (newCardCount === 0) {
          const { error: deleteEntityError } = await supabase
            .from('entity_cards')
            .delete()
            .eq('id', entityCard.id);
          
          if (!deleteEntityError) {
            entitiesDeleted++;
            console.log('🗑️ EntityCardRefresh: Deleted empty entity card:', entityCard.entity_name);
          }
        } else {
          // Update card count and timestamp
          const { error: updateError } = await supabase
            .from('entity_cards')
            .update({
              card_count: newCardCount,
              last_cards_check: new Date().toISOString()
            })
            .eq('id', entityCard.id);
          
          if (!updateError) {
            entitiesUpdated++;
            console.log('🔄 EntityCardRefresh: Updated entity card count:', entityCard.entity_name);
            
            // Trigger summary regeneration (async)
            regenerateEntitySummary(supabase, entityCard.id).catch(error => {
              console.error('❌ EntityCardRefresh: Error regenerating summary:', error);
            });
          }
        }
      }
    }
    
    const actions = { 
      relationshipsRemoved: relationships.length, 
      entitiesUpdated, 
      entitiesDeleted 
    };
    
    console.log('✅ EntityCardRefresh: Deleted card processing complete:', actions);
    return { success: true, actions };
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error processing deleted card:', error);
    return { error: error.message };
  }
}

/**
 * Create a new entity card
 * @param {Object} supabase - Supabase client
 * @param {Object} entityData - Entity data from detection
 * @param {Array} cards - All cards for context
 * @returns {boolean} - Whether card was created successfully
 */
async function createEntityCard(supabase, entityData, cards) {
  try {
    // Generate summary
    const { config: modelConf, client: openai } = getModelConfig('micro');
    
    const relatedCardsText = entityData.relatedCards
      .map(rc => {
        const card = cards.find(c => c.id === rc.cardId);
        return card ? `[${card.type}] ${card.title}: ${card.content}` : '';
      })
      .filter(Boolean)
      .join('\n');
    
    const summaryPrompt = `Create a concise summary for this entity:
    
Entity: ${entityData.entityName} (${entityData.entityType})
Cards: ${relatedCardsText}

Write a 2-3 sentence summary that introduces the entity and highlights key information.`;
    
    const summaryResponse = await openai.chat.completions.create({
      model: modelConf.name,
      messages: [
        { role: 'system', content: 'Write concise entity summaries.' },
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.3,
      max_tokens: 150
    });
    
    const summary = summaryResponse.choices[0]?.message?.content?.trim();
    if (!summary) return false;
    
    // Generate embedding
    const { createOpenAIClient } = await import('$lib/server/openrouter.js');
    const embeddingClient = createOpenAIClient();
    
    let embedding = null;
    try {
      const embResponse = await embeddingClient.embeddings.create({
        model: 'text-embedding-3-small',
        input: `${entityData.entityName} ${entityData.entityType}: ${summary}`
      });
      embedding = embResponse.data[0]?.embedding || null;
    } catch (embError) {
      console.warn('⚠️ EntityCardRefresh: Failed to generate embedding');
    }
    
    // Create entity card
    const cardData = {
      project_id: entityData.projectId,
      entity_name: entityData.entityName,
      entity_type: entityData.entityType,
      summary: summary,
      summary_tokens: Math.ceil(summary.length / 4),
      card_count: entityData.cardCount,
      confidence_score: entityData.confidenceScore,
      embedding: embedding,
      last_cards_check: new Date().toISOString()
    };
    
    const { data: newCard, error: cardError } = await supabase
      .from('entity_cards')
      .insert(cardData)
      .select()
      .single();
    
    if (cardError) {
      console.error('❌ EntityCardRefresh: Error creating card:', cardError);
      return false;
    }
    
    // Add card relationships
    const cardRelationships = entityData.relatedCards.map(rc => ({
      entity_card_id: newCard.id,
      card_id: rc.cardId,
      relevance_score: rc.relevanceScore
    }));
    
    const { error: relationError } = await supabase
      .from('entity_card_cards')
      .insert(cardRelationships);
    
    if (relationError) {
      console.error('❌ EntityCardRefresh: Error adding relationships:', relationError);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error creating entity card:', error);
    return false;
  }
}

/**
 * Regenerate summary for an entity card based on current cards
 * @param {Object} supabase - Supabase client
 * @param {string} entityCardId - ID of the entity card to regenerate
 */
async function regenerateEntitySummary(supabase, entityCardId) {
  try {
    // Get entity card and its related cards
    const { data: cardData, error: cardError } = await supabase
      .from('entity_cards')
      .select(`
        *,
        entity_card_cards(
          relevance_score,
          cards(*)
        )
      `)
      .eq('id', entityCardId)
      .single();
    
    if (cardError || !cardData) {
      console.error('❌ EntityCardRefresh: Error fetching card for regeneration:', cardError);
      return;
    }
    
    const cards = cardData.entity_card_cards?.map(ecc => ecc.cards).filter(Boolean) || [];
    if (cards.length === 0) {
      console.log('⚠️ EntityCardRefresh: No cards to regenerate summary for', cardData.entity_name);
      return;
    }
    
    // Generate new summary
    const { config: modelConf, client: openai } = getModelConfig('micro');
    
    const cardsText = cards.map(c => `[${c.type}] ${c.title}: ${c.content}`).join('\n');
    
    const summaryPrompt = `Create an updated summary for this entity:
    
Entity: ${cardData.entity_name} (${cardData.entity_type})
Current Cards:
${cardsText}

Write a 2-3 sentence summary that captures all current information about this entity.`;
    
    const summaryResponse = await openai.chat.completions.create({
      model: modelConf.name,
      messages: [
        { role: 'system', content: 'Write updated entity summaries based on current cards.' },
        { role: 'user', content: summaryPrompt }
      ],
      temperature: 0.3,
      max_tokens: 200
    });
    
    const newSummary = summaryResponse.choices[0]?.message?.content?.trim();
    if (!newSummary) {
      console.error('❌ EntityCardRefresh: No summary generated for regeneration');
      return;
    }
    
    // Update entity card with new summary
    const { error: updateError } = await supabase
      .from('entity_cards')
      .update({
        summary: newSummary,
        summary_tokens: Math.ceil(newSummary.length / 4),
        updated_at: new Date().toISOString()
      })
      .eq('id', entityCardId);
    
    if (updateError) {
      console.error('❌ EntityCardRefresh: Error updating regenerated summary:', updateError);
    } else {
      console.log('✅ EntityCardRefresh: Regenerated summary for', cardData.entity_name);
    }
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error regenerating summary:', error);
  }
}
