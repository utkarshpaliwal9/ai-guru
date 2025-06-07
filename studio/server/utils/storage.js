import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.join(process.cwd(), 'data');
const CONVERSATIONS_DIR = path.join(DATA_DIR, 'conversations');
const AGENTS_DIR = path.join(DATA_DIR, 'agents');
const MCP_DIR = path.join(DATA_DIR, 'mcp');

export async function initializeStorage() {
  try {
    await fs.ensureDir(DATA_DIR);
    await fs.ensureDir(CONVERSATIONS_DIR);
    await fs.ensureDir(AGENTS_DIR);
    await fs.ensureDir(MCP_DIR);
    console.log('📁 Storage directories initialized');
  } catch (error) {
    console.error('❌ Error initializing storage:', error);
  }
}

// Conversation storage
export async function saveConversation(conversation) {
  try {
    const filePath = path.join(CONVERSATIONS_DIR, `${conversation.id}.json`);
    await fs.writeJson(filePath, conversation, { spaces: 2 });
    return conversation;
  } catch (error) {
    console.error('❌ Error saving conversation:', error);
    throw error;
  }
}

export async function getConversation(conversationId) {
  try {
    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading conversation:', error);
    return null;
  }
}

export async function getAllConversations() {
  try {
    const files = await fs.readdir(CONVERSATIONS_DIR);
    const conversations = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const conversation = await fs.readJson(path.join(CONVERSATIONS_DIR, file));
        conversations.push(conversation);
      }
    }
    
    return conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (error) {
    console.error('❌ Error loading conversations:', error);
    return [];
  }
}

export async function deleteConversation(conversationId) {
  try {
    const filePath = path.join(CONVERSATIONS_DIR, `${conversationId}.json`);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting conversation:', error);
    return false;
  }
}

// Agent storage
export async function saveAgent(agent) {
  try {
    if (!agent.id) {
      agent.id = uuidv4();
    }
    agent.updatedAt = new Date().toISOString();
    
    const filePath = path.join(AGENTS_DIR, `${agent.id}.json`);
    await fs.writeJson(filePath, agent, { spaces: 2 });
    return agent;
  } catch (error) {
    console.error('❌ Error saving agent:', error);
    throw error;
  }
}

export async function getAgent(agentId) {
  try {
    const filePath = path.join(AGENTS_DIR, `${agentId}.json`);
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading agent:', error);
    return null;
  }
}

export async function getAllAgents() {
  try {
    const files = await fs.readdir(AGENTS_DIR);
    const agents = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const agent = await fs.readJson(path.join(AGENTS_DIR, file));
        agents.push(agent);
      }
    }
    
    return agents.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (error) {
    console.error('❌ Error loading agents:', error);
    return [];
  }
}

export async function deleteAgent(agentId) {
  try {
    const filePath = path.join(AGENTS_DIR, `${agentId}.json`);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting agent:', error);
    return false;
  }
}

// MCP Server storage
export async function saveMCPServer(mcpServer) {
  try {
    if (!mcpServer.id) {
      mcpServer.id = uuidv4();
    }
    mcpServer.updatedAt = new Date().toISOString();
    
    const filePath = path.join(MCP_DIR, `${mcpServer.id}.json`);
    await fs.writeJson(filePath, mcpServer, { spaces: 2 });
    return mcpServer;
  } catch (error) {
    console.error('❌ Error saving MCP server:', error);
    throw error;
  }
}

export async function getMCPServer(serverId) {
  try {
    const filePath = path.join(MCP_DIR, `${serverId}.json`);
    if (await fs.pathExists(filePath)) {
      return await fs.readJson(filePath);
    }
    return null;
  } catch (error) {
    console.error('❌ Error loading MCP server:', error);
    return null;
  }
}

export async function getAllMCPServers() {
  try {
    const files = await fs.readdir(MCP_DIR);
    const servers = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const server = await fs.readJson(path.join(MCP_DIR, file));
        servers.push(server);
      }
    }
    
    return servers.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch (error) {
    console.error('❌ Error loading MCP servers:', error);
    return [];
  }
}

export async function deleteMCPServer(serverId) {
  try {
    const filePath = path.join(MCP_DIR, `${serverId}.json`);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Error deleting MCP server:', error);
    return false;
  }
} 