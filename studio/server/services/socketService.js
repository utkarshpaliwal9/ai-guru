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

      // Emit workflow started event
      io.to(conversationId).emit('workflow-started', {
        conversationId,
        message: 'Analyzing your request and determining if agents are needed...'
      });

      // Process message through base LLM (Alfa) with timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('LLM response timeout')), 30000);
      });
      
      const responsePromise = processBaseLLMResponse(conversation, content, io, conversationId);
      
      try {
        await Promise.race([responsePromise, timeoutPromise]);
      } catch (timeoutError) {
        console.error('❌ LLM response timeout:', timeoutError.message);
        
        // Stop typing indicator on timeout
        io.to(conversationId).emit('agent-typing', {
          agentId: 'alfa-base',
          agentName: 'Alfa',
          isTyping: false
        });

        // Send timeout error message
        const timeoutMessage = {
          id: uuidv4(),
          content: "⏰ I'm taking longer than usual to respond. This might be due to high server load or network issues. Please try again in a moment.",
          sender: 'Alfa',
          type: 'agent',
          agentId: 'alfa-base',
          timestamp: new Date().toISOString(),
          isError: true
        };

        conversation.messages.push(timeoutMessage);
        await saveConversation(conversation);
        io.to(conversationId).emit('message-received', timeoutMessage);
      }

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

    // Emit workflow completion status
    if (response.metadata?.orchestrated) {
      io.to(conversationId).emit('workflow-completed', {
        workflowId: response.metadata.workflowId,
        isComplete: response.metadata.isComplete,
        agentsCalled: response.metadata.agentsCalled || [],
        taskResults: response.metadata.taskResults || [],
        completionPercentage: response.metadata.completionPercentage || 100,
        remainingTasks: response.metadata.remainingTasks || []
      });
    }

    // Broadcast Alfa message
    io.to(conversationId).emit('message-received', alfaMessage);

    // Log successful processing
    const agentsCalled = response.metadata?.agentsCalled || [];
    if (response.metadata?.orchestrated) {
      if (agentsCalled.length > 0) {
        console.log(`✅ Orchestrator workflow completed - called agents: ${agentsCalled.join(', ')}`);
      } else {
        console.log(`✅ Orchestrator workflow completed - handled directly by Alfa`);
      }
    } else {
      console.log(`✅ Alfa processed message (legacy mode)`);
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