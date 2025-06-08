import { orchestratorService } from './services/orchestratorService.js';

async function testContinuationDebug() {
  console.log('🔍 Debug: Testing Continuation Logic\n');

  try {
    // Test the continuation with a simple remaining task
    const mockRemainingTasks = [
      {
        description: "Test remaining task - get current time",
        priority: "high",
        suggestedAgents: ["Playwright"],
        context: "Simple test task to verify continuation logic",
        inputs: {
          action: "get_time"
        }
      }
    ];

    console.log('1️⃣ Testing continueWorkflow with mock task...');
    console.log(`📋 Mock remaining tasks:`, mockRemainingTasks);

    // Call the continueWorkflow method directly
    // Note: This will fail due to missing alfaProvider, but we can see the agent selection logic
    try {
      const result = await orchestratorService.continueWorkflow(
        'test-workflow-123',
        mockRemainingTasks,
        'Test message',
        [],
        null // This will cause an error, but we can see how far it gets
      );
      
      console.log('✅ Continue workflow result:', result);
    } catch (error) {
      console.log('📄 Expected error (missing alfaProvider):', error.message);
      
      // The important part is whether we can see agent selection working
      if (error.message.includes('alfaProvider')) {
        console.log('✅ Reached alfaProvider call - agent selection logic is working');
      }
    }

    // Test agent selection specifically
    console.log('\n2️⃣ Testing agent selection...');
    
    // Import getAllAgents to test agent availability
    const { getAllAgents } = await import('./services/agentService.js');
    const agents = await getAllAgents();
    const activeAgents = agents.filter(agent => agent.isActive);
    
    console.log(`📊 Active agents found: ${activeAgents.length}`);
    activeAgents.forEach(agent => {
      console.log(`   - ${agent.name}: ${agent.description || 'No description'}`);
    });

    if (activeAgents.length > 0) {
      const testTask = mockRemainingTasks[0];
      const agentSelection = orchestratorService.selectBestAgent(testTask, activeAgents);
      
      console.log('🎯 Agent selection result:');
      console.log(`   - Selected: ${agentSelection.agent ? agentSelection.agent.name : 'None'}`);
      console.log(`   - Reasoning: ${agentSelection.reasoning}`);
      
      if (agentSelection.agent) {
        console.log('✅ Agent selection is working correctly');
        
        // Test task execution (this might fail but we'll see the error)
        console.log('\n3️⃣ Testing task execution...');
        try {
          const taskResult = await orchestratorService.executeTask(
            testTask,
            agentSelection.agent,
            'Test message',
            []
          );
          console.log('✅ Task execution result:', taskResult);
        } catch (taskError) {
          console.log('❌ Task execution failed:', taskError.message);
          console.log('📄 This explains why continuations get stuck!');
        }
      } else {
        console.log('❌ No agent selected - this explains the issue!');
      }
    } else {
      console.log('❌ No active agents found - this explains the issue!');
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('📄 Stack:', error.stack?.split('\n').slice(0, 3).join('\n'));
  }
}

testContinuationDebug(); 