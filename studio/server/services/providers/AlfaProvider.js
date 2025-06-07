import axios from 'axios';
import { BaseLLMProvider } from './BaseLLMProvider.js';

/**
 * Alfa LLM Provider
 * Integrates with Avalara's Alfa enterprise RAG-based AI system using OpenAI-compatible API
 */
export class AlfaProvider extends BaseLLMProvider {
  constructor(config) {
    super(config);
    this.type = 'alfa';
    this.apiClient = null;
    this.conversationHistory = [];
  }

  /**
   * Initialize the Alfa provider
   */
  async initialize(config) {
    this.validateConfig(config, ['authToken', 'projectId', 'chatHost']);
    
    this.config = { ...this.config, ...config };
    
    // Setup axios client with authentication for OpenAI-compatible API
    this.apiClient = axios.create({
      baseURL: this.config.chatHost.replace('/completions', ''), // Remove completions from base URL
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
   * Send message to Alfa using OpenAI-compatible chat completions API
   */
  async sendMessage(message, context = {}) {
    try {
      if (!this.apiClient) {
        throw new Error('Alfa provider not initialized');
      }

      console.log(`🤖 Sending message to Alfa using OpenAI-compatible API`);
      console.log(`📝 Message length: ${message.length} characters`);

      // Prepare messages in OpenAI format
      const messages = this.prepareMessages(message, context);
      console.log(`📨 Prepared ${messages.length} messages for Alfa API`);

      // Use OpenAI-compatible chat completions endpoint
      const requestPayload = {
        model: this.config.model || 'gpt-4o-mini',
        messages: messages,
        max_tokens: this.config.maxTokens || 500,
        temperature: this.config.temperature || 0.7,
        stream: false // Start with non-streaming for simplicity
      };

      console.log(`🚀 Making request to ${this.config.chatHost}/completions`);
      const startTime = Date.now();

      const response = await this.apiClient.post('/completions', requestPayload);
      
      const duration = Date.now() - startTime;
      console.log(`✅ Alfa API responded in ${duration}ms`);

      // Extract response content
      const content = response.data.choices?.[0]?.message?.content || 'No response from Alfa';
      console.log(`📥 Received response: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`);

      // Update conversation history
      this.conversationHistory.push(
        { role: 'user', content: message },
        { role: 'assistant', content: content }
      );

      return this.standardizeResponse({
        content: content,
        metadata: {
          model: response.data.model,
          usage: response.data.usage,
          provider: 'alfa-openai-compatible',
          duration: duration
        }
      });

    } catch (error) {
      console.error(`❌ Alfa provider error:`, error.response?.data || error.message);
      if (error.response) {
        console.error(`❌ Alfa API Status: ${error.response.status}`);
        console.error(`❌ Alfa API Response:`, JSON.stringify(error.response.data, null, 2));
        console.error(`❌ Request URL: ${error.config?.url}`);
        console.error(`❌ Request Headers:`, error.config?.headers);
      } else if (error.code === 'ECONNABORTED') {
        console.error(`❌ Request timeout - Alfa API took too long to respond`);
      } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        console.error(`❌ Network error - Cannot reach Alfa API at ${this.config.chatHost}`);
      }
      return this.standardizeError(error);
    }
  }

  /**
   * Prepare messages in OpenAI format
   */
  prepareMessages(userMessage, context = {}) {
    const messages = [];

    // Add system message
    const systemPrompt = this.config.systemPrompt || 
      "You are a helpful assistant that analyzes webpage content including both text and images. You have vision capabilities and can see and understand images when they are provided.";
    
    messages.push({
      role: 'system',
      content: systemPrompt
    });

    // Add conversation history if available
    if (context.history && Array.isArray(context.history)) {
      context.history.slice(-10).forEach(msg => { // Keep last 10 messages
        if (msg.type === 'user') {
          messages.push({ role: 'user', content: msg.content });
        } else if (msg.type === 'agent' || msg.type === 'assistant') {
          messages.push({ role: 'assistant', content: msg.content });
        }
      });
    }

    // Add current user message
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: userMessage
        }
      ]
    });

    return messages;
  }

  /**
   * Test connection to Alfa using OpenAI-compatible API
   */
  async testConnection() {
    try {
      if (!this.apiClient) {
        await this.initialize(this.config);
      }

      console.log(`🔗 Testing Alfa connection...`);
      const startTime = Date.now();

      const response = await this.apiClient.post('/completions', {
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello, this is a connection test. Please respond briefly.' }
        ],
        max_tokens: 50,
        temperature: 0.7
      });

      const latency = Date.now() - startTime;
      const content = response.data.choices?.[0]?.message?.content;

      return {
        success: true,
        latency,
        message: 'Alfa OpenAI-compatible API connection successful',
        response: content,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        details: error.response?.data,
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
      supportsVision: true,
      supportsStreaming: true,
      supportsConversationHistory: true,
      maxTokens: 4096,
      supportedModalities: ['text', 'image'],
      customFeatures: {
        openaiCompatible: true,
        visionCapabilities: true,
        webpageAnalysis: true
      }
    };
  }

  /**
   * Reset conversation history
   */
  async resetConversation() {
    this.conversationHistory = [];
    console.log('🔄 Alfa conversation history reset');
  }

  /**
   * Get conversation history
   */
  async getConversationHistory() {
    return this.conversationHistory;
  }

  /**
   * Create a prompt optimized for webpage analysis (based on the curl example)
   */
  createWebpageAnalysisPrompt(webpageContent, userQuestion, imageInfo = null) {
    let prompt = `Based on the following webpage content, please answer the user's question.\n\nWebpage Content:\n${webpageContent}\n\n`;
    
    if (imageInfo) {
      prompt += `IMAGE INFORMATION:\n`;
      prompt += `- Total images found on this webpage: ${imageInfo.totalImages || 0}\n`;
      prompt += `- Images I was able to process and analyze: ${imageInfo.processedImages || 0}\n\n`;
    }
    
    prompt += `User's Question: ${userQuestion}`;
    
    return prompt;
  }
} 