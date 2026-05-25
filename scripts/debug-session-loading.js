// Debug script for session loading issues
// Run this in browser console on /projects page

console.log('🔍 Starting session loading debug...');

// Function to test session loading
async function debugSessionLoading() {
  // Get current project from the page
  const projectId = localStorage.getItem('wiskr_last_project_id');
  console.log('📋 Current project ID from localStorage:', projectId);
  
  if (!projectId) {
    console.log('❌ No project ID found in localStorage');
    return;
  }
  
  try {
    // Test the sessions API directly
    console.log('🔄 Testing sessions API...');
    const response = await fetch(`/api/sessions?projectId=${projectId}`);
    
    console.log('📡 Sessions API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Sessions API error:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('✅ Sessions API response:', data);
    
    if (data.sessions && data.sessions.length > 0) {
      console.log('🎯 Sessions found in API:', data.sessions.map(s => ({
        id: s.id,
        name: s.session_name,
        isActive: s.is_active,
        projectId: s.project_id
      })));
    } else {
      console.log('❌ No sessions returned by API');
    }
    
    // Test if we can create a session
    console.log('🛠️ Testing session creation...');
    const createResponse = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        projectId: projectId,
        sessionName: 'Debug Test Session',
        topicSummary: 'Debug session created by test script'
      })
    });
    
    console.log('📡 Session creation response status:', createResponse.status);
    
    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.log('❌ Session creation error:', errorText);
    } else {
      const createData = await createResponse.json();
      console.log('✅ Session creation successful:', createData);
    }
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

// Run the debug
debugSessionLoading();
