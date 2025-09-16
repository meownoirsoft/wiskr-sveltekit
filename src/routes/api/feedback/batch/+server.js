// src/routes/api/feedback/batch/+server.js
import { json } from '@sveltejs/kit';

/** @type {import('./$types').RequestHandler} */
export async function POST({ request, locals }) {
  // Check authentication
  const { data: { user } } = await locals.supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  try {
    const { projectId, messageIds } = await request.json();
    
    if (!projectId || !messageIds || !Array.isArray(messageIds)) {
      return new Response('Invalid request data', { status: 400 });
    }

    // First, check if any of the message IDs are valid UUIDs and exist in the messages table
    const validMessageIds = [];
    for (const messageId of messageIds) {
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(messageId)) {
        validMessageIds.push(messageId);
      }
    }

    let feedbackData = [];
    
    // Only query the database if we have valid message IDs
    if (validMessageIds.length > 0) {
      const { data: dbFeedbackData, error } = await locals.supabase
        .from('message_feedback')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', projectId)
        .in('message_id', validMessageIds);

      if (error) {
        console.error('Error fetching batch feedback:', error);
        console.error('Query details:', { projectId, validMessageIds, userId: user.id });
        return new Response(`Database error: ${error.message}`, { status: 500 });
      }

      feedbackData = dbFeedbackData || [];
    } else {
      console.log('No valid UUID message IDs found, returning empty feedback array');
    }

    // Group feedback by message ID
    const feedbackMap = {};
    feedbackData?.forEach(feedback => {
      feedbackMap[feedback.message_id] = {
        id: feedback.id,
        rating: feedback.rating,
        comment: feedback.comment,
        messageId: feedback.message_id
      };
    });

    return json({ 
      success: true, 
      feedback: Object.values(feedbackMap)
    });

  } catch (error) {
    console.error('Batch feedback API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
