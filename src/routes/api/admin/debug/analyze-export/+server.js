import { json } from '@sveltejs/kit';
import { isAdmin } from '$lib/auth/admin';
import JSZip from 'jszip';

export async function POST({ request, locals }) {
  try {
    // Check admin permissions
    const adminCheck = await isAdmin(locals.supabase, locals.user);
    if (!adminCheck.isAdmin) {
      return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return json({ error: 'No file provided' }, { status: 400 });
    }

    let rawData;

    try {
      if (file.name.endsWith('.zip')) {
        const arrayBuffer = await file.arrayBuffer();
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(arrayBuffer);
        
        const projectFile = zipContents.file('project.json');
        if (!projectFile) {
          return json({ error: 'ZIP file must contain a project.json file' }, { status: 400 });
        }
        
        const projectJson = await projectFile.async('string');
        rawData = JSON.parse(projectJson);
      } else if (file.name.endsWith('.json')) {
        const content = await file.text();
        rawData = JSON.parse(content);
      } else {
        return json({ error: 'File must be a JSON or ZIP file' }, { status: 400 });
      }
    } catch (parseError) {
      return json({ error: 'Invalid file format or corrupted data' }, { status: 400 });
    }

    // Analyze the structure
    const analysis = {
      hasContexts: !!(rawData.contexts && Array.isArray(rawData.contexts)),
      contextCount: rawData.contexts ? rawData.contexts.length : 0,
      
      hasFacts: !!(rawData.facts && Array.isArray(rawData.facts)),
      factCount: rawData.facts ? rawData.facts.length : 0,
      factSample: rawData.facts ? rawData.facts.slice(0, 2) : [],
      
      hasDocs: !!(rawData.docs && Array.isArray(rawData.docs)),
      docCount: rawData.docs ? rawData.docs.length : 0,
      docSample: rawData.docs ? rawData.docs.slice(0, 1) : [],
      
      hasSessions: !!(rawData.sessions && Array.isArray(rawData.sessions)),
      sessionCount: rawData.sessions ? rawData.sessions.length : 0,
      sessionSample: rawData.sessions ? rawData.sessions.slice(0, 1) : [],
      
      hasBranches: !!(rawData.branches && Array.isArray(rawData.branches)),
      branchCount: rawData.branches ? rawData.branches.length : 0,
      branchSample: rawData.branches ? rawData.branches.slice(0, 1) : [],
      
      hasMessages: !!(rawData.messages && Array.isArray(rawData.messages)),
      messageCount: rawData.messages ? rawData.messages.length : 0,
      messageSample: rawData.messages ? rawData.messages.slice(0, 2) : [],
      
      hasQuestions: !!(rawData.questions && Array.isArray(rawData.questions)),
      questionCount: rawData.questions ? rawData.questions.length : 0,
      questionSample: rawData.questions ? rawData.questions.slice(0, 1) : [],
      
      projectInfo: rawData.project ? {
        name: rawData.project.name,
        description: rawData.project.description,
        hasUserId: !!rawData.project.user_id
      } : null,
      
      topLevelKeys: Object.keys(rawData),
      
      exportMeta: rawData.meta || null
    };

    return json({
      success: true,
      filename: file.name,
      fileSize: file.size,
      analysis
    });

  } catch (error) {
    console.error('Export analysis error:', error);
    return json({ error: 'Failed to analyze export file' }, { status: 500 });
  }
}
