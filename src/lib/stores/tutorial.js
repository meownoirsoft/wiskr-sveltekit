import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

// Tutorial state management
export const tutorialActive = writable(false);
export const currentTutorialStep = writable(0);
export const tutorialCompleted = writable(false);

// Tutorial step definitions
export const TUTORIAL_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Wiskr! 🎉',
    description: 'Let\'s take a quick tour of your new AI conversation workspace.',
    target: null, // No specific target, just overlay
    position: 'center',
    showNext: true,
    showSkip: true,
    content: 'Wiskr helps you manage AI conversations across multiple models with powerful context tracking.'
  },
  {
    id: 'project-selector',
    title: 'Projects organize your work',
    description: 'Projects help you organize conversations by topic, client, or use case.',
    target: '[data-tutorial="project-selector"]',
    position: 'bottom',
    showNext: true,
    showSkip: true,
    content: 'Click here to create your first project or switch between existing ones.'
  },
  {
    id: 'context-quality',
    title: 'Track Context Quality',
    description: 'The context quality indicator shows how well Wiskrs understand your project.',
    target: '[data-tutorial="context-quality"]',
    position: 'bottom',
    showNext: true,
    showSkip: true,
    content: 'Higher scores mean better AI responses. Add facts and context to improve this.'
  },
  {
    id: 'chat-area',
    title: 'Start conversations here',
    description: 'This is where you\'ll have conversations with AI models.',
    target: '[data-tutorial="chat-area"]',
    position: 'top',
    showNext: true,
    showSkip: true,
    content: 'Type your questions or prompts here. You can switch between different AI models anytime.'
  },
  {
    id: 'context-panel',
    title: 'Context Panel',
    description: 'Manage facts, questions, and entities to give Wiskrs better understanding.',
    target: '[data-tutorial="context-panel"]',
    position: 'left',
    showNext: true,
    showSkip: true,
    content: 'Add facts about your project, save important questions, and track key entities.'
  },
  {
    id: 'sessions-panel',
    title: 'Conversation History',
    description: 'All your conversations are saved and organized here.',
    target: '[data-tutorial="sessions-panel"]',
    position: 'right',
    showNext: true,
    showSkip: true,
    content: 'Browse previous conversations, create branches, and continue where you left off.'
  },
  {
    id: 'global-search',
    title: 'Powerful Search',
    description: 'Search across all your project content instantly.',
    target: '[data-tutorial="global-search"]',
    position: 'bottom',
    showNext: true,
    showSkip: true,
    content: 'Find facts, docs, messages, and questions across all your conversations and projects.'
  },
  {
    id: 'mobile-features',
    title: 'Mobile-friendly',
    description: 'Wiskr works great on mobile! Install it as an app for quick access.',
    target: null,
    position: 'center',
    showNext: false,
    showSkip: false,
    showComplete: true,
    content: 'You can install Wiskr on your phone for offline access and push notifications.'
  }
];

// Derived store for current step data
export const currentStep = derived(
  [currentTutorialStep],
  ([$currentTutorialStep]) => TUTORIAL_STEPS[$currentTutorialStep] || null
);

// Tutorial progress (percentage)
export const tutorialProgress = derived(
  [currentTutorialStep],
  ([$currentTutorialStep]) => {
    return Math.round((($currentTutorialStep + 1) / TUTORIAL_STEPS.length) * 100);
  }
);

/**
 * Initialize tutorial system
 */
export function initTutorial() {
  if (!browser) return;

  // Check if user has completed tutorial
  const completed = localStorage.getItem('wiskr_tutorial_completed');
  const skipped = localStorage.getItem('wiskr_tutorial_skipped');
  
  if (completed === 'true' || skipped === 'true') {
    tutorialCompleted.set(true);
    return;
  }

  // Check if this is a new user (no projects or conversations)
  // This would typically be determined by checking user data
  const isNewUser = !localStorage.getItem('wiskr_last_project_id');
  
  if (isNewUser) {
    // Show tutorial after a brief delay to let the app load
    setTimeout(() => {
      startTutorial();
    }, 1000);
  }
}

/**
 * Start the tutorial from the beginning
 */
export function startTutorial() {
  if (!browser) return;
  
  tutorialActive.set(true);
  currentTutorialStep.set(0);
  tutorialCompleted.set(false);
  
  // Analytics tracking
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('tutorial:started'));
  }
}

/**
 * Go to next tutorial step
 */
export function nextTutorialStep() {
  const current = get(currentTutorialStep);
  const next = current + 1;
  
  if (next < TUTORIAL_STEPS.length) {
    currentTutorialStep.set(next);
    
    // Analytics tracking
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('tutorial:step-completed', {
        detail: { 
          stepId: TUTORIAL_STEPS[current].id,
          stepNumber: current + 1,
          nextStepId: TUTORIAL_STEPS[next].id
        }
      }));
    }
  } else {
    completeTutorial();
  }
}

/**
 * Go to previous tutorial step
 */
export function previousTutorialStep() {
  const current = get(currentTutorialStep);
  if (current > 0) {
    currentTutorialStep.set(current - 1);
  }
}

/**
 * Skip to a specific step
 */
export function goToTutorialStep(stepIndex) {
  if (stepIndex >= 0 && stepIndex < TUTORIAL_STEPS.length) {
    currentTutorialStep.set(stepIndex);
  }
}

/**
 * Complete the tutorial
 */
export function completeTutorial() {
  if (!browser) return;
  
  tutorialActive.set(false);
  tutorialCompleted.set(true);
  
  // Save completion status
  localStorage.setItem('wiskr_tutorial_completed', 'true');
  localStorage.setItem('wiskr_tutorial_completed_at', new Date().toISOString());
  
  // Analytics tracking
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('tutorial:completed', {
      detail: { 
        completedSteps: get(currentTutorialStep) + 1,
        totalSteps: TUTORIAL_STEPS.length
      }
    }));
  }
}

/**
 * Skip the tutorial
 */
export function skipTutorial() {
  if (!browser) return;
  
  tutorialActive.set(false);
  
  // Save skipped status
  localStorage.setItem('wiskr_tutorial_skipped', 'true');
  localStorage.setItem('wiskr_tutorial_skipped_at', new Date().toISOString());
  
  // Analytics tracking
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent('tutorial:skipped', {
      detail: { 
        skippedAtStep: get(currentTutorialStep) + 1,
        totalSteps: TUTORIAL_STEPS.length
      }
    }));
  }
}

/**
 * Restart the tutorial (for testing or user request)
 */
export function restartTutorial() {
  if (!browser) return;
  
  // Clear stored preferences
  localStorage.removeItem('wiskr_tutorial_completed');
  localStorage.removeItem('wiskr_tutorial_skipped');
  localStorage.removeItem('wiskr_tutorial_completed_at');
  localStorage.removeItem('wiskr_tutorial_skipped_at');
  
  // Reset state and start
  tutorialCompleted.set(false);
  startTutorial();
}

/**
 * Check if tutorial should be shown for current route
 */
export function shouldShowTutorial(pathname) {
  // Only show tutorial on the projects page
  return pathname === '/projects';
}

/**
 * Get element position for tutorial targeting
 */
export function getElementPosition(selector) {
  if (!browser || !selector) return null;
  
  const element = document.querySelector(selector);
  if (!element) return null;
  
  const rect = element.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
  
  return {
    top: rect.top + scrollTop,
    left: rect.left + scrollLeft,
    width: rect.width,
    height: rect.height,
    centerX: rect.left + scrollLeft + rect.width / 2,
    centerY: rect.top + scrollTop + rect.height / 2
  };
}

// Export default object for convenient importing
export default {
  // Stores
  active: tutorialActive,
  currentStep: currentTutorialStep,
  completed: tutorialCompleted,
  
  // Derived stores
  currentStepData: currentStep,
  progress: tutorialProgress,
  
  // Actions
  init: initTutorial,
  start: startTutorial,
  next: nextTutorialStep,
  previous: previousTutorialStep,
  goTo: goToTutorialStep,
  complete: completeTutorial,
  skip: skipTutorial,
  restart: restartTutorial,
  
  // Utils
  shouldShow: shouldShowTutorial,
  getElementPosition,
  
  // Constants
  STEPS: TUTORIAL_STEPS
};
