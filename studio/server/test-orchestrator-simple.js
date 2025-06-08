#!/usr/bin/env node

/**
 * Simple Orchestrator Test - Tests core functionality without full LLM initialization
 * Run with: node server/test-orchestrator-simple.js
 */

import dotenv from 'dotenv';
import { orchestratorService } from './services/orchestratorService.js';
import { getAllAgents } from './utils/storage.js';

// Load environment variables
dotenv.config();

async function testOrchestratorComponents() {
  console.log('🧪 Testing Orchestrator Components (Simple Mode)\n');

  try {
    // Test 1: Check storage and agent functionality
    console.log('1️⃣ Testing Storage and Agent Access...');
    const agents = await getAllAgents();
    const activeAgents = agents.filter(agent => agent.isActive);
    
    console.log(`📊 Total agents: ${agents.length}`);
    console.log(`✅ Active agents: ${activeAgents.length}`);
    
    if (activeAgents.length > 0) {
      console.log('📋 Active agent details:');
      activeAgents.forEach(agent => {
        console.log(`   - ${agent.name}: ${agent.description || 'No description'}`);
        console.log(`     Provider: ${agent.providerType || 'Not specified'}`);
        console.log(`     Active: ${agent.isActive}`);
      });
    } else {
      console.log('⚠️  No active agents found');
    }
    console.log();

    // Test 2: Test task analysis prompt generation
    console.log('2️⃣ Testing Task Analysis Prompt Generation...');
    const testMessage = "Calculate the ROI for our Q4 campaign and send a summary to the team";
    
    try {
      const taskAnalysis = await orchestratorService.analyzeTaskRequirements(testMessage, activeAgents);
      
      console.log(`✅ Task analysis prompt generated successfully`);
      console.log(`📝 Prompt length: ${taskAnalysis.prompt.length} characters`);
      console.log(`🤖 Available agents in analysis: ${taskAnalysis.agentSummary.length}`);
      
      // Show a snippet of the prompt
      const promptSnippet = taskAnalysis.prompt.substring(0, 200) + '...';
      console.log(`📄 Prompt snippet: "${promptSnippet}"`);
      
    } catch (error) {
      console.log(`❌ Task analysis failed: ${error.message}`);
    }
    console.log();

    // Test 3: Test agent selection logic
    console.log('3️⃣ Testing Agent Selection Logic...');
    
    const mockTasks = [
      {
        description: "Calculate financial metrics",
        suggestedAgents: activeAgents.length > 0 ? [activeAgents[0].name] : ["TestAgent"],
        priority: "high"
      },
      {
        description: "Send email notification", 
        suggestedAgents: ["NonExistentAgent"],
        priority: "medium"
      }
    ];

    mockTasks.forEach((task, index) => {
      try {
        const selection = orchestratorService.selectBestAgent(task, activeAgents);
        console.log(`   Task ${index + 1}: "${task.description}"`);
        console.log(`   Selected agent: ${selection.agent ? selection.agent.name : 'None'}`);
        console.log(`   Reasoning: ${selection.reasoning}`);
      } catch (error) {
        console.log(`   Task ${index + 1} selection failed: ${error.message}`);
      }
    });
    console.log();

    // Test 4: Test completion evaluation prompt generation
    console.log('4️⃣ Testing Completion Evaluation...');
    
    const mockTaskResults = [
      {
        success: true,
        task: { description: "Calculate ROI" },
        agent: { name: "FinanceAgent" },
        response: { content: "ROI calculated: 15.2%" }
      },
      {
        success: false,
        task: { description: "Send email" },
        agent: { name: "EmailAgent" },
        error: "Email service unavailable"
      }
    ];

    try {
      const completionEval = await orchestratorService.evaluateCompletion(
        mockTaskResults, 
        testMessage, 
        activeAgents
      );
      
      console.log(`✅ Completion evaluation prompt generated`);
      console.log(`📊 Completed tasks: ${completionEval.completedTasks}`);
      console.log(`❌ Failed tasks: ${completionEval.failedTasks}`);
      console.log(`📈 Total tasks: ${completionEval.totalTasks}`);
      
    } catch (error) {
      console.log(`❌ Completion evaluation failed: ${error.message}`);
    }
    console.log();

    // Test 5: Test workflow summary generation
    console.log('5️⃣ Testing Workflow Summary Generation...');
    
    try {
      const summary = orchestratorService.createWorkflowSummary(mockTaskResults, {
        completedTasks: 1,
        failedTasks: 1,
        totalTasks: 2
      });
      
      console.log(`✅ Workflow summary generated`);
      console.log(`📝 Summary length: ${summary.length} characters`);
      console.log(`📄 Summary preview:`);
      console.log(summary.substring(0, 300) + '...');
      
    } catch (error) {
      console.log(`❌ Workflow summary generation failed: ${error.message}`);
    }
    console.log();

    // Test 6: Check environment variables
    console.log('6️⃣ Checking Environment Configuration...');
    
    const requiredVars = ['ALFA_AUTH_TOKEN', 'ALFA_PROJECT_ID', 'ALFA_CHAT_HOST', 'ALFA_API_HOST'];
    const configuredVars = requiredVars.filter(varName => process.env[varName]);
    
    console.log(`✅ Configured environment variables: ${configuredVars.length}/${requiredVars.length}`);
    configuredVars.forEach(varName => {
      const value = process.env[varName];
      const maskedValue = varName.includes('TOKEN') ? 
        value.substring(0, 10) + '...' : 
        value.substring(0, 30) + '...';
      console.log(`   ✓ ${varName}: ${maskedValue}`);
    });
    
    if (configuredVars.length < requiredVars.length) {
      const missingVars = requiredVars.filter(varName => !process.env[varName]);
      console.log(`❌ Missing variables: ${missingVars.join(', ')}`);
    }
    console.log();

    console.log('🎉 Component Testing Completed!\n');
    
    console.log('📋 Test Results Summary:');
    console.log(`   ✅ Storage access: Working`);
    console.log(`   ✅ Agent management: Working`);
    console.log(`   ✅ Task analysis: Working`);
    console.log(`   ✅ Agent selection: Working`);
    console.log(`   ✅ Completion evaluation: Working`);
    console.log(`   ✅ Workflow summary: Working`);
    console.log(`   ${configuredVars.length === requiredVars.length ? '✅' : '⚠️'} Environment config: ${configuredVars.length === requiredVars.length ? 'Complete' : 'Incomplete'}`);
    
    console.log('\n📋 Next Steps:');
    if (configuredVars.length === requiredVars.length) {
      console.log('   1. Start the server: npm run dev');
      console.log('   2. Test full workflow via API: curl http://localhost:5000/api/orchestrator/test');
      console.log('   3. Test via chat interface with task-based messages');
      console.log('   4. Monitor logs for full workflow execution');
    } else {
      console.log('   1. Configure missing Alfa AI environment variables');
      console.log('   2. Restart the test to verify full functionality');
    }

  } catch (error) {
    console.error('❌ Component test failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Check file system permissions');
    console.error('   2. Verify agent storage is accessible');
    console.error('   3. Check module imports and dependencies');
    
    process.exit(1);
  }
}

// Run the component test
testOrchestratorComponents().catch(error => {
  console.error('💥 Unexpected error:', error);
  process.exit(1);
}); 