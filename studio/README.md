# ✨ AI Studio

### Intelligent Multi-Agent Workflow Builder Platform

<p align="center">
  <img src="https://img.shields.io/badge/Platform-AI%20Studio-667eea?style=for-the-badge&logo=openai&logoColor=white" />
  <img src="https://img.shields.io/badge/React-Next.js-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-Enabled-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
</p>

---

## 🎯 TL;DR

**AI Studio** is an intelligent, conversational platform for building and orchestrating AI-powered workflows using reusable agents. 

> *Describe your business problem in natural language. The system identifies the necessary agents to fulfill each step of the task.*

Users can **export solutions as named workflows**, which are saved and shared across teams to solve higher-order problems by reusing previously solved sub-problems. An LLM-based coordinator parses prompts, selects the right agents, connects inputs/outputs, and executes tasks as a unified pipeline.

---


<p align="center">
  <img src="docs/screenshots/Screenshot 2025-07-25 at 6.58.02 PM.png" alt="Agent Configuration" width="800"/>
  <br/>
  <em>Detailed agent configuration options</em>
</p>

---

## 🧩 Core Principles

| Principle | Description |
|-----------|-------------|
| **🔗 Compositional** | Build new workflows by combining existing ones |
| **💬 Conversational** | Natural language interface to define automation tasks |
| **♻️ Reusability** | Workflows saved and reused across departments |
| **📦 Modular** | Pre-registered agents created and shared by teams |

---

## 🌟 The Big Idea

AI Studio is both an **agent orchestration engine** and a **workflow creation platform**. 

After a user submits a prompt and validates its result in the chat, they can **export the prompt as a workflow**. This workflow represents a solution to a smaller problem. Later, new users can build on these pre-created, tested workflows to solve higher-order challenges.

### Example: Research-to-Changeset Pipeline

**Pre-registered agents:**
- `@WebScrapingAgent` — Navigate and extract web data  
- `@RelevanceAgent` — Determine data relevance  
- `@FindingAgent` — Create findings in Content Studio  
- `@ExtractionAgent` — Extract updates (e.g., rate changes)  
- `@ChangesetCreationAgent` — Generate changesets for review

**User prompt:**
```
"Use @WebScrapingAgent to visit some_tax_url.com and retrieve the latest legislation. 
Then use @RelevanceAgent to filter relevant items, and if any are relevant, create 
a finding with @FindingAgent. Once the finding is created, run @ExtractionAgent to 
extract key details and generate a changeset using @ChangesetCreationAgent. 
Finally, submit it for review by a researcher."
```

**What happens:**
1. The LLM parses the prompt and identifies all mentioned agents
2. The orchestrator invokes each agent in sequence with correct inputs
3. Outputs flow automatically between agents (document refs → relevance check → finding → extraction)
4. The user exports this as `@SourcingToChangesetWorkflow`

Now **anyone** can invoke this workflow with their own inputs!

---

## 🔮 The Magic of Workflows

Workflows enable **compositional problem-solving** — build on smaller, solved sub-problems to tackle larger challenges.

### Example: Employee Onboarding Automation

**Pre-existing workflows:**
- `@EmailAccountCreation_Workflow`
- `@BankAccountRegistration_Workflow`  
- `@KT_Workflow`
- `@ManagerAssignment_Workflow`
- `@BuddyProgramRegistration_Workflow`

**User prompt:**
```
"There is a new hire named 'John Doe'. Create email account for him using 
@EmailAccountCreation_Workflow. Then use his details to create a bank account 
as per @BankAccountRegistration_Workflow. In parallel, also start the initial 
trainings using @KT_Workflow. 'Lorem Ipsum' will be his buddy, so send out 
necessary emails to him and his manager according to @BuddyProgramRegistration_Workflow."
```

Save this as `@OnboardingWorkflow` — and trigger it automatically whenever a new hire joins!

---

## 🎯 The Problem We Solve

### Current Challenge

Users struggle with **AI tool fragmentation**. They have access to powerful AI capabilities (GPT-4 for text, Playwright for web automation, specialized APIs for data processing), but **no unified way to coordinate them** for complex workflows.

### Real Impact

Teams waste hours manually:
- Switching between tools
- Copying outputs between systems
- Managing multi-step processes that should be automated

### Our Solution

> 💡 **Build on smaller, solved sub-problems to solve larger, unsolved higher-order problems**

AI Studio uses a base LLM as a central coordinator that automatically:

| Step | Action |
|------|--------|
| 1️⃣ | **Analyze** user requests to identify required tasks |
| 2️⃣ | **Select** appropriate specialized agents from the ecosystem |
| 3️⃣ | **Execute** tasks in correct sequence with proper context passing |
| 4️⃣ | **Monitor** completion and handle failures gracefully |
| 5️⃣ | **Synthesize** results into actionable insights |

---

## 🚀 Compelling Use Case

### Competitive Analysis Report

**Scenario:**  
> "Research our top 3 competitors' pricing pages, extract their pricing data, compare it with our current pricing, and generate a competitive analysis report for next week's board meeting."

### Traditional Approach

| Task | Time |
|------|------|
| ⏰ Manually visit competitor websites | 2 hours |
| ⏰ Copy pricing data to spreadsheet | 1 hour |
| ⏰ Create comparison analysis | 1 hour |
| ⏰ Format report for presentation | 1 hour |
| **Total** | **5 hours** |

### AI Studio Approach

```
🤖 LLM/AI Coordinator:
├── 🌐 @WebScrapingAgent → Navigate and extract competitor pricing data
├── 📊 @DataAnalysisAgent → Structure and compare pricing information  
├── 📝 @ReportWorkflow    → Generate executive summary with insights
└── 📧 @EmailAgent        → Format and send to stakeholders

✅ Complete workflow executed within minutes
```

The user can then **export this as a new workflow** and re-trigger it with a single click. New workflows can also be built on top of this one!

---

## 🏗️ Architecture

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│     Frontend        │    │      Backend        │    │    AI Ecosystem     │
│     (Next.js)       │◄──►│     (Express)       │◄──►│    (Agents/APIs)    │
│                     │    │                     │    │                     │
│  • Chat Interface   │    │  • Socket.IO        │    │  • OpenAI / GPT-4   │
│  • Workflow Builder │    │  • REST API         │    │  • Claude           │
│  • Agent Management │    │  • Orchestrator     │    │  • Custom LLMs      │
│  • MCP Config       │    │  • File Storage     │    │  • MCP Servers      │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
```

---

## ✨ Features

- **🧠 AI Coordinator**: Powered by enterprise-grade AI as the primary conversational assistant
- **🛠️ Tool Integration**: Call specialized tools with `@mentions` — the coordinator handles orchestration
- **⚡ Real-time Communication**: Powered by Socket.IO for instant messaging and typing indicators
- **🔧 Agent Management**: Create, configure, and manage specialized agent tools with custom APIs
- **🎯 MCP Integration**: Support for Model Context Protocol servers (Playwright MCP, etc.)
- **🤝 Intelligent Synthesis**: Combines agent responses into cohesive conversational answers
- **🎨 Beautiful UI**: Modern, responsive design with smooth animations
- **📱 Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **💾 File-based Storage**: Simple filesystem storage for easy deployment
- **🔒 Secure**: API key protection and secure agent communication

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-studio
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment variables**
   ```bash
   cp server/.env.example server/.env
   # Edit server/.env with your credentials
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

This will start:
- Backend server on `http://localhost:5001`
- Frontend application on `http://localhost:3000`

---

## ⚙️ Configuration

### Environment Variables

Create a `server/.env` file with the following configuration:

```env
# Server Configuration
PORT=5001
NODE_ENV=development
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# AI Configuration (Required)
ALFA_AUTH_TOKEN=your-auth-token-here
ALFA_PROJECT_ID=your-project-uuid-here
ALFA_CHAT_HOST=https://your-ai-chat-endpoint.com/v1/chat
ALFA_API_HOST=https://your-ai-api-endpoint.com/v1
ALFA_INDEX_ID=your-index-uuid-here
ALFA_MODEL=gpt-4o-mini
```

### Agent Configuration Examples

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

**Custom Agent**
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

---

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

When you mention multiple agents, they work together:

```
@GPT-4 @Claude @CodeAssistant work together to solve this problem: 
How do I optimize a React app for performance?
```

All mentioned agents will respond and can see each other's responses, enabling collaborative problem-solving.

### 4. Exporting Workflows

After validating a successful prompt:
1. Click **"Export as Workflow"**
2. Name your workflow (e.g., `@CompetitorAnalysis`)
3. Define input parameters
4. Share with your team!

---

## 📦 Production Deployment

### Build the Frontend

```bash
cd client
npm run build
```

### Configure Production Environment

```env
# server/.env
NODE_ENV=production
PORT=5001
CORS_ALLOWED_ORIGINS=https://your-frontend-domain.com

# AI Credentials (Required)
ALFA_AUTH_TOKEN=your-production-auth-token
ALFA_PROJECT_ID=your-production-project-id
ALFA_CHAT_HOST=https://your-ai-chat-endpoint.com/v1/chat
ALFA_API_HOST=https://your-ai-api-endpoint.com/v1
ALFA_MODEL=gpt-4o-mini
```

### Start the Server

```bash
npm start
```

---

## 🏛️ Project Structure

```
ai-studio/
├── client/                 # Next.js frontend
│   ├── components/         # React components
│   ├── hooks/             # Custom React hooks
│   ├── pages/             # Next.js pages
│   └── styles/            # CSS and Tailwind styles
├── server/                # Express.js backend
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic & orchestration
│   ├── utils/             # Utility functions
│   └── data/              # File-based storage
├── python/                # Python services (CrewAI)
│   └── crewai_service/    # CrewAI integration
├── package.json           # Root package configuration
└── README.md              # This file
```

---

## 🔌 API Reference

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/conversations` | List all conversations |
| `POST` | `/api/conversations` | Create new conversation |
| `GET` | `/api/conversations/:id` | Get specific conversation |
| `PUT` | `/api/conversations/:id` | Update conversation |
| `DELETE` | `/api/conversations/:id` | Delete conversation |

### Agents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents` | List all agents |
| `POST` | `/api/agents` | Create new agent |
| `GET` | `/api/agents/:id` | Get specific agent |
| `PUT` | `/api/agents/:id` | Update agent |
| `DELETE` | `/api/agents/:id` | Delete agent |
| `PATCH` | `/api/agents/:id/toggle` | Toggle agent status |

### Workflows
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/workflows` | List all workflows |
| `POST` | `/api/workflows` | Create new workflow |
| `POST` | `/api/workflows/:id/run` | Execute a workflow |

### MCP Servers
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/mcp` | List MCP servers |
| `POST` | `/api/mcp` | Create MCP server |
| `PUT` | `/api/mcp/:id` | Update MCP server |
| `DELETE` | `/api/mcp/:id` | Delete MCP server |

---

## 🌐 Socket.IO Events

### Client → Server
| Event | Description |
|-------|-------------|
| `join-conversation` | Join a conversation room |
| `leave-conversation` | Leave a conversation room |
| `send-message` | Send a new message |
| `typing` | Send typing indicator |

### Server → Client
| Event | Description |
|-------|-------------|
| `message-received` | New message in conversation |
| `agent-typing` | Agent typing indicator |
| `workflow-progress` | Workflow execution progress |
| `error` | Error notification |

---

## 🔌 LLM Provider System

### Available Providers

| Provider | Description |
|----------|-------------|
| 🚀 **Base Provider** | Enterprise RAG-based AI system |
| 🤖 **OpenAI Provider** | Standard OpenAI API integration |
| 🐍 **CrewAI Provider** | Multi-agent workflow execution |
| 🔧 **Custom Providers** | Extensible system for adding new LLM types |

### Adding New Providers

```javascript
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

---

## 🐍 Python CrewAI Service

For advanced multi-agent workflows, AI Studio includes a Python CrewAI service.

### Setup

```bash
cd python/crewai_service
python3 -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

### Running

```bash
uvicorn main:app --host 0.0.0.0 --port 5002 --reload
```

---

## 🔮 Roadmap

- [ ] **Database Integration** (PostgreSQL, MongoDB)
- [ ] **User Authentication** and multi-tenancy
- [ ] **Additional LLM Providers** (Claude, Gemini, Local LLMs)
- [ ] **Voice Chat** support
- [ ] **Visual Workflow Builder** (drag-and-drop)
- [ ] **Workflow Marketplace**
- [ ] **Advanced Analytics** and monitoring
- [ ] **Mobile App** (React Native)

---

## 🤝 Contributing

We welcome contributions! Please see our `CONTRIBUTING.md` for guidelines.

---

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---

<p align="center">
  <strong>AI Studio</strong> represents the future of human-AI collaboration — where complex business processes become as simple as having a conversation with an intelligent coordinator who knows exactly which experts to consult and how to get things done.
</p>

<p align="center">
  Built with ❤️ by <a href="https://github.com/utkarshpaliwal9">utkarshpaliwal9</a>
</p>
