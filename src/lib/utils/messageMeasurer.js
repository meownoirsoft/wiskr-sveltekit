/**
 * MessageMeasurer - Efficient height tracking for virtual message lists
 * Manages dynamic message heights for accurate virtual scrolling
 */

export class MessageMeasurer {
  constructor(options = {}) {
    this.heights = new Map(); // messageId -> height
    this.positions = new Map(); // messageId -> top position
    this.defaultHeight = options.defaultHeight || 120; // Estimated default height
    this.totalHeight = 0;
    this.onUpdate = options.onUpdate || null; // Callback when heights change
    this.debug = options.debug || false;
  }

  /**
   * Set the height for a specific message
   * @param {string} messageId - Unique message identifier
   * @param {number} height - Measured height in pixels
   */
  setHeight(messageId, height) {
    if (!messageId || height <= 0) return;
    
    const previousHeight = this.heights.get(messageId) || this.defaultHeight;
    
    // Only update if height actually changed to avoid unnecessary recalculations
    if (Math.abs(previousHeight - height) > 1) { // 1px tolerance for minor variations
      this.heights.set(messageId, height);
      this.recalculatePositions();
      
      if (this.debug) {
        console.log(`📏 MessageMeasurer: Updated height for ${messageId}: ${previousHeight}px -> ${height}px`);
      }
      
      if (this.onUpdate) {
        this.onUpdate({
          messageId,
          height,
          previousHeight,
          totalHeight: this.totalHeight
        });
      }
    }
  }

  /**
   * Get the height of a specific message
   * @param {string} messageId - Message identifier
   * @returns {number} Height in pixels
   */
  getHeight(messageId) {
    return this.heights.get(messageId) || this.defaultHeight;
  }

  /**
   * Get the top position of a specific message
   * @param {string} messageId - Message identifier
   * @returns {number} Top position in pixels
   */
  getPosition(messageId) {
    return this.positions.get(messageId) || 0;
  }

  /**
   * Recalculate all message positions based on current heights
   * This is called whenever a height changes
   */
  recalculatePositions() {
    let currentPosition = 0;
    this.positions.clear();
    
    // Assuming messages are in order, calculate cumulative positions
    for (const [messageId, height] of this.heights) {
      this.positions.set(messageId, currentPosition);
      currentPosition += height;
    }
    
    this.totalHeight = currentPosition;
  }

  /**
   * Calculate positions for an ordered list of messages
   * @param {Array} messages - Array of message objects with id property
   */
  calculatePositionsForMessages(messages) {
    let currentPosition = 0;
    this.positions.clear();
    
    messages.forEach(message => {
      const height = this.getHeight(message.id);
      this.positions.set(message.id, currentPosition);
      currentPosition += height;
    });
    
    this.totalHeight = currentPosition;
    
    if (this.debug) {
      console.log(`📏 MessageMeasurer: Recalculated positions for ${messages.length} messages, total height: ${this.totalHeight}px`);
    }
  }

  /**
   * Find which messages are visible in a given scroll viewport
   * @param {number} scrollTop - Current scroll position
   * @param {number} viewportHeight - Height of the viewport
   * @param {Array} messages - Array of message objects with id property
   * @param {number} buffer - Number of items to render outside viewport (default: 5)
   * @returns {Object} { startIndex, endIndex, offsetTop }
   */
  getVisibleRange(scrollTop, viewportHeight, messages, buffer = 5) {
    if (!messages || messages.length === 0) {
      return { startIndex: 0, endIndex: 0, offsetTop: 0 };
    }

    // Find the first message that's potentially visible
    let startIndex = 0;
    let currentPosition = 0;
    
    for (let i = 0; i < messages.length; i++) {
      const height = this.getHeight(messages[i].id);
      const messageTop = currentPosition;
      const messageBottom = currentPosition + height;
      
      // If the bottom of this message is below the scroll position, we found our start
      if (messageBottom > scrollTop) {
        startIndex = Math.max(0, i - buffer);
        break;
      }
      
      currentPosition += height;
    }

    // Find the last message that's potentially visible
    let endIndex = startIndex;
    const viewportBottom = scrollTop + viewportHeight;
    currentPosition = this.getPosition(messages[startIndex].id);
    
    for (let i = startIndex; i < messages.length; i++) {
      const height = this.getHeight(messages[i].id);
      const messageTop = currentPosition;
      
      // If this message starts below the viewport, we can stop
      if (messageTop > viewportBottom) {
        break;
      }
      
      endIndex = Math.min(messages.length - 1, i + buffer);
      currentPosition += height;
    }

    // Calculate offset for proper positioning
    const offsetTop = startIndex > 0 ? this.getPosition(messages[startIndex].id) : 0;

    return {
      startIndex,
      endIndex,
      offsetTop,
      visibleCount: endIndex - startIndex + 1
    };
  }

  /**
   * Reset all height data
   */
  clear() {
    this.heights.clear();
    this.positions.clear();
    this.totalHeight = 0;
    
    if (this.debug) {
      console.log('📏 MessageMeasurer: Cleared all height data');
    }
  }

  /**
   * Get total estimated height of all messages
   * @param {Array} messages - Array of message objects
   * @returns {number} Total height in pixels
   */
  getTotalHeight(messages) {
    if (!messages || messages.length === 0) return 0;
    
    // If we've measured all messages, return the calculated total
    if (this.heights.size === messages.length) {
      return this.totalHeight;
    }
    
    // Otherwise, estimate based on measured + default heights
    let total = 0;
    messages.forEach(message => {
      total += this.getHeight(message.id);
    });
    
    return total;
  }

  /**
   * Get debug information about current state
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      measuredMessages: this.heights.size,
      totalHeight: this.totalHeight,
      defaultHeight: this.defaultHeight,
      averageHeight: this.heights.size > 0 
        ? Array.from(this.heights.values()).reduce((a, b) => a + b, 0) / this.heights.size
        : this.defaultHeight
    };
  }
}

/**
 * Create a MessageMeasurer instance with default options
 * @param {Object} options - Configuration options
 * @returns {MessageMeasurer} New instance
 */
export function createMessageMeasurer(options = {}) {
  return new MessageMeasurer(options);
}
