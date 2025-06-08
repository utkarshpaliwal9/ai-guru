import { getAllAgents, getAgent } from '../utils/storage.js';
import { callAgentAPI } from './agentService.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Orchestrator Service for Task-Based Agent Workflow
 * 
 * Data Flow:
 * 1. User writes prompt -> Base LLM (Alfa)
 * 2. Alfa analyzes if prompt contains tasks requiring agents
 * 3. If yes, Alfa selects appropriate agents from available list
 * 4. Alfa calls agents with required inputs and receives responses
 * 5. Alfa evaluates task completion and continues with remaining tasks
 * 6. Process repeats until all tasks are complete
 */
class OrchestratorService {
  constructor() {
    this.activeWorkflows = new Map(); // Track ongoing workflows
  }

  /**
   * Analyze user message to detect tasks that require agent assistance
   * @param {string} userMessage - The user's input message
   * @param {Array} availableAgents - List of available agents with capabilities
   * @returns {Object} Analysis result with detected tasks and suggested agents
   */
  async analyzeTaskRequirements(userMessage, availableAgents) {
    // Create agent capabilities summary for analysis
    const agentSummary = availableAgents.map(agent => ({
      name: agent.name,
      description: agent.description || 'No description',
      capabilities: agent.configuration?.capabilities || [],
      tools: agent.configuration?.tools || []
    }));

    // System prompt for task analysis
    const analysisPrompt = `You are a task analyzer for an AI assistant system. Your job is to analyze user messages and determine:

1. Does this message contain actionable tasks that would benefit from specialized agent assistance?
2. Which available agents (if any) would be most helpful for these tasks?
3. What specific information or context should be passed to each agent?

Available Agents:
${agentSummary.map(agent => 
  `- ${agent.name}: ${agent.description}${agent.capabilities.length > 0 ? ` (Capabilities: ${agent.capabilities.join(', ')})` : ''}`
).join('\n')}

User Message: "${userMessage}"

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

If no actionable tasks are detected, return hasActionableTasks: false with empty detectedTasks array.`;

    return {
      prompt: analysisPrompt,
      agentSummary
    };
  }

  /**
   * Select the best agent for a specific task
   * @param {Object} task - Task object from analysis
   * @param {Array} availableAgents - Available agents
   * @returns {Object} Selected agent and reasoning
   */
  selectBestAgent(task, availableAgents) {
    const candidates = availableAgents.filter(agent => 
      task.suggestedAgents.includes(agent.name) && agent.isActive
    );

    if (candidates.length === 0) {
      return {
        agent: null,
        reasoning: `No available agents found for task: ${task.description}`
      };
    }

    // For now, select the first available candidate
    // This could be enhanced with more sophisticated selection logic
    const selectedAgent = candidates[0];

    return {
      agent: selectedAgent,
      reasoning: `Selected ${selectedAgent.name} for task: ${task.description}`
    };
  }

  /**
   * Execute a specific task with the selected agent
   * @param {Object} task - Task to execute
   * @param {Object} agent - Agent to execute the task
   * @param {string} originalMessage - Original user message
   * @param {Array} conversationHistory - Conversation context
   * @returns {Object} Task execution result
   */
  async executeTask(task, agent, originalMessage, conversationHistory) {
    try {
      // Prepare context for agent
      const agentContext = {
        currentMessage: task.inputs || originalMessage,
        taskDescription: task.description,
        taskContext: task.context,
        conversationHistory: conversationHistory.slice(-5), // Last 5 messages
        agentConfiguration: agent.configuration || {},
        timestamp: new Date().toISOString()
      };

      console.log(`🎯 Executing task "${task.description}" with agent ${agent.name}`);

      // TODO: Emit agent activity indicator (would need socket context)
      // This could be enhanced to show real-time agent activity

      // Call the agent
      const agentResponse = await callAgentAPI(agent, agentContext);

      return {
        success: true,
        taskId: task.id || uuidv4(),
        task,
        agent: {
          id: agent.id,
          name: agent.name
        },
        response: agentResponse,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Error executing task with agent ${agent.name}:`, error.message);
      
      return {
        success: false,
        taskId: task.id || uuidv4(),
        task,
        agent: {
          id: agent.id,
          name: agent.name
        },
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Evaluate task completion and determine next steps
   * @param {Array} taskResults - Results from executed tasks
   * @param {string} originalMessage - Original user message
   * @param {Array} availableAgents - Available agents
   * @returns {Object} Completion analysis and next steps
   */
  async evaluateCompletion(taskResults, originalMessage, availableAgents) {
    const completedTasks = taskResults.filter(result => result.success);
    const failedTasks = taskResults.filter(result => !result.success);

    // Create summary of task results
    const taskSummary = taskResults.map(result => ({
      description: result.task.description,
      agent: result.agent ? result.agent.name : 'Unknown Agent',
      success: result.success,
      response: result.success ? result.response.content : result.error
    }));

    // System prompt for completion evaluation
    const evaluationPrompt = `You are evaluating whether a user's request has been fully addressed by a series of agent tasks.

Original User Request: "${originalMessage}"

Task Results:
${taskSummary.map(task => 
  `- Task: ${task.description}
   Agent: ${task.agent}
   Status: ${task.success ? 'SUCCESS' : 'FAILED'}
   Result: ${task.response}`
).join('\n')}

Analyze and respond in JSON format:
{
  "isComplete": boolean,
  "completionPercentage": number (0-100),
  "remainingTasks": [
    {
      "description": "What still needs to be done",
      "priority": "high|medium|low",
      "suggestedAgents": ["agent1", "agent2"],
      "context": "Context for the remaining task"
    }
  ],
  "summary": "Brief summary of what was accomplished and what remains",
  "finalResponse": "User-friendly response about the completion status"
}

If the request is fully complete, set isComplete: true and empty remainingTasks array.`;

    return {
      prompt: evaluationPrompt,
      taskSummary,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      totalTasks: taskResults.length
    };
  }

  /**
   * Create workflow summary for the base LLM
   * @param {Array} taskResults - All task execution results
   * @param {Object} completionAnalysis - Completion evaluation results
   * @returns {string} Formatted summary for base LLM
   */
  createWorkflowSummary(taskResults, completionAnalysis) {
    let summary = "## Task Execution Summary\n\n";

    // Add completed tasks
    const completedTasks = taskResults.filter(r => r.success);
    if (completedTasks.length > 0) {
      summary += "### ✅ Completed Tasks:\n";
      completedTasks.forEach(result => {
        const agentName = result.agent ? result.agent.name : 'Unknown Agent';
        summary += `- **${result.task.description}** (via ${agentName})\n`;
        summary += `  Result: ${result.response.content}\n\n`;
      });
    }

    // Add failed tasks
    const failedTasks = taskResults.filter(r => !r.success);
    if (failedTasks.length > 0) {
      summary += "### ❌ Failed Tasks:\n";
      failedTasks.forEach(result => {
        const agentName = result.agent ? result.agent.name : 'Unknown Agent';
        summary += `- **${result.task.description}** (via ${agentName})\n`;
        summary += `  Error: ${result.error}\n\n`;
      });
    }

    // Add completion status
    summary += `### 📊 Status: ${completionAnalysis.completedTasks}/${completionAnalysis.totalTasks} tasks completed\n\n`;

    return summary;
  }

  /**
   * Main orchestration method - coordinates the entire workflow
   * @param {string} userMessage - User's input message
   * @param {Array} conversationHistory - Conversation context
   * @param {Function} alfaProvider - Base LLM provider for analysis and evaluation
   * @returns {Object} Complete workflow result
   */
  async orchestrateWorkflow(userMessage, conversationHistory, alfaProvider) {
    const workflowId = uuidv4();
    
    try {
      console.log(`🎬 Starting workflow ${workflowId} for message: "${userMessage}"`);

      // Step 1: Get available agents
      const availableAgents = await getAllAgents();
      const activeAgents = availableAgents.filter(agent => agent.isActive);

      if (activeAgents.length === 0) {
        return {
          workflowId,
          requiresAgents: false,
          message: "No active agents available for task execution.",
          taskResults: [],
          isComplete: true
        };
      }

      // Step 2: Analyze task requirements
      const taskAnalysis = await this.analyzeTaskRequirements(userMessage, activeAgents);
      
      // Call Alfa to analyze tasks
      const analysisContext = {
        history: conversationHistory,
        metadata: { purpose: 'task-analysis', workflowId }
      };

      const analysisResponse = await alfaProvider.sendMessage(taskAnalysis.prompt, analysisContext);
      
      let taskAnalysisResult;
      try {
        // Handle JSON responses that may be wrapped in markdown code blocks
        let jsonContent = analysisResponse.content.trim();
        
        // Remove markdown code block formatting if present
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        taskAnalysisResult = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('❌ Failed to parse task analysis response:', parseError);
        console.error('📄 Raw response content:', analysisResponse.content.substring(0, 500) + '...');
        return {
          workflowId,
          requiresAgents: false,
          message: "I can help you directly without needing specialized agents.",
          taskResults: [],
          isComplete: true
        };
      }

      // Step 3: Check if agents are needed
      if (!taskAnalysisResult.hasActionableTasks || taskAnalysisResult.detectedTasks.length === 0) {
        return {
          workflowId,
          requiresAgents: false,
          message: "I can handle this request directly without needing specialized agents.",
          taskResults: [],
          isComplete: true,
          reasoning: taskAnalysisResult.reasoning
        };
      }

      // Step 4: Execute tasks with agents
      const taskResults = [];
      
      for (const task of taskAnalysisResult.detectedTasks) {
        // Select best agent for task
        const agentSelection = this.selectBestAgent(task, activeAgents);
        
        if (!agentSelection.agent) {
          taskResults.push({
            success: false,
            taskId: uuidv4(),
            task,
            agent: null,
            error: agentSelection.reasoning,
            timestamp: new Date().toISOString()
          });
          continue;
        }

        // Execute task
        const result = await this.executeTask(
          task, 
          agentSelection.agent, 
          userMessage, 
          conversationHistory
        );
        
        taskResults.push(result);
      }

      // Step 5: Evaluate completion
      const completionEvaluation = await this.evaluateCompletion(
        taskResults, 
        userMessage, 
        activeAgents
      );

      // Call Alfa to evaluate completion
      const evaluationContext = {
        history: conversationHistory,
        metadata: { purpose: 'completion-evaluation', workflowId }
      };

      const evaluationResponse = await alfaProvider.sendMessage(
        completionEvaluation.prompt, 
        evaluationContext
      );

      let completionResult;
      try {
        // Handle JSON responses that may be wrapped in markdown code blocks
        let jsonContent = evaluationResponse.content.trim();
        
        // Remove markdown code block formatting if present
        if (jsonContent.startsWith('```json')) {
          jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonContent.startsWith('```')) {
          jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        completionResult = JSON.parse(jsonContent);
      } catch (parseError) {
        console.error('❌ Failed to parse completion evaluation:', parseError);
        console.error('📄 Raw evaluation response:', evaluationResponse.content.substring(0, 500) + '...');
        completionResult = {
          isComplete: true,
          completionPercentage: 100,
          remainingTasks: [],
          summary: "Tasks completed",
          finalResponse: "I've completed the requested tasks."
        };
      }

      // Step 6: Create summary for base LLM
      const workflowSummary = this.createWorkflowSummary(taskResults, completionEvaluation);

      console.log(`✅ Workflow ${workflowId} completed - ${completionResult.isComplete ? 'COMPLETE' : 'PARTIAL'}`);

      return {
        workflowId,
        requiresAgents: true,
        taskResults,
        isComplete: completionResult.isComplete,
        completionPercentage: completionResult.completionPercentage,
        remainingTasks: completionResult.remainingTasks || [],
        summary: workflowSummary,
        finalResponse: completionResult.finalResponse,
        agentsCalled: taskResults.filter(r => r.success && r.agent).map(r => r.agent.name),
        metadata: {
          originalMessage: userMessage,
          totalTasks: taskResults.length,
          successfulTasks: taskResults.filter(r => r.success).length,
          failedTasks: taskResults.filter(r => !r.success).length
        }
      };

    } catch (error) {
      console.error(`❌ Workflow ${workflowId} failed:`, error.message);
      
      return {
        workflowId,
        requiresAgents: false,
        error: error.message,
        message: "I encountered an error while processing your request. Let me try to help you directly.",
        taskResults: [],
        isComplete: true
      };
    }
  }

  /**
   * Continue an incomplete workflow with remaining tasks
   * @param {string} workflowId - ID of the workflow to continue
   * @param {Array} remainingTasks - Tasks that still need to be completed
   * @param {string} userMessage - Original or updated user message
   * @param {Array} conversationHistory - Updated conversation context
   * @param {Function} alfaProvider - Base LLM provider
   * @returns {Object} Continued workflow result
   */
  async continueWorkflow(workflowId, remainingTasks, userMessage, conversationHistory, alfaProvider) {
    console.log(`🔄 Continuing workflow ${workflowId} with ${remainingTasks.length} remaining tasks`);

    // Execute remaining tasks using similar logic as main workflow
    const availableAgents = await getAllAgents();
    const activeAgents = availableAgents.filter(agent => agent.isActive);
    
    const taskResults = [];
    
    for (const task of remainingTasks) {
      const agentSelection = this.selectBestAgent(task, activeAgents);
      
      if (!agentSelection.agent) {
        taskResults.push({
          success: false,
          taskId: uuidv4(),
          task,
          agent: null,
          error: agentSelection.reasoning,
          timestamp: new Date().toISOString()
        });
        continue;
      }

      const result = await this.executeTask(
        task, 
        agentSelection.agent, 
        userMessage, 
        conversationHistory
      );
      
      taskResults.push(result);
    }

    // Re-evaluate completion
    const completionEvaluation = await this.evaluateCompletion(
      taskResults, 
      userMessage, 
      activeAgents
    );

    const evaluationContext = {
      history: conversationHistory,
      metadata: { purpose: 'completion-evaluation-continued', workflowId }
    };

    const evaluationResponse = await alfaProvider.sendMessage(
      completionEvaluation.prompt, 
      evaluationContext
    );

    let completionResult;
    try {
      // Handle JSON responses that may be wrapped in markdown code blocks
      let jsonContent = evaluationResponse.content.trim();
      
      // Remove markdown code block formatting if present
      if (jsonContent.startsWith('```json')) {
        jsonContent = jsonContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonContent.startsWith('```')) {
        jsonContent = jsonContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      completionResult = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error('❌ Failed to parse continued workflow evaluation:', parseError);
      console.error('📄 Raw continued evaluation response:', evaluationResponse.content.substring(0, 500) + '...');
      completionResult = {
        isComplete: true,
        completionPercentage: 100,
        remainingTasks: [],
        summary: "Continued tasks completed",
        finalResponse: "I've completed the remaining tasks."
      };
    }

    const workflowSummary = this.createWorkflowSummary(taskResults, completionEvaluation);

    return {
      workflowId,
      continued: true,
      taskResults,
      isComplete: completionResult.isComplete,
      completionPercentage: completionResult.completionPercentage,
      remainingTasks: completionResult.remainingTasks || [],
      summary: workflowSummary,
      finalResponse: completionResult.finalResponse,
      agentsCalled: taskResults.filter(r => r.success && r.agent).map(r => r.agent.name)
    };
  }
}

// Export singleton instance
export const orchestratorService = new OrchestratorService(); 