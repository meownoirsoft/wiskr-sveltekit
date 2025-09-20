import { json } from '@sveltejs/kit';

const RAINBOW_COLORS = [
  'bg-red-50 border-red-200',      // Red
  'bg-orange-50 border-orange-200', // Orange  
  'bg-yellow-50 border-yellow-200', // Yellow
  'bg-green-50 border-green-200',   // Green
  'bg-blue-50 border-blue-200',     // Blue
  'bg-indigo-50 border-indigo-200', // Indigo
  'bg-purple-50 border-purple-200', // Purple
  'bg-pink-50 border-pink-200'      // Pink
];

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { action, projectId, sessionId, messageId, branchName, branchId, newName } = body;
    
    switch (action) {
      case 'create':
        return await createBranch(locals.supabase, projectId, sessionId, messageId, branchName);
      case 'list':
        return await listBranches(locals.supabase, projectId, sessionId);
      case 'listForMessage':
        return await listBranchesForMessage(locals.supabase, projectId, sessionId, messageId);
      case 'switch':
        return await switchBranch(locals.supabase, projectId, sessionId, branchId);
      case 'rename':
        return await renameBranch(locals.supabase, projectId, sessionId, branchId, newName);
      case 'delete':
        return await deleteBranch(locals.supabase, projectId, sessionId, branchId);
      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Branch API error:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}

async function createBranch(supabase, projectId, sessionId, parentMessageId, branchName) {
  // Check for duplicate branch name within the same parent message
  if (parentMessageId && branchName) {
    const { data: existingBranch } = await supabase
      .from('conversation_branches')
      .select('branch_name')
      .eq('project_id', projectId)
      .eq('parent_message_id', parentMessageId)
      .eq('branch_name', branchName.trim())
      .single();
      
    if (existingBranch) {
      return json({ 
        error: `A branch named "${branchName.trim()}" already exists for this message. Please choose a different name.` 
      }, { status: 400 });
    }
  }
  
  // Generate unique branch ID
  const branchId = `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Get current branch count to assign rainbow color
  const { data: existingBranches } = await supabase
    .from('conversation_branches')
    .select('color_index')
    .eq('project_id', projectId);
  
  const colorIndex = existingBranches?.length % RAINBOW_COLORS.length || 0;
  
  // Create branch record
  const { data: branch, error: branchError } = await supabase
    .from('conversation_branches')
    .insert({
      project_id: projectId,
      session_id: sessionId,
      branch_id: branchId,
      branch_name: branchName || `Branch ${existingBranches?.length + 1}`,
      parent_message_id: parentMessageId,
      color_index: colorIndex
    })
    .select('*')
    .single();
    
  if (branchError) {
    console.error('Error creating branch:', branchError);
    return json({ error: 'Failed to create branch' }, { status: 500 });
  }

  // Mark the parent message as a branch point
  if (parentMessageId) {
    await supabase
      .from('messages')
      .update({ branch_point: true })
      .eq('id', parentMessageId);
  }

  // Copy all messages up to the branch point to the new branch
  const { data: messagesToCopy } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('branch_id', 'main')
    .order('created_at');

  if (messagesToCopy && parentMessageId) {
    // Find the index of the parent message
    const parentIndex = messagesToCopy.findIndex(m => m.id === parentMessageId);
    if (parentIndex !== -1) {
      // Copy messages up to and including the parent message
      const messagesToDuplicate = messagesToCopy.slice(0, parentIndex + 1);
      
      const duplicatedMessages = messagesToDuplicate.map(msg => ({
        project_id: msg.project_id,
        role: msg.role,
        content: msg.content,
        branch_id: branchId,
        parent_message_id: msg.id === parentMessageId ? null : msg.parent_message_id,
        branch_point: msg.id === parentMessageId
      }));

      await supabase.from('messages').insert(duplicatedMessages);
    }
  }

  return json({ 
    success: true, 
    branch: {
      ...branch,
      colorClass: RAINBOW_COLORS[colorIndex]
    }
  });
}

async function listBranches(supabase, projectId, sessionId) {
  const { data: branches, error } = await supabase
    .from('conversation_branches')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at');
    
  if (error) {
    return json({ error: 'Failed to fetch branches' }, { status: 500 });
  }
  
  console.log('Raw branches from DB for project', projectId, ':', branches);
  
  // Add color classes to branches
  const branchesWithColors = branches?.map(branch => ({
    ...branch,
    colorClass: RAINBOW_COLORS[branch.color_index % RAINBOW_COLORS.length]
  })) || [];
  
  console.log('Branches with colors:', branchesWithColors);
  
  return json({ branches: branchesWithColors });
}

async function listBranchesForMessage(supabase, projectId, sessionId, messageId) {
  // Get branches that were created from this specific message
  const { data: branches, error } = await supabase
    .from('conversation_branches')
    .select('*')
    .eq('project_id', projectId)
    .eq('parent_message_id', messageId)
    .order('created_at');
    
  if (error) {
    return json({ error: 'Failed to fetch message branches' }, { status: 500 });
  }
  
  // Add color classes to branches
  const branchesWithColors = branches?.map(branch => ({
    ...branch,
    colorClass: RAINBOW_COLORS[branch.color_index % RAINBOW_COLORS.length]
  })) || [];
  
  return json({ branches: branchesWithColors });
}

async function switchBranch(supabase, projectId, sessionId, branchId) {
  console.log('🔧 API switchBranch called with:', { projectId, sessionId, branchId });
  
  // Fetch messages for the specified branch
  const { data: messages, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .eq('branch_id', branchId)
    .order('created_at');
    
  if (error) {
    console.error('API switchBranch: Supabase error:', error);
    return json({ error: 'Failed to fetch branch messages' }, { status: 500 });
  }
  
  console.log('📨 Messages found:', messages?.length || 0);
  
  let branch = null;
  
  // Handle main branch specially - it doesn't have a record in conversation_branches
  if (branchId === 'main') {
    branch = {
      project_id: projectId,
      session_id: sessionId,
      branch_id: 'main',
      branch_name: 'Main Branch',
      parent_message_id: null,
      color_index: 0,
      colorClass: 'bg-white border-gray-200',
      created_at: new Date().toISOString()
    };
  } else {
    // Fetch branch info from conversation_branches table for non-main branches
    const { data: branchData, error: branchError } = await supabase
      .from('conversation_branches')
      .select('*')
      .eq('project_id', projectId)
      .eq('branch_id', branchId)
      .single();
      
    if (branchError) {
      console.error('Error fetching branch data:', branchError);
      // If branch doesn't exist in conversation_branches, return error
      return json({ error: 'Branch not found' }, { status: 404 });
    }
    
    if (branchData) {
      branch = {
        ...branchData,
        colorClass: RAINBOW_COLORS[branchData.color_index % RAINBOW_COLORS.length]
      };
    }
  }
  
  console.log('API switchBranch returning:', {
    success: true,
    messagesCount: messages?.length || 0,
    branch: branch ? {
      branch_id: branch.branch_id,
      branch_name: branch.branch_name,
      colorClass: branch.colorClass
    } : null,
    branchId
  });
    
  return json({ 
    success: true, 
    messages: messages || [],
    branch: branch
  });
}

async function renameBranch(supabase, projectId, sessionId, branchId, newName) {
  // Don't allow renaming the main branch
  if (branchId === 'main') {
    return json({ error: 'Cannot rename the main branch' }, { status: 400 });
  }
  
  if (!newName || !newName.trim()) {
    return json({ error: 'Branch name cannot be empty' }, { status: 400 });
  }
  
  // Check if branch exists
  const { data: existingBranch } = await supabase
    .from('conversation_branches')
    .select('*')
    .eq('project_id', projectId)
    .eq('branch_id', branchId)
    .single();
    
  if (!existingBranch) {
    return json({ error: 'Branch not found' }, { status: 404 });
  }
  
  // Check for duplicate name in the same parent message
  if (existingBranch.parent_message_id) {
    const { data: duplicateBranch } = await supabase
      .from('conversation_branches')
      .select('branch_id')
      .eq('project_id', projectId)
      .eq('parent_message_id', existingBranch.parent_message_id)
      .eq('branch_name', newName.trim())
      .neq('branch_id', branchId)
      .single();
      
    if (duplicateBranch) {
      return json({ 
        error: `A branch named "${newName.trim()}" already exists for this message. Please choose a different name.` 
      }, { status: 400 });
    }
  }
  
  // Update branch name
  const { error: updateError } = await supabase
    .from('conversation_branches')
    .update({ branch_name: newName.trim() })
    .eq('project_id', projectId)
    .eq('branch_id', branchId);
    
  if (updateError) {
    console.error('Error renaming branch:', updateError);
    return json({ error: 'Failed to rename branch' }, { status: 500 });
  }
  
  return json({ success: true });
}

async function deleteBranch(supabase, projectId, sessionId, branchId) {
  // Don't allow deleting the main branch
  if (branchId === 'main') {
    return json({ error: 'Cannot delete the main branch' }, { status: 400 });
  }
  
  // Check if branch exists
  const { data: existingBranch } = await supabase
    .from('conversation_branches')
    .select('*')
    .eq('project_id', projectId)
    .eq('branch_id', branchId)
    .single();
    
  if (!existingBranch) {
    return json({ error: 'Branch not found' }, { status: 404 });
  }
  
  // Delete all messages in this branch
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .eq('project_id', projectId)
    .eq('branch_id', branchId);
    
  if (messagesError) {
    console.error('Error deleting branch messages:', messagesError);
    return json({ error: 'Failed to delete branch messages' }, { status: 500 });
  }
  
  // Delete branch record
  const { error: branchError } = await supabase
    .from('conversation_branches')
    .delete()
    .eq('project_id', projectId)
    .eq('branch_id', branchId);
    
  if (branchError) {
    console.error('Error deleting branch:', branchError);
    return json({ error: 'Failed to delete branch' }, { status: 500 });
  }
  
  return json({ success: true });
}

