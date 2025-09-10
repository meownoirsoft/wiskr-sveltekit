import { json } from '@sveltejs/kit';

export async function GET({ params, locals }) {
  const { id: projectId } = params;

  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Check authentication securely
    const { data, error: authError } = await locals.supabase.auth.getUser();
    if (authError) {
      console.error('Auth error in card-types GET:', authError);
      return json({ error: 'Authentication failed' }, { status: 401 });
    }
    if (!data.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = locals.supabase;
    // Fetch the card types for the project
    const { data: cardTypes, error: typesError } = await supabase
      .from('project_card_types')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order');

    if (typesError) {
      console.error('Error fetching card types:', typesError);
      return json({ error: 'Failed to fetch card types' }, { status: 500 });
    }

    return json({ cardTypes });
  } catch (error) {
    console.error('Error in card-types GET:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT({ params, request, locals }) {
  const { id: projectId } = params;
  
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Check authentication securely
    const { data, error: authError } = await locals.supabase.auth.getUser();
    if (authError) {
      console.error('Auth error in card-types PUT:', authError);
      return json({ error: 'Authentication failed' }, { status: 401 });
    }
    if (!data.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cardTypes } = await request.json();

    if (!Array.isArray(cardTypes)) {
      return json({ error: 'cardTypes must be an array' }, { status: 400 });
    }

    const supabase = locals.supabase;
    
    // Use upsert to handle both updates and new inserts
    const { data: upsertData, error: upsertError } = await supabase
      .from('project_card_types')
      .upsert(
        cardTypes.map(cardType => ({
          project_id: projectId,
          type_key: cardType.type_key,
          display_name: cardType.display_name,
          color_class: cardType.color_class,
          sort_order: cardType.sort_order
        })),
        { 
          onConflict: 'project_id,type_key',
          ignoreDuplicates: false 
        }
      )
      .select();

    if (upsertError) {
      console.error('Error upserting card types:', upsertError);
      return json({ error: 'Failed to save card types' }, { status: 500 });
    }

    // Fetch the updated card types to return them
    const { data: updatedCardTypes, error: fetchError } = await supabase
      .from('project_card_types')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order');

    if (fetchError) {
      console.error('Error fetching updated card types:', fetchError);
      return json({ error: 'Failed to fetch updated card types' }, { status: 500 });
    }

    return json({ cardTypes: updatedCardTypes });
  } catch (error) {
    console.error('Error in card-types PUT:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST({ params, request, locals }) {
  const { id: projectId } = params;
  
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    // Check authentication securely
    const { data, error: authError } = await locals.supabase.auth.getUser();
    if (authError) {
      console.error('Auth error in card-types POST:', authError);
      return json({ error: 'Authentication failed' }, { status: 401 });
    }
    if (!data.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type_key, display_name, color_class, sort_order = 0 } = await request.json();

    if (!type_key || !display_name) {
      return json({ error: 'type_key and display_name are required' }, { status: 400 });
    }

    const supabase = locals.supabase;
    const { data: createdCardType, error } = await supabase
      .from('project_card_types')
      .insert({
        project_id: projectId,
        type_key,
        display_name,
        color_class: color_class || 'bg-gray-100 text-gray-700',
        sort_order
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating card type:', error);
      return json({ error: 'Failed to create card type' }, { status: 500 });
    }

    return json({ cardType: createdCardType });
  } catch (error) {
    console.error('Error in card-types POST:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
