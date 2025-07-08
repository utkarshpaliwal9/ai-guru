import express from 'express';
import { 
  saveMCPServer, 
  getMCPServer, 
  getAllMCPServers, 
  deleteMCPServer 
} from '../utils/storage.js';
import { mcpService } from '../services/mcpService.js';

const router = express.Router();

// Get all MCP servers
router.get('/', async (req, res) => {
  try {
    const servers = await getAllMCPServers();
    res.json(servers);
  } catch (error) {
    console.error('Error fetching MCP servers:', error);
    res.status(500).json({ error: 'Failed to fetch MCP servers' });
  }
});

// Get a specific MCP server
router.get('/:id', async (req, res) => {
  try {
    const server = await getMCPServer(req.params.id);
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    res.json(server);
  } catch (error) {
    console.error('Error fetching MCP server:', error);
    res.status(500).json({ error: 'Failed to fetch MCP server' });
  }
});

// Create a new MCP server
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      description, 
      endpoint, 
      serverType = 'external', // 'external', 'local', 'stdio'
      configuration = {},
      capabilities = [],
      isActive = true
    } = req.body;

    if (!name || !endpoint) {
      return res.status(400).json({ 
        error: 'Name and endpoint are required' 
      });
    }

    const mcpServer = {
      name,
      description: description || '',
      endpoint,
      serverType,
      configuration,
      capabilities,
      isActive,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const savedServer = await saveMCPServer(mcpServer);
    res.status(201).json(savedServer);
  } catch (error) {
    console.error('Error creating MCP server:', error);
    res.status(500).json({ error: 'Failed to create MCP server' });
  }
});

// Update an MCP server
router.put('/:id', async (req, res) => {
  try {
    const serverId = req.params.id;
    const updates = req.body;
    
    const existingServer = await getMCPServer(serverId);
    if (!existingServer) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    const updatedServer = {
      ...existingServer,
      ...updates,
      id: serverId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    const savedServer = await saveMCPServer(updatedServer);
    res.json(savedServer);
  } catch (error) {
    console.error('Error updating MCP server:', error);
    res.status(500).json({ error: 'Failed to update MCP server' });
  }
});

// Delete an MCP server
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteMCPServer(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'MCP server not found' });
    }
    res.json({ message: 'MCP server deleted successfully' });
  } catch (error) {
    console.error('Error deleting MCP server:', error);
    res.status(500).json({ error: 'Failed to delete MCP server' });
  }
});

// Test MCP server connection
router.post('/:id/test', async (req, res) => {
  try {
    const serverId = req.params.id;
    const server = await getMCPServer(serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    // TODO: Implement actual MCP connection testing
    // For now, we'll simulate a connection test
    const testResult = {
      success: true,
      message: 'Connection test successful',
      latency: Math.floor(Math.random() * 100) + 50, // Simulate latency
      timestamp: new Date().toISOString()
    };

    res.json(testResult);
  } catch (error) {
    console.error('Error testing MCP server:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to test MCP server connection' 
    });
  }
});

// Get MCP server capabilities
router.get('/:id/capabilities', async (req, res) => {
  try {
    const serverId = req.params.id;
    const server = await getMCPServer(serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    // TODO: Implement actual capability discovery
    // For now, return the stored capabilities
    res.json({
      capabilities: server.capabilities || [],
      lastUpdated: server.updatedAt
    });
  } catch (error) {
    console.error('Error fetching MCP server capabilities:', error);
    res.status(500).json({ error: 'Failed to fetch server capabilities' });
  }
});

// Toggle MCP server active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const serverId = req.params.id;
    
    const existingServer = await getMCPServer(serverId);
    if (!existingServer) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    const updatedServer = {
      ...existingServer,
      isActive: !existingServer.isActive,
      updatedAt: new Date().toISOString()
    };

    const savedServer = await saveMCPServer(updatedServer);
    res.json(savedServer);
  } catch (error) {
    console.error('Error toggling MCP server status:', error);
    res.status(500).json({ error: 'Failed to toggle server status' });
  }
});

// Execute an MCP tool
router.post('/execute-tool', async (req, res) => {
  try {
    const { agentId, toolName, toolArgs } = req.body;

    if (!agentId || !toolName) {
      return res.status(400).json({ error: 'agentId and toolName are required' });
    }

    console.log(`🔌 Executing MCP tool '${toolName}' for agent '${agentId}' with args:`, toolArgs);
    const result = await mcpService.callMCPTool(agentId, toolName, toolArgs);
    console.log(`✅ Tool execution result for '${toolName}':`, result);

    res.json({
      success: true,
      result: result
    });
  } catch (error) {
    console.error(`❌ Error executing MCP tool:`, error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.stack
    });
  }
});

export default router; 