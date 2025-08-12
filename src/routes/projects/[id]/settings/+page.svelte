<script>
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { Settings, Save, Plus, Trash2, GripVertical, ArrowLeft } from 'lucide-svelte';
  import FactTypesManager from '$lib/components/FactTypesManager.svelte';

  export let data;
  
  let projectId = $page.params.id;
  let project = data.project;
  let activeTab = 'general';
  let projectName = '';
  let projectDescription = '';
  let savingGeneral = false;
  
  // Initialize form values when project changes
  $: if (project) {
    projectName = project.name || '';
    projectDescription = project.description || '';
  }
  
  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'fact-types', label: 'Fact Types', icon: Settings },
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
        console.log('General settings saved successfully');
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
    {#if activeTab === 'fact-types'}
      <div class="bg-white rounded-lg shadow-sm border p-6">
        <div class="mb-6">
          <h2 class="text-xl font-semibold text-gray-900 mb-2">Fact Types</h2>
          <p class="text-gray-600">Customize the fact types available in your project. You can rename existing types, add new ones, and change their colors.</p>
        </div>
        
        <FactTypesManager {projectId} />
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
            <label class="block text-sm font-medium text-gray-700 mb-2" for="project-description">Description</label>
            <textarea 
              rows="3"
              bind:value={projectDescription}
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Project description (optional)"
            ></textarea>
          </div>
          
          <div class="flex justify-end pt-6 border-t">
            <button
              on:click={saveGeneralSettings}
              disabled={savingGeneral}
              class="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size="16" />
              {savingGeneral ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
          
          <div class="pt-4">
            <p class="text-sm text-gray-500 mb-4">More general settings will be added here in future updates.</p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>
