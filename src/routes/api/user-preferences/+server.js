// src/routes/api/user-preferences/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function GET({ locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    // Get user preferences
    const { data: preferences, error } = await locals.supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Error fetching user preferences:', error);
      return json({ error: 'Failed to fetch preferences' }, { status: 500 });
    }

    // If no preferences exist, return defaults
    if (!preferences) {
      return json({
        max_related_ideas: 8,
        accent_color: '#155DFC',
        display_name: null,
        avatar_type: 'default',
        avatar_value: null
      });
    }

    return json({
      max_related_ideas: preferences.max_related_ideas || 8,
      accent_color: preferences.accent_color || '#155DFC',
      display_name: preferences.display_name || null,
      avatar_type: preferences.avatar_type || 'default',
      avatar_value: preferences.avatar_value || null
    });
  } catch (error) {
    console.error('Error in user preferences GET:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { max_related_ideas, accent_color, display_name, avatar_type, avatar_value } = body;

    // Validate the input
    if (max_related_ideas !== undefined) {
      if (typeof max_related_ideas !== 'number' || max_related_ideas < 1 || max_related_ideas > 20) {
        return json({ error: 'max_related_ideas must be a number between 1 and 20' }, { status: 400 });
      }
    }
    
    if (accent_color !== undefined) {
      if (typeof accent_color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(accent_color)) {
        return json({ error: 'accent_color must be a valid hex color (e.g., #155DFC)' }, { status: 400 });
      }
    }
    
    if (display_name !== undefined) {
      if (display_name !== null && (typeof display_name !== 'string' || display_name.trim().length > 50)) {
        return json({ error: 'display_name must be a string with 50 characters or less' }, { status: 400 });
      }
    }
    
    if (avatar_type !== undefined) {
      if (!['default', 'premade', 'custom'].includes(avatar_type)) {
        return json({ error: 'avatar_type must be default, premade, or custom' }, { status: 400 });
      }
    }
    
    if (avatar_value !== undefined) {
      if (avatar_value !== null && typeof avatar_value !== 'string') {
        return json({ error: 'avatar_value must be a string or null' }, { status: 400 });
      }
    }

    // Check if preferences already exist
    const { data: existing } = await locals.supabase
      .from('user_preferences')
      .select('id')
      .eq('user_id', user.id)
      .single();

    let result;
    if (existing) {
      // Update existing preferences
      const updateData = {};
      if (max_related_ideas !== undefined) updateData.max_related_ideas = max_related_ideas;
      if (accent_color !== undefined) updateData.accent_color = accent_color;
      if (display_name !== undefined) updateData.display_name = display_name?.trim() || null;
      if (avatar_type !== undefined) updateData.avatar_type = avatar_type;
      if (avatar_value !== undefined) updateData.avatar_value = avatar_value;
      
      const { data, error } = await locals.supabase
        .from('user_preferences')
        .update(updateData)
        .eq('user_id', user.id)
        .select()
        .single();
      
      result = { data, error };
    } else {
      // Create new preferences
      const insertData = { user_id: user.id };
      if (max_related_ideas !== undefined) insertData.max_related_ideas = max_related_ideas;
      if (accent_color !== undefined) insertData.accent_color = accent_color;
      if (display_name !== undefined) insertData.display_name = display_name?.trim() || null;
      if (avatar_type !== undefined) insertData.avatar_type = avatar_type;
      if (avatar_value !== undefined) insertData.avatar_value = avatar_value;
      
      const { data, error } = await locals.supabase
        .from('user_preferences')
        .insert(insertData)
        .select()
        .single();
      
      result = { data, error };
    }

    if (result.error) {
      console.error('Error saving user preferences:', result.error);
      return json({ error: 'Failed to save preferences' }, { status: 500 });
    }

    return json({
      success: true,
      preferences: {
        max_related_ideas: result.data.max_related_ideas,
        accent_color: result.data.accent_color,
        display_name: result.data.display_name,
        avatar_type: result.data.avatar_type,
        avatar_value: result.data.avatar_value
      }
    });
  } catch (error) {
    console.error('Error in user preferences POST:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}
