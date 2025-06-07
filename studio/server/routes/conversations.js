import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { 
  saveConversation, 
  getConversation, 
  getAllConversations, 
  deleteConversation 
} from '../utils/storage.js';

const router = express.Router();

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
    const conversation = await getConversation(req.params.id);
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

    const savedConversation = await saveConversation(conversation);
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
    const deleted = await deleteConversation(req.params.id);
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
    
    const conversation = await getConversation(conversationId);
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

    const savedConversation = await saveConversation(conversation);
    res.status(201).json({ message, conversation: savedConversation });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Failed to add message' });
  }
});

export default router; 