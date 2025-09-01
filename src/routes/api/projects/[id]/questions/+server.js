// src/routes/api/projects/[id]/questions/+server.js

import { json, error } from '@sveltejs/kit';

export async function GET({ params, locals }) {
  const { supabase } = locals;
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  const projectId = params.id;

  try {
    const { data: questions, error: fetchError } = await supabase
      .from('project_questions')
      .select('id, question, sort_order, completed, created_at, updated_at')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true });

    if (fetchError) {
      console.error('Error fetching questions:', fetchError);
      throw error(500, 'Failed to fetch questions');
    }

    return json({ questions: questions || [] });
  } catch (err) {
    console.error('Questions GET error:', err);
    throw error(500, 'Internal server error');
  }
}

export async function POST({ request, params, locals }) {
  const { supabase } = locals;
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  const projectId = params.id;

  try {
    const { action, question, questions, questionId, completed } = await request.json();

    if (action === 'add') {
      // Add a single question
      if (!question || !question.trim()) {
        throw error(400, 'Question text is required');
      }

      // Get the highest sort_order for this project
      const { data: maxOrder } = await supabase
        .from('project_questions')
        .select('sort_order')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = maxOrder && maxOrder.length > 0 ? maxOrder[0].sort_order + 1 : 0;

      const { data, error: insertError } = await supabase
        .from('project_questions')
        .insert({
          project_id: projectId,
          question: question.trim(),
          sort_order: nextOrder
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error adding question:', insertError);
        throw error(500, 'Failed to add question');
      }

      return json({ question: data });

    } else if (action === 'update_all') {
      // Update all questions with new order/content
      if (!Array.isArray(questions)) {
        throw error(400, 'Questions array is required');
      }

      // Delete all existing questions for this project
      const { error: deleteError } = await supabase
        .from('project_questions')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        console.error('Error deleting questions:', deleteError);
        throw error(500, 'Failed to update questions');
      }

      // Insert new questions if any
      if (questions.length > 0) {
        const questionsToInsert = questions.map((q, index) => ({
          project_id: projectId,
          question: q.trim(),
          sort_order: index
        })).filter(q => q.question); // Filter out empty questions

        if (questionsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('project_questions')
            .insert(questionsToInsert);

          if (insertError) {
            console.error('Error inserting questions:', insertError);
            throw error(500, 'Failed to update questions');
          }
        }
      }

      // Fetch and return the updated questions
      const { data: updatedQuestions, error: fetchError } = await supabase
        .from('project_questions')
        .select('*')
        .eq('project_id', projectId)
        .order('sort_order', { ascending: true });

      if (fetchError) {
        console.error('Error fetching updated questions:', fetchError);
        throw error(500, 'Failed to fetch updated questions');
      }

      return json({ questions: updatedQuestions || [] });

    } else if (action === 'toggle_completed') {
      // Toggle completion status of a specific question
      if (!questionId) {
        throw error(400, 'Question ID is required');
      }

      const { data: updatedQuestion, error: updateError } = await supabase
        .from('project_questions')
        .update({ completed: completed })
        .eq('id', questionId)
        .eq('project_id', projectId) // Extra security check
        .select('id, question, sort_order, completed, created_at, updated_at')
        .single();

      if (updateError) {
        console.error('Error updating question completion:', updateError);
        throw error(500, 'Failed to update question completion');
      }

      return json({ question: updatedQuestion });

    } else {
      throw error(400, 'Invalid action');
    }

  } catch (err) {
    console.error('Questions POST error:', err);
    if (err.status) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Internal server error');
  }
}

export async function DELETE({ request, params, locals }) {
  const { supabase } = locals;
  
  if (!supabase) {
    throw error(500, 'Database connection not available');
  }

  const projectId = params.id;

  try {
    const { questionId } = await request.json();

    if (!questionId) {
      throw error(400, 'Question ID is required');
    }

    const { error: deleteError } = await supabase
      .from('project_questions')
      .delete()
      .eq('id', questionId)
      .eq('project_id', projectId); // Extra security check

    if (deleteError) {
      console.error('Error deleting question:', deleteError);
      throw error(500, 'Failed to delete question');
    }

    return json({ success: true });

  } catch (err) {
    console.error('Questions DELETE error:', err);
    if (err.status) {
      throw err; // Re-throw SvelteKit errors
    }
    throw error(500, 'Internal server error');
  }
}
