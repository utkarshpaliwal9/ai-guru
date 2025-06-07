import { 
  getConversation, 
  saveConversation, 
  getAgent, 
  getAllAgents 
} from '../utils/storage.js';
import { callAgentAPI } from './agentService.js';
import { v4 as uuidv4 } from 'uuid';

export function handleSocketConnection(socket, io) {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join a conversation room
  socket.on('join-conversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`👥 Socket ${socket.id} joined conversation ${conversationId}`);
  });

  // Leave a conversation room
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`👋 Socket ${socket.id} left conversation ${conversationId}`);
  });

  // Handle user message and trigger agent responses
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, content, sender = 'user' } = data;
      
      // Get conversation
      const conversation = await getConversation(conversationId);
      if (!conversation) {
        socket.emit('error', { message: 'Conversation not found' });
        return;
      }

      // Create user message
      const userMessage = {
        id: uuidv4(),
        content,
        sender,
        type: 'user',
        timestamp: new Date().toISOString()
      };

      // Add user message to conversation
      conversation.messages.push(userMessage);
      await saveConversation(conversation);

      // Broadcast user message to all clients in the conversation
      io.to(conversationId).emit('message-received', userMessage);

      // Parse mentioned agents from the message (e.g., @agent1 @agent2)
      const mentionedAgents = parseMentionedAgents(content);
      
      // If no agents mentioned, use all active agents in the conversation
      let agentsToInvoke = mentionedAgents.length > 0 ? mentionedAgents : conversation.agents || [];
      
      // Filter for active agents only
      const allAgents = await getAllAgents();
      const activeAgents = allAgents.filter(agent => 
        agent.isActive && agentsToInvoke.includes(agent.name)
      );

      if (activeAgents.length === 0) {
        console.log('No active agents to invoke');
        return;
      }

      // Show typing indicator for all agents that will respond
      activeAgents.forEach(agent => {
        io.to(conversationId).emit('agent-typing', {
          agentId: agent.id,
          agentName: agent.name,
          isTyping: true
        });
      });

      // Process agents in parallel for collaborative conversation
      await processCollaborativeAgentResponses(
        activeAgents, 
        conversation, 
        content, 
        io, 
        conversationId
      );

    } catch (error) {
      console.error('Error handling message:', error);
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { conversationId, isTyping, user } = data;
    socket.to(conversationId).emit('user-typing', { user, isTyping });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
}

// Parse @mentions from message content
function parseMentionedAgents(content) {
  const mentionRegex = /@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }
  
  return mentions;
}

// Process collaborative agent responses
async function processCollaborativeAgentResponses(agents, conversation, userMessage, io, conversationId) {
  const agentPromises = agents.map(async (agent) => {
    try {
      // Prepare context for the agent including previous messages
      const context = prepareAgentContext(conversation, agent, userMessage);
      
      // Call the agent API
      const response = await callAgentAPI(agent, context);
      
      // Create agent message
      const agentMessage = {
        id: uuidv4(),
        content: response.content || response.message || 'Agent response received',
        sender: agent.name,
        type: 'agent',
        agentId: agent.id,
        timestamp: new Date().toISOString(),
        metadata: response.metadata || {}
      };

      // Add agent message to conversation
      conversation.messages.push(agentMessage);
      
      // Stop typing indicator
      io.to(conversationId).emit('agent-typing', {
        agentId: agent.id,
        agentName: agent.name,
        isTyping: false
      });

      // Broadcast agent message
      io.to(conversationId).emit('message-received', agentMessage);

      return agentMessage;
    } catch (error) {
      console.error(`Error processing agent ${agent.name}:`, error);
      
      // Stop typing indicator on error
      io.to(conversationId).emit('agent-typing', {
        agentId: agent.id,
        agentName: agent.name,
        isTyping: false
      });

      // Send error message
      const errorMessage = {
        id: uuidv4(),
        content: `Sorry, I encountered an error processing your request.`,
        sender: agent.name,
        type: 'agent',
        agentId: agent.id,
        timestamp: new Date().toISOString(),
        isError: true
      };

      conversation.messages.push(errorMessage);
      io.to(conversationId).emit('message-received', errorMessage);

      return errorMessage;
    }
  });

  // Wait for all agents to respond
  const responses = await Promise.allSettled(agentPromises);
  
  // Save updated conversation
  await saveConversation(conversation);

  console.log(`✅ Processed ${responses.length} agent responses for conversation ${conversationId}`);
}

// Prepare context for agent including conversation history
function prepareAgentContext(conversation, agent, currentMessage) {
  const recentMessages = conversation.messages.slice(-10); // Last 10 messages for context
  
  const context = {
    currentMessage,
    conversationHistory: recentMessages.map(msg => ({
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      type: msg.type
    })),
    agentConfiguration: agent.configuration || {},
    conversationId: conversation.id,
    timestamp: new Date().toISOString()
  };

  return context;
} 