<script>
	import { onMount } from 'svelte';
	import WiskrApp from '$lib/WiskrApp.svelte';
</script>

<svelte:head>
	<title>Wiskr - AI Prompt Manager</title>
	<meta name="description" content="A modern, responsive web application for managing AI prompts and conversations across multiple AI models." />
	<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
</svelte:head>

<WiskrApp />
