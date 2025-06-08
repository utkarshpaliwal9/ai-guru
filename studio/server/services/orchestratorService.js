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
    console.log(`🔍 Selecting agent for task: "${task.description}"`);
    console.log(`📋 Available agents: ${availableAgents.map(a => a.name).join(', ')}`);
    console.log(`💡 Suggested agents: ${(task.suggestedAgents || []).join(', ')}`);
    
    // First try to find agents by suggested names
    const candidates = availableAgents.filter(agent => 
      task.suggestedAgents && task.suggestedAgents.includes(agent.name) && agent.isActive
    );

    if (candidates.length > 0) {
      const selectedAgent = candidates[0];
      console.log(`✅ Found suggested agent: ${selectedAgent.name}`);
      return {
        agent: selectedAgent,
        reasoning: `Selected ${selectedAgent.name} for task: ${task.description}`
      };
    }

    // If no suggested agents found, use intelligent matching
    const taskDescription = task.description.toLowerCase();
    
    for (const agent of availableAgents.filter(a => a.isActive)) {
      const agentName = agent.name.toLowerCase();
      const agentDesc = (agent.description || '').toLowerCase();
      
      // Web/Browser related tasks - match with Playwright
      if (taskDescription.includes('web') || taskDescription.includes('browser') || 
          taskDescription.includes('navigate') || taskDescription.includes('visit') ||
          taskDescription.includes('github') || taskDescription.includes('page') ||
          taskDescription.includes('extract') || taskDescription.includes('content') ||
          taskDescription.includes('scrape') || taskDescription.includes('analyze') ||
          taskDescription.includes('featured') || taskDescription.includes('main page')) {
        
        if (agentName.includes('playwright') || agentDesc.includes('web') || 
            agentDesc.includes('browser') || agentDesc.includes('automation')) {
          console.log(`🎯 Intelligent match: ${agent.name} for web/content task`);
          return {
            agent,
            reasoning: `Selected ${agent.name} for task: ${task.description} (intelligent web/content matching)`
          };
        }
      }
    }

    // Final fallback: Use first available agent if we have any
    const activeAgents = availableAgents.filter(a => a.isActive);
    if (activeAgents.length > 0) {
      const fallbackAgent = activeAgents[0];
      console.log(`🔄 Fallback: Using ${fallbackAgent.name} as no specific match found`);
      return {
        agent: fallbackAgent,
        reasoning: `Fallback: Using ${fallbackAgent.name} for task: ${task.description} (no suggested agents available)`
      };
    }

    console.log(`❌ No agents available for task`);
    return {
      agent: null,
      reasoning: `No available agents found for task: ${task.description}`
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

    // System prompt for completion evaluation with anti-loop logic
    const evaluationPrompt = `You are evaluating whether a user's request has been fully addressed by a series of agent tasks.

IMPORTANT: If any agent has successfully executed a web browsing task and returned content about the requested page, consider the request COMPLETE. Do not create additional content extraction or presentation tasks.

Original User Request: "${originalMessage}"

Task Results:
${taskSummary.map(task => 
  `- Task: ${task.description}
   Agent: ${task.agent}
   Status: ${task.success ? 'SUCCESS' : 'FAILED'}
   Result: ${task.response.substring(0, 500)}...`
).join('\n')}

EVALUATION RULES:
1. If the user asked to visit a website and get information, and an agent successfully navigated and extracted content, mark as COMPLETE
2. Do not create redundant tasks like "extract content" or "present content" if content has already been extracted
3. If multiple similar tasks have been attempted, mark as COMPLETE to avoid infinite loops
4. If any task returned actual webpage content or data, the core request is satisfied

Analyze and respond in JSON format:
{
  "isComplete": boolean,
  "completionPercentage": number (0-100),
  "remainingTasks": [],
  "summary": "Brief summary of what was accomplished",
  "finalResponse": "User-friendly response about the completion status"
}

CRITICAL: If any web browsing task succeeded and returned content, set isComplete: true and empty remainingTasks array.`;

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
  async continueWorkflow(workflowId, remainingTasks, userMessage, conversationHistory, alfaProvider, previousTaskHistory = []) {
    console.log(`🔄 Continuing workflow ${workflowId} with ${remainingTasks.length} remaining tasks`);
    console.log(`📋 DEBUG: Remaining tasks to execute:`, remainingTasks.map(t => ({
      description: t.description,
      priority: t.priority,
      suggestedAgents: t.suggestedAgents
    })));
    
    // Check for task repetition to prevent infinite loops
    const currentTaskDescriptions = remainingTasks.map(t => t.description.toLowerCase().trim());
    const recentTaskHistory = previousTaskHistory.slice(-5); // Last 5 tasks
    
    for (const currentTask of currentTaskDescriptions) {
      const repetitionCount = recentTaskHistory.filter(prevTask => 
        prevTask.toLowerCase().includes('extract') && 
        prevTask.toLowerCase().includes('content') &&
        currentTask.includes('extract') && 
        currentTask.includes('content')
      ).length;
      
      if (repetitionCount >= 2) {
        console.log(`🔄 Task repetition detected: "${currentTask}" has been attempted ${repetitionCount} times recently`);
        console.log(`🛑 Forcing workflow completion to prevent infinite loop`);
        return {
          workflowId,
          continued: true,
          taskResults: [],
          isComplete: true,
          completionPercentage: 100,
          remainingTasks: [],
          summary: "Workflow completed due to task repetition detection",
          finalResponse: "The task has been completed based on previous agent executions.",
          agentsCalled: [],
          forcedCompletion: true
        };
      }
    }

    // Execute remaining tasks using similar logic as main workflow
    const availableAgents = await getAllAgents();
    const activeAgents = availableAgents.filter(agent => agent.isActive);
    
    const taskResults = [];
    
    for (const task of remainingTasks) {
      console.log(`🔍 DEBUG: Processing remaining task: "${task.description}"`);
      
      const agentSelection = this.selectBestAgent(task, activeAgents);
      console.log(`🤖 DEBUG: Agent selection result:`, {
        selectedAgent: agentSelection.agent?.name || 'None',
        reasoning: agentSelection.reasoning
      });
      
      if (!agentSelection.agent) {
        console.log(`❌ DEBUG: No agent selected for task: "${task.description}"`);
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

      console.log(`🎯 DEBUG: Executing task with agent: ${agentSelection.agent.name}`);
      const result = await this.executeTask(
        task, 
        agentSelection.agent, 
        userMessage, 
        conversationHistory
      );
      
      console.log(`📊 DEBUG: Task execution result:`, {
        success: result.success,
        agentName: result.agent?.name,
        error: result.error || 'None'
      });
      
      taskResults.push(result);
    }

    // Check for early success - if we have successful web browsing results, mark as complete
    const hasSuccessfulWebTask = taskResults.some(result => 
      result.success && 
      result.response && 
      result.response.content && 
      result.response.content.length > 100 && // Meaningful content
      (result.task.description.toLowerCase().includes('visit') ||
       result.task.description.toLowerCase().includes('github') ||
       result.task.description.toLowerCase().includes('web'))
    );
    
    if (hasSuccessfulWebTask) {
      console.log(`✅ Early success detection: Web browsing task completed successfully`);
      return {
        workflowId,
        continued: true,
        taskResults,
        isComplete: true,
        completionPercentage: 100,
        remainingTasks: [],
        summary: this.createWorkflowSummary(taskResults, { completedTasks: taskResults.filter(r => r.success).length, totalTasks: taskResults.length }),
        finalResponse: "Successfully retrieved the requested information from the website.",
        agentsCalled: taskResults.filter(r => r.success && r.agent).map(r => r.agent.name),
        earlySuccess: true
      };
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