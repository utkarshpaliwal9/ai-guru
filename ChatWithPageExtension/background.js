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
        // After injecting, content.js will send a message with the content.
        // We need a way to correlate this specific request with the content message.
        // For simplicity now, we will just send the question to the content script.
        // A more robust solution would use a request ID.

        chrome.tabs.sendMessage(activeTab.id, { type: "GET_PAGE_CONTENT", question: request.question }, async (response) => {
          if (chrome.runtime.lastError) {
            console.error("Background: Error receiving content from content script:", chrome.runtime.lastError.message);
            sendResponse({ answer: "Error processing page content." });
            return;
          }
          if (response && response.content) {
            console.log("Background: Received content snippet from content script:", response.content.substring(0, 100) + "...");
            
            // --- AI/NLP Integration Start ---
            const pageContent = response.content;
            const userQuestion = request.question;

            // TODO: Replace with your actual API endpoint and key management strategy.
            // IMPORTANT: Do NOT hardcode API keys directly in the extension. 
            // Consider using chrome.storage.local to store user-provided keys or an authentication flow with a backend.
            const API_ENDPOINT = "YOUR_LLM_API_ENDPOINT_HERE"; 
            const API_KEY = "YOUR_API_KEY_HERE"; // Replace this or manage securely

            try {
              console.log("Background: Sending content and question to AI API.");
              const apiResponse = await fetch(API_ENDPOINT, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${API_KEY}` // Adjust auth based on your API
                },
                body: JSON.stringify({
                  context: pageContent, // The content extracted from the page
                  question: userQuestion // The user's question
                  // Adjust the payload structure according to your LLM API's requirements
                })
              });

              if (!apiResponse.ok) {
                const errorData = await apiResponse.text();
                console.error("Background: AI API Error:", apiResponse.status, errorData);
                sendResponse({ answer: `Sorry, there was an error with the AI service (${apiResponse.status}).` });
                return;
              }

              const result = await apiResponse.json();
              // TODO: Adjust based on the actual structure of your API's response
              const answer = result.answer || (result.data && result.data.answer) || "No answer found in API response."; 
              
              console.log("Background: Received answer from AI API:", answer);
              sendResponse({ answer: answer });

            } catch (error) {
              console.error("Background: Failed to call AI API or process its response:", error);
              sendResponse({ answer: "Sorry, I encountered an error trying to get an answer." });
            }
            // --- AI/NLP Integration End ---

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