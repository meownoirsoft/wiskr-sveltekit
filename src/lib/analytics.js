import { browser } from '$app/environment';

let analyticsInitialized = false;

/**
 * Initialize simple logging analytics
 */
export async function initAnalytics() {
	if (!browser || analyticsInitialized) {
		return;
	}

	console.log('📊 Simple analytics initialized');
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

	console.log(`📊 Event: ${eventName}`, properties);
}

/**
 * Track page view
 * @param {string} path - The page path
 */
export function trackPageView(path) {
	if (!browser || !analyticsInitialized) {
		return;
	}

	console.log(`📊 Page View: ${path}`, {
		url: window.location.href,
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

	console.log(`📊 Project Navigation: ${projectName} (${projectId})`, {
		url: window.location.href,
		project_id: projectId,
		project_name: projectName,
		path: `/projects/${projectId}`,
		navigation_type: 'project_switch'
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

	console.log(`📊 User Identified: ${userId}`, properties);
}

/**
 * Reset user identity (for logout)
 */
export function resetUser() {
	if (!browser || !analyticsInitialized) {
		return;
	}

	console.log('📊 User Reset');
}

/**
 * Set user properties
 * @param {object} properties - User properties to set
 */
export function setUserProperties(properties = {}) {
	if (!browser || !analyticsInitialized) {
		return;
	}

	console.log('📊 User Properties Set:', properties);
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