import express from 'express';
import { orchestratorService } from '../services/orchestratorService.js';
import { baseLLMService } from '../services/baseLLMService.js';
import { getConversation, saveConversation } from '../utils/storage.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

/**
 * Continue an incomplete workflow
 * POST /api/orchestrator/continue-workflow
 */
router.post('/continue-workflow', async (req, res) => {
  try {
    const { 
      workflowId, 
      remainingTasks, 
      conversationId, 
      userMessage 
    } = req.body;

    if (!workflowId || !remainingTasks || !conversationId) {
      return res.status(400).json({ 
        error: 'Missing required fields: workflowId, remainingTasks, conversationId' 
      });
    }

    // Get conversation for context
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Prepare conversation history
    const conversationHistory = conversation.messages.map(msg => ({
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      type: msg.type
    }));

    // Initialize Alfa provider
    await baseLLMService.initialize();

    // Continue the workflow
    const continuedResult = await orchestratorService.continueWorkflow(
      workflowId,
      remainingTasks,
      userMessage || 'Continue with remaining tasks',
      conversationHistory,
      baseLLMService.alfaProvider
    );

    res.json({
      success: true,
      workflow: continuedResult,
      message: 'Workflow continued successfully'
    });

  } catch (error) {
    console.error('❌ Error continuing workflow:', error.message);
    res.status(500).json({ 
      error: 'Failed to continue workflow',
      details: error.message 
    });
  }
});

/**
 * Get workflow status
 * GET /api/orchestrator/workflow/:workflowId
 */
router.get('/workflow/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    
    // This would require storing workflow state in the future
    // For now, return a simple response
    res.json({
      workflowId,
      status: 'completed',
      message: 'Workflow status endpoint - implementation pending'
    });

  } catch (error) {
    console.error('❌ Error getting workflow status:', error.message);
    res.status(500).json({ 
      error: 'Failed to get workflow status',
      details: error.message 
    });
  }
});

/**
 * Test task analysis for a message
 * POST /api/orchestrator/analyze-tasks
 */
router.post('/analyze-tasks', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get available agents
    const { getAllAgents } = await import('../utils/storage.js');
    const availableAgents = await getAllAgents();
    const activeAgents = availableAgents.filter(agent => agent.isActive);

    // Analyze task requirements
    const taskAnalysis = await orchestratorService.analyzeTaskRequirements(message, activeAgents);

    // Initialize Alfa provider for analysis
    await baseLLMService.initialize();

    // Get analysis from Alfa
    const analysisContext = {
      history: [],
      metadata: { purpose: 'task-analysis-test' }
    };

    const analysisResponse = await baseLLMService.alfaProvider.sendMessage(
      taskAnalysis.prompt, 
      analysisContext
    );

    let taskAnalysisResult;
    try {
      // Handle JSON responses that may be wrapped in markdown code blocks
      let jsonContent = analysisResponse.content.trim();
      
      // Remove markdown code block formatting if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      taskAnalysisResult = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ Failed to parse analysis response in API:', parseError);
      return res.status(400).json({
        error: 'Failed to parse analysis response',
        rawResponse: analysisResponse.content.substring(0, 1000) + '...'
      });
    }

    res.json({
      success: true,
      analysis: taskAnalysisResult,
      availableAgents: taskAnalysis.agentSummary
    });

  } catch (error) {
    console.error('❌ Error analyzing tasks:', error.message);
    res.status(500).json({ 
      error: 'Failed to analyze tasks',
      details: error.message 
    });
  }
});

/**
 * Test orchestrator connection
 * GET /api/orchestrator/test
 */
router.get('/test', async (req, res) => {
  try {
    // Test base LLM connection
    const baseLLMTest = await baseLLMService.testConnection();
    
    // Get available agents count
    const { getAllAgents } = await import('../utils/storage.js');
    const agents = await getAllAgents();
    const activeAgents = agents.filter(agent => agent.isActive);

    res.json({
      success: true,
      baseLLM: baseLLMTest,
      orchestrator: {
        available: true,
        version: '1.0.0',
        activeWorkflows: orchestratorService.activeWorkflows.size
      },
      agents: {
        total: agents.length,
        active: activeAgents.length,
        names: activeAgents.map(agent => agent.name)
      }
    });

  } catch (error) {
    console.error('❌ Error testing orchestrator:', error.message);
    res.status(500).json({ 
      error: 'Orchestrator test failed',
      details: error.message 
    });
  }
});

export default router; 