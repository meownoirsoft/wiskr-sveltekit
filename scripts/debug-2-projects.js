/**
 * Enhanced debug script to trace why there are 2 projects
 * 
 * Instructions:
 * 1. Open your browser developer console
 * 2. Copy and paste this entire script
 * 3. Run it to see exactly what the 2 projects are
 */

console.log('🔍 DEBUG: Tracing the 2 projects issue');
console.log('=========================================');

// Hook into the layout event to see exactly what projects are being sent
let originalDispatchEvent = window.dispatchEvent;
window.dispatchEvent = function(event) {
  if (event.type === 'layout:update-projects') {
    console.log('\n📡 Intercepted layout:update-projects event:');
    console.log('Projects being sent to layout:', event.detail.projects);
    console.log('Current project ID:', event.detail.currentProjectId);
    
    // Log each project individually
    event.detail.projects.forEach((project, index) => {
      console.log(`  Project ${index + 1}:`, {
        id: project.id,
        name: project.name,
        user_id: project.user_id,
        created_at: project.created_at,
        description: project.description
      });
    });
  }
  
  return originalDispatchEvent.call(this, event);
};

// Check what's currently in the HeaderProjectSelector
console.log('\n📋 Current HeaderProjectSelector state:');
const headerButtons = document.querySelectorAll('button');
let projectDropdownFound = false;

headerButtons.forEach(button => {
  if (button.textContent.includes('📁') || button.textContent.includes('Select project')) {
    console.log('Found project selector button:', button.textContent);
    projectDropdownFound = true;
    
    // Try to trigger the dropdown to see what projects are listed
    button.click();
    
    setTimeout(() => {
      const dropdownItems = document.querySelectorAll('[class*="dropdown"] button, [class*="project"] button');
      console.log('Projects in dropdown:');
      dropdownItems.forEach((item, index) => {
        if (item.textContent && (item.textContent.includes('📁') || item.textContent.length > 5)) {
          console.log(`  Dropdown item ${index}:`, item.textContent.trim());
        }
      });
      
      // Close dropdown
      button.click();
    }, 100);
  }
});

if (!projectDropdownFound) {
  console.log('No project dropdown found');
}

// Check localStorage for any project data
console.log('\n💾 localStorage project data:');
Object.keys(localStorage).forEach(key => {
  if (key.includes('project') || key.includes('wiskr')) {
    console.log(`  ${key}: ${localStorage.getItem(key)}`);
  }
});

// Monitor network requests to see if multiple project calls are being made
console.log('\n🌐 Setting up network monitoring...');
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  if (url.includes('projects') || url.includes('/api/')) {
    console.log('📞 API Call:', {
      url: url,
      method: options?.method || 'GET',
      timestamp: new Date().toISOString()
    });
  }
  
  return originalFetch.apply(this, arguments).then(response => {
    if (url.includes('projects')) {
      response.clone().json().then(data => {
        console.log('📥 API Response for', url, ':', data);
      }).catch(() => {
        console.log('📥 API Response for', url, ': (not JSON)');
      });
    }
    return response;
  });
};

// Check if there are any Svelte stores or reactive variables with project data
console.log('\n🎭 Checking for reactive project data...');
setTimeout(() => {
  // Look for any global variables that might contain projects
  Object.keys(window).forEach(key => {
    if (key.includes('project') || key.includes('data')) {
      console.log(`Found window.${key}:`, window[key]);
    }
  });
}, 1000);

console.log('\n✅ Debug setup complete! Watch the console for events...');
console.log('\n💡 Try these actions to trigger events:');
console.log('1. Click the project dropdown in the header');
console.log('2. Refresh the page');
console.log('3. Create a new project');
console.log('4. Switch between projects');
