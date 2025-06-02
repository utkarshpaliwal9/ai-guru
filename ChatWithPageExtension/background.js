chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ASK_QUESTION') {
    console.log('Background: Received question:', request.question);
    console.log('Background: Original question:', request.originalQuestion);
    console.log('Background: Target agent:', request.targetAgent);
    console.log('Background: Agent mode:', request.agentMode);

    // Get the current active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        console.error('Background: No active tab found.');
        sendResponse({ answer: 'Error: No active tab found to get content from.' });
        return;
      }
      const activeTab = tabs[0];

      // Check if the tab is a chrome:// or other restricted URL
      if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://') || activeTab.url.startsWith('about:')) {
        console.warn('Background: Cannot inject script into restricted URL:', activeTab.url);
        sendResponse({ answer: `Sorry, I cannot access content from this page: ${activeTab.url}` });
        return;
      }
      
      console.log('Background: Active tab ID:', activeTab.id, 'URL:', activeTab.url);

      // Inject content script to get page content
      chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['content.js']
      }, (injectionResults) => {
        if (chrome.runtime.lastError || !injectionResults || injectionResults.length === 0) {
          console.error('Background: Failed to inject content script.', chrome.runtime.lastError?.message);
          sendResponse({ answer: 'Error: Could not inject script to get page content.' });
          return;
        }
        console.log('Background: Content script injected. Waiting for content message...');

        chrome.tabs.sendMessage(activeTab.id, { type: "GET_PAGE_CONTENT", question: request.question }, async (response) => {
          if (chrome.runtime.lastError) {
            console.error("Background: Error receiving content from content script:", chrome.runtime.lastError.message);
            sendResponse({ answer: "Error processing page content." });
            return;
          }
          if (response && response.content) {
            console.log("Background: Received content snippet from content script:", response.content.substring(0, 100) + "...");
            
            // Check if images were also extracted
            const hasImages = response.images && response.images.length > 0;
            console.log(`Background: Found ${response.totalImagesFound || 0} total images on page`);
            console.log(`Background: Processed ${response.totalImagesProcessed || 0} images`);
            console.log(`Background: CORS blocked ${response.corsBlockedImages || 0} images`);
            
            if (hasImages) {
              console.log(`Background: Successfully processed ${response.images.length} images from content script`);
              console.log('Background: Image details:', response.images.map(img => ({ 
                src: img.src.substring(0, 50) + '...', 
                alt: img.alt,
                base64Length: img.base64.length 
              })));
            } else {
              console.log("Background: No images were successfully processed");
              if (response.error) {
                console.log("Background: Image processing error:", response.error);
              }
              if (response.corsBlockedImages > 0) {
                console.log(`Background: ${response.corsBlockedImages} images were blocked by CORS policy`);
              }
            }
            
            // Check if a specific agent was targeted
            if (request.targetAgent) {
              await handleCustomAgentRequest(request, response, sendResponse);
            } else {
              // --- Alfa API Integration Start ---
              const pageContent = response.content;
              const pageImages = response.images || [];
              const userQuestion = request.question;
              const isAgentMode = request.agentMode || false;

              // Alfa API Configuration
              const API_HOST = "https://alfa.gamma.qa.us-west-2.aws.avalara.io/v1" // "https://clip-api.gamma.qa.us-west-2.aws.avalara.io";
              const CHAT_HOST = "https://clip-chat-api.gamma.qa.us-west-2.aws.avalara.io";
              
              // Load credentials from storage
              chrome.storage.local.get(['alfaAuthToken', 'alfaProjectId'], async function(credentials) {
                if (!credentials.alfaAuthToken || !credentials.alfaProjectId) {
                  console.error("Background: Alfa credentials not found");
                  sendResponse({ 
                    answer: "Please configure your Alfa API credentials in the extension options. Right-click the extension icon and select 'Options'." 
                  });
                  return;
                }

                const AUTH_TOKEN = credentials.alfaAuthToken;
                const PROJECT_ID = credentials.alfaProjectId;

                try {
                  console.log("Background: Sending content and question to Alfa API.");
                  console.log("Background: Agent mode enabled:", isAgentMode);
                  
                  if (isAgentMode) {
                    // Handle agent request (modification mode)
                    await handleAgentRequest(userQuestion, pageContent, pageImages, response, sendResponse, AUTH_TOKEN, PROJECT_ID);
                  } else {
                    // Handle regular question
                    await handleRegularQuestion(userQuestion, pageContent, pageImages, response, sendResponse, AUTH_TOKEN, PROJECT_ID);
                  }

                } catch (error) {
                  console.error("Background: Failed to call Alfa API or process its response:", error);
                  sendResponse({ answer: "Sorry, I encountered an error trying to get an answer from Alfa. Check the console for details." });
                }
              });
              // --- Alfa API Integration End ---
            }

          } else {
            console.warn("Background: No content received from content script or unexpected response format.");
            sendResponse({ answer: "Sorry, I could not retrieve content from the page." });
          }
        });
      });
    });
    return true; // Indicates that the response will be sent asynchronously
  }
});

// Handle requests to specific custom agents
async function handleCustomAgentRequest(request, pageResponse, sendResponse) {
  console.log("Background: Processing request for agent:", request.targetAgent);
  
  // Load agents from storage
  chrome.storage.local.get(['agents'], async function(result) {
    const agents = result.agents || [];
    const targetAgent = agents.find(agent => agent.name.toLowerCase() === request.targetAgent.toLowerCase());
    
    if (!targetAgent) {
      sendResponse({ 
        answer: `Agent "@${request.targetAgent}" not found. Please check the agent name or add it in the extension options.`,
        targetAgent: request.targetAgent
      });
      return;
    }
    
    console.log(`Background: Found agent ${targetAgent.name} with endpoint ${targetAgent.endpoint}`);
    
    // Prepare prompt for the agent
    const prompt = `You are an AI agent named "${targetAgent.name}". 

User Request: "${request.question}"

Webpage Content:
${pageResponse.content.substring(0, 2000)}...

Please help the user with their request based on the webpage content and your capabilities.`;

    try {
      const apiResponse = await fetch(targetAgent.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${targetAgent.apiKey}`,
          // Add any custom headers from extra fields
          ...getCustomHeaders(targetAgent.extraFields)
        },
        body: JSON.stringify({
          model: targetAgent.extraFields?.model || "gpt-4o-mini", // Use custom model if specified
          messages: [
            {
              role: "system",
              content: `You are an AI agent named "${targetAgent.name}". Help users with their requests based on webpage content and your specialized capabilities.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: parseInt(targetAgent.extraFields?.max_tokens) || 500,
          temperature: parseFloat(targetAgent.extraFields?.temperature) || 0.7,
          // Include any other extra fields that are not headers
          ...getApiParameters(targetAgent.extraFields)
        })
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.text();
        console.error("Background: Agent API Error:", apiResponse.status, errorData);
        sendResponse({ 
          answer: `Error communicating with agent @${targetAgent.name}: ${apiResponse.status} ${errorData}`,
          targetAgent: request.targetAgent
        });
        return;
      }

      const result = await apiResponse.json();
      console.log("Background: Received result from agent:", result);
      
      const answer = result.choices?.[0]?.message?.content || result.choices?.[0]?.text || "No response from agent.";
      
      sendResponse({ 
        answer: answer.trim(),
        targetAgent: request.targetAgent
      });

    } catch (error) {
      console.error("Error communicating with agent:", error);
      sendResponse({ 
        answer: `Sorry, I encountered an error trying to communicate with agent @${targetAgent.name}: ${error.message}`,
        targetAgent: request.targetAgent
      });
    }
  });
}

// Helper function to extract custom headers from extra fields
function getCustomHeaders(extraFields) {
  const headers = {};
  if (extraFields) {
    Object.entries(extraFields).forEach(([key, value]) => {
      // Headers typically start with 'header_' prefix or contain 'header' in the key
      if (key.toLowerCase().includes('header') || key.startsWith('x-')) {
        headers[key.replace('header_', '')] = value;
      }
    });
  }
  return headers;
}

// Helper function to extract API parameters from extra fields (excluding headers and known params)
function getApiParameters(extraFields) {
  const params = {};
  const knownParams = ['model', 'max_tokens', 'temperature'];
  const excludeKeys = ['header_', 'x-'];
  
  if (extraFields) {
    Object.entries(extraFields).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      const isHeader = excludeKeys.some(prefix => lowerKey.includes('header') || lowerKey.startsWith(prefix));
      const isKnownParam = knownParams.includes(lowerKey);
      
      if (!isHeader && !isKnownParam) {
        // Try to parse numeric values
        let parsedValue = value;
        if (!isNaN(value) && value !== '') {
          parsedValue = value.includes('.') ? parseFloat(value) : parseInt(value);
        }
        params[key] = parsedValue;
      }
    });
  }
  return params;
}

// Handle agent requests (when user has agent mode enabled)
async function handleAgentRequest(userQuestion, pageContent, pageImages, response, sendResponse, authToken, projectId) {
  console.log("Background: Processing agent request");
  
  const prompt = `You are an AI agent that can modify webpages. Analyze the user's request and generate specific DOM modification commands.

User Request: "${userQuestion}"

Webpage Content:
${pageContent.substring(0, 2000)}...

Please analyze the request and respond with a JSON object containing:
1. "type": "modification"
2. "description": A brief description of what will be modified
3. "commands": An array of modification commands, each containing:
   - "action": "style", "hide", "show", "replace", "add", or "remove"
   - "selector": CSS selector to target elements
   - "property": CSS property name (for style actions)
   - "value": New value or content
   - "content": New HTML content (for add/replace actions)

Example response:
{
  "type": "modification",
  "description": "Changed background color to blue",
  "commands": [
    {
      "action": "style",
      "selector": "body",
      "property": "background-color",
      "value": "blue"
    }
  ]
}

IMPORTANT: Only respond with valid JSON. No other text.`;

  try {
    const apiResponse = await fetch(`https://alfa.gamma.qa.us-west-2.aws.avalara.io/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
        "x-claim": projectId
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an AI agent that generates webpage modification commands. Always respond with valid JSON only."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 800,
        temperature: 0.3
      })
    });

    if (!apiResponse.ok) {
      throw new Error(`API error: ${apiResponse.status}`);
    }

    const result = await apiResponse.json();
    const answer = result.choices[0].message?.content || "No response";
    
    try {
      const modificationData = JSON.parse(answer);
      
      if (modificationData.type === "modification" && modificationData.commands) {
        // Send modification commands to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: "MODIFY_PAGE",
            commands: modificationData.commands,
            description: modificationData.description
          }, (modifyResponse) => {
            if (chrome.runtime.lastError) {
              sendResponse({ answer: "Failed to execute modifications on the page." });
            } else {
              sendResponse({ 
                answer: `✅ Successfully applied modifications: ${modificationData.description}`,
                isModification: true
              });
            }
          });
        });
      } else {
        sendResponse({ answer: "I understand you want to modify the page, but I couldn't generate valid modification commands." });
      }
    } catch (parseError) {
      console.error("Failed to parse modification JSON:", parseError);
      sendResponse({ answer: "I couldn't understand how to modify the page based on your request. Please try a more specific request." });
    }

  } catch (error) {
    console.error("Error in agent request:", error);
    sendResponse({ answer: "Sorry, I encountered an error trying to process your agent request." });
  }
}

// Handle regular questions (existing functionality)
async function handleRegularQuestion(userQuestion, pageContent, pageImages, response, sendResponse, authToken, projectId) {
  console.log("Background: Processing regular question");
  
  const hasImages = pageImages && pageImages.length > 0;
  
  // Create a comprehensive prompt combining page content, images, and user question
  let prompt = `Based on the following webpage content, please answer the user's question.

Webpage Content:
${pageContent}

IMAGE INFORMATION:
- Total images found on this webpage: ${response.totalImagesFound || 0}
- Images I was able to process and analyze: ${pageImages.length}`;

  if (response.corsBlockedImages > 0) {
    prompt += `
- Images blocked by browser security (CORS): ${response.corsBlockedImages}
- Note: Many images on this page are hosted on different domains and cannot be processed due to browser security restrictions.`;
  }

  if (hasImages) {
    prompt += `

I have successfully processed and included ${pageImages.length} image(s) for your analysis. Each image is provided below.`;
  } else if (response.totalImagesFound > 0) {
    prompt += `

Unfortunately, while ${response.totalImagesFound} images exist on this page, none could be processed for analysis due to browser security restrictions (CORS policy). I can only count them but cannot see their content.`;
  } else {
    prompt += `

This webpage appears to contain no images.`;
  }

  prompt += `

User's Question: ${userQuestion}

Please provide a helpful and accurate answer. When discussing images, please reference the actual counts provided above.`;
  
  console.log("Background: Prompt being sent:", prompt.substring(0, 500) + "...");
  console.log(`Background: Sending ${hasImages ? pageImages.length : 0} images to API`);

  // Prepare the messages array for the chat API
  const messages = [
    {
      role: "system",
      content: `You are a helpful assistant that analyzes webpage content including both text and images. You have vision capabilities and can see and understand images when they are provided. 

When images are included:
- Describe what you see in the images
- Extract text from images if present  
- Answer questions about image content
- Reference specific details from the images

When asked about the number of images, always refer to the specific counts mentioned in the user's prompt about total images found and processed images.`
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: prompt
        }
      ]
    }
  ];

  // Add images to the user message if available
  if (hasImages) {
    pageImages.forEach((image, index) => {
      messages[1].content.push({
        type: "image_url",
        image_url: {
          url: image.base64,
          detail: "low" // Use "low" for faster processing, "high" for more detail
        }
      });
    });
  }

  try {
    // Try using chat completions endpoint with vision model
    const apiResponse = await fetch(`https://alfa.gamma.qa.us-west-2.aws.avalara.io/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
        "x-claim": projectId
      },
      body: JSON.stringify({
        model: hasImages ? "gpt-4o-mini" : "gpt-4o-mini", // Use vision-capable model for images
        messages: messages,
        max_tokens: 500,
        temperature: 0.7
      })
    });

    if (!apiResponse.ok) {
      const errorData = await apiResponse.text();
      console.error("Background: Alfa API Error:", apiResponse.status, errorData);
      
      // If chat/completions doesn't work, let's try a different endpoint
      if (apiResponse.status === 404) {
        console.log("Background: Trying alternative endpoint...");
        
        // Try the simpler completions endpoint (but this might not support images)
        const altResponse = await fetch(`https://alfa.gamma.qa.us-west-2.aws.avalara.io/v1/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authToken}`,
            "x-claim": projectId
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            prompt: prompt,
            max_tokens: 500,
            temperature: 0.7
          })
        });

        if (!altResponse.ok) {
          const altErrorData = await altResponse.text();
          console.error("Background: Alternative endpoint also failed:", altResponse.status, altErrorData);
          sendResponse({ 
            answer: `Both API endpoints failed. Chat completions (404): ${errorData}. Completions (${altResponse.status}): ${altErrorData}. The API structure might be different than expected.` 
          });
          return;
        }

        const altResult = await altResponse.json();
        console.log("Background: Alternative endpoint result:", altResult);
        
        const answer = altResult.choices?.[0]?.text || altResult.response || "No answer found in alternative response.";
        sendResponse({ answer: answer.trim() });
        return;
      }
      
      sendResponse({ answer: `Sorry, there was an error with the Alfa service (${apiResponse.status}). Error: ${errorData}` });
      return;
    }

    const result = await apiResponse.json();
    console.log("Background: Received result from Alfa API:", result);
    
    // Extract answer from chat completion response
    let answer = "I received a response but couldn't extract a clear answer.";
    
    if (result.choices && result.choices.length > 0) {
      answer = result.choices[0].message?.content || result.choices[0].text || "No content in choices.";
    } else if (result.response) {
      answer = result.response;
    } else if (result.answer) {
      answer = result.answer;
    } else {
      answer = `The API returned an unexpected format: ${JSON.stringify(result).substring(0, 200)}...`;
    }
    
    console.log("Background: Extracted answer:", answer);
    sendResponse({ answer: answer.trim() });

  } catch (error) {
    console.error("Error in regular question handling:", error);
    sendResponse({ answer: "Sorry, I encountered an error trying to get an answer from Alfa. Check the console for details." });
  }
}

console.log('Background service worker started.'); 