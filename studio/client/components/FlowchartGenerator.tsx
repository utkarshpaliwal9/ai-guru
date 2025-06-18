import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  addEdge,
  Controls,
  Background,
  Position,
  MarkerType,
} from 'reactflow';
import { motion } from 'framer-motion';
import { Bot, GitBranch, Zap, AlertCircle, Download, RefreshCw, Maximize, Minimize } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { toPng } from 'html-to-image';

import 'reactflow/dist/style.css';

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  providerType: string;
  mcpConfig?: any;
}

interface FlowchartGeneratorProps {
  input: string;
  availableAgents: Agent[];
  onGenerate?: (flowchart: string) => void;
}

const getAgentIcon = (providerType: string): string => {
  const icons: Record<string, string> = {
    'mcp': '🤖', 'api': '🔌', 'Browser': '🌐', 'GitHub': '🐙',
    'Data': '📊', 'Filesystem': '📁', 'WebSearch': '🔍',
  };
  return icons[providerType] || '⚡';
};

// Custom layout logic
const getLayoutedElements = (nodes: any[], edges: any[]) => {
  if (nodes.length === 0) return { nodes, edges };

  const layoutedNodes = [...nodes];
  const nodeWidth = 240;
  const nodeHeight = 96;
  const verticalGap = 120;
  const horizontalGap = 60;

  // Find root and orchestrator
  const rootNode = layoutedNodes.find(n => n.id === 'START');
  const orchestratorNode = layoutedNodes.find(n => n.id === 'ALFA');
  
  if (rootNode) rootNode.position = { x: 0, y: 0 };
  if (orchestratorNode) orchestratorNode.position = { x: 0, y: verticalGap * 1.5 };

  const agentNodes = layoutedNodes.filter(n => n.type === 'agent');
  const totalWidth = agentNodes.length * (nodeWidth + horizontalGap) - horizontalGap;
  const startX = -(totalWidth / 2) + (nodeWidth / 2);

  agentNodes.forEach((node, index) => {
    node.position = { x: startX + index * (nodeWidth + horizontalGap), y: verticalGap * 3 };
  });
  
  const decisionNode = layoutedNodes.find(n => n.id.startsWith('DECISION'));
  if (decisionNode) decisionNode.position = { x: 0, y: verticalGap * 4.5 };
  
  const endNode = layoutedNodes.find(n => n.id === 'FINAL_RESPONSE');
  const lastYLevel = decisionNode ? verticalGap * 6 : verticalGap * 4.5;
  if (endNode) endNode.position = { x: 0, y: lastYLevel };

  return { nodes: layoutedNodes, edges };
};


export default function FlowchartGenerator({ input, availableAgents }: FlowchartGeneratorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowchartTitle, setFlowchartTitle] = useState('Workflow Flowchart');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const flowchartContainerRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

  const generateFlowchart = useCallback(async () => {
    if (!input.trim()) return;

    setIsGenerating(true);
    setError(null);
    try {
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate processing

        const parsedData = parseUserInput(input, availableAgents);
        const layouted = getLayoutedElements(parsedData.nodes, parsedData.edges);
        
        setNodes(layouted.nodes);
        setEdges(layouted.edges);
        setFlowchartTitle(parsedData.title || 'Workflow Flowchart');

    } catch (e: any) {
        console.error("Error generating flowchart:", e);
        setError("Failed to generate flowchart. Please check the input and try again.");
    } finally {
        setIsGenerating(false);
    }
  }, [input, availableAgents, setNodes, setEdges]);

  const toggleFullScreen = () => {
    if (!flowchartContainerRef.current) return;

    if (!document.fullscreenElement) {
        flowchartContainerRef.current.requestFullscreen().catch(err => {
            toast.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
        setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  useEffect(() => {
    generateFlowchart();
  }, [input, generateFlowchart]);

  const downloadImage = () => {
    const pane = document.querySelector('.react-flow__viewport');
    if (!pane) {
        toast.error('Could not find flowchart to download.');
        return;
    }
    toPng(pane as HTMLElement, {
        filter: (node: HTMLElement) => node.tagName !== 'button',
        backgroundColor: '#f8fafc', // bg-slate-50
    })
    .then((dataUrl: string) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = 'flowchart.png';
        a.click();
        toast.success('Flowchart downloaded as PNG!');
    })
    .catch((err: Error) => {
        toast.error('Failed to download flowchart image.');
        console.error(err);
    });
  };

  if (!input.trim()) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="text-center">
          <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>Enter a prompt to generate an interactive flowchart.</p>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-400 to-blue-500 rounded-full flex items-center justify-center">
              <GitBranch className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{flowchartTitle}</h3>
              <p className="text-sm text-gray-500">
                Generated from your prompt. You can pan, zoom, and drag nodes.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
                onClick={downloadImage}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="Download as PNG"
            >
                <Download className="w-4 h-4" />
            </button>
            <button
                onClick={toggleFullScreen}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title={isFullScreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
                {isFullScreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <motion.div
            ref={flowchartContainerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-[75vh] bg-slate-50 border rounded-lg"
        >
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                fitView
                attributionPosition="top-right"
            >
                <Controls />
                <Background color="#aaa" gap={16} />
            </ReactFlow>
        </motion.div>
    </div>
  );
}

// Helper functions to parse input and create nodes/edges
const parseUserInput = (text: string, availableAgents: Agent[]) => {
    const mentionedAgents = new Set<string>();
    const agentMatches = text.match(/@(\w+)/g);
    
    if (agentMatches) {
      agentMatches.forEach(match => {
        const agentName = match.substring(1);
        const agent = availableAgents.find(a => a.name.toLowerCase() === agentName.toLowerCase());
        if (agent) mentionedAgents.add(agent.name);
      });
    }

    const nodes = [];
    const edges = [];
    let nodeCounter = 1;

    // Start Node
    nodes.push({ id: 'START', type: 'input', data: { label: 'User prompt' }, position: { x: 0, y: 0 }, sourcePosition: Position.Bottom });

    // Orchestrator Node
    nodes.push({
      id: 'ALFA',
      data: { label: '🧠 LLM' },
      position: { x: 0, y: 0 },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      style: {
        backgroundColor: '#f5f3ff', // violet-100
        borderColor: '#8b5cf6', // violet-500
        borderWidth: 2,
      }
    });
    edges.push({ id: 'e-start-alfa', source: 'START', target: 'ALFA', label: 'Analyzes Request', markerEnd: { type: MarkerType.ArrowClosed } });

    let lastNodeId = 'ALFA';

    const agentList = mentionedAgents.size > 0 ? Array.from(mentionedAgents) : inferAgentsFromText(text);

    agentList.forEach(agentNameOrType => {
        const agent = availableAgents.find(a => a.name === agentNameOrType);
        const agentId = `AGENT_${nodeCounter++}`;
        const label = agent ? `${getAgentIcon(agent.providerType)} ${agent.name}` : `${getAgentIcon(agentNameOrType)} ${agentNameOrType}`;
        
        nodes.push({
          id: agentId,
          type: 'agent',
          data: { label },
          position: { x: 0, y: 0 },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
          style: {
            backgroundColor: '#eff6ff', // blue-100
            borderColor: '#3b82f6', // blue-500
            borderWidth: 2,
          }
        });
        edges.push({ id: `e-alfa-${agentId}`, source: 'ALFA', target: agentId, markerEnd: { type: MarkerType.ArrowClosed } });
        edges.push({ id: `e-${agentId}-alfa`, source: agentId, target: 'ALFA', animated: true, markerEnd: { type: MarkerType.ArrowClosed } });
    });

    if (hasConditionalLogic(text)) {
        const decisionId = `DECISION_${nodeCounter++}`;
        nodes.push({ id: decisionId, type: 'default', data: { label: 'Evaluate Results' }, position: { x: 0, y: 0 }, sourcePosition: Position.Bottom, targetPosition: Position.Top });
        edges.push({ id: `e-${lastNodeId}-${decisionId}`, source: lastNodeId, target: decisionId, label: 'Checks Completion', markerEnd: { type: MarkerType.ArrowClosed } });
        lastNodeId = decisionId;
    }
    
    // End Node
    nodes.push({ id: 'FINAL_RESPONSE', type: 'output', data: { label: 'Response to User' }, position: { x: 0, y: 0 }, targetPosition: Position.Top });
    edges.push({ id: `e-${lastNodeId}-end`, source: lastNodeId, target: 'FINAL_RESPONSE', label: 'Generates Final Output', markerEnd: { type: MarkerType.ArrowClosed } });

    const firstLine = text.split('\\n')[0];
    const title = `Workflow for: "${firstLine.substring(0, 50)}${firstLine.length > 50 ? '...' : ''}"`;
    
    return { nodes, edges, title };
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