import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Socket } from 'socket.io-client';
import { toast } from 'react-hot-toast';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';

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

interface ChatInterfaceProps {
  conversationId: string | null;
  socket: Socket | null;
}

export default function ChatInterface({ conversationId, socket }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [typingAgents, setTypingAgents] = useState<AgentTyping[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingAgents]);

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

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !conversationId) return;

    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const highlightMentions = (text: string) => {
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-4 sm:p-8 max-w-md mx-auto"
        >
          <Bot className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">No Conversation Selected</h3>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Select a conversation from the sidebar or create a new one to start chatting with Alfa AI.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 sm:p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Alfa AI Assistant</h2>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">
                Powered by Avalara's Alfa AI • Use @agentName to call specialized tools
              </p>
              <p className="text-xs text-gray-500 sm:hidden">
                Use @agentName for tools
              </p>
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
        <div className="flex items-end space-x-2 sm:space-x-3">
          <div className="flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask Alfa anything... Use @agentName to call specialized tools"
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            <div className="mt-1 sm:mt-2 text-xs text-gray-500 hidden sm:block">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
          <button
            onClick={sendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="btn-primary px-4 sm:px-6 py-2 sm:py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
} 