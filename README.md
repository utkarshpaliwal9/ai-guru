# ai-guru

A Chrome extension that allows you to chat with AI about webpage content, with support for custom AI agents.

## Features

- Chat with AI about the current webpage content
- Extract and analyze images from webpages
- Agent mode for webpage modifications
- Custom AI agents with `@agent` syntax
- Multi-tab conversations
- Resizable popup interface

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

### Using Agents in Chat

Use the `@agentName` syntax followed by your request:

```
@Chrome fill the form on this page based on what you know about me
@DocumentIntelligence fetch the old rates for the source that this webpage is talking about
@DataAnalyst analyze the financial data shown in this table
```

The agent will receive the webpage content and respond according to its specialized capabilities.

## Regular Usage

Without the `@agent` syntax, messages are sent to the default Alfa API configured in the options.

## Agent Mode

Toggle "Agent mode" to enable webpage modification capabilities through the default agent.