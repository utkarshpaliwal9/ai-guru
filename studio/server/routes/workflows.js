import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  saveWorkflow,
  getWorkflow,
  getAllWorkflows,
  deleteWorkflow
} from '../utils/storage.js';

const router = express.Router();

// Get all workflows
router.get('/', async (req, res) => {
  try {
    const workflows = await getAllWorkflows();
    res.json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

// Get a specific workflow
router.get('/:id', async (req, res) => {
  try {
    const workflow = await getWorkflow(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ error: 'Failed to fetch workflow' });
  }
});

// Create a new workflow
router.post('/', async (req, res) => {
  try {
    const { name, description, prompt } = req.body;
    if (!name || !prompt) {
      return res.status(400).json({ error: 'Name and prompt are required' });
    }
    const workflow = {
      id: uuidv4(),
      name,
      description: description || '',
      prompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    const saved = await saveWorkflow(workflow);
    res.status(201).json(saved);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update a workflow
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    const existing = await getWorkflow(id);
    if (!existing) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    const updated = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };
    const saved = await saveWorkflow(updated);
    res.json(saved);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete a workflow
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteWorkflow(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json({ message: 'Workflow deleted successfully' });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

export default router; 