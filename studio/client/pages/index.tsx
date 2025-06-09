import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { MessageCircle, Settings, Plus, Users, Menu, X, FileText } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import AgentManagement from '@/components/AgentManagement';
import Logo from '@/components/Logo';
import { useSocket } from '@/hooks/useSocket';
import WorkflowManagement from '../components/WorkflowManagement';

type TabType = 'chat' | 'agents' | 'mcp' | 'workflows';
export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { socket, isConnected } = useSocket();

  // Handle conversation selection - convert empty string to null for consistency
  const handleConversationSelect = (id: string) => {
    setCurrentConversationId(id || null);
  };



  return (
    <>
      <Head>
        <title>Studio</title>
        <meta name="description" content="Multi-agent AI chatbot platform with MCP integration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="h-screen bg-gray-50 flex overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center space-x-3 text-left"
          >
            <Logo size="md" />
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Studio
              </span>
            </h1>
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Sidebar */}
        <div className={`${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-40 w-64 bg-white shadow-lg flex flex-col transition-transform duration-300 ease-in-out md:shadow-lg`}>
          {/* Header - Hidden on mobile (shown in mobile header) */}
          <div className="hidden md:block p-6 border-b border-gray-200">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-3 text-left w-full"
            >
              <Logo size="lg" />
              <h1 className="text-3xl font-bold text-gray-900">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Studio
                </span>
              </h1>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 mt-16 md:mt-0">
            <button
              onClick={() => {
                setActiveTab('chat');
                setIsMobileMenuOpen(false); // Close mobile menu
              }}
              className={`sidebar-item w-full ${
                activeTab === 'chat' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <MessageCircle className="w-5 h-5 mr-3" />
              Chat
            </button>
            
            <button
              onClick={() => {
                setActiveTab('agents');
                setIsMobileMenuOpen(false); // Close mobile menu
              }}
              className={`sidebar-item w-full ${
                activeTab === 'agents' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <Users className="w-5 h-5 mr-3" />
              Agents
            </button>
            
            <button
              onClick={() => {
                setActiveTab('mcp');
                setIsMobileMenuOpen(false); // Close mobile menu
              }}
              className={`sidebar-item w-full ${
                activeTab === 'mcp' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <Settings className="w-5 h-5 mr-3" />
              MCP Servers
            </button>
            
            <button
              onClick={() => {
                setActiveTab('workflows');
                setIsMobileMenuOpen(false);
              }}
              className={`sidebar-item w-full ${
                activeTab === 'workflows' ? 'sidebar-item-active' : 'sidebar-item-inactive'
              }`}
            >
              <FileText className="w-5 h-5 mr-3" />
              Workflows
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

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex pt-16 md:pt-0 ml-0 md:ml-0">
          {activeTab === 'chat' && (
            <div className="flex-1 min-w-0 relative">
              <ChatInterface
                conversationId={currentConversationId}
                onConversationSelect={handleConversationSelect}
                socket={socket}
              />
            </div>
          )}

          {activeTab === 'agents' && (
            <div className="flex-1 min-w-0">
              <AgentManagement />
            </div>
          )}

          {activeTab === 'mcp' && (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="text-center">
                  <Settings className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">MCP Server Management</h2>
                  <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 px-4">
                    Configure and manage Model Context Protocol servers for your agents.
                  </p>
                  <button className="btn-primary text-sm sm:text-base">
                    <Plus className="w-4 h-4 mr-2" />
                    Add MCP Server
                  </button>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'workflows' && (
            <div className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
              <WorkflowManagement />
            </div>
          )}
        </div>
      </div>
    </>
  );
} 