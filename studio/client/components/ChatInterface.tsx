import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2, ChevronDown, Plus, MessageCircle, Trash2 } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import IntegratedLanding from './IntegratedLanding';

interface Message {
  id: string;
  content: string;
  sender: string;
  type: 'user' | 'agent' | 'system';
  agentId?: string;
  timestamp: string;
  isError?: boolean;
  metadata?: any;
}

interface AgentTyping {
  agentId: string;
  agentName: string;
  isTyping: boolean;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  providerType: string;
  mcpConfig?: any;
}

interface Conversation {
  id: string;
  title: string;
  agents: string[];
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

interface ChatInterfaceProps {
  conversationId: string | null;
  onConversationSelect: (id: string) => void;
  socket: Socket | null;
}

export default function ChatInterface({ conversationId, onConversationSelect, socket }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingAgents, setTypingAgents] = useState<AgentTyping[]>([]);
  const [availableAgents, setAvailableAgents] = useState<Agent[]>([]);
  const [showAgentSuggestions, setShowAgentSuggestions] = useState(false);
  const [agentSuggestions, setAgentSuggestions] = useState<Agent[]>([]);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConversationDropdown, setShowConversationDropdown] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingAgents]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowConversationDropdown(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowAgentSuggestions(false);
        setSelectedSuggestionIndex(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset selected suggestion index when suggestions change
  useEffect(() => {
    setSelectedSuggestionIndex(0);
  }, [agentSuggestions]);

  // Socket event handlers
  useEffect(() => {
    if (!socket || !conversationId) return;

    // Join the conversation room
    socket.emit('join-conversation', conversationId);

    // Listen for new messages
    const handleMessageReceived = (message: Message) => {
      setMessages(prev => [...prev, message]);
      setIsLoading(false);
    };

    // Listen for agent typing indicators
    const handleAgentTyping = (data: AgentTyping) => {
      setTypingAgents(prev => {
        const filtered = prev.filter(agent => agent.agentId !== data.agentId);
        if (data.isTyping) {
          return [...filtered, data];
        }
        return filtered;
      });
    };

    // Listen for errors
    const handleError = (error: { message: string }) => {
      toast.error(error.message);
      setIsLoading(false);
    };

    socket.on('message-received', handleMessageReceived);
    socket.on('agent-typing', handleAgentTyping);
    socket.on('error', handleError);

    // Cleanup on unmount or conversation change
    return () => {
      socket.off('message-received', handleMessageReceived);
      socket.off('agent-typing', handleAgentTyping);
      socket.off('error', handleError);
      socket.emit('leave-conversation', conversationId);
    };
  }, [socket, conversationId]);

  // Load conversation messages when conversation changes
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    // Load conversation history
    loadConversationHistory(conversationId);
  }, [conversationId]);

  // Load available agents and conversations
  useEffect(() => {
    loadAvailableAgents();
    loadConversations();
  }, []);

  const loadAvailableAgents = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`);
      if (response.ok) {
        const agents = await response.json();
        setAvailableAgents(agents.filter((agent: Agent) => agent.isActive));
      }
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations`);
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setIsLoadingConversations(false);
    }
  };

  const loadConversationHistory = async (convId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${convId}`);
      if (response.ok) {
        const conversation = await response.json();
        setMessages(conversation.messages || []);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Failed to load conversation history');
    }
  };

  const createNewConversation = async () => {
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
        setConversations(prev => [newConversation, ...prev]);
        onConversationSelect(newConversation.id);
        setShowConversationDropdown(false);
        toast.success('New conversation created');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const deleteConversation = async (conversationToDelete: string, conversationTitle: string, event: React.MouseEvent) => {
    // Prevent the click from bubbling up to the conversation selection
    event.stopPropagation();
    
    // Show confirmation dialog
    const isConfirmed = window.confirm(
      `Are you sure you want to delete "${conversationTitle}"?\n\nThis action cannot be undone and will permanently remove all messages in this conversation.`
    );
    
    if (!isConfirmed) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationToDelete}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove conversation from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationToDelete));
        
        // If the deleted conversation was currently selected, clear the selection
        if (conversationId === conversationToDelete) {
          onConversationSelect('');
        }
        
        toast.success('Conversation deleted successfully');
      } else {
        throw new Error('Failed to delete conversation');
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMessage(value);

    // Check for agent mentions
    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const afterAt = value.substring(lastAtIndex + 1);
      const spaceIndex = afterAt.indexOf(' ');
      const searchTerm = spaceIndex === -1 ? afterAt : afterAt.substring(0, spaceIndex);
      
      if (spaceIndex === -1) {
        // Show suggestions when @ is typed (even without additional characters)
        let filtered = availableAgents;
        
        if (searchTerm.length > 0) {
          // Filter by search term if provided
          filtered = availableAgents.filter(agent => 
            agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        setAgentSuggestions(filtered);
        setShowAgentSuggestions(filtered.length > 0);
        setSelectedSuggestionIndex(0);
      } else {
        setShowAgentSuggestions(false);
        setSelectedSuggestionIndex(0);
      }
    } else {
      setShowAgentSuggestions(false);
      setSelectedSuggestionIndex(0);
    }
  };

  const selectAgent = (agent: Agent) => {
    const lastAtIndex = inputMessage.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const beforeAt = inputMessage.substring(0, lastAtIndex);
      const afterAt = inputMessage.substring(lastAtIndex + 1);
      const spaceIndex = afterAt.indexOf(' ');
      const afterMention = spaceIndex === -1 ? ' ' : afterAt.substring(spaceIndex);
      
      setInputMessage(`${beforeAt}@${agent.name}${afterMention}`);
      setShowAgentSuggestions(false);
      setSelectedSuggestionIndex(0);
      
      // Set cursor position after the mention
      setTimeout(() => {
        const newPosition = beforeAt.length + agent.name.length + 2; // +2 for @ and space
        if (inputRef.current) {
          inputRef.current.setSelectionRange(newPosition, newPosition);
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !conversationId) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);
    setShowAgentSuggestions(false);

    // Send message via socket
    socket.emit('send-message', {
      conversationId,
      content: messageContent,
      sender: 'user'
    });

    // Show toast for mentioned tools
    const mentionedAgents = messageContent.match(/@(\w+)/g);
    if (mentionedAgents && mentionedAgents.length > 0) {
      toast.success(`Alfa will call ${mentionedAgents.length} tool(s): ${mentionedAgents.join(', ')}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (showAgentSuggestions && agentSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < agentSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev > 0 ? prev - 1 : agentSuggestions.length - 1
        );
        return;
      }
      
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        if (agentSuggestions[selectedSuggestionIndex]) {
          selectAgent(agentSuggestions[selectedSuggestionIndex]);
        }
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowAgentSuggestions(false);
        setSelectedSuggestionIndex(0);
        return;
      }
    }
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const highlightMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  };

  // Get current conversation details
  const currentConversation = conversations.find(conv => conv.id === conversationId);

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              {/* Conversation Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowConversationDropdown(!showConversationDropdown)}
                  className="flex items-center space-x-2 hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors w-full text-left"
                >
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                      {currentConversation ? currentConversation.title : 'Select Conversation'}
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                      {conversationId ? 'Click to switch conversations • Use @agentName to call tools' : 'Choose a conversation or create a new one'}
                    </p>
                    <p className="text-xs text-gray-500 sm:hidden">
                      {conversationId ? 'Use @agentName for tools' : 'Choose conversation'}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>

                {/* Conversation Dropdown */}
                {showConversationDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto z-20">
                    {/* New Chat Button */}
                    <button
                      onClick={createNewConversation}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 border-b border-gray-100"
                    >
                      <Plus className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-600">New Chat</span>
                    </button>

                    {/* Conversations List */}
                    {isLoadingConversations ? (
                      <div className="p-4">
                        <div className="animate-pulse space-y-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 bg-gray-200 rounded"></div>
                          ))}
                        </div>
                      </div>
                    ) : conversations.length === 0 ? (
                      <div className="p-4 text-center">
                        <MessageCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No conversations yet</p>
                      </div>
                    ) : (
                      conversations.map((conversation) => (
                        <button
                          key={conversation.id}
                          onClick={() => {
                            onConversationSelect(conversation.id);
                            setShowConversationDropdown(false);
                          }}
                          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center justify-between group ${
                            conversationId === conversation.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {conversation.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(conversation.updatedAt).toLocaleDateString()}
                            </div>
                          </div>
                          <button
                            onClick={(e) => deleteConversation(conversation.id, conversation.title, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all duration-200 ml-2"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3 h-3 text-red-500 hover:text-red-700" />
                          </button>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          {isLoading && (
            <div className="flex items-center space-x-1 sm:space-x-2 text-gray-500 flex-shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs sm:text-sm hidden sm:inline">Processing...</span>
            </div>
          )}
        </div>
      </div>

      {!conversationId ? (
        <IntegratedLanding onCreateNewChat={createNewConversation} />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 custom-scrollbar min-h-0">
            <AnimatePresence>
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <MessageBubble message={message} />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Typing Indicators */}
            {typingAgents.map((agent) => (
              <motion.div
                key={agent.agentId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <TypingIndicator agentName={agent.agentName} />
              </motion.div>
            ))}

            <div ref={messagesEndRef} />
          </div>

                     {/* Input */}
           <div className="bg-white border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
             <div className="mb-2 text-xs text-gray-500 hidden sm:block">
               Press Enter to send, Shift+Enter for new line • Type @ to mention agents • Use ↑↓ to navigate, Tab/Enter to select
             </div>
                            <div className="flex items-stretch space-x-2 sm:space-x-3">
                 <div className="flex-1 relative">
                   <input
                     ref={inputRef}
                     type="text"
                     value={inputMessage}
                     onChange={handleInputChange}
                     onKeyDown={handleKeyPress}
                     placeholder="Ask Alfa anything... Use @agentName to call specialized tools"
                     className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none box-border"
                     disabled={isLoading}
                   />
                 
                   {/* Agent Suggestions Dropdown */}
                   {showAgentSuggestions && agentSuggestions.length > 0 && (
                     <div 
                       ref={suggestionsRef}
                       className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-30"
                     >
                       <div className="py-1">
                         {agentSuggestions.map((agent, index) => (
                           <button
                             key={agent.id}
                             onClick={() => selectAgent(agent)}
                             className={`w-full px-3 py-2 text-left flex items-center space-x-3 transition-colors ${
                               index === selectedSuggestionIndex 
                                 ? 'bg-blue-50 border-l-2 border-blue-500' 
                                 : 'hover:bg-gray-50'
                             }`}
                             onMouseEnter={() => setSelectedSuggestionIndex(index)}
                           >
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                               agent.providerType === 'mcp' 
                                 ? 'bg-blue-100' 
                                 : 'bg-green-100'
                             }`}>
                               <Bot className={`w-4 h-4 ${
                                 agent.providerType === 'mcp' 
                                   ? 'text-blue-600' 
                                   : 'text-green-600'
                               }`} />
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="text-sm font-medium text-gray-900">
                                 @{agent.name}
                               </div>
                               <div className="text-xs text-gray-500 truncate">
                                 {agent.description}
                               </div>
                             </div>
                             <div className="flex-shrink-0">
                               <span className={`text-xs px-2 py-1 rounded-full ${
                                 agent.providerType === 'mcp' 
                                   ? 'bg-blue-100 text-blue-800' 
                                   : 'bg-green-100 text-green-800'
                               }`}>
                                 {agent.providerType === 'mcp' ? 'MCP' : 'API'}
                               </span>
                             </div>
                           </button>
                         ))}
                       </div>
                       
                       {/* Helpful hint */}
                       <div className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                         <div className="text-xs text-gray-500">
                           Use ↑↓ arrows to navigate • Tab or Enter to select • Esc to close
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
                 <button
                   onClick={sendMessage}
                   disabled={!inputMessage.trim() || isLoading}
                   className="btn-primary px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base border border-transparent rounded-lg disabled:opacity-50 disabled:cursor-not-allowed box-border"
                 >
                   <Send className="w-4 h-4" />
                 </button>
               </div>
           </div>
        </>
      )}
    </div>
  );
} 