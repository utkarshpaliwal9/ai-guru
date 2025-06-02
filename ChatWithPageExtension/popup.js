document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendButton');
  const userInput = document.getElementById('userInput');
  const messagesDiv = document.getElementById('messages');
  const resizeGrip = document.getElementById('resizeGrip');
  const agentModeCheckbox = document.getElementById('agentMode');
  const body = document.body;

  let currentFontSizeScale = 1; // Default scale
  let isResizing = false;
  let startX, startY, startWidth, startHeight;

  // New default dimensions (smaller)
  const DEFAULT_WIDTH = 500;
  const DEFAULT_HEIGHT = 500;
  const MIN_WIDTH = 250;
  const MIN_HEIGHT = 300;
  
  // Maximum size set to reasonable limits for Chrome extension popups
  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 700;

  console.log(`Max popup size: ${MAX_WIDTH}x${MAX_HEIGHT}`);

  // Load saved font size, popup size, and agent mode preference
  chrome.storage.local.get(['fontSizeScale', 'popupWidth', 'popupHeight', 'agentMode'], function(result) {
    if (result.fontSizeScale) {
      currentFontSizeScale = result.fontSizeScale;
      applyFontSize();
    }
    
    // Apply saved popup size or use new defaults
    const width = result.popupWidth || DEFAULT_WIDTH;
    const height = result.popupHeight || DEFAULT_HEIGHT;
    setPopupSize(width, height);
    
    // Set agent mode checkbox
    agentModeCheckbox.checked = result.agentMode || false;
    updateInputPlaceholder();
  });

  function applyFontSize() {
    messagesDiv.style.fontSize = `${currentFontSizeScale}em`;
  }

  function setPopupSize(width, height) {
    // Ensure dimensions are within limits (using calculated max sizes)
    const constrainedWidth = Math.max(MIN_WIDTH, Math.min(width, MAX_WIDTH));
    const constrainedHeight = Math.max(MIN_HEIGHT, Math.min(height, MAX_HEIGHT));
    
    console.log(`Resize attempt: requested ${width}x${height}, constrained to ${constrainedWidth}x${constrainedHeight}, limits: ${MIN_WIDTH}-${MAX_WIDTH} x ${MIN_HEIGHT}-${MAX_HEIGHT}`);
    
    // Try multiple approaches to resize the popup
    body.style.width = constrainedWidth + 'px';
    body.style.height = constrainedHeight + 'px';
    
    // Also try setting max-width and max-height to override any browser limitations
    body.style.maxWidth = MAX_WIDTH + 'px';
    body.style.maxHeight = MAX_HEIGHT + 'px';
    body.style.minWidth = MIN_WIDTH + 'px';
    body.style.minHeight = MIN_HEIGHT + 'px';
    
    // Try to resize the document element as well
    document.documentElement.style.width = constrainedWidth + 'px';
    document.documentElement.style.height = constrainedHeight + 'px';
    
    // Try window.resizeTo if available (may not work in extension context but worth trying)
    try {
      if (window.resizeTo) {
        window.resizeTo(constrainedWidth, constrainedHeight);
      }
    } catch (e) {
      console.log('window.resizeTo not available or failed:', e.message);
    }
    
    console.log(`Actual popup size after resize: ${body.offsetWidth}x${body.offsetHeight}`);
  }

  function savePopupSize(width, height) {
    chrome.storage.local.set({
      popupWidth: width,
      popupHeight: height
    });
  }

  // Resize functionality - adapted for bottom-left corner
  resizeGrip.addEventListener('mousedown', function(e) {
    isResizing = true;
    startX = e.clientX;
    startY = e.clientY;
    startWidth = parseInt(document.defaultView.getComputedStyle(body).width, 10);
    startHeight = parseInt(document.defaultView.getComputedStyle(body).height, 10);
    
    body.classList.add('resizing');
    e.preventDefault();
  });

  document.addEventListener('mousemove', function(e) {
    if (!isResizing) return;

    // For bottom-left resize: 
    // - Moving left (negative deltaX) should increase width
    // - Moving down (positive deltaY) should increase height
    const deltaX = startX - e.clientX; // Inverted for left-side resize
    const deltaY = e.clientY - startY; // Normal for bottom resize
    
    const width = startWidth + deltaX;
    const height = startHeight + deltaY;
    
    setPopupSize(width, height);
  });

  document.addEventListener('mouseup', function(e) {
    if (!isResizing) return;
    
    isResizing = false;
    body.classList.remove('resizing');
    
    // Save the new size
    const finalWidth = parseInt(document.defaultView.getComputedStyle(body).width, 10);
    const finalHeight = parseInt(document.defaultView.getComputedStyle(body).height, 10);
    savePopupSize(finalWidth, finalHeight);
    
    console.log(`Popup resized to: ${finalWidth}x${finalHeight}`);
  });

  // Prevent resize grip from interfering with popup closing
  resizeGrip.addEventListener('click', function(e) {
    e.stopPropagation();
  });

  // Save agent mode preference when checkbox changes
  agentModeCheckbox.addEventListener('change', function() {
    chrome.storage.local.set({ agentMode: agentModeCheckbox.checked }, function() {
      console.log('Agent mode preference saved:', agentModeCheckbox.checked);
    });
    updateInputPlaceholder();
  });

  function updateInputPlaceholder() {
    if (agentModeCheckbox.checked) {
      userInput.placeholder = "Ask me to modify the page...";
    } else {
      userInput.placeholder = "Ask a question...";
    }
  }

  sendButton.addEventListener('click', function() {
    const question = userInput.value;
    if (question.trim() === '') {
      return;
    }
    // Display user's question
    displayMessage('User', question);
    userInput.value = '';

    // Show processing message based on agent mode
    const processingMessage = agentModeCheckbox.checked ? 
                            'Processing agent request...' : 
                            'Analyzing page content and images...';
    
    displayMessage('System', processingMessage);

    // Send the question to the background script with agent mode preference
    chrome.runtime.sendMessage({ 
      type: 'ASK_QUESTION', 
      question: question, 
      agentMode: agentModeCheckbox.checked 
    }, function(response) {
      // Remove the processing message
      const messages = messagesDiv.children;
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && (lastMessage.textContent === 'Analyzing page content and images...' || 
                         lastMessage.textContent === 'Processing agent request...')) {
        messagesDiv.removeChild(lastMessage);
      }

      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        displayMessage('Error', 'Could not get a response from the background script.');
        return;
      }
      if (response && response.answer) {
        if (response.isModification) {
          displayMessage('Agent', response.answer);
        } else {
          displayMessage('Bot', response.answer);
        }
      } else {
        displayMessage('Bot', 'Sorry, I could not get an answer.');
      }
    });
  });

  userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      sendButton.click();
    }
  });

  function displayMessage(sender, message) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message'); // Add a general message class
    if (sender === 'User') {
      messageElement.classList.add('user-message');
    } else if (sender === 'Bot' || sender === 'Error') {
      messageElement.classList.add('bot-message');
      if (sender === 'Error') {
        messageElement.classList.add('error-message'); // Specific class for errors
      }
    } else if (sender === 'Agent') {
      messageElement.classList.add('agent-message');
    } else if (sender === 'System') {
      messageElement.classList.add('system-message');
    }

    messageElement.textContent = message; // New line - directly sets the message text
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
  }
}); 