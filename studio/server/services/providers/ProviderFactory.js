import { AlfaProvider } from './AlfaProvider.js';
import { OpenAIProvider } from './OpenAIProvider.js';

/**
 * LLM Provider Factory
 * Manages all available LLM providers and creates instances
 */
export class ProviderFactory {
  constructor() {
    this.providers = new Map();
    this.registeredTypes = new Map();
    this.registerDefaultProviders();
  }

  /**
   * Register default providers
   */
  registerDefaultProviders() {
    this.registerProvider('alfa', AlfaProvider);
    this.registerProvider('openai', OpenAIProvider);
  }

  /**
   * Register a new provider type
   * @param {string} type - Provider type identifier
   * @param {Class} ProviderClass - Provider class constructor
   */
  registerProvider(type, ProviderClass) {
    this.registeredTypes.set(type, ProviderClass);
    console.log(`📋 Registered LLM provider: ${type}`);
  }

  /**
   * Create a provider instance
   * @param {Object} config - Provider configuration
   * @param {string} config.type - Provider type
   * @param {string} config.name - Provider instance name
   * @returns {BaseLLMProvider} - Provider instance
   */
  async createProvider(config) {
    const { type, name } = config;

    if (!type) {
      throw new Error('Provider type is required');
    }

    if (!name) {
      throw new Error('Provider name is required');
    }

    const ProviderClass = this.registeredTypes.get(type);
    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${type}. Available types: ${Array.from(this.registeredTypes.keys()).join(', ')}`);
    }

    // Check if provider already exists
    const existingProvider = this.providers.get(name);
    if (existingProvider) {
      console.log(`♻️  Reusing existing provider: ${name}`);
      return existingProvider;
    }

    // Create new provider instance
    const provider = new ProviderClass(config);
    await provider.initialize(config);

    // Store provider instance
    this.providers.set(name, provider);
    console.log(`✅ Created LLM provider: ${name} (${type})`);

    return provider;
  }

  /**
   * Get an existing provider instance
   * @param {string} name - Provider name
   * @returns {BaseLLMProvider|null} - Provider instance or null
   */
  getProvider(name) {
    return this.providers.get(name) || null;
  }

  /**
   * Remove a provider instance
   * @param {string} name - Provider name
   * @returns {boolean} - Success status
   */
  removeProvider(name) {
    const removed = this.providers.delete(name);
    if (removed) {
      console.log(`🗑️  Removed provider: ${name}`);
    }
    return removed;
  }

  /**
   * List all active providers
   * @returns {Array} - List of provider info
   */
  listProviders() {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      type: provider.type,
      capabilities: provider.getCapabilities()
    }));
  }

  /**
   * List all available provider types
   * @returns {Array} - List of available types
   */
  getAvailableTypes() {
    return Array.from(this.registeredTypes.keys());
  }

  /**
   * Get provider configuration template
   * @param {string} type - Provider type
   * @returns {Object} - Configuration template
   */
  getConfigTemplate(type) {
    const templates = {
      alfa: {
        type: 'alfa',
        name: 'my-alfa-agent',
        authToken: 'your-auth-token',
        projectId: 'your-project-uuid',
        chatHost: 'https://alfa.gamma.qa.us-west-2.aws.avalara.io/v1/chat',
        apiHost: 'https://alfa.gamma.qa.us-west-2.aws.avalara.io/v1', // Optional for RAG and document uploads
        model: 'gpt-4o-mini',
        indexId: 'your-index-uuid', // Optional for RAG
        ragEnabled: true,
        systemPromptName: 'demo_rag_system_prompt',
        userPromptName: 'demo_rag_user_prompt'
      },
      openai: {
        type: 'openai',
        name: 'my-openai-agent',
        apiKey: 'sk-your-api-key',
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: 'You are a helpful assistant.'
      }
    };

    return templates[type] || null;
  }

  /**
   * Validate provider configuration
   * @param {Object} config - Provider configuration
   * @returns {Object} - Validation result
   */
  validateConfig(config) {
    const { type } = config;

    if (!type) {
      return { valid: false, error: 'Provider type is required' };
    }

    if (!this.registeredTypes.has(type)) {
      return { 
        valid: false, 
        error: `Unknown provider type: ${type}. Available: ${this.getAvailableTypes().join(', ')}` 
      };
    }

    const template = this.getConfigTemplate(type);
    if (!template) {
      return { valid: false, error: `No template available for type: ${type}` };
    }

    // Check required fields based on type
    const requiredFields = this.getRequiredFields(type);
    const missing = requiredFields.filter(field => !config[field]);

    if (missing.length > 0) {
      return { 
        valid: false, 
        error: `Missing required fields for ${type}: ${missing.join(', ')}` 
      };
    }

    return { valid: true };
  }

  /**
   * Get required fields for each provider type
   * @param {string} type - Provider type
   * @returns {Array} - Required field names
   */
  getRequiredFields(type) {
    const requirements = {
      alfa: ['authToken', 'projectId', 'chatHost'],
      openai: ['apiKey']
    };

    return requirements[type] || [];
  }

  /**
   * Test all providers
   * @returns {Promise<Array>} - Test results for all providers
   */
  async testAllProviders() {
    const results = [];
    
    for (const [name, provider] of this.providers) {
      try {
        const result = await provider.testConnection();
        results.push({
          name,
          type: provider.type,
          ...result
        });
      } catch (error) {
        results.push({
          name,
          type: provider.type,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get provider statistics
   * @returns {Object} - Provider statistics
   */
  getStats() {
    const typeCount = {};
    for (const provider of this.providers.values()) {
      typeCount[provider.type] = (typeCount[provider.type] || 0) + 1;
    }

    return {
      totalProviders: this.providers.size,
      availableTypes: this.registeredTypes.size,
      typeDistribution: typeCount,
      activeProviders: this.listProviders()
    };
  }
}

// Export singleton instance
export const providerFactory = new ProviderFactory(); 