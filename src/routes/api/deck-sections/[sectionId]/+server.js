import { json } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

export async function PATCH({ params, request }) {
  try {
    const { sectionId } = params;
    const { name } = await request.json();

    if (!sectionId) {
      return json({ error: 'Section ID is required' }, { status: 400 });
    }

    if (!name || typeof name !== 'string') {
      return json({ error: 'Valid name is required' }, { status: 400 });
    }

    console.log('🔍 Updating section name:', sectionId, 'to:', name);

    // Update the section name
    const { data: updatedSection, error: updateError } = await supabase
      .from('deck_sections')
      .update({ name: name.trim() })
      .eq('id', sectionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating section name:', updateError);
      return json({ error: 'Failed to update section name' }, { status: 500 });
    }

    console.log('✅ Section name updated successfully:', updatedSection);

    return json({ 
      success: true,
      section: {
        id: updatedSection.id,
        name: updatedSection.name
      }
    });

  } catch (error) {
    console.error('Error in section PATCH API:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
