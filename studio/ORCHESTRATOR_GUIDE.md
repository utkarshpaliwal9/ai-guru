# Orchestrator Service Guide

The new Orchestrator Service implements an intelligent task-based agent workflow where the base LLM (Alfa) analyzes user requests, determines if specialized agents are needed, and coordinates multi-step execution.

## Data Flow

```
1. User writes prompt → Base LLM (Alfa)
2. Alfa analyzes if prompt contains tasks requiring agents
3. If yes, Alfa selects appropriate agents from available list  
4. Alfa calls agents with required inputs and receives responses
5. Alfa evaluates task completion and continues with remaining tasks
6. Process repeats until all tasks are complete
```

## Key Components

### 1. OrchestratorService (`server/services/orchestratorService.js`)

The main orchestrator that coordinates the entire workflow:

- **`analyzeTaskRequirements()`** - Analyzes user messages to detect actionable tasks
- **`selectBestAgent()`** - Selects appropriate agents for specific tasks  
- **`executeTask()`** - Executes tasks with selected agents
- **`evaluateCompletion()`** - Determines if tasks are complete or what remains
- **`orchestrateWorkflow()`** - Main method that coordinates the entire process

### 2. Enhanced BaseLLMService (`server/services/baseLLMService.js`)

Updated to use the orchestrator workflow:

- **`processMessage()`** - Now uses orchestrator instead of simple @mentions
- **`buildWorkflowResponseMessage()`** - Creates enhanced responses with workflow results
- Legacy @mention methods preserved for backward compatibility

### 3. Socket Events (`server/services/socketService.js`)

Real-time feedback for workflow progress:

- **`workflow-started`** - Emitted when analysis begins
- **`workflow-completed`** - Emitted with completion status and results
- **`agent-typing`** - Shows when Alfa is processing

### 4. REST API (`server/routes/orchestrator.js`)

Endpoints for testing and managing workflows:

- **`POST /api/orchestrator/analyze-tasks`** - Test task analysis
- **`POST /api/orchestrator/continue-workflow`** - Continue incomplete workflows  
- **`GET /api/orchestrator/test`** - Test orchestrator connectivity

## Workflow Examples

### Example 1: Simple Request (No Agents Needed)

**User:** "What's the weather like today?"

**Process:**
1. Alfa analyzes: No actionable tasks detected
2. Response: Direct answer from Alfa

**Result:** `{ requiresAgents: false, reasoning: "General question - no specialized tools needed" }`

### Example 2: Task Requiring Agents

**User:** "Calculate the ROI for our Q4 campaign and send a summary email to the team"

**Process:**
1. Alfa analyzes: Detects 2 tasks
   - Calculate ROI (Finance Agent)
   - Send email (Email Agent)
2. Executes tasks in sequence
3. Evaluates completion
4. Provides synthesized response

**Result:** 
```json
{
  "requiresAgents": true,
  "taskResults": [
    {
      "task": { "description": "Calculate Q4 campaign ROI" },
      "agent": { "name": "FinanceAgent" },
      "success": true,
      "response": { "content": "ROI calculated: 15.2%" }
    },
    {
      "task": { "description": "Send summary email" },
      "agent": { "name": "EmailAgent" },  
      "success": true,
      "response": { "content": "Email sent to 5 team members" }
    }
  ],
  "isComplete": true
}
```

### Example 3: Partial Completion

**User:** "Research competitor pricing, analyze our position, and update our pricing strategy"

**Process:**
1. Task 1: Research pricing (Research Agent) ✅
2. Task 2: Analyze position (Analysis Agent) ❌ (Agent offline)
3. Task 3: Update strategy (Strategy Agent) ⏸️ (Waiting)

**Result:**
```json
{
  "isComplete": false,
  "completionPercentage": 33,
  "remainingTasks": [
    { "description": "Analyze competitive position" },
    { "description": "Update pricing strategy" }
  ]
}
```

## Task Analysis

The orchestrator uses sophisticated prompts to analyze user requests:

### Analysis Prompt Structure

```
You are a task analyzer for an AI assistant system. Your job is to analyze user messages and determine:

1. Does this message contain actionable tasks that would benefit from specialized agent assistance?
2. Which available agents (if any) would be most helpful for these tasks?
3. What specific information or context should be passed to each agent?

Available Agents:
- AgentName: Description (Capabilities: cap1, cap2)

User Message: "user input here"

Respond in JSON format:
{
  "hasActionableTasks": boolean,
  "detectedTasks": [
    {
      "description": "Brief description of the task",
      "priority": "high|medium|low", 
      "suggestedAgents": ["agent1", "agent2"],
      "context": "Specific context or parameters for the task",
      "inputs": "What information to pass to the agent"
    }
  ],
  "reasoning": "Brief explanation of your analysis"
}
```

### Completion Evaluation

```
You are evaluating whether a user's request has been fully addressed by a series of agent tasks.

Original User Request: "user request"

Task Results:
- Task: Description
  Agent: AgentName
  Status: SUCCESS/FAILED
  Result: agent response

Analyze and respond in JSON format:
{
  "isComplete": boolean,
  "completionPercentage": number (0-100),
  "remainingTasks": [...],
  "summary": "Brief summary of what was accomplished and what remains",
  "finalResponse": "User-friendly response about the completion status"
}
```

## Agent Selection Logic

Current implementation uses simple first-match selection:

1. Filter agents by suggested names from task analysis
2. Filter by active status
3. Select first available candidate

**Future Enhancements:**
- Capability scoring
- Agent load balancing
- User preference weighting
- Performance history consideration

## Configuration

### Environment Variables

The orchestrator requires Alfa AI configuration:

```bash
# Required
ALFA_AUTH_TOKEN=your-auth-token
ALFA_PROJECT_ID=your-project-id  
ALFA_CHAT_HOST=https://your-ai-chat-endpoint.com/v1/chat
ALFA_API_HOST=https://your-ai-api-endpoint.com/v1

# Optional but recommended
ALFA_INDEX_ID=your-index-id
ALFA_MODEL=gpt-4o-mini
```

### Agent Setup

Agents must be configured in the Agents tab with:

- **Name**: Unique identifier for task selection
- **Description**: Clear description of agent capabilities
- **Capabilities**: Array of capability strings
- **Active Status**: Must be enabled for orchestrator use

## Testing

### 1. Test Orchestrator Connection

```bash
curl http://localhost:5000/api/orchestrator/test
```

### 2. Test Task Analysis

```bash
curl -X POST http://localhost:5000/api/orchestrator/analyze-tasks \
  -H "Content-Type: application/json" \
  -d '{"message": "Calculate the budget for next quarter and send to finance team"}'
```

### 3. Test via Chat Interface

1. Open chat interface
2. Send message with actionable tasks
3. Monitor browser console for workflow events:
   - `workflow-started`
   - `workflow-completed`

## Socket Events

### Client-Side Listening

```javascript
socket.on('workflow-started', (data) => {
  console.log('Workflow started:', data.message);
});

socket.on('workflow-completed', (data) => {
  console.log('Workflow completed:', {
    workflowId: data.workflowId,
    isComplete: data.isComplete,
    agentsCalled: data.agentsCalled,
    completionPercentage: data.completionPercentage
  });
});
```

## Troubleshooting

### Common Issues

1. **"No active agents available"**
   - Check agents are enabled in Agents tab
   - Verify agent configurations are valid

2. **"Failed to parse task analysis response"**
   - Check Alfa AI credentials
   - Verify prompt formatting
   - Check server logs for parsing errors

3. **"Agent call failed"**
   - Test individual agent connections
   - Check agent API endpoints
   - Verify MCP server status

### Debug Logging

Enable detailed logging by checking server console for:

```
🎬 Starting workflow [workflow-id] for message: "user message"
🎯 Executing task "task description" with agent AgentName  
✅ Orchestrator workflow completed - called agents: Agent1, Agent2
```

## Future Enhancements

1. **Persistent Workflows** - Store workflow state for resumption
2. **Parallel Execution** - Execute independent tasks concurrently
3. **Smart Agent Selection** - Advanced scoring and selection algorithms
4. **Workflow Templates** - Pre-defined workflows for common tasks
5. **Real-time Progress** - Live updates during long-running tasks
6. **Workflow Analytics** - Performance tracking and optimization

## Migration from @mentions

The system maintains backward compatibility with @mention syntax:

- **@mentions still work** for direct agent calls
- **Legacy methods preserved** in BaseLLMService
- **Gradual migration** - orchestrator handles non-@mention requests
- **Hybrid mode** - supports both workflows simultaneously

## Performance Considerations

- **Async execution** - All agent calls are non-blocking
- **Timeout handling** - 30-second timeout for LLM responses
- **Memory management** - Workflow state cleaned up after completion
- **Error resilience** - Graceful handling of agent failures

## Security

- **Agent validation** - Only active, configured agents can be called
- **Input sanitization** - User inputs validated before agent calls
- **Access control** - Respects existing agent access permissions
- **Audit logging** - All workflow activities logged for review 