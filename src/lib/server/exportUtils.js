/**
 * Utilities for handling project data exports
 */

/**
 * Sanitize export data by removing sensitive or internal fields
 * @param {Object} data - The data to sanitize
 * @param {Array<string>} fieldsToRemove - Fields to remove from objects
 * @returns {Object} Sanitized data
 */
export function sanitizeExportData(data, fieldsToRemove = ['user_id', 'project_id']) {
  if (Array.isArray(data)) {
    return data.map(item => sanitizeExportData(item, fieldsToRemove));
  }
  
  if (data && typeof data === 'object') {
    const sanitized = { ...data };
    fieldsToRemove.forEach(field => {
      delete sanitized[field];
    });
    
    // Recursively sanitize nested objects
    Object.keys(sanitized).forEach(key => {
      if (sanitized[key] && typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeExportData(sanitized[key], fieldsToRemove);
      }
    });
    
    return sanitized;
  }
  
  return data;
}

/**
 * Generate a safe filename from project name
 * @param {string} projectName - The project name
 * @param {string} prefix - Optional prefix for the filename
 * @param {string} extension - File extension (without dot)
 * @returns {string} Safe filename
 */
export function generateExportFilename(projectName, prefix = 'wiskr_project', extension = 'json') {
  const safeName = projectName
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase()
    .substring(0, 50); // Limit length
  
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${safeName}_${date}.${extension}`;
}

/**
 * Calculate comprehensive export statistics
 * @param {Object} exportData - The export data structure
 * @returns {Object} Statistics object
 */
export function calculateExportStats(exportData) {
  const stats = {
    project_name: exportData.project?.name || 'Unknown',
    export_date: exportData.meta?.export_date || new Date().toISOString(),
    data_counts: {
      sessions: exportData.sessions?.length || 0,
      branches: exportData.branches?.length || 0,
      messages: exportData.messages?.length || 0,
      facts: exportData.facts?.length || 0,
      questions: exportData.questions?.length || 0,
      personas: exportData.personas?.length || 0,
      fact_types: exportData.fact_types?.length || 0
    },
    size_analysis: {
      total_characters: 0,
      message_characters: 0,
      fact_characters: 0,
      question_characters: 0
    },
    date_range: {
      earliest_session: null,
      latest_session: null,
      earliest_message: null,
      latest_message: null
    }
  };

  // Calculate size analysis
  if (exportData.messages) {
    stats.size_analysis.message_characters = exportData.messages
      .reduce((total, msg) => total + (msg.content?.length || 0), 0);
  }

  if (exportData.facts) {
    stats.size_analysis.fact_characters = exportData.facts
      .reduce((total, fact) => total + (fact.content?.length || 0) + (fact.description?.length || 0), 0);
  }

  if (exportData.questions) {
    stats.size_analysis.question_characters = exportData.questions
      .reduce((total, q) => total + (q.question?.length || 0) + (q.context?.length || 0), 0);
  }

  stats.size_analysis.total_characters = 
    stats.size_analysis.message_characters + 
    stats.size_analysis.fact_characters + 
    stats.size_analysis.question_characters;

  // Calculate date ranges
  if (exportData.sessions?.length > 0) {
    const sessionDates = exportData.sessions
      .map(s => s.created_at)
      .filter(Boolean)
      .sort();
    stats.date_range.earliest_session = sessionDates[0];
    stats.date_range.latest_session = sessionDates[sessionDates.length - 1];
  }

  if (exportData.messages?.length > 0) {
    const messageDates = exportData.messages
      .map(m => m.created_at)
      .filter(Boolean)
      .sort();
    stats.date_range.earliest_message = messageDates[0];
    stats.date_range.latest_message = messageDates[messageDates.length - 1];
  }

  return stats;
}

/**
 * Format export data for different output formats
 * @param {Object} exportData - Raw export data
 * @param {string} format - Output format ('json', 'readable')
 * @returns {string|Object} Formatted data
 */
export function formatExportData(exportData, format = 'json') {
  switch (format.toLowerCase()) {
    case 'json':
      return JSON.stringify(exportData, null, 2);
    
    case 'readable':
      // Create a more human-readable format
      const readable = {
        'Project Information': {
          Name: exportData.project?.name,
          Description: exportData.project?.description,
          Created: exportData.project?.created_at,
          'Brief Text': exportData.project?.brief_text
        },
        'Export Information': {
          'Export Date': exportData.meta?.export_date,
          'Export Version': exportData.meta?.export_version,
          Statistics: exportData.meta?.statistics
        },
        'Sessions': exportData.sessions?.map(session => ({
          Name: session.session_name,
          Date: session.session_date,
          'Topic Summary': session.topic_summary,
          'Is Active': session.is_active
        })) || [],
        'Conversations': exportData.messages?.map(msg => ({
          Role: msg.role,
          Content: msg.content?.substring(0, 200) + (msg.content?.length > 200 ? '...' : ''),
          Timestamp: msg.created_at,
          Session: msg.session_id,
          Branch: msg.branch_id
        })) || []
      };
      
      return JSON.stringify(readable, null, 2);
    
    default:
      return exportData;
  }
}

/**
 * Validate export data structure
 * @param {Object} exportData - The export data to validate
 * @returns {Object} Validation result with errors if any
 */
export function validateExportData(exportData) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!exportData.meta) {
    errors.push('Missing meta information');
  } else {
    if (!exportData.meta.export_version) warnings.push('Missing export version');
    if (!exportData.meta.export_date) warnings.push('Missing export date');
  }

  if (!exportData.project) {
    errors.push('Missing project information');
  } else {
    if (!exportData.project.name) warnings.push('Project missing name');
    if (!exportData.project.id) warnings.push('Project missing ID');
  }

  // Check data consistency
  if (exportData.messages && exportData.sessions) {
    const sessionIds = new Set(exportData.sessions.map(s => s.id));
    const orphanedMessages = exportData.messages.filter(m => 
      m.session_id && !sessionIds.has(m.session_id)
    );
    if (orphanedMessages.length > 0) {
      warnings.push(`${orphanedMessages.length} messages reference non-existent sessions`);
    }
  }

  if (exportData.branches && exportData.sessions) {
    const sessionIds = new Set(exportData.sessions.map(s => s.id));
    const orphanedBranches = exportData.branches.filter(b => 
      b.session_id && !sessionIds.has(b.session_id)
    );
    if (orphanedBranches.length > 0) {
      warnings.push(`${orphanedBranches.length} branches reference non-existent sessions`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Create export preview summary
 * @param {Object} exportData - The export data
 * @returns {Object} Preview summary
 */
export function createExportPreview(exportData) {
  const stats = calculateExportStats(exportData);
  
  return {
    project: {
      name: exportData.project?.name || 'Untitled Project',
      description: exportData.project?.description || 'No description',
      created: exportData.project?.created_at
    },
    summary: {
      sessions: stats.data_counts.sessions,
      total_messages: stats.data_counts.messages,
      total_facts: stats.data_counts.facts,
      total_questions: stats.data_counts.questions,
      estimated_size: `${Math.round(stats.size_analysis.total_characters / 1024)} KB`,
      date_range: stats.date_range
    },
    includes: {
      messages: exportData.messages?.length > 0,
      facts: exportData.facts?.length > 0,
      questions: exportData.questions?.length > 0,
      personas: exportData.personas?.length > 0
    }
  };
}

/**
 * Escape markdown special characters
 * @param {string} text - The text to escape
 * @returns {string} Escaped text
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\*/g, '\\*')
    .replace(/_/g, '\_')
    .replace(/`/g, '\`')
    .replace(/~/g, '\~')
    .replace(/\|/g, '\|');
}

/**
 * Format date for markdown
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatMarkdownDate(dateStr) {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleString();
}

/**
 * Generate single markdown file with all project data
 * @param {Object} exportData - The export data
 * @returns {string} Markdown content
 */
export function generateSingleMarkdown(exportData) {
  const project = exportData.project || {};
  const stats = exportData.meta?.statistics || {};
  
  let markdown = `# ${escapeMarkdown(project.name || 'Untitled Project')}\n\n`;
  
  // Project info
  if (project.description) {
    markdown += `## Description\n\n${escapeMarkdown(project.description)}\n\n`;
  }
  
  markdown += `## Project Information\n\n`;
  markdown += `- **Created:** ${formatMarkdownDate(project.created_at)}\n`;
  markdown += `- **Icon:** ${project.icon || '📁'}\n`;
  if (project.brief_text) {
    markdown += `- **Brief:** ${escapeMarkdown(project.brief_text)}\n`;
  }
  markdown += `- **Export Date:** ${formatMarkdownDate(exportData.meta?.export_date)}\n\n`;
  
  // Statistics
  markdown += `## Export Statistics\n\n`;
  markdown += `- **Sessions:** ${stats.sessions_count || 0}\n`;
  markdown += `- **Messages:** ${stats.messages_count || 0}\n`;
  markdown += `- **Facts:** ${stats.facts_count || 0}\n`;
  markdown += `- **Questions:** ${stats.questions_count || 0}\n`;
  markdown += `- **Fact Types:** ${stats.fact_types_count || 0}\n\n`;
  
  // Personas
  if (exportData.personas?.length > 0) {
    markdown += `## Wiskr Personas\n\n`;
    exportData.personas.forEach(persona => {
      markdown += `### ${escapeMarkdown(persona.name || 'Unnamed Persona')}\n\n`;
      if (persona.style_json) {
        const style = typeof persona.style_json === 'string' ? 
          JSON.parse(persona.style_json) : persona.style_json;
        markdown += `- **Tone:** ${escapeMarkdown(style.tone || 'Not specified')}\n`;
        markdown += `- **Emoji Level:** ${escapeMarkdown(style.emoji_level || 'Not specified')}\n`;
        markdown += `- **Sentence Length:** ${escapeMarkdown(style.sentence_length || 'Not specified')}\n`;
        if (style.do?.length > 0) {
          markdown += `- **Do:** ${style.do.map(item => escapeMarkdown(item)).join(', ')}\n`;
        }
        if (style.dont?.length > 0) {
          markdown += `- **Don't:** ${style.dont.map(item => escapeMarkdown(item)).join(', ')}\n`;
        }
      }
      markdown += `\n`;
    });
  }
  
  // Fact Types
  if (exportData.fact_types?.length > 0) {
    markdown += `## Fact Types\n\n`;
    exportData.fact_types.forEach(type => {
      markdown += `### ${escapeMarkdown(type.display_name || type.type_key || 'Unnamed Type')}\n\n`;
      if (type.description) {
        markdown += `${escapeMarkdown(type.description)}\n\n`;
      }
      if (type.color_class || type.color) {
        markdown += `**Color:** ${type.color_class || type.color}\n\n`;
      }
    });
  }
  
  // Questions
  if (exportData.questions?.length > 0) {
    markdown += `## Saved Questions\n\n`;
    exportData.questions.forEach((question, index) => {
      markdown += `### Question ${index + 1}\n\n`;
      markdown += `**Question:** ${escapeMarkdown(question.question || 'No question text')}\n\n`;
      if (question.context) {
        markdown += `**Context:** ${escapeMarkdown(question.context)}\n\n`;
      }
      if (question.tags?.length > 0) {
        markdown += `**Tags:** ${question.tags.map(tag => `\`${escapeMarkdown(tag)}\``).join(', ')}\n\n`;
      }
      markdown += `**Created:** ${formatMarkdownDate(question.created_at)}\n\n`;
      markdown += `---\n\n`;
    });
  }
  
  // Facts
  if (exportData.facts?.length > 0) {
    markdown += `## Facts\n\n`;
    exportData.facts.forEach((fact, index) => {
      markdown += `### Fact ${index + 1}\n\n`;
      if (fact.content) {
        markdown += `${escapeMarkdown(fact.content)}\n\n`;
      }
      if (fact.description && fact.description !== fact.content) {
        markdown += `**Description:** ${escapeMarkdown(fact.description)}\n\n`;
      }
      if (fact.tags?.length > 0) {
        markdown += `**Tags:** ${fact.tags.map(tag => `\`${escapeMarkdown(tag)}\``).join(', ')}\n\n`;
      }
      markdown += `**Created:** ${formatMarkdownDate(fact.created_at)}\n\n`;
      markdown += `---\n\n`;
    });
  }
  
  // Sessions and Messages
  if (exportData.sessions?.length > 0 && exportData.messages?.length > 0) {
    markdown += `## Conversation Sessions\n\n`;
    
    // Group messages by session
    const messagesBySession = {};
    exportData.messages.forEach(message => {
      if (!messagesBySession[message.session_id]) {
        messagesBySession[message.session_id] = [];
      }
      messagesBySession[message.session_id].push(message);
    });
    
    // Sort sessions by date
    const sortedSessions = [...exportData.sessions].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    sortedSessions.forEach(session => {
      markdown += `### ${escapeMarkdown(session.session_name || 'Unnamed Session')}\n\n`;
      markdown += `**Date:** ${session.session_date || 'Unknown'}\n`;
      if (session.topic_summary) {
        markdown += `**Topic:** ${escapeMarkdown(session.topic_summary)}\n`;
      }
      markdown += `**Status:** ${session.is_active ? 'Active' : 'Inactive'}\n\n`;
      
      // Add messages for this session
      const sessionMessages = messagesBySession[session.id] || [];
      if (sessionMessages.length > 0) {
        markdown += `#### Messages\n\n`;
        
        // Sort messages by creation date
        const sortedMessages = [...sessionMessages].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        
        sortedMessages.forEach((message, index) => {
          const roleIcon = message.role === 'user' ? '👤' : '🤖';
          const roleName = message.role === 'user' ? 'User' : 'Wiskr';
          
          markdown += `**${roleIcon} ${roleName}** *(${formatMarkdownDate(message.created_at)})*\n\n`;
          
          if (message.content) {
            // Split content into paragraphs and escape
            const paragraphs = message.content.split('\n\n');
            paragraphs.forEach(paragraph => {
              if (paragraph.trim()) {
                markdown += `${escapeMarkdown(paragraph.trim())}\n\n`;
              }
            });
          }
          
          if (message.branch_id && message.branch_id !== 'main') {
            markdown += `*Branch: ${escapeMarkdown(message.branch_id)}*\n\n`;
          }
          
          markdown += `---\n\n`;
        });
      }
      
      markdown += `\n`;
    });
  }
  
  return markdown;
}

/**
 * Generate multiple markdown files organized by type
 * @param {Object} exportData - The export data
 * @returns {Object} Object with filename -> content mapping
 */
export function generateMultipleMarkdown(exportData) {
  const project = exportData.project || {};
  const projectName = project.name || 'Untitled Project';
  const files = {};
  
  // README.md - Overview
  let readme = `# ${escapeMarkdown(projectName)}\n\n`;
  if (project.description) {
    readme += `${escapeMarkdown(project.description)}\n\n`;
  }
  
  readme += `## Project Information\n\n`;
  readme += `- **Created:** ${formatMarkdownDate(project.created_at)}\n`;
  readme += `- **Icon:** ${project.icon || '📁'}\n`;
  if (project.brief_text) {
    readme += `- **Brief:** ${escapeMarkdown(project.brief_text)}\n`;
  }
  readme += `- **Export Date:** ${formatMarkdownDate(exportData.meta?.export_date)}\n\n`;
  
  const stats = exportData.meta?.statistics || {};
  readme += `## Contents\n\n`;
  readme += `This export contains the following files:\n\n`;
  if (stats.sessions_count > 0) readme += `- \`conversations/\` - ${stats.sessions_count} conversation sessions with ${stats.messages_count} messages\n`;
  if (stats.facts_count > 0) readme += `- \`facts.md\` - ${stats.facts_count} facts\n`;
  if (stats.questions_count > 0) readme += `- \`questions.md\` - ${stats.questions_count} saved questions\n`;
  if (stats.personas_count > 0) readme += `- \`personas.md\` - ${stats.personas_count} Wiskr personas\n`;
  if (stats.fact_types_count > 0) readme += `- \`fact-types.md\` - ${stats.fact_types_count} fact type definitions\n`;
  
  files['README.md'] = readme;
  
  // Personas
  if (exportData.personas?.length > 0) {
    let personasContent = `# Wiskr Personas\n\n`;
    exportData.personas.forEach(persona => {
      personasContent += `## ${escapeMarkdown(persona.name || 'Unnamed Persona')}\n\n`;
      if (persona.style_json) {
        const style = typeof persona.style_json === 'string' ? 
          JSON.parse(persona.style_json) : persona.style_json;
        personasContent += `- **Tone:** ${escapeMarkdown(style.tone || 'Not specified')}\n`;
        personasContent += `- **Emoji Level:** ${escapeMarkdown(style.emoji_level || 'Not specified')}\n`;
        personasContent += `- **Sentence Length:** ${escapeMarkdown(style.sentence_length || 'Not specified')}\n`;
        if (style.do?.length > 0) {
          personasContent += `- **Do:** ${style.do.map(item => escapeMarkdown(item)).join(', ')}\n`;
        }
        if (style.dont?.length > 0) {
          personasContent += `- **Don't:** ${style.dont.map(item => escapeMarkdown(item)).join(', ')}\n`;
        }
      }
      personasContent += `\n---\n\n`;
    });
    files['personas.md'] = personasContent;
  }
  
  // Fact Types
  if (exportData.fact_types?.length > 0) {
    let factTypesContent = `# Fact Types\n\n`;
    exportData.fact_types.forEach(type => {
      factTypesContent += `## ${escapeMarkdown(type.display_name || type.type_key || 'Unnamed Type')}\n\n`;
      if (type.description) {
        factTypesContent += `${escapeMarkdown(type.description)}\n\n`;
      }
      if (type.color_class || type.color) {
        factTypesContent += `**Color:** ${type.color_class || type.color}\n\n`;
      }
      factTypesContent += `---\n\n`;
    });
    files['fact-types.md'] = factTypesContent;
  }
  
  // Questions
  if (exportData.questions?.length > 0) {
    let questionsContent = `# Saved Questions\n\n`;
    exportData.questions.forEach((question, index) => {
      questionsContent += `## Question ${index + 1}\n\n`;
      questionsContent += `**Question:** ${escapeMarkdown(question.question || 'No question text')}\n\n`;
      if (question.context) {
        questionsContent += `**Context:** ${escapeMarkdown(question.context)}\n\n`;
      }
      if (question.tags?.length > 0) {
        questionsContent += `**Tags:** ${question.tags.map(tag => `\`${escapeMarkdown(tag)}\``).join(', ')}\n\n`;
      }
      questionsContent += `**Created:** ${formatMarkdownDate(question.created_at)}\n\n`;
      questionsContent += `---\n\n`;
    });
    files['questions.md'] = questionsContent;
  }
  
  // Facts
  if (exportData.facts?.length > 0) {
    let factsContent = `# Facts\n\n`;
    exportData.facts.forEach((fact, index) => {
      factsContent += `## Fact ${index + 1}\n\n`;
      if (fact.content) {
        factsContent += `${escapeMarkdown(fact.content)}\n\n`;
      }
      if (fact.description && fact.description !== fact.content) {
        factsContent += `**Description:** ${escapeMarkdown(fact.description)}\n\n`;
      }
      if (fact.tags?.length > 0) {
        factsContent += `**Tags:** ${fact.tags.map(tag => `\`${escapeMarkdown(tag)}\``).join(', ')}\n\n`;
      }
      factsContent += `**Created:** ${formatMarkdownDate(fact.created_at)}\n\n`;
      factsContent += `---\n\n`;
    });
    files['facts.md'] = factsContent;
  }
  
  // Conversations - organized by session
  if (exportData.sessions?.length > 0 && exportData.messages?.length > 0) {
    // Group messages by session
    const messagesBySession = {};
    exportData.messages.forEach(message => {
      if (!messagesBySession[message.session_id]) {
        messagesBySession[message.session_id] = [];
      }
      messagesBySession[message.session_id].push(message);
    });
    
    // Sort sessions by date
    const sortedSessions = [...exportData.sessions].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    sortedSessions.forEach((session, index) => {
      const sessionName = session.session_name || `Session ${index + 1}`;
      const safeName = sessionName.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '-');
      const filename = `conversations/${String(index + 1).padStart(2, '0')}-${safeName}.md`;
      
      let sessionContent = `# ${escapeMarkdown(sessionName)}\n\n`;
      sessionContent += `**Date:** ${session.session_date || 'Unknown'}\n`;
      if (session.topic_summary) {
        sessionContent += `**Topic:** ${escapeMarkdown(session.topic_summary)}\n`;
      }
      sessionContent += `**Status:** ${session.is_active ? 'Active' : 'Inactive'}\n\n`;
      sessionContent += `---\n\n`;
      
      // Add messages for this session
      const sessionMessages = messagesBySession[session.id] || [];
      if (sessionMessages.length > 0) {
        // Sort messages by creation date
        const sortedMessages = [...sessionMessages].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        
        sortedMessages.forEach((message) => {
          const roleIcon = message.role === 'user' ? '👤' : '🤖';
          const roleName = message.role === 'user' ? 'User' : 'Wiskr';
          
          sessionContent += `## ${roleIcon} ${roleName}\n\n`;
          sessionContent += `*${formatMarkdownDate(message.created_at)}*\n\n`;
          
          if (message.content) {
            // Split content into paragraphs and escape
            const paragraphs = message.content.split('\n\n');
            paragraphs.forEach(paragraph => {
              if (paragraph.trim()) {
                sessionContent += `${escapeMarkdown(paragraph.trim())}\n\n`;
              }
            });
          }
          
          if (message.branch_id && message.branch_id !== 'main') {
            sessionContent += `*Branch: ${escapeMarkdown(message.branch_id)}*\n\n`;
          }
          
          sessionContent += `---\n\n`;
        });
      } else {
        sessionContent += `*No messages in this session*\n\n`;
      }
      
      files[filename] = sessionContent;
    });
  }
  
  return files;
}

/**
 * Convert markdown-style text to TextRun array with formatting
 * @param {string} text - Text that may contain markdown formatting
 * @param {Object} defaultStyle - Default style options
 * @returns {Promise<Array>} Array of TextRun objects
 */
async function parseMarkdownToTextRuns(text, defaultStyle = {}) {
  if (!text) return [];
  
  const { TextRun } = await import('docx');
  const runs = [];
  
  // Simple sequential processing for markdown patterns
  let remainingText = text;
  let currentIndex = 0;
  
  const patterns = [
    // Bold: **text** or __text__ (process these first as they're more specific)
    { regex: /\*\*([^*]+?)\*\*/g, style: { bold: true } },
    { regex: /__([^_]+?)__/g, style: { bold: true } },
    // Italic: *text* or _text_ (but not when part of bold)
    { regex: /\*([^*]+?)\*/g, style: { italics: true } },
    { regex: /_([^_]+?)_/g, style: { italics: true } },
    // Underline: <u>text</u>
    { regex: /<u>([^<]+?)<\/u>/gi, style: { underline: {} } },
    // Strikethrough: ~~text~~
    { regex: /~~([^~]+?)~~/g, style: { strike: true } },
    // Code: `text` (monospace font)
    { regex: /`([^`]+?)`/g, style: { font: 'Consolas', color: '333333' } }
  ];
  
  // Process text sequentially
  const segments = [];
  
  // Find all matches across all patterns
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
    while ((match = regex.exec(text)) !== null) {
      segments.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1], // The captured group (text without markdown)
        style: pattern.style,
        original: match[0] // The full match including markdown
      });
    }
  });
  
  // Sort segments by start position
  segments.sort((a, b) => a.start - b.start);
  
  // Remove overlapping segments (keep the first one)
  const cleanSegments = [];
  let lastEnd = 0;
  
  segments.forEach(segment => {
    if (segment.start >= lastEnd) {
      cleanSegments.push(segment);
      lastEnd = segment.end;
    }
  });
  
  if (cleanSegments.length === 0) {
    // No formatting found, return single run
    return [new TextRun({ text, ...defaultStyle })];
  }
  
  // Build TextRuns
  let currentPos = 0;
  
  cleanSegments.forEach(segment => {
    // Add text before this segment
    if (segment.start > currentPos) {
      const beforeText = text.substring(currentPos, segment.start);
      if (beforeText) {
        runs.push(new TextRun({ text: beforeText, ...defaultStyle }));
      }
    }
    
    // Add the formatted segment
    runs.push(new TextRun({ 
      text: segment.content, 
      ...defaultStyle,
      ...segment.style 
    }));
    
    currentPos = segment.end;
  });
  
  // Add remaining text
  if (currentPos < text.length) {
    const remainingText = text.substring(currentPos);
    if (remainingText) {
      runs.push(new TextRun({ text: remainingText, ...defaultStyle }));
    }
  }
  
  return runs;
}

/**
 * Generate DOCX document with all project data
 * @param {Object} exportData - The export data
 * @returns {Promise<Buffer>} DOCX document buffer
 */
export async function generateDocx(exportData) {
  const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, UnderlineType } = await import('docx');
  
  const project = exportData.project || {};
  const stats = exportData.meta?.statistics || {};
  
  // Default font styles - clean sans-serif
  const defaultFont = 'Calibri'; // Clean, readable sans-serif font
  const headingFont = 'Calibri'; // Consistent font throughout
  const baseTextStyle = {
    font: defaultFont,
    size: 22 // 11pt
  };
  const headingTextStyle = {
    font: headingFont,
    bold: true
  };
  
  // Document sections
  const children = [];
  
  // Title
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: project.name || 'Untitled Project',
          bold: true,
          size: 32,
        }),
      ],
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );
  
  // Project Description
  if (project.description) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Description',
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: project.description,
            size: 22,
          }),
        ],
        spacing: { after: 200 },
      })
    );
  }
  
  // Project Information
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Project Information',
          bold: true,
          size: 24,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );
  
  const projectInfo = [
    `Created: ${formatDocxDate(project.created_at)}`,
    `Icon: ${project.icon || '📁'}`,
    `Export Date: ${formatDocxDate(exportData.meta?.export_date)}`,
  ];
  
  projectInfo.forEach(info => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${info}`,
            size: 20,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  });
  
  // Handle brief text separately with markdown parsing
  if (project.brief_text) {
    const briefRuns = await parseMarkdownToTextRuns(project.brief_text, {
      font: defaultFont,
      size: 20
    });
    
    const briefParagraph = new Paragraph({
      children: [
        new TextRun({
          text: '• Brief: ',
          size: 20,
        }),
        ...briefRuns
      ],
      spacing: { after: 100 },
    });
    
    children.push(briefParagraph);
  }
  
  // Export Statistics
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'Export Statistics',
          bold: true,
          size: 24,
        }),
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 200 },
    })
  );
  
  const statisticsInfo = [
    `Sessions: ${stats.sessions_count || 0}`,
    `Messages: ${stats.messages_count || 0}`,
    `Facts: ${stats.facts_count || 0}`,
    `Questions: ${stats.questions_count || 0}`,
    `Fact Types: ${stats.fact_types_count || 0}`,
  ];
  
  statisticsInfo.forEach(stat => {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `• ${stat}`,
            size: 20,
          }),
        ],
        spacing: { after: 100 },
      })
    );
  });
  
  // Wiskr Personas
  if (exportData.personas?.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Wiskr Personas',
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    
    exportData.personas.forEach(persona => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: persona.name || 'Unnamed Persona',
              bold: true,
              size: 22,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      if (persona.style_json) {
        const style = typeof persona.style_json === 'string' ? 
          JSON.parse(persona.style_json) : persona.style_json;
        
        const personaDetails = [
          `Tone: ${style.tone || 'Not specified'}`,
          `Emoji Level: ${style.emoji_level || 'Not specified'}`,
          `Sentence Length: ${style.sentence_length || 'Not specified'}`,
          ...(style.do?.length > 0 ? [`Do: ${style.do.join(', ')}`] : []),
          ...(style.dont?.length > 0 ? [`Don't: ${style.dont.join(', ')}`] : []),
        ];
        
        personaDetails.forEach(detail => {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `• ${detail}`,
                  size: 20,
                }),
              ],
              spacing: { after: 100 },
            })
          );
        });
      }
    });
  }
  
  // Fact Types
  if (exportData.fact_types?.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Fact Types',
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    
    exportData.fact_types.forEach(type => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: type.display_name || type.type_key || 'Unnamed Type',
              bold: true,
              size: 22,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      if (type.description) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: type.description,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      
      if (type.color_class || type.color) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Color: ${type.color_class || type.color}`,
                size: 20,
                italics: true,
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }
    });
  }
  
  // Saved Questions
  if (exportData.questions?.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Saved Questions',
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    
    exportData.questions.forEach((question, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Question ${index + 1}`,
              bold: true,
              size: 22,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: 'Question: ',
              bold: true,
              size: 20,
            }),
            new TextRun({
              text: question.question || 'No question text',
              size: 20,
            }),
          ],
          spacing: { after: 100 },
        })
      );
      
      if (question.context) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Context: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: question.context,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      
      if (question.tags?.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Tags: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: question.tags.join(', '),
                size: 20,
                italics: true,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Created: ${formatDocxDate(question.created_at)}`,
              size: 18,
              italics: true,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }
  
  // Facts
  if (exportData.facts?.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Facts',
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    
    exportData.facts.forEach((fact, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Fact ${index + 1}`,
              bold: true,
              size: 22,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        })
      );
      
      if (fact.content) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: fact.content,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      
      if (fact.description && fact.description !== fact.content) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Description: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: fact.description,
                size: 20,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      
      if (fact.tags?.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Tags: ',
                bold: true,
                size: 20,
              }),
              new TextRun({
                text: fact.tags.join(', '),
                size: 20,
                italics: true,
              }),
            ],
            spacing: { after: 100 },
          })
        );
      }
      
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Created: ${formatDocxDate(fact.created_at)}`,
              size: 18,
              italics: true,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    });
  }
  
  // Conversation Sessions
  if (exportData.sessions?.length > 0 && exportData.messages?.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Conversation Sessions',
            bold: true,
            size: 24,
          }),
        ],
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      })
    );
    
    // Group messages by session
    const messagesBySession = {};
    exportData.messages.forEach(message => {
      if (!messagesBySession[message.session_id]) {
        messagesBySession[message.session_id] = [];
      }
      messagesBySession[message.session_id].push(message);
    });
    
    // Sort sessions by date
    const sortedSessions = [...exportData.sessions].sort((a, b) => 
      new Date(a.created_at) - new Date(b.created_at)
    );
    
    // Process sessions sequentially to handle async operations
    for (const session of sortedSessions) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: session.session_name || 'Unnamed Session',
              bold: true,
              size: 22,
            }),
          ],
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 100 },
        })
      );
      
      const sessionInfo = [
        `Date: ${session.session_date || 'Unknown'}`,
        ...(session.topic_summary ? [`Topic: ${session.topic_summary}`] : []),
        `Status: ${session.is_active ? 'Active' : 'Inactive'}`,
      ];
      
      sessionInfo.forEach(info => {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: info,
                size: 18,
                italics: true,
              }),
            ],
            spacing: { after: 50 },
          })
        );
      });
      
      // Add messages for this session
      const sessionMessages = messagesBySession[session.id] || [];
      if (sessionMessages.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: 'Messages',
                bold: true,
                size: 20,
                underline: { type: UnderlineType.SINGLE },
              }),
            ],
            spacing: { before: 200, after: 100 },
          })
        );
        
        // Sort messages by creation date
        const sortedMessages = [...sessionMessages].sort((a, b) => 
          new Date(a.created_at) - new Date(b.created_at)
        );
        
        // Process messages sequentially to handle async markdown parsing
        for (const message of sortedMessages) {
          const roleIcon = message.role === 'user' ? '👤' : '🤖';
          const roleName = message.role === 'user' ? 'User' : 'Wiskr';
          
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${roleIcon} ${roleName}`,
                  bold: true,
                  size: 18,
                }),
                new TextRun({
                  text: ` (${formatDocxDate(message.created_at)})`,
                  size: 16,
                  italics: true,
                }),
              ],
              spacing: { before: 150, after: 50 },
            })
          );
          
          if (message.content) {
            // Split content into paragraphs and process markdown formatting
            const paragraphs = message.content.split('\n\n');
            const processedParagraphs = await Promise.all(
              paragraphs.map(async (paragraph) => {
                if (paragraph.trim()) {
                  return await parseMarkdownToTextRuns(paragraph.trim(), {
                    font: defaultFont,
                    size: 18
                  });
                }
                return null;
              })
            );
            
            processedParagraphs.forEach(formattedRuns => {
              if (formattedRuns) {
                children.push(
                  new Paragraph({
                    children: formattedRuns,
                    spacing: { after: 100 },
                  })
                );
              }
            });
          }
          
          if (message.branch_id && message.branch_id !== 'main') {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Branch: ${message.branch_id}`,
                    size: 16,
                    italics: true,
                    color: '666666',
                  }),
                ],
                spacing: { after: 100 },
              })
            );
          }
        }
      }
    }
  }
  
  // Create the document with font settings
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
    creator: 'Wiskr',
    title: project.name || 'Wiskr Project Export',
    description: project.description || 'Project export from Wiskr',
    // Default document font settings
    styles: {
      paragraphStyles: [
        {
          id: 'Normal',
          name: 'Normal',
          basedOn: 'Normal',
          next: 'Normal',
          run: {
            font: defaultFont,
            size: 22
          }
        }
      ]
    }
  });
  
  // Generate and return the buffer
  return await Packer.toBuffer(doc);
}

/**
 * Format date for DOCX document
 * @param {string} dateStr - ISO date string
 * @returns {string} Formatted date
 */
function formatDocxDate(dateStr) {
  if (!dateStr) return 'Unknown';
  return new Date(dateStr).toLocaleString();
}
