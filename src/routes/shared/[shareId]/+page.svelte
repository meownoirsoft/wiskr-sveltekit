<script>
  import { enhance } from '$app/forms';
  import { Lock, Eye } from 'lucide-svelte';
  import SharedProjectView from '$lib/components/SharedProjectView.svelte';
  
  export let data;
  export let form;
  
  let submitting = false;
</script>

<svelte:head>
  <title>{data.needsPassword ? `${data.projectName} - Password Required` : `${data.project?.name} - Shared Project`}</title>
</svelte:head>

{#if data.needsPassword}
  <!-- Password Protection Screen -->
  <div class="min-h-screen flex items-center justify-center px-4" style="background-color: #1b1b1e;">
    <div class="w-full max-w-md">
      <div class="text-center mb-8">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
             style="background-color: rgba(59, 130, 246, 0.1); color: #3B82F6;">
          <Lock size="32" />
        </div>
        <h1 class="text-2xl font-bold text-white mb-2">Password Protected Project</h1>
        <p class="text-gray-400">Enter the password to access "{data.projectName}"</p>
      </div>

      <form method="POST" action="?/verifyPassword" use:enhance={() => {
        submitting = true;
        return async ({ update }) => {
          submitting = false;
          await update();
        };
      }}>
        <div class="space-y-4">
          <div>
            <label for="password" class="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              required
              class="w-full px-3 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
              style="background-color: #1b1b1e; border-color: #444;"
              placeholder="Enter project password"
              disabled={submitting}
            />
          </div>

          {#if form?.error}
            <div class="p-3 rounded-lg border border-red-500/20" style="background-color: rgba(239, 68, 68, 0.1);">
              <p class="text-red-400 text-sm">{form.error}</p>
            </div>
          {/if}

          <button
            type="submit"
            disabled={submitting}
            class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {#if submitting}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Verifying...
            {:else}
              <Eye size="18" />
              Access Project
            {/if}
          </button>
        </div>
      </form>

      <div class="mt-8 text-center">
        <p class="text-xs text-gray-500">
          Don't have the password? Contact the project owner.
        </p>
      </div>
    </div>
  </div>
{:else}
  <!-- Show the shared project -->
  <SharedProjectView 
    project={data.project} 
    sessions={data.sessions}
    shareId={data.shareId}
  />
{/if}
