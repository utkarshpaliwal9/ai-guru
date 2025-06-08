# MCP (Model Context Protocol) Integration Guide

## Overview

The AI Guru platform now supports Model Context Protocol (MCP) integration, allowing you to connect specialized agents that can perform specific tasks through standardized protocols.

## Features

### 1. Agent Management with MCP Support
- **Upload MCP Configuration**: Upload JSON configuration files to define MCP-based agents
- **CRUD Operations**: Create, read, update, and delete agents with full MCP support
- **Connection Testing**: Test MCP connections before deploying agents
- **Mixed Agent Types**: Support both traditional API-based agents and MCP agents

### 2. Chat Integration
- **@mention Syntax**: Mention agents in chat using `@agentname` syntax
- **Auto-completion**: Type `@` to see available agents with descriptions
- **Real-time Communication**: Agents respond in real-time through MCP protocol
- **Context Passing**: Conversation history and context are passed to agents

### 3. MCP Configuration Support
- **Stdio Transport**: Support for command-line MCP servers
- **HTTP Transport**: Support for web-based MCP servers (planned)
- **Environment Variables**: Configure agent environments
- **Capability Discovery**: Automatic discovery of agent tools and capabilities

## Getting Started

### 1. Install MCP SDK (Optional)
```bash
cd server
npm install @modelcontextprotocol/sdk
```

### 2. Create an MCP Agent

1. Navigate to the **Agents** tab in the application
2. Click **Create Agent**
3. Fill in the basic information:
   - **Agent Name**: A unique name for your agent
   - **Description**: What the agent does
4. Upload an MCP configuration file (see example below)
5. Click **Create Agent**

### 3. Example MCP Configuration

Create a JSON file with your MCP server configuration:

```json
{
  "name": "filesystem-agent",
  "description": "An agent that can interact with the file system",
  "command": "npx",
  "args": [
    "@modelcontextprotocol/server-filesystem",
    "/path/to/allowed/directory"
  ],
  "env": {
    "NODE_ENV": "production"
  },
  "capabilities": [
    "read_file",
    "write_file",
    "list_directory",
    "create_directory"
  ],
  "transport": "stdio"
}
```

### 4. Using Agents in Chat

1. Go to the **Chat** tab
2. Start a conversation
3. Type `@` to see available agents
4. Select an agent or type `@agentname` followed by your request
5. The agent will process your request and respond

## MCP Configuration Reference

### Required Fields
- `name`: Agent identifier
- `command`: Executable command for the MCP server
- `transport`: Transport type ("stdio" or "http")

### Optional Fields
- `description`: Human-readable description
- `args`: Command line arguments array
- `env`: Environment variables object
- `capabilities`: Array of supported capabilities
- `cwd`: Working directory for the command

### Transport Types

#### Stdio Transport
```json
{
  "transport": "stdio",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-filesystem", "/path"]
}
```

#### HTTP Transport (Planned)
```json
{
  "transport": "http",
  "endpoint": "http://localhost:8000/mcp"
}
```

## Available MCP Servers

### Official MCP Servers
- `@modelcontextprotocol/server-filesystem`: File system operations
- `@modelcontextprotocol/server-git`: Git repository operations
- `@modelcontextprotocol/server-sqlite`: SQLite database operations
- `@modelcontextprotocol/server-brave-search`: Web search capabilities

### Installation Example
```bash
npm install -g @modelcontextprotocol/server-filesystem
```

## Troubleshooting

### Common Issues

1. **MCP SDK Not Available**
   - Install the MCP SDK: `npm install @modelcontextprotocol/sdk`
   - Restart the server

2. **Agent Connection Failed**
   - Check that the MCP server is installed
   - Verify the command path and arguments
   - Test the connection using the test button

3. **Agent Not Responding**
   - Check server logs for error messages
   - Verify the agent is active
   - Ensure the MCP server supports the requested operation

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=mcp:* npm run dev
```

## Security Considerations

- **File System Access**: Be careful with filesystem agents - only grant access to necessary directories
- **Command Execution**: MCP servers can execute commands - only use trusted servers
- **Environment Variables**: Don't include sensitive data in MCP configurations
- **Network Access**: HTTP-based MCP servers should use HTTPS in production

## Best Practices

1. **Agent Naming**: Use descriptive, unique names for agents
2. **Capability Documentation**: Document what each agent can do
3. **Error Handling**: Agents should handle errors gracefully
4. **Resource Management**: Monitor resource usage of MCP servers
5. **Testing**: Always test agent connections before deployment

## Examples

### File Management Agent
```json
{
  "name": "filemanager",
  "description": "Manages files and directories",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-filesystem", "/home/user/documents"],
  "transport": "stdio"
}
```

Usage: `@filemanager list all files in the current directory`

### Git Operations Agent
```json
{
  "name": "githelper",
  "description": "Performs git operations",
  "command": "npx",
  "args": ["@modelcontextprotocol/server-git", "/path/to/repo"],
  "transport": "stdio"
}
```

Usage: `@githelper show the latest commits`

## API Reference

### Agent Endpoints
- `GET /api/agents` - List all agents
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `POST /api/agents/:id/test` - Test agent connection

### MCP-Specific Fields
When creating agents with MCP support, include:
```json
{
  "name": "agent-name",
  "description": "Agent description",
  "mcpConfig": { /* MCP configuration object */ },
  "providerType": "mcp"
}
```

## Contributing

To add support for new MCP servers or improve the integration:

1. Fork the repository
2. Add your MCP server configuration examples
3. Update documentation
4. Submit a pull request

## Support

For issues related to:
- **MCP Integration**: Check this guide and server logs
- **Specific MCP Servers**: Refer to the server's documentation
- **Platform Issues**: Create an issue in the repository

## Future Enhancements

- HTTP transport support
- Visual MCP server configuration builder
- Agent marketplace
- Advanced capability discovery
- Performance monitoring
- Agent composition and workflows 