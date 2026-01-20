import { spawn } from 'child_process';
import { EventEmitter } from 'events';
import { mcpService } from './mcpService.js';
import { getAllAgents, getAgent } from '../utils/storage.js';

/**
 * AgentServerManager - Manages the lifecycle of agent servers
 * Handles launching, monitoring, and shutting down agent servers on-demand
 */
class AgentServerManager extends EventEmitter {
  constructor() {
    super();
    this.runningServers = new Map(); // agentId -> server info
    this.serverHealth = new Map(); // agentId -> health status
    this.launchQueue = new Set(); // agents being launched
    this.healthCheckInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.serverTimeout = 60000; // 1 minute timeout for server startup
    
    // Start health monitoring
    this.startHealthMonitoring();
  }

  /**
   * Launch servers for agents mentioned in a prompt or workflow
   * @param {string} text - The prompt or workflow text containing @ mentions
   * @param {object} options - Launch options
   * @returns {Promise<object>} Launch results
   */
  async launchAgentsFromText(text, options = {}) {
    try {
      const mentionedAgents = this.parseAgentMentions(text);
      console.log(`🔍 Found ${mentionedAgents.length} agent mentions:`, mentionedAgents);
      
      if (mentionedAgents.length === 0) {
        return {
          success: true,
          message: 'No agents mentioned in text',
          launchedAgents: [],
          alreadyRunning: [],
          failed: []
        };
      }

      const results = await this.launchAgents(mentionedAgents, options);
      return results;
      
    } catch (error) {
      console.error('❌ Error launching agents from text:', error.message);
      return {
        success: false,
        error: error.message,
        launchedAgents: [],
        alreadyRunning: [],
        failed: []
      };
    }
  }

  /**
   * Launch specific agents by their names or IDs
   * @param {Array<string>} agentIdentifiers - Agent names or IDs
   * @param {object} options - Launch options
   * @returns {Promise<object>} Launch results
   */
  async launchAgents(agentIdentifiers, options = {}) {
    const results = {
      success: true,
      launchedAgents: [],
      alreadyRunning: [],
      failed: [],
      errors: []
    };

    // Get all agents to resolve names to full agent objects
    const allAgents = await getAllAgents();
    const activeAgents = allAgents.filter(agent => agent.isActive);

    for (const identifier of agentIdentifiers) {
      try {
        // Find agent by name or ID
        const agent = activeAgents.find(a => 
          a.name.toLowerCase() === identifier.toLowerCase() || 
          a.id === identifier
        );

        if (!agent) {
          console.warn(`⚠️ Agent not found: ${identifier}`);
          results.failed.push({
            identifier,
            error: 'Agent not found or inactive'
          });
          continue;
        }

        // Check if agent requires a server (MCP agents)
        if (!this.requiresServer(agent)) {
          console.log(`ℹ️ Agent ${agent.name} does not require a server`);
          results.alreadyRunning.push({
            agentId: agent.id,
            agentName: agent.name,
            reason: 'No server required'
          });
          continue;
        }

        // Check if already running
        if (this.isServerRunning(agent.id)) {
          console.log(`✅ Server for agent ${agent.name} is already running`);
          results.alreadyRunning.push({
            agentId: agent.id,
            agentName: agent.name,
            reason: 'Already running'
          });
          continue;
        }

        // Launch the server
        const launchResult = await this.launchAgentServer(agent, options);
        
        if (launchResult.success) {
          results.launchedAgents.push({
            agentId: agent.id,
            agentName: agent.name,
            serverInfo: launchResult.serverInfo
          });
        } else {
          results.failed.push({
            identifier: agent.name,
            agentId: agent.id,
            error: launchResult.error
          });
          results.errors.push(launchResult.error);
        }

      } catch (error) {
        console.error(`❌ Error processing agent ${identifier}:`, error.message);
        results.failed.push({
          identifier,
          error: error.message
        });
        results.errors.push(error.message);
      }
    }

    // Update overall success status
    results.success = results.failed.length === 0;

    console.log(`🚀 Agent launch completed:`, {
      launched: results.launchedAgents.length,
      alreadyRunning: results.alreadyRunning.length,
      failed: results.failed.length
    });

    return results;
  }

  /**
   * Launch a server for a specific agent
   * @param {object} agent - Agent configuration
   * @param {object} options - Launch options
   * @returns {Promise<object>} Launch result
   */
  async launchAgentServer(agent, options = {}) {
    try {
      console.log(`🚀 Launching server for agent: ${agent.name}`);

      // Prevent duplicate launches
      if (this.launchQueue.has(agent.id)) {
        console.log(`⏳ Server launch already in progress for agent: ${agent.name}`);
        return {
          success: false,
          error: 'Launch already in progress'
        };
      }

      this.launchQueue.add(agent.id);

      try {
        // Use MCP service to initialize the agent
        const mcpClient = await mcpService.initializeAgent(agent);
        
        // Store server information
        const serverInfo = {
          agentId: agent.id,
          agentName: agent.name,
          mcpClient,
          startTime: new Date(),
          status: 'running',
          retryCount: 0
        };

        this.runningServers.set(agent.id, serverInfo);
        this.serverHealth.set(agent.id, {
          status: 'healthy',
          lastCheck: new Date(),
          consecutiveFailures: 0
        });

        console.log(`✅ Server launched successfully for agent: ${agent.name}`);
        
        this.emit('serverLaunched', {
          agentId: agent.id,
          agentName: agent.name,
          serverInfo
        });

        return {
          success: true,
          serverInfo
        };

      } finally {
        this.launchQueue.delete(agent.id);
      }

    } catch (error) {
      this.launchQueue.delete(agent.id);
      console.error(`❌ Failed to launch server for agent ${agent.name}:`, error.message);
      
      this.emit('serverLaunchFailed', {
        agentId: agent.id,
        agentName: agent.name,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check if an agent requires a server to be launched
   * @param {object} agent - Agent configuration
   * @returns {boolean} True if agent requires a server
   */
  requiresServer(agent) {
    // MCP agents require servers
    if (agent.providerType === 'mcp' && agent.mcpConfig) {
      return true;
    }
    
    // CrewAI agents might require servers (depending on configuration)
    if (agent.providerType === 'crewai') {
      return true;
    }

    // Other provider types typically don't require servers
    return false;
  }

  /**
   * Check if a server is currently running for an agent
   * @param {string} agentId - Agent ID
   * @returns {boolean} True if server is running
   */
  isServerRunning(agentId) {
    const serverInfo = this.runningServers.get(agentId);
    return serverInfo && serverInfo.status === 'running';
  }

  /**
   * Get information about running servers
   * @returns {Array} Array of running server information
   */
  getRunningServers() {
    return Array.from(this.runningServers.values()).map(server => ({
      agentId: server.agentId,
      agentName: server.agentName,
      startTime: server.startTime,
      status: server.status,
      health: this.serverHealth.get(server.agentId)
    }));
  }

  /**
   * Stop a server for a specific agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} True if successfully stopped
   */
  async stopAgentServer(agentId) {
    try {
      const serverInfo = this.runningServers.get(agentId);
      if (!serverInfo) {
        console.log(`ℹ️ No server running for agent: ${agentId}`);
        return true;
      }

      console.log(`🛑 Stopping server for agent: ${serverInfo.agentName}`);

      // Close MCP connection
      await mcpService.closeConnection(agentId);

      // Remove from tracking
      this.runningServers.delete(agentId);
      this.serverHealth.delete(agentId);

      console.log(`✅ Server stopped for agent: ${serverInfo.agentName}`);
      
      this.emit('serverStopped', {
        agentId,
        agentName: serverInfo.agentName
      });

      return true;

    } catch (error) {
      console.error(`❌ Error stopping server for agent ${agentId}:`, error.message);
      return false;
    }
  }

  /**
   * Stop all running servers
   * @returns {Promise<object>} Results of stopping all servers
   */
  async stopAllServers() {
    const results = {
      stopped: [],
      failed: []
    };

    const runningAgentIds = Array.from(this.runningServers.keys());
    
    for (const agentId of runningAgentIds) {
      const success = await this.stopAgentServer(agentId);
      const serverInfo = this.runningServers.get(agentId);
      
      if (success) {
        results.stopped.push({
          agentId,
          agentName: serverInfo?.agentName || 'Unknown'
        });
      } else {
        results.failed.push({
          agentId,
          agentName: serverInfo?.agentName || 'Unknown'
        });
      }
    }

    console.log(`🛑 Stopped ${results.stopped.length} servers, ${results.failed.length} failed`);
    return results;
  }

  /**
   * Parse agent mentions from text (supports @AgentName and @[@AgentName](AgentName) formats)
   * @param {string} text - Text to parse
   * @returns {Array<string>} Array of mentioned agent names
   */
  parseAgentMentions(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }

    const mentions = new Set();

    // Match @[@AgentName](AgentName) format
    const markdownMentions = text.match(/@\[@([^\]]+)\]\([^)]+\)/g);
    if (markdownMentions) {
      markdownMentions.forEach(mention => {
        const match = mention.match(/@\[@([^\]]+)\]/);
        if (match) {
          mentions.add(match[1].trim());
        }
      });
    }

    // Match simple @AgentName format
    const simpleMentions = text.match(/@(\w+)/g);
    if (simpleMentions) {
      simpleMentions.forEach(mention => {
        const agentName = mention.substring(1); // Remove @
        mentions.add(agentName);
      });
    }

    return Array.from(mentions);
  }

  /**
   * Start health monitoring for running servers
   */
  startHealthMonitoring() {
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  /**
   * Perform health checks on all running servers
   */
  async performHealthChecks() {
    const runningAgentIds = Array.from(this.runningServers.keys());
    
    for (const agentId of runningAgentIds) {
      try {
        await this.checkServerHealth(agentId);
      } catch (error) {
        console.error(`❌ Health check failed for agent ${agentId}:`, error.message);
      }
    }
  }

  /**
   * Check health of a specific server
   * @param {string} agentId - Agent ID
   */
  async checkServerHealth(agentId) {
    const serverInfo = this.runningServers.get(agentId);
    const healthInfo = this.serverHealth.get(agentId);
    
    if (!serverInfo || !healthInfo) {
      return;
    }

    try {
      // Check if MCP connection is still active
      const isConnected = mcpService.isConnected(agentId);
      
      if (isConnected) {
        // Update health status
        healthInfo.status = 'healthy';
        healthInfo.lastCheck = new Date();
        healthInfo.consecutiveFailures = 0;
      } else {
        throw new Error('MCP connection lost');
      }

    } catch (error) {
      console.warn(`⚠️ Health check failed for agent ${serverInfo.agentName}:`, error.message);
      
      healthInfo.consecutiveFailures += 1;
      healthInfo.lastCheck = new Date();
      
      if (healthInfo.consecutiveFailures >= 3) {
        healthInfo.status = 'unhealthy';
        console.error(`❌ Agent ${serverInfo.agentName} marked as unhealthy after ${healthInfo.consecutiveFailures} failures`);
        
        this.emit('serverUnhealthy', {
          agentId,
          agentName: serverInfo.agentName,
          consecutiveFailures: healthInfo.consecutiveFailures
        });

        // Attempt to restart the server
        await this.restartAgentServer(agentId);
      }
    }
  }

  /**
   * Restart a server for a specific agent
   * @param {string} agentId - Agent ID
   * @returns {Promise<boolean>} True if successfully restarted
   */
  async restartAgentServer(agentId) {
    try {
      const serverInfo = this.runningServers.get(agentId);
      if (!serverInfo) {
        return false;
      }

      console.log(`🔄 Restarting server for agent: ${serverInfo.agentName}`);

      // Stop the current server
      await this.stopAgentServer(agentId);

      // Get fresh agent configuration
      const agent = await getAgent(agentId);
      if (!agent) {
        console.error(`❌ Agent ${agentId} not found for restart`);
        return false;
      }

      // Launch new server
      const launchResult = await this.launchAgentServer(agent);
      
      if (launchResult.success) {
        console.log(`✅ Server restarted successfully for agent: ${agent.name}`);
        this.emit('serverRestarted', {
          agentId,
          agentName: agent.name
        });
        return true;
      } else {
        console.error(`❌ Failed to restart server for agent: ${agent.name}`);
        return false;
      }

    } catch (error) {
      console.error(`❌ Error restarting server for agent ${agentId}:`, error.message);
      return false;
    }
  }

  /**
   * Get server status for a specific agent
   * @param {string} agentId - Agent ID
   * @returns {object|null} Server status information
   */
  getServerStatus(agentId) {
    const serverInfo = this.runningServers.get(agentId);
    const healthInfo = this.serverHealth.get(agentId);
    
    if (!serverInfo) {
      return null;
    }

    return {
      agentId: serverInfo.agentId,
      agentName: serverInfo.agentName,
      status: serverInfo.status,
      startTime: serverInfo.startTime,
      uptime: Date.now() - serverInfo.startTime.getTime(),
      health: healthInfo || { status: 'unknown' },
      retryCount: serverInfo.retryCount
    };
  }

  /**
   * Get overall system status
   * @returns {object} System status information
   */
  getSystemStatus() {
    const runningServers = this.getRunningServers();
    const healthyServers = runningServers.filter(s => s.health?.status === 'healthy');
    const unhealthyServers = runningServers.filter(s => s.health?.status === 'unhealthy');
    
    return {
      totalServers: runningServers.length,
      healthyServers: healthyServers.length,
      unhealthyServers: unhealthyServers.length,
      launchQueueSize: this.launchQueue.size,
      uptime: process.uptime(),
      servers: runningServers
    };
  }
}

// Create singleton instance
export const agentServerManager = new AgentServerManager();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down Agent Server Manager...');
  await agentServerManager.stopAllServers();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down Agent Server Manager...');
  await agentServerManager.stopAllServers();
  process.exit(0);
}); 