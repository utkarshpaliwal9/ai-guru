console.log('Content script loaded.');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_PAGE_CONTENT') {
    console.log('Content script: Received GET_PAGE_CONTENT for question:', request.question);
    
    // Attempt to extract the main content of the page.
    // This is a simple approach; more sophisticated methods might be needed for complex pages.
    let content = '';
    const mainElement = document.querySelector('main');
    if (mainElement) {
      content = mainElement.innerText;
    } else {
      content = document.body.innerText; // Fallback to entire body
    }

    if (!content || content.trim() === '') {
        // Try to get text from article, div[role="main"], etc.
        const articleElement = document.querySelector('article');
        if(articleElement) content = articleElement.innerText;
        else {
            const roleMain = document.querySelector('div[role="main"]');
            if(roleMain) content = roleMain.innerText;
        }
    }

    console.log('Content script: Extracted content snippet:', content.substring(0, 200) + "...");
    sendResponse({ content: content });
  }
  return true; // Keep the message channel open for asynchronous response, if needed in future.
}); 