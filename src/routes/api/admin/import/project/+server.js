import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/queries.js';
import { isAdmin } from '$lib/auth/admin';
import { getUserById } from '$lib/server/auth.js';
import JSZip from 'jszip';
import { detectEntities, mapEntitiesToCards } from '$lib/server/services/entityDetection.js';
import { getModelConfig } from '$lib/server/openrouter.js';
import { processAIResponse } from '$lib/server/responseProcessor.js';
import { trackAIUsage } from '$lib/server/utils/usageTracker.js';

/**
 * Generate entity cards for a project after import
 * @param {string} projectId
 * @returns {Promise<number>} Number of entity cards generated
 */
async function generateEntityCards(projectId) {
  try {
    console.log('🎯 Import: Starting entity card generation for project:', projectId);

    const { data: facts, error: factsError } = await db
      .from('cards')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (factsError) {
      console.error('❌ Import: Error fetching facts for entity generation:', factsError);
      return 0;
    }

    if (!facts || facts.length === 0) {
      console.log('⚠️ Import: No facts found for entity generation');
      return 0;
    }

    console.log('📋 Import: Analyzing', facts.length, 'facts for entities...');

    const detectedEntities = await detectEntities(facts);

    if (detectedEntities.length === 0) {
      console.log('⚠️ Import: No entities detected');
      return 0;
    }

    const entityCardsData = mapEntitiesToCards(detectedEntities, facts, projectId);

    console.log('🏗️ Import: Creating', entityCardsData.length, 'entity cards...');

    const { config: modelConf, client: openai } = getModelConfig('micro');

    let cardsGenerated = 0;

    for (const entityData of entityCardsData) {
      try {
        const relatedFactsText = entityData.relatedFacts
          .map(rf => {
            const fact = facts.find(f => f.id === rf.factId);
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
          console.error('❌ Import: No summary generated for', entityData.entityName);
          continue;
        }

        const inputText = JSON.stringify([
          {
            role: 'system',
            content: 'You write concise, informative entity summaries. Keep them factual and useful for both AI and human readers.'
          },
          { role: 'user', content: summaryPrompt }
        ]);
        await trackAIUsage({
          userId: 'admin',
          projectId,
          model: modelConf.name,
          inputText,
          outputText: rawSummary,
          db,
          operation: 'admin-import-entity'
        });

        const summary = processAIResponse(rawSummary, 'micro');
        const summaryTokens = Math.ceil(summary.length / 4);

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
          console.warn('⚠️ Import: Failed to generate embedding for', entityData.entityName, embError.message);
        }

        const cardData = {
          project_id: projectId,
          entity_name: entityData.entityName,
          entity_type: entityData.entityType,
          summary,
          summary_tokens: summaryTokens,
          fact_count: entityData.factCount,
          confidence_score: entityData.confidenceScore,
          embedding,
          last_facts_check: new Date().toISOString()
        };

        const { data: upsertedCard, error: upsertError } = await db
          .from('entity_cards')
          .upsert(cardData, {
            onConflict: 'project_id,entity_name,entity_type',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (upsertError) {
          console.error('❌ Import: Error upserting card for', entityData.entityName, upsertError);
          continue;
        }

        // Clear old entity-fact relationships and insert new ones
        await db
          .from('entity_cards')
          .delete()
          .eq('entity_card_id', upsertedCard.id);

        const factRelationships = entityData.relatedFacts.map(rf => ({
          entity_card_id: upsertedCard.id,
          fact_id: rf.factId,
          relevance_score: rf.relevanceScore
        }));

        if (factRelationships.length > 0) {
          const { error: relationError } = await db
            .from('entity_cards')
            .insert(factRelationships);

          if (relationError) {
            console.error('❌ Import: Error inserting fact relationships:', relationError);
          }
        }

        cardsGenerated++;
        console.log(`✅ Import: Generated entity card for "${entityData.entityName}" (${entityData.entityType})`);

      } catch (error) {
        console.error('❌ Import: Error processing entity', entityData.entityName, ':', error.message);
      }
    }

    console.log('🎉 Import: Entity generation complete!', cardsGenerated, 'cards generated');
    return cardsGenerated;

  } catch (error) {
    console.error('❌ Import: Entity generation error:', error);
    return 0;
  }
}

/**
 * Get a unique branch name for a session by appending numbers if needed
 */
async function getUniqueBranchName(sessionId, desiredName) {
  let uniqueName = desiredName;
  let counter = 2;

  while (true) {
    const { data: existingBranch, error } = await db
      .from('conversation_branches')
      .select('id')
      .eq('session_id', sessionId)
      .eq('branch_name', uniqueName)
      .single();

    if (error && error.code === 'PGRST116') {
      return uniqueName;
    } else if (!error) {
      uniqueName = `${desiredName} (${counter})`;
      counter++;
    } else {
      console.error('Error checking branch name uniqueness:', error);
      return desiredName;
    }
  }
}

/**
 * Convert full Wiskr export format to proper import data structure
 */
function processWiskrExportData(data) {
  if (data.contexts && Array.isArray(data.contexts)) {
    return {
      project: {
        name: data.project.name,
        description: data.project.description,
        user_id: data.project.user_id || ''
      },
      facts: data.contexts.map((ctx, index) => ({
        key: ctx.name || `Context ${index + 1}`,
        value: ctx.content || '',
        type: ctx.type || 'imported',
        tags: ctx.description ? [ctx.description] : [],
        pinned: false
      })),
      docs: [],
      sessions: [],
      branches: [],
      messages: [],
      questions: [],
      personas: [],
      fact_types: []
    };
  }

  if (data.project) {
    return {
      project: {
        name: data.project.name,
        description: data.project.description,
        user_id: data.project.user_id || ''
      },
      facts: data.facts || [],
      docs: data.docs || [],
      sessions: data.sessions || [],
      branches: data.branches || [],
      messages: data.messages || [],
      questions: data.questions || [],
      personas: data.personas || [],
      fact_types: data.fact_types || []
    };
  }

  throw new Error('Unrecognized import format');
}

export const POST = async ({ request, locals }) => {
  try {
    // Check admin permissions
    const adminCheck = await isAdmin(locals.db, locals.user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const targetUserId = formData.get('targetUserId');
    const conflictMode = formData.get('conflictMode'); // 'merge' | 'replace' | 'skip'

    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    if (!targetUserId) {
      return json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Validate target user exists
    const targetUser = await getUserById(targetUserId);
    if (!targetUser) {
      return json({ error: 'Target user not found' }, { status: 404 });
    }

    let rawData;

    try {
      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(arrayBuffer);

        const projectFile = zipContents.file('project.json');
        if (!projectFile) {
          return json({ error: 'ZIP file must contain a project.json file' }, { status: 400 });
        }

        const projectJson = await projectFile.async('string');
        rawData = JSON.parse(projectJson);

      } else if (file.name.endsWith('.json')) {
        const content = await file.text();
        rawData = JSON.parse(content);
      } else {
        return json({ error: 'File must be a JSON or ZIP file' }, { status: 400 });
      }
    } catch (parseError) {
      return json({ error: 'Invalid file format or corrupted data' }, { status: 400 });
    }

    const importData = processWiskrExportData(rawData);

    if (!importData.project || !importData.project.name) {
      return json({ error: 'Invalid project data. Must contain project object with name' }, { status: 400 });
    }

    console.log('Import data summary:', {
      projectName: importData.project.name,
      factsCount: importData.facts?.length || 0,
      docsCount: importData.docs?.length || 0,
      sessionsCount: importData.sessions?.length || 0,
      branchesCount: importData.branches?.length || 0,
      messagesCount: importData.messages?.length || 0,
      questionsCount: importData.questions?.length || 0
    });

    importData.project.user_id = targetUserId;

    // Check for existing project with same name
    const { data: existingProject } = await db
      .from('projects')
      .select('id, name')
      .eq('user_id', targetUserId)
      .eq('name', importData.project.name)
      .single();

    let projectId;

    if (existingProject) {
      switch (conflictMode) {
        case 'skip':
          return json({
            message: 'Project already exists and was skipped',
            skipped: true,
            existingProject: existingProject.name
          });

        case 'replace':
          await db
            .from('cards')
            .delete()
            .eq('project_id', existingProject.id);

          const { error: updateError } = await db
            .from('projects')
            .update({
              description: importData.project.description,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingProject.id);

          if (updateError) {
            return json({ error: 'Failed to update existing project' }, { status: 500 });
          }

          projectId = existingProject.id;
          break;

        case 'merge':
        default:
          projectId = existingProject.id;
          break;
      }
    } else {
      const { data: newProject, error: projectError } = await db
        .from('projects')
        .insert([{
          name: importData.project.name,
          description: importData.project.description,
          user_id: targetUserId,
          icon: '📁',
          color: '#6366f1',
          brief_text: ''
        }])
        .select('id')
        .single();

      if (projectError) {
        console.error('Project creation error:', projectError);
        return json({ error: 'Failed to create project: ' + projectError.message }, { status: 500 });
      }

      if (!newProject) {
        return json({ error: 'Project creation returned no data' }, { status: 500 });
      }

      projectId = newProject.id;
    }

    const importStats = {
      facts: 0,
      docs: 0,
      sessions: 0,
      branches: 0,
      messages: 0,
      questions: 0,
      skipped: 0,
      entityCards: 0
    };

    // Handle replace mode cleanup
    if (conflictMode === 'replace' && existingProject) {
      await Promise.all([
        db.from('facts').delete().eq('project_id', projectId),
        db.from('docs').delete().eq('project_id', projectId),
        db.from('messages').delete().eq('project_id', projectId),
        db.from('conversation_sessions').delete().eq('project_id', projectId),
        db.from('conversation_branches').delete().eq('project_id', projectId),
        db.from('project_questions').delete().eq('project_id', projectId)
      ]);
    }

    // Import Facts
    if (importData.facts && importData.facts.length > 0) {
      const factsToImport = importData.facts
        .filter(fact => fact.key && fact.value)
        .map(fact => {
          const { id, ...factWithoutId } = fact;
          return { ...factWithoutId, project_id: projectId };
        });

      if (factsToImport.length > 0) {
        const { data: insertedFacts, error: factsError } = await db
          .from('cards')
          .insert(factsToImport)
          .select('id');

        if (factsError) {
          console.error('Facts import error:', factsError);
        } else {
          importStats.facts = insertedFacts?.length || 0;
        }
      }
    }

    // Import Docs
    if (importData.docs && importData.docs.length > 0) {
      const docsToImport = importData.docs
        .filter(doc => doc.title && doc.content)
        .map(doc => {
          const { id, ...docWithoutId } = doc;
          return { ...docWithoutId, project_id: projectId };
        });

      if (docsToImport.length > 0) {
        const { data: insertedDocs, error: docsError } = await db
          .from('docs')
          .insert(docsToImport)
          .select('id');

        if (docsError) {
          console.error('Docs import error:', docsError);
        } else {
          importStats.docs = insertedDocs?.length || 0;
        }
      }
    }

    // Import Conversation Sessions
    const sessionIdMap = new Map();
    console.log('Sessions data check:', {
      hasSessions: !!(importData.sessions && importData.sessions.length > 0),
      sessionCount: importData.sessions?.length || 0,
      firstSession: importData.sessions?.[0] || null
    });

    if (importData.sessions && importData.sessions.length > 0) {
      for (const session of importData.sessions) {
        console.log('Processing session:', session);

        const sessionName = session.session_name || session.name || 'Imported Session';
        const sessionData = { project_id: projectId, session_name: sessionName };

        if (session.created_at) {
          sessionData.created_at = session.created_at;
        }

        console.log('Session data to insert:', sessionData);

        const { data: newSession, error: sessionError } = await db
          .from('conversation_sessions')
          .insert([sessionData])
          .select('id')
          .single();

        if (sessionError) {
          console.error('Session import error:', sessionError);
        } else {
          console.log('Session imported successfully:', newSession);
          sessionIdMap.set(session.id, newSession.id);
          importStats.sessions++;

          const { error: ensureBranchError } = await db
            .from('conversation_branches')
            .upsert({
              project_id: projectId,
              session_id: newSession.id,
              branch_id: 'main',
              branch_name: 'Main Branch',
              color_index: 0
            }, { onConflict: 'session_id,branch_id' });

          if (ensureBranchError) {
            console.log('Note: Main branch already exists or couldn\'t be created:', ensureBranchError);
          }
        }
      }
    }

    // Import Conversation Branches
    const branchIdMap = new Map();
    console.log('Branches data check:', {
      hasBranches: !!(importData.branches && importData.branches.length > 0),
      branchCount: importData.branches?.length || 0,
      sessionIdMapSize: sessionIdMap.size
    });

    if (importData.branches && importData.branches.length > 0) {
      for (const branch of importData.branches) {
        const newSessionId = sessionIdMap.get(branch.session_id);
        if (!newSessionId) {
          console.log('Skipping branch - session not found:', branch.session_id);
          continue;
        }

        const { id, branch_id, ...branchWithoutId } = branch;
        const originalBranchId = branch.branch_id || branch.id;
        const branchName = branch.branch_name || branch.name;
        let newBranchId;

        if (originalBranchId === 'main' || branchName?.toLowerCase().includes('main')) {
          newBranchId = 'main';
        } else {
          newBranchId = crypto.randomUUID();
        }

        const { data: existingBranch } = await db
          .from('conversation_branches')
          .select('id, branch_id')
          .eq('session_id', newSessionId)
          .eq('branch_id', newBranchId)
          .single();

        if (existingBranch) {
          console.log('Branch already exists, skipping:', { sessionId: newSessionId, branchId: newBranchId });
          branchIdMap.set(branch.id, newBranchId);
          continue;
        }

        const branchData = {
          branch_id: newBranchId,
          project_id: projectId,
          session_id: newSessionId,
          ...branchWithoutId
        };

        delete branchData.id;
        if (branch.name && !branchData.branch_name) {
          branchData.branch_name = branch.name;
        }
        delete branchData.parent_message_id;

        const { data: newBranch, error: branchError } = await db
          .from('conversation_branches')
          .insert([branchData])
          .select('id')
          .single();

        if (branchError) {
          console.error('Branch import error:', branchError);
        } else {
          branchIdMap.set(branch.id, newBranchId);

          if (branchName) {
            branchIdMap.set(branchName, newBranchId);
            branchIdMap.set(branchName.toLowerCase(), newBranchId);
            branchIdMap.set(branchName.toUpperCase(), newBranchId);
            if (branchName.toLowerCase().includes('main')) {
              branchIdMap.set('main', newBranchId);
              branchIdMap.set('Main', newBranchId);
              branchIdMap.set('MAIN', newBranchId);
            }
          }

          importStats.branches++;
        }
      }
    }

    // Import Messages
    if (importData.messages && importData.messages.length > 0) {
      const messagesToImport = [];
      let skippedMessages = 0;

      for (const message of importData.messages) {
        const newSessionId = sessionIdMap.get(message.session_id);
        let newBranchId = branchIdMap.get(message.branch_id);

        if (!newSessionId) {
          skippedMessages++;
          continue;
        }

        if (!newBranchId && message.branch_id) {
          console.log('🔧 Creating missing branch for message:', message.branch_id);

          const branchIdToUse = (message.branch_id === 'main' || !message.branch_id) ? 'main' : message.branch_id;
          let branchNameToUse = branchIdToUse === 'main' ? 'Main Branch' : `Branch ${branchIdToUse}`;

          if (importData.branches && importData.branches.length > 0) {
            const originalBranch = importData.branches.find(b =>
              b.branch_id === message.branch_id ||
              b.id === message.branch_id ||
              (b.branch_name && b.branch_name.toLowerCase().includes('location'))
            );
            if (originalBranch) {
              branchNameToUse = originalBranch.branch_name || originalBranch.name || branchNameToUse;
            }
          }

          if (message.branch_name && message.branch_name !== branchIdToUse) {
            branchNameToUse = message.branch_name;
          }

          const { data: existingBranch } = await db
            .from('conversation_branches')
            .select('id, branch_id')
            .eq('session_id', newSessionId)
            .eq('branch_id', branchIdToUse)
            .single();

          if (existingBranch) {
            branchIdMap.set(message.branch_id, branchIdToUse);
            newBranchId = branchIdToUse;
          } else {
            const uniqueBranchName = await getUniqueBranchName(newSessionId, branchNameToUse);

            const { data: createdBranch, error: createBranchError } = await db
              .from('conversation_branches')
              .insert({
                project_id: projectId,
                session_id: newSessionId,
                branch_id: branchIdToUse,
                branch_name: uniqueBranchName,
                color_index: 0
              })
              .select('id')
              .single();

            if (createBranchError) {
              console.error('Failed to create missing branch:', createBranchError);
              skippedMessages++;
              continue;
            }

            branchIdMap.set(message.branch_id, branchIdToUse);
            newBranchId = branchIdToUse;
          }
        }

        if (!newBranchId) {
          skippedMessages++;
          continue;
        }

        const { id, metadata, ...messageWithoutId } = message;
        messagesToImport.push({
          ...messageWithoutId,
          project_id: projectId,
          session_id: newSessionId,
          branch_id: newBranchId
        });
      }

      console.log('Messages summary:', {
        totalMessages: importData.messages.length,
        toImport: messagesToImport.length,
        skipped: skippedMessages
      });

      if (messagesToImport.length > 0) {
        const { data: insertedMessages, error: messagesError } = await db
          .from('messages')
          .insert(messagesToImport)
          .select('id');

        if (messagesError) {
          console.error('Messages import error:', messagesError);
        } else {
          importStats.messages = insertedMessages?.length || 0;
        }
      }
    }

    // Import Questions
    if (importData.questions && importData.questions.length > 0) {
      const questionsToImport = importData.questions
        .filter(q => !!(q.question_text || q.content || q.question))
        .map(question => {
          const mapped = {
            question: question.question_text || question.content || question.question,
            project_id: projectId,
            created_at: question.created_at
          };
          if (question.sort_order !== undefined) {
            mapped.sort_order = question.sort_order;
          }
          return mapped;
        });

      if (questionsToImport.length > 0) {
        const { data: insertedQuestions, error: questionsError } = await db
          .from('project_questions')
          .insert(questionsToImport)
          .select('id');

        if (questionsError) {
          console.error('Questions import error:', questionsError);
        } else {
          importStats.questions = insertedQuestions?.length || 0;
        }
      }
    }

    // Generate entity cards after import (if facts were imported)
    if (importStats.facts > 0) {
      console.log('🎯 Import: Starting entity card generation...');
      try {
        importStats.entityCards = await generateEntityCards(projectId);
      } catch (entityError) {
        console.error('⚠️ Import: Entity generation failed, but continuing:', entityError.message);
      }
    }

    return json({
      success: true,
      message: 'Project imported successfully',
      projectId,
      projectName: importData.project.name,
      isNewProject: !existingProject,
      importStats
    });

  } catch (error) {
    console.error('Import error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
