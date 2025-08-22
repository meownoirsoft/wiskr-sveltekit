import { json } from '@sveltejs/kit';
import { generateSingleMarkdown, generateMultipleMarkdown, generateExportFilename } from '$lib/server/exportUtils.js';

/**
 * Export a complete project with all associated data
 * @type {import('@sveltejs/kit').RequestHandler}
 */
export async function GET({ params, locals, url }) {
  try {
    const { data: { user } } = await locals.supabase.auth.getUser();
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    const projectId = params.id;
    const format = url.searchParams.get('format') || 'json';
    const includeMessages = url.searchParams.get('includeMessages') !== 'false';
    const includeFacts = url.searchParams.get('includeFacts') !== 'false';
    const includeQuestions = url.searchParams.get('includeQuestions') !== 'false';
    const includeDocs = url.searchParams.get('includeDocs') !== 'false';

    // Verify user has access to this project
    const { data: project, error: projectError } = await locals.supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Initialize export data structure
    const exportData = {
      meta: {
        export_version: '1.0',
        export_date: new Date().toISOString(),
        wiskr_version: 'sveltekit', // Can be updated based on actual version
        project_id: projectId,
        exported_by: user.id
      },
      project: {
        ...project,
        // Remove sensitive internal fields
        user_id: undefined
      },
      sessions: [],
      branches: [],
      messages: [],
      facts: [],
      docs: [],
      questions: [],
      personas: [],
      fact_types: []
    };

    // Get project persona
    if (project.persona_id) {
      const { data: persona } = await locals.supabase
        .from('personas')
        .select('*')
        .eq('id', project.persona_id)
        .eq('user_id', user.id)
        .single();
      
      if (persona) {
        exportData.personas.push({
          ...persona,
          user_id: undefined
        });
      }
    }

    // Get all sessions for this project
    const { data: sessions } = await locals.supabase
      .from('conversation_sessions')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (sessions) {
      exportData.sessions = sessions.map(session => ({
        ...session,
        project_id: undefined // Remove foreign key references
      }));
    }

    // Get all branches for this project
    const { data: branches } = await locals.supabase
      .from('conversation_branches')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (branches) {
      exportData.branches = branches.map(branch => ({
        ...branch,
        project_id: undefined
      }));
    }

    // Get messages if requested
    if (includeMessages) {
      const { data: messages } = await locals.supabase
        .from('messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (messages) {
        exportData.messages = messages.map(message => ({
          ...message,
          project_id: undefined
        }));
      }
    }

    // Get facts if requested
    if (includeFacts) {
      // Get project fact types first
      const { data: factTypes } = await locals.supabase
        .from('project_fact_types')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (factTypes) {
        exportData.fact_types = factTypes.map(type => ({
          ...type,
          project_id: undefined
        }));
      }

      // Get facts (assuming there's a facts table)
      const { data: facts } = await locals.supabase
        .from('facts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (facts) {
        exportData.facts = facts.map(fact => ({
          ...fact,
          project_id: undefined
        }));
      }
    }

    // Get docs if requested
    if (includeDocs) {
      const { data: docs } = await locals.supabase
        .from('docs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (docs) {
        exportData.docs = docs.map(doc => ({
          ...doc,
          project_id: undefined
        }));
      }
    }

    // Get questions if requested
    if (includeQuestions) {
      const { data: questions } = await locals.supabase
        .from('project_questions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (questions) {
        exportData.questions = questions.map(question => ({
          ...question,
          project_id: undefined
        }));
      }
    }

    // Calculate export statistics
    exportData.meta.statistics = {
      sessions_count: exportData.sessions.length,
      branches_count: exportData.branches.length,
      messages_count: exportData.messages.length,
      facts_count: exportData.facts.length,
      docs_count: exportData.docs.length,
      questions_count: exportData.questions.length,
      personas_count: exportData.personas.length,
      fact_types_count: exportData.fact_types.length
    };

    // Handle different export formats
    if (format === 'json') {
      const filename = generateExportFilename(project.name, 'wiskr_project', 'json');
      
      return new Response(JSON.stringify(exportData, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }
    
    if (format === 'markdown-single') {
      const filename = generateExportFilename(project.name, 'wiskr_project', 'md');
      const markdownContent = generateSingleMarkdown(exportData);
      
      return new Response(markdownContent, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }
    
    if (format === 'markdown-multi') {
      // For multiple markdown files, we need to create a ZIP
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      const files = generateMultipleMarkdown(exportData);
      
      // Create project folder
      const projectFolderName = project.name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '-');
      const projectFolder = zip.folder(projectFolderName);
      
      // Add files to zip
      Object.entries(files).forEach(([filename, content]) => {
        if (filename.includes('/')) {
          // Handle subdirectories
          const parts = filename.split('/');
          const dir = parts[0];
          const file = parts[1];
          const subFolder = projectFolder.folder(dir);
          subFolder.file(file, content);
        } else {
          projectFolder.file(filename, content);
        }
      });
      
      // Generate ZIP
      const zipContent = await zip.generateAsync({ type: 'arraybuffer' });
      const zipFilename = generateExportFilename(project.name, 'wiskr_project', 'zip');
      
      return new Response(zipContent, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${zipFilename}"`
        }
      });
    }

    // Default to returning JSON data for preview
    return json(exportData);

  } catch (error) {
    console.error('Project export error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}
