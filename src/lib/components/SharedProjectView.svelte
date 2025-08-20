<script>
  import { Eye, Lock, Calendar, User } from 'lucide-svelte';
  import { page } from '$app/stores';
  
  export let project;
  export let sessions = [];
  export let shareId;
  
  // Group messages by branch for display
  function groupMessagesByBranch(sessions) {
    const grouped = {};
    
    sessions.forEach(session => {
      session.conversation_branches?.forEach(branch => {
        if (!grouped[branch.id]) {
          grouped[branch.id] = {
            ...branch,
            sessionDate: session.created_at,
            messages: branch.messages || []
          };
        }
      });
    });
    
    return Object.values(grouped).sort((a, b) => 
      new Date(b.sessionDate) - new Date(a.sessionDate)
    );
  }
  
  $: branches = groupMessagesByBranch(sessions);
  
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
</script>

<svelte:head>
  <title>{project.name} - Shared Project</title>
  <meta name="description" content={project.description || `Shared project: ${project.name}`} />
</svelte:head>

<div class="min-h-screen" style="background-color: #1b1b1e;">
  <div class="container mx-auto px-4 py-8">
    <!-- Header Section -->
    <div class="mb-8 p-6 rounded-lg border" style="background-color: #35353d; border-color: #444;">
      <div class="flex items-start justify-between mb-4">
        <div class="flex items-center gap-3">
          {#if project.icon}
            <div class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                 style="background-color: {project.color || '#3B82F6'};">
              {project.icon}
            </div>
          {/if}
          <div>
            <h1 class="text-3xl font-bold text-white">{project.name}</h1>
            <div class="flex items-center gap-4 mt-2 text-gray-400">
              <div class="flex items-center gap-1">
                <Eye size="16" />
                <span class="text-sm">Shared Project</span>
              </div>
              {#if project.createdAt}
                <div class="flex items-center gap-1">
                  <Calendar size="16" />
                  <span class="text-sm">Created {formatDate(project.createdAt)}</span>
                </div>
              {/if}
              {#if project.owner?.full_name}
                <div class="flex items-center gap-1">
                  <User size="16" />
                  <span class="text-sm">by {project.owner.full_name}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      </div>
      
      {#if project.description}
        <div class="prose prose-invert max-w-none">
          <p class="text-gray-300 text-lg leading-relaxed">{project.description}</p>
        </div>
      {/if}
      
      {#if project.briefText}
        <div class="mt-4 p-4 rounded-md" style="background-color: #1b1b1e;">
          <h3 class="text-sm font-medium text-gray-400 mb-2">Project Brief</h3>
          <p class="text-gray-300">{project.briefText}</p>
        </div>
      {/if}
    </div>

    <!-- Conversations Section -->
    {#if branches.length > 0}
      <div class="space-y-6">
        <div class="flex items-center gap-2 mb-6">
          <h2 class="text-2xl font-bold text-white">Conversations</h2>
          <span class="bg-blue-600 text-white px-2 py-1 rounded-full text-sm">
            {branches.length}
          </span>
        </div>

        {#each branches as branch}
          <div class="rounded-lg border p-6" style="background-color: #35353d; border-color: #444;">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-3">
                <div class="w-4 h-4 rounded-full" style="background-color: #3B82F6;"></div>
                <h3 class="text-xl font-semibold text-white">
                  Conversation Branch #{branch.id.slice(-8)}
                </h3>
              </div>
              <div class="text-sm text-gray-400">
                {formatDate(branch.sessionDate)} at {formatTime(branch.created_at)}
              </div>
            </div>

            {#if branch.messages && branch.messages.length > 0}
              <div class="space-y-4">
                {#each branch.messages as message}
                  <div class="flex gap-4 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
                    <div class="max-w-[80%] p-4 rounded-lg {
                      message.role === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-100'
                    }" 
                    style={message.role === 'assistant' ? 'background-color: #1b1b1e;' : ''}>
                      <div class="flex items-center gap-2 mb-2">
                        <span class="text-sm font-medium opacity-75">
                          {message.role === 'user' ? 'You' : 'Wiskr'}
                        </span>
                        <span class="text-xs opacity-60">
                          {formatTime(message.created_at)}
                        </span>
                      </div>
                      <div class="prose prose-sm {message.role === 'user' ? 'prose-invert' : 'prose-invert'} max-w-none">
                        <p class="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="text-center text-gray-500 py-8">
                <p>No messages in this conversation yet.</p>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="text-center py-12">
        <div class="text-gray-500 mb-4">
          <Eye size="48" class="mx-auto opacity-50" />
        </div>
        <h3 class="text-xl font-medium text-gray-400 mb-2">No Conversations Yet</h3>
        <p class="text-gray-500">This project doesn't have any conversations to display.</p>
      </div>
    {/if}

    <!-- Footer -->
    <div class="mt-12 pt-8 border-t text-center text-gray-500" style="border-color: #444;">
      <p class="text-sm">
        Shared via <span class="font-medium text-white">Wiskr</span>
      </p>
    </div>
  </div>
</div>
