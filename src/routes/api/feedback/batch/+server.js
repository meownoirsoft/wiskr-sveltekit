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

    // Fetch all feedback for the given message IDs
    const { data: feedbackData, error } = await locals.supabase
      .from('message_feedback')
      .select('*')
      .eq('user_id', user.id)
      .eq('project_id', projectId)
      .in('message_id', messageIds);

    if (error) {
      console.error('Error fetching batch feedback:', error);
      return new Response('Database error', { status: 500 });
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
