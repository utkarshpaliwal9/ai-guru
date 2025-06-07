import axios from 'axios';
import { BaseLLMProvider } from './BaseLLMProvider.js';

/**
 * Alfa LLM Provider
 * Integrates with Avalara's Alfa enterprise RAG-based AI system
 */
export class AlfaProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    this.type = 'alfa';
    this.apiClient = null;
    this.conversationId = null;
  }

  /**
   * Initialize the Alfa provider
   */
  async initialize(config) {
    this.validateConfig(config, ['authToken', 'projectId', 'chatHost']);
    
    this.config = { ...this.config, ...config };
    
    // Setup axios client with authentication
    this.apiClient = axios.create({
      baseURL: this.config.chatHost,
      headers: {
        'Authorization': `Bearer ${this.config.authToken}`,
        'x-claim': this.config.projectId,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // Increased timeout for streaming
    });

    console.log(`🔧 Alfa provider initialized for project ${this.config.projectId}`);
  }

  /**
   * Send message to Alfa and get response (using streaming API)
   */
  async sendMessage(message, context = {}) {
    try {
      if (!this.apiClient) {
        throw new Error('Alfa provider not initialized');
      }

      // Start conversation if not exists
      if (!this.conversationId) {
        await this.startConversation();
      }

      console.log(`🤖 Sending message to Alfa conversation: ${this.conversationId}`);

      // Use the correct streaming endpoint and format from documentation
      const response = await this.apiClient.post(
        `/conversations/${this.conversationId}/stream`,
        {
          question: message, // Use 'question' instead of 'message'
          args: {} // Add args object as per documentation
        },
        {
          responseType: 'stream' // Handle streaming response
        }
      );

      // Parse streaming response
      const fullResponse = await this.parseStreamingResponse(response);

      return this.standardizeResponse({
        content: fullResponse,
        metadata: {
          conversationId: this.conversationId,
          streamingResponse: true
        }
      });

    } catch (error) {
      console.error(`❌ Alfa provider error:`, error.response?.data || error.message);
      if (error.response) {
        console.error(`❌ Alfa API Status: ${error.response.status}`);
        console.error(`❌ Alfa API Response:`, error.response.data);
      }
      return this.standardizeError(error);
    }
  }

  /**
   * Parse streaming response from Alfa API
   */
  async parseStreamingResponse(response) {
    return new Promise((resolve, reject) => {
      let fullResponse = '';
      let buffer = '';

      response.data.on('data', (chunk) => {
        buffer += chunk.toString('utf-8');
        
        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim().startsWith('data:')) {
            try {
              const jsonData = line.slice(5).trim(); // Remove 'data:' prefix
              if (jsonData && jsonData !== '[DONE]') {
                const parsed = JSON.parse(jsonData);
                if (parsed.output) {
                  fullResponse += parsed.output;
                }
              }
            } catch (parseError) {
              console.warn('❌ Failed to parse streaming chunk:', parseError.message);
            }
          }
        }
      });

      response.data.on('end', () => {
        console.log(`✅ Received complete response from Alfa (${fullResponse.length} chars)`);
        resolve(fullResponse || 'Response received from Alfa');
      });

      response.data.on('error', (error) => {
        console.error('❌ Streaming error:', error);
        reject(error);
      });

      // Timeout fallback
      setTimeout(() => {
        if (fullResponse) {
          resolve(fullResponse);
        } else {
          reject(new Error('Streaming response timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Start a new conversation with Alfa (updated to match documentation)
   */
  async startConversation() {
    try {
      const conversationConfig = {
        index_id: this.config.indexId || null, // Make index_id explicit
        config: {
          agent: this.config.agent || 'default',
          assistant_profile: this.config.assistantProfile || null,
          default_agent_config: {
            llm: this.config.model || 'gpt-4o-mini',
            prompt_name: this.config.userPromptName || 'demo_rag_user_prompt',
            system_prompt_name: this.config.systemPromptName || 'demo_rag_system_prompt'
          }
        }
      };

      console.log(`🚀 Creating Alfa conversation with config:`, JSON.stringify(conversationConfig, null, 2));

      const response = await this.apiClient.post('/conversations', conversationConfig);
      
      // Handle both possible response formats
      this.conversationId = response.data.id || response.data.conversation_id;
      console.log(`✅ Alfa conversation started: ${this.conversationId}`);
      
      if (!this.conversationId) {
        console.error('❌ No conversation ID in response:', response.data);
        throw new Error('Failed to get conversation ID from Alfa');
      }
      
      return this.conversationId;
    } catch (error) {
      console.error('❌ Failed to start Alfa conversation:', error.response?.data || error.message);
      if (error.response) {
        console.error(`❌ Status: ${error.response.status}, Data:`, error.response.data);
      }
      throw error;
    }
  }

  /**
   * Prepare context for Alfa API
   */
  prepareContext(context) {
    return {
      conversation_history: context.history?.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      })) || [],
      metadata: context.metadata || {},
      ...(this.config.ragEnabled && { use_rag: true })
    };
  }

  /**
   * Test connection to Alfa
   */
  async testConnection() {
    try {
      if (!this.apiClient) {
        await this.initialize(this.config);
      }

      // Test with a simple health check or conversation start
      const startTime = Date.now();
      await this.startConversation();
      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        message: 'Alfa connection successful',
        conversationId: this.conversationId,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get Alfa-specific capabilities
   */
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsRAG: true,
      supportsToolCalls: true,
      supportsConversationHistory: true,
      maxTokens: 8192,
      supportedModalities: ['text'],
      customFeatures: {
        ragIndexing: true,
        documentUpload: true,
        promptTemplates: true,
        multiModalRAG: false
      }
    };
  }

  /**
   * Query RAG context (Alfa-specific feature)
   */
  async getRagContext(query, k = 5) {
    if (!this.config.apiHost || !this.config.indexId) {
      throw new Error('RAG context requires apiHost and indexId configuration');
    }

    try {
      const ragClient = axios.create({
        baseURL: this.config.apiHost,
        headers: {
          'Authorization': `Bearer ${this.config.authToken}`,
          'x-claim': this.config.projectId
        }
      });

      const response = await ragClient.post('/indices/rag-context', {
        index_uuid: this.config.indexId,
        query: query,
        k: k
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error retrieving RAG context:', error.message);
      throw error;
    }
  }

  /**
   * Reset conversation (start fresh)
   */
  async resetConversation() {
    this.conversationId = null;
    console.log('🔄 Alfa conversation reset');
  }

  /**
   * Get conversation history from Alfa
   */
  async getConversationHistory() {
    if (!this.conversationId) {
      return [];
    }

    try {
      const response = await this.apiClient.get(`/conversations/${this.conversationId}/history`);
      return response.data.messages || [];
    } catch (error) {
      console.error('❌ Error fetching conversation history:', error.message);
      return [];
    }
  }
} 