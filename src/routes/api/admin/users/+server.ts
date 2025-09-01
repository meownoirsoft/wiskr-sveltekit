import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { isAdmin } from '$lib/auth/admin';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// GET - List users with stats
export const GET: RequestHandler = async ({ locals, url }) => {
  try {
    // Get authenticated user
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check admin permissions
    const adminCheck = await isAdmin(locals.supabase, user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const search = url.searchParams.get('search');

    // Get users from Supabase auth
    const { data: authResponse, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: Math.floor(offset / limit) + 1,
      perPage: limit
    });

    if (authError) {
      return json({ error: 'Failed to fetch users from auth' }, { status: 500 });
    }

    const authUsers = authResponse.users || [];
    
    // Filter by search if provided
    let filteredUsers = authUsers;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = authUsers.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        (user.user_metadata?.full_name || user.user_metadata?.name)?.toLowerCase().includes(searchLower)
      );
    }

        // Get project counts and tier info for each user
    const usersWithProjects = await Promise.all(
      filteredUsers.map(async (user) => {
        const { count } = await supabaseAdmin
          .from('projects')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);
        
        // Get tier info from profiles table
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('tier, trial_ends_at')
          .eq('user_id', user.id)
          .single();
        
        return {
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          created_at: user.created_at,
          updated_at: user.updated_at,
          is_admin: user.user_metadata?.is_admin || false,
          project_count: count || 0,
          tier: profile?.tier || 0,
          trial_ends_at: profile?.trial_ends_at || null,
          user_metadata: user.user_metadata
        };
      })
    );

    // Get total count
    const totalCount = search ? filteredUsers.length : authResponse.total || 0;

    return json({
      users: usersWithProjects,
      total: totalCount,
      limit,
      offset
    });

  } catch (error) {
    console.error('User list error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};

// POST - Create or update user metadata
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Get authenticated user
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // Check admin permissions
    const adminCheck = await isAdmin(locals.supabase, user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { userId, action, data: updateData } = await request.json();

    if (!userId || !action) {
      return json({ error: 'User ID and action are required' }, { status: 400 });
    }

    switch (action) {
      case 'update_profile':
        // Update user profile information via auth metadata
        const { error: profileError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              ...updateData.currentMetadata,
              full_name: updateData.full_name
            }
          }
        );

        if (profileError) {
          return json({ error: 'Failed to update profile' }, { status: 500 });
        }

        return json({ success: true, message: 'Profile updated successfully' });

      case 'set_admin':
        // Set admin status via user metadata
        const { error: adminError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              ...updateData.currentMetadata,
              is_admin: updateData.is_admin
            }
          }
        );

        if (adminError) {
          return json({ error: 'Failed to update admin status' }, { status: 500 });
        }

        return json({ success: true, message: 'Admin status updated successfully' });

      case 'delete_user':
        // Delete user and all associated data
        // First delete user's projects and contexts
        const { data: userProjects } = await supabaseAdmin
          .from('projects')
          .select('id')
          .eq('user_id', userId);

        if (userProjects) {
          for (const project of userProjects) {
            // Delete contexts first
            await supabaseAdmin
              .from('contexts')
              .delete()
              .eq('project_id', project.id);
          }

          // Delete projects
          await supabaseAdmin
            .from('projects')
            .delete()
            .eq('user_id', userId);
        }

        // Delete auth user
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          return json({ error: 'Failed to delete user from auth' }, { status: 500 });
        }

        return json({ success: true, message: 'User deleted successfully' });

      case 'change_tier':
        // Update user tier in profiles table
        const { tier, trial_ends_at } = updateData;
        
        if (tier === undefined || tier < 0 || tier > 2) {
          return json({ error: 'Invalid tier value' }, { status: 400 });
        }
        
        // Update profiles table
        const { error: tierUpdateError } = await supabaseAdmin
          .from('profiles')
          .upsert({
            user_id: userId,
            tier: tier,
            trial_ends_at: trial_ends_at || null
          }, {
            onConflict: 'user_id'
          });
        
        if (tierUpdateError) {
          console.error('Profile update error:', tierUpdateError);
          return json({ error: 'Failed to update user tier in profiles' }, { status: 500 });
        }
        
        // Also store tier in user metadata for quick access
        const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          {
            user_metadata: {
              ...updateData.currentMetadata,
              tier: tier,
              trial_ends_at: trial_ends_at || null
            }
          }
        );
        
        if (metadataError) {
          console.error('Metadata update error:', metadataError);
          // Don't fail here since profiles table was updated successfully
        }
        
        return json({ success: true, message: 'User tier updated successfully' });

      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('User action error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
};
