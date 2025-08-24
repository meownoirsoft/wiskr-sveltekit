import { browser } from '$app/environment';

let analyticsInitialized = false;
let posthog = null;
let analyticsAvailable = false;

/**
 * Initialize PostHog analytics
 */
export async function initAnalytics() {
	if (!browser || analyticsInitialized) {
		return;
	}

	// Get environment variables dynamically
	let PUBLIC_POSTHOG_KEY, PUBLIC_POSTHOG_HOST;
	try {
		const env = await import('$env/static/public');
		PUBLIC_POSTHOG_KEY = env.PUBLIC_POSTHOG_KEY;
		PUBLIC_POSTHOG_HOST = env.PUBLIC_POSTHOG_HOST;
	} catch {
		// Environment variables not configured
		PUBLIC_POSTHOG_KEY = undefined;
		PUBLIC_POSTHOG_HOST = 'https://app.posthog.com';
	}

	// Check if PostHog configuration is available
	if (!PUBLIC_POSTHOG_KEY || PUBLIC_POSTHOG_KEY === 'your_posthog_project_api_key') {
		console.log('PostHog analytics disabled: No API key configured');
		analyticsInitialized = true;
		return;
	}

	try {
		// Dynamically import PostHog to handle missing dependency gracefully
		const module = await import('posthog-js');
		posthog = module.default;
		
		posthog.init(PUBLIC_POSTHOG_KEY, {
			api_host: PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
			defaults: '2025-05-24',
			person_profiles: 'identified_only',
			capture_pageview: false, // We'll handle this manually
			capture_pageleave: true,
			session_recording: {
				recordCrossOriginIframes: true
			}
		});
		
		analyticsAvailable = true;
		console.log('PostHog analytics initialized successfully');
	} catch (error) {
		console.warn('PostHog analytics not available:', error);
	}

	analyticsInitialized = true;
}

/**
 * Track a custom event
 * @param {string} eventName - The name of the event
 * @param {object} properties - Event properties
 */
export function trackEvent(eventName, properties = {}) {
	if (!browser || !analyticsInitialized || !analyticsAvailable || !posthog) {
		return;
	}

	try {
		posthog.capture(eventName, properties);
	} catch (error) {
		console.warn('Failed to track event:', eventName, error);
	}
}

/**
 * Track page view
 * @param {string} path - The page path
 */
export function trackPageView(path) {
	if (!browser || !analyticsInitialized || !analyticsAvailable || !posthog) {
		return;
	}

	try {
		posthog.capture('$pageview', {
			$current_url: window.location.href,
			path
		});
	} catch (error) {
		console.warn('Failed to track page view:', path, error);
	}
}

/**
 * Track project navigation as a page-like event
 * @param {string} projectId - The project ID
 * @param {string} projectName - The project name
 */
export function trackProjectNavigation(projectId, projectName) {
	if (!browser || !analyticsInitialized || !analyticsAvailable || !posthog) {
		return;
	}

	try {
		// Track as a custom pageview-like event for project switching
		posthog.capture('project_navigation', {
			$current_url: window.location.href,
			project_id: projectId,
			project_name: projectName,
			path: `/projects/${projectId}`, // Virtual path for project
			navigation_type: 'project_switch'
		});

		// Also track as a virtual pageview for better funnel analysis
		posthog.capture('$pageview', {
			$current_url: `${window.location.origin}/projects/${projectId}`,
			path: `/projects/${projectId}`,
			project_id: projectId,
			project_name: projectName,
			virtual_navigation: true
		});
	} catch (error) {
		console.warn('Failed to track project navigation:', projectId, error);
	}
}

/**
 * Identify user for analytics
 * @param {string} userId - User ID
 * @param {object} properties - User properties
 */
export function identifyUser(userId, properties = {}) {
	if (!browser || !analyticsInitialized || !analyticsAvailable || !posthog) {
		return;
	}

	try {
		posthog.identify(userId, properties);
	} catch (error) {
		console.warn('Failed to identify user:', userId, error);
	}
}

/**
 * Reset user identity (for logout)
 */
export function resetUser() {
	if (!browser || !analyticsInitialized || !analyticsAvailable || !posthog) {
		return;
	}

	try {
		posthog.reset();
	} catch (error) {
		console.warn('Failed to reset user:', error);
	}
}

/**
 * Set user properties
 * @param {object} properties - User properties to set
 */
export function setUserProperties(properties = {}) {
	if (!browser || !analyticsInitialized || !analyticsAvailable || !posthog) {
		return;
	}

	try {
		posthog.people.set(properties);
	} catch (error) {
		console.warn('Failed to set user properties:', error);
	}
}

// Pre-defined tracking events for common actions
export const ANALYTICS_EVENTS = {
	// Authentication
	USER_SIGNED_IN: 'user_signed_in',
	USER_SIGNED_OUT: 'user_signed_out',
	USER_REGISTERED: 'user_registered',

	// Projects
	PROJECT_CREATED: 'project_created',
	PROJECT_SELECTED: 'project_selected',
	PROJECT_NAVIGATION: 'project_navigation',
	PROJECT_DELETED: 'project_deleted',

	// Conversations
	CONVERSATION_STARTED: 'conversation_started',
	MESSAGE_SENT: 'message_sent',
	MESSAGE_RECEIVED: 'message_received',
	CONVERSATION_BRANCHED: 'conversation_branched',
	BRANCH_SELECTED: 'branch_selected',

	// AI Models
	MODEL_CHANGED: 'model_changed',
	MODEL_CONFIGURED: 'model_configured',

	// Navigation
	PAGE_LEAVE: 'page_leave',

	// UI Interactions
	MODAL_OPENED: 'modal_opened',
	MODAL_CLOSED: 'modal_closed',
	SIDEBAR_TOGGLED: 'sidebar_toggled',

	// Facts and Questions
	FACT_CREATED: 'fact_created',
	FACT_UPDATED: 'fact_updated',
	FACT_DELETED: 'fact_deleted',
	QUESTION_CREATED: 'question_created',
	QUESTION_ASKED: 'question_asked'
};

export default {
	init: initAnalytics,
	track: trackEvent,
	pageView: trackPageView,
	projectNavigation: trackProjectNavigation,
	identify: identifyUser,
	reset: resetUser,
	setProperties: setUserProperties,
	events: ANALYTICS_EVENTS
};
