import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { MessageCircle, Settings, Plus, Users } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import AgentManagement from '@/components/AgentManagement';
import ConversationList from '@/components/ConversationList';
import { useSocket } from '@/hooks/useSocket';

type TabType = 'chat' | 'agents' | 'mcp';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();

  // Handle conversation selection - convert empty string to null for consistency
  const handleConversationSelect = (id: string) => {
    setCurrentConversationId(id || null);
  };

  return (
    <>
      <Head>
        <title>Agentic AI Chatbot Platform</title>
        <meta name="description" content="Multi-agent AI chatbot platform with MCP integration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="h-screen bg-gray-50 flex">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-lg flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">AI Guru</h1>
                <p className="text-sm text-gray-500">Agentic Platform</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            <button
              onClick={() => setActiveTab('chat')}
              className={`sidebar-item w-full ${
                activeTab === 'chat' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              Chat
            </button>
            
            <button
              onClick={() => setActiveTab('agents')}
              className={`sidebar-item w-full ${
                activeTab === 'agents' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Agents
            </button>
            
            <button
              onClick={() => setActiveTab('mcp')}
              className={`sidebar-item w-full ${
                activeTab === 'mcp' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <Settings className="w-5 h-5 mr-3" />
              MCP Servers
            </button>
          </nav>

          {/* Connection Status */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {activeTab === 'chat' && (
            <>
              {/* Conversation List */}
              <div className="w-80 bg-white border-r border-gray-200">
                <ConversationList
                  currentConversationId={currentConversationId}
                  onConversationSelect={handleConversationSelect}
                />
              </div>
              
              {/* Chat Interface */}
              <div className="flex-1">
                <ChatInterface
                  conversationId={currentConversationId}
                  socket={socket}
                />
              </div>
            </>
          )}

          {activeTab === 'agents' && (
            <div className="flex-1">
              <AgentManagement />
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="flex-1 p-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="text-center">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">MCP Server Management</h2>
                  <p className="text-gray-600 mb-8">
                    Configure and manage Model Context Protocol servers for your agents.
                  </p>
                  <button className="btn-primary">
                    <Plus className="w-4 h-4 mr-2" />
                    Add MCP Server
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </>
  );
} 