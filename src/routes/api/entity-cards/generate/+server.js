// API endpoint for generating entity card summaries
import { json } from '@sveltejs/kit';
import { detectEntities, mapEntitiesToCards } from '$lib/server/services/entityDetection.js';
import { getModelConfig } from '$lib/server/openrouter.js';
import { processAIResponse } from '$lib/server/responseProcessor.js';

/**
 * Generate or update entity cards for a project
 * POST /api/entity-cards/generate
 */
export async function POST({ request, locals }) {
  try {
    // Verify user is authenticated
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { projectId, mode = 'full' } = await request.json();

    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log('🎯 EntityCards: Starting card generation for project:', projectId, 'mode:', mode);

    // Verify user owns this project
    const { data: project, error: projectError } = await locals.supabase
      .from('projects')
      .select('id, name')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Get all cards for this project
    const { data: cards, error: cardsError } = await locals.supabase
      .from('cards')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (cardsError) {
      console.error('❌ EntityCards: Error fetching cards:', cardsError);
      return json({ error: 'Failed to fetch cards' }, { status: 500 });
    }

    if (!cards || cards.length === 0) {
      console.log('⚠️ EntityCards: No cards found for project');
      return json({ message: 'No cards to analyze', cardsGenerated: 0 });
    }

    console.log('📋 EntityCards: Analyzing', cards.length, 'cards...');

    // Detect entities from cards
    const detectedEntities = await detectEntities(cards);
    
    if (detectedEntities.length === 0) {
      console.log('⚠️ EntityCards: No entities detected');
      return json({ message: 'No entities detected in cards', cardsGenerated: 0 });
    }

    // Map entities to cards
    const entityCardsData = mapEntitiesToCards(detectedEntities, cards, projectId);

    console.log('🏗️ EntityCards: Creating', entityCardsData.length, 'entity cards...');

    // Get model config for summary generation
    const { config: modelConf, client: openai } = getModelConfig('micro'); // Use cheap model

    let cardsGenerated = 0;

    // Process each entity
    for (const entityData of entityCardsData) {
      try {
        // Check if entity card already exists
        const { data: existingCard } = await locals.supabase
          .from('entity_cards')
          .select('id, updated_at')
          .eq('project_id', projectId)
          .eq('entity_name', entityData.entityName)
          .eq('entity_type', entityData.entityType)
          .single();

        // Skip if card exists and is recent (unless force mode)
        if (existingCard && mode !== 'force') {
          const hoursSinceUpdate = (Date.now() - new Date(existingCard.updated_at).getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate < 1) { // Skip if updated within last hour
            console.log(`⏭️ EntityCards: Skipping recent card for "${entityData.entityName}"`);
            continue;
          }
        }

        // Generate summary for this entity
        const relatedCardsText = entityData.relatedCards
          .map(rc => {
            const card = cards.find(c => c.id === rc.cardId);
            return card ? `[${card.type || 'note'}] ${card.title}: ${card.content}` : '';
          })
          .filter(Boolean)
          .join('\n');

        const summaryPrompt = `Create a concise, informative summary for this entity based on the related cards. 
        
Entity: ${entityData.entityName} (${entityData.entityType})

Related Cards:
${relatedCardsText}

Create a 2-3 sentence summary that:
1. Introduces the entity clearly
2. Highlights the most important/interesting information
3. Is useful for AI context and human reference
4. Stays factual and concise

Summary:`;

        const summaryResponse = await openai.chat.completions.create({
          model: modelConf.name,
          messages: [
            { 
              role: 'system', 
              content: 'You write concise, informative entity summaries. Keep them factual and useful for both AI and human readers.' 
            },
            { role: 'user', content: summaryPrompt }
          ],
          temperature: 0.3,
          max_tokens: 200
        });

        const rawSummary = summaryResponse.choices[0]?.message?.content?.trim();
        if (!rawSummary) {
          console.error('❌ EntityCards: No summary generated for', entityData.entityName);
          continue;
        }
        
        // Process the summary to replace any AI self-identifications
        const summary = processAIResponse(rawSummary, 'micro');

        // Estimate token count (rough approximation)
        const summaryTokens = Math.ceil(summary.length / 4);

        // Generate embedding for the summary
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
          console.warn('⚠️ EntityCards: Failed to generate embedding for', entityData.entityName, embError.message);
        }

        // Upsert entity card
        const cardData = {
          project_id: projectId,
          entity_name: entityData.entityName,
          entity_type: entityData.entityType,
          summary: summary,
          summary_tokens: summaryTokens,
          card_count: entityData.cardCount,
          confidence_score: entityData.confidenceScore,
          embedding: embedding,
          last_cards_check: new Date().toISOString()
        };

        const { data: upsertedCard, error: upsertError } = await locals.supabase
          .from('entity_cards')
          .upsert(cardData, { 
            onConflict: 'project_id,entity_name,entity_type',
            ignoreDuplicates: false 
          })
          .select()
          .single();

        if (upsertError) {
          console.error('❌ EntityCards: Error upserting card for', entityData.entityName, upsertError);
          continue;
        }

        // Clear old entity-card relationships and insert new ones
        await locals.supabase
          .from('entity_card_cards')
          .delete()
          .eq('entity_card_id', upsertedCard.id);

        const cardRelationships = entityData.relatedCards.map(rc => ({
          entity_card_id: upsertedCard.id,
          card_id: rc.cardId,
          relevance_score: rc.relevanceScore
        }));

        if (cardRelationships.length > 0) {
          const { error: relationError } = await locals.supabase
            .from('entity_card_cards')
            .insert(cardRelationships);

          if (relationError) {
            console.error('❌ EntityCards: Error inserting card relationships:', relationError);
          }
        }

        cardsGenerated++;
        console.log(`✅ EntityCards: Generated card for "${entityData.entityName}" (${entityData.entityType})`);

      } catch (error) {
        console.error('❌ EntityCards: Error processing entity', entityData.entityName, ':', error.message);
      }
    }

    console.log('🎉 EntityCards: Generation complete!', cardsGenerated, 'cards generated/updated');

    return json({
      message: `Generated ${cardsGenerated} entity cards`,
      cardsGenerated,
      entitiesDetected: detectedEntities.length,
      projectName: project.name
    });

  } catch (error) {
    console.error('❌ EntityCards: API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get entity cards for a project  
 * GET /api/entity-cards/generate?projectId=...
 */
export async function GET({ url, locals }) {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = url.searchParams.get('projectId');
    if (!projectId) {
      return json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Get entity cards with card counts
    const { data: cards, error } = await locals.supabase
      .from('entity_cards')
      .select(`
        *,
        entity_card_cards(count)
      `)
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('❌ EntityCards: Error fetching cards:', error);
      return json({ error: 'Failed to fetch entity cards' }, { status: 500 });
    }

    // Transform the response to include card counts
    const transformedCards = cards?.map(card => ({
      ...card,
      actual_card_count: card.entity_card_cards?.[0]?.count || 0
    })) || [];

    return json({
      cards: transformedCards,
      totalCards: transformedCards.length
    });

  } catch (error) {
    console.error('❌ EntityCards: GET API error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
