<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Settings, Save, Plus, Trash2, GripVertical, ArrowLeft, Share2 } from 'lucide-svelte';
  import CardTypesManager from '$lib/components/CardTypesManager.svelte';
  import ProjectSharingSettings from '$lib/components/ProjectSharingSettings.svelte';

  export let data;
  
  let projectId = $page.params.id;
  let project = data.project;
  let user = data.user; // User object with tier info
  let activeTab = 'general';
  let projectName = '';
  let projectDescription = '';
  let savingGeneral = false;
  let saveSuccess = false;
  
  // Initialize form values when project changes
  $: if (project) {
    projectName = project.name || '';
    projectDescription = project.description || '';
    console.log('Project loaded:', project);
    console.log('Description set to:', projectDescription);
  }
  
  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    // { id: 'card-types', label: 'Card Types', icon: Settings }, // Hidden for now
    { id: 'sharing', label: 'Sharing', icon: Share2 },
    // Future tabs can be added here
  ];
  
  async function saveGeneralSettings() {
    if (!project?.id) return;
    
    savingGeneral = true;
    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName.trim(),
          description: projectDescription.trim()
        })
      });
      
      if (response.ok) {
        const updatedProject = await response.json();
        // Update the local project object
        project = { ...project, ...updatedProject };
        // Explicitly update the form fields to ensure they reflect the saved data
        projectName = updatedProject.name || '';
        projectDescription = updatedProject.description || '';
        console.log('General settings saved successfully', updatedProject);
        
        // Show success message
        saveSuccess = true;
        setTimeout(() => {
          saveSuccess = false;
        }, 3000);
      } else {
        const error = await response.json();
        console.error('Failed to save general settings:', error);
        alert('Failed to save settings: ' + (error.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving general settings:', error);
      alert('Error saving settings. Please try again.');
    } finally {
      savingGeneral = false;
    }
  }
</script>

<svelte:head>
  <title>Settings - {project?.name || 'Project'}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <div class="mb-8">
    <div class="flex items-center gap-4 mb-4">
      <a 
        href="/projects?builder=1" 
        class="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size="20" />
        Back to Project
      </a>
    </div>
    <h1 class="text-3xl font-bold text-gray-900 mb-2">Project Settings</h1>
    <p class="text-gray-600">Manage your project configuration and preferences for <strong>{project?.name || 'this project'}</strong></p>
  </div>

  <!-- Navigation Tabs -->
  <div class="border-b border-gray-200 mb-8">
    <nav class="-mb-px flex space-x-8">
      {#each tabs as tab}
        <button
          class="py-2 px-1 border-b-2 font-medium text-sm transition-colors
                 {activeTab === tab.id 
                   ? 'border-blue-500 text-blue-600' 
                   : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
          on:click={() => activeTab = tab.id}
        >
          <svelte:component this={tab.icon} class="inline w-4 h-4 mr-2" />
          {tab.label}
        </button>
      {/each}
    </nav>
  </div>

  <!-- Tab Content -->
  <div class="max-w-4xl">
    {#if activeTab === 'card-types'}
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Card Types</h2>
          <p class="text-gray-600">Customize the card types available in your project. You can rename existing types, add new ones, and change their colors.</p>
        </div>
        
        <CardTypesManager {projectId} {user} />
      </div>
    {:else if activeTab === 'general'}
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">General Settings</h2>
          <p class="text-gray-600">Basic project configuration options.</p>
        </div>
        
        <div class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2" for="project-name">Project Name</label>
            <input 
              type="text" 
              bind:value={projectName}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter project name"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2" for="project-description">
              Project Description
              <span class="inline-block ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/70 dark:text-blue-100 rounded-full">Most Important</span>
            </label>
            <div class="mb-3 p-3 bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-md">
              <div class="flex items-start">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">🎯 Critical for AI Performance</h3>
                  <div class="mt-1 text-sm text-blue-700 dark:text-blue-300">
                    <p>This description is the <strong>most important context</strong> for your AI assistant. It should clearly define:</p>
                    <ul class="mt-2 ml-4 list-disc space-y-1">
                      <li>Your project's main goals and objectives</li>
                      <li>What you're trying to achieve or build</li>
                      <li>The scope and focus areas</li>
                      <li>Any specific requirements or constraints</li>
                    </ul>
                    <p class="mt-2"><strong>The AI uses this as its "north star"</strong> to provide more targeted and relevant assistance.</p>
                  </div>
                </div>
              </div>
            </div>
            <textarea 
              rows="4"
              bind:value={projectDescription}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe your project's goals, objectives, and what you're trying to achieve. Be specific about your aims and requirements. This helps the AI provide more targeted assistance."
            ></textarea>
            <p class="mt-2 text-sm text-gray-500">
              💡 <strong>Tip:</strong> A well-written description dramatically improves AI response quality. Take a moment to explain your project's purpose and goals.
            </p>
          </div>
          
          {#if saveSuccess}
            <div class="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <div class="flex items-center">
                <div class="flex-shrink-0">
                  <svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="ml-3">
                  <p class="text-sm font-medium text-green-800">✅ Settings saved successfully!</p>
                </div>
              </div>
            </div>
          {/if}
          
          <div class="flex justify-end pt-6 border-t">
            <button
              on:click={saveGeneralSettings}
              disabled={savingGeneral}
              class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size="16" />
              {savingGeneral ? 'Saving...' : 'Save'}
            </button>
          </div>
          
          <!-- <div class="pt-4">
            <p class="text-sm text-gray-500 mb-4">More general settings will be added here in future updates.</p>
          </div> -->
        </div>
      </div>
    {:else if activeTab === 'sharing'}
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Project Sharing</h2>
          <p class="text-gray-600">Control how your project can be shared with others.</p>
        </div>
        
        <ProjectSharingSettings {projectId} />
      </div>
    {/if}
  </div>
</div>
