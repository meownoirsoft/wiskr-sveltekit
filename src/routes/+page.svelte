<svelte:head>
	<title>Wiskr - AI Conversation Management & Context Control</title>
	<meta name="description" content="Manage AI conversations across multiple models, organize context with facts and documents, and generate ideas for your projects with Wiskr." />
</svelte:head>

<script>
	import { page } from '$app/stores';
	import { ArrowRight, MessageSquare, GitBranch, FileText, Zap, Trash2, Brain, Highlighter, Star, CheckCircle, Play } from 'lucide-svelte';
	
	export let data;
	
	// Check if user is logged in
	$: isLoggedIn = !!data?.user;
</script>

<!-- Hero Section -->
<div class="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">

	<!-- Hero Content -->
	<div class="container mx-auto px-4 pt-20 pb-20 text-center">
		<div class="max-w-4xl mx-auto">
			<h1 class="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
				AI is just a lil guy!
				<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">He needs help.</span>
			</h1>
			<!-- Mr. Wiskr Avatar with Introduction -->
			<div class="mb-8 flex items-center justify-center gap-6">
				<div class="w-32 h-32 rounded-full bg-white shadow-lg border-4 border-gray-200 dark:border-gray-700 flex items-center justify-center">
					<img src="/mr-wiskr.webp" alt="Mr. Wiskr" class="w-24 h-24 rounded-full" />
				</div>
				<div class="text-left">
					<p class="text-lg text-gray-700 dark:text-gray-300 font-medium">
						This is Albert, he's here to help when AI gets unruly
					</p>
				</div>
			</div>
			<p class="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
				We call AI models "Wiskrs" - they're helpful little assistants here to make your life easier. But they're still young and learning. They need someone older and wiser to keep everything organized and working smoothly.
			</p>
			<p class="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
				That's where Albert comes in. He's always there to help when a Wiskr rips a hole in your project or gets confused. Think of him as the wise project manager who keeps all your AI helpers on track.
			</p>
			<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
				{#if isLoggedIn}
					<a href="/projects" class="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all transform hover:scale-105 shadow-lg">
						<MessageSquare size="20" class="mr-2" />
						Continue Your Work
						<ArrowRight size="20" class="ml-2" />
					</a>
				{:else}
					<a href="/signup" class="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all transform hover:scale-105 shadow-lg">
						<Play size="20" class="mr-2" />
						Upgrade your AI
						<ArrowRight size="20" class="ml-2" />
					</a>
					<button 
						class="inline-flex items-center px-8 py-4 text-lg font-semibold text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-xl transition-colors"
						on:click={() => {
							document.getElementById('features')?.scrollIntoView({ 
								behavior: 'smooth',
								block: 'start'
							});
						}}
					>
						Learn More
					</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Features Section -->
<div id="features" class="py-20 bg-white dark:bg-gray-800">
	<div class="container mx-auto px-4">
		<div class="text-center mb-16">
			<h2 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">How Wiskr Helps Your AI</h2>
			<p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
				We give your AI the tools it needs to be more helpful, organized, and effective
			</p>
		</div>
		
		<div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
			<!-- Feature 1 -->
			<div class="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-lg transition-all text-center">
				<div class="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
					<Trash2 size="28" class="text-blue-600 dark:text-blue-400" />
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Context Pollution</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Plain AI mashes old and new ideas together. Wiskr keeps each conversation clean, sharp, and on-topic.
				</p>
			</div>
			
			<!-- Feature 2 -->
			<div class="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-lg transition-all text-center">
				<div class="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
					<Brain size="28" class="text-green-600 dark:text-green-400" />
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">AI Memory You Control</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Plain AI forgets or hoards everything in its black box. Wiskr gives you a memory you curate, edit, and reuse.
				</p>
			</div>
			
			<!-- Feature 3 -->
			<div class="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-lg transition-all text-center">
				<div class="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
					<GitBranch size="28" class="text-purple-600 dark:text-purple-400" />
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Project-First, Not Chat-First</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Plain AI leaves you with an inbox of random chats. Wiskr organizes everything under your projects, so work actually builds.
				</p>
			</div>
			
			<!-- Feature 4 -->
			<div class="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-lg transition-all text-center">
				<div class="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
					<Highlighter size="28" class="text-orange-600 dark:text-orange-400" />
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Freedom of Models, No Lock-In</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Plain AI traps you in one vendor. Wiskr lets you use GPT, Claude, Gemini, and more — side by side.
				</p>
			</div>
			
			<!-- Feature 5 -->
			<div class="p-6 bg-gray-50 dark:bg-gray-700 rounded-xl hover:shadow-lg transition-all text-center">
				<div class="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4 mx-auto">
					<Zap size="28" class="text-red-600 dark:text-red-400" />
				</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Ready-to-Use Outputs</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Plain AI spits walls of text. Wiskr formats and exports clean docs, posts, and code instantly.
				</p>
			</div>
		</div>
	</div>
</div>

<!-- How It Works Section -->
<div id="how-it-works" class="py-20 bg-gray-50 dark:bg-gray-900">
	<div class="container mx-auto px-4">
		<div class="text-center mb-16">
			<h2 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">How It Works</h2>
			<p class="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
				Get started with Wiskr in three simple steps
			</p>
		</div>
		
		<div class="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
			<!-- Step 1 -->
			<div class="text-center">
				<div class="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">1</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Create a Project</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Start a new project workspace to organize your AI conversations and research.
				</p>
			</div>
			
			<!-- Step 2 -->
			<div class="text-center">
				<div class="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">2</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Add Facts & Context</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Upload documents, add key facts, and build your knowledge base to inform AI conversations.
				</p>
			</div>
			
			<!-- Step 3 -->
			<div class="text-center">
				<div class="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">3</div>
				<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">Chat & Explore</h3>
				<p class="text-gray-600 dark:text-gray-300">
					Start conversations with multiple AI models, branch into new ideas, and export your results.
				</p>
			</div>
		</div>
	</div>
</div>

<!-- CTA Section -->
<div class="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
	<div class="container mx-auto px-4 text-center">
		<h2 class="text-4xl font-bold text-white mb-4">Ready to Give Your AI a Helping Hand?</h2>
		<p class="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
			Join thousands of developers, researchers, and creators who are already using Wiskr to make their AI conversations smarter and more organized.
		</p>
		<div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
			{#if isLoggedIn}
				<a href="/projects" class="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white hover:bg-gray-100 rounded-xl transition-all transform hover:scale-105 shadow-lg">
					<MessageSquare size="20" class="mr-2" />
					Go to Your Projects
					<ArrowRight size="20" class="ml-2" />
				</a>
			{:else}
				<a href="/signup" class="inline-flex items-center px-8 py-4 text-lg font-semibold text-blue-600 bg-white hover:bg-gray-100 rounded-xl transition-all transform hover:scale-105 shadow-lg">
					<Play size="20" class="mr-2" />
					Start Free Trial
					<ArrowRight size="20" class="ml-2" />
				</a>
				<div class="mt-4">
					<a href="/plans" class="text-sm text-blue-100 hover:text-white transition-colors underline">
						Get a Free Account
					</a>
				</div>

			{/if}
		</div>
	</div>
</div>

<!-- Footer -->
<footer class="py-12 bg-gray-900 text-gray-300">
	<div class="container mx-auto px-4">
		<div class="grid md:grid-cols-4 gap-8">
			<div>
				<a href="/">
					<img src="/wiskr-logo.webp" alt="Wiskr" class="h-8 mb-4" />
				</a>
				<p class="text-sm">
					Master your AI conversations with context control and intelligent organization.
				</p>
			</div>
			<div>
				<h4 class="font-semibold text-white mb-4">Product</h4>
				<ul class="space-y-2 text-sm">
					<li><a href="#features" class="hover:text-white transition-colors">Features</a></li>
					<li><a href="/plans" class="hover:text-white transition-colors">Plans</a></li>
					<li><a href="/support" class="hover:text-white transition-colors">Support</a></li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold text-white mb-4">Company</h4>
				<ul class="space-y-2 text-sm">
					<li><a href="/about" class="hover:text-white transition-colors">About</a></li>
					<li><a href="/contact" class="hover:text-white transition-colors">Contact</a></li>
				</ul>
			</div>
			<div>
				<h4 class="font-semibold text-white mb-4">Legal</h4>
				<ul class="space-y-2 text-sm">
					<li><a href="/privacy" class="hover:text-white transition-colors">Privacy</a></li>
					<li><a href="/terms" class="hover:text-white transition-colors">Terms</a></li>
					<li><a href="/legal" class="hover:text-white transition-colors">Legal</a></li>
				</ul>
			</div>
		</div>
		<div class="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
			<p>&copy; 2024 Wiskr. All rights reserved.</p>
		</div>
	</div>
</footer>
