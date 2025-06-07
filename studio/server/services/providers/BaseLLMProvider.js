/**
 * Base LLM Provider Interface
 * Defines the standard contract for all LLM providers
 */
export class BaseLLMProvider {
  constructor(config) {
    this.config = config;
    this.name = config.name || 'unknown';
    this.type = config.type || 'generic';
  }

  /**
   * Initialize the provider with configuration
   * @param {Object} config - Provider-specific configuration
   */
  async initialize(config) {
    throw new Error('initialize() must be implemented by provider');
  }

  /**
   * Send a message to the LLM and get response
   * @param {string} message - User message
   * @param {Object} context - Conversation context
   * @param {Array} context.history - Previous messages
   * @param {Object} context.metadata - Additional metadata
   * @returns {Promise<Object>} - Standardized response
   */
  async sendMessage(message, context = {}) {
    throw new Error('sendMessage() must be implemented by provider');
  }

  /**
   * Test connection to the LLM provider
   * @returns {Promise<Object>} - Connection test result
   */
  async testConnection() {
    throw new Error('testConnection() must be implemented by provider');
  }

  /**
   * Get provider capabilities
   * @returns {Object} - Provider capabilities
   */
  getCapabilities() {
    return {
      supportsStreaming: false,
      supportsToolCalls: false,
      supportsRAG: false,
      supportsConversationHistory: true,
      maxTokens: 4096,
      supportedModalities: ['text']
    };
  }

  /**
   * Standardize response format across all providers
   * @param {Object} providerResponse - Raw provider response
   * @returns {Object} - Standardized response
   */
  standardizeResponse(providerResponse) {
    return {
      content: providerResponse.content || '',
      metadata: {
        provider: this.name,
        model: this.config.model || 'unknown',
        tokenUsage: providerResponse.tokenUsage || null,
        responseTime: Date.now(),
        ...providerResponse.metadata
      },
      status: 'success'
    };
  }

  /**
   * Handle errors in a standardized way
   * @param {Error} error - Error object
   * @returns {Object} - Standardized error response
   */
  standardizeError(error) {
    return {
      content: null,
      metadata: {
        provider: this.name,
        error: error.message,
        timestamp: new Date().toISOString()
      },
      status: 'error'
    };
  }

  /**
   * Validate required configuration
   * @param {Object} config - Configuration to validate
   * @param {Array} requiredFields - Required field names
   * @throws {Error} - If required fields are missing
   */
  validateConfig(config, requiredFields) {
    const missing = requiredFields.filter(field => !config[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }
} 