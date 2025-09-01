import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
  const { id: projectId } = params;

  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Check authentication
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = locals.supabase;
    const { data: factTypes, error } = await supabase
      .from('project_fact_types')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order');

    if (error) {
      console.error('Error fetching fact types:', error);
      return json({ error: 'Failed to fetch fact types' }, { status: 500 });
    }

    return json({ factTypes });
  } catch (error) {
    console.error('Error in fact-types GET:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT({ params, request, locals }) {
  const { id: projectId } = params;
  
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Check authentication
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { factTypes } = await request.json();

    if (!Array.isArray(factTypes)) {
      return json({ error: 'factTypes must be an array' }, { status: 400 });
    }

    const supabase = locals.supabase;
    
    // Use upsert to handle both updates and new inserts
    const { data: upsertData, error: upsertError } = await supabase
      .from('project_fact_types')
      .upsert(
        factTypes.map(factType => ({
          project_id: projectId,
          type_key: factType.type_key,
          display_name: factType.display_name,
          color_class: factType.color_class,
          sort_order: factType.sort_order,
          is_active: factType.is_active ?? true
        })),
        { 
          onConflict: 'project_id,type_key',
          ignoreDuplicates: false 
        }
      )
      .select();

    if (upsertError) {
      console.error('Error upserting fact types:', upsertError);
      return json({ error: 'Failed to save fact types' }, { status: 500 });
    }

    // Fetch the updated fact types to return them
    const { data: updatedFactTypes, error: fetchError } = await supabase
      .from('project_fact_types')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_active', true)
      .order('sort_order');

    if (fetchError) {
      console.error('Error fetching updated fact types:', fetchError);
      return json({ error: 'Failed to fetch updated fact types' }, { status: 500 });
    }

    return json({ factTypes: updatedFactTypes });
  } catch (error) {
    console.error('Error in fact-types PUT:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST({ params, request, locals }) {
  const { id: projectId } = params;
  
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Check authentication
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type_key, display_name, color_class, sort_order = 0 } = await request.json();

    if (!type_key || !display_name) {
      return json({ error: 'type_key and display_name are required' }, { status: 400 });
    }

    const supabase = locals.supabase;
    const { data, error } = await supabase
      .from('project_fact_types')
      .insert({
        project_id: projectId,
        type_key,
        display_name,
        color_class: color_class || 'bg-gray-100 text-gray-700',
        sort_order,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating fact type:', error);
      return json({ error: 'Failed to create fact type' }, { status: 500 });
    }

    return json({ factType: data });
  } catch (error) {
    console.error('Error in fact-types POST:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
