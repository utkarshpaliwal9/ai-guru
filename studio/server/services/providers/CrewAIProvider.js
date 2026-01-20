import axios from 'axios';
import { BaseLLMProvider } from './BaseLLMProvider.js';

export class CrewAIProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.baseURL = config?.baseURL || process.env.CREWAI_SERVICE_URL || 'http://localhost:8000';
  }

  /**
   * Send a message (workflow execution request) to the CrewAI service.
   * @param {object} message - { workflowId, inputs }
   * @param {object} context
   * @returns {Promise<object>} Standardised response
   */
  async sendMessage(message, context = {}) {
    try {
      const { workflowId = 'ad-hoc', inputs = {}, prompt = '' } = message;
      
      // Validate required parameters
      if (!workflowId) {
        throw new Error('workflowId is required for CrewAI workflow execution');
      }
      
      if (!prompt) {
        throw new Error('prompt is required for CrewAI workflow execution');
      }
      
      // Validate that prompt contains agent mentions
      if (!prompt.includes('@')) {
        return {
          success: false,
          content: 'No agents mentioned in the prompt. Please use @AgentName format to specify which agents to use.',
          metadata: {
            error: 'NO_AGENTS_MENTIONED',
            provider: 'crewai'
          }
        };
      }
      
      const nodeBaseUrl = process.env.NODE_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
      
      console.log(`🤖 Sending CrewAI request to ${this.baseURL}/run`);
      console.log(`📝 Prompt: ${prompt}`);
      console.log(`🔗 Node base URL: ${nodeBaseUrl}`);
      
      const requestPayload = {
        workflow_id: workflowId,
        inputs,
        prompt,
        node_base: nodeBaseUrl,
        agents_payload: await (await import('../../utils/storage.js')).getAllAgents()
      };
      
      const response = await axios.post(
        `${this.baseURL}/run`,
        requestPayload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 1000 * 60 * 5, // 5 minutes
        },
      );

      console.log(`✅ CrewAI response received:`, response.data);
      
      // Handle both success and error responses from CrewAI service
      if (response.data && response.data.success === false) {
        return {
          success: false,
          content: response.data.result || response.data.error?.message || 'CrewAI workflow execution failed',
          metadata: {
            error: response.data.error || 'WORKFLOW_EXECUTION_FAILED',
            provider: 'crewai',
            workflowId
          }
        };
      }

      // CrewAI service is expected to return { success, result }
      return this.standardizeResponse(response.data);
      
    } catch (error) {
      console.error('❌ CrewAI provider error:', error.message);
      
      // Handle different types of errors
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          content: 'CrewAI service is not running. Please start the CrewAI service and try again.',
          metadata: {
            error: 'SERVICE_UNAVAILABLE',
            provider: 'crewai'
          }
        };
      }
      
      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        console.error(`❌ CrewAI service error (${statusCode}):`, errorData);
        
        if (statusCode === 400) {
          return {
            success: false,
            content: `Invalid request: ${errorData.detail || errorData.message || 'Bad request'}`,
            metadata: {
              error: 'BAD_REQUEST',
              provider: 'crewai',
              details: errorData
            }
          };
        }
        
        if (statusCode === 500) {
          return {
            success: false,
            content: `CrewAI service error: ${errorData.detail?.message || errorData.message || 'Internal server error'}`,
            metadata: {
              error: 'INTERNAL_SERVER_ERROR',
              provider: 'crewai',
              details: errorData
            }
          };
        }
        
        return {
          success: false,
          content: `CrewAI service error (${statusCode}): ${errorData.detail || errorData.message || 'Unknown error'}`,
          metadata: {
            error: 'HTTP_ERROR',
            provider: 'crewai',
            statusCode,
            details: errorData
          }
        };
      }
      
      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          content: 'CrewAI service not found. Please check the service URL and ensure it is running.',
          metadata: {
            error: 'SERVICE_NOT_FOUND',
            provider: 'crewai'
          }
        };
      }
      
      return this.standardizeError(error);
    }
  }

  /**
   * Standardize CrewAI response to match application expectations
   */
  standardizeResponse(data) {
    return {
      success: true,
      content: data?.result ?? data,
      metadata: data?.metadata || {},
    };
  }

  async testConnection() {
    try {
      await axios.get(`${this.baseURL}/health`);
      return { success: true };
    } catch (error) {
      return this.standardizeError(error);
    }
  }

  getCapabilities() {
    return {
      name: 'crewai',
      description: 'Execute multi-agent workflows via CrewAI microservice',
    };
  }
} 