<script>
  import { onMount } from 'svelte';
  
  export let testProp = 'Hello from lazy component!';
  export let delay = 1000; // Simulate slow component
  
  let mounted = false;
  let loadTime = 0;
  
  onMount(() => {
    const startTime = Date.now();
    
    // Simulate some initialization work
    setTimeout(() => {
      mounted = true;
      loadTime = Date.now() - startTime;
      
      // Dispatch mount event
      if (typeof CustomEvent !== 'undefined') {
        const event = new CustomEvent('mount');
        document.dispatchEvent(event);
      }
    }, delay);
  });
</script>

<div class="test-lazy-component">
  <div class="header">
    <h3>🚀 Lazy Loaded Component</h3>
    <div class="status" class:mounted>
      {mounted ? '✅ Loaded' : '⏳ Loading...'}
    </div>
  </div>
  
  <div class="content">
    <p><strong>Test Prop:</strong> {testProp}</p>
    {#if mounted}
      <p><strong>Load Time:</strong> {loadTime}ms</p>
      <div class="features">
        <h4>Features:</h4>
        <ul>
          <li>✅ Intersection Observer Loading</li>
          <li>✅ Error Handling & Retry</li>
          <li>✅ Loading States</li>
          <li>✅ Event Forwarding</li>
          <li>✅ Props Passing</li>
        </ul>
      </div>
    {:else}
      <div class="loading-animation">
        <div class="spinner"></div>
        <p>Initializing component...</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .test-lazy-component {
    border: 2px solid rgb(59 130 246);
    border-radius: 8px;
    padding: 1rem;
    background: rgb(239 246 255);
    margin: 1rem 0;
  }
  
  :global(.dark) .test-lazy-component {
    background: rgb(30 41 59);
    border-color: rgb(96 165 250);
  }
  
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    border-bottom: 1px solid rgb(203 213 225);
    padding-bottom: 0.5rem;
  }
  
  :global(.dark) .header {
    border-bottom-color: rgb(71 85 105);
  }
  
  .header h3 {
    margin: 0;
    color: rgb(30 41 59);
    font-size: 1.125rem;
  }
  
  :global(.dark) .header h3 {
    color: rgb(226 232 240);
  }
  
  .status {
    padding: 0.25rem 0.75rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 600;
    background: rgb(254 240 138);
    color: rgb(146 64 14);
  }
  
  .status.mounted {
    background: rgb(187 247 208);
    color: rgb(20 83 45);
  }
  
  :global(.dark) .status {
    background: rgb(133 77 14);
    color: rgb(254 240 138);
  }
  
  :global(.dark) .status.mounted {
    background: rgb(22 101 52);
    color: rgb(187 247 208);
  }
  
  .content p {
    margin: 0.5rem 0;
    color: rgb(51 65 85);
  }
  
  :global(.dark) .content p {
    color: rgb(203 213 225);
  }
  
  .features h4 {
    margin: 1rem 0 0.5rem;
    color: rgb(30 41 59);
  }
  
  :global(.dark) .features h4 {
    color: rgb(226 232 240);
  }
  
  .features ul {
    margin: 0;
    padding-left: 1.5rem;
  }
  
  .features li {
    margin: 0.25rem 0;
    color: rgb(51 65 85);
  }
  
  :global(.dark) .features li {
    color: rgb(203 213 225);
  }
  
  .loading-animation {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    text-align: center;
  }
  
  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid rgb(203 213 225);
    border-top: 3px solid rgb(59 130 246);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 1rem;
  }
  
  :global(.dark) .spinner {
    border-color: rgb(71 85 105);
    border-top-color: rgb(96 165 250);
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .loading-animation p {
    margin: 0;
    font-size: 0.875rem;
    color: rgb(107 114 128);
  }
  
  :global(.dark) .loading-animation p {
    color: rgb(156 163 175);
  }
</style>
