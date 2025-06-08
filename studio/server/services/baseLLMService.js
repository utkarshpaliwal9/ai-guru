import { providerFactory } from './providers/ProviderFactory.js';
import { getAllAgents, getAgent } from '../utils/storage.js';
import { callAgentAPI } from './agentService.js';
import { orchestratorService } from './orchestratorService.js';

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

    // Note: ALFA_INDEX_ID is optional but recommended for better functionality

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
        indexId: process.env.ALFA_INDEX_ID || null, // Add index ID for better functionality
        model: process.env.ALFA_MODEL || 'gpt-4o-mini',
        ragEnabled: true,
        systemPromptName: 'demo_rag_system_prompt',
        userPromptName: 'demo_rag_user_prompt'
      };

      this.alfaProvider = await providerFactory.createProvider(alfaConfig);
      this.initialized = true;
      console.log('🤖 Base LLM (Alfa) initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize base LLM (Alfa):', error.message);
      throw new Error(`Failed to initialize Alfa AI: ${error.message}`);
    }
  }

  async processMessage(userMessage, conversationHistory = [], conversationId, io = null) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log(`🎯 Processing message with orchestrator: "${userMessage}"`);

      // Use the new orchestrator workflow
      let workflowResult = await orchestratorService.orchestrateWorkflow(
        userMessage,
        conversationHistory,
        this.alfaProvider
      );

      console.log(`🎬 Workflow ${workflowResult.workflowId} completed - requiresAgents: ${workflowResult.requiresAgents}`);

      // If the orchestrator determined agents are needed
      if (workflowResult.requiresAgents) {
        // Continue workflow until completion if it's not complete
        let maxContinuations = 5; // Prevent infinite loops
        let continuationCount = 0;
        
        while (!workflowResult.isComplete && continuationCount < maxContinuations) {
          console.log(`🔄 Workflow ${workflowResult.workflowId} not complete (${workflowResult.completionPercentage}%), continuing with ${workflowResult.remainingTasks.length} remaining tasks...`);
          
          // Emit progress event if io is available
          if (io && conversationId) {
            io.to(conversationId).emit('workflow-progress', {
              workflowId: workflowResult.workflowId,
              status: 'continuing',
              completionPercentage: workflowResult.completionPercentage,
              remainingTasks: workflowResult.remainingTasks.length,
              message: `Processing additional tasks... (${workflowResult.completionPercentage}% complete)`
            });
          }
          
          console.log(`🔄 Starting continuation ${continuationCount + 1} for workflow ${workflowResult.workflowId}`);
          
          const continuedResult = await orchestratorService.continueWorkflow(
            workflowResult.workflowId,
            workflowResult.remainingTasks,
            userMessage,
            conversationHistory,
            this.alfaProvider
          );
          
          console.log(`🔄 Continuation ${continuationCount + 1} completed:`, {
            continued: continuedResult.continued,
            isComplete: continuedResult.isComplete,
            taskResultsCount: continuedResult.taskResults?.length || 0,
            agentsCalled: continuedResult.agentsCalled
          });
          
          // Merge results from continuation
          const originalTaskResults = workflowResult.taskResults || [];
          const newTaskResults = continuedResult.taskResults || [];
          const originalAgentsCalled = workflowResult.agentsCalled || [];
          const newAgentsCalled = continuedResult.agentsCalled || [];
          
          workflowResult = {
            ...workflowResult,
            taskResults: [...originalTaskResults, ...newTaskResults],
            isComplete: continuedResult.isComplete,
            completionPercentage: continuedResult.completionPercentage,
            remainingTasks: continuedResult.remainingTasks,
            summary: continuedResult.summary,
            finalResponse: continuedResult.finalResponse,
            agentsCalled: [...originalAgentsCalled, ...newAgentsCalled],
            metadata: {
              ...workflowResult.metadata,
              continuations: continuationCount + 1,
              totalTasks: originalTaskResults.length + newTaskResults.length,
              successfulTasks: [...originalTaskResults, ...newTaskResults].filter(r => r.success).length,
              failedTasks: [...originalTaskResults, ...newTaskResults].filter(r => !r.success).length
            }
          };
          
          continuationCount++;
          console.log(`🔄 Workflow continuation ${continuationCount} completed - ${workflowResult.isComplete ? 'COMPLETE' : 'PARTIAL'} (${workflowResult.completionPercentage}%)`);
          
          // Emit continuation progress event
          if (io && conversationId) {
            io.to(conversationId).emit('workflow-progress', {
              workflowId: workflowResult.workflowId,
              status: workflowResult.isComplete ? 'completed' : 'in-progress',
              completionPercentage: workflowResult.completionPercentage,
              remainingTasks: workflowResult.remainingTasks.length,
              continuationCount: continuationCount,
              message: workflowResult.isComplete 
                ? 'All tasks completed successfully!'
                : `Continuation ${continuationCount} completed (${workflowResult.completionPercentage}% complete)`
            });
          }
        }
        
        if (!workflowResult.isComplete && continuationCount >= maxContinuations) {
          console.log(`⚠️ Workflow ${workflowResult.workflowId} stopped after ${maxContinuations} continuations to prevent infinite loop`);
          
          // Emit warning event
          if (io && conversationId) {
            io.to(conversationId).emit('workflow-progress', {
              workflowId: workflowResult.workflowId,
              status: 'max-continuations-reached',
              completionPercentage: workflowResult.completionPercentage,
              remainingTasks: workflowResult.remainingTasks.length,
              continuationCount: continuationCount,
              message: `Workflow stopped after ${maxContinuations} iterations to prevent infinite loop`
            });
          }
        }

        // Create enhanced message with workflow results for final response
        const enhancedMessage = this.buildWorkflowResponseMessage(
          userMessage,
          workflowResult,
          conversationHistory
        );

        // Get Alfa's final response incorporating workflow results
        const context = {
          history: conversationHistory,
          metadata: {
            conversationId,
            timestamp: new Date().toISOString(),
            workflowId: workflowResult.workflowId,
            purpose: 'final-response'
          }
        };

        const finalResponse = await this.alfaProvider.sendMessage(enhancedMessage, context);

        // Check if response has an error
        if (finalResponse.error) {
          throw new Error(finalResponse.message || finalResponse.error || 'Unknown error from Alfa provider');
        }

        // Return enhanced response with workflow metadata
        return {
          content: finalResponse.content,
          metadata: {
            baseLLM: 'alfa',
            orchestrated: true,
            workflowId: workflowResult.workflowId,
            agentsCalled: workflowResult.agentsCalled,
            taskResults: workflowResult.taskResults,
            isComplete: workflowResult.isComplete,
            completionPercentage: workflowResult.completionPercentage,
            remainingTasks: workflowResult.remainingTasks,
            continuations: continuationCount,
            ...finalResponse.metadata
          }
        };
      } else {
        // Handle directly without agents
        console.log('🔄 Handling request directly without agents');

        // Prepare context for direct handling
        const context = {
          history: conversationHistory,
          metadata: {
            conversationId,
            timestamp: new Date().toISOString(),
            workflowId: workflowResult.workflowId,
            purpose: 'direct-response'
          }
        };

        // Get direct response from Alfa
        const response = await this.alfaProvider.sendMessage(userMessage, context);

        // Check if response has an error
        if (response.error) {
          throw new Error(response.message || response.error || 'Unknown error from Alfa provider');
        }

        return {
          content: response.content,
          metadata: {
            baseLLM: 'alfa',
            orchestrated: false,
            workflowId: workflowResult.workflowId,
            agentsCalled: [],
            reasoning: workflowResult.reasoning,
            ...response.metadata
          }
        };
      }

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
          message: error.message,
          orchestrated: false
        }
      };
    }
  }

  /**
   * Build a message for Alfa that incorporates workflow results
   * @param {string} originalMessage - Original user message
   * @param {Object} workflowResult - Results from orchestrator workflow
   * @param {Array} conversationHistory - Conversation context
   * @returns {string} Enhanced message for final response
   */
  buildWorkflowResponseMessage(originalMessage, workflowResult, conversationHistory) {
    let message = `The user asked: "${originalMessage}"\n\n`;

    // Add workflow summary
    if (workflowResult.summary) {
      message += workflowResult.summary + '\n';
    }

    // Add task execution details
    if (workflowResult.taskResults && workflowResult.taskResults.length > 0) {
      message += "Task Execution Details:\n";
      workflowResult.taskResults.forEach(result => {
        if (result.success && result.agent) {
          message += `✅ ${result.task.description} (${result.agent.name}): ${result.response.content}\n`;
        } else if (result.success && !result.agent) {
          message += `✅ ${result.task.description}: ${result.response?.content || 'Task completed'}\n`;
        } else {
          message += `❌ ${result.task.description}: ${result.error}\n`;
        }
      });
      message += '\n';
    }

    // Add completion status
    if (workflowResult.isComplete) {
      message += "✅ All requested tasks have been completed successfully.\n\n";
    } else {
      message += `⏳ Task completion: ${workflowResult.completionPercentage}%\n`;
      if (workflowResult.remainingTasks && workflowResult.remainingTasks.length > 0) {
        message += "Remaining tasks:\n";
        workflowResult.remainingTasks.forEach(task => {
          message += `- ${task.description}\n`;
        });
        message += '\n';
      }
    }

    // Add final instruction for Alfa
    message += `Please provide a comprehensive response to the user that:
1. Acknowledges their original request
2. Summarizes what was accomplished by the agents
3. Presents the results in a clear, user-friendly format
4. ${workflowResult.isComplete ? 
       'Confirms that their request has been fully addressed' : 
       'Explains what still needs to be done and next steps'}

Be conversational and helpful. Don't just repeat the agent outputs - synthesize them into a coherent response that directly addresses the user's needs.`;

    return message;
  }

  /**
   * Legacy method for handling @mentions (kept for backward compatibility)
   */
  parseMentions(message) {
    const mentionPattern = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionPattern.exec(message)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)]; // Remove duplicates
  }

  /**
   * Legacy method for getting available agents info (kept for backward compatibility)
   */
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

  /**
   * Legacy method for calling mentioned agents (kept for backward compatibility)
   */
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

  /**
   * Legacy method for building enhanced messages (kept for backward compatibility)
   */
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