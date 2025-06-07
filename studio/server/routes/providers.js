import express from 'express';
import { providerFactory } from '../services/providers/ProviderFactory.js';

const router = express.Router();

// Get all available provider types
router.get('/types', (req, res) => {
  try {
    const types = providerFactory.getAvailableTypes();
    res.json({
      types,
      total: types.length
    });
  } catch (error) {
    console.error('Error fetching provider types:', error);
    res.status(500).json({ error: 'Failed to fetch provider types' });
  }
});

// Get configuration template for a provider type
router.get('/types/:type/template', (req, res) => {
  try {
    const { type } = req.params;
    const template = providerFactory.getConfigTemplate(type);
    
    if (!template) {
      return res.status(404).json({ error: `No template found for provider type: ${type}` });
    }
    
    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch provider template' });
  }
});

// Get required fields for a provider type
router.get('/types/:type/requirements', (req, res) => {
  try {
    const { type } = req.params;
    const requiredFields = providerFactory.getRequiredFields(type);
    
    res.json({
      type,
      requiredFields,
      template: providerFactory.getConfigTemplate(type)
    });
  } catch (error) {
    console.error('Error fetching requirements:', error);
    res.status(500).json({ error: 'Failed to fetch provider requirements' });
  }
});

// Validate provider configuration
router.post('/validate', (req, res) => {
  try {
    const config = req.body;
    const validation = providerFactory.validateConfig(config);
    
    res.json(validation);
  } catch (error) {
    console.error('Error validating config:', error);
    res.status(500).json({ 
      valid: false, 
      error: 'Failed to validate configuration' 
    });
  }
});

// List all active providers
router.get('/', (req, res) => {
  try {
    const providers = providerFactory.listProviders();
    res.json(providers);
  } catch (error) {
    console.error('Error listing providers:', error);
    res.status(500).json({ error: 'Failed to list providers' });
  }
});

// Get provider statistics
router.get('/stats', (req, res) => {
  try {
    const stats = providerFactory.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch provider statistics' });
  }
});

// Test all active providers
router.post('/test-all', async (req, res) => {
  try {
    const results = await providerFactory.testAllProviders();
    res.json({
      results,
      summary: {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    });
  } catch (error) {
    console.error('Error testing providers:', error);
    res.status(500).json({ error: 'Failed to test providers' });
  }
});

// Create a new provider instance (for testing)
router.post('/create', async (req, res) => {
  try {
    const config = req.body;
    
    // Validate configuration first
    const validation = providerFactory.validateConfig(config);
    if (!validation.valid) {
      return res.status(400).json(validation);
    }
    
    const provider = await providerFactory.createProvider(config);
    
    res.status(201).json({
      name: provider.name,
      type: provider.type,
      capabilities: provider.getCapabilities(),
      message: 'Provider created successfully'
    });
  } catch (error) {
    console.error('Error creating provider:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove a provider instance
router.delete('/:name', (req, res) => {
  try {
    const { name } = req.params;
    const removed = providerFactory.removeProvider(name);
    
    if (!removed) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json({ message: 'Provider removed successfully' });
  } catch (error) {
    console.error('Error removing provider:', error);
    res.status(500).json({ error: 'Failed to remove provider' });
  }
});

// Test a specific provider
router.post('/:name/test', async (req, res) => {
  try {
    const { name } = req.params;
    const provider = providerFactory.getProvider(name);
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    const result = await provider.testConnection();
    res.json({
      name,
      type: provider.type,
      ...result
    });
  } catch (error) {
    console.error('Error testing provider:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Get provider capabilities
router.get('/:name/capabilities', (req, res) => {
  try {
    const { name } = req.params;
    const provider = providerFactory.getProvider(name);
    
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }
    
    res.json({
      name,
      type: provider.type,
      capabilities: provider.getCapabilities()
    });
  } catch (error) {
    console.error('Error fetching capabilities:', error);
    res.status(500).json({ error: 'Failed to fetch provider capabilities' });
  }
});

export default router; 