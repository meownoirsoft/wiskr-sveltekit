import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase.js';

export async function GET({ params }) {
  const { id: projectId } = params;

  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
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

export async function PUT({ params, request }) {
  const { id: projectId } = params;
  
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const { factTypes } = await request.json();

    if (!Array.isArray(factTypes)) {
      return json({ error: 'factTypes must be an array' }, { status: 400 });
    }

    // Update each fact type
    const promises = factTypes.map(factType => 
      supabase
        .from('project_fact_types')
        .update({
          display_name: factType.display_name,
          color_class: factType.color_class,
          sort_order: factType.sort_order,
          is_active: factType.is_active
        })
        .eq('project_id', projectId)
        .eq('type_key', factType.type_key)
    );

    const results = await Promise.all(promises);
    
    // Check for errors
    const errorResult = results.find(result => result.error);
    if (errorResult) {
      console.error('Error updating fact types:', errorResult.error);
      return json({ error: 'Failed to update fact types' }, { status: 500 });
    }

    return json({ success: true });
  } catch (error) {
    console.error('Error in fact-types PUT:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST({ params, request }) {
  const { id: projectId } = params;
  
  if (!projectId) {
    return json({ error: 'Project ID is required' }, { status: 400 });
  }

  try {
    const { type_key, display_name, color_class, sort_order = 0 } = await request.json();

    if (!type_key || !display_name) {
      return json({ error: 'type_key and display_name are required' }, { status: 400 });
    }

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
