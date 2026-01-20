import express from 'express';
import { agentServerManager } from '../services/agentServerManager.js';
import { getAllAgents, getAgent, getWorkflow } from '../utils/storage.js';

const router = express.Router();

/**
 * Launch agent servers for specific agents
 * POST /api/agent-servers/launch
 * Body: { agentIds: ['agent1', 'agent2'] } or { agentNames: ['Agent1', 'Agent2'] }
 */
router.post('/launch', async (req, res) => {
  try {
    const { agentIds, agentNames, text, workflowId } = req.body;
    let agentIdentifiers = [];

    if (text) {
      // Launch agents mentioned in text
      const result = await agentServerManager.launchAgentsFromText(text);
      return res.json({
        success: true,
        result,
        message: 'Agent servers launched from text'
      });
    }

    if (workflowId) {
      // Launch agents mentioned in workflow
      const workflow = await getWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({ error: 'Workflow not found' });
      }
      
      const result = await agentServerManager.launchAgentsFromText(workflow.prompt);
      return res.json({
        success: true,
        result,
        workflowId,
        message: 'Agent servers launched from workflow'
      });
    }

    if (agentIds && Array.isArray(agentIds)) {
      agentIdentifiers = agentIds;
    } else if (agentNames && Array.isArray(agentNames)) {
      agentIdentifiers = agentNames;
    } else {
      return res.status(400).json({ 
        error: 'Must provide agentIds, agentNames, text, or workflowId' 
      });
    }

    const result = await agentServerManager.launchAgents(agentIdentifiers);
    
    res.json({
      success: true,
      result,
      message: 'Agent server launch completed'
    });

  } catch (error) {
    console.error('❌ Error launching agent servers:', error.message);
    res.status(500).json({ 
      error: 'Failed to launch agent servers',
      details: error.message 
    });
  }
});

/**
 * Stop agent server for a specific agent
 * POST /api/agent-servers/stop/:agentId
 */
router.post('/stop/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const success = await agentServerManager.stopAgentServer(agentId);
    
    if (success) {
      res.json({
        success: true,
        message: `Agent server stopped for ${agentId}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to stop agent server'
      });
    }

  } catch (error) {
    console.error('❌ Error stopping agent server:', error.message);
    res.status(500).json({ 
      error: 'Failed to stop agent server',
      details: error.message 
    });
  }
});

/**
 * Stop all agent servers
 * POST /api/agent-servers/stop-all
 */
router.post('/stop-all', async (req, res) => {
  try {
    const result = await agentServerManager.stopAllServers();
    
    res.json({
      success: true,
      result,
      message: `Stopped ${result.stopped.length} servers, ${result.failed.length} failed`
    });

  } catch (error) {
    console.error('❌ Error stopping all agent servers:', error.message);
    res.status(500).json({ 
      error: 'Failed to stop agent servers',
      details: error.message 
    });
  }
});

/**
 * Restart agent server for a specific agent
 * POST /api/agent-servers/restart/:agentId
 */
router.post('/restart/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const success = await agentServerManager.restartAgentServer(agentId);
    
    if (success) {
      res.json({
        success: true,
        message: `Agent server restarted for ${agentId}`
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to restart agent server'
      });
    }

  } catch (error) {
    console.error('❌ Error restarting agent server:', error.message);
    res.status(500).json({ 
      error: 'Failed to restart agent server',
      details: error.message 
    });
  }
});

/**
 * Get status of a specific agent server
 * GET /api/agent-servers/status/:agentId
 */
router.get('/status/:agentId', async (req, res) => {
  try {
    const { agentId } = req.params;
    const status = agentServerManager.getServerStatus(agentId);
    
    if (status) {
      res.json({
        success: true,
        status
      });
    } else {
      res.json({
        success: true,
        status: null,
        message: 'No server running for this agent'
      });
    }

  } catch (error) {
    console.error('❌ Error getting agent server status:', error.message);
    res.status(500).json({ 
      error: 'Failed to get agent server status',
      details: error.message 
    });
  }
});

/**
 * Get status of all running agent servers
 * GET /api/agent-servers/status
 */
router.get('/status', async (req, res) => {
  try {
    const systemStatus = agentServerManager.getSystemStatus();
    
    res.json({
      success: true,
      systemStatus
    });

  } catch (error) {
    console.error('❌ Error getting system status:', error.message);
    res.status(500).json({ 
      error: 'Failed to get system status',
      details: error.message 
    });
  }
});

/**
 * Get list of running servers
 * GET /api/agent-servers/running
 */
router.get('/running', async (req, res) => {
  try {
    const runningServers = agentServerManager.getRunningServers();
    
    res.json({
      success: true,
      runningServers,
      count: runningServers.length
    });

  } catch (error) {
    console.error('❌ Error getting running servers:', error.message);
    res.status(500).json({ 
      error: 'Failed to get running servers',
      details: error.message 
    });
  }
});

/**
 * Parse agent mentions from text (utility endpoint)
 * POST /api/agent-servers/parse-mentions
 * Body: { text: "Visit @Playwright and use @DocumentIntelligence" }
 */
router.post('/parse-mentions', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const mentions = agentServerManager.parseAgentMentions(text);
    
    // Get agent details for the mentions
    const allAgents = await getAllAgents();
    const mentionedAgents = mentions.map(mentionName => {
      const agent = allAgents.find(a => 
        a.name.toLowerCase() === mentionName.toLowerCase() && a.isActive
      );
      return {
        mentionName,
        agent: agent ? {
          id: agent.id,
          name: agent.name,
          description: agent.description,
          providerType: agent.providerType,
          requiresServer: agentServerManager.requiresServer(agent),
          isRunning: agentServerManager.isServerRunning(agent.id)
        } : null
      };
    });
    
    res.json({
      success: true,
      text,
      mentions,
      mentionedAgents,
      totalMentions: mentions.length,
      validAgents: mentionedAgents.filter(m => m.agent).length
    });

  } catch (error) {
    console.error('❌ Error parsing mentions:', error.message);
    res.status(500).json({ 
      error: 'Failed to parse mentions',
      details: error.message 
    });
  }
});

/**
 * Test agent server functionality
 * GET /api/agent-servers/test
 */
router.get('/test', async (req, res) => {
  try {
    const testText = "Visit @Playwright and use @DocumentIntelligence to analyze the content";
    const mentions = agentServerManager.parseAgentMentions(testText);
    const systemStatus = agentServerManager.getSystemStatus();
    
    res.json({
      success: true,
      test: {
        testText,
        parsedMentions: mentions,
        systemStatus
      },
      message: 'Agent Server Manager is operational'
    });

  } catch (error) {
    console.error('❌ Agent server test failed:', error.message);
    res.status(500).json({ 
      error: 'Agent server test failed',
      details: error.message 
    });
  }
});

export default router; 