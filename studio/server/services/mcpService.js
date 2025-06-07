import { spawn } from 'child_process';

// Try to import MCP SDK, but handle gracefully if not available
let Client, StdioClientTransport;
try {
  const mcpSdk = await import('@modelcontextprotocol/sdk/client/index.js');
  Client = mcpSdk.Client;
  const mcpStdio = await import('@modelcontextprotocol/sdk/client/stdio.js');
  StdioClientTransport = mcpStdio.StdioClientTransport;
} catch (error) {
  console.warn('⚠️  MCP SDK not available. MCP functionality will be limited.');
  console.warn('To enable MCP support, install: npm install @modelcontextprotocol/sdk');
}

class MCPService {
  constructor() {
    this.connections = new Map(); // Store active MCP connections
  }

  /**
   * Initialize MCP connection for an agent
   */
  async initializeAgent(agent) {
    try {
      if (!Client || !StdioClientTransport) {
        throw new Error('MCP SDK not available. Please install @modelcontextprotocol/sdk');
      }

      if (!agent.mcpConfig) {
        throw new Error('No MCP configuration found for agent');
      }

      const config = agent.mcpConfig;
      let transport;
      let client;

      // Handle different MCP server types
      if (config.command) {
        // Stdio transport for command-based servers
        const process = spawn(config.command, config.args || [], {
          env: { ...process.env, ...config.env },
          cwd: config.cwd || process.cwd()
        });

        transport = new StdioClientTransport({
          reader: process.stdout,
          writer: process.stdin
        });
      } else if (config.transport === 'http' && config.endpoint) {
        // HTTP transport for web-based MCP servers
        transport = new HttpClientTransport(config.endpoint);
      } else {
        throw new Error('Unsupported MCP transport configuration');
      }

      client = new Client({
        name: `agent-${agent.id}`,
        version: '1.0.0'
      }, {
        capabilities: {}
      });

      await client.connect(transport);

      // Store the connection
      this.connections.set(agent.id, {
        client,
        transport,
        config,
        agent
      });

      console.log(`✅ MCP client initialized for agent: ${agent.name}`);
      return client;

    } catch (error) {
      console.error(`❌ Failed to initialize MCP for agent ${agent.name}:`, error.message);
      throw error;
    }
  }

  /**
   * Send a message to an MCP agent
   */
  async sendMessage(agentId, message, context = {}) {
    try {
      const connection = this.connections.get(agentId);
      if (!connection) {
        throw new Error(`No MCP connection found for agent ${agentId}`);
      }

      const { client, agent } = connection;

      // Get available tools from the MCP server
      const tools = await client.listTools();

      // For simple message handling, we'll use a generic approach
      // In a real implementation, you might want to route to specific tools
      // based on the message content or intent

      if (tools.tools && tools.tools.length > 0) {
        // Use the first available tool or find the most appropriate one
        const tool = tools.tools[0];
        
        const result = await client.callTool({
          name: tool.name,
          arguments: {
            message: message,
            context: JSON.stringify(context)
          }
        });

        return {
          success: true,
          content: result.content || 'Task completed successfully',
          metadata: {
            tool: tool.name,
            agentName: agent.name,
            timestamp: new Date().toISOString()
          }
        };
      } else {
        // If no tools available, return a generic response
        return {
          success: true,
          content: `Agent ${agent.name} received the message but has no available tools to process it.`,
          metadata: {
            agentName: agent.name,
            timestamp: new Date().toISOString()
          }
        };
      }

    } catch (error) {
      console.error(`❌ Error sending message to MCP agent ${agentId}:`, error.message);
      return {
        success: false,
        content: `Error communicating with agent: ${error.message}`,
        metadata: {
          error: true,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Get available tools for an agent
   */
  async getAgentTools(agentId) {
    try {
      const connection = this.connections.get(agentId);
      if (!connection) {
        throw new Error(`No MCP connection found for agent ${agentId}`);
      }

      const { client } = connection;
      const tools = await client.listTools();
      return tools.tools || [];

    } catch (error) {
      console.error(`❌ Error getting tools for agent ${agentId}:`, error.message);
      return [];
    }
  }

  /**
   * Close MCP connection for an agent
   */
  async closeConnection(agentId) {
    try {
      const connection = this.connections.get(agentId);
      if (connection) {
        const { client, transport } = connection;
        await client.close();
        if (transport.close) {
          await transport.close();
        }
        this.connections.delete(agentId);
        console.log(`✅ MCP connection closed for agent ${agentId}`);
      }
    } catch (error) {
      console.error(`❌ Error closing MCP connection for agent ${agentId}:`, error.message);
    }
  }

  /**
   * Test MCP connection for an agent
   */
  async testConnection(agent) {
    try {
      const client = await this.initializeAgent(agent);
      const tools = await client.listTools();
      await this.closeConnection(agent.id);

      return {
        success: true,
        message: 'MCP connection successful',
        toolsCount: tools.tools ? tools.tools.length : 0,
        tools: tools.tools ? tools.tools.map(t => t.name) : []
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: true
      };
    }
  }

  /**
   * Get connection status for an agent
   */
  isConnected(agentId) {
    return this.connections.has(agentId);
  }

  /**
   * Get all active connections
   */
  getActiveConnections() {
    return Array.from(this.connections.keys());
  }
}

// Create a singleton instance
export const mcpService = new MCPService(); 