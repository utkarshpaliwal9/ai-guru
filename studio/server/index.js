import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import conversationRoutes from './routes/conversations.js';
import agentsRoutes from './routes/agents.js';
import mcpRoutes from './routes/mcp.js';
import { initializeStorage } from './utils/storage.js';
import { handleSocketConnection } from './services/socketService.js';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Initialize file system storage
await initializeStorage();

// Routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/mcp', mcpRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Agentic Chatbot Server is running' });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  handleSocketConnection(socket, io);
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 Socket.IO server ready for connections`);
}); 