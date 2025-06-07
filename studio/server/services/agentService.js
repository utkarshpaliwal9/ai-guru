import axios from 'axios';

// Call an agent's API with the provided context
export async function callAgentAPI(agent, context) {
  try {
    console.log(`🤖 Calling agent: ${agent.name}`);
    
    // Prepare the request payload
    const payload = {
      message: context.currentMessage,
      conversation_history: context.conversationHistory,
      configuration: context.agentConfiguration,
      timestamp: context.timestamp
    };

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Agentic-Chatbot-Platform/1.0'
    };

    // Add API key if provided
    if (agent.apiKey && agent.apiKey !== '') {
      headers['Authorization'] = `Bearer ${agent.apiKey}`;
    }

    // Add custom headers from agent configuration
    if (agent.configuration?.headers) {
      Object.assign(headers, agent.configuration.headers);
    }

    // Make the API call
    const response = await axios.post(agent.apiEndpoint, payload, {
      headers,
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500 // Accept 4xx as valid responses
    });

    // Handle different response formats
    let responseData = response.data;
    
    // If response is a string, wrap it in an object
    if (typeof responseData === 'string') {
      responseData = { content: responseData };
    }

    // Simulate response delay based on agent configuration
    if (agent.configuration?.simulateDelay) {
      const delay = agent.configuration.simulateDelay || 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    console.log(`✅ Agent ${agent.name} responded successfully`);
    
    return {
      content: responseData.content || responseData.message || responseData.response || 'Agent responded',
      metadata: {
        agentId: agent.id,
        agentName: agent.name,
        responseTime: Date.now(),
        statusCode: response.status,
        ...responseData.metadata
      }
    };

  } catch (error) {
    console.error(`❌ Error calling agent ${agent.name}:`, error.message);

    // Handle different types of errors
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Unable to connect to agent ${agent.name}. Please check the endpoint URL.`);
    }
    
    if (error.code === 'ETIMEDOUT') {
      throw new Error(`Agent ${agent.name} timed out. Please try again.`);
    }

    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const message = error.response.data?.message || error.response.data?.error || 'Unknown error';
      
      if (status === 401) {
        throw new Error(`Authentication failed for agent ${agent.name}. Please check the API key.`);
      }
      
      if (status === 403) {
        throw new Error(`Access forbidden for agent ${agent.name}. Please check permissions.`);
      }
      
      if (status === 404) {
        throw new Error(`Agent ${agent.name} endpoint not found. Please check the URL.`);
      }
      
      throw new Error(`Agent ${agent.name} returned error ${status}: ${message}`);
    }

    // Network error or other issues
    throw new Error(`Failed to communicate with agent ${agent.name}: ${error.message}`);
  }
}

// Test agent connection
export async function testAgentConnection(agent) {
  try {
    console.log(`🔍 Testing connection to agent: ${agent.name}`);
    
    const testPayload = {
      message: 'Connection test',
      test: true
    };

    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Agentic-Chatbot-Platform/1.0'
    };

    if (agent.apiKey && agent.apiKey !== '') {
      headers['Authorization'] = `Bearer ${agent.apiKey}`;
    }

    const startTime = Date.now();
    
    const response = await axios.post(agent.apiEndpoint, testPayload, {
      headers,
      timeout: 10000, // 10 second timeout for testing
      validateStatus: (status) => status < 500
    });

    const endTime = Date.now();
    const latency = endTime - startTime;

    console.log(`✅ Agent ${agent.name} connection test successful`);
    
    return {
      success: true,
      latency,
      statusCode: response.status,
      message: 'Connection successful',
      timestamp: new Date().toISOString()
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