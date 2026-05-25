// Network utility helper for robust API calls
// Provides retry logic, timeout handling, and offline detection

// Network status tracking
let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let networkStatusListeners = [];

// Update online status
function updateNetworkStatus(online) {
  isOnline = online;
  networkStatusListeners.forEach(listener => listener(online));
}

// Setup network status listeners (browser only)
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => updateNetworkStatus(true));
  window.addEventListener('offline', () => updateNetworkStatus(false));
}

/**
 * Subscribe to network status changes
 * @param {function} listener - Callback function called with online status (boolean)
 * @returns {function} Unsubscribe function
 */
export function subscribeToNetworkStatus(listener) {
  networkStatusListeners.push(listener);
  // Call immediately with current status
  listener(isOnline);
  
  // Return unsubscribe function
  return () => {
    networkStatusListeners = networkStatusListeners.filter(l => l !== listener);
  };
}

/**
 * Get current network status
 * @returns {boolean} True if online, false if offline
 */
export function getNetworkStatus() {
  return isOnline;
}

/**
 * Sleep utility for delays
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Robust fetch with timeout, retry, and exponential backoff
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {object} retryOptions - Retry configuration
 * @returns {Promise<Response>} The fetch response
 */
export async function robustFetch(url, options = {}, retryOptions = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000, // 1 second
    maxDelay = 10000, // 10 seconds
    timeout = 30000, // 30 seconds
    retryOn = [408, 429, 500, 502, 503, 504], // HTTP status codes to retry on
    onRetry = null, // Callback for retry attempts
    skipRetryWhenOffline = true
  } = retryOptions;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check if we're offline and should skip retry
      if (skipRetryWhenOffline && !isOnline && attempt > 0) {
        throw new Error('Device is offline');
      }

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Check if we should retry based on status code
        if (attempt < maxRetries && retryOn.includes(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;

      } catch (fetchError) {
        clearTimeout(timeoutId);
        throw fetchError;
      }

    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Don't retry on certain errors
      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms`);
        break;
      }

      // Don't retry on 4xx errors (except 408, 429)
      if (error.message.includes('HTTP 4') && !retryOn.some(code => error.message.includes(`HTTP ${code}`))) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
      
      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      console.warn(`Attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}:`, error.message, `Retrying in ${delay}ms...`);
      
      await sleep(delay);
    }
  }

  // All retries failed
  throw new Error(`Failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

/**
 * Robust JSON fetch - handles JSON parsing and provides better error messages
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {object} retryOptions - Retry configuration
 * @returns {Promise<object>} The parsed JSON response
 */
export async function robustFetchJSON(url, options = {}, retryOptions = {}) {
  try {
    const response = await robustFetch(url, options, retryOptions);
    
    if (!response.ok) {
      // Try to get error message from response body
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error || errorData.message) {
          errorMessage = errorData.error || errorData.message;
        }
      } catch {
        // If JSON parsing fails, use the text
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch {
          // Keep the default error message
        }
      }
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    // Enhance error message for common scenarios
    if (error.message.includes('Failed to fetch') || error.message.includes('Device is offline')) {
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    }
    
    if (error.message.includes('Request timeout')) {
      throw new Error('Request took too long. Please check your connection and try again.');
    }

    throw error;
  }
}

/**
 * Robust streaming fetch for chat responses
 * @param {string} url - The URL to fetch
 * @param {object} options - Fetch options
 * @param {function} onChunk - Callback for each chunk
 * @param {object} retryOptions - Retry configuration
 */
export async function robustStreamingFetch(url, options = {}, onChunk = null, retryOptions = {}) {
  const {
    timeout = 60000, // Longer timeout for streaming
    maxRetries = 2,   // Fewer retries for streaming
    onRetry = null
  } = retryOptions;

  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!isOnline && attempt > 0) {
        throw new Error('Device is offline');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { value, done } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          
          if (chunk === '[DONE]') break;
          
          if (onChunk) {
            onChunk(chunk);
          }
        }
        return; // Success
      } finally {
        reader.releaseLock();
      }

    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        break;
      }

      if (error.name === 'AbortError') {
        lastError = new Error(`Streaming request timeout after ${timeout}ms`);
        break;
      }

      const delay = 1000 * Math.pow(2, attempt); // Exponential backoff
      
      if (onRetry) {
        onRetry(attempt + 1, error, delay);
      }

      console.warn(`Streaming attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}:`, error.message, `Retrying in ${delay}ms...`);
      
      await sleep(delay);
    }
  }

  throw new Error(`Streaming failed after ${maxRetries + 1} attempts: ${lastError.message}`);
}

/**
 * Queue for handling offline requests
 */
class OfflineRequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    
    // Process queue when coming back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue();
      });
    }
  }

  /**
   * Add request to offline queue
   * @param {function} requestFn - Function that returns a promise for the request
   * @param {object} metadata - Optional metadata for the request
   */
  add(requestFn, metadata = {}) {
    this.queue.push({
      requestFn,
      metadata,
      timestamp: Date.now()
    });
    
    // Try to process immediately if online
    if (isOnline && !this.processing) {
      this.processQueue();
    }
  }

  /**
   * Process all queued requests
   */
  async processQueue() {
    if (this.processing || !isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    console.log(`Processing ${this.queue.length} offline requests...`);

    const toProcess = [...this.queue];
    this.queue = [];

    for (const item of toProcess) {
      try {
        await item.requestFn();
      } catch (error) {
        console.error('Failed to process offline request:', error);
        // Could implement retry logic or user notification here
      }
    }

    this.processing = false;
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
  }

  /**
   * Get queue size
   */
  size() {
    return this.queue.length;
  }
}

// Export singleton instance
export const offlineQueue = new OfflineRequestQueue();
