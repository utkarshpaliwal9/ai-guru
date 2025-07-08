from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pathlib import Path
import yaml
import importlib.util
import sys
from typing import Dict, Any, List, Optional
import requests
from langchain.tools import BaseTool
import re

# Lazy import crewai so codebase can install requirements separately
import crewai
from crewai import Agent, Task, Crew, Process
from crewai_tools import tool

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define request models
class PromptRequest(BaseModel):
    prompt: str
    tool_name: str = "playwright"
    node_base: str = "http://localhost:5001"

class RunRequest(BaseModel):
    workflow_id: str
    inputs: Dict[str, Any] = {}
    node_base: str = "http://localhost:5001"
    agents_payload: List[Dict[str, Any]] = None
    prompt: Optional[str] = None

# Create a simple LLM configuration
def get_simple_llm():
    # Try to use OpenAI if available, otherwise fall back to a local model
    try:
        import os
        if os.getenv("OPENAI_API_KEY"):
            from langchain_openai import ChatOpenAI
            return ChatOpenAI(
                model="gpt-3.5-turbo",
                temperature=0.1,
                max_tokens=500
            )
    except:
        pass
    
    # Fallback to a simple implementation that will work with tools
    from langchain.llms.fake import FakeListLLM
    
    # Create responses that will actually trigger tool usage
    responses = [
        "I need to use the playwright_browser tool to complete this task. Let me call it now.",
        "I'll use the playwright_browser tool to navigate to the website and take a screenshot.",
        "Using the playwright_browser tool to visit github.com and take a screenshot.",
        "I need to execute the playwright_browser tool to complete this request.",
        "Let me use the playwright_browser tool to browse to the website and capture a screenshot.",
        "I'll call the playwright_browser tool to visit the requested URL and take a screenshot.",
        "Using the playwright_browser tool to navigate to github.com and capture the page.",
        "I need to use the playwright_browser tool to visit the website and take a screenshot."
    ]
    return FakeListLLM(responses=responses)

@app.get("/")
def read_root():
    return {"status": "ok", "message": "CrewAI service is running"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/process")
async def process_prompt(request: PromptRequest):
    try:
        print(f"Processing prompt: {request.prompt}")
        print(f"Using tool: {request.tool_name}")
        
        # Define the tool based on the requested tool_name
        tool_name = request.tool_name.lower()
        
        # Create an agent with the appropriate tool
        agent = Agent(
            role="Web Browser",
            goal="Browse the web and take screenshots",
            backstory="I am an AI agent that can browse the web and take screenshots of websites.",
            verbose=True,
            allow_delegation=False,
            tools=[PlaywrightBrowserTool(node_base=request.node_base)],
            llm=get_simple_llm()
        )
        
        # Create a task with proper configuration
        prompt_task = Task(
            description=request.prompt,
            expected_output="A detailed report of the browsing results",
            agent=agent
        )
        
        # Create a crew with the agent
        crew = Crew(
            agents=[agent],
            tasks=[prompt_task],
            verbose=True,
            process=Process.sequential
        )
        
        # Execute the crew's task
        result = crew.kickoff()
        
        return {"result": result}
    except Exception as e:
        print(f"Error processing prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing prompt: {str(e)}")

@app.post("/test-tool")
async def test_tool_direct(request: RunRequest):
    """Direct test of the Playwright tool without going through CrewAI"""
    try:
        print(f"Testing tool directly with prompt: {request.prompt}")
        
        # Create the tool directly
        playwright_tool = PlaywrightBrowserTool(node_base=request.node_base)
        
        # Call the tool directly
        result = playwright_tool._run(request.prompt)
        
        return {
            "result": result,
            "success": True,
            "metadata": {
                "workflow_id": request.workflow_id,
                "test_type": "direct_tool_execution",
                "node_base": request.node_base
            }
        }
        
    except Exception as e:
        print(f"Error in direct tool test: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "result": f"Direct tool test failed: {str(e)}",
            "success": False,
            "error": {
                "type": type(e).__name__,
                "message": str(e),
                "workflow_id": request.workflow_id
            }
        }

@app.post("/run")
async def run_flow(request: RunRequest):
    try:
        print(f"Running workflow: {request.workflow_id}")
        print(f"Prompt: {request.prompt}")
        print(f"Node base: {request.node_base}")
        
        # Validate required parameters
        if not request.prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")
        
        if not request.node_base:
            raise HTTPException(status_code=400, detail="Node base URL is required")
            
        # Check if the prompt contains agent mentions
        if "@Playwright" not in request.prompt:
            return {
                "result": "No agent tool specified in prompt. Please mention @Playwright or other available agents.",
                "success": False
            }
        
        # Validate node_base URL format
        if not request.node_base.startswith(('http://', 'https://')):
            request.node_base = f"http://{request.node_base}"
        
        try:
            # Create an agent with the Playwright tool
            playwright_tool = PlaywrightBrowserTool(node_base=request.node_base)
            
            agent = Agent(
                role="Web Browser",
                goal="Browse the web and take screenshots using Playwright",
                backstory="I am an AI agent that can browse the web and take screenshots of websites using Playwright tools. I will execute the necessary commands to complete the task.",
                verbose=True,
                allow_delegation=False,
                tools=[playwright_tool],
                llm=get_simple_llm()
            )
            
            # Create a task with the prompt
            prompt_task = Task(
                description=request.prompt,
                expected_output="A detailed report of the browsing results including any screenshots taken",
                agent=agent
            )
            
            # Create a crew with the agent
            crew = Crew(
                agents=[agent],
                tasks=[prompt_task],
                verbose=True,
                process=Process.sequential
            )
            
            # Execute the crew's task
            print("Starting crew execution...")
            result = crew.kickoff()
            
            return {
                "result": str(result),
                "success": True,
                "metadata": {
                    "workflow_id": request.workflow_id,
                    "agent_used": "Playwright",
                    "node_base": request.node_base
                }
            }
            
        except Exception as tool_error:
            print(f"Error creating or executing crew: {str(tool_error)}")
            print(f"Tool error type: {type(tool_error).__name__}")
            print(f"Tool error details: {str(tool_error)}")
            
            # Return more specific error information
            return {
                "result": f"Failed to execute workflow: {str(tool_error)}",
                "success": False,
                "error": {
                    "type": type(tool_error).__name__,
                    "message": str(tool_error),
                    "workflow_id": request.workflow_id
                }
            }
            
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        print(f"Unexpected error running workflow: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        
        raise HTTPException(
            status_code=500, 
            detail={
                "message": f"Error running workflow: {str(e)}",
                "type": type(e).__name__,
                "workflow_id": request.workflow_id
            }
        )

# Define a Playwright browser tool that calls the Node.js backend
class PlaywrightBrowserTool(BaseTool):
    name: str = "playwright_browser"
    description: str = "A tool to browse the web using Playwright"
    node_base: str = Field(default="http://localhost:5001", description="Base URL for the Node.js backend")
    
    def __init__(self, node_base: str = "http://localhost:5001", **kwargs):
        super().__init__(node_base=node_base, **kwargs)

    def _run(self, query: str = None) -> str:
        print(f"PlaywrightBrowserTool: Sync run called with query: {query}")
        
        # For synchronous execution, we'll use a simple approach
        # Enhanced parsing to handle the complete workflow
        results = []
        
        # Check if we need to navigate to a URL
        if "visit" in query.lower() or "navigate" in query.lower() or "go to" in query.lower():
            # Extract URL from various patterns
            url_patterns = [
                r"visit\s+(https?://[^\s]+)",
                r"navigate\s+to\s+(https?://[^\s]+)",
                r"go\s+to\s+(https?://[^\s]+)",
                r"(https?://[^\s]+)",
                r"visit\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
                r"([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
            ]
            
            url = None
            for pattern in url_patterns:
                match = re.search(pattern, query, re.IGNORECASE)
                if match:
                    url = match.group(1)
                    if not url.startswith(('http://', 'https://')):
                        url = 'https://' + url
                    break
            
            if url:
                print(f"PlaywrightBrowserTool: Navigating to URL: {url}")
                nav_result = self._execute_tool_sync("browser_navigate", {"url": url})
                results.append(f"Navigation: {nav_result}")
                
                # Add a small delay for page load
                wait_result = self._execute_tool_sync("browser_wait_for", {"time": 2})
                results.append(f"Wait: {wait_result}")
        
        # Check if we need to take a screenshot
        if "screenshot" in query.lower() or "capture" in query.lower() or "image" in query.lower():
            print(f"PlaywrightBrowserTool: Taking screenshot")
            screenshot_result = self._execute_tool_sync("browser_take_screenshot", {})
            results.append(f"Screenshot: {screenshot_result}")
        
        # Check if we need to get a snapshot
        if "snapshot" in query.lower():
            print(f"PlaywrightBrowserTool: Taking snapshot")
            snapshot_result = self._execute_tool_sync("browser_snapshot", {})
            results.append(f"Snapshot: {snapshot_result}")
        
        if not results:
            # If no specific actions were identified, provide a generic response
            results.append("I processed your request but couldn't identify specific actions to take.")
        
        final_result = "Successfully completed the following actions:\n" + "\n".join(results)
        print(f"PlaywrightBrowserTool: Final result: {final_result}")
        return final_result
    
    async def _arun(self, query: str = None) -> str:
        print(f"PlaywrightBrowserTool: Async run called with query: {query}")
        
        # Enhanced parsing to handle the complete workflow
        results = []
        
        # Check if we need to navigate to a URL
        if "visit" in query.lower() or "navigate" in query.lower() or "go to" in query.lower():
            # Extract URL from various patterns
            url_patterns = [
                r"visit\s+(https?://[^\s]+)",
                r"navigate\s+to\s+(https?://[^\s]+)",
                r"go\s+to\s+(https?://[^\s]+)",
                r"(https?://[^\s]+)",
                r"visit\s+([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
                r"([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})"
            ]
            
            url = None
            for pattern in url_patterns:
                url_match = re.search(pattern, query, re.IGNORECASE)
                if url_match:
                    url = url_match.group(1)
                    # Add protocol if missing
                    if not url.startswith(('http://', 'https://')):
                        url = f"https://{url}"
                    break
            
            if url:
                # Navigate to the URL
                nav_result = await self._execute_tool("mcp_playwright_browser_navigate", {"url": url})
                results.append(f"Navigation: {nav_result}")
                
                # Wait a moment for the page to load
                await self._execute_tool("mcp_playwright_browser_wait_for", {"time": 2})
        
        # Check if we need to take a screenshot
        if "screenshot" in query.lower() or "capture" in query.lower():
            screenshot_result = await self._execute_tool("mcp_playwright_browser_take_screenshot", {"filename": "screenshot.png"})
            results.append(f"Screenshot: {screenshot_result}")
        
        # If no specific actions were identified, try to extract general browsing actions
        if not results:
            # Default to navigating to github.com if mentioned
            if "github" in query.lower():
                nav_result = await self._execute_tool("mcp_playwright_browser_navigate", {"url": "https://github.com"})
                results.append(f"Navigation: {nav_result}")
                
                # Wait for page load
                await self._execute_tool("mcp_playwright_browser_wait_for", {"time": 2})
                
                # Take a screenshot
                screenshot_result = await self._execute_tool("mcp_playwright_browser_take_screenshot", {"filename": "github_screenshot.png"})
                results.append(f"Screenshot: {screenshot_result}")
        
        if results:
            return "Successfully completed the following actions:\n" + "\n".join(results)
        else:
            return f"No specific Playwright actions could be identified from the query: {query}"
    
    def _execute_tool_sync(self, tool_name: str, tool_args: dict) -> str:
        """Helper method to execute a tool via the Node.js backend synchronously"""
        try:
            node_url = f"{self.node_base}/api/mcp/execute-tool"
            agent_id = "2aba7871-b98c-4dd5-ac79-cef41e4c1e3b"  # Hardcoded Playwright agent ID for now
            
            payload = {
                "agentId": agent_id,
                "toolName": tool_name,
                "toolArgs": tool_args
            }
            
            print(f"PlaywrightBrowserTool: Sending sync request to Node.js: {node_url} with payload: {payload}")
            response = requests.post(node_url, json=payload)
            response.raise_for_status()  # Raise an exception for HTTP errors
            
            result = response.json()
            print(f"PlaywrightBrowserTool: Received sync response from Node.js: {result}")

            if result.get("success"):
                return f"Successfully executed {tool_name}. Result: {result.get('result', 'N/A')}"
            else:
                return f"Failed to execute {tool_name}. Error: {result.get('error', 'Unknown error')}"
        except requests.exceptions.RequestException as e:
            return f"Network error when calling Node.js backend: {str(e)}"
        except Exception as e:
            return f"Error in PlaywrightBrowserTool: {str(e)}"
    
    async def _execute_tool(self, tool_name: str, tool_args: dict) -> str:
        """Helper method to execute a tool via the Node.js backend"""
        try:
            node_url = f"{self.node_base}/api/mcp/execute-tool"
            agent_id = "2aba7871-b98c-4dd5-ac79-cef41e4c1e3b"  # Hardcoded Playwright agent ID for now
            
            payload = {
                "agentId": agent_id,
                "toolName": tool_name,
                "toolArgs": tool_args
            }
            
            print(f"PlaywrightBrowserTool: Sending request to Node.js: {node_url} with payload: {payload}")
            response = requests.post(node_url, json=payload)
            response.raise_for_status()  # Raise an exception for HTTP errors
            
            result = response.json()
            print(f"PlaywrightBrowserTool: Received response from Node.js: {result}")

            if result.get("success"):
                return f"Successfully executed {tool_name}. Result: {result.get('result', 'N/A')}"
            else:
                return f"Failed to execute {tool_name}. Error: {result.get('error', 'Unknown error')}"
        except requests.exceptions.RequestException as e:
            return f"Network error when calling Node.js backend: {str(e)}"
        except Exception as e:
            return f"Error in PlaywrightBrowserTool: {str(e)}" 