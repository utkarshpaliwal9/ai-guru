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
      timeout: 30000
    });

    console.log(`🔧 Alfa provider initialized for project ${this.config.projectId}`);
  }

  /**
   * Send message to Alfa and get response
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

      // Send message to Alfa conversation API
      const response = await this.apiClient.post(`/conversations/${this.conversationId}/messages`, {
        message: message,
        context: this.prepareContext(context)
      });

      return this.standardizeResponse({
        content: response.data.response || response.data.message || 'Response received',
        metadata: {
          conversationId: this.conversationId,
          ...response.data.metadata
        }
      });

    } catch (error) {
      console.error(`❌ Alfa provider error:`, error.message);
      return this.standardizeError(error);
    }
  }

  /**
   * Start a new conversation with Alfa
   */
  async startConversation() {
    try {
      const conversationConfig = {
        index_id: this.config.indexId || null,
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

      const response = await this.apiClient.post('/conversations', conversationConfig);
      
      this.conversationId = response.data.conversation_id || response.data.id;
      console.log(`✅ Alfa conversation started: ${this.conversationId}`);
      
      return this.conversationId;
    } catch (error) {
      console.error('❌ Failed to start Alfa conversation:', error.message);
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