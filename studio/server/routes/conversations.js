import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  saveConversation, 
  getConversation, 
  getAllConversations, 
  deleteConversation 
} from '../utils/storage.js';
import cleanupEmptyConversations from '../utils/cleanupEmptyConversations.js';

const router = express.Router();

// In-memory storage for empty conversations that haven't been saved yet
const pendingConversations = new Map();

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const conversations = await getAllConversations();
    res.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get a specific conversation
router.get('/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    // Check if this is a pending conversation that hasn't been saved yet
    if (pendingConversations.has(conversationId)) {
      return res.json(pendingConversations.get(conversationId));
    }
    
    const conversation = await getConversation(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// Create a new conversation
router.post('/', async (req, res) => {
  try {
    const { title, agents = [] } = req.body;
    
    const conversation = {
      id: uuidv4(),
      title: title || 'New Conversation',
      agents,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save the conversation to disk
    const savedConversation = await saveConversation(conversation);
    // Remove from pending if it was added (cleanup)
    pendingConversations.delete(conversation.id);
    // Return the persisted conversation object to the client
    res.status(201).json(savedConversation);
  } catch (error) {
    console.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// Update a conversation
router.put('/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const updates = req.body;
    
    // Check if this is a pending conversation that hasn't been saved yet
    if (pendingConversations.has(conversationId)) {
      const pendingConversation = pendingConversations.get(conversationId);
      const updatedConversation = {
        ...pendingConversation,
        ...updates,
        id: conversationId, // Ensure ID doesn't change
        updatedAt: new Date().toISOString()
      };
      
      // If it now has messages, save it to disk and remove from pending
      if (updatedConversation.messages && updatedConversation.messages.length > 0) {
        const savedConversation = await saveConversation(updatedConversation);
        pendingConversations.delete(conversationId);
        return res.json(savedConversation);
      } else {
        // Otherwise just update it in memory
        pendingConversations.set(conversationId, updatedConversation);
        return res.json(updatedConversation);
      }
    }
    
    // Otherwise handle normally for conversations already saved to disk
    const existingConversation = await getConversation(conversationId);
    if (!existingConversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const updatedConversation = {
      ...existingConversation,
      ...updates,
      id: conversationId, // Ensure ID doesn't change
      updatedAt: new Date().toISOString()
    };

    const savedConversation = await saveConversation(updatedConversation);
    res.json(savedConversation);
  } catch (error) {
    console.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

// Delete a conversation
router.delete('/:id', async (req, res) => {
  try {
    const conversationId = req.params.id;
    
    // Check if this is a pending conversation that hasn't been saved yet
    if (pendingConversations.has(conversationId)) {
      pendingConversations.delete(conversationId);
      return res.json({ message: 'Conversation deleted successfully' });
    }
    
    const deleted = await deleteConversation(conversationId);
    if (!deleted) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ message: 'Conversation deleted successfully' });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// Add a message to a conversation
router.post('/:id/messages', async (req, res) => {
  try {
    const conversationId = req.params.id;
    const { content, sender, type = 'user', agentId = null } = req.body;
    
    // Check if this is a pending conversation that hasn't been saved yet
    let conversation;
    if (pendingConversations.has(conversationId)) {
      conversation = pendingConversations.get(conversationId);
    } else {
      conversation = await getConversation(conversationId);
    }
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = {
      id: uuidv4(),
      content,
      sender,
      type, // 'user', 'agent', 'system'
      agentId,
      timestamp: new Date().toISOString()
    };

    conversation.messages.push(message);
    conversation.updatedAt = new Date().toISOString();

    // If this was a pending conversation, move it to permanent storage
    if (pendingConversations.has(conversationId)) {
      pendingConversations.delete(conversationId);
    }
    
    // Save the conversation with the new message
    const savedConversation = await saveConversation(conversation);
    res.status(201).json({ message, conversation: savedConversation });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

// Cleanup empty conversations
router.post('/cleanup/empty', async (req, res) => {
  try {
    const count = await cleanupEmptyConversations();
    res.json({ 
      success: true, 
      message: `Successfully deleted ${count} empty conversations`,
      deletedCount: count
    });
  } catch (error) {
    console.error('Error cleaning up empty conversations:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to clean up empty conversations' 
    });
  }
});

export default router; 