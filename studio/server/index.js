import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import conversationRoutes from './routes/conversations.js';
import agentsRoutes from './routes/agents.js';
import mcpRoutes from './routes/mcp.js';
import providersRoutes from './routes/providers.js';
import orchestratorRoutes from './routes/orchestrator.js';
import { initializeStorage } from './utils/storage.js';
import { handleSocketConnection } from './services/socketService.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001"],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize file system storage
await initializeStorage();

// Routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/providers', providersRoutes);
app.use('/api/orchestrator', orchestratorRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Agentic Chatbot Server is running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      conversations: '/api/conversations',
      agents: '/api/agents',
      providers: '/api/providers',
      mcp: '/api/mcp',
      orchestrator: '/api/orchestrator'
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Agentic Chatbot Server is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id}, reason: ${reason}`);
  });
  
  socket.on('error', (error) => {
    console.error(`❌ Socket error for ${socket.id}:`, error);
  });
  
  handleSocketConnection(socket, io);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Socket.IO server ready for connections`);
  
  // Check Alfa AI configuration
  const alfaRequiredVars = ['ALFA_AUTH_TOKEN', 'ALFA_PROJECT_ID', 'ALFA_CHAT_HOST', 'ALFA_API_HOST'];
  const missingAlfaVars = alfaRequiredVars.filter(varName => !process.env[varName]);

  if (missingAlfaVars.length > 0) {
    console.warn('\n⚠️  WARNING: Alfa AI not configured!');
    console.warn('Missing environment variables:', missingAlfaVars.join(', '));
    console.warn('Chat functionality will be limited until Alfa AI is properly configured.');
    console.warn('See server/.env or documentation for setup instructions.\n');
  } else {
    console.log('✅ Alfa AI configuration detected');
    if (!process.env.ALFA_INDEX_ID) {
      console.warn('ℹ️  Note: ALFA_INDEX_ID not set - some RAG features may be limited');
    }
  }
}); 