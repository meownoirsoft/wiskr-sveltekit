/**
 * Debug script to trace where the BEDNOMANCER project is coming from
 * 
 * Instructions:
 * 1. Open your browser developer console
 * 2. Copy and paste this entire script
 * 3. Run it to see where the extra project is coming from
 */

console.log('🔍 DEBUG: Tracing BEDNOMANCER project source');
console.log('================================================');

// Check localStorage for any project-related data
console.log('\n📦 localStorage Data:');
const localStorageKeys = Object.keys(localStorage);
const wiskrKeys = localStorageKeys.filter(key => key.includes('wiskr') || key.includes('project'));
wiskrKeys.forEach(key => {
  console.log(`  ${key}: ${localStorage.getItem(key)}`);
});

// Check if there's any cached data in sessionStorage
console.log('\n📦 sessionStorage Data:');
const sessionStorageKeys = Object.keys(sessionStorage);
const wiskrSessionKeys = sessionStorageKeys.filter(key => key.includes('wiskr') || key.includes('project'));
wiskrSessionKeys.forEach(key => {
  console.log(`  ${key}: ${sessionStorage.getItem(key)}`);
});

// Check the current projects array in the Svelte component
console.log('\n🏗️ Current Component State:');
try {
  // Try to access the Svelte component's internal state
  const allElements = document.querySelectorAll('*');
  let projectsFound = false;
  
  for (let el of allElements) {
    if (el.__svelte_meta) {
      console.log('  Found Svelte component:', el.__svelte_meta);
    }
    // Check if element has any data attributes that might contain project info
    for (let attr of el.attributes || []) {
      if (attr.name.includes('project') || attr.value.includes('BEDNOMANCER')) {
        console.log(`  Found project reference in DOM: ${attr.name}="${attr.value}"`);
      }
    }
  }
} catch (e) {
  console.log('  Could not access component state directly');
}

// Check for any global variables that might contain projects
console.log('\n🌐 Global Variables:');
if (window.projects) {
  console.log('  window.projects:', window.projects);
}

// Check for any data in the window that might be cached
const windowKeys = Object.keys(window).filter(key => 
  key.includes('project') || key.includes('data') || key.includes('cache')
);
windowKeys.forEach(key => {
  if (typeof window[key] === 'object') {
    console.log(`  window.${key}:`, window[key]);
  }
});

// Check if there are any fetch interceptors or service workers
console.log('\n🌐 Network Layer:');
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    console.log('  Service Workers:', registrations.length);
  });
}

// Look for any hardcoded data in script tags
console.log('\n📜 Script Tags Check:');
const scripts = document.querySelectorAll('script');
let foundHardcodedData = false;
scripts.forEach((script, index) => {
  if (script.textContent && script.textContent.includes('BEDNOMANCER')) {
    console.log(`  Script ${index} contains BEDNOMANCER:`, script.textContent.substring(0, 200) + '...');
    foundHardcodedData = true;
  }
});
if (!foundHardcodedData) {
  console.log('  No hardcoded BEDNOMANCER found in script tags');
}

// Check the actual DOM for any hidden project data
console.log('\n🏠 DOM Content Check:');
const bodyText = document.body.textContent;
if (bodyText.includes('BEDNOMANCER')) {
  console.log('  ⚠️ BEDNOMANCER found in DOM content');
  // Find the specific element
  const elements = document.querySelectorAll('*');
  for (let el of elements) {
    if (el.textContent && el.textContent.includes('BEDNOMANCER')) {
      console.log('  Found in element:', el.tagName, el.className, el.textContent.substring(0, 100));
    }
  }
} else {
  console.log('  No BEDNOMANCER found in DOM content');
}

// Check for any React/Svelte devtools data
console.log('\n🛠️ Framework State:');
if (window.__SVELTE__) {
  console.log('  Svelte devtools available');
}

// Monitor the HeaderProjectSelector component specifically
console.log('\n📋 HeaderProjectSelector Analysis:');
const headerElements = document.querySelectorAll('[class*="HeaderProject"], [class*="dropdown"], button');
headerElements.forEach((el, index) => {
  if (el.textContent && el.textContent.includes('BEDNOMANCER')) {
    console.log(`  Element ${index} shows BEDNOMANCER:`, {
      tagName: el.tagName,
      className: el.className,
      textContent: el.textContent,
      innerHTML: el.innerHTML.substring(0, 200)
    });
  }
});

console.log('\n✅ Debug complete! Check the output above to find where BEDNOMANCER is coming from.');
console.log('\n💡 Next steps:');
console.log('1. If found in localStorage, clear it: localStorage.removeItem("key")');
console.log('2. If found in DOM, it might be cached component state');
console.log('3. If found in network data, check your database/API');
console.log('4. Try a hard refresh (Ctrl+Shift+R) to clear any cached data');
