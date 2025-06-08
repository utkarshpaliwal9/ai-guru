import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

import { orchestratorService } from './services/orchestratorService.js';
import { AlfaProvider } from './services/providers/AlfaProvider.js';

async function debugGitHubTask() {
  console.log('🐛 Debugging GitHub Task Workflow\n');

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
    await alfaProvider.initialize(alfaConfig);
    console.log('✅ Alfa AI Provider initialized successfully\n');

    // Test message
    const userMessage = "Visit the GitHub homepage and tell me what's featured on their main page today";
    const conversationHistory = [];

    console.log('2️⃣ Starting orchestrator workflow...');
    const workflowResult = await orchestratorService.orchestrateWorkflow(
      userMessage,
      conversationHistory,
      alfaProvider
    );

    console.log('\n📊 Initial Workflow Result:');
    console.log('   - Workflow ID:', workflowResult.workflowId);
    console.log('   - Requires Agents:', workflowResult.requiresAgents);
    console.log('   - Is Complete:', workflowResult.isComplete);
    console.log('   - Completion %:', workflowResult.completionPercentage);
    console.log('   - Task Results:', workflowResult.taskResults?.length || 0);
    console.log('   - Agents Called:', workflowResult.agentsCalled?.join(', ') || 'None');
    console.log('   - Remaining Tasks:', workflowResult.remainingTasks?.length || 0);

    if (workflowResult.taskResults && workflowResult.taskResults.length > 0) {
      console.log('\n📋 Task Results Details:');
      workflowResult.taskResults.forEach((result, index) => {
        console.log(`   Task ${index + 1}:`);
        console.log(`     - Success: ${result.success}`);
        console.log(`     - Agent: ${result.agent?.name || 'None'}`);
        console.log(`     - Task: ${result.task?.description || 'Unknown'}`);
        if (result.response?.content) {
          console.log(`     - Response: ${result.response.content.substring(0, 100)}...`);
        }
        if (result.error) {
          console.log(`     - Error: ${result.error}`);
        }
      });
    }

    if (workflowResult.remainingTasks && workflowResult.remainingTasks.length > 0) {
      console.log('\n🔄 Remaining Tasks:');
      workflowResult.remainingTasks.forEach((task, index) => {
        console.log(`   Task ${index + 1}: ${task.description}`);
      });
    }

    // Test continuation if not complete
    if (!workflowResult.isComplete && workflowResult.remainingTasks?.length > 0) {
      console.log('\n3️⃣ Testing workflow continuation...');
      
      const continuedResult = await orchestratorService.continueWorkflow(
        workflowResult.workflowId,
        workflowResult.remainingTasks,
        userMessage,
        conversationHistory,
        alfaProvider
      );

      console.log('\n📊 Continuation Result:');
      console.log('   - Continued:', continuedResult.continued);
      console.log('   - Is Complete:', continuedResult.isComplete);
      console.log('   - Completion %:', continuedResult.completionPercentage);
      console.log('   - Additional Task Results:', continuedResult.taskResults?.length || 0);
      console.log('   - Additional Agents Called:', continuedResult.agentsCalled?.join(', ') || 'None');
      console.log('   - Remaining Tasks:', continuedResult.remainingTasks?.length || 0);

      if (continuedResult.taskResults && continuedResult.taskResults.length > 0) {
        console.log('\n📋 Additional Task Results:');
        continuedResult.taskResults.forEach((result, index) => {
          console.log(`   Task ${index + 1}:`);
          console.log(`     - Success: ${result.success}`);
          console.log(`     - Agent: ${result.agent?.name || 'None'}`);
          console.log(`     - Task: ${result.task?.description || 'Unknown'}`);
          if (result.response?.content) {
            console.log(`     - Response: ${result.response.content.substring(0, 100)}...`);
          }
          if (result.error) {
            console.log(`     - Error: ${result.error}`);
          }
        });
      }
    }

    console.log('\n🎉 Debug completed successfully!');

  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the debug
debugGitHubTask(); 