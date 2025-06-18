import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit3, Trash2, GitBranch, X, Play, Pause, StopCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import FlowchartGenerator from './FlowchartGenerator';

// Workflow and Agent interfaces
type Workflow = {
  id: string;
  name: string;
  description: string;
  prompt: string;
  inputFields?: { name: string; description: string }[];
  createdAt: string;
  updatedAt: string;
};

type Agent = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  providerType: string;
  mcpConfig?: any;
};

export default function WorkflowManagement() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Workflow | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '', prompt: '' });
  const [workflowStatus, setWorkflowStatus] = useState<Record<string, 'idle' | 'running' | 'paused' | 'stopped' | 'completed'>>({});
  const timersRef = useRef<Record<string, number>>({});
  const [showFlowchart, setShowFlowchart] = useState(false);
  const [flowchartPrompt, setFlowchartPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWorkflows();
    loadAgents();
  }, []);

  const loadWorkflows = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows`);
      if (res.ok) {
        const data = await res.json();
        setWorkflows(data);
        // initialize workflow statuses
        const initialStatus: Record<string, 'idle' | 'running' | 'paused' | 'stopped' | 'completed'> = {};
        data.forEach((wf: Workflow) => { initialStatus[wf.id] = 'idle'; });
        setWorkflowStatus(initialStatus);
      } else {
        throw new Error('Failed to load workflows');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load workflows');
    } finally {
      setIsLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`);
      if (res.ok) {
        const data = await res.json();
        setAvailableAgents(data.filter((a: Agent) => a.isActive));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', description: '', prompt: '' });
    setShowForm(true);
  };

  const openEdit = (wf: Workflow) => {
    setEditing(wf);
    setFormData({ name: wf.name, description: wf.description, prompt: wf.prompt });
    setShowForm(true);
  };

  const closeForm = () => setShowForm(false);

  const saveWorkflow = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) {
      return toast.error('Name and prompt are required');
    }
    try {
      setIsSubmitting(true);
      const url = editing
        ? `${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${editing.id}`
        : `${process.env.NEXT_PUBLIC_API_URL}/api/workflows`;
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        toast.success(editing ? 'Workflow updated' : 'Workflow created');
        closeForm();
        loadWorkflows();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to save workflow');
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to save workflow');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteWorkflowById = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Workflow deleted');
        loadWorkflows();
      } else {
        throw new Error();
      }
    } catch {
      toast.error('Failed to delete workflow');
    }
  };

  const openFlow = (prompt: string) => {
    setFlowchartPrompt(prompt);
    setShowFlowchart(true);
  };

  const closeFlow = () => setShowFlowchart(false);

  // Workflow control functions
  const startWorkflow = (id: string) => {
    if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
    setWorkflowStatus(prev => ({ ...prev, [id]: 'running' }));
    timersRef.current[id] = window.setTimeout(() => {
      setWorkflowStatus(prev => ({ ...prev, [id]: 'completed' }));
      delete timersRef.current[id];
    }, 30000);
  };

  const pauseWorkflow = (id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setWorkflowStatus(prev => ({ ...prev, [id]: 'paused' }));
  };

  const stopWorkflow = (id: string) => {
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
    setWorkflowStatus(prev => ({ ...prev, [id]: 'stopped' }));
  };

  if (isLoading) {
    return <div className="p-8 text-center">Loading workflows...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
        <button onClick={openCreate} className="btn-primary">
          <Plus className="w-4 h-4 mr-2" />New Workflow
        </button>
      </div>
      {workflows.length === 0 ? (
        <div className="text-center text-gray-500">No workflows created yet.</div>
      ) : (
        <div className="space-y-4">
          {workflows.map(wf => (
            <div key={wf.id} className="border border-gray-200 rounded-lg p-4 flex justify-between items-center">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-gray-900">{wf.name}</h2>
                <p className="text-sm text-gray-600 truncate">{wf.description}</p>
                {wf.inputFields && wf.inputFields.length > 0 && (
                  <p className="text-xs text-gray-500 truncate">
                    Inputs: {wf.inputFields.map(f => f.name).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {['idle', 'stopped', 'completed'].includes(workflowStatus[wf.id]) && (
                  <button
                    onClick={() => startWorkflow(wf.id)}
                    title="Start Workflow"
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Play className="w-5 h-5 text-green-500" />
                  </button>
                )}
                {workflowStatus[wf.id] === 'running' && (
                  <button
                    onClick={() => pauseWorkflow(wf.id)}
                    title="Pause Workflow"
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Pause className="w-5 h-5 text-yellow-500" />
                  </button>
                )}
                {workflowStatus[wf.id] === 'paused' && (
                  <button
                    onClick={() => stopWorkflow(wf.id)}
                    title="Stop Workflow"
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <StopCircle className="w-5 h-5 text-red-500" />
                  </button>
                )}
                <button onClick={() => openFlow(wf.prompt)} title="Generate flowchart" className="p-1 hover:bg-gray-100 rounded">
                  <GitBranch className="w-5 h-5" />
                </button>
                <button onClick={() => openEdit(wf)} title="Edit" className="p-1 hover:bg-gray-100 rounded">
                  <Edit3 className="w-5 h-5" />
                </button>
                <button onClick={() => deleteWorkflowById(wf.id)} title="Delete" className="p-1 hover:bg-red-100 rounded">
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
            <button onClick={closeForm} className="absolute top-3 right-3 p-2 text-gray-600 hover:text-gray-800">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Workflow' : 'New Workflow'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input-field mt-1 w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="input-field mt-1 w-full"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Prompt *</label>
                <textarea
                  value={formData.prompt}
                  onChange={e => setFormData({ ...formData, prompt: e.target.value })}
                  className="input-field mt-1 w-full bg-white"
                  rows={4}
                />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button onClick={closeForm} className="btn-secondary">Cancel</button>
                <button onClick={saveWorkflow} disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFlowchart && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full relative">
            <button onClick={closeFlow} className="absolute top-3 right-3 p-2 text-gray-600 hover:text-gray-800">
              <X className="w-5 h-5" />
            </button>
            <FlowchartGenerator input={flowchartPrompt} availableAgents={availableAgents} />
          </div>
        </div>
      )}
    </div>
  );
} 