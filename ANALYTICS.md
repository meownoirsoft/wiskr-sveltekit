# PostHog Analytics Integration

This document describes the PostHog analytics integration for the Wiskr SvelteKit application.

## Setup

1. **Install PostHog**: `npm install posthog-js`
2. **Environment Variables**: Add to your `.env` file:
   ```env
   PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
   PUBLIC_POSTHOG_HOST=https://app.posthog.com
   ```

## Configuration

The analytics client is configured in `src/lib/analytics.js` with:
- Automatic initialization on app load
- Page view tracking
- User identification
- Event tracking with pre-defined event constants

## Implementation

### Core Integration
- **Layout**: `src/routes/+layout.svelte` - Initializes PostHog and handles page views, user identification
- **Analytics Module**: `src/lib/analytics.js` - Core PostHog wrapper with utility functions

### Key Features
- **Browser-only tracking**: Analytics only run in the browser environment
- **Development mode**: Console logging in development for debugging
- **User identification**: Automatic user identification on login/logout
- **Page view tracking**: Automatic tracking of route changes
- **Project navigation tracking**: Virtual page views for project switching in SPA

## Event Tracking

### Pre-defined Events
The `ANALYTICS_EVENTS` constant includes:

#### Authentication
- `USER_SIGNED_IN` - User successfully logs in
- `USER_SIGNED_OUT` - User logs out
- `USER_REGISTERED` - New user registration

#### Projects
- `PROJECT_CREATED` - New project created
- `PROJECT_SELECTED` - User switches to a project
- `PROJECT_NAVIGATION` - Virtual page navigation for project switching
- `PROJECT_DELETED` - Project deleted

#### Conversations
- `CONVERSATION_STARTED` - New chat conversation started
- `MESSAGE_SENT` - User sends a message
- `MESSAGE_RECEIVED` - AI response received
- `CONVERSATION_BRANCHED` - User creates a conversation branch
- `BRANCH_SELECTED` - User switches to a different branch

#### AI Models
- `MODEL_CHANGED` - User changes AI model
- `MODEL_CONFIGURED` - Model settings updated

#### UI Interactions
- `MODAL_OPENED` - Modal dialog opened
- `MODAL_CLOSED` - Modal dialog closed
- `SIDEBAR_TOGGLED` - Sidebar shown/hidden

#### Facts and Questions
- `FACT_CREATED` - New fact added
- `FACT_UPDATED` - Fact edited
- `FACT_DELETED` - Fact removed
- `QUESTION_CREATED` - New question added
- `QUESTION_ASKED` - Question used in chat

### Usage Examples

```javascript
import { trackEvent, ANALYTICS_EVENTS } from '$lib/analytics.js';

// Track a simple event
trackEvent(ANALYTICS_EVENTS.PROJECT_SELECTED, {
  project_id: 'abc123',
  project_name: 'My Project'
});

// Track user action with context
trackEvent(ANALYTICS_EVENTS.MESSAGE_SENT, {
  project_id: currentProject.id,
  conversation_id: session.id,
  message_length: message.length,
  model_used: selectedModel
});
```

## Project Navigation Tracking

Since Wiskr is a Single Page Application (SPA), switching between projects doesn't trigger traditional page navigation events. To provide better analytics insights, we implement virtual page navigation tracking:

### Implementation
- **Custom Event**: `project_navigation` - Tracks when users switch projects
- **Virtual Pageview**: Creates a virtual `$pageview` event with path `/projects/{projectId}`
- **Context Data**: Includes project ID, name, and navigation type

### Benefits
- **Funnel Analysis**: Better understanding of user project exploration patterns
- **Session Flow**: Track how users navigate between different projects
- **Engagement Metrics**: Measure time spent per project and switching frequency
- **Dashboard Compatibility**: Virtual pageviews work with PostHog's standard page analytics

### Events Generated
```javascript
// Custom navigation event
posthog.capture('project_navigation', {
  project_id: 'abc123',
  project_name: 'My Project',
  path: '/projects/abc123',
  navigation_type: 'project_switch'
});

// Virtual pageview for funnel analysis
posthog.capture('$pageview', {
  $current_url: 'https://app.example.com/projects/abc123',
  path: '/projects/abc123',
  project_id: 'abc123',
  project_name: 'My Project',
  virtual_navigation: true
});
```

## Adding Analytics to Components

When adding tracking to new components:

1. Import the analytics module:
   ```javascript
   import { trackEvent, ANALYTICS_EVENTS } from '$lib/analytics.js';
   ```

2. Track key user interactions:
   ```javascript
   function handleUserAction() {
     // Your existing logic
     
     // Track the event
     trackEvent(ANALYTICS_EVENTS.RELEVANT_EVENT, {
       property1: value1,
       property2: value2
     });
   }
   ```

3. Follow the existing event naming convention and add new events to `ANALYTICS_EVENTS` if needed.

## Privacy Considerations

- PostHog is configured with `person_profiles: 'identified_only'` to comply with privacy requirements
- Only identified users (logged in) have persistent profiles
- Session recording is enabled but respects user privacy settings
- No sensitive data (passwords, private content) should be tracked

## Development

In development mode:
- PostHog logs initialization to console
- All tracking calls are still made to help with testing
- Use your development PostHog project key to avoid polluting production data

## Production Deployment

1. Set up a PostHog project at https://app.posthog.com
2. Add the project API key to your production environment variables
3. Configure the PostHog host if using a custom instance
4. Test the integration with a small group before full rollout

## Extending Analytics

To add new tracking events:

1. Add the event name to `ANALYTICS_EVENTS` in `src/lib/analytics.js`
2. Import and use the event in your component
3. Include relevant context properties with the event
4. Update this documentation with the new event details

## Monitoring

PostHog provides dashboards to monitor:
- User engagement and retention
- Feature usage patterns
- Conversion funnels
- Session recordings for UX insights
- Custom events and properties
