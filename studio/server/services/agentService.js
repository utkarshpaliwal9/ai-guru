import { providerFactory } from './providers/ProviderFactory.js';

// Call an agent's API using the provider system
export async function callAgentAPI(agent, context) {
  try {
    console.log(`🤖 Calling agent: ${agent.name}`);
    
    // Get or create provider for this agent
    let provider = providerFactory.getProvider(agent.name);
    
    if (!provider) {
      // Create provider based on agent configuration
      const providerConfig = {
        name: agent.name,
        type: agent.providerType || 'openai', // Default to OpenAI if not specified
        ...agent.configuration
      };
      
      // Map legacy fields to provider config
      if (agent.apiKey) providerConfig.apiKey = agent.apiKey;
      if (agent.apiEndpoint) providerConfig.apiEndpoint = agent.apiEndpoint;
      
      provider = await providerFactory.createProvider(providerConfig);
    }
    
    // Prepare context for provider
    const providerContext = {
      history: context.conversationHistory || [],
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        timestamp: context.timestamp,
        ...context.agentConfiguration
      }
    };
    
    // Call provider
    const response = await provider.sendMessage(context.currentMessage, providerContext);
    
    console.log(`✅ Agent ${agent.name} responded via ${provider.type} provider`);
    
    return {
      content: response.content,
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        provider: provider.type,
        ...response.metadata
      }
    };

  } catch (error) {
    console.error(`❌ Error calling agent ${agent.name}:`, error.message);
    throw new Error(`Failed to communicate with agent ${agent.name}: ${error.message}`);
  }
}

// Test agent connection using provider system
export async function testAgentConnection(agent) {
  try {
    console.log(`🔍 Testing connection to agent: ${agent.name}`);
    
    // Get or create provider for testing
    let provider = providerFactory.getProvider(agent.name);
    
    if (!provider) {
      const providerConfig = {
        name: agent.name,
        type: agent.providerType || 'openai',
        ...agent.configuration
      };
      
      if (agent.apiKey) providerConfig.apiKey = agent.apiKey;
      if (agent.apiEndpoint) providerConfig.apiEndpoint = agent.apiEndpoint;
      
      provider = await providerFactory.createProvider(providerConfig);
    }
    
    // Test the provider connection
    const result = await provider.testConnection();
    
    console.log(`✅ Agent ${agent.name} connection test completed`);
    
    return {
      ...result,
      provider: provider.type,
      capabilities: provider.getCapabilities()
    };

  } catch (error) {
    console.error(`❌ Agent ${agent.name} connection test failed:`, error.message);
    
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Simulate agent response for development/testing
export function simulateAgentResponse(agent, context) {
  const responses = [
    `Hello! I'm ${agent.name}. I understand you said: "${context.currentMessage}"`,
    `As ${agent.name}, I think this is an interesting question. Let me help you with that.`,
    `${agent.name} here! Based on our conversation, I would suggest...`,
    `Great question! From ${agent.name}'s perspective, I would say...`,
    `I'm ${agent.name}, and I've analyzed your request. Here's my response...`
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    content: randomResponse,
    metadata: {
      agentId: agent.id,
      agentName: agent.name,
      simulated: true,
      timestamp: new Date().toISOString()
    }
  };
}

// Get agent capabilities (placeholder for MCP integration)
export async function getAgentCapabilities(agent) {
  try {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (agent.apiKey && agent.apiKey !== '') {
      headers['Authorization'] = `Bearer ${agent.apiKey}`;
    }

    const response = await axios.get(`${agent.apiEndpoint}/capabilities`, {
      headers,
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error(`Error fetching capabilities for agent ${agent.name}:`, error.message);
    
    // Return default capabilities
    return {
      features: ['text-generation', 'conversation'],
      version: '1.0.0',
      description: `Default capabilities for ${agent.name}`
    };
  }
} 