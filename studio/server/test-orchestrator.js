#!/usr/bin/env node

/**
 * Test script for the Orchestrator Service
 * Run with: node server/test-orchestrator.js
 */

import dotenv from 'dotenv';
import { orchestratorService } from './services/orchestratorService.js';
import { baseLLMService } from './services/baseLLMService.js';
import { getAllAgents } from './utils/storage.js';

// Load environment variables
dotenv.config();

async function testOrchestrator() {
  console.log('🧪 Testing Orchestrator Service\n');

  try {
    // Test 1: Initialize base LLM
    console.log('1️⃣ Testing Base LLM Initialization...');
    await baseLLMService.initialize();
    console.log('✅ Base LLM initialized successfully\n');

    // Test 2: Check available agents
    console.log('2️⃣ Checking Available Agents...');
    const agents = await getAllAgents();
    const activeAgents = agents.filter(agent => agent.isActive);
    
    console.log(`📊 Total agents: ${agents.length}`);
    console.log(`✅ Active agents: ${activeAgents.length}`);
    
    if (activeAgents.length > 0) {
      console.log('📋 Active agent names:');
      activeAgents.forEach(agent => {
        console.log(`   - ${agent.name}: ${agent.description || 'No description'}`);
      });
    } else {
      console.log('⚠️  No active agents found - orchestrator will handle requests directly');
    }
    console.log();

    // Test 3: Test task analysis
    console.log('3️⃣ Testing Task Analysis...');
    const testMessages = [
      "What's the weather like today?",
      "Calculate the ROI for our Q4 campaign and send a summary to the team",
      "Research competitor pricing and analyze our market position",
      "Hello, how are you doing?"
    ];

    for (const message of testMessages) {
      console.log(`\n🔍 Analyzing: "${message}"`);
      
      try {
        const taskAnalysis = await orchestratorService.analyzeTaskRequirements(message, activeAgents);
        
        // Get analysis from Alfa
        const analysisContext = {
          history: [],
          metadata: { purpose: 'test-analysis' }
        };

        const analysisResponse = await baseLLMService.alfaProvider.sendMessage(
          taskAnalysis.prompt, 
          analysisContext
        );

        let result;
        try {
          result = JSON.parse(analysisResponse.content);
          
          console.log(`   📊 Has actionable tasks: ${result.hasActionableTasks}`);
          console.log(`   💭 Reasoning: ${result.reasoning}`);
          
          if (result.detectedTasks && result.detectedTasks.length > 0) {
            console.log(`   📝 Detected tasks (${result.detectedTasks.length}):`);
            result.detectedTasks.forEach((task, index) => {
              console.log(`      ${index + 1}. ${task.description}`);
              console.log(`         Priority: ${task.priority}`);
              console.log(`         Suggested agents: ${task.suggestedAgents.join(', ') || 'None'}`);
            });
          }
        } catch (parseError) {
          console.log(`   ❌ Failed to parse analysis: ${parseError.message}`);
          console.log(`   📄 Raw response: ${analysisResponse.content.substring(0, 200)}...`);
        }
        
      } catch (error) {
        console.log(`   ❌ Analysis failed: ${error.message}`);
      }
    }

    // Test 4: Test full workflow (if agents available)
    if (activeAgents.length > 0) {
      console.log('\n4️⃣ Testing Full Workflow...');
      const workflowTestMessage = "Test the capabilities of available agents";
      
      console.log(`🎬 Running workflow for: "${workflowTestMessage}"`);
      
      try {
        const workflowResult = await orchestratorService.orchestrateWorkflow(
          workflowTestMessage,
          [], // Empty conversation history
          baseLLMService.alfaProvider
        );

        console.log(`✅ Workflow completed:`);
        console.log(`   🆔 Workflow ID: ${workflowResult.workflowId}`);
        console.log(`   🤖 Requires agents: ${workflowResult.requiresAgents}`);
        console.log(`   ✅ Is complete: ${workflowResult.isComplete}`);
        console.log(`   📊 Completion: ${workflowResult.completionPercentage || 100}%`);
        
        if (workflowResult.agentsCalled && workflowResult.agentsCalled.length > 0) {
          console.log(`   👥 Agents called: ${workflowResult.agentsCalled.join(', ')}`);
        }
        
        if (workflowResult.taskResults && workflowResult.taskResults.length > 0) {
          console.log(`   📋 Task results (${workflowResult.taskResults.length}):`);
          workflowResult.taskResults.forEach((result, index) => {
            console.log(`      ${index + 1}. ${result.success ? '✅' : '❌'} ${result.task.description}`);
            if (result.success) {
              console.log(`         Response: ${result.response.content.substring(0, 100)}...`);
            } else {
              console.log(`         Error: ${result.error}`);
            }
          });
        }
        
      } catch (error) {
        console.log(`❌ Workflow test failed: ${error.message}`);
      }
    }

    // Test 5: Test connection endpoint
    console.log('\n5️⃣ Testing Connection...');
    try {
      const connectionTest = await baseLLMService.testConnection();
      console.log(`✅ Connection test: ${connectionTest.success ? 'PASSED' : 'FAILED'}`);
      if (!connectionTest.success) {
        console.log(`   ❌ Error: ${connectionTest.error}`);
      }
    } catch (error) {
      console.log(`❌ Connection test failed: ${error.message}`);
    }

    console.log('\n🎉 Orchestrator testing completed!');
    console.log('\n📋 Next Steps:');
    console.log('   1. Start the server: npm run dev');
    console.log('   2. Test via API: curl http://localhost:5000/api/orchestrator/test');
    console.log('   3. Test via chat interface with task-based messages');
    console.log('   4. Monitor server logs for workflow execution details');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check Alfa AI credentials in .env file');
    console.error('   2. Ensure required environment variables are set');
    console.error('   3. Verify agent configurations in storage');
    console.error('   4. Check server logs for detailed error information');
    
    process.exit(1);
  }
}

// Run the test
testOrchestrator().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
}); 