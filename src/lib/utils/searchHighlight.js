/**
 * Highlights search terms in text content
 * @param {string} text - The text to highlight
 * @param {string} searchTerm - The term to highlight
 * @param {string} highlightClass - CSS class for highlighting (default: search-highlight)
 * @returns {string} - HTML with highlighted terms
 */
export function highlightSearchTerm(text, searchTerm, highlightClass = 'search-highlight') {
  if (!text || !searchTerm) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, `<span class="${highlightClass}">$1</span>`);
}

/**
 * Scrolls an element into view with highlighting
 * @param {HTMLElement} element - The element to scroll to
 * @param {string} searchTerm - The term to highlight
 */
export function scrollToElement(element, searchTerm) {
  if (!element) return;
  
  // Scroll to element
  element.scrollIntoView({ 
    behavior: 'smooth', 
    block: 'center',
    inline: 'nearest'
  });
  
  // Add highlight effect
  element.classList.add('search-highlight-scroll');
  setTimeout(() => {
    element.classList.remove('search-highlight-scroll');
  }, 3000);
}
