import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, GitBranch, Zap, AlertCircle, Copy, Download, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import mermaid from 'mermaid';

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  providerType: string;
  mcpConfig?: any;
}

interface FlowchartNode {
  id: string;
  label: string;
  type: 'start' | 'alfa' | 'agent' | 'decision' | 'end' | 'data';
  agentType?: string;
  shape?: string;
}

interface FlowchartEdge {
  from: string;
  to: string;
  label?: string;
  style?: string;
}

interface FlowchartData {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  title?: string;
}

interface FlowchartGeneratorProps {
  input: string;
  availableAgents: Agent[];
  onGenerate?: (flowchart: string) => void;
}

export default function FlowchartGenerator({ input, availableAgents, onGenerate }: FlowchartGeneratorProps) {
  const [flowchartData, setFlowchartData] = useState<FlowchartData | null>(null);
  const [mermaidCode, setMermaidCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (input.trim()) {
      generateFlowchart();
    }
  }, [input, availableAgents]);

  // Render Mermaid diagram when mermaidCode changes
  useEffect(() => {
    if (mermaidCode && containerRef.current) {
      mermaid.run({ nodes: [containerRef.current] });
    }
  }, [mermaidCode]);

  const parseUserInput = (text: string): FlowchartData => {
    const mentionedAgents = new Set<string>();
    const agentMatches = text.match(/@(\w+)/g);
    
    if (agentMatches) {
      agentMatches.forEach(match => {
        const agentName = match.substring(1);
        const agent = availableAgents.find(a => 
          a.name.toLowerCase() === agentName.toLowerCase()
        );
        if (agent) {
          mentionedAgents.add(agent.name);
        }
      });
    }

    // Parse workflow steps from text
    const steps = extractWorkflowSteps(text);
    const nodes: FlowchartNode[] = [];
    const edges: FlowchartEdge[] = [];

    // Add start node
    nodes.push({
      id: 'START',
      label: 'User Request',
      type: 'start',
      shape: 'stadium'
    });

    // Add Alfa LLM as central orchestrator
    nodes.push({
      id: 'ALFA',
      label: '🧠 Alfa LLM<br/>Orchestrator',
      type: 'alfa',
      shape: 'hexagon'
    });

    // Connect start to Alfa
    edges.push({
      from: 'START',
      to: 'ALFA',
      label: 'Analyzes Request'
    });

    let lastNode = 'ALFA';
    let nodeCounter = 1;

    // Add mentioned agents and their connections
    if (mentionedAgents.size > 0) {
      mentionedAgents.forEach(agentName => {
        const agent = availableAgents.find(a => a.name === agentName);
        if (agent) {
          const agentId = `AGENT_${nodeCounter}`;
          nodes.push({
            id: agentId,
            label: `${getAgentIcon(agent.providerType)} ${agent.name}<br/>${agent.description}`,
            type: 'agent',
            agentType: agent.providerType,
            shape: 'rect'
          });

          // Connect Alfa to agent
          edges.push({
            from: 'ALFA',
            to: agentId,
            label: 'Delegates Task'
          });

          // Connect agent back to Alfa
          edges.push({
            from: agentId,
            to: 'ALFA',
            label: 'Returns Data',
            style: 'dashed'
          });

          nodeCounter++;
        }
      });
    } else {
      // If no specific agents mentioned, show generic workflow
      const inferredAgents = inferAgentsFromText(text);
      
      inferredAgents.forEach(agentType => {
        const agentId = `INFERRED_${nodeCounter}`;
        nodes.push({
          id: agentId,
          label: `${getAgentIcon(agentType)} ${agentType}<br/>Agent`,
          type: 'agent',
          agentType: agentType,
          shape: 'rect'
        });

        edges.push({
          from: 'ALFA',
          to: agentId,
          label: 'May Use'
        });

        edges.push({
          from: agentId,
          to: 'ALFA',
          label: 'Data Flow',
          style: 'dashed'
        });

        nodeCounter++;
      });
    }

    // Add decision node if workflow has conditions
    if (hasConditionalLogic(text)) {
      const decisionId = `DECISION_${nodeCounter}`;
      nodes.push({
        id: decisionId,
        label: 'Evaluate<br/>Results',
        type: 'decision',
        shape: 'diamond'
      });

      edges.push({
        from: 'ALFA',
        to: decisionId,
        label: 'Checks Completion'
      });

      nodeCounter++;
    }

    // Add end node
    nodes.push({
      id: 'END',
      label: 'Response to User',
      type: 'end',
      shape: 'stadium'
    });

    edges.push({
      from: 'ALFA',
      to: 'END',
      label: 'Final Response'
    });

    return {
      nodes,
      edges,
      title: generateFlowchartTitle(text)
    };
  };

  const extractWorkflowSteps = (text: string): string[] => {
    // Simple extraction based on action words and sentence structure
    const actionWords = ['analyze', 'extract', 'generate', 'create', 'fetch', 'process', 'visit', 'navigate', 'search', 'find'];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());
    
    return sentences.filter(sentence => 
      actionWords.some(action => sentence.toLowerCase().includes(action))
    );
  };

  const inferAgentsFromText = (text: string): string[] => {
    const textLower = text.toLowerCase();
    const inferredAgents: string[] = [];

    // Web-related keywords
    if (textLower.includes('web') || textLower.includes('website') || textLower.includes('browser') || textLower.includes('navigate') || textLower.includes('visit')) {
      inferredAgents.push('Browser');
    }

    // File/GitHub related
    if (textLower.includes('github') || textLower.includes('repository') || textLower.includes('git')) {
      inferredAgents.push('GitHub');
    }

    // Data processing
    if (textLower.includes('data') || textLower.includes('csv') || textLower.includes('json') || textLower.includes('database')) {
      inferredAgents.push('Data');
    }

    // File operations
    if (textLower.includes('file') || textLower.includes('document') || textLower.includes('read') || textLower.includes('write')) {
      inferredAgents.push('Filesystem');
    }

    // API calls
    if (textLower.includes('api') || textLower.includes('request') || textLower.includes('fetch')) {
      inferredAgents.push('API');
    }

    return inferredAgents.length > 0 ? inferredAgents : ['General'];
  };

  const hasConditionalLogic = (text: string): boolean => {
    const conditionalWords = ['if', 'then', 'else', 'when', 'unless', 'while', 'until'];
    return conditionalWords.some(word => text.toLowerCase().includes(word));
  };

  const getAgentIcon = (providerType: string): string => {
    const icons: Record<string, string> = {
      'mcp': '🤖',
      'api': '🔌',
      'Browser': '🌐',
      'GitHub': '🐙',
      'Data': '📊',
      'Filesystem': '📁',
      'API': '🔌',
      'General': '⚡'
    };
    return icons[providerType] || '🛠️';
  };

  const generateFlowchartTitle = (text: string): string => {
    const firstSentence = text.split(/[.!?]/)[0].trim();
    return firstSentence.length > 50 ? firstSentence.substring(0, 47) + '...' : firstSentence;
  };

  const generateMermaidCode = (data: FlowchartData): string => {
    let code = 'flowchart TD\n';
    
    // Add nodes with styling
    data.nodes.forEach(node => {
      let nodeDefinition = '';
      
      switch (node.shape || node.type) {
        case 'stadium':
          nodeDefinition = `    ${node.id}([${node.label}])`;
          break;
        case 'hexagon':
          nodeDefinition = `    ${node.id}{{${node.label}}}`;
          break;
        case 'diamond':
          nodeDefinition = `    ${node.id}{${node.label}}`;
          break;
        case 'rect':
        default:
          nodeDefinition = `    ${node.id}[${node.label}]`;
          break;
      }
      
      code += nodeDefinition + '\n';
    });

    code += '\n';

    // Add edges
    data.edges.forEach(edge => {
      const connector = edge.style === 'dashed' ? '-..->' : '-->';
      const label = edge.label ? `|${edge.label}|` : '';
      code += `    ${edge.from} ${connector}${label} ${edge.to}\n`;
    });

    code += '\n';

    // Add styling
    code += `    classDef startEnd fill:#e1f5fe,stroke:#0277bd,stroke-width:2px,color:#000\n`;
    code += `    classDef alfa fill:#f3e5f5,stroke:#7b1fa2,stroke-width:3px,color:#000\n`;
    code += `    classDef agent fill:#e8f5e8,stroke:#2e7d32,stroke-width:2px,color:#000\n`;
    code += `    classDef decision fill:#fff3e0,stroke:#ef6c00,stroke-width:2px,color:#000\n`;
    
    code += '\n';

    // Apply classes
    data.nodes.forEach(node => {
      switch (node.type) {
        case 'start':
        case 'end':
          code += `    class ${node.id} startEnd\n`;
          break;
        case 'alfa':
          code += `    class ${node.id} alfa\n`;
          break;
        case 'agent':
          code += `    class ${node.id} agent\n`;
          break;
        case 'decision':
          code += `    class ${node.id} decision\n`;
          break;
      }
    });

    return code;
  };

  const generateFlowchart = async () => {
    if (!input.trim()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const data = parseUserInput(input);
      const mermaidSyntax = generateMermaidCode(data);
      
      setFlowchartData(data);
      setMermaidCode(mermaidSyntax);
      
      if (onGenerate) {
        onGenerate(mermaidSyntax);
      }

      toast.success('Flowchart generated successfully!');
    } catch (err) {
      const errorMessage = 'Failed to generate flowchart';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(mermaidCode);
      toast.success('Mermaid code copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadMermaid = () => {
    const blob = new Blob([mermaidCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flowchart.mmd';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Flowchart downloaded!');
  };

  if (!input.trim()) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Enter a message to generate a flowchart</p>
          <p className="text-sm mt-2">Mention agents with @agentName or describe a workflow</p>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-500" />
          <p className="text-gray-600">Generating flowchart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-500">
          <AlertCircle className="w-12 h-12 mx-auto mb-4" />
          <p>{error}</p>
          <button 
            onClick={generateFlowchart}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {flowchartData?.title || 'Workflow Flowchart'}
            </h3>
            <p className="text-sm text-gray-500">
              Showing Alfa LLM orchestration with {flowchartData?.nodes.filter(n => n.type === 'agent').length} agent(s)
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={copyToClipboard}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Copy Mermaid code"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={downloadMermaid}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download as .mmd file"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={generateFlowchart}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Regenerate"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flowchart Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg p-6 overflow-auto"
      >
        <div className="mermaid-container w-full">
          <div ref={containerRef} className="mermaid">
            {mermaidCode}
          </div>
        </div>
      </motion.div>

      {/* Info */}
      <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3">
        <p className="flex items-center space-x-2">
          <Bot className="w-4 h-4" />
          <span>
            This flowchart shows how Alfa LLM orchestrates agents to complete your request. 
            Solid arrows show task delegation, dashed arrows show data flow back to Alfa.
          </span>
        </p>
      </div>
    </div>
  );
} 