import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import { orchestratorService } from './services/orchestratorService.js';
import { AlfaProvider } from './services/providers/AlfaProvider.js';

async function debugWorkflowDetailed() {
  console.log('🔍 Detailed GitHub Workflow Debug\n');

  try {
    // Initialize Alfa Provider
    console.log('1️⃣ Initializing Alfa AI Provider...');
    const alfaConfig = {
      name: 'debug-alfa',
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
    
    const alfaProvider = new AlfaProvider(alfaConfig);
    await alfaProvider.initialize();
    console.log('✅ Alfa AI Provider initialized\n');

    // Test message
    const testMessage = "Visit GitHub.com and tell me what's featured today";
    console.log(`2️⃣ Starting workflow for: "${testMessage}"`);

    // Start workflow
    const workflowResult = await orchestratorService.orchestrateWorkflow(
      testMessage,
      [],
      alfaProvider
    );

    console.log('3️⃣ Workflow Result:');
    console.log(`   - Workflow ID: ${workflowResult.workflowId}`);
    console.log(`   - Requires Agents: ${workflowResult.requiresAgents}`);
    console.log(`   - Is Complete: ${workflowResult.isComplete}`);
    console.log(`   - Completion %: ${workflowResult.completionPercentage}`);
    console.log(`   - Task Results Count: ${workflowResult.taskResults?.length || 0}`);
    console.log(`   - Remaining Tasks: ${workflowResult.remainingTasks?.length || 0}\n`);

    // Check task results in detail
    if (workflowResult.taskResults && workflowResult.taskResults.length > 0) {
      console.log('4️⃣ Analyzing Task Results:');
      workflowResult.taskResults.forEach((result, index) => {
        console.log(`   Task ${index + 1}:`);
        console.log(`     - Success: ${result.success}`);
        console.log(`     - Agent: ${result.agent ? result.agent.name : 'NULL AGENT ❌'}`);
        console.log(`     - Response length: ${result.response ? result.response.content?.length || 0 : 0} chars`);
        console.log(`     - Error: ${result.error || 'none'}\n`);
      });
    }

    // If workflow is not complete, test continuation
    if (!workflowResult.isComplete && workflowResult.remainingTasks?.length > 0) {
      console.log('5️⃣ Testing Workflow Continuation...');
      try {
        const continuedResult = await orchestratorService.continueWorkflow(
          workflowResult.workflowId,
          workflowResult.remainingTasks,
          testMessage,
          alfaProvider,
          []
        );

        console.log('✅ Continuation completed successfully');
        console.log(`   - Is Complete: ${continuedResult.isComplete}`);
        console.log(`   - Completion %: ${continuedResult.completionPercentage}`);
        console.log(`   - Task Results Count: ${continuedResult.taskResults?.length || 0}`);

        // Check continued task results
        if (continuedResult.taskResults && continuedResult.taskResults.length > 0) {
          console.log('   Continued Task Results:');
          continuedResult.taskResults.forEach((result, index) => {
            console.log(`     Task ${index + 1}:`);
            console.log(`       - Success: ${result.success}`);
            console.log(`       - Agent: ${result.agent ? result.agent.name : 'NULL AGENT ❌'}`);
            console.log(`       - Response length: ${result.response ? result.response.content?.length || 0 : 0} chars`);
            console.log(`       - Error: ${result.error || 'none'}`);
          });
        }

      } catch (continueError) {
        console.error('❌ Error during workflow continuation:');
        console.error(`   - Message: ${continueError.message}`);
        console.error(`   - Stack: ${continueError.stack?.split('\n')[0]}`);
      }
    }

  } catch (error) {
    console.error('❌ Error in workflow debug:');
    console.error(`   - Message: ${error.message}`);
    console.error(`   - Stack: ${error.stack?.split('\n')[0]}`);
  }
}

// Run the debug
debugWorkflowDetailed(); 