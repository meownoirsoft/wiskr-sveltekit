import { json } from '@sveltejs/kit';
import { detectEntities, mapEntitiesToFacts } from '$lib/server/services/entityDetection.js';
import { getModelConfig } from '$lib/server/openrouter.js';
import { processAIResponse } from '$lib/server/responseProcessor.js';
import { refreshContextScore } from '$lib/server/utils/contextScore.js';

/**
 * Import a complete project from an exported JSON file
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function POST({ request, locals }) {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file');
    const optionsStr = formData.get('options');

    if (!file || !optionsStr) {
      return json({ error: 'Missing file or options' }, { status: 400 });
    }

    let options;
    try {
      options = JSON.parse(optionsStr);
    } catch (err) {
      return json({ error: 'Invalid options format' }, { status: 400 });
    }

    // Read and parse the uploaded file
    let importData;
    try {
      const fileContent = await file.text();
      importData = JSON.parse(fileContent);
    } catch (err) {
      return json({ error: 'Invalid JSON file' }, { status: 400 });
    }

    // Validate it's a Wiskr export
    if (!importData.meta || importData.meta.export_version !== '1.0' || !importData.project) {
      return json({ error: 'Invalid Wiskr export file format' }, { status: 400 });
    }

    let targetProjectId;
    let targetProject;

    // Handle create new project vs merge with existing
    if (options.createNewProject) {
      if (!options.projectName || !options.projectName.trim()) {
        return json({ error: 'Project name is required' }, { status: 400 });
      }

      // Create new project
      const { data: newProject, error: projectError } = await locals.supabase
        .from('projects')
        .insert({
          name: options.projectName.trim(),
          description: importData.project.description || '',
          icon: importData.project.icon || null,
          color: importData.project.color || null,
          brief_text: importData.project.brief_text || '',
          user_id: user.id
        })
        .select()
        .single();

      if (projectError) {
        console.error('Error creating project:', projectError);
        return json({ error: 'Failed to create project' }, { status: 500 });
      }

      targetProjectId = newProject.id;
      targetProject = newProject;
    } else {
      // Merge with existing project
      if (!options.existingProjectId) {
        return json({ error: 'Existing project ID is required' }, { status: 400 });
      }

      // Verify user owns the target project
      const { data: existingProject, error: projectError } = await locals.supabase
        .from('projects')
        .select('*')
        .eq('id', options.existingProjectId)
        .eq('user_id', user.id)
        .single();

      if (projectError || !existingProject) {
        return json({ error: 'Target project not found or access denied' }, { status: 404 });
      }

      targetProjectId = existingProject.id;
      targetProject = existingProject;
    }

    // Keep track of imported counts for statistics
    const stats = {
      sessions_imported: 0,
      branches_imported: 0,
      messages_imported: 0,
      facts_imported: 0,
      docs_imported: 0,
      questions_imported: 0,
      fact_types_imported: 0
    };

    // ID mapping for references between imported records
    const sessionIdMapping = new Map(); // old_id -> new_id
    const branchIdMapping = new Map(); // old_branch_id -> new_branch_id
    const factTypeMapping = new Map(); // old_type -> new_type

    // Import sessions first (they're referenced by messages and branches)
    if (importData.sessions && importData.sessions.length > 0) {
      for (const session of importData.sessions) {
        const { data: newSession, error } = await locals.supabase
          .from('conversation_sessions')
          .insert({
            project_id: targetProjectId,
            session_name: session.session_name,
            created_at: session.created_at,
            updated_at: session.updated_at
          })
          .select()
          .single();

        if (error) {
          console.error('Error importing session:', error);
          continue;
        }

        sessionIdMapping.set(session.id, newSession.id);
        stats.sessions_imported++;
      }
    }

    // Import fact types before facts (they're referenced by facts)
    if (importData.fact_types && importData.fact_types.length > 0) {
      for (const factType of importData.fact_types) {
        const { data: newFactType, error } = await locals.supabase
          .from('project_fact_types')
          .insert({
            project_id: targetProjectId,
            type_key: factType.type_key,
            display_name: factType.display_name,
            color_class: factType.color_class,
            sort_order: factType.sort_order,
            created_at: factType.created_at
          })
          .select()
          .single();

        if (error) {
          console.error('Error importing fact type:', error);
          continue;
        }

        factTypeMapping.set(factType.type_key, factType.type_key); // Keep same type_key
        stats.fact_types_imported++;
      }
    }

    // Import branches (they may reference sessions)
    if (importData.branches && importData.branches.length > 0) {
      for (const branch of importData.branches) {
        const sessionId = sessionIdMapping.get(branch.session_id) || null;

        const { data: newBranch, error } = await locals.supabase
          .from('conversation_branches')
          .insert({
            project_id: targetProjectId,
            session_id: sessionId,
            branch_id: branch.branch_id,
            branch_name: branch.branch_name,
            color_index: branch.color_index,
            created_at: branch.created_at
          })
          .select()
          .single();

        if (error) {
          console.error('Error importing branch:', error);
          continue;
        }

        branchIdMapping.set(branch.branch_id, branch.branch_id); // Keep same branch_id
        stats.branches_imported++;
      }
    }

    // Import facts
    if (importData.facts && importData.facts.length > 0) {
      for (const fact of importData.facts) {
        const { data: newFact, error } = await locals.supabase
          .from('facts')
          .insert({
            project_id: targetProjectId,
            type: fact.type,
            key: fact.key,
            value: fact.value,
            tags: fact.tags,
            pinned: fact.pinned || false,
            created_at: fact.created_at,
            updated_at: fact.updated_at
          })
          .select()
          .single();

        if (error) {
          console.error('Error importing fact:', error);
          continue;
        }

        stats.facts_imported++;
      }
    }

    // Import docs
    if (importData.docs && importData.docs.length > 0) {
      for (const doc of importData.docs) {
        const { data: newDoc, error } = await locals.supabase
          .from('docs')
          .insert({
            project_id: targetProjectId,
            title: doc.title,
            content: doc.content,
            tags: doc.tags,
            pinned: doc.pinned || false,
            created_at: doc.created_at,
            updated_at: doc.updated_at
          })
          .select()
          .single();

        if (error) {
          console.error('Error importing doc:', error);
          continue;
        }

        stats.docs_imported++;
      }
    }

    // Import questions
    if (importData.questions && importData.questions.length > 0) {
      for (const question of importData.questions) {
        const { data: newQuestion, error } = await locals.supabase
          .from('project_questions')
          .insert({
            project_id: targetProjectId,
            question: question.question,
            category: question.category,
            created_at: question.created_at
          })
          .select()
          .single();

        if (error) {
          console.error('Error importing question:', error);
          continue;
        }

        stats.questions_imported++;
      }
    }

    // Import messages last (they reference sessions and branches)
    if (importData.messages && importData.messages.length > 0) {
      for (const message of importData.messages) {
        const sessionId = sessionIdMapping.get(message.session_id) || null;
        const branchId = message.branch_id || 'main'; // Default to main branch

        const { data: newMessage, error } = await locals.supabase
          .from('messages')
          .insert({
            project_id: targetProjectId,
            session_id: sessionId,
            branch_id: branchId,
            role: message.role,
            content: message.content,
            model_key: message.model_key,
            created_at: message.created_at
          })
          .select()
          .single();

        if (error) {
          console.error('Error importing message:', error);
          continue;
        }

        stats.messages_imported++;
      }
    }

    // Auto-generate entity cards if facts were imported
    let entityCardsGenerated = 0;
    if (stats.facts_imported > 0) {
      try {
        console.log('🎯 Import: Auto-generating entity cards after importing', stats.facts_imported, 'facts...');
        
        // Get all facts for the project to generate entity cards
        const { data: allFacts, error: factsError } = await locals.supabase
          .from('facts')
          .select('*')
          .eq('project_id', targetProjectId)
          .order('created_at', { ascending: true });

        if (factsError || !allFacts || allFacts.length === 0) {
          console.log('⚠️ Import: No facts found for entity card generation');
        } else {
          // Detect entities from facts
          const detectedEntities = await detectEntities(allFacts);
          
          if (detectedEntities.length > 0) {
            // Map entities to facts
            const entityCardsData = mapEntitiesToFacts(detectedEntities, allFacts, targetProjectId);
            
            // Get model config for summary generation
            const { config: modelConf, client: openai } = getModelConfig('micro');
            
            // Process each entity
            for (const entityData of entityCardsData) {
              try {
                // Generate summary for this entity
                const relatedFactsText = entityData.relatedFacts
                  .map(rf => {
                    const fact = allFacts.find(f => f.id === rf.factId);
                    return fact ? `[${fact.type}] ${fact.key}: ${fact.value}` : '';
                  })
                  .filter(Boolean)
                  .join('\n');

                const summaryPrompt = `Create a concise, informative summary for this entity based on the related facts. 
        
Entity: ${entityData.entityName} (${entityData.entityType})

Related Facts:
${relatedFactsText}

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
                  console.warn('⚠️ Import: No summary generated for', entityData.entityName);
                  continue;
                }
                
                // Process the summary
                const summary = processAIResponse(rawSummary, 'micro');
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
                  console.warn('⚠️ Import: Failed to generate embedding for', entityData.entityName);
                }

                // Upsert entity card
                const cardData = {
                  project_id: targetProjectId,
                  entity_name: entityData.entityName,
                  entity_type: entityData.entityType,
                  summary: summary,
                  summary_tokens: summaryTokens,
                  fact_count: entityData.factCount,
                  confidence_score: entityData.confidenceScore,
                  embedding: embedding,
                  last_facts_check: new Date().toISOString()
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
                  console.error('❌ Import: Error upserting entity card for', entityData.entityName, upsertError);
                  continue;
                }

                // Clear old entity-fact relationships and insert new ones
                await locals.supabase
                  .from('entity_card_facts')
                  .delete()
                  .eq('entity_card_id', upsertedCard.id);

                const factRelationships = entityData.relatedFacts.map(rf => ({
                  entity_card_id: upsertedCard.id,
                  fact_id: rf.factId,
                  relevance_score: rf.relevanceScore
                }));

                if (factRelationships.length > 0) {
                  const { error: relationError } = await locals.supabase
                    .from('entity_card_facts')
                    .insert(factRelationships);

                  if (relationError) {
                    console.error('❌ Import: Error inserting fact relationships:', relationError);
                  }
                }

                entityCardsGenerated++;
                console.log(`✅ Import: Generated entity card for "${entityData.entityName}" (${entityData.entityType})`);

              } catch (error) {
                console.warn('⚠️ Import: Error processing entity', entityData.entityName, ':', error.message);
              }
            }
            
            console.log('✅ Import: Successfully generated', entityCardsGenerated, 'entity cards');
          } else {
            console.log('⚠️ Import: No entities detected from imported facts');
          }
        }
      } catch (error) {
        console.warn('⚠️ Import: Error auto-generating entity cards:', error.message, 'but import was successful');
      }
    }

    // Refresh project quality score after import (especially if entity cards were generated)
    try {
      const updatedScore = await refreshContextScore(locals.supabase, targetProjectId);
      console.log('📊 Import: Updated context quality score:', updatedScore);
    } catch (scoreError) {
      console.warn('⚠️ Import: Failed to update context score:', scoreError.message, 'but import was successful');
    }

    // Return success response with statistics
    return json({
      success: true,
      project: {
        id: targetProject.id,
        name: targetProject.name
      },
      statistics: {
        ...stats,
        entity_cards_generated: entityCardsGenerated,
        total_imported: Object.values(stats).reduce((sum, count) => sum + count, 0)
      },
      import_mode: options.createNewProject ? 'new_project' : 'merge_existing'
    });

  } catch (error) {
    console.error('Import error:', error);
    return json({ 
      error: 'Import failed: ' + (error.message || 'Unknown error')
    }, { status: 500 });
  }
}
