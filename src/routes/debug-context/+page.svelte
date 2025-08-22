<script>
  let projectId = '';
  let userMessage = 'Tell me about this project';
  let result = null;
  let loading = false;
  let error = null;

  async function testAPI() {
    if (!projectId.trim()) {
      error = 'Please enter a project ID';
      return;
    }

    loading = true;
    error = null;
    result = null;

    try {
      console.log('🧪 Testing API with:', { projectId, userMessage });
      
      const response = await fetch('/api/context/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, userMessage })
      });

      console.log('📡 Response:', response.status, response.statusText);

      const text = await response.text();
      console.log('📄 Response text:', text);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      result = JSON.parse(text);
      console.log('✅ Parsed result:', result);
    } catch (err) {
      console.error('❌ Error:', err);
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-2xl font-bold mb-6">Context Analysis API Debug</h1>
  
  <div class="bg-white dark:bg-gray-800 rounded-lg border p-6 mb-6">
    <h2 class="text-lg font-semibold mb-4">Test Parameters</h2>
    
    <div class="space-y-4">
      <div>
        <label for="projectId" class="block text-sm font-medium mb-2">Project ID:</label>
        <input
          id="projectId"
          type="text"
          bind:value={projectId}
          placeholder="Enter project ID to test"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      <div>
        <label for="userMessage" class="block text-sm font-medium mb-2">User Message:</label>
        <input
          id="userMessage"
          type="text"
          bind:value={userMessage}
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      <button
        on:click={testAPI}
        disabled={loading}
        class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Testing...' : 'Test API'}
      </button>
    </div>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <h3 class="text-red-800 font-medium">Error:</h3>
      <p class="text-red-700">{error}</p>
    </div>
  {/if}

  {#if result}
    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
      <h3 class="text-green-800 font-medium mb-2">Success! API Response:</h3>
      
      {#if result.metrics}
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div class="text-sm">
            <div class="font-medium">Estimated Tokens:</div>
            <div>{result.metrics.estimatedTokens}</div>
          </div>
          <div class="text-sm">
            <div class="font-medium">Quality Score:</div>
            <div>{result.summary?.contextQualityScore}/100</div>
          </div>
          <div class="text-sm">
            <div class="font-medium">Processing Time:</div>
            <div>{result.metrics.processingTimeMs}ms</div>
          </div>
          <div class="text-sm">
            <div class="font-medium">Sections:</div>
            <div>{result.sections?.length || 0}</div>
          </div>
        </div>
      {/if}
      
      <details class="mt-4">
        <summary class="cursor-pointer font-medium">Raw JSON Response</summary>
        <pre class="mt-2 text-xs bg-gray-100 p-3 rounded overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  {/if}
  
  <div class="text-sm text-gray-600 dark:text-gray-400">
    <p><strong>Note:</strong> This page is for debugging only. Check the browser console for additional logs.</p>
    <p><strong>Tip:</strong> If you don't have a project ID, check the admin dashboard for existing projects.</p>
  </div>
</div>
