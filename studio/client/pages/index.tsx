import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { MessageCircle, Settings, Plus, Users, Menu, X } from 'lucide-react';
import ChatInterface from '@/components/ChatInterface';
import AgentManagement from '@/components/AgentManagement';
import ConversationList from '@/components/ConversationList';
import { useSocket } from '@/hooks/useSocket';

type TabType = 'chat' | 'agents' | 'mcp';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileChatListOpen, setIsMobileChatListOpen] = useState(false);
  const { socket, isConnected } = useSocket();

  // Handle conversation selection - convert empty string to null for consistency
  const handleConversationSelect = (id: string) => {
    setCurrentConversationId(id || null);
    setIsMobileChatListOpen(false); // Close mobile chat list when conversation is selected
  };

  return (
    <>
      <Head>
        <title>Agentic AI Chatbot Platform</title>
        <meta name="description" content="Multi-agent AI chatbot platform with MCP integration" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="h-screen bg-gray-50 flex overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">AI Guru</h1>
            </div>
          </div>
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
          <nav className="flex-1 p-4 space-y-2 mt-16 md:mt-0">
            <button
              onClick={() => {
                setActiveTab('chat');
                // On desktop, toggle sidebar. On mobile, toggle chat list
                if (window.innerWidth >= 1024) {
                  setIsChatSidebarCollapsed(!isChatSidebarCollapsed);
                } else {
                  setIsMobileChatListOpen(!isMobileChatListOpen);
                }
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

        {/* Mobile Chat List Overlay */}
        {activeTab === 'chat' && isMobileChatListOpen && (
          <>
            <div 
              className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setIsMobileChatListOpen(false)}
            />
            <div className="lg:hidden fixed top-16 left-0 bottom-0 w-80 bg-white z-50 shadow-xl transform transition-transform duration-300 ease-in-out">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Conversations</h2>
                <button
                  onClick={() => setIsMobileChatListOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="h-full pb-20">
                <ConversationList
                  currentConversationId={currentConversationId}
                  onConversationSelect={handleConversationSelect}
                />
              </div>
            </div>
          </>
        )}

        {/* Main Content */}
        <div className="flex-1 flex pt-16 md:pt-0 ml-0 md:ml-0">
          {activeTab === 'chat' && (
            <>
              {/* Conversation List - Desktop Only */}
              {!isChatSidebarCollapsed && (
                <div className="hidden lg:block w-80 xl:w-96 bg-white border-r border-gray-200">
                  <ConversationList
                    currentConversationId={currentConversationId}
                    onConversationSelect={handleConversationSelect}
                  />
                </div>
              )}
              
              {/* Chat Interface */}
              <div className="flex-1 min-w-0 relative">
                <ChatInterface
                  conversationId={currentConversationId}
                  socket={socket}
                />
                
                {/* Mobile Floating Action Buttons */}
                <div className="lg:hidden fixed bottom-4 right-4 flex flex-col space-y-3 z-30">
                  {/* New Chat Button */}
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({
                            title: `Chat ${new Date().toLocaleDateString()}`,
                            agents: []
                          }),
                        });

                        if (response.ok) {
                          const newConversation = await response.json();
                          handleConversationSelect(newConversation.id);
                          setIsMobileChatListOpen(false);
                        }
                      } catch (error) {
                        console.error('Error creating conversation:', error);
                      }
                    }}
                    className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                    title="New Chat"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                  
                  {/* Chat List Button */}
                  <button
                    onClick={() => setIsMobileChatListOpen(!isMobileChatListOpen)}
                    className="w-14 h-14 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                    title="Chat List"
                  >
                    <MessageCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </>
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
        </div>
      </div>
    </>
  );
} 