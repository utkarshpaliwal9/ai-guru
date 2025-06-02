chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ASK_QUESTION') {
    console.log('Background: Received question:', request.question);

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
            
            // --- Alfa API Integration Start ---
            const pageContent = response.content;
            const userQuestion = request.question;

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
                
                // Create a comprehensive prompt combining page content and user question
                const prompt = `Based on the following webpage content, please answer the user's question.

Webpage Content:
${pageContent}

User's Question: ${userQuestion}

Please provide a helpful and accurate answer based on the content above.`;
                
                console.log("Background: Prompt being sent:", prompt.substring(0, 300) + "...");

                // Try using chat completions endpoint (more standard)
                const apiResponse = await fetch(`${API_HOST}/chat/completions`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${AUTH_TOKEN}`,
                    "x-claim": PROJECT_ID
                  },
                  body: JSON.stringify({
                    model: "gpt-4o-mini", // or whatever model Alfa supports
                    messages: [
                      {
                        role: "system",
                        content: "You are a helpful assistant that answers questions based on webpage content."
                      },
                      {
                        role: "user", 
                        content: prompt
                      }
                    ],
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
                    
                    // Try the simpler completions endpoint
                    const altResponse = await fetch(`${API_HOST}/completions`, {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${AUTH_TOKEN}`,
                        "x-claim": PROJECT_ID
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
                console.error("Background: Failed to call Alfa API or process its response:", error);
                sendResponse({ answer: "Sorry, I encountered an error trying to get an answer from Alfa. Check the console for details." });
              }
            });
            // --- Alfa API Integration End ---

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

console.log('Background service worker started.'); 