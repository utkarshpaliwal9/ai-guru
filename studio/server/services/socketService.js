import { 
  getConversation, 
  saveConversation, 
  getAgent, 
  getAllAgents 
} from '../utils/storage.js';
import { callAgentAPI } from './agentService.js';
import { baseLLMService } from './baseLLMService.js';
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

  // Handle user message and send to base LLM (Alfa)
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

      // Show typing indicator for Alfa
      io.to(conversationId).emit('agent-typing', {
        agentId: 'alfa-base',
        agentName: 'Alfa',
        isTyping: true
      });

      // Process message through base LLM (Alfa)
      await processBaseLLMResponse(conversation, content, io, conversationId);

    } catch (error) {
      console.error('❌ Error handling message:', error);
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

// Process message through base LLM (Alfa)
async function processBaseLLMResponse(conversation, userMessage, io, conversationId) {
  try {
    // Prepare conversation history for base LLM
    const conversationHistory = conversation.messages.map(msg => ({
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      type: msg.type
    }));

    // Get response from base LLM (Alfa)
    const response = await baseLLMService.processMessage(
      userMessage, 
      conversationHistory, 
      conversationId
    );

    // Create Alfa response message
    const alfaMessage = {
      id: uuidv4(),
      content: response.content,
      sender: 'Alfa',
      type: 'agent',
      agentId: 'alfa-base',
      timestamp: new Date().toISOString(),
      metadata: response.metadata || {}
    };

    // Add Alfa message to conversation
    conversation.messages.push(alfaMessage);
    await saveConversation(conversation);

    // Stop typing indicator
    io.to(conversationId).emit('agent-typing', {
      agentId: 'alfa-base',
      agentName: 'Alfa',
      isTyping: false
    });

    // Broadcast Alfa message
    io.to(conversationId).emit('message-received', alfaMessage);

    // Log successful processing
    const agentsCalled = response.metadata?.agentsCalled || [];
    if (agentsCalled.length > 0) {
      console.log(`✅ Alfa processed message and called agents: ${agentsCalled.join(', ')}`);
    } else {
      console.log(`✅ Alfa processed message (no agents called)`);
    }

  } catch (error) {
    console.error('❌ Error processing base LLM response:', error);
    
    // Stop typing indicator on error
    io.to(conversationId).emit('agent-typing', {
      agentId: 'alfa-base',
      agentName: 'Alfa',
      isTyping: false
    });

    // Different error messages based on error type
    let errorContent = `I apologize, but I'm experiencing technical difficulties. Please try again.`;
    
    if (error.message.includes('Alfa AI credentials not configured')) {
      errorContent = `🚫 Alfa AI is not configured on this server. Please contact your administrator to set up the required Alfa AI credentials.`;
    } else if (error.message.includes('Failed to initialize Alfa AI')) {
      errorContent = `❌ Unable to connect to Alfa AI. Please check the server configuration and try again.`;
    }

    // Send error message
    const errorMessage = {
      id: uuidv4(),
      content: errorContent,
      sender: 'Alfa',
      type: 'agent',
      agentId: 'alfa-base',
      timestamp: new Date().toISOString(),
      isError: true
    };

    conversation.messages.push(errorMessage);
    await saveConversation(conversation);
    io.to(conversationId).emit('message-received', errorMessage);
  }
} 