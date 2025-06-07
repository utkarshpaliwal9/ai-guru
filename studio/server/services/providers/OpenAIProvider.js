import axios from 'axios';
import { BaseLLMProvider } from './BaseLLMProvider.js';

/**
 * OpenAI LLM Provider
 * Standard OpenAI API integration
 */
export class OpenAIProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    this.type = 'openai';
    this.apiClient = null;
  }

  /**
   * Initialize the OpenAI provider
   */
  async initialize(config) {
    this.validateConfig(config, ['apiKey']);
    
    this.config = { ...this.config, ...config };
    
    // Setup axios client for OpenAI API
    this.apiClient = axios.create({
      baseURL: this.config.baseURL || 'https://api.openai.com/v1',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    console.log(`🔧 OpenAI provider initialized with model ${this.config.model || 'gpt-3.5-turbo'}`);
  }

  /**
   * Send message to OpenAI and get response
   */
  async sendMessage(message, context = {}) {
    try {
      if (!this.apiClient) {
        throw new Error('OpenAI provider not initialized');
      }

      const messages = this.prepareMessages(message, context);

      const response = await this.apiClient.post('/chat/completions', {
        model: this.config.model || 'gpt-3.5-turbo',
        messages: messages,
        max_tokens: this.config.maxTokens || 2000,
        temperature: this.config.temperature || 0.7,
        ...this.config.additionalParams
      });

      return this.standardizeResponse({
        content: response.data.choices[0].message.content,
        metadata: {
          model: response.data.model,
          tokenUsage: response.data.usage,
          finishReason: response.data.choices[0].finish_reason
        }
      });

    } catch (error) {
      console.error(`❌ OpenAI provider error:`, error.message);
      return this.standardizeError(error);
    }
  }

  /**
   * Prepare messages for OpenAI API format
   */
  prepareMessages(message, context) {
    const messages = [];

    // Add system message if configured
    if (this.config.systemPrompt) {
      messages.push({
        role: 'system',
        content: this.config.systemPrompt
      });
    }

    // Add conversation history
    if (context.history && context.history.length > 0) {
      const historyMessages = context.history.slice(-10).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      messages.push(...historyMessages);
    }

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  /**
   * Test connection to OpenAI
   */
  async testConnection() {
    try {
      if (!this.apiClient) {
        await this.initialize(this.config);
      }

      const startTime = Date.now();
      
      const response = await this.apiClient.post('/chat/completions', {
        model: this.config.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        max_tokens: 5
      });

      const latency = Date.now() - startTime;

      return {
        success: true,
        latency,
        message: 'OpenAI connection successful',
        model: response.data.model,
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
   * Get OpenAI-specific capabilities
   */
  getCapabilities() {
    return {
      ...super.getCapabilities(),
      supportsStreaming: true,
      supportsToolCalls: true,
      supportsConversationHistory: true,
      maxTokens: this.getModelMaxTokens(),
      supportedModalities: this.getModelModalities(),
      customFeatures: {
        functionCalling: true,
        imageGeneration: false,
        codeInterpreter: false
      }
    };
  }

  /**
   * Get max tokens for current model
   */
  getModelMaxTokens() {
    const model = this.config.model || 'gpt-3.5-turbo';
    const tokenLimits = {
      'gpt-4': 8192,
      'gpt-4-turbo': 128000,
      'gpt-4o': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384
    };
    return tokenLimits[model] || 4096;
  }

  /**
   * Get supported modalities for current model
   */
  getModelModalities() {
    const model = this.config.model || 'gpt-3.5-turbo';
    if (model.includes('vision') || model.includes('4o')) {
      return ['text', 'image'];
    }
    return ['text'];
  }
} 