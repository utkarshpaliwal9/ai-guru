import { useState } from 'react';

interface Field {
  name: string;
  description?: string;
}

interface WorkflowRunModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  inputFields: Field[];
  onRunSuccess: (result: any) => void;
}

export default function WorkflowRunModal({ isOpen, onClose, workflowId, inputFields, onRunSuccess }: WorkflowRunModalProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  };

  const handleRun = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Run failed');
      onRunSuccess(data.result);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white dark:bg-gray-800 rounded-md p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Run Workflow</h2>
        {inputFields.map((field) => (
          <div key={field.name} className="mb-3">
            <label className="block text-sm font-medium mb-1">{field.description || field.name}</label>
            <input
              type="text"
              className="w-full border px-3 py-2 rounded-md bg-gray-50 dark:bg-gray-700"
              value={inputs[field.name] || ''}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          </div>
        ))}
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <div className="flex justify-end space-x-2">
          <button className="px-4 py-2 bg-gray-200 rounded-md" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md" onClick={handleRun} disabled={loading}>Run</button>
        </div>
      </div>
    </div>
  );
} 