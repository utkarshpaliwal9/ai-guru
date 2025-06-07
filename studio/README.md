# Agentic AI Chatbot Platform

A powerful AI chatbot platform powered by **Avalara's Alfa AI** with specialized agent tools integration, built with Next.js, React, Node.js, and Socket.IO.

![Agentic AI Chatbot Platform](https://img.shields.io/badge/Platform-Agentic%20AI-blue?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React%20%2B%20Next.js-blue)
![Node.js](https://img.shields.io/badge/Backend-Node.js%20%2B%20Express-green)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue)

## 🧠 How It Works

**Alfa AI** is your primary conversational assistant that can call specialized tools on demand:

1. **You** chat with **Alfa AI** (the base conversational AI)
2. **Mention tools** with `@toolName` when you need specialized help
3. **Alfa calls the tools**, gets their responses, and synthesizes them into the conversation
4. **You get** a cohesive response from Alfa that includes tool insights

**Example:**
```
You: "Hey Alfa, can you @weather check the forecast and @calendar see my meetings today?"

Alfa: "I'll check both the weather and your calendar for you!"
↳ Calls @weather tool → Gets: "Sunny, 75°F"
↳ Calls @calendar tool → Gets: "3 meetings: 9am, 1pm, 4pm"
↳ Responds: "Great news! It's sunny and 75°F today. You have 3 meetings scheduled..."
```

## ✨ Features

- **🧠 Alfa AI Base**: Powered by Avalara's enterprise Alfa AI as the primary conversational assistant
- **🛠️ Tool Integration**: Call specialized tools with `@mentions` - Alfa handles the coordination  
- **⚡ Real-time Communication**: Powered by Socket.IO for instant messaging and typing indicators
- **🔧 Tool Management**: Create, configure, and manage specialized agent tools with custom APIs
- **🎯 MCP Integration**: Support for Model Context Protocol servers (Playwright MCP, etc.)
- **🤝 Intelligent Synthesis**: Alfa combines tool responses into cohesive conversational answers
- **🎨 Beautiful UI**: Modern, responsive design with smooth animations  
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **💾 File-based Storage**: Simple filesystem storage for easy deployment
- **🔒 Secure**: API key protection and secure tool communication

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   AI Agents     │
│   (Next.js)     │◄──►│   (Express)     │◄──►│   (Custom APIs) │
│                 │    │                 │    │                 │
│ • Chat UI       │    │ • Socket.IO     │    │ • OpenAI        │
│ • Agent Mgmt    │    │ • REST API      │    │ • Claude        │
│ • MCP Config    │    │ • File Storage  │    │ • Custom LLMs   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd agentic-chatbot-platform
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Start the development servers**
   ```bash
   npm run dev
   ```

This will start:
- Backend server on `http://localhost:5000`
- Frontend application on `http://localhost:3000`

## 🎮 Usage Guide

### 1. Creating Your First Agent

1. Navigate to the **Agents** tab in the sidebar
2. Click **"Create Agent"**
3. Fill in the agent details:
   - **Name**: Choose a memorable name (e.g., "GPT-4", "CodeAssistant")
   - **API Endpoint**: Your AI service endpoint
   - **API Key**: Authentication key for the service
   - **Configuration**: Add key-value pairs for custom settings

### 2. Starting a Conversation

1. Go to the **Chat** tab
2. Click **"New Chat"** to create a conversation
3. Type your message and press Enter
4. Use `@agentName` to mention specific agents:
   ```
   @GPT-4 explain quantum computing
   @CodeAssistant write a Python function for sorting
   ```

### 3. Multi-Agent Collaboration

When you mention multiple agents:
```
@GPT-4 @Claude @CodeAssistant work together to solve this problem: 
How do I optimize a React app for performance?
```

All mentioned agents will respond and can see each other's responses, enabling collaborative problem-solving.

### 4. MCP Server Integration

1. Navigate to the **MCP Servers** tab
2. Add your MCP server configurations
3. Link agents to specific MCP servers for enhanced capabilities

## 🛠️ Configuration

### Environment Variables

**⚠️ Important: Alfa AI Configuration Required**

This platform requires **Avalara's Alfa AI** credentials to function. Without these credentials, the chat functionality will not work.

**`server/.env`** (Required):
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Alfa AI Configuration (REQUIRED)
ALFA_AUTH_TOKEN=your-auth-token-here
ALFA_PROJECT_ID=your-project-uuid-here
ALFA_CHAT_HOST=https://clip-chat-api.gamma.qa.us-west-2.aws.avalara.io
ALFA_API_HOST=https://clip-api.gamma.qa.us-west-2.aws.avalara.io
ALFA_MODEL=gpt-4o-mini
```

**`client/.env.local`**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

**🔑 Getting Alfa AI Credentials:**
1. Contact your **Avalara administrator**
2. Request access to **Alfa AI** for your project
3. Obtain the `AUTH_TOKEN` and `PROJECT_ID`
4. Update your `server/.env` file with the credentials

**⚠️ What happens without Alfa credentials:**
- Server will show warning on startup
- Chat attempts will display configuration error messages
- Agent tools management will still work (for when you get credentials)

### Agent Configuration Examples

The platform now supports a **flexible provider system** that can connect to multiple LLM types:

**Alfa (Avalara's Enterprise RAG AI)**
```json
{
  "name": "Alfa-Assistant",
  "providerType": "alfa",
  "configuration": {
    "authToken": "your-auth-token",
    "projectId": "your-project-uuid",
    "chatHost": "https://clip-chat-api.gamma.qa.us-west-2.aws.avalara.io",
    "apiHost": "https://clip-api.gamma.qa.us-west-2.aws.avalara.io",
    "model": "gpt-4o-mini",
    "indexId": "your-index-uuid",
    "ragEnabled": true
  }
}
```

**OpenAI GPT-4**
```json
{
  "name": "GPT-4",
  "providerType": "openai",
  "configuration": {
    "apiKey": "sk-...",
    "model": "gpt-4",
    "temperature": 0.7,
    "maxTokens": 2000,
    "systemPrompt": "You are a helpful assistant."
  }
}
```

**Legacy Support (Backward Compatible)**
```json
{
  "name": "Custom-Agent",
  "apiEndpoint": "https://your-custom-api.com/chat",
  "apiKey": "your-key",
  "configuration": {
    "customParam": "value"
  }
}
```

## 🏛️ Project Structure

```
agentic-chatbot-platform/
├── client/                 # Next.js frontend
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Next.js pages
│   └── styles/            # CSS and Tailwind styles
├── server/                # Express.js backend
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   ├── utils/             # Utility functions
│   └── data/              # File-based storage
├── package.json           # Root package configuration
└── README.md              # This file
```

## 🔧 Development

### Running Individual Services

**Backend only:**
```bash
cd server && npm run dev
```

**Frontend only:**
```bash
cd client && npm run dev
```

### Building for Production

```bash
# Build frontend
cd client && npm run build

# Start production server
cd server && npm start
```

## 🎨 UI Components

The platform features a modern, beautiful interface with:

- **Animated message bubbles** with typing indicators
- **Responsive layout** that works on all devices
- **Dark/light mode** support (coming soon)
- **SVG icons** from Lucide React
- **Smooth animations** powered by Framer Motion
- **Toast notifications** for user feedback

## 🔌 API Endpoints

### Conversations
- `GET /api/conversations` - List all conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get specific conversation
- `PUT /api/conversations/:id` - Update conversation
- `DELETE /api/conversations/:id` - Delete conversation

### Agents
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `GET /api/agents/:id` - Get specific agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `PATCH /api/agents/:id/toggle` - Toggle agent active status

### MCP Servers
- `GET /api/mcp` - List MCP servers
- `POST /api/mcp` - Create MCP server
- `GET /api/mcp/:id` - Get specific MCP server
- `PUT /api/mcp/:id` - Update MCP server
- `DELETE /api/mcp/:id` - Delete MCP server

### LLM Providers
- `GET /api/providers/types` - List available provider types
- `GET /api/providers/types/:type/template` - Get configuration template
- `GET /api/providers/types/:type/requirements` - Get required fields
- `POST /api/providers/validate` - Validate provider configuration
- `GET /api/providers` - List active providers
- `GET /api/providers/stats` - Get provider statistics
- `POST /api/providers/test-all` - Test all providers
- `POST /api/providers/:name/test` - Test specific provider

## 🌐 Socket.IO Events

### Client → Server
- `join-conversation` - Join a conversation room
- `leave-conversation` - Leave a conversation room
- `send-message` - Send a new message
- `typing` - Send typing indicator

### Server → Client
- `message-received` - New message in conversation
- `agent-typing` - Agent typing indicator
- `user-typing` - User typing indicator
- `error` - Error notification

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

If you encounter any issues or have questions:

1. Check the [Issues](../../issues) page
2. Create a new issue with detailed information
3. Join our [Discord community](https://discord.gg/your-invite) (coming soon)

## 🚀 Deployment

### Local Deployment
```bash
npm run build
npm start
```

### Docker Deployment (Coming Soon)
```bash
docker build -t agentic-chatbot .
docker run -p 3000:3000 -p 5000:5000 agentic-chatbot
```

## 🔌 LLM Provider System

The platform features a **flexible provider architecture** that supports multiple LLM types:

### Available Providers

- **🚀 Alfa Provider**: Avalara's enterprise RAG-based AI system
- **🤖 OpenAI Provider**: Standard OpenAI API integration
- **🔧 Custom Providers**: Extensible system for adding new LLM types

### Provider Features

- **Standardized Interface**: All providers implement the same API contract
- **Dynamic Configuration**: Hot-swap providers without restart
- **Capability Detection**: Automatic feature discovery per provider
- **Connection Testing**: Built-in health checks and validation
- **Error Handling**: Consistent error responses across providers

### Adding New Providers

```javascript
// Example: Adding a Claude provider
import { BaseLLMProvider } from './BaseLLMProvider.js';

class ClaudeProvider extends BaseLLMProvider {
  async sendMessage(message, context) {
    // Implementation here
  }
  
  async testConnection() {
    // Implementation here
  }
}

// Register with factory
providerFactory.registerProvider('claude', ClaudeProvider);
```

## 🔮 Roadmap

- [ ] **Database Integration** (PostgreSQL, MongoDB)
- [ ] **User Authentication** and multi-tenancy
- [ ] **Additional LLM Providers** (Claude, Gemini, Local LLMs)
- [ ] **Voice Chat** support
- [ ] **Mobile App** (React Native)
- [ ] **Cloud Deployment** templates
- [ ] **Advanced Analytics** and monitoring
- [ ] **Theme Customization**

---

Built with ❤️ by the AI Guru Studio team. Based on insights from [building agentic chatbots](https://medium.com/@haliterdoan/lessons-from-my-first-one-man-project-building-agentic-chatbot-with-langgraph-2ee2f65be97b) and [chatbot platform development](https://botpress.com/blog/how-to-build-your-own-ai-chatbot). 