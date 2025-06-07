import dotenv from 'dotenv';
import { AlfaProvider } from './services/providers/AlfaProvider.js';

// Load environment variables
dotenv.config();

/**
 * Test script for Alfa OpenAI-compatible API integration
 * Based on working curl command provided by user
 */
async function testAlfaIntegration() {
  console.log('🧪 Testing Alfa OpenAI-Compatible API Integration\n');

  try {
    // Initialize Alfa provider with environment configuration
    const alfaConfig = {
      name: 'test-alfa',
      type: 'alfa',
      authToken: process.env.ALFA_AUTH_TOKEN,
      projectId: process.env.ALFA_PROJECT_ID,
      chatHost: process.env.ALFA_CHAT_HOST,
      apiHost: process.env.ALFA_API_HOST,
      model: process.env.ALFA_MODEL || 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 500,
      systemPrompt: 'You are a helpful assistant that analyzes webpage content including both text and images. You have vision capabilities and can see and understand images when they are provided.'
    };

    console.log('📋 Configuration:');
    console.log(`  Chat Host: ${alfaConfig.chatHost}`);
    console.log(`  API Host: ${alfaConfig.apiHost}`);
    console.log(`  Project ID: ${alfaConfig.projectId}`);
    console.log(`  Model: ${alfaConfig.model}`);
    console.log(`  Auth Token: ${alfaConfig.authToken.substring(0, 8)}...\n`);

    // Create and initialize provider
    const alfaProvider = new AlfaProvider(alfaConfig);
    await alfaProvider.initialize(alfaConfig);
    console.log('✅ Alfa provider initialized successfully\n');

    // Test connection
    console.log('🔗 Testing connection...');
    const connectionTest = await alfaProvider.testConnection();
    if (connectionTest.success) {
      console.log(`✅ Connection successful (${connectionTest.latency}ms)`);
      console.log(`   Response: ${connectionTest.response}\n`);
    } else {
      console.error(`❌ Connection failed: ${connectionTest.error}`);
      if (connectionTest.details) {
        console.error(`   Details:`, connectionTest.details);
      }
      return;
    }

    // Test chatbot functionality with queries similar to the curl example
    console.log('💬 Testing chatbot functionality...');
    const testQueries = [
      'What is this webpage about?',
      'How to use matplotlib in Python?',
      'Explain machine learning in simple terms.',
      'What are the benefits of using AI in business?'
    ];

    for (const query of testQueries) {
      console.log(`\n📝 Query: "${query}"`);
      try {
        const response = await alfaProvider.sendMessage(query);
        if (response.error) {
          console.error(`❌ Error: ${response.message}`);
        } else {
          console.log(`✅ Response (${response.content.length} chars):`);
          console.log(`   ${response.content.substring(0, 150)}...`);
          if (response.metadata) {
            console.log(`   Model: ${response.metadata.model || 'N/A'}`);
            console.log(`   Usage: ${JSON.stringify(response.metadata.usage || {})}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing query: ${error.message}`);
      }
    }

    // Test webpage analysis functionality (matching the curl example pattern)
    console.log('\n🌐 Testing webpage analysis functionality...');
    const webpageContent = "This is the main content of the webpage that the user is viewing. It contains information about AI and machine learning technologies.";
    const imageInfo = { totalImages: 3, processedImages: 1 };
    const userQuestion = "What is this webpage about?";
    
    const webpagePrompt = alfaProvider.createWebpageAnalysisPrompt(webpageContent, userQuestion, imageInfo);
    
    try {
      const webResponse = await alfaProvider.sendMessage(webpagePrompt);
      console.log(`✅ Webpage analysis response:`);
      console.log(`   ${webResponse.content.substring(0, 200)}...`);
    } catch (error) {
      console.error(`❌ Webpage analysis failed: ${error.message}`);
    }

    // Test capabilities
    console.log('\n🔧 Provider capabilities:');
    const capabilities = alfaProvider.getCapabilities();
    console.log(`   RAG Support: ${capabilities.supportsRAG}`);
    console.log(`   Vision Support: ${capabilities.supportsVision}`);
    console.log(`   Streaming Support: ${capabilities.supportsStreaming}`);
    console.log(`   OpenAI Compatible: ${capabilities.customFeatures.openaiCompatible}`);

    console.log('\n🎉 Alfa integration test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('   API Response:', error.response.data);
      console.error('   Status:', error.response.status);
    }
    process.exit(1);
  }
}

// Run the test
testAlfaIntegration().catch(console.error); 