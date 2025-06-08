import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, MessageCircle, Trash2, Trash, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Conversation {
  id: string;
  title: string;
  agents: string[];
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

interface ConversationListProps {
  currentConversationId: string | null;
  onConversationSelect: (id: string) => void;
}

export default function ConversationList({ 
  currentConversationId, 
  onConversationSelect 
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningUp, setIsCleaningUp] = useState(false);

  useEffect(() => {
    loadConversations();
  }, []);

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
      setIsLoading(false);
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
        toast.success('New conversation created');
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
      toast.error('Failed to create conversation');
    }
  };

  const deleteConversation = async (conversationId: string, conversationTitle: string, event: React.MouseEvent) => {
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations/${conversationId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        // Remove conversation from local state
        setConversations(prev => prev.filter(conv => conv.id !== conversationId));
        
        // If the deleted conversation was currently selected, clear the selection
        if (currentConversationId === conversationId) {
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

  const cleanupEmptyConversations = async () => {
    try {
      setIsCleaningUp(true);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/conversations/cleanup/empty`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.deletedCount > 0) {
          // Reload conversations after cleanup
          await loadConversations();
          toast.success(`Deleted ${result.deletedCount} empty conversation${result.deletedCount === 1 ? '' : 's'}`);
        } else {
          toast.success('No empty conversations found');
        }
      } else {
        throw new Error('Failed to cleanup empty conversations');
      }
    } catch (error) {
      console.error('Error cleaning up conversations:', error);
      toast.error('Failed to cleanup empty conversations');
    } finally {
      setIsCleaningUp(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-3 sm:p-4">
        <div className="animate-pulse space-y-3 sm:space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 sm:h-16 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 sm:p-4 border-b border-gray-200 space-y-2">
        <button
          onClick={createNewConversation}
          className="w-full btn-primary flex items-center justify-center text-sm sm:text-base py-2 sm:py-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </button>
        
        <button
          onClick={cleanupEmptyConversations}
          disabled={isCleaningUp}
          className="w-full btn-secondary flex items-center justify-center text-xs sm:text-sm py-1.5 sm:py-1.5 text-gray-600"
        >
          {isCleaningUp ? (
            <>
              <Loader className="w-3 h-3 mr-2 animate-spin" />
              Cleaning up...
            </>
          ) : (
            <>
              <Trash className="w-3 h-3 mr-2" />
              Delete Empty Conversations
            </>
          )}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <MessageCircle className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-xs sm:text-sm">No conversations yet</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {conversations.map((conversation) => (
              <motion.div
                key={conversation.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => onConversationSelect(conversation.id)}
                className={`group relative p-2 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conversation.id
                    ? 'bg-primary-50 border border-primary-200'
                    : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-gray-900 truncate pr-6 sm:pr-8">
                      {conversation.title}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(conversation.updatedAt).toLocaleDateString()}
                      {(!conversation.messages || conversation.messages.length === 0) && (
                        <span className="ml-2 text-xs text-gray-400">(empty)</span>
                      )}
                    </p>
                  </div>
                  
                  <button
                    onClick={(e) => deleteConversation(conversation.id, conversation.title, e)}
                    className="absolute top-2 right-2 sm:top-3 sm:right-3 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-100 rounded transition-all duration-200"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3 text-red-500 hover:text-red-700" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}