import React, { useState, useEffect, useRef, useCallback } from 'react';
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

  const parseUserInput = useCallback((text: string): FlowchartData => {
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
      id: 'FINAL_RESPONSE',
      label: 'Response to User',
      type: 'end',
      shape: 'stadium'
    });

    edges.push({
      from: 'ALFA',
      to: 'FINAL_RESPONSE',
      label: 'Generates Final Output'
    });
    
    return {
      nodes,
      edges,
      title: generateFlowchartTitle(text)
    };
  }, [availableAgents]);

  const generateMermaidCode = useCallback((data: FlowchartData): string => {
    const codeLines = ['graph TD'];
    
    // Definitions
    codeLines.push('  classDef alfa fill:#F9E79F,stroke:#333,stroke-width:2px;');
    codeLines.push('  classDef agent fill:#D5F5E3,stroke:#333,stroke-width:2px;');
    codeLines.push('  classDef decision fill:#FCF3CF,stroke:#333,stroke-width:2px;');
    codeLines.push('  classDef start fill:#D6EAF8,stroke:#333,stroke-width:2px;');
    codeLines.push('  classDef end_node fill:#D6EAF8,stroke:#333,stroke-width:2px;');
    codeLines.push('  classDef data fill:#EADCF5,stroke:#333,stroke-width:2px;');
    codeLines.push('');

    // Nodes and their classes
    data.nodes.forEach(node => {
      let shape, label;
      switch (node.shape) {
        case 'stadium':
          shape = ['([', '])'];
          break;
        case 'hexagon':
          shape = ['{{', '}}'];
          break;
        case 'diamond':
          shape = ['{', '}'];
          break;
        default:
          shape = ['[', ']'];
      }
      label = node.label.replace(/"/g, '#quot;');
      codeLines.push(`  ${node.id}${shape[0]}"${label}"${shape[1]}`);
      const className = node.type === 'end' ? 'end_node' : node.type;
      codeLines.push(`  class ${node.id} ${className}`);
    });

    codeLines.push('');

    // Edges
    data.edges.forEach(edge => {
      if (edge.label) {
        codeLines.push(`  ${edge.from} --"${edge.label}"--> ${edge.to}`);
      } else {
        codeLines.push(`  ${edge.from} --> ${edge.to}`);
      }
    });

    // Styles
    const dashedEdges = data.edges.map((e, i) => ({...e, index: i})).filter(e => e.style === 'dashed');
    if (dashedEdges.length > 0) {
      codeLines.push('');
      codeLines.push(`  linkStyle ${dashedEdges.map(e => e.index).join(',')} stroke-dasharray: 5 5`);
    }
    
    if (data.edges.length > 0) {
      codeLines.push('');
      codeLines.push(`  linkStyle ${data.edges.length-1} stroke-width:2px,stroke:green,color:green;`);
    }

    return codeLines.join('\n');
  }, []);

  const generateFlowchart = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    try {
      // Simulate API call or complex logic
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const data = parseUserInput(input);
      setFlowchartData(data);
      
      const code = generateMermaidCode(data);
      setMermaidCode(code);

      if (onGenerate) {
        onGenerate(code);
      }
    } catch (e: any) {
      console.error("Error generating flowchart:", e);
      setError("Failed to generate flowchart. Please check the input and try again.");
      setFlowchartData(null);
      setMermaidCode('');
    } finally {
      setIsGenerating(false);
    }
  }, [input, onGenerate, parseUserInput, generateMermaidCode]);

  useEffect(() => {
    if (input.trim()) {
      generateFlowchart();
    }
  }, [input, generateFlowchart]);

  // Render Mermaid diagram when mermaidCode changes
  useEffect(() => {
    const renderFlowchart = async () => {
      if (mermaidCode && containerRef.current) {
        // Clear previous render and error states
        setError(null);
        containerRef.current.innerHTML = '';

        const div = document.createElement('div');
        div.className = 'mermaid';
        div.textContent = mermaidCode;
        containerRef.current.appendChild(div);

        try {
          await mermaid.run({ nodes: [div] });
        } catch (e: any) {
          console.error("Mermaid rendering error:", e);
          const friendlyMessage = "Failed to render flowchart due to a syntax error in the generated diagram.";
          setError(friendlyMessage);
          if (containerRef.current) {
            containerRef.current.innerHTML = ''; // Clear on error
          }
        }
      }
    };
    renderFlowchart();
  }, [mermaidCode]);

  const extractWorkflowSteps = (text: string): string[] => {
    const stepRegex = /^\s*(\d+\.|-|\*)\s+(.*)/gm;
    const steps = [];
    let match;
    while ((match = stepRegex.exec(text)) !== null) {
      steps.push(match[2].trim());
    }
    return steps;
  };

  const inferAgentsFromText = (text: string): string[] => {
    const inferred: string[] = [];
    if (text.match(/\b(file|read|write|document)\b/i)) inferred.push('FileSystem');
    if (text.match(/\b(search|find|google|web)\b/i)) inferred.push('WebSearch');
    return Array.from(new Set(inferred));
  };

  const hasConditionalLogic = (text: string): boolean => {
    return /\b(if|else|otherwise|then)\b/i.test(text);
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
      'General': '⚡',
      'WebSearch': '🔍'
    };
    return icons[providerType] || '🤖';
  };

  const generateFlowchartTitle = (text: string): string => {
    const firstLine = text.split('\n')[0];
    return `Workflow for: "${firstLine.substring(0, 50)}${firstLine.length > 50 ? '...' : ''}"`;
  };

  const copyToClipboard = async () => {
    if (!mermaidCode) return;
    try {
      await navigator.clipboard.writeText(mermaidCode);
      toast.success('Mermaid code copied to clipboard!');
    } catch (err) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const downloadMermaid = () => {
    if (!mermaidCode) return;
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

  const downloadSvg = () => {
    if (containerRef.current?.querySelector('svg')) {
      const svg = containerRef.current.querySelector('svg');
      if (svg) {
        const blob = new Blob([svg.outerHTML], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'flowchart.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success('Flowchart downloaded as SVG!');
      } else {
        toast.error("Could not find rendered SVG to download.");
      }
    } else {
      toast.error("Could not find rendered SVG to download.");
    }
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
            onClick={downloadSvg}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Download as SVG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Flowchart Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-gray-200 rounded-lg p-6 overflow-auto flex justify-center items-center"
        style={{ maxHeight: '80vh', maxWidth: '90vw' }}
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