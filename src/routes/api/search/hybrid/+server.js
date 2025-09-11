import { json } from '@sveltejs/kit';
import { hybridSearch } from '$lib/server/utils/hybridSearch.js';

export async function POST({ request, locals }) {
  try {
    const { 
      query, 
      projectId, 
      limit = 20,
      denseWeight = 0.4,
      sparseWeight = 0.3,
      graphWeight = 0.3,
      includeCards = true,
      includeDecks = true,
      includeSections = true,
      includeWorld = true,
      relationshipTypes = ['supports', 'example-of', 'evolves']
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

    // Perform hybrid search
    const searchResults = await hybridSearch(query, projectId, {
      limit,
      denseWeight,
      sparseWeight,
      graphWeight,
      includeCards,
      includeDecks,
      includeSections,
      includeWorld,
      relationshipTypes
    });

    return json(searchResults);

  } catch (error) {
    console.error('Error in hybrid search API:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
}

export async function GET({ url, locals }) {
  try {
    const query = url.searchParams.get('q');
    const projectId = url.searchParams.get('projectId');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const denseWeight = parseFloat(url.searchParams.get('denseWeight') || '0.4');
    const sparseWeight = parseFloat(url.searchParams.get('sparseWeight') || '0.3');
    const graphWeight = parseFloat(url.searchParams.get('graphWeight') || '0.3');

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

    // Perform hybrid search
    const searchResults = await hybridSearch(query, projectId, {
      limit,
      denseWeight,
      sparseWeight,
      graphWeight
    });

    return json(searchResults);

  } catch (error) {
    console.error('Error in hybrid search API:', error);
    return json({ error: 'Search failed' }, { status: 500 });
  }
}
