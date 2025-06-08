import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, AlertCircle, Clock, Copy, Check, GitBranch } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { toast } from 'react-hot-toast';

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

interface MessageBubbleProps {
  message: Message;
  onGenerateFlowchart?: (content: string) => void;
}

export default function MessageBubble({ message, onGenerateFlowchart }: MessageBubbleProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const isUser = message.type === 'user';
  const isAgent = message.type === 'agent';

  // Custom components for ReactMarkdown
  const markdownComponents = {
    // Code blocks with syntax highlighting and copy button
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      const codeContent = String(children).replace(/\n$/, '');
      
      if (!inline && match) {
        return (
          <div className="relative group">
            <button
              onClick={() => copyToClipboard(codeContent)}
              className={`absolute top-2 right-2 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                isUser 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white' 
                  : 'bg-gray-700 hover:bg-gray-600 text-white'
              }`}
              title="Copy code"
            >
              <Copy className="w-3 h-3" />
            </button>
            <SyntaxHighlighter
              style={isUser ? oneDark : oneLight}
              language={match[1]}
              PreTag="div"
              className="rounded-lg text-sm"
              customStyle={{
                margin: 0,
                borderRadius: '0.5rem',
                backgroundColor: isUser ? '#1e293b' : '#f8fafc'
              }}
              {...props}
            >
              {codeContent}
            </SyntaxHighlighter>
          </div>
        );
      }
      
      // Inline code
      return (
        <code 
          className={`px-1.5 py-0.5 rounded text-sm font-mono ${
            isUser 
              ? 'bg-blue-600 bg-opacity-30 text-blue-100' 
              : 'bg-gray-100 text-red-600'
          }`}
          {...props}
        >
          {children}
        </code>
      );
    },
    
    // Paragraphs with proper spacing
    p({ children }: any) {
      return <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>;
    },
    
    // Bold text
    strong({ children }: any) {
      return <strong className="font-semibold">{children}</strong>;
    },
    
    // Italic text
    em({ children }: any) {
      return <em className="italic">{children}</em>;
    },
    
    // Unordered lists
    ul({ children }: any) {
      return <ul className="list-disc list-inside mb-2 space-y-1 ml-2">{children}</ul>;
    },
    
    // Ordered lists
    ol({ children }: any) {
      return <ol className="list-decimal list-inside mb-2 space-y-1 ml-2">{children}</ol>;
    },
    
    // List items
    li({ children }: any) {
      return <li className="leading-relaxed">{children}</li>;
    },
    
    // Headings
    h1({ children }: any) {
      return <h1 className="text-xl font-bold mb-2 mt-3 first:mt-0">{children}</h1>;
    },
    h2({ children }: any) {
      return <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h2>;
    },
    h3({ children }: any) {
      return <h3 className="text-base font-semibold mb-2 mt-2 first:mt-0">{children}</h3>;
    },
    
    // Links
    a({ href, children }: any) {
      return (
        <a 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          {children}
        </a>
      );
    },
    
    // Blockquotes
    blockquote({ children }: any) {
      return (
        <blockquote className="border-l-4 border-gray-300 pl-4 py-2 mb-2 italic bg-gray-50 rounded-r">
          {children}
        </blockquote>
      );
    },
    
    // Horizontal rules
    hr() {
      return <hr className="my-4 border-gray-300" />;
    },
    
    // Tables
    table({ children }: any) {
      return (
        <div className="overflow-x-auto mb-2">
          <table className="min-w-full border-collapse border border-gray-300 text-sm">
            {children}
          </table>
        </div>
      );
    },
    
    th({ children }: any) {
      return (
        <th className="border border-gray-300 px-3 py-2 bg-gray-100 font-semibold text-left">
          {children}
        </th>
      );
    },
    
    td({ children }: any) {
      return (
        <td className="border border-gray-300 px-3 py-2">
          {children}
        </td>
      );
    },
    
    // Strikethrough text (from remark-gfm)
    del({ children }: any) {
      return <del className="line-through opacity-75">{children}</del>;
    },
    
    // Task list items (checkboxes)
    input({ type, checked, ...props }: any) {
      if (type === 'checkbox') {
        return (
          <span className="inline-flex items-center mr-2">
            {checked ? (
              <div className="w-4 h-4 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            ) : (
              <div className="w-4 h-4 rounded border-2 border-gray-400 bg-white"></div>
            )}
          </span>
        );
      }
      return <input type={type} checked={checked} {...props} />;
    }
  };

  if (message.type === 'system') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex justify-center my-4"
      >
        <div className="system-message px-3 py-1 rounded-full">
          <Clock className="w-3 h-3 inline mr-1" />
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {/* Avatar for agent messages */}
      {isAgent && (
        <div className="mr-3 mt-1 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
      
      <div className={`max-w-xs sm:max-w-sm lg:max-w-lg xl:max-w-xl rounded-lg overflow-hidden ${
        isUser 
          ? 'bg-blue-500 text-white' 
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        <div className="relative">
          {/* Flowchart trigger button for user messages */}
          {isUser && onGenerateFlowchart && (
            <button
              onClick={e => { e.stopPropagation(); onGenerateFlowchart(message.content); }}
              className="absolute top-2 right-2 p-1 bg-purple-600 hover:bg-purple-500 text-white rounded-full"
              title="Generate flowchart"
            >
              <GitBranch className="w-4 h-4" />
            </button>
          )}
          {/* Message header */}
          <div className={`px-3 sm:px-4 pt-2 pb-1 border-b ${
            isUser 
              ? 'border-blue-400 border-opacity-30' 
              : 'border-gray-100'
          }`}>
            <div className={`text-xs font-medium ${
              isUser ? 'text-blue-100' : 'text-gray-600'
            }`}>
              {isUser ? 'You' : message.sender || 'AI Assistant'}
            </div>
          </div>
          
          {/* Message content with Markdown rendering */}
          <div className={`px-3 sm:px-4 py-2 ${
            isUser ? 'text-white' : 'text-gray-900'
          }`}>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
                className={isUser ? 'markdown-user' : 'markdown-agent'}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          </div>
          
          {/* Timestamp */}
          <div className={`px-3 sm:px-4 pb-2 text-xs ${
            isUser ? 'text-blue-100' : 'text-gray-400'
          }`}>
            {formatTimestamp(message.timestamp)}
          </div>
        </div>
      </div>
      
      {/* Avatar for user messages */}
      {isUser && (
        <div className="ml-3 mt-1 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
            <User className="w-5 h-5 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
} 