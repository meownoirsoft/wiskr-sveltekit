// src/routes/api/feedback/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const { action, ...data } = body;
    
    switch (action) {
      case 'submit-message-feedback':
        return await submitMessageFeedback(locals.supabase, user.id, data);
      case 'submit-mr-wiskr-feedback':
        return await submitMrWiskrFeedback(locals.supabase, user.id, data);
      case 'get-message-feedback':
        return await getMessageFeedback(locals.supabase, user.id, data.messageId);
      case 'get-feedback-analytics':
        return await getFeedbackAnalytics(locals.supabase, user.id, data.projectId);
      default:
        return json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Feedback API error:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}

/** @type {import('./$types').RequestHandler} */
export async function GET({ url, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const messageId = url.searchParams.get('messageId');
    const projectId = url.searchParams.get('projectId');
    const type = url.searchParams.get('type') || 'message'; // 'message' or 'analytics'
    
    if (type === 'analytics') {
      return await getFeedbackAnalytics(locals.supabase, user.id, projectId);
    } else if (messageId) {
      return await getMessageFeedback(locals.supabase, user.id, messageId);
    } else {
      return json({ error: 'Missing required parameters' }, { status: 400 });
    }
  } catch (error) {
    console.error('Feedback API GET error:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}

// Submit or update feedback for a specific message
async function submitMessageFeedback(supabase, userId, { messageId, projectId, rating, comment }) {
  if (!messageId || !projectId || ![1, -1].includes(rating)) {
    return json({ error: 'Invalid parameters' }, { status: 400 });
  }

  // Use upsert to handle both insert and update
  const { data, error } = await supabase
    .from('message_feedback')
    .upsert({
      user_id: userId,
      message_id: messageId,
      project_id: projectId,
      rating,
      comment: comment || null
    }, {
      onConflict: 'user_id,message_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting message feedback:', error);
    return json({ error: 'Failed to submit feedback' }, { status: 500 });
  }

  return json({ 
    success: true, 
    feedback: data,
    message: rating === 1 ? 'Thanks for the positive feedback!' : 'Thanks for your feedback - we\'ll work on improving!'
  });
}

// Submit feedback for Mr Wiskr
async function submitMrWiskrFeedback(supabase, userId, { projectId, rating, comment, context }) {
  if (![1, -1].includes(rating)) {
    return json({ error: 'Invalid rating' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('mr_wiskr_feedback')
    .insert({
      user_id: userId,
      project_id: projectId || null,
      rating,
      comment: comment || null,
      context: context || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting Mr Wiskr feedback:', error);
    return json({ error: 'Failed to submit feedback' }, { status: 500 });
  }

  return json({ 
    success: true, 
    feedback: data,
    message: rating === 1 ? 'Mr Wiskr purrs with appreciation! 🐱' : 'Thanks for the feedback - Mr Wiskr will try harder! 😿'
  });
}

// Get feedback for a specific message
async function getMessageFeedback(supabase, userId, messageId) {
  if (!messageId) {
    return json({ error: 'Message ID required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('message_feedback')
    .select('*')
    .eq('user_id', userId)
    .eq('message_id', messageId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows found"
    console.error('Error getting message feedback:', error);
    return json({ error: 'Failed to get feedback' }, { status: 500 });
  }

  return json({ feedback: data || null });
}

// Get feedback analytics for a project or user
async function getFeedbackAnalytics(supabase, userId, projectId) {
  try {
    // Get message feedback analytics
    let messageFeedbackQuery = supabase
      .from('message_feedback')
      .select(`
        rating,
        created_at,
        comment,
        messages!inner(
          role,
          model_key,
          created_at
        )
      `)
      .eq('user_id', userId);
    
    if (projectId) {
      messageFeedbackQuery = messageFeedbackQuery.eq('project_id', projectId);
    }

    const { data: messageFeedback, error: messageFeedbackError } = await messageFeedbackQuery
      .order('created_at', { ascending: false })
      .limit(100);

    if (messageFeedbackError) {
      console.error('Error getting message feedback analytics:', messageFeedbackError);
    }

    // Get Mr Wiskr feedback analytics
    let mrWiskrQuery = supabase
      .from('mr_wiskr_feedback')
      .select('rating, created_at, comment, context')
      .eq('user_id', userId);
    
    if (projectId) {
      mrWiskrQuery = mrWiskrQuery.eq('project_id', projectId);
    }

    const { data: mrWiskrFeedback, error: mrWiskrError } = await mrWiskrQuery
      .order('created_at', { ascending: false })
      .limit(100);

    if (mrWiskrError) {
      console.error('Error getting Mr Wiskr feedback analytics:', mrWiskrError);
    }

    // Calculate summary statistics
    const messageFeedbackStats = calculateFeedbackStats(messageFeedback || []);
    const mrWiskrStats = calculateFeedbackStats(mrWiskrFeedback || []);

    return json({ 
      analytics: {
        messageFeedback: {
          data: messageFeedback || [],
          stats: messageFeedbackStats
        },
        mrWiskrFeedback: {
          data: mrWiskrFeedback || [],
          stats: mrWiskrStats
        }
      }
    });
  } catch (error) {
    console.error('Error getting feedback analytics:', error);
    return json({ error: 'Failed to get analytics' }, { status: 500 });
  }
}

// Helper function to calculate feedback statistics
function calculateFeedbackStats(feedbackData) {
  if (!feedbackData || feedbackData.length === 0) {
    return {
      total: 0,
      positive: 0,
      negative: 0,
      positiveRate: 0,
      negativeRate: 0,
      hasComments: 0
    };
  }

  const total = feedbackData.length;
  const positive = feedbackData.filter(f => f.rating === 1).length;
  const negative = feedbackData.filter(f => f.rating === -1).length;
  const hasComments = feedbackData.filter(f => f.comment && f.comment.trim()).length;

  return {
    total,
    positive,
    negative,
    positiveRate: total > 0 ? Math.round((positive / total) * 100) : 0,
    negativeRate: total > 0 ? Math.round((negative / total) * 100) : 0,
    hasComments
  };
}
