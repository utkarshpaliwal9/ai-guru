document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendButton');
  const userInput = document.getElementById('userInput');
  const messagesDiv = document.getElementById('messages');
  const resizeGrip = document.getElementById('resizeGrip');
  const agentModeCheckbox = document.getElementById('agentMode');
  const tabsList = document.getElementById('tabsList');
  const newTabBtn = document.getElementById('newTabBtn');
  const body = document.body;

  let currentFontSizeScale = 1; // Default scale
  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  let activeTabId = 1;
  let nextTabId = 2;
  let tabData = {}; // Store conversations per tab

  // New default dimensions (smaller)
  const DEFAULT_WIDTH = 500;
  const DEFAULT_HEIGHT = 500;
  const MIN_WIDTH = 250;
  const MIN_HEIGHT = 300;
  
  // Maximum size set to reasonable limits for Chrome extension popups
  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 700;

  console.log(`Max popup size: ${MAX_WIDTH}x${MAX_HEIGHT}`);

  // Initialize tab data structure
  function initializeTabData() {
    tabData[activeTabId] = {
      messages: [],
      agentMode: false,
      name: 'Chat 1'
    };
  }

  // Load saved preferences and tab data
  chrome.storage.local.get(['fontSizeScale', 'popupWidth', 'popupHeight', 'tabData', 'activeTabId', 'nextTabId'], function(result) {
    if (result.fontSizeScale) {
      currentFontSizeScale = result.fontSizeScale;
      applyFontSize();
    }
    
    // Apply saved popup size or use new defaults
    const width = result.popupWidth || DEFAULT_WIDTH;
    const height = result.popupHeight || DEFAULT_HEIGHT;
    setPopupSize(width, height);
    
    // Load tab data
    if (result.tabData && Object.keys(result.tabData).length > 0) {
      tabData = result.tabData;
      activeTabId = result.activeTabId || 1;
      nextTabId = result.nextTabId || 2;
      
      // Rebuild tabs UI
      rebuildTabsUI();
    } else {
      // Initialize with default tab
      initializeTabData();
    }
    
    // Load current tab's data
    loadCurrentTab();
  });

  function rebuildTabsUI() {
    tabsList.innerHTML = '';
    
    // Get tab IDs in order and recreate tabs with their stored names
    Object.keys(tabData).forEach(tabId => {
      const tab = document.createElement('div');
      tab.className = 'tab';
      tab.dataset.tabId = tabId;
      
      const title = document.createElement('span');
      title.className = 'tab-title';
      // Use stored name or generate based on original creation order
      title.textContent = tabData[tabId].name || `Chat ${tabId}`;
      
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Close tab';
      
      tab.appendChild(title);
      
      // Only add close button if there's more than one tab
      if (Object.keys(tabData).length > 1) {
        tab.appendChild(closeBtn);
      }
      
      tabsList.appendChild(tab);
      
      // Add event listeners
      tab.addEventListener('click', (e) => {
        if (e.target !== closeBtn) {
          switchToTab(parseInt(tabId));
        }
      });
      
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeTab(parseInt(tabId));
      });
    });
    
    // Set active tab
    setActiveTab(activeTabId);
  }

  function createTabElement(tabId) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.dataset.tabId = tabId;
    
    const title = document.createElement('span');
    title.className = 'tab-title';
    // Calculate tab number based on current number of open tabs at creation time
    const currentTabCount = Object.keys(tabData).length;
    title.textContent = `Chat ${currentTabCount}`;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'tab-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.title = 'Close tab';
    
    tab.appendChild(title);
    
    // Only add close button if there's more than one tab
    if (Object.keys(tabData).length > 1) {
      tab.appendChild(closeBtn);
    }
    
    tabsList.appendChild(tab);
    
    // Add event listeners
    tab.addEventListener('click', (e) => {
      if (e.target !== closeBtn) {
        switchToTab(tabId);
      }
    });
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(tabId);
    });
  }

  function switchToTab(tabId) {
    // Save current tab's state
    saveCurrentTabState();
    
    // Switch active tab
    activeTabId = tabId;
    setActiveTab(tabId);
    
    // Load new tab's data
    loadCurrentTab();
    
    // Save active tab ID
    chrome.storage.local.set({ activeTabId: activeTabId });
  }

  function setActiveTab(tabId) {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    
    const activeTab = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (activeTab) {
      activeTab.classList.add('active');
    }
  }

  function createNewTab() {
    const newTabId = nextTabId++;
    const currentTabCount = Object.keys(tabData).length + 1; // +1 for the new tab being created
    
    // Initialize new tab data with its name
    tabData[newTabId] = {
      messages: [],
      agentMode: false,
      name: `Chat ${currentTabCount}`
    };
    
    // Create new tab element
    createTabElement(newTabId);
    
    // Update close buttons visibility
    updateCloseButtonsVisibility();
    
    // Switch to new tab
    switchToTab(newTabId);
    
    // Save state
    saveTabState();
  }

  function closeTab(tabId) {
    // Don't close if it's the only tab
    if (Object.keys(tabData).length <= 1) {
      return;
    }
    
    // Remove tab data
    delete tabData[tabId];
    
    // Remove tab element
    const tabElement = document.querySelector(`[data-tab-id="${tabId}"]`);
    if (tabElement) {
      tabElement.remove();
    }
    
    // If closing active tab, switch to another tab
    if (activeTabId === tabId) {
      const remainingTabIds = Object.keys(tabData).map(id => parseInt(id));
      activeTabId = remainingTabIds[0];
      setActiveTab(activeTabId);
      loadCurrentTab();
    }
    
    // Update close buttons visibility
    updateCloseButtonsVisibility();
    
    // Save state
    saveTabState();
  }

  function updateCloseButtonsVisibility() {
    const hasMultipleTabs = Object.keys(tabData).length > 1;
    
    document.querySelectorAll('.tab-close').forEach(closeBtn => {
      closeBtn.style.display = hasMultipleTabs ? 'flex' : 'none';
    });
  }

  function saveCurrentTabState() {
    if (tabData[activeTabId]) {
      tabData[activeTabId].agentMode = agentModeCheckbox.checked;
      // Messages are saved in real-time, so no need to collect them here
    }
  }

  function loadCurrentTab() {
    if (!tabData[activeTabId]) {
      tabData[activeTabId] = { messages: [], agentMode: false };
    }
    
    const currentTab = tabData[activeTabId];
    
    // Set agent mode
    agentModeCheckbox.checked = currentTab.agentMode;
    updateInputPlaceholder();
    
    // Load messages
    messagesDiv.innerHTML = '';
    if (currentTab.messages && Array.isArray(currentTab.messages)) {
      currentTab.messages.forEach(message => {
        displayMessage(message.sender, message.text, false); // false = don't save to storage again
      });
    }
  }

  function saveTabState() {
    chrome.storage.local.set({
      tabData: tabData,
      activeTabId: activeTabId,
      nextTabId: nextTabId
    });
  }

  // New tab button event listener
  newTabBtn.addEventListener('click', createNewTab);

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

  function saveMessageToHistory(sender, text) {
    if (tabData[activeTabId]) {
      if (!tabData[activeTabId].messages) {
        tabData[activeTabId].messages = [];
      }
      tabData[activeTabId].messages.push({ sender, text, timestamp: Date.now() });
      
      // Keep only the last 50 messages per tab to avoid storage bloat
      tabData[activeTabId].messages = tabData[activeTabId].messages.slice(-50);
      
      saveTabState();
    }
  }

  function clearConversationHistory() {
    if (tabData[activeTabId]) {
      tabData[activeTabId].messages = [];
      messagesDiv.innerHTML = '';
      saveTabState();
      console.log(`Conversation history cleared for tab ${activeTabId}`);
    }
  }

  // Add clear conversation button (we can add this to UI later)
  function addClearButton() {
    const clearButton = document.createElement('button');
    clearButton.textContent = 'Clear Chat';
    clearButton.className = 'clear-chat-btn';
    clearButton.addEventListener('click', clearConversationHistory);
    document.querySelector('.controls').appendChild(clearButton);
  }

  // Add the clear button
  addClearButton();

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
    if (tabData[activeTabId]) {
      tabData[activeTabId].agentMode = agentModeCheckbox.checked;
      saveTabState();
    }
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
    
    // Capture the current tab ID when sending the message
    const sendingTabId = activeTabId;
    
    // Display user's question
    displayMessage('User', question);
    userInput.value = '';

    // Show processing message based on agent mode
    const processingMessage = agentModeCheckbox.checked ? 
                            'Processing agent request...' : 
                            'Analyzing page content and images...';
    
    displayMessage('System', processingMessage, false); // Don't save system messages to history

    // Send the question to the background script with agent mode preference
    chrome.runtime.sendMessage({ 
      type: 'ASK_QUESTION', 
      question: question, 
      agentMode: agentModeCheckbox.checked 
    }, function(response) {
      // Check if we're still on the same tab that sent the message
      if (sendingTabId !== activeTabId) {
        // We switched tabs - need to handle response for the original tab
        handleResponseForSpecificTab(sendingTabId, response, processingMessage);
        return;
      }
      
      // We're still on the same tab - handle response normally
      handleResponseForCurrentTab(response, processingMessage);
    });
  });

  function handleResponseForCurrentTab(response, processingMessage) {
    // Remove the processing message
    const messages = messagesDiv.children;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && (lastMessage.textContent === 'Analyzing page content and images...' || 
                       lastMessage.text === 'Processing agent request...')) {
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
  }

  function handleResponseForSpecificTab(tabId, response, processingMessage) {
    // Store the response in the specific tab's message history
    if (!tabData[tabId]) {
      return; // Tab was closed
    }
    
    // Remove the processing message from that tab's history
    if (tabData[tabId].messages && tabData[tabId].messages.length > 0) {
      const lastMessage = tabData[tabId].messages[tabData[tabId].messages.length - 1];
      if (lastMessage && lastMessage.sender === 'System' && 
          (lastMessage.text === 'Analyzing page content and images...' || 
           lastMessage.text === 'Processing agent request...')) {
        tabData[tabId].messages.pop(); // Remove the processing message
      }
    }
    
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      addMessageToTabHistory(tabId, 'Error', 'Could not get a response from the background script.');
      return;
    }
    
    if (response && response.answer) {
      if (response.isModification) {
        addMessageToTabHistory(tabId, 'Agent', response.answer);
      } else {
        addMessageToTabHistory(tabId, 'Bot', response.answer);
      }
    } else {
      addMessageToTabHistory(tabId, 'Bot', 'Sorry, I could not get an answer.');
    }
    
    // Save the updated tab data
    saveTabState();
  }

  function addMessageToTabHistory(tabId, sender, text) {
    if (!tabData[tabId]) {
      return;
    }
    
    if (!tabData[tabId].messages) {
      tabData[tabId].messages = [];
    }
    
    tabData[tabId].messages.push({ sender, text, timestamp: Date.now() });
    
    // Keep only the last 50 messages per tab to avoid storage bloat
    tabData[tabId].messages = tabData[tabId].messages.slice(-50);
  }

  userInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      sendButton.click();
    }
  });

  function displayMessage(sender, message, saveToHistory = true) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message'); // Add a general message class
    if (sender === 'User') {
      messageElement.classList.add('user-message');
      messageElement.textContent = message; // Keep user messages as plain text for security
    } else if (sender === 'Bot' || sender === 'Error') {
      messageElement.classList.add('bot-message');
      if (sender === 'Error') {
        messageElement.classList.add('error-message'); // Specific class for errors
        messageElement.textContent = message; // Keep error messages as plain text
      } else {
        // Parse markdown for bot messages
        messageElement.innerHTML = parseMarkdown(message);
      }
    } else if (sender === 'Agent') {
      messageElement.classList.add('agent-message');
      // Parse markdown for agent messages too
      messageElement.innerHTML = parseMarkdown(message);
    } else if (sender === 'System') {
      messageElement.classList.add('system-message');
      messageElement.textContent = message; // Keep system messages as plain text
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom

    if (saveToHistory) {
      saveMessageToHistory(sender, message);
    }
  }

  function parseMarkdown(text) {
    // Escape HTML to prevent XSS attacks
    let html = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Parse markdown formatting
    html = html
      // Code blocks (triple backticks)
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code (single backticks)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Bold text (**text**)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      // Italic text (*text*)
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      // Numbered lists (1. item)
      .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
      // Bullet points (- item or * item)
      .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
      // Headers (# Header)
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // Line breaks
      .replace(/\n/g, '<br>');
    
    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/(<li>.*<\/li>)(\s*<br>\s*<li>.*<\/li>)*/g, (match) => {
      const items = match.replace(/<br>\s*/g, '').replace(/\s*$/, '');
      return '<ul>' + items + '</ul>';
    });
    
    return html;
  }
}); 