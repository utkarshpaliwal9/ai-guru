document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendButton');
  const userInput = document.getElementById('userInput');
  const messagesDiv = document.getElementById('messages');
  const resizeGrip = document.getElementById('resizeGrip');
  const agentModeCheckbox = document.getElementById('agentMode');
  const tabsList = document.getElementById('tabsList');
  const newTabBtn = document.getElementById('newTabBtn');
  const agentAutocomplete = document.getElementById('agentAutocomplete');
  const body = document.body;

  let currentFontSizeScale = 1; // Default scale
  let isResizing = false;
  let startX, startY, startWidth, startHeight;
  let activeTabId = 1;
  let nextTabId = 2;
  let tabData = {}; // Store conversations per tab
  
  // Autocomplete state
  let autocompleteVisible = false;
  let availableAgents = [];
  let filteredAgents = [];
  let selectedSuggestionIndex = -1;
  let atSymbolPosition = -1;

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

  // Update placeholder when agent mode changes or when @ is typed
  function updateInputPlaceholder() {
    if (agentModeCheckbox.checked) {
      userInput.placeholder = "Ask me to modify the page...";
    } else {
      userInput.placeholder = "Ask a question or use @agentName...";
    }
  }

  // Enhanced input event listener with autocomplete
  userInput.addEventListener('input', function(event) {
    const value = userInput.value;
    const cursorPosition = userInput.selectionStart;
    
    // Find @ symbol before cursor
    const textBeforeCursor = value.substring(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      // Check if @ is at the start or preceded by a space
      const charBeforeAt = lastAtIndex > 0 ? value[lastAtIndex - 1] : ' ';
      
      if (charBeforeAt === ' ' || lastAtIndex === 0) {
        const query = textBeforeCursor.substring(lastAtIndex + 1);
        
        // Only show autocomplete if no space after @
        if (!query.includes(' ')) {
          atSymbolPosition = lastAtIndex;
          showAgentAutocomplete(query);
          return;
        }
      }
    }
    
    // Hide autocomplete if @ not found or conditions not met
    hideAgentAutocomplete();
  });

  // Agent autocomplete functions
  function showAgentAutocomplete(query) {
    // Load agents from storage
    chrome.storage.local.get(['agents'], function(result) {
      availableAgents = result.agents || [];
      
      if (availableAgents.length === 0) {
        hideAgentAutocomplete();
        return;
      }
      
      // Filter agents based on query
      const lowerQuery = query.toLowerCase();
      filteredAgents = availableAgents.filter(agent => 
        agent.name.toLowerCase().includes(lowerQuery)
      );
      
      if (filteredAgents.length === 0) {
        agentAutocomplete.innerHTML = '<div class="no-agents-found">No agents found</div>';
      } else {
        renderAgentSuggestions(filteredAgents);
      }
      
      selectedSuggestionIndex = -1;
      autocompleteVisible = true;
      agentAutocomplete.classList.add('show');
    });
  }
  
  function hideAgentAutocomplete() {
    autocompleteVisible = false;
    agentAutocomplete.classList.remove('show');
    selectedSuggestionIndex = -1;
    atSymbolPosition = -1;
  }
  
  function renderAgentSuggestions(agents) {
    agentAutocomplete.innerHTML = '';
    
    agents.forEach((agent, index) => {
      const suggestion = document.createElement('div');
      suggestion.className = 'agent-suggestion';
      suggestion.dataset.index = index;
      
      // Create agent icon with first letter of name
      const icon = document.createElement('div');
      icon.className = 'agent-icon';
      icon.textContent = agent.name.charAt(0).toUpperCase();
      
      // Create agent details
      const details = document.createElement('div');
      details.className = 'agent-details';
      
      const name = document.createElement('div');
      name.className = 'agent-name';
      name.textContent = `@${agent.name}`;
      
      const endpoint = document.createElement('div');
      endpoint.className = 'agent-endpoint';
      endpoint.textContent = agent.endpoint;
      
      details.appendChild(name);
      details.appendChild(endpoint);
      
      suggestion.appendChild(icon);
      suggestion.appendChild(details);
      
      // Add click handler
      suggestion.addEventListener('click', () => selectAgent(agent));
      
      agentAutocomplete.appendChild(suggestion);
    });
  }
  
  function selectAgent(agent) {
    const currentValue = userInput.value;
    const beforeAt = currentValue.substring(0, atSymbolPosition);
    const afterQuery = currentValue.substring(userInput.selectionStart);
    
    // Insert agent name with space
    const newValue = beforeAt + `@${agent.name} ` + afterQuery;
    userInput.value = newValue;
    
    // Position cursor after the inserted agent name
    const newCursorPosition = beforeAt.length + agent.name.length + 2; // +2 for @ and space
    userInput.setSelectionRange(newCursorPosition, newCursorPosition);
    
    hideAgentAutocomplete();
    userInput.focus();
  }
  
  function highlightSuggestion(index) {
    const suggestions = agentAutocomplete.querySelectorAll('.agent-suggestion');
    
    // Remove previous highlights
    suggestions.forEach(s => s.classList.remove('highlighted'));
    
    if (index >= 0 && index < suggestions.length) {
      suggestions[index].classList.add('highlighted');
      
      // Scroll into view if needed
      const highlighted = suggestions[index];
      const container = agentAutocomplete;
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;
      const itemTop = highlighted.offsetTop;
      const itemBottom = itemTop + highlighted.clientHeight;
      
      if (itemTop < containerTop) {
        container.scrollTop = itemTop;
      } else if (itemBottom > containerBottom) {
        container.scrollTop = itemBottom - container.clientHeight;
      }
    }
  }

  sendButton.addEventListener('click', function() {
    const question = userInput.value;
    if (question.trim() === '') {
      return;
    }
    
    // Parse for @agent syntax - requires at least one space after agent name
    // Matches: @agentName question OR @agentName   question (with multiple spaces)
    // Does NOT match: @agentNamequestion (no space)
    const agentMatch = question.trim().match(/^@(\w+)\s+(.+)/);
    let targetAgent = null;
    let actualQuestion = question;
    
    console.log('Checking for agent syntax in:', question);
    console.log('Agent match result:', agentMatch);
    
    if (agentMatch) {
      targetAgent = agentMatch[1];
      actualQuestion = agentMatch[2].trim();
      
      console.log('Agent detected:', targetAgent);
      console.log('Actual question:', actualQuestion);
      
      // Display user's question with agent highlight
      displayMessage('User', question);
      
      // Show which agent is being addressed
      displayMessage('System', `${String.fromCodePoint(0x1F916)} Routing to agent: @${targetAgent}`, false);
    } else {
      console.log('No agent detected, using regular routing');
      // Display user's question normally
      displayMessage('User', question);
    }
    
    userInput.value = '';

    // Capture the current tab ID when sending the message
    const sendingTabId = activeTabId;

    // Show processing message based on agent mode or target agent
    let processingMessage;
    if (targetAgent) {
      processingMessage = `Processing request for @${targetAgent}...`;
    } else if (agentModeCheckbox.checked) {
      processingMessage = 'Processing agent request...';
    } else {
      processingMessage = 'Uploading content to document service and analyzing...';
    }
    
    // Store reference to the processing message element for reliable removal
    const processingMessageElement = displayMessage('System', processingMessage, false); // Don't save system messages to history

    // Send the question to the background script with agent info
    chrome.runtime.sendMessage({ 
      type: 'ASK_QUESTION', 
      question: actualQuestion,
      originalQuestion: question,
      targetAgent: targetAgent,
      agentMode: agentModeCheckbox.checked 
    }, function(response) {
      // Check if we're still on the same tab that sent the message
      if (sendingTabId !== activeTabId) {
        // We switched tabs - need to handle response for the original tab
        handleResponseForSpecificTab(sendingTabId, response, processingMessage);
        return;
      }
      
      // We're still on the same tab - handle response normally
      handleResponseForCurrentTab(response, processingMessage, processingMessageElement, targetAgent);
    });
  });

  function handleResponseForCurrentTab(response, processingMessage, processingMessageElement, targetAgent) {
    // Remove the processing message using the stored reference
    if (processingMessageElement && processingMessageElement.parentNode) {
      processingMessageElement.parentNode.removeChild(processingMessageElement);
    } else {
      // Fallback: try to find and remove the processing message
      removeProcessingMessageFromUI(processingMessage);
    }

    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      displayMessage('Error', 'Could not get a response from the background script.');
      return;
    }
    
    if (response && response.answer) {
      if (targetAgent) {
        // Response from a specific agent
        displayMessage('Agent', `@${targetAgent}: ${response.answer}`);
      } else if (response.isModification) {
        displayMessage('Agent', response.answer);
      } else {
        displayMessage('Bot', response.answer);
      }
    } else {
      displayMessage('Bot', 'Sorry, I could not get an answer.');
    }
  }

  function removeProcessingMessageFromUI(processingMessage) {
    // Try to find and remove the processing message from the UI
    const messages = messagesDiv.children;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.classList.contains('system-message') && 
          message.textContent === processingMessage) {
        messagesDiv.removeChild(message);
        break;
      }
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
          (lastMessage.text.includes('Analyzing page content') || 
           lastMessage.text.includes('Processing agent request') ||
           lastMessage.text.includes('Processing request for @') ||
           lastMessage.text.includes('Uploading content to document service'))) {
        tabData[tabId].messages.pop(); // Remove the processing message
      }
    }
    
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError.message);
      addMessageToTabHistory(tabId, 'Error', 'Could not get a response from the background script.');
      return;
    }
    
    if (response && response.answer) {
      if (response.targetAgent) {
        // Response from a specific agent
        addMessageToTabHistory(tabId, 'Agent', `@${response.targetAgent}: ${response.answer}`);
      } else if (response.isModification) {
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
    if (event.key === 'Enter' && !autocompleteVisible) {
      sendButton.click();
    }
  });

  // Keyboard navigation for autocomplete
  userInput.addEventListener('keydown', function(event) {
    if (!autocompleteVisible) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, filteredAgents.length - 1);
        highlightSuggestion(selectedSuggestionIndex);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        highlightSuggestion(selectedSuggestionIndex);
        break;
        
      case 'Enter':
      case 'Tab':
        event.preventDefault();
        if (selectedSuggestionIndex >= 0 && selectedSuggestionIndex < filteredAgents.length) {
          selectAgent(filteredAgents[selectedSuggestionIndex]);
        } else if (filteredAgents.length > 0) {
          // If no specific selection, use first agent
          selectAgent(filteredAgents[0]);
        }
        break;
        
      case 'Escape':
        event.preventDefault();
        hideAgentAutocomplete();
        break;
        
      case ' ': // Space key
        // Hide autocomplete when space is pressed
        hideAgentAutocomplete();
        break;
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
      // Check if this is a custom agent response (contains @agentName prefix)
      if (message.startsWith('@')) {
        messageElement.classList.add('custom-agent-message');
        // Parse the agent name and response
        const colonIndex = message.indexOf(':');
        if (colonIndex > 0) {
          const agentName = message.substring(0, colonIndex);
          const agentResponse = message.substring(colonIndex + 1).trim();
          messageElement.innerHTML = `<span class="agent-prefix">${agentName}</span>: ${parseMarkdown(agentResponse)}`;
        } else {
          messageElement.innerHTML = parseMarkdown(message);
        }
      } else {
        // Regular agent message (modification mode)
        messageElement.classList.add('agent-message');
        messageElement.innerHTML = parseMarkdown(message);
      }
    } else if (sender === 'System') {
      messageElement.classList.add('system-message');
      // Check if this is a routing message
      if (message.includes(`${String.fromCodePoint(0x1F916)} Routing to agent:`)) {
        messageElement.classList.add('routing-message');
      }
      messageElement.textContent = message; // Keep system messages as plain text
    }

    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom

    if (saveToHistory) {
      saveMessageToHistory(sender, message);
    }
    
    // Return the message element so it can be referenced later
    return messageElement;
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

  // Hide autocomplete when clicking outside
  document.addEventListener('click', function(event) {
    if (autocompleteVisible && 
        !agentAutocomplete.contains(event.target) && 
        !userInput.contains(event.target)) {
      hideAgentAutocomplete();
    }
  });

  // Also hide when input loses focus (with a small delay to allow for clicking suggestions)
  userInput.addEventListener('blur', function() {
    setTimeout(() => {
      if (autocompleteVisible) {
        hideAgentAutocomplete();
      }
    }, 150);
  });
});