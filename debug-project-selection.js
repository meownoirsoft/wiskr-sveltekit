// Debug script for project selection issues
// Run this in browser console on /projects page

console.log('🔍 Starting project selection debug...');

// Check localStorage state
console.log('📋 localStorage contents:');
console.log('- wiskr_last_project_id:', localStorage.getItem('wiskr_last_project_id'));
console.log('- wiskr_model_key:', localStorage.getItem('wiskr_model_key'));

// Check if we can see any projects data in the page
console.log('🔍 Checking for projects in page state...');

// Try to find project data that might be available
if (window.location.pathname === '/projects') {
  // Look for any global variables or components that might have projects
  console.log('📄 Current URL:', window.location.href);
  
  // Check if there are any elements that might indicate projects are loaded
  const projectElements = document.querySelectorAll('[data-project], [data-project-id]');
  console.log('🎯 Found project elements:', projectElements.length);
  
  // Check for any visible project names or UI elements
  const headerText = document.querySelector('h1, h2, .project-name, [class*="project"]');
  if (headerText) {
    console.log('📝 Header/project text found:', headerText.textContent);
  }
  
  // Try to fetch projects directly
  console.log('🔄 Testing projects API...');
  fetch('/api/projects')
    .then(response => {
      console.log('📡 Projects API status:', response.status);
      return response.json();
    })
    .then(data => {
      console.log('✅ Projects API response:', data);
      
      if (data && data.length > 0) {
        console.log('🎯 Available projects:', data.map(p => ({
          id: p.id,
          name: p.name,
          userId: p.user_id
        })));
        
        // Try to set the first project as selected
        const firstProject = data[0];
        console.log('🛠️ Attempting to set first project as selected:', firstProject.name);
        localStorage.setItem('wiskr_last_project_id', firstProject.id);
        console.log('✅ Set localStorage wiskr_last_project_id:', firstProject.id);
        
        // Now try to load sessions for this project
        return fetch(`/api/sessions?projectId=${firstProject.id}`);
      } else {
        console.log('❌ No projects found in API response');
      }
    })
    .then(response => {
      if (response) {
        console.log('📡 Sessions API status:', response.status);
        return response.json();
      }
    })
    .then(sessionData => {
      if (sessionData) {
        console.log('✅ Sessions API response:', sessionData);
        if (sessionData.sessions && sessionData.sessions.length > 0) {
          console.log('🎯 Found sessions:', sessionData.sessions.map(s => ({
            id: s.id,
            name: s.session_name,
            isActive: s.is_active
          })));
        } else {
          console.log('❌ No sessions found for project');
        }
      }
    })
    .catch(error => {
      console.error('❌ API Error:', error);
    });
    
  // Check if there are any error messages in the console that we missed
  console.log('🔍 Check the console above for any loading errors...');
  
} else {
  console.log('❌ Not on /projects page. Current path:', window.location.pathname);
}
