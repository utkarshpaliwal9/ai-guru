import React from 'react';
import { Bot } from 'lucide-react';

interface TypingIndicatorProps {
  agentName: string;
}

export default function TypingIndicator({ agentName }: TypingIndicatorProps) {
  return (
    <div className="flex justify-start mb-4 items-center">
      <div className="mr-3 flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="bg-gray-100 px-4 py-2 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">{agentName} is typing</span>
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
            <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          </div>
        </div>
      </div>
    </div>
  );
} 