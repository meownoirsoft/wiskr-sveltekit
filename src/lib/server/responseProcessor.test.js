// src/lib/server/responseProcessor.test.js
// Test suite for AI response processing functionality

import { processAIResponse, validateResponseProcessing } from './responseProcessor.js';

/**
 * Run tests for the AI response processor
 */
function runResponseProcessorTests() {
  console.log('🧪 Running AI Response Processor Tests...\n');

  const testCases = [
    {
      name: 'Claude Haiku self-identification',
      input: "Hi! I'm Claude, an AI assistant created by Anthropic. How can I help you today?",
      modelKey: 'speed', // Maps to Hikari (Claude Haiku)
      expectedChanges: true
    },
    {
      name: 'Claude Sonnet with version',
      input: "Hello! I'm Claude 3.5 Sonnet by Anthropic. I'm here to assist you with your questions.",
      modelKey: 'quality', // Maps to Sonny (Claude Sonnet)
      expectedChanges: true
    },
    {
      name: 'ChatGPT self-identification',
      input: "I'm ChatGPT, an AI model developed by OpenAI. What would you like to know?",
      modelKey: 'gpt4', // Maps to Aurora (GPT-4)
      expectedChanges: true
    },
    {
      name: 'Generic AI assistant reference',
      input: "I'm an AI assistant created by Anthropic, and I'm here to help with various tasks.",
      modelKey: 'speed',
      expectedChanges: true
    },
    {
      name: 'Company-only reference',
      input: "This model was developed by Anthropic to be helpful, harmless, and honest.",
      modelKey: 'quality',
      expectedChanges: true
    },
    {
      name: 'Multiple self-references',
      input: "Hi there! I'm Claude from Anthropic. As an AI assistant created by Anthropic, I can help with many tasks.",
      modelKey: 'speed',
      expectedChanges: true
    },
    {
      name: 'No self-identification',
      input: "Here's a comprehensive analysis of the problem you've described. The key factors to consider are...",
      modelKey: 'quality',
      expectedChanges: false
    },
    {
      name: 'Mixed content with self-identification',
      input: "I'm Claude 3 Haiku by Anthropic. Let me explain the concept of machine learning. Machine learning is a subset of artificial intelligence...",
      modelKey: 'speed',
      expectedChanges: true
    }
  ];

  let passedTests = 0;
  let totalTests = testCases.length;

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: ${testCase.name}`);
    console.log(`Model: ${testCase.modelKey}`);
    console.log(`Input: "${testCase.input}"`);

    const result = validateResponseProcessing(testCase.input, testCase.modelKey);
    
    console.log(`Processed: "${result.processed}"`);
    console.log(`Friendly Name: ${result.friendlyName}`);
    console.log(`Changes Detected: ${result.changesDetected}`);
    console.log(`Expected Changes: ${testCase.expectedChanges}`);
    
    const testPassed = result.changesDetected === testCase.expectedChanges;
    
    if (testPassed) {
      console.log('✅ PASSED');
      passedTests++;
    } else {
      console.log('❌ FAILED');
    }
    
    console.log('---');
  });

  console.log(`\n🧪 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Response processing is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }

  return { passed: passedTests, total: totalTests };
}

/**
 * Run specific edge case tests
 */
function runEdgeCaseTests() {
  console.log('\n🔍 Running Edge Case Tests...\n');

  const edgeCases = [
    {
      name: 'Case sensitivity test',
      input: "i'm claude and I AM CLAUDE from anthropic",
      modelKey: 'speed'
    },
    {
      name: 'Partial word matching',
      input: "I'm not Claude, but I claudes around with words sometimes.",
      modelKey: 'quality'
    },
    {
      name: 'Multiple companies',
      input: "I'm an AI created by Anthropic, similar to models from OpenAI and Google.",
      modelKey: 'speed'
    },
    {
      name: 'Empty/null input',
      input: "",
      modelKey: 'quality'
    },
    {
      name: 'Very long response with self-id',
      input: "I'm Claude by Anthropic. " + "Here's a very long explanation that goes on and on. ".repeat(20) + "Hope this helps!",
      modelKey: 'speed'
    }
  ];

  edgeCases.forEach((testCase, index) => {
    console.log(`Edge Case ${index + 1}: ${testCase.name}`);
    
    try {
      const result = processAIResponse(testCase.input, testCase.modelKey);
      console.log(`✅ Processed successfully`);
      if (testCase.input && result !== testCase.input) {
        console.log(`🔄 Content was modified`);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
    
    console.log('---');
  });
}

/**
 * Demonstrate the fun company references
 */
function demonstrateCompanyReferences() {
  console.log('\n🎨 Demonstrating Fun Company References...\n');

  const companyTests = [
    { input: "I'm Claude from Anthropic", modelKey: 'speed' },
    { input: "I'm ChatGPT by OpenAI", modelKey: 'gpt4' },
    { input: "I'm Gemini from Google", modelKey: 'micro' },
    { input: "I'm LLaMA by Meta", modelKey: 'llama-70b' },
    { input: "I'm Mistral", modelKey: 'mistral-large' }
  ];

  companyTests.forEach((test, index) => {
    console.log(`Company Reference ${index + 1}:`);
    console.log(`Input: "${test.input}"`);
    
    // Run the test multiple times to see different random references
    for (let i = 0; i < 3; i++) {
      const processed = processAIResponse(test.input, test.modelKey);
      console.log(`  Variation ${i + 1}: "${processed}"`);
    }
    console.log('---');
  });
}

// Export the test functions for use in other contexts
export { runResponseProcessorTests, runEdgeCaseTests, demonstrateCompanyReferences };

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runResponseProcessorTests();
  runEdgeCaseTests();
  demonstrateCompanyReferences();
}
