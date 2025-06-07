# ai-guru

A Chrome extension that allows you to chat with AI about webpage content, with support for custom AI agents and advanced document analysis.

## Features

- **Document-Based Conversations**: Upload webpage content and images to Alfa's document service for enhanced RAG (Retrieval-Augmented Generation) analysis
- **Advanced Image Analysis**: Images are uploaded and processed through Alfa's document service for better context understanding
- **Custom AI Agents**: Use `@agent` syntax to interact with specialized AI agents
- **Agent Mode**: Enable webpage modification capabilities
- **Multi-tab Conversations**: Manage multiple chat sessions simultaneously
- **Resizable Interface**: Customizable popup size for better user experience

## How It Works

### Document Service Integration

The extension now uses Alfa's advanced document service workflow:

1. **Content Upload**: Webpage text content is uploaded to a temporary index
2. **Image Processing**: Images from the webpage are uploaded and processed for visual analysis
3. **RAG Context**: The system uses Retrieval-Augmented Generation to find relevant content
4. **Intelligent Responses**: AI responses are based on the uploaded document context for more accurate analysis

This approach provides significantly better understanding of:
- Complex webpage layouts and content relationships
- Image content and visual elements
- Document structure and context
- Multi-modal information (text + images)

## Setup

1. Install the extension by loading it as an unpacked extension in Chrome
2. Configure your Alfa API credentials in the extension options
3. (Optional) Add custom AI agents in the extension options

## Using Custom Agents

### Adding Agents

1. Right-click the extension icon and select "Options"
2. In the "Custom Agents" section, add:
   - **Name**: Agent identifier (e.g., `Chrome`, `DocumentIntelligence`)
   - **Endpoint**: API endpoint URL (e.g., `https://api.example.com/v1/chat/completions`)
   - **API Key**: Authentication key for the agent
   - **Additional Configuration**: Custom parameters like model, temperature, headers

### Using Agents in Chat

Use the `@agentName` syntax followed by your request:

```
@Chrome fill the form on this page based on what you know about me
@DocumentIntelligence fetch the old rates for the source that this webpage is talking about
@DataAnalyst analyze the financial data shown in this table
```

The agent will receive the webpage content and respond according to its specialized capabilities.

## Regular Usage

Without the `@agent` syntax, messages are processed through Alfa's document service:

- Webpage content is automatically uploaded and indexed
- Images are processed and made available for analysis
- RAG context provides enhanced understanding
- Responses are more accurate and contextually aware

## Agent Mode

Toggle "Agent mode" to enable webpage modification capabilities through the default agent.

## Advanced Features

- **Automatic Cleanup**: Temporary indexes are automatically cleaned up after 5 minutes
- **Fallback Handling**: If document service fails, the extension falls back to direct API calls
- **Error Recovery**: Robust error handling for network issues and API failures
- **Performance Optimization**: Limits image uploads to 5 per session for optimal performance