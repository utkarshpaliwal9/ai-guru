import { baseLLMService } from './services/baseLLMService.js';

async function testWorkflow() {
  console.log('🧪 Testing Workflow End-to-End\n');

  try {
    // Initialize the base LLM service
    await baseLLMService.initialize();
    console.log('✅ BaseLLMService initialized\n');

    // Test simple message (should work)
    console.log('1️⃣ Testing simple message...');
    const simpleResult = await baseLLMService.processMessage(
      "Hello, how are you?",
      [],
      "test-conversation-1"
    );
    console.log(`✅ Simple message result: ${simpleResult.content.substring(0, 100)}...\n`);

    // Test GitHub task (should trigger workflow)
    console.log('2️⃣ Testing GitHub task workflow...');
    const githubResult = await baseLLMService.processMessage(
      "Visit GitHub.com and tell me what's featured today",
      [],
      "test-conversation-2"
    );
    console.log(`✅ GitHub task result: ${githubResult.content.substring(0, 100)}...`);
    console.log(`📊 Metadata:`, {
      orchestrated: githubResult.metadata?.orchestrated,
      workflowId: githubResult.metadata?.workflowId,
      agentsCalled: githubResult.metadata?.agentsCalled,
      isComplete: githubResult.metadata?.isComplete,
      continuations: githubResult.metadata?.continuations
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('📄 Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

testWorkflow(); 