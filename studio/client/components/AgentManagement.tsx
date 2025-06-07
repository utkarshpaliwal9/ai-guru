import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Bot, Edit3, Trash2, Settings, Save, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Agent {
  id: string;
  name: string;
  description: string;
  apiEndpoint: string;
  apiKey: string;
  configuration: Record<string, any>;
  mcpServerId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ConfigPair {
  key: string;
  value: string;
}

export default function AgentManagement() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    apiEndpoint: '',
    apiKey: '',
  });
  const [configPairs, setConfigPairs] = useState<ConfigPair[]>([{ key: '', value: '' }]);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`);
      if (response.ok) {
        const data = await response.json();
        setAgents(data);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      toast.error('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      apiEndpoint: '',
      apiKey: '',
    });
    setConfigPairs([{ key: '', value: '' }]);
    setEditingAgent(null);
  };

  const openCreateForm = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const openEditForm = (agent: Agent) => {
    setFormData({
      name: agent.name,
      description: agent.description,
      apiEndpoint: agent.apiEndpoint,
      apiKey: '', // Don't show existing API key for security
    });
    
    // Convert configuration object to key-value pairs
    const pairs = Object.entries(agent.configuration || {}).map(([key, value]) => ({
      key,
      value: String(value)
    }));
    setConfigPairs(pairs.length > 0 ? pairs : [{ key: '', value: '' }]);
    
    setEditingAgent(agent);
    setShowCreateForm(true);
  };

  const closeForm = () => {
    setShowCreateForm(false);
    resetForm();
  };

  const addConfigPair = () => {
    setConfigPairs([...configPairs, { key: '', value: '' }]);
  };

  const removeConfigPair = (index: number) => {
    setConfigPairs(configPairs.filter((_, i) => i !== index));
  };

  const updateConfigPair = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...configPairs];
    updated[index][field] = value;
    setConfigPairs(updated);
  };

  const saveAgent = async () => {
    if (!formData.name || !formData.apiEndpoint) {
      toast.error('Name and API endpoint are required');
      return;
    }

    // Convert config pairs to object
    const configuration = configPairs.reduce((acc, pair) => {
      if (pair.key && pair.value) {
        acc[pair.key] = pair.value;
      }
      return acc;
    }, {} as Record<string, any>);

    const agentData = {
      ...formData,
      configuration,
    };

    try {
      const url = editingAgent 
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/agents/${editingAgent.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/agents`;
      
      const method = editingAgent ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      });

      if (response.ok) {
        const savedAgent = await response.json();
        
        if (editingAgent) {
          setAgents(prev => prev.map(agent => 
            agent.id === editingAgent.id ? savedAgent : agent
          ));
          toast.success('Agent updated successfully');
        } else {
          setAgents(prev => [savedAgent, ...prev]);
          toast.success('Agent created successfully');
        }
        
        closeForm();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save agent');
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      toast.error('Failed to save agent');
    }
  };

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${agentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setAgents(prev => prev.filter(agent => agent.id !== agentId));
        toast.success('Agent deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting agent:', error);
      toast.error('Failed to delete agent');
    }
  };

  const toggleAgent = async (agentId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents/${agentId}/toggle`, {
        method: 'PATCH',
      });

      if (response.ok) {
        const updatedAgent = await response.json();
        setAgents(prev => prev.map(agent => 
          agent.id === agentId ? updatedAgent : agent
        ));
        toast.success(`Agent ${updatedAgent.isActive ? 'activated' : 'deactivated'}`);
      }
    } catch (error) {
      console.error('Error toggling agent:', error);
      toast.error('Failed to toggle agent');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Agent Management</h1>
          <p className="text-gray-600 mt-2">Create and manage AI agents for conversations</p>
        </div>
        <button
          onClick={openCreateForm}
          className="btn-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Agent
        </button>
      </div>

      {/* Agents Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card"
          >
            <div className="card-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`agent-avatar ${agent.isActive ? '' : 'opacity-50'}`}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                    <p className="text-sm text-gray-500 truncate">{agent.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => openEditForm(agent)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit3 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => deleteAgent(agent.id)}
                    className="p-1 hover:bg-red-100 rounded"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </div>

            <div className="card-body">
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500">API Endpoint</label>
                  <p className="text-sm text-gray-900 truncate">{agent.apiEndpoint}</p>
                </div>

                {Object.keys(agent.configuration || {}).length > 0 && (
                  <div>
                    <label className="text-xs font-medium text-gray-500">Configuration</label>
                    <div className="mt-1 space-y-1">
                      {Object.entries(agent.configuration).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-xs">
                          <span className="text-gray-600">{key}:</span>
                          <span className="text-gray-900 truncate max-w-20">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    agent.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {agent.isActive ? 'Active' : 'Inactive'}
                  </span>
                  
                  <button
                    onClick={() => toggleAgent(agent.id)}
                    className={`text-xs px-3 py-1 rounded-md transition-colors ${
                      agent.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {agent.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-16"
        >
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Agents Created</h3>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Create your first AI agent to start building conversational experiences. 
            Agents can connect to different AI models and services.
          </p>
          <button
            onClick={openCreateForm}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Your First Agent
          </button>
        </motion.div>
      )}

      {/* Create/Edit Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingAgent ? 'Edit Agent' : 'Create New Agent'}
                </h2>
                <button
                  onClick={closeForm}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Agent Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="input-field"
                      placeholder="e.g., GPT Assistant"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API Endpoint *
                    </label>
                    <input
                      type="url"
                      value={formData.apiEndpoint}
                      onChange={(e) => setFormData({ ...formData, apiEndpoint: e.target.value })}
                      className="input-field"
                      placeholder="https://api.example.com/chat"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows={3}
                    placeholder="Describe what this agent does..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
                    className="input-field"
                    placeholder="Enter API key..."
                  />
                </div>

                {/* Configuration Key-Value Pairs */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Configuration
                  </label>
                  <div className="space-y-3">
                    {configPairs.map((pair, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={pair.key}
                          onChange={(e) => updateConfigPair(index, 'key', e.target.value)}
                          className="input-field"
                          placeholder="Key"
                        />
                        <input
                          type="text"
                          value={pair.value}
                          onChange={(e) => updateConfigPair(index, 'value', e.target.value)}
                          className="input-field"
                          placeholder="Value"
                        />
                        {configPairs.length > 1 && (
                          <button
                            onClick={() => removeConfigPair(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      onClick={addConfigPair}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      + Add Configuration Pair
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t">
                  <button
                    onClick={closeForm}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveAgent}
                    className="btn-primary"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {editingAgent ? 'Update Agent' : 'Create Agent'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
} 