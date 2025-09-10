import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { isAdmin } from '$lib/auth/admin';
import JSZip from 'jszip';
import { detectEntities, mapEntitiesToCards } from '$lib/server/services/entityDetection.js';
import { getModelConfig } from '$lib/server/openrouter.js';
import { processAIResponse } from '$lib/server/responseProcessor.js';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Generate entity cards for a project after import
 * @param {string} projectId - The project ID to generate cards for
 * @returns {Promise<number>} - Number of entity cards generated
 */
async function generateEntityCards(projectId: string): Promise<number> {
  try {
    console.log('🎯 Import: Starting entity card generation for project:', projectId);

    // Get all facts for this project
    const { data: facts, error: factsError } = await supabaseAdmin
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

    // Detect entities from facts
    const detectedEntities = await detectEntities(facts);
    
    if (detectedEntities.length === 0) {
      console.log('⚠️ Import: No entities detected');
      return 0;
    }

    // Map entities to facts
    const entityCardsData = mapEntitiesToCards(detectedEntities, facts, projectId);

    console.log('🏗️ Import: Creating', entityCardsData.length, 'entity cards...');

    // Get model config for summary generation
    const { config: modelConf, client: openai } = getModelConfig('micro'); // Use cheap model

    let cardsGenerated = 0;

    // Process each entity
    for (const entityData of entityCardsData) {
      try {
        // Generate summary for this entity
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
          console.warn('⚠️ Import: Failed to generate embedding for', entityData.entityName, embError.message);
        }

        // Upsert entity card
        const cardData = {
          project_id: projectId,
          entity_name: entityData.entityName,
          entity_type: entityData.entityType,
          summary: summary,
          summary_tokens: summaryTokens,
          fact_count: entityData.factCount,
          confidence_score: entityData.confidenceScore,
          embedding: embedding,
          last_facts_check: new Date().toISOString()
        };

        const { data: upsertedCard, error: upsertError } = await supabaseAdmin
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
        await supabaseAdmin
          .from('entity_cards')
          .delete()
          .eq('entity_card_id', upsertedCard.id);

        const factRelationships = entityData.relatedFacts.map(rf => ({
          entity_card_id: upsertedCard.id,
          fact_id: rf.factId,
          relevance_score: rf.relevanceScore
        }));

        if (factRelationships.length > 0) {
          const { error: relationError } = await supabaseAdmin
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
async function getUniqueBranchName(sessionId: string, desiredName: string): Promise<string> {
  let uniqueName = desiredName;
  let counter = 2;
  
  while (true) {
    // Check if this name already exists in the session
    const { data: existingBranch, error } = await supabaseAdmin
      .from('conversation_branches')
      .select('id')
      .eq('session_id', sessionId)
      .eq('branch_name', uniqueName)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // No matching record found - name is unique
      return uniqueName;
    } else if (!error) {
      // Branch name already exists - try next number
      uniqueName = `${desiredName} (${counter})`;
      counter++;
    } else {
      // Some other error - log and return original name
      console.error('Error checking branch name uniqueness:', error);
      return desiredName;
    }
  }
}

/**
 * Convert full Wiskr export format to proper import data structure
 */
function processWiskrExportData(data: any): WiskrImportData {
  // If it's already in simple format with contexts, convert to new format
  if (data.contexts && Array.isArray(data.contexts)) {
    return {
      project: {
        name: data.project.name,
        description: data.project.description,
        user_id: data.project.user_id || ''
      },
      facts: data.contexts.map((ctx: any, index: number) => ({
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

  // If it's a full Wiskr export, process each data type properly
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

  // If we can't recognize the format, throw an error
  throw new Error('Unrecognized import format');
}

interface ProjectImportData {
  project: {
    name: string;
    description?: string;
    user_id: string;
  };
  contexts: Array<{
    name: string;
    description?: string;
    content: string;
    type?: string;
  }>;
}

// Full Wiskr import data structure
interface WiskrImportData {
  project: {
    name: string;
    description?: string;
    user_id: string;
  };
  facts: Array<any>;
  docs: Array<any>;
  sessions: Array<any>;
  branches: Array<any>;
  messages: Array<any>;
  questions: Array<any>;
  personas: Array<any>;
  fact_types: Array<any>;
}

// Full Wiskr export format
interface WiskrExportData {
  meta?: any;
  project: {
    name: string;
    description?: string;
    [key: string]: any;
  };
  sessions?: Array<any>;
  branches?: Array<any>;
  messages?: Array<any>;
  facts?: Array<any>;
  docs?: Array<any>;
  questions?: Array<any>;
  personas?: Array<any>;
  fact_types?: Array<any>;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check admin permissions
    const adminCheck = await isAdmin(locals.supabase, locals.user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const targetUserId = formData.get('targetUserId') as string;
    const conflictMode = formData.get('conflictMode') as string; // 'merge' | 'replace' | 'skip'
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    if (!targetUserId) {
      return json({ error: 'Target user ID is required' }, { status: 400 });
    }

    // Validate target user exists
    const { data: targetUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(targetUserId);

    if (userError || !targetUser) {
      return json({ error: 'Target user not found' }, { status: 404 });
    }

    let rawData: any;

    try {
      if (file.name.endsWith('.zip')) {
        // Handle ZIP file import
        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(arrayBuffer);
        
        // Look for project.json in the ZIP
        const projectFile = zipContents.file('project.json');
        if (!projectFile) {
          return json({ error: 'ZIP file must contain a project.json file' }, { status: 400 });
        }
        
        const projectJson = await projectFile.async('string');
        rawData = JSON.parse(projectJson);
        
      } else if (file.name.endsWith('.json')) {
        // Handle JSON file import
        const content = await file.text();
        rawData = JSON.parse(content);
      } else {
        return json({ error: 'File must be a JSON or ZIP file' }, { status: 400 });
      }
    } catch (parseError) {
      return json({ error: 'Invalid file format or corrupted data' }, { status: 400 });
    }

    // Process the import data
    const importData = processWiskrExportData(rawData);

    // Validate import data structure
    if (!importData.project || !importData.project.name) {
      return json({ 
        error: 'Invalid project data. Must contain project object with name' 
      }, { status: 400 });
    }

    // Log what we're importing for debugging
    console.log('Import data summary:', {
      projectName: importData.project.name,
      factsCount: importData.facts?.length || 0,
      docsCount: importData.docs?.length || 0,
      sessionsCount: importData.sessions?.length || 0,
      branchesCount: importData.branches?.length || 0,
      messagesCount: importData.messages?.length || 0,
      questionsCount: importData.questions?.length || 0
    });

    // Override user_id with target user
    importData.project.user_id = targetUserId;

    // Check for existing project with same name
    const { data: existingProject } = await supabaseAdmin
      .from('projects')
      .select('id, name')
      .eq('user_id', targetUserId)
      .eq('name', importData.project.name)
      .single();

    let projectId: string;

    if (existingProject) {
      switch (conflictMode) {
        case 'skip':
          return json({ 
            message: 'Project already exists and was skipped',
            skipped: true,
            existingProject: existingProject.name
          });
        
        case 'replace':
          // Delete existing facts
          await supabaseAdmin
            .from('cards')
            .delete()
            .eq('project_id', existingProject.id);
          
          // Update project
          const { error: updateError } = await supabaseAdmin
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
          // Will merge contexts below
          break;
      }
    } else {
      // Create new project using service role but with proper user context
      // We need to temporarily impersonate the user for RLS to work correctly
      const { data: newProject, error: projectError } = await supabaseAdmin
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

    // Initialize import statistics
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
      // Delete existing data
      await Promise.all([
        supabaseAdmin.from('facts').delete().eq('project_id', projectId),
        supabaseAdmin.from('docs').delete().eq('project_id', projectId),
        supabaseAdmin.from('messages').delete().eq('project_id', projectId),
        supabaseAdmin.from('conversation_sessions').delete().eq('project_id', projectId),
        supabaseAdmin.from('conversation_branches').delete().eq('project_id', projectId),
        supabaseAdmin.from('project_questions').delete().eq('project_id', projectId)
      ]);
    }

    // Import Facts
    if (importData.facts && importData.facts.length > 0) {
      const factsToImport = importData.facts
        .filter((fact: any) => fact.key && fact.value)
        .map((fact: any) => {
          const { id, ...factWithoutId } = fact;
          return {
            ...factWithoutId,
            project_id: projectId
          };
        });

      if (factsToImport.length > 0) {
        const { data: insertedFacts, error: factsError } = await supabaseAdmin
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
        .filter((doc: any) => doc.title && doc.content)
        .map((doc: any) => {
          const { id, ...docWithoutId } = doc;
          return {
            ...docWithoutId,
            project_id: projectId
          };
        });

      if (docsToImport.length > 0) {
        const { data: insertedDocs, error: docsError } = await supabaseAdmin
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
    let sessionIdMap = new Map(); // Map old session IDs to new ones
    console.log('Sessions data check:', {
      hasSessions: !!(importData.sessions && importData.sessions.length > 0),
      sessionCount: importData.sessions?.length || 0,
      firstSession: importData.sessions?.[0] || null
    });
    
    if (importData.sessions && importData.sessions.length > 0) {
      for (const session of importData.sessions) {
        console.log('Processing session:', session);
        
        // Include required fields based on the actual schema
        const sessionName = session.session_name || session.name || 'Imported Session';
        const sessionData: any = {
          project_id: projectId,
          session_name: sessionName
        };
        
        console.log('Session name extraction:', {
          originalSession: session,
          extractedName: sessionName
        });
        
        // Add created_at if it exists
        if (session.created_at) {
          sessionData.created_at = session.created_at;
        }
        
        console.log('Session data to insert:', sessionData);
        
        const { data: newSession, error: sessionError } = await supabaseAdmin
          .from('conversation_sessions')
          .insert([sessionData])
          .select('id')
          .single();

        if (sessionError) {
          console.error('Session import error:', sessionError);
          console.log('Attempted session data:', sessionData);
        } else {
          console.log('Session imported successfully:', newSession);
          sessionIdMap.set(session.id, newSession.id);
          importStats.sessions++;
          
          // Ensure main branch exists for this session (fallback safety)
          const { error: ensureBranchError } = await supabaseAdmin
            .from('conversation_branches')
            .upsert({
              project_id: projectId,
              session_id: newSession.id,
              branch_id: 'main',
              branch_name: 'Main Branch',
              color_index: 0
            }, {
              onConflict: 'session_id,branch_id'
            });
          
          if (ensureBranchError) {
            console.log('Note: Main branch already exists or couldn\'t be created:', ensureBranchError);
          } else {
            console.log('Ensured main branch exists for session:', newSession.id);
          }
        }
      }
    }

    // Import Conversation Branches
    let branchIdMap = new Map(); // Map old branch IDs to new ones
    console.log('Branches data check:', {
      hasBranches: !!(importData.branches && importData.branches.length > 0),
      branchCount: importData.branches?.length || 0,
      firstBranch: importData.branches?.[0] || null,
      sessionIdMapSize: sessionIdMap.size
    });
    
    if (importData.branches && importData.branches.length > 0) {
      for (const branch of importData.branches) {
        console.log('Processing branch:', branch);
        const newSessionId = sessionIdMap.get(branch.session_id);
        console.log('Branch session mapping:', { oldSessionId: branch.session_id, newSessionId });
        
        if (!newSessionId) {
          console.log('Skipping branch - session not found:', branch.session_id);
          continue; // Skip if session wasn't imported
        }

        // Create branch data with new UUID for branch_id
        const { id, branch_id, ...branchWithoutId } = branch;
        
        // Preserve 'main' branch ID, generate UUID for others
        const originalBranchId = branch.branch_id || branch.id;
        const branchName = branch.branch_name || branch.name;
        let newBranchId;
        
        // If this is the main branch, use 'main' as the ID
        if (originalBranchId === 'main' || branchName?.toLowerCase().includes('main')) {
          newBranchId = 'main';
        } else {
          newBranchId = crypto.randomUUID();
        }
        
        // Check if this branch already exists for this session
        const { data: existingBranch } = await supabaseAdmin
          .from('conversation_branches')
          .select('id, branch_id')
          .eq('session_id', newSessionId)
          .eq('branch_id', newBranchId)
          .single();
        
        if (existingBranch) {
          console.log('Branch already exists, skipping:', { sessionId: newSessionId, branchId: newBranchId });
          // Still map the branch ID for message import
          branchIdMap.set(branch.id, newBranchId);
          continue;
        }
        
        const branchData: any = {
          branch_id: newBranchId,
          project_id: projectId,
          session_id: newSessionId,
          ...branchWithoutId
        };
        
        // Remove the original ID that shouldn't be imported
        delete branchData.id;
        
        // Handle branch name field mapping
        if (branch.name && !branchData.branch_name) {
          branchData.branch_name = branch.name;
        }
        
        // Remove parent_message_id for now since messages aren't imported yet
        delete branchData.parent_message_id;
        
        console.log('Branch data to insert:', branchData);

        const { data: newBranch, error: branchError } = await supabaseAdmin
          .from('conversation_branches')
          .insert([branchData])
          .select('id')
          .single();

        if (branchError) {
          console.error('Branch import error:', branchError);
          console.log('Failed branch data:', branchData);
        } else {
          console.log('Branch imported successfully:', newBranch);
          // Map both the original branch ID and branch_name to the new generated branch_id
          branchIdMap.set(branch.id, newBranchId);
          
          // Also map by branch_name for messages that use string branch identifiers
          const branchName = branch.branch_name || branch.name;
          if (branchName) {
            branchIdMap.set(branchName, newBranchId);
            // Add case-insensitive variations
            branchIdMap.set(branchName.toLowerCase(), newBranchId);
            branchIdMap.set(branchName.toUpperCase(), newBranchId);
            
            // Add common variations for "Main Branch"
            if (branchName.toLowerCase().includes('main')) {
              branchIdMap.set('main', newBranchId);
              branchIdMap.set('Main', newBranchId);
              branchIdMap.set('MAIN', newBranchId);
            }
          }
          
          console.log('Branch mappings created:', {
            byId: branch.id + ' -> ' + newBranchId,
            byName: branchName + ' -> ' + newBranchId,
            variations: branchName ? [branchName.toLowerCase(), branchName.toUpperCase(), 'main'] : []
          });
          importStats.branches++;
        }
      }
    }

    // Import Messages
    console.log('Messages data check:', {
      hasMessages: !!(importData.messages && importData.messages.length > 0),
      messageCount: importData.messages?.length || 0,
      firstMessage: importData.messages?.[0] || null,
      branchIdMapSize: branchIdMap.size
    });
    
    if (importData.messages && importData.messages.length > 0) {
      const messagesToImport = [];
      let skippedMessages = 0;
      let createdBranches = 0;
      
      for (const message of importData.messages) {
        console.log('Processing message:', message);
        const newSessionId = sessionIdMap.get(message.session_id);
        let newBranchId = branchIdMap.get(message.branch_id);
        
        console.log('Message mapping:', {
          oldSessionId: message.session_id,
          oldBranchId: message.branch_id,
          newSessionId,
          newBranchId
        });
        
        if (!newSessionId) {
          console.log('Skipping message - missing session:', {
            hasSession: !!newSessionId,
            sessionId: message.session_id
          });
          skippedMessages++;
          continue; // Skip if session wasn't imported
        }
        
        // If branch doesn't exist, create it as a fallback
        if (!newBranchId && message.branch_id) {
          console.log('🔧 Creating missing branch for message:', message.branch_id);
          
          // Determine the branch ID to use
          const branchIdToUse = (message.branch_id === 'main' || !message.branch_id) ? 'main' : message.branch_id;
          
          // Try to find the original branch name from the export data
          let branchNameToUse = branchIdToUse === 'main' ? 'Main Branch' : `Branch ${branchIdToUse}`;
          
          // Look for the branch name in the original branches data
          if (importData.branches && importData.branches.length > 0) {
            const originalBranch = importData.branches.find(b => 
              b.branch_id === message.branch_id || 
              b.id === message.branch_id ||
              (b.branch_name && b.branch_name.toLowerCase().includes('location'))
            );
            if (originalBranch) {
              branchNameToUse = originalBranch.branch_name || originalBranch.name || branchNameToUse;
              console.log('✅ Found original branch name:', branchNameToUse);
            }
          }
          
          // Also check if the message itself has a branch_name field
          if (message.branch_name && message.branch_name !== branchIdToUse) {
            branchNameToUse = message.branch_name;
            console.log('✅ Using branch name from message:', branchNameToUse);
          }
          
          console.log('🏷️ Branch naming:', {
            branchId: branchIdToUse,
            branchName: branchNameToUse,
            foundInExport: !!importData.branches?.find(b => b.branch_id === message.branch_id),
            messageHasBranchName: !!message.branch_name
          });
          
          // First check if the branch already exists (this handles the main branch case)
          const { data: existingBranch, error: checkError } = await supabaseAdmin
            .from('conversation_branches')
            .select('id, branch_id')
            .eq('session_id', newSessionId)
            .eq('branch_id', branchIdToUse)
            .single();
          
          if (existingBranch) {
            console.log('✅ Found existing branch, adding to mapping:', branchIdToUse);
            // Add to branch mapping
            branchIdMap.set(message.branch_id, branchIdToUse);
            newBranchId = branchIdToUse;
          } else {
            // Ensure unique branch name within the session
            const uniqueBranchName = await getUniqueBranchName(newSessionId, branchNameToUse);
            console.log('🏷️ Unique branch name:', { original: branchNameToUse, unique: uniqueBranchName });
            
            // Create the missing branch
            const { data: createdBranch, error: createBranchError } = await supabaseAdmin
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
              console.log('Skipping message - could not create branch');
              skippedMessages++;
              continue;
            }
            
            console.log('✅ Created missing branch:', branchIdToUse);
            
            // Add to branch mapping
            branchIdMap.set(message.branch_id, branchIdToUse);
            newBranchId = branchIdToUse;
            createdBranches++;
          }
        }
        
        if (!newBranchId) {
          console.log('Skipping message - still no branch after fallback creation');
          skippedMessages++;
          continue;
        }
        
        // Create message data without metadata (not supported by table)
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
        console.log('Sample message to import:', messagesToImport[0]);
        
        const { data: insertedMessages, error: messagesError } = await supabaseAdmin
          .from('messages')
          .insert(messagesToImport)
          .select('id');

        if (messagesError) {
          console.error('Messages import error:', messagesError);
          console.log('Failed messages sample:', messagesToImport.slice(0, 2));
        } else {
          console.log('Messages imported successfully:', insertedMessages?.length);
          importStats.messages = insertedMessages?.length || 0;
        }
      }
    }

    // Import Questions
    console.log('Questions data check:', {
      hasQuestions: !!(importData.questions && importData.questions.length > 0),
      questionCount: importData.questions?.length || 0,
      firstQuestion: importData.questions?.[0] || null
    });
    
    if (importData.questions && importData.questions.length > 0) {
      console.log('Processing questions:', importData.questions);
      
      const questionsToImport = importData.questions
        .filter((q: any) => {
          const hasContent = !!(q.question_text || q.content || q.question);
          console.log('Question filter check:', { question: q, hasContent });
          return hasContent;
        })
        .map((question: any) => {
          const mappedQuestion = {
            question: question.question_text || question.content || question.question,
            project_id: projectId,
            created_at: question.created_at
          };
          
          // Add sort_order if it exists, otherwise default to 0
          if (question.sort_order !== undefined) {
            mappedQuestion.sort_order = question.sort_order;
          }
          
          console.log('Mapped question:', mappedQuestion);
          return mappedQuestion;
        });

      console.log('Questions to import:', questionsToImport);

      if (questionsToImport.length > 0) {
        const { data: insertedQuestions, error: questionsError } = await supabaseAdmin
          .from('project_questions')
          .insert(questionsToImport)
          .select('id');

        if (questionsError) {
          console.error('Questions import error:', questionsError);
          console.log('Failed questions data:', questionsToImport);
        } else {
          console.log('Questions imported successfully:', insertedQuestions);
          importStats.questions = insertedQuestions?.length || 0;
        }
      }
    }

    // Generate entity cards after import (if facts were imported)
    if (importStats.facts > 0) {
      console.log('🎯 Import: Starting entity card generation...');
      try {
        const entityCardsGenerated = await generateEntityCards(projectId);
        importStats.entityCards = entityCardsGenerated;
        console.log('✅ Import: Entity card generation complete:', entityCardsGenerated, 'cards generated');
      } catch (entityError) {
        console.error('⚠️ Import: Entity generation failed, but continuing:', entityError.message);
        // Don't fail the entire import if entity generation fails
      }
    } else {
      console.log('⚠️ Import: Skipping entity generation - no facts imported');
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
