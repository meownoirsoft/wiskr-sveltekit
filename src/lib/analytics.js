import { browser } from '$app/environment';
import { PUBLIC_POSTHOG_KEY, PUBLIC_POSTHOG_HOST } from '$env/static/public';
import posthog from 'posthog-js';

let analyticsInitialized = false;

/**
 * Initialize PostHog analytics
 */
export function initAnalytics() {
	if (!browser || analyticsInitialized || !PUBLIC_POSTHOG_KEY) {
		return;
	}

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

	analyticsInitialized = true;
}

/**
 * Track a custom event
 * @param {string} eventName - The name of the event
 * @param {object} properties - Event properties
 */
export function trackEvent(eventName, properties = {}) {
	if (!browser || !analyticsInitialized) {
		return;
	}

	posthog.capture(eventName, properties);
}

/**
 * Track page view
 * @param {string} path - The page path
 */
export function trackPageView(path) {
	if (!browser || !analyticsInitialized) {
		return;
	}

	posthog.capture('$pageview', {
		$current_url: window.location.href,
		path
	});
}

/**
 * Track project navigation as a page-like event
 * @param {string} projectId - The project ID
 * @param {string} projectName - The project name
 */
export function trackProjectNavigation(projectId, projectName) {
	if (!browser || !analyticsInitialized) {
		return;
	}

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
}

/**
 * Identify user for analytics
 * @param {string} userId - User ID
 * @param {object} properties - User properties
 */
export function identifyUser(userId, properties = {}) {
	if (!browser || !analyticsInitialized) {
		return;
	}

	posthog.identify(userId, properties);
}

/**
 * Reset user identity (for logout)
 */
export function resetUser() {
	if (!browser || !analyticsInitialized) {
		return;
	}

	posthog.reset();
}

/**
 * Set user properties
 * @param {object} properties - User properties to set
 */
export function setUserProperties(properties = {}) {
	if (!browser || !analyticsInitialized) {
		return;
	}

	posthog.people.set(properties);
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
