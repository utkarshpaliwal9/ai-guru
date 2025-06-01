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
            const API_HOST = "https://clip-api.gamma.qa.us-west-2.aws.avalara.io";
            const CHAT_HOST = "https://clip-chat-api.gamma.qa.us-west-2.aws.avalara.io";
            
            // TODO: Replace these with your actual values
            // IMPORTANT: Do NOT hardcode these directly in production. Use chrome.storage.local or a secure method.
            const AUTH_TOKEN = "YOUR_STATIC_AUTH_TOKEN"; // Replace with your actual token
            const PROJECT_ID = "YOUR_PROJECT_UUID"; // Replace with your project UUID

            try {
              console.log("Background: Sending content and question to Alfa API.");
              
              // Create a combined context from page content and user question
              const combinedQuery = `Context: ${pageContent}\n\nQuestion: ${userQuestion}`;
              
              console.log("Background: Combined query being sent:", combinedQuery.substring(0, 200) + "...");

              // Option 1: Use RAG context API (simpler for your use case)
              const apiResponse = await fetch(`${API_HOST}/indices/rag-context`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${AUTH_TOKEN}`,
                  "x-claim": PROJECT_ID
                },
                body: JSON.stringify({
                  query: combinedQuery,
                  k: 3 // Number of results to retrieve
                })
              });

              if (!apiResponse.ok) {
                const errorData = await apiResponse.text();
                console.error("Background: Alfa API Error:", apiResponse.status, errorData);
                sendResponse({ answer: `Sorry, there was an error with the Alfa service (${apiResponse.status}). Error: ${errorData}` });
                return;
              }

              const result = await apiResponse.json();
              console.log("Background: Received result from Alfa API:", result);
              
              // Extract answer from RAG context response
              // The exact structure depends on Alfa's response format - you may need to adjust this
              let answer = "I received a response but couldn't extract a clear answer.";
              
              if (result.context && result.context.length > 0) {
                // If the RAG context returns relevant information
                answer = `Based on the page content, here's what I found: ${result.context[0].content || result.context[0].text || 'No specific answer found.'}`;
              } else if (result.answer) {
                answer = result.answer;
              } else if (result.response) {
                answer = result.response;
              } else {
                answer = `I processed your question "${userQuestion}" but couldn't find a specific answer in the page content. The API returned: ${JSON.stringify(result).substring(0, 200)}...`;
              }
              
              console.log("Background: Extracted answer:", answer);
              sendResponse({ answer: answer });

            } catch (error) {
              console.error("Background: Failed to call Alfa API or process its response:", error);
              sendResponse({ answer: "Sorry, I encountered an error trying to get an answer from Alfa. Check the console for details." });
            }
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