// Theme utilities for components that need to react to theme changes

/**
 * Get the current theme mode
 * @returns {'light' | 'dark'}
 */
export function getCurrentTheme() {
  if (typeof window === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

/**
 * Check if the current theme is dark
 * @returns {boolean}
 */
export function isDarkTheme() {
  return getCurrentTheme() === 'dark';
}

/**
 * Listen for theme changes
 * @param {function} callback - Function to call when theme changes
 * @returns {function} Cleanup function to remove the listener
 */
export function onThemeChange(callback) {
  if (typeof window === 'undefined') return () => {};
  
  const handleThemeChange = (event) => {
    callback(event.detail.darkMode ? 'dark' : 'light');
  };
  
  window.addEventListener('theme-changed', handleThemeChange);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('theme-changed', handleThemeChange);
  };
}

/**
 * Get theme-appropriate color values
 * @param {string} lightColor - Color to use in light mode
 * @param {string} darkColor - Color to use in dark mode
 * @returns {string} The appropriate color for current theme
 */
export function getThemeColor(lightColor, darkColor) {
  return isDarkTheme() ? darkColor : lightColor;
}

/**
 * Apply theme-aware styling to an element
 * @param {HTMLElement} element - Element to apply styling to
 * @param {object} styles - Object with light and dark style properties
 */
export function applyThemeStyles(element, styles) {
  if (!element || typeof element.style === 'undefined') return;
  
  const theme = getCurrentTheme();
  const themeStyles = styles[theme] || {};
  
  Object.entries(themeStyles).forEach(([property, value]) => {
    element.style[property] = value;
  });
}
