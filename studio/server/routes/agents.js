import express from 'express';
import { 
  saveAgent, 
  getAgent, 
  getAllAgents, 
  deleteAgent 
} from '../utils/storage.js';
import { testAgentConnection } from '../services/agentService.js';

const router = express.Router();

// Get all agents
router.get('/', async (req, res) => {
  try {
    const agents = await getAllAgents();
    res.json(agents);
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// Get a specific agent
router.get('/:id', async (req, res) => {
  try {
    const agent = await getAgent(req.params.id);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json(agent);
  } catch (error) {
    console.error('Error fetching agent:', error);
    res.status(500).json({ error: 'Failed to fetch agent' });
  }
});

// Create a new agent
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      apiEndpoint, 
      apiKey, 
      configuration = {},
      mcpServerId = null,
      mcpConfig = null, // Add MCP config support
      providerType = 'openai', // New field for provider type
      isActive = true
    } = req.body;

    if (!name) {
      return res.status(400).json({ 
        error: 'Name is required' 
      });
    }

    // For MCP agents, we don't require API endpoint
    // For traditional agents, require either providerType or apiEndpoint
    if (!mcpConfig && !providerType && !apiEndpoint) {
      return res.status(400).json({ 
        error: 'Either MCP configuration, providerType, or apiEndpoint is required' 
      });
    }

    const agent = {
      name,
      description: description || '',
      apiEndpoint: apiEndpoint || '', // Keep for backward compatibility
      apiKey: apiKey || '',
      configuration,
      mcpServerId,
      mcpConfig, // Add MCP config field
      providerType: mcpConfig ? 'mcp' : providerType, // Set provider type to MCP if config is provided
      isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedAgent = await saveAgent(agent);
    
    // Don't return sensitive information like API keys in response
    const responseAgent = { ...savedAgent };
    if (responseAgent.apiKey) {
      responseAgent.apiKey = '***hidden***';
    }
    
    res.status(201).json(responseAgent);
  } catch (error) {
    console.error('Error creating agent:', error);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// Update an agent
router.put('/:id', async (req, res) => {
  try {
    const agentId = req.params.id;
    const updates = req.body;
    
    const existingAgent = await getAgent(agentId);
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updatedAgent = {
      ...existingAgent,
      ...updates,
      id: agentId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    const savedAgent = await saveAgent(updatedAgent);
    
    // Don't return sensitive information
    const responseAgent = { ...savedAgent };
    if (responseAgent.apiKey) {
      responseAgent.apiKey = '***hidden***';
    }
    
    res.json(responseAgent);
  } catch (error) {
    console.error('Error updating agent:', error);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// Delete an agent
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteAgent(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Agent not found' });
    }
    res.json({ message: 'Agent deleted successfully' });
  } catch (error) {
    console.error('Error deleting agent:', error);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// Update agent configuration
router.patch('/:id/config', async (req, res) => {
  try {
    const agentId = req.params.id;
    const { configuration } = req.body;
    
    const existingAgent = await getAgent(agentId);
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updatedAgent = {
      ...existingAgent,
      configuration: {
        ...existingAgent.configuration,
        ...configuration
      },
      updatedAt: new Date().toISOString()
    };

    const savedAgent = await saveAgent(updatedAgent);
    
    // Don't return sensitive information
    const responseAgent = { ...savedAgent };
    if (responseAgent.apiKey) {
      responseAgent.apiKey = '***hidden***';
    }
    
    res.json(responseAgent);
  } catch (error) {
    console.error('Error updating agent configuration:', error);
    res.status(500).json({ error: 'Failed to update agent configuration' });
  }
});

// Toggle agent active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const agentId = req.params.id;
    
    const existingAgent = await getAgent(agentId);
    if (!existingAgent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const updatedAgent = {
      ...existingAgent,
      isActive: !existingAgent.isActive,
      updatedAt: new Date().toISOString()
    };

    const savedAgent = await saveAgent(updatedAgent);
    
    // Don't return sensitive information
    const responseAgent = { ...savedAgent };
    if (responseAgent.apiKey) {
      responseAgent.apiKey = '***hidden***';
    }
    
    res.json(responseAgent);
  } catch (error) {
    console.error('Error toggling agent status:', error);
    res.status(500).json({ error: 'Failed to toggle agent status' });
  }
});

// Test agent connection
router.post('/:id/test', async (req, res) => {
  try {
    const agentId = req.params.id;
    
    const agent = await getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const result = await testAgentConnection(agent);
    res.json(result);
  } catch (error) {
    console.error('Error testing agent:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test agent connection' 
    });
  }
});

// Debug spawn command
router.post('/:id/debug-spawn', async (req, res) => {
  try {
    const agentId = req.params.id;
    
    const agent = await getAgent(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Import mcpService
    const { mcpService } = await import('../services/mcpService.js');
    
    // Test spawn directly
    const result = await mcpService.testSpawn('npx', ['@playwright/mcp@latest']);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error testing spawn:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router; 