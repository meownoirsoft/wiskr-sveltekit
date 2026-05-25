// Auto-titling service for conversation sessions
import { getModelConfig } from '$lib/server/openrouter.js';

/**
 * Generates a smart title for a conversation session based on the first few messages
 * @param {Array} messages - Array of message objects with role and content
 * @param {string} modelKey - The model to use for generation (default: 'speed')
 * @returns {Promise<string>} - Generated title
 */
export async function generateSessionTitle(messages, modelKey = 'speed') {
  if (!messages || messages.length === 0) {
    return 'New Chat';
  }

  // Get model configuration (use OpenRouter)
  const { client: openai } = getModelConfig('micro'); // Use the cheapest model for titles

  // Extract first few messages for context (max 5 messages or 2000 chars)
  const relevantMessages = messages
    .slice(0, 5)
    .filter(msg => msg.role === 'user' || msg.role === 'assistant');

  if (relevantMessages.length === 0) {
    return 'New Chat';
  }

  // Create context from messages
  const conversationContext = relevantMessages
    .map(msg => `${msg.role === 'user' ? 'User' : 'Wiskrs'}: ${msg.content}`)
    .join('\n\n')
    .substring(0, 2000);

  const titlePrompt = [
    {
      role: 'system',
      content: `You are a helpful assistant that creates concise, descriptive titles for chat conversations. 

Rules:
- Generate a title that captures the main topic or question being discussed
- Keep titles between 2-6 words
- Be specific but concise
- Use title case (capitalize important words)
- Avoid generic words like "chat", "conversation", "discussion" unless the topic is truly general
- Focus on the actual subject matter, problem being solved, or main concept
- If it's a technical topic, include the key technology/concept
- If it's a question, make it about the topic, not "Question About X"

Examples:
- "React Component Optimization" (not "React Question")
- "Database Schema Design" (not "Database Help")
- "Marketing Strategy Review" (not "Marketing Discussion")
- "Python Error Debugging" (not "Python Problem")
- "Travel Plans to Japan" (not "Travel Question")`
    },
    {
      role: 'user',
      content: `Based on this conversation, generate a concise title (2-6 words):\n\n${conversationContext}`
    }
  ];

  try {
    const { config } = getModelConfig('micro'); // Get the actual model config
    const response = await openai.chat.completions.create({
      model: config.name,
      messages: titlePrompt,
      temperature: 0.3,
      max_tokens: 20
    });

    const generatedTitle = response.choices[0]?.message?.content?.trim() || 'New Chat';
    
    // Clean up the title - remove quotes and ensure reasonable length
    let cleanTitle = generatedTitle.replace(/^["']|["']$/g, '').trim();
    
    // Ensure title isn't too long
    if (cleanTitle.length > 50) {
      cleanTitle = cleanTitle.substring(0, 50).trim();
    }
    
    // Fallback if title is empty or too short
    if (!cleanTitle || cleanTitle.length < 2) {
      cleanTitle = 'New Chat';
    }

    console.log('🏷️ Generated session title:', cleanTitle);
    return cleanTitle;

  } catch (error) {
    console.error('Error generating session title:', error);
    return 'New Chat';
  }
}

/**
 * Determines if a session should have its title auto-generated
 * @param {Object} session - Session object
 * @param {Array} messages - Messages in the session
 * @returns {boolean} - Whether to auto-generate title
 */
export function shouldAutoGenerateTitle(session, messages) {
  // Don't auto-generate if user has already customized the title
  const genericTitles = [
    'New Session', 
    'General Discussion', 
    'New Chat',
    'First Chat'
  ];
  
  const hasCustomTitle = !genericTitles.includes(session.session_name || session.name);
  
  // Auto-generate if:
  // 1. Has generic title AND has enough messages (2+ messages, at least 1 from user and 1 from assistant)
  // 2. OR if explicitly requested to regenerate
  const userMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  const hasEnoughContent = userMessages.length >= 1 && assistantMessages.length >= 1;
  
  return !hasCustomTitle && hasEnoughContent;
}

/**
 * Auto-generates and updates a session title if needed
 * @param {string} sessionId - Session ID
 * @param {string} projectId - Project ID  
 * @param {Object} supabase - Supabase client
 * @param {string} modelKey - Model to use for generation
 * @returns {Promise<string|null>} - New title if generated, null if not needed
 */
export async function autoUpdateSessionTitle(sessionId, projectId, supabase, modelKey = 'speed') {
  try {
    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Error fetching session for auto-title:', sessionError);
      return null;
    }

    // Get messages for this session
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Error fetching messages for auto-title:', messagesError);
      return null;
    }

    // Check if we should auto-generate
    if (!shouldAutoGenerateTitle(session, messages || [])) {
      return null;
    }

    // Generate new title
    const newTitle = await generateSessionTitle(messages || [], modelKey);
    
    if (newTitle === session.session_name) {
      return null; // No change needed
    }

    // Update session with new title
    const { error: updateError } = await supabase
      .from('conversation_sessions')
      .update({ 
        session_name: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session title:', updateError);
      return null;
    }

    console.log(`✅ Auto-updated session title: "${session.session_name}" → "${newTitle}"`);
    return newTitle;

  } catch (error) {
    console.error('Error in autoUpdateSessionTitle:', error);
    return null;
  }
}
