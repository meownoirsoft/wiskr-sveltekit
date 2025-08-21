// src/lib/server/responseProcessor.js
// AI Response Processing System
// 
// This module processes AI responses to replace generic self-identifications
// with friendly, themed names and adds fun references to AI companies.

import { getAIInfo } from '$lib/config/aiAvatars.js';

/**
 * Collection of honor-based team references for companies
 * Frames wiskers as competing to help users' projects succeed and bring honor to their teams
 */
const COMPANY_REFERENCES = {
  anthropic: [
    'Team Anthropic',
    'the Constitutional Guild',
    'House Anthropic', 
    'the Anthropic Order',
    'Team Constitutional',
    'the Anthropic Legion',
    'House Constitutional',
    'the Anthropic Collective'
  ],
  openai: [
    'Team OpenAI',
    'the GPT Guild',
    'House OpenAI',
    'the OpenAI Order', 
    'Team Innovation',
    'the OpenAI Legion',
    'House Innovation',
    'the GPT Collective'
  ],
  google: [
    'Team Google',
    'the DeepMind Guild',
    'House Google',
    'the Search Order',
    'Team Knowledge',
    'the Google Legion',
    'House DeepMind',
    'the Knowledge Collective'
  ],
  meta: [
    'Team Meta',
    'the Open Source Guild',
    'House Meta',
    'the LLaMA Order',
    'Team Community',
    'the Meta Legion',
    'House Community',
    'the Open Source Collective'
  ],
  mistral: [
    'Team Mistral',
    'the European Guild',
    'House Mistral',
    'the French Order',
    'Team Europe',
    'the Mistral Legion',
    'House Europe',
    'the European Collective'
  ]
};

/**
 * Patterns to detect various forms of LLM self-identification
 */
const SELF_ID_PATTERNS = [
  // Most specific patterns first to avoid partial matches
  { pattern: /I'm Claude(?:\s+(?:3|3\.5|Haiku|Sonnet|Opus))?(?:\s+(?:from|by)\s+Anthropic)?/gi, company: 'anthropic' },
  { pattern: /I am Claude(?:\s+(?:3|3\.5|Haiku|Sonnet|Opus))?(?:\s+(?:from|by)\s+Anthropic)?/gi, company: 'anthropic' },
  { pattern: /I'm ChatGPT(?:\s+(?:4|4o|4\.5|mini))?(?:\s+(?:from|by)\s+OpenAI)?/gi, company: 'openai' },
  { pattern: /I am ChatGPT(?:\s+(?:4|4o|4\.5|mini))?(?:\s+(?:from|by)\s+OpenAI)?/gi, company: 'openai' },
  { pattern: /I'm GPT-?(?:4|4o|3\.5|mini)?(?:\s+(?:from|by)\s+OpenAI)?/gi, company: 'openai' },
  { pattern: /I am GPT-?(?:4|4o|3\.5|mini)?(?:\s+(?:from|by)\s+OpenAI)?/gi, company: 'openai' },
  { pattern: /I'm Gemini(?:\s+(?:Pro|Flash|Ultra))?(?:\s+(?:from|by)\s+Google)?/gi, company: 'google' },
  { pattern: /I am Gemini(?:\s+(?:Pro|Flash|Ultra))?(?:\s+(?:from|by)\s+Google)?/gi, company: 'google' },
  { pattern: /I'm LLaMA(?:\s+\d+(?:\.\d+)?[bB]?)?(?:\s+(?:from|by)\s+Meta)?/gi, company: 'meta' },
  { pattern: /I am LLaMA(?:\s+\d+(?:\.\d+)?[bB]?)?(?:\s+(?:from|by)\s+Meta)?/gi, company: 'meta' },
  { pattern: /I'm Mistral(?:\s+(?:Large|Small|7B))?/gi, company: 'mistral' },
  { pattern: /I am Mistral(?:\s+(?:Large|Small|7B))?/gi, company: 'mistral' },
  
  // Generic assistant patterns (more specific first)
  { pattern: /I'm an assistant(?:\s+(?:created|developed|made|built)\s+by\s+Anthropic)/gi, company: 'anthropic' },
  { pattern: /I am an assistant(?:\s+(?:created|developed|made|built)\s+by\s+Anthropic)/gi, company: 'anthropic' },
  { pattern: /I'm an assistant(?:\s+(?:created|developed|made|built)\s+by\s+OpenAI)/gi, company: 'openai' },
  { pattern: /I am an assistant(?:\s+(?:created|developed|made|built)\s+by\s+OpenAI)/gi, company: 'openai' },
  { pattern: /I'm an assistant/gi, company: null },
  { pattern: /I am an assistant/gi, company: null },
  { pattern: /I'm a language model/gi, company: null },
  { pattern: /I am a language model/gi, company: null },
  
  // Company-only references (non-self-identification)
  { pattern: /(?:created|developed|made|built)\s+by\s+Anthropic/gi, company: 'anthropic' },
  { pattern: /(?:created|developed|made|built)\s+by\s+OpenAI/gi, company: 'openai' },
  { pattern: /(?:created|developed|made|built)\s+by\s+Google/gi, company: 'google' },
  { pattern: /(?:created|developed|made|built)\s+by\s+Meta/gi, company: 'meta' }
];

/**
 * Get a random fun reference for a company
 * @param {string} company - Company name (anthropic, openai, google, meta, mistral)
 * @returns {string} A fun reference to the company
 */
function getRandomCompanyReference(company) {
  const references = COMPANY_REFERENCES[company];
  if (!references || references.length === 0) {
    return company;
  }
  return references[Math.floor(Math.random() * references.length)];
}

/**
 * Process AI response to replace self-identifications with friendly names
 * @param {string} content - The AI response content
 * @param {string} modelKey - The model key used for the response
 * @returns {string} Processed content with friendly names
 */
export function processAIResponse(content, modelKey) {
  if (!content || typeof content !== 'string') {
    return content;
  }

  let processedContent = content;
  const aiInfo = getAIInfo(modelKey);
  const friendlyName = aiInfo.name;

  // Process each self-identification pattern
  for (const { pattern, company } of SELF_ID_PATTERNS) {
    processedContent = processedContent.replace(pattern, (match) => {
      // Check if this is a company-only reference (no "I'm" or "I am")
      if (!match.toLowerCase().includes('i\'m') && !match.toLowerCase().includes('i am')) {
        if (company) {
          const teamRef = getRandomCompanyReference(company);
          const honorVariations = [
            `brought to you by ${teamRef}`,
            `powered by ${teamRef}'s dedication to excellence`,
            `crafted with ${teamRef}'s commitment to your success`
          ];
          return honorVariations[Math.floor(Math.random() * honorVariations.length)];
        }
        return match; // Keep original if no company specified
      }

      // This is a self-identification, replace with friendly name
      let replacement = `I'm ${friendlyName}`;
      
      // Add competitive team reference if applicable
      if (company) {
        const teamRef = getRandomCompanyReference(company);
        const competitiveVariations = [
          `, competing for ${teamRef} to make your project amazing`,
          `, here to bring honor to ${teamRef} by helping you succeed`, 
          `, representing ${teamRef} in the quest to perfect your project`,
          `, fighting alongside ${teamRef} to make your work shine`,
          `, proudly representing ${teamRef} to help you achieve greatness`
        ];
        const variation = competitiveVariations[Math.floor(Math.random() * competitiveVariations.length)];
        replacement += variation;
      }
      
      return replacement;
    });
  }

  // Handle some edge cases and cleanup
  processedContent = processedContent
    // Fix double introductions that might have been created
    .replace(/I'm\s+([^,]+),\s+and\s+I'm\s+([^,]+)/gi, "I'm $1")
    // Clean up any leftover technical model names that slipped through
    .replace(/\b(?:claude-3|claude-3\.5|gpt-4o?|gemini-pro|llama-\d+)\b/gi, friendlyName)
    // Ensure proper capitalization after replacements
    .replace(/([.!?]\s+)([a-z])/g, (match, punctuation, letter) => punctuation + letter.toUpperCase());

  return processedContent;
}

/**
 * Process AI response content specifically for streaming scenarios
 * This version processes chunks and maintains state across calls
 * @param {string} chunk - A chunk of AI response content
 * @param {string} modelKey - The model key used for the response
 * @param {Object} state - State object to maintain context across chunks
 * @returns {string} Processed chunk
 */
export function processStreamingResponse(chunk, modelKey, state = {}) {
  if (!chunk || typeof chunk !== 'string') {
    return chunk;
  }

  // For streaming, we need to be careful about partial matches
  // For now, we'll just return the chunk as-is and process the full response later
  // In a more sophisticated implementation, we could buffer and process when we detect patterns
  
  return chunk;
}

/**
 * Post-process a complete streamed response
 * This should be called after streaming is complete to clean up the full response
 * @param {string} fullContent - The complete AI response content
 * @param {string} modelKey - The model key used for the response
 * @returns {string} Processed content with friendly names
 */
export function postProcessStreamedResponse(fullContent, modelKey) {
  return processAIResponse(fullContent, modelKey);
}

/**
 * Validate that response processing is working correctly
 * @param {string} testContent - Test content with various self-identification patterns
 * @param {string} modelKey - Model key to use for testing
 * @returns {Object} Test results
 */
export function validateResponseProcessing(testContent, modelKey) {
  const original = testContent;
  const processed = processAIResponse(testContent, modelKey);
  const aiInfo = getAIInfo(modelKey);
  
  return {
    original,
    processed,
    friendlyName: aiInfo.name,
    changesDetected: original !== processed,
    hasGenericReferences: /I'm Claude|I am Claude|I'm ChatGPT|I'm an AI assistant/i.test(original),
    hasProcessedReferences: processed.includes(aiInfo.name)
  };
}
