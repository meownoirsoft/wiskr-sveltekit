// Auto-refresh system for entity cards when facts change
import { detectEntities, mapEntitiesToFacts, matchFactToEntities } from './entityDetection.js';
import { getModelConfig } from '$lib/server/openrouter.js';

/**
 * Handle when a new fact is added - check if it relates to existing entities or creates new ones
 * @param {Object} supabase - Supabase client
 * @param {Object} newFact - The newly created fact
 * @returns {Object} - Summary of actions taken
 */
export async function handleNewFact(supabase, newFact) {
  console.log('🔄 EntityCardRefresh: Processing new fact:', newFact.key);
  
  try {
    const projectId = newFact.project_id;
    
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
      factRelationshipsAdded: 0
    };
    
    // Check if this fact relates to existing entities
    if (existingCards && existingCards.length > 0) {
      const entityMatches = await matchFactToEntities(newFact, existingCards);
      
      if (entityMatches.length > 0) {
        console.log('🔗 EntityCardRefresh: Found', entityMatches.length, 'entity matches for new fact');
        
        for (const match of entityMatches) {
          const entity = existingCards.find(e => e.entity_name === match.entity_name);
          if (entity) {
            // Add relationship between fact and entity
            const { error: relationError } = await supabase
              .from('entity_card_facts')
              .upsert({
                entity_card_id: entity.id,
                fact_id: newFact.id,
                relevance_score: match.relevance_score
              }, {
                onConflict: 'entity_card_id,fact_id',
                ignoreDuplicates: false
              });
            
            if (relationError) {
              console.error('❌ EntityCardRefresh: Error adding fact relationship:', relationError);
            } else {
              actionsPerformed.factRelationshipsAdded++;
              
              // Update entity card's fact count and last check time
              const { error: updateError } = await supabase
                .from('entity_cards')
                .update({
                  fact_count: entity.fact_count + 1,
                  last_facts_check: new Date().toISOString()
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
    
    // Check if this fact creates new entities (run periodically, not for every fact)
    const shouldCheckForNewEntities = Math.random() < 0.2; // 20% chance to check for new entities
    
    if (shouldCheckForNewEntities) {
      console.log('🔍 EntityCardRefresh: Checking for new entities (periodic check)');
      
      // Get recent facts (including the new one) to check for new entities
      const { data: recentFacts, error: factsError } = await supabase
        .from('facts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50); // Check last 50 facts for new entities
      
      if (factsError) {
        console.error('❌ EntityCardRefresh: Error fetching recent facts:', factsError);
      } else {
        const detectedEntities = await detectEntities(recentFacts);
        const entityCardsData = mapEntitiesToFacts(detectedEntities, recentFacts, projectId);
        
        // Only create entity cards for truly new entities
        for (const entityData of entityCardsData) {
          const existsAlready = existingCards?.some(card => 
            card.entity_name === entityData.entityName && 
            card.entity_type === entityData.entityType
          );
          
          if (!existsAlready && entityData.confidenceScore > 0.7) {
            console.log('🆕 EntityCardRefresh: Creating new entity card for', entityData.entityName);
            const created = await createEntityCard(supabase, entityData, recentFacts);
            if (created) {
              actionsPerformed.newEntitiesDetected++;
            }
          }
        }
      }
    }
    
    console.log('✅ EntityCardRefresh: New fact processing complete:', actionsPerformed);
    return { success: true, actions: actionsPerformed };
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error processing new fact:', error);
    return { error: error.message };
  }
}

/**
 * Handle when a fact is updated - update related entity cards
 * @param {Object} supabase - Supabase client  
 * @param {Object} updatedFact - The updated fact
 * @returns {Object} - Summary of actions taken
 */
export async function handleUpdatedFact(supabase, updatedFact) {
  console.log('🔄 EntityCardRefresh: Processing updated fact:', updatedFact.key);
  
  try {
    // Find entity cards that reference this fact
    const { data: relatedCards, error: cardsError } = await supabase
      .from('entity_card_facts')
      .select(`
        entity_card_id,
        entity_cards(id, entity_name, entity_type)
      `)
      .eq('fact_id', updatedFact.id);
    
    if (cardsError) {
      console.error('❌ EntityCardRefresh: Error fetching related cards:', cardsError);
      return { error: 'Failed to fetch related cards' };
    }
    
    if (!relatedCards || relatedCards.length === 0) {
      console.log('⚠️ EntityCardRefresh: No entity cards affected by fact update');
      return { success: true, actions: { entitiesUpdated: 0 } };
    }
    
    let entitiesUpdated = 0;
    
    // Update last_facts_check timestamp for affected entities and trigger summary regeneration
    for (const relation of relatedCards) {
      const entityCard = relation.entity_cards;
      if (entityCard) {
        // Update timestamp
        const { error: updateError } = await supabase
          .from('entity_cards')
          .update({ last_facts_check: new Date().toISOString() })
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
    
    console.log('✅ EntityCardRefresh: Updated fact processing complete:', { entitiesUpdated });
    return { success: true, actions: { entitiesUpdated } };
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error processing updated fact:', error);
    return { error: error.message };
  }
}

/**
 * Handle when a fact is deleted - remove from entity relationships and potentially delete entity cards
 * @param {Object} supabase - Supabase client
 * @param {string} deletedFactId - ID of the deleted fact
 * @returns {Object} - Summary of actions taken
 */
export async function handleDeletedFact(supabase, deletedFactId) {
  console.log('🗑️ EntityCardRefresh: Processing deleted fact:', deletedFactId);
  
  try {
    // Find and remove entity-fact relationships
    const { data: relationships, error: fetchError } = await supabase
      .from('entity_card_facts')
      .select(`
        entity_card_id,
        entity_cards(id, entity_name, fact_count)
      `)
      .eq('fact_id', deletedFactId);
    
    if (fetchError) {
      console.error('❌ EntityCardRefresh: Error fetching fact relationships:', fetchError);
      return { error: 'Failed to fetch relationships' };
    }
    
    if (!relationships || relationships.length === 0) {
      console.log('⚠️ EntityCardRefresh: No entity relationships to remove');
      return { success: true, actions: { relationshipsRemoved: 0, entitiesDeleted: 0 } };
    }
    
    // Remove relationships
    const { error: deleteError } = await supabase
      .from('entity_card_facts')
      .delete()
      .eq('fact_id', deletedFactId);
    
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
        const newFactCount = Math.max(0, entityCard.fact_count - 1);
        
        // If entity has no more facts, delete the card
        if (newFactCount === 0) {
          const { error: deleteEntityError } = await supabase
            .from('entity_cards')
            .delete()
            .eq('id', entityCard.id);
          
          if (!deleteEntityError) {
            entitiesDeleted++;
            console.log('🗑️ EntityCardRefresh: Deleted empty entity card:', entityCard.entity_name);
          }
        } else {
          // Update fact count and timestamp
          const { error: updateError } = await supabase
            .from('entity_cards')
            .update({
              fact_count: newFactCount,
              last_facts_check: new Date().toISOString()
            })
            .eq('id', entityCard.id);
          
          if (!updateError) {
            entitiesUpdated++;
            console.log('🔄 EntityCardRefresh: Updated entity fact count:', entityCard.entity_name);
            
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
    
    console.log('✅ EntityCardRefresh: Deleted fact processing complete:', actions);
    return { success: true, actions };
    
  } catch (error) {
    console.error('❌ EntityCardRefresh: Error processing deleted fact:', error);
    return { error: error.message };
  }
}

/**
 * Create a new entity card
 * @param {Object} supabase - Supabase client
 * @param {Object} entityData - Entity data from detection
 * @param {Array} facts - All facts for context
 * @returns {boolean} - Whether card was created successfully
 */
async function createEntityCard(supabase, entityData, facts) {
  try {
    // Generate summary
    const { config: modelConf, client: openai } = getModelConfig('micro');
    
    const relatedFactsText = entityData.relatedFacts
      .map(rf => {
        const fact = facts.find(f => f.id === rf.factId);
        return fact ? `[${fact.type}] ${fact.key}: ${fact.value}` : '';
      })
      .filter(Boolean)
      .join('\n');
    
    const summaryPrompt = `Create a concise summary for this entity:
    
Entity: ${entityData.entityName} (${entityData.entityType})
Facts: ${relatedFactsText}

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
      fact_count: entityData.factCount,
      confidence_score: entityData.confidenceScore,
      embedding: embedding,
      last_facts_check: new Date().toISOString()
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
    
    // Add fact relationships
    const factRelationships = entityData.relatedFacts.map(rf => ({
      entity_card_id: newCard.id,
      fact_id: rf.factId,
      relevance_score: rf.relevanceScore
    }));
    
    const { error: relationError } = await supabase
      .from('entity_card_facts')
      .insert(factRelationships);
    
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
 * Regenerate summary for an entity card based on current facts
 * @param {Object} supabase - Supabase client
 * @param {string} entityCardId - ID of the entity card to regenerate
 */
async function regenerateEntitySummary(supabase, entityCardId) {
  try {
    // Get entity card and its related facts
    const { data: cardData, error: cardError } = await supabase
      .from('entity_cards')
      .select(`
        *,
        entity_card_facts(
          relevance_score,
          facts(*)
        )
      `)
      .eq('id', entityCardId)
      .single();
    
    if (cardError || !cardData) {
      console.error('❌ EntityCardRefresh: Error fetching card for regeneration:', cardError);
      return;
    }
    
    const facts = cardData.entity_card_facts?.map(ecf => ecf.facts).filter(Boolean) || [];
    if (facts.length === 0) {
      console.log('⚠️ EntityCardRefresh: No facts to regenerate summary for', cardData.entity_name);
      return;
    }
    
    // Generate new summary
    const { config: modelConf, client: openai } = getModelConfig('micro');
    
    const factsText = facts.map(f => `[${f.type}] ${f.key}: ${f.value}`).join('\n');
    
    const summaryPrompt = `Create an updated summary for this entity:
    
Entity: ${cardData.entity_name} (${cardData.entity_type})
Current Facts:
${factsText}

Write a 2-3 sentence summary that captures all current information about this entity.`;
    
    const summaryResponse = await openai.chat.completions.create({
      model: modelConf.name,
      messages: [
        { role: 'system', content: 'Write updated entity summaries based on current facts.' },
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
