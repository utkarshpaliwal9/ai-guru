import { providerFactory } from './providers/ProviderFactory.js';
import { getAllAgents, getAgent } from '../utils/storage.js';
import { callAgentAPI } from './agentService.js';

class BaseLLMService {
  constructor() {
    this.alfaProvider = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;

    // Check for required Alfa credentials
    const requiredEnvVars = {
      'ALFA_AUTH_TOKEN': process.env.ALFA_AUTH_TOKEN,
      'ALFA_PROJECT_ID': process.env.ALFA_PROJECT_ID,
      'ALFA_CHAT_HOST': process.env.ALFA_CHAT_HOST,
      'ALFA_API_HOST': process.env.ALFA_API_HOST
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      const errorMessage = [
        '🚫 Alfa AI credentials not configured!',
        '',
        'Missing environment variables:',
        ...missingVars.map(varName => `  - ${varName}`),
        '',
        'To configure Alfa AI, add these to your server/.env file:',
        '  ALFA_AUTH_TOKEN=your-auth-token-here',
        '  ALFA_PROJECT_ID=your-project-uuid-here',
        '  ALFA_CHAT_HOST=https://clip-chat-api.gamma.qa.us-west-2.aws.avalara.io',
        '  ALFA_API_HOST=https://clip-api.gamma.qa.us-west-2.aws.avalara.io',
        '  ALFA_MODEL=gpt-4o-mini',
        '',
        'Contact your Avalara administrator to obtain these credentials.'
      ].join('\n');

      console.error(errorMessage);
      throw new Error('Alfa AI credentials not configured. Please set the required environment variables.');
    }

    try {
      // Initialize Alfa as the base LLM
      const alfaConfig = {
        name: 'base-alfa',
        type: 'alfa',
        authToken: process.env.ALFA_AUTH_TOKEN,
        projectId: process.env.ALFA_PROJECT_ID,
        chatHost: process.env.ALFA_CHAT_HOST,
        apiHost: process.env.ALFA_API_HOST,
        model: process.env.ALFA_MODEL || 'gpt-4o-mini',
        ragEnabled: true,
        systemPromptName: 'system_prompt',
        userPromptName: 'user_prompt'
      };

      this.alfaProvider = await providerFactory.createProvider(alfaConfig);
      this.initialized = true;
      console.log('🤖 Base LLM (Alfa) initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize base LLM (Alfa):', error.message);
      throw new Error(`Failed to initialize Alfa AI: ${error.message}`);
    }
  }

  async processMessage(userMessage, conversationHistory = [], conversationId) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Parse @mentions from the user message
      const mentionedAgents = this.parseMentions(userMessage);
      
      // Get available agents info
      const availableAgents = await this.getAvailableAgentsInfo();
      
      // Prepare context for base LLM
      const context = {
        history: conversationHistory,
        availableAgents,
        mentionedAgents,
        metadata: {
          conversationId,
          timestamp: new Date().toISOString()
        }
      };

      // If agents are mentioned, call them first
      let agentResponses = {};
      if (mentionedAgents.length > 0) {
        agentResponses = await this.callMentionedAgents(mentionedAgents, userMessage, conversationHistory);
      }

      // Prepare the message for base LLM including agent responses
      const enhancedMessage = this.buildEnhancedMessage(userMessage, agentResponses, availableAgents);

      // Get response from base LLM (Alfa)
      const response = await this.alfaProvider.sendMessage(enhancedMessage, context);

      return {
        content: response.content,
        metadata: {
          baseLLM: 'alfa',
          agentsCalled: mentionedAgents,
          agentResponses: Object.keys(agentResponses),
          ...response.metadata
        }
      };

    } catch (error) {
      console.error('❌ Error in base LLM processing:', error.message);
      
      // If initialization error, provide helpful message
      if (error.message.includes('Alfa AI credentials not configured')) {
        return {
          content: "❌ Alfa AI is not configured. Please check the server logs for setup instructions.",
          metadata: {
            error: true,
            message: error.message,
            configurationRequired: true
          }
        };
      }
      
      return {
        content: "I apologize, but I'm experiencing technical difficulties. Please try again.",
        metadata: {
          error: true,
          message: error.message
        }
      };
    }
  }

  parseMentions(message) {
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionPattern.exec(message)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  }

  async getAvailableAgentsInfo() {
    try {
      const agents = await getAllAgents();
      const activeAgents = agents.filter(agent => agent.isActive);
      
      return activeAgents.map(agent => ({
        name: agent.name,
        description: agent.description || 'No description available',
        capabilities: agent.configuration?.capabilities || []
      }));
    } catch (error) {
      console.error('❌ Error fetching agents info:', error.message);
      return [];
    }
  }

  async callMentionedAgents(mentionedAgents, userMessage, conversationHistory) {
    const agentResponses = {};
    
    for (const agentName of mentionedAgents) {
      try {
        // Find the agent by name
        const agents = await getAllAgents();
        const agent = agents.find(a => a.name.toLowerCase() === agentName.toLowerCase() && a.isActive);
        
        if (!agent) {
          agentResponses[agentName] = {
            error: `Agent "${agentName}" not found or inactive`
          };
          continue;
        }

        // Prepare context for the agent
        const agentContext = {
          currentMessage: userMessage,
          conversationHistory: conversationHistory.slice(-5), // Last 5 messages for context
          agentConfiguration: agent.configuration || {},
          timestamp: new Date().toISOString()
        };

        // Call the agent
        const agentResponse = await callAgentAPI(agent, agentContext);
        agentResponses[agentName] = agentResponse;

        console.log(`✅ Agent ${agentName} responded successfully`);

      } catch (error) {
        console.error(`❌ Error calling agent ${agentName}:`, error.message);
        agentResponses[agentName] = {
          error: `Failed to communicate with agent "${agentName}": ${error.message}`
        };
      }
    }

    return agentResponses;
  }

  buildEnhancedMessage(originalMessage, agentResponses, availableAgents) {
    let enhancedMessage = originalMessage;

    // Add available agents context
    if (availableAgents.length > 0) {
      const agentsContext = availableAgents.map(agent => 
        `- @${agent.name}: ${agent.description}`
      ).join('\n');
      
      enhancedMessage = `Available agents:\n${agentsContext}\n\nUser message: ${originalMessage}`;
    }

    // Add agent responses if any
    if (Object.keys(agentResponses).length > 0) {
      enhancedMessage += '\n\nAgent responses:';
      
      for (const [agentName, response] of Object.entries(agentResponses)) {
        if (response.error) {
          enhancedMessage += `\n@${agentName}: ERROR - ${response.error}`;
        } else {
          enhancedMessage += `\n@${agentName}: ${response.content}`;
        }
      }

      enhancedMessage += '\n\nPlease synthesize the above agent responses into your conversation with the user.';
    }

    return enhancedMessage;
  }

  async testConnection() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const result = await this.alfaProvider.testConnection();
      return {
        ...result,
        service: 'base-llm',
        provider: this.alfaProvider.type
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        service: 'base-llm'
      };
    }
  }
}

// Export singleton instance
export const baseLLMService = new BaseLLMService(); 