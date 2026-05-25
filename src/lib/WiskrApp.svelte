<script>
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let prompts = [];
	let currentPromptId = null;
	let promptText = '';
	let selectedModel = 'gpt-4o';
	let searchQuery = '';
	let globalTags = '';
	let showResults = false;
	let currentResponse = '';
	let loading = false;
	let showFormatModal = false;
	let formattedText = '';
	let notifications = [];

	const aiModels = [
		{ value: 'gpt-4o', label: 'ChatGPT 4o' },
		{ value: 'gpt-4.1', label: 'ChatGPT 4.1' },
		{ value: 'gpt-4.5', label: 'ChatGPT 4.5' },
		{ value: 'gpt-4o-mini', label: 'ChatGPT 4o-mini' },
		{ value: 'claude-haiku', label: 'Claude Haiku' },
		{ value: 'claude-sonnet', label: 'Claude Sonnet' },
		{ value: 'deepseek', label: 'DeepSeek' },
		{ value: 'mistral', label: 'Mistral' }
	];

	const formatOptions = [
		{ value: 'tiktok', label: 'TikTok', icon: 'fab fa-tiktok' },
		{ value: 'instagram', label: 'Instagram', icon: 'fab fa-instagram' },
		{ value: 'notion', label: 'Notion', icon: 'fas fa-sticky-note' },
		{ value: 'markdown', label: 'Markdown', icon: 'fas fa-code' },
		{ value: 'pinterest', label: 'Pinterest', icon: 'fab fa-pinterest' },
		{ value: 'etsy', label: 'Etsy', icon: 'fas fa-shopping-cart' }
	];

	onMount(() => {
		loadPrompts();
		loadSampleData();
	});

	function loadPrompts() {
		if (browser) {
			const stored = localStorage.getItem('wiskr_prompts');
			prompts = stored ? JSON.parse(stored) : [];
		}
	}

	function savePrompts() {
		if (browser) {
			localStorage.setItem('wiskr_prompts', JSON.stringify(prompts));
		}
	}

	// function loadSampleData() {
	// 	if (prompts.length === 0) {
	// 		const samplePrompts = [
	// 			{
	// 				id: Date.now(),
	// 				text: "Write a compelling blog post about the future of AI in healthcare, focusing on personalized medicine and diagnostic tools.",
	// 				model: "gpt-4o",
	// 				tags: ["healthcare", "AI", "blog"],
	// 				response: "# The Future of AI in Healthcare: Revolutionizing Personalized Medicine\n\nThe healthcare industry stands on the brink of a technological revolution, with artificial intelligence (AI) leading the charge toward a more personalized, efficient, and effective medical landscape...",
	// 				timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
	// 				metadata: { tokens: 842, duration: 3200 }
	// 			}
	// 		];
	// 		prompts = samplePrompts;
	// 		savePrompts();
	// 	}
	// }

	async function sendPrompt() {
		if (!promptText.trim()) {
			showNotification('Please enter a prompt', 'error');
			return;
		}

		loading = true;

		try {
			const response = await simulateAIResponse(promptText, selectedModel);
			
			const prompt = {
				id: Date.now(),
				text: promptText,
				model: selectedModel,
				tags: [],
				response: response,
				timestamp: new Date().toISOString(),
				metadata: {
					tokens: Math.floor(Math.random() * 1000) + 100,
					duration: Math.floor(Math.random() * 5000) + 1000
				}
			};

			prompts = [prompt, ...prompts];
			savePrompts();
			displayAIResponse(response);
			promptText = '';
			showNotification('Prompt sent successfully!', 'success');
		} catch (error) {
			showNotification('Error sending prompt: ' + error.message, 'error');
		} finally {
			loading = false;
		}
	}

	async function simulateAIResponse(prompt, model) {
		await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));

		const responses = {
			'gpt-4o': `Here's a comprehensive response from ChatGPT 4o:\n\n${generateResponse(prompt)}`,
			'gpt-4.1': `ChatGPT 4.1 analysis:\n\n${generateResponse(prompt)}`,
			'gpt-4.5': `Advanced response from ChatGPT 4.5:\n\n${generateResponse(prompt)}`,
			'gpt-4o-mini': `Quick response from ChatGPT 4o-mini:\n\n${generateResponse(prompt)}`,
			'claude-haiku': `Claude Haiku's perspective:\n\n${generateResponse(prompt)}`,
			'claude-sonnet': `Claude Sonnet's detailed analysis:\n\n${generateResponse(prompt)}`,
			'deepseek': `DeepSeek's insights:\n\n${generateResponse(prompt)}`,
			'mistral': `Mistral's response:\n\n${generateResponse(prompt)}`
		};

		return responses[model] || responses['gpt-4o'];
	}

	function generateResponse(prompt) {
		const responses = [
			"Based on your request, I've analyzed the key components and here are my findings. The approach involves several strategic considerations that align with current best practices.",
			"This is an interesting challenge that requires a multi-faceted approach. Let me break down the essential elements and provide actionable recommendations.",
			"I've examined your prompt from multiple angles and developed a comprehensive solution that addresses the core requirements while maintaining flexibility for future adaptations.",
			"Here's my analysis of your request, incorporating both theoretical frameworks and practical implementation strategies that have proven effective in similar contexts.",
			"Based on current trends and methodologies, I recommend the following approach that balances innovation with proven techniques for optimal results."
		];

		return responses[Math.floor(Math.random() * responses.length)];
	}

	function displayAIResponse(response) {
		currentResponse = response;
		showResults = true;
	}

	function hideResults() {
		showResults = false;
	}

	function clearForm() {
		promptText = '';
		hideResults();
	}

	function copyToClipboard(text) {
		if (browser) {
			navigator.clipboard.writeText(text).then(() => {
				showNotification('Copied to clipboard!', 'success');
			});
		}
	}

	function showNotification(message, type) {
		const notification = { 
			id: Date.now(), 
			message, 
			type, 
			visible: true 
		};
		notifications = [...notifications, notification];
		
		setTimeout(() => {
			notifications = notifications.filter(n => n.id !== notification.id);
		}, 3000);
	}

	function formatDate(timestamp) {
		const date = new Date(timestamp);
		const now = new Date();
		const diff = now - date;
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const minutes = Math.floor(diff / (1000 * 60));

		if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
		if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
		if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
		return 'Just now';
	}

	function getModelDisplayName(model) {
		const found = aiModels.find(m => m.value === model);
		return found ? found.label : model;
	}

	async function regeneratePrompt(promptId) {
		const prompt = prompts.find(p => p.id === promptId);
		if (!prompt) return;

		loading = true;

		try {
			const newResponse = await simulateAIResponse(prompt.text, prompt.model);
			prompt.response = newResponse;
			prompt.timestamp = new Date().toISOString();
			
			prompts = [...prompts];
			savePrompts();
			showNotification('Response regenerated successfully!', 'success');
		} catch (error) {
			showNotification('Error regenerating response: ' + error.message, 'error');
		} finally {
			loading = false;
		}
	}

	function openFormatModal(promptId) {
		const prompt = prompts.find(p => p.id === promptId);
		if (!prompt) return;

		currentPromptId = promptId;
		formattedText = prompt.response;
		showFormatModal = true;
	}

	function closeFormatModal() {
		showFormatModal = false;
		currentPromptId = null;
	}

	function formatOutput(format) {
		let text = formattedText;

		switch (format) {
			case 'tiktok':
				text = formatForTikTok(text);
				break;
			case 'instagram':
				text = formatForInstagram(text);
				break;
			case 'notion':
				text = formatForNotion(text);
				break;
			case 'markdown':
				text = formatForMarkdown(text);
				break;
			case 'pinterest':
				text = formatForPinterest(text);
				break;
			case 'etsy':
				text = formatForEtsy(text);
				break;
		}

		formattedText = text;
		showNotification(`Formatted for ${format}!`, 'success');
	}

	function formatForTikTok(text) {
		const lines = text.split('\n').filter(line => line.trim());
		const hashtags = ['#AI', '#Tech', '#Innovation', '#Future', '#Digital'];
		return lines.slice(0, 3).join('\n') + '\n\n' + hashtags.join(' ');
	}

	function formatForInstagram(text) {
		const lines = text.split('\n').filter(line => line.trim());
		const hashtags = ['#AI', '#Technology', '#Innovation', '#DigitalTransformation', '#FutureOfWork'];
		return lines.slice(0, 5).join('\n') + '\n\n' + hashtags.join(' ');
	}

	function formatForNotion(text) {
		return `📝 **AI Response**\n\n${text}\n\n---\n*Generated on ${new Date().toLocaleDateString()}*`;
	}

	function formatForMarkdown(text) {
		return `# AI Response\n\n${text}\n\n---\n*Generated: ${new Date().toISOString()}*`;
	}

	function formatForPinterest(text) {
		const lines = text.split('\n').filter(line => line.trim());
		return lines.slice(0, 2).join('\n') + '\n\n#AI #Technology #Innovation #Digital';
	}

	function formatForEtsy(text) {
		const lines = text.split('\n').filter(line => line.trim());
		return `Product Description:\n\n${lines.slice(0, 3).join('\n')}\n\nTags: AI, Technology, Innovation, Digital`;
	}

	function deletePrompt(promptId) {
		if (confirm('Are you sure you want to delete this prompt?')) {
			prompts = prompts.filter(p => p.id !== promptId);
			savePrompts();
			showNotification('Prompt deleted successfully!', 'success');
		}
	}

	function addTagsToPrompt(promptId, tagsText) {
		const prompt = prompts.find(p => p.id === promptId);
		if (!prompt || !tagsText.trim()) return;

		const newTags = tagsText.split(',').map(tag => tag.trim()).filter(tag => tag);
		prompt.tags = [...new Set([...prompt.tags, ...newTags])];
		
		prompts = [...prompts];
		savePrompts();
		showNotification('Tags added successfully!', 'success');
	}

	function handleKeydown(event) {
		// Submit on Enter (without Shift), allow Shift+Enter for new lines
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendPrompt();
		}
	}

	$: filteredPrompts = prompts.filter(prompt => {
		if (!searchQuery) return true;
		const searchLower = searchQuery.toLowerCase();
		return (
			prompt.text.toLowerCase().includes(searchLower) ||
			prompt.response.toLowerCase().includes(searchLower) ||
			prompt.tags.some(tag => tag.toLowerCase().includes(searchLower))
		);
	});
</script>

<div class="app-container">
	<!-- Header -->
	<header class="header">
		<div class="header-content">
			<h1 class="logo">
				<i class="fas fa-cat"></i>
				Mr. Wiskr
			</h1>
			<p class="subtitle">AI Prompt Manager & Conversation Hub</p>
		</div>
	</header>

	<!-- Main Content -->
	<main class="main-content">
		<!-- New Prompt Section -->
		<section class="new-prompt-section">
			<div class="prompt-form">
				<div class="form-header">
					<div class="form-group model-selection">
						<label for="ai-model">AI Model:</label>
						<select id="ai-model" bind:value={selectedModel}>
							{#each aiModels as model}
								<option value={model.value}>{model.label}</option>
							{/each}
						</select>
					</div>
				</div>
				
				<div class="form-group">
					<label for="prompt-text">New Prompt:</label>
					<textarea 
						id="prompt-text" 
						bind:value={promptText}
						on:keydown={handleKeydown}
						placeholder="Type your prompt here... (e.g., 'Write a blog post about AI trends in 2024')"
						rows="4"
					></textarea>
				</div>
				
				<div class="button-group">
					<button class="btn-primary" on:click={sendPrompt} disabled={loading}>
						<i class="fas fa-paper-plane"></i>
						Wisk Away to AI
					</button>
					<button class="btn-secondary" on:click={clearForm}>
						<i class="fas fa-eraser"></i>
						Clear Prompt
					</button>
				</div>
			</div>

			<!-- Results Box -->
			{#if showResults}
				<div class="results-box">
					<div class="results-header">
						<h3><i class="fas fa-lightbulb"></i> Results</h3>
						<div class="results-actions">
							<button class="btn-secondary" on:click={() => copyToClipboard(currentResponse)}>
								<i class="fas fa-copy"></i>
								Copy
							</button>
							<button class="btn-secondary" on:click={hideResults}>
								<i class="fas fa-times"></i>
								Hide
							</button>
						</div>
					</div>
					<div class="results-content">
						{currentResponse}
					</div>
				</div>
			{/if}
		</section>

		<!-- Past Prompts Section -->
		<section class="past-prompts-section">
			<div class="section-header">
				<h2><i class="fas fa-history"></i> Past Prompts</h2>
				<div class="header-controls">
					<div class="search-container">
						<input 
							type="text" 
							bind:value={searchQuery}
							placeholder="Search your prompts..."
							class="search-input"
						/>
						<i class="fas fa-search search-icon"></i>
					</div>
				</div>
			</div>
			
			<div class="prompts-list">
				{#if filteredPrompts.length === 0}
					<div class="empty-state">
						<i class="fas fa-comments"></i>
						<p>No prompts yet. Start by sending your first prompt!</p>
					</div>
				{:else}
					{#each filteredPrompts as prompt}
						<div class="prompt-item">
							<div class="prompt-header">
								<div class="prompt-meta">
									<span class="prompt-model">{getModelDisplayName(prompt.model)}</span>
									<span class="prompt-date">{formatDate(prompt.timestamp)}</span>
									{#if prompt.tags.length > 0}
										<div class="prompt-tags">
											{#each prompt.tags as tag}
												<span class="tag">{tag}</span>
											{/each}
										</div>
									{/if}
								</div>
								<div class="prompt-tagging">
									<input 
										type="text" 
										class="prompt-tag-input" 
										placeholder="Add tags..."
										on:keydown={(e) => {
											if (e.key === 'Enter') {
												addTagsToPrompt(prompt.id, e.target.value);
												e.target.value = '';
											}
										}}
									/>
									<button 
										class="action-btn tag-btn"
										aria-label="Add tags"
										on:click={(e) => {
											const input = e.target.closest('.prompt-tagging').querySelector('.prompt-tag-input');
											if (input.value.trim()) {
												addTagsToPrompt(prompt.id, input.value);
												input.value = '';
											}
										}}
									>
										<i class="fas fa-tags"></i>
									</button>
								</div>
							</div>
							<div class="prompt-text">{prompt.text}</div>
							<div class="prompt-response">{prompt.response}</div>
							<div class="prompt-actions">
								<button aria-label="Regenerate prompt" class="action-btn regenerate" on:click={() => regeneratePrompt(prompt.id)}>
									<i class="fas fa-redo"></i> Regenerate
								</button>
								<button aria-label="Format prompt" class="action-btn format" on:click={() => openFormatModal(prompt.id)}>
									<i class="fas fa-magic"></i> Format
								</button>
								<button aria-label="Delete prompt" class="action-btn delete" on:click={() => deletePrompt(prompt.id)}>
									<i class="fas fa-trash"></i> Delete
								</button>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</section>
	</main>
</div>

<!-- Loading Overlay -->
{#if loading}
	<div class="loading-overlay">
		<div class="loading-spinner">
			<i class="fas fa-spinner fa-spin"></i>
			<p>Getting AI response...</p>
		</div>
	</div>
{/if}

<!-- Output Format Modal -->
{#if showFormatModal}
	<div class="modal">
		<div class="modal-content">
			<div class="modal-header">
				<h3>Format Output</h3>
				<button class="close-modal" on:click={closeFormatModal} aria-label="Close format modal">
					<i class="fas fa-times"></i>
				</button>
			</div>
			<div class="modal-body">
				<div class="format-options">
					{#each formatOptions as option}
						<button aria-label={`Format output as ${option.label}`} class="format-btn" on:click={() => formatOutput(option.value)}>
							<i class={option.icon}></i>
							{option.label}
						</button>
					{/each}
				</div>
				<div class="formatted-output">
					<label for="formatted-text">Formatted Output:</label>
					<textarea bind:value={formattedText} rows="8" readonly></textarea>
					<button aria-label="Copy formatted text" class="btn-secondary" on:click={() => copyToClipboard(formattedText)}>
						<i class="fas fa-copy"></i> Copy
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Notifications -->
{#if notifications.length > 0}
	<div class="notifications">
		{#each notifications as notification}
			<div class="notification {notification.type}">
				{notification.message}
			</div>
		{/each}
	</div>
{/if}

<style>
	@import './wiskr.css';
</style>
