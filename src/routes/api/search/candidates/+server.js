import { json } from '@sveltejs/kit';
import { generateCandidates } from '$lib/server/utils/candidateGeneration.js';

export async function POST({ request, locals }) {
  try {
    const { 
      query, 
      projectId, 
      topK = 50,
      finalLimit = 10,
      denseWeight = 0.4,
      sparseWeight = 0.3,
      graphWeight = 0.3,
      mmrLambda = 0.7,
      includeCards = true,
      includeDecks = true,
      includeSections = true,
      relationshipTypes = ['supports', 'evolves', 'example-of'],
      boostSameDeck = 0.2,
      boostSameSection = 0.3,
      boostRelationships = 0.15,
      boostRecent = 0.1,
      boostProgress = 0.05,
      boostRarity = 0.1
    } = await request.json();

    if (!query || !projectId) {
      return json({ error: 'query and projectId are required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await locals.supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Generate candidates
    const candidates = await generateCandidates(query, projectId, {
      topK,
      finalLimit,
      denseWeight,
      sparseWeight,
      graphWeight,
      mmrLambda,
      includeCards,
      includeDecks,
      includeSections,
      relationshipTypes,
      boostSameDeck,
      boostSameSection,
      boostRelationships,
      boostRecent,
      boostProgress,
      boostRarity
    });

    return json(candidates);

  } catch (error) {
    console.error('Error in candidate generation API:', error);
    return json({ error: 'Candidate generation failed' }, { status: 500 });
  }
}

export async function GET({ url, locals }) {
  try {
    const query = url.searchParams.get('q');
    const projectId = url.searchParams.get('projectId');
    const topK = parseInt(url.searchParams.get('topK') || '50');
    const finalLimit = parseInt(url.searchParams.get('limit') || '10');
    const mmrLambda = parseFloat(url.searchParams.get('mmrLambda') || '0.7');

    if (!query || !projectId) {
      return json({ error: 'q and projectId parameters are required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: userError } = await locals.supabase.auth.getUser();
    if (userError || !user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user has access to the project
    const { data: project, error: projectError } = await locals.supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 403 });
    }

    // Generate candidates
    const candidates = await generateCandidates(query, projectId, {
      topK,
      finalLimit,
      mmrLambda
    });

    return json(candidates);

  } catch (error) {
    console.error('Error in candidate generation API:', error);
    return json({ error: 'Candidate generation failed' }, { status: 500 });
  }
}
