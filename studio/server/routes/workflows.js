import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  saveWorkflow,
  getWorkflow,
  getAllWorkflows,
  deleteWorkflow
} from '../utils/storage.js';
import { CrewAIProvider } from '../services/providers/CrewAIProvider.js';
import { agentServerManager } from '../services/agentServerManager.js';

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
    const { name, description, prompt, inputFields } = req.body;
    if (!name || !prompt) {
      return res.status(400).json({ error: 'Name and prompt are required' });
    }
    const workflow = {
      id: uuidv4(),
      name,
      description: description || '',
      prompt,
      inputFields: Array.isArray(inputFields) ? inputFields : [],
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

// Run a workflow
router.post('/:id/run', async (req, res) => {
  try {
    const { inputs = {} } = req.body;
    const workflowId = req.params.id;
    const workflow = await getWorkflow(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    // Validate required input fields
    if (Array.isArray(workflow.inputFields) && workflow.inputFields.length) {
      const missing = workflow.inputFields.filter(f => !(f.name in inputs));
      if (missing.length) {
        return res.status(400).json({ error: `Missing inputs: ${missing.map(m => m.name).join(', ')}` });
      }
    }

    // 1) Launch agent servers for agents mentioned in the workflow
    console.log(`🚀 Launching agent servers for workflow: ${workflow.name}`);
    const serverLaunchResult = await agentServerManager.launchAgentsFromText(workflow.prompt);
    
    if (serverLaunchResult.launchedAgents.length > 0) {
      console.log(`✅ Launched ${serverLaunchResult.launchedAgents.length} agent servers for workflow execution:`, 
        serverLaunchResult.launchedAgents.map(a => a.agentName));
    }

    // 2) Execute via CrewAI
    const provider = new CrewAIProvider();
    const result = await provider.sendMessage({ workflowId, inputs, prompt: workflow.prompt });
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Execution failed',
        serverLaunchResult 
      });
    }
    
    res.json({ 
      result: result.content, 
      metadata: {
        ...result.metadata,
        serverLaunchResult,
        workflowId,
        workflowName: workflow.name
      }
    });
    
  } catch (error) {
    console.error('Error running workflow:', error);
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

export default router; 