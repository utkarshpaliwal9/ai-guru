document.addEventListener('DOMContentLoaded', function() {
  // Font size controls
  const increaseFontButton = document.getElementById('increaseFont');
  const decreaseFontButton = document.getElementById('decreaseFont');
  const fontSizePreview = document.getElementById('currentFontSizePreview');

  // Credential controls
  const authTokenInput = document.getElementById('authToken');
  const projectIdInput = document.getElementById('projectId');
  const saveCredentialsButton = document.getElementById('saveCredentials');
  const clearCredentialsButton = document.getElementById('clearCredentials');
  const toggleAuthTokenButton = document.getElementById('toggleAuthToken');
  const credentialsStatus = document.getElementById('credentialsStatus');

  // Agent management controls
  const agentNameInput = document.getElementById('agentName');
  const agentEndpointInput = document.getElementById('agentEndpoint');
  const agentApiKeyInput = document.getElementById('agentApiKey');
  const addAgentButton = document.getElementById('addAgent');
  const cancelEditButton = document.getElementById('cancelEdit');
  const toggleAgentApiKeyButton = document.getElementById('toggleAgentApiKey');
  const agentStatus = document.getElementById('agentStatus');
  const agentsList = document.getElementById('agentsList');
  const noAgentsMessage = document.getElementById('noAgentsMessage');
  const addExtraFieldButton = document.getElementById('addExtraField');
  const extraFieldsContainer = document.getElementById('extraFieldsContainer');

  let currentFontSizeScale = 1; // Default scale
  const FONT_SCALE_STEP = 0.1;
  const MIN_FONT_SCALE = 0.7;
  const MAX_FONT_SCALE = 1.5;
  
  let editingAgentId = null; // Track which agent is being edited

  // Load saved font size and update preview
  chrome.storage.local.get(['fontSizeScale'], function(result) {
    if (result.fontSizeScale) {
      currentFontSizeScale = result.fontSizeScale;
    }
    updateFontSizePreview();
  });

  // Load saved credentials and agents
  loadCredentials();
  loadAgents();

  function updateFontSizePreview() {
    fontSizePreview.textContent = `${Math.round(currentFontSizeScale * 100)}%`;
    if (currentFontSizeScale <= MIN_FONT_SCALE) fontSizePreview.textContent = "Smallest";
    if (currentFontSizeScale >= MAX_FONT_SCALE) fontSizePreview.textContent = "Largest";
    // You could also apply the font size to the preview text itself for a direct visual cue
    // fontSizePreview.style.fontSize = `${currentFontSizeScale}em`; 
  }

  function updateAndStoreFontSize(newScale) {
    currentFontSizeScale = Math.max(MIN_FONT_SCALE, Math.min(newScale, MAX_FONT_SCALE));
    chrome.storage.local.set({fontSizeScale: currentFontSizeScale}, function() {
      console.log('Font size scale saved:', currentFontSizeScale);
    });
    updateFontSizePreview();
  }

  function loadCredentials() {
    chrome.storage.local.get(['alfaAuthToken', 'alfaProjectId'], function(result) {
      if (result.alfaAuthToken) {
        authTokenInput.value = result.alfaAuthToken;
      }
      if (result.alfaProjectId) {
        projectIdInput.value = result.alfaProjectId;
      }
      updateCredentialsStatus();
    });
  }

  function saveCredentials() {
    const authToken = authTokenInput.value.trim();
    const projectId = projectIdInput.value.trim();

    if (!authToken || !projectId) {
      showStatusMessage('Please fill in both fields.', 'error');
      return;
    }

    chrome.storage.local.set({
      alfaAuthToken: authToken,
      alfaProjectId: projectId
    }, function() {
      console.log('Credentials saved successfully');
      showStatusMessage('Credentials saved successfully!', 'success');
      updateCredentialsStatus();
    });
  }

  function clearCredentials() {
    chrome.storage.local.remove(['alfaAuthToken', 'alfaProjectId'], function() {
      console.log('Credentials cleared');
      authTokenInput.value = '';
      projectIdInput.value = '';
      showStatusMessage('Credentials cleared.', 'success');
      updateCredentialsStatus();
    });
  }

  function togglePasswordVisibility() {
    if (authTokenInput.type === 'password') {
      authTokenInput.type = 'text';
      toggleAuthTokenButton.textContent = 'Hide';
    } else {
      authTokenInput.type = 'password';
      toggleAuthTokenButton.textContent = 'Show';
    }
  }

  function showStatusMessage(message, type) {
    credentialsStatus.textContent = message;
    credentialsStatus.className = `status-message ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        credentialsStatus.style.display = 'none';
      }, 3000);
    }
  }

  function updateCredentialsStatus() {
    chrome.storage.local.get(['alfaAuthToken', 'alfaProjectId'], function(result) {
      if (result.alfaAuthToken && result.alfaProjectId) {
        showStatusMessage('✓ Credentials are configured', 'success');
      } else {
        credentialsStatus.style.display = 'none';
      }
    });
  }

  // Agent management functions
  function loadAgents() {
    chrome.storage.local.get(['agents'], function(result) {
      const agents = result.agents || [];
      renderAgents(agents);
    });
  }

  function renderAgents(agents) {
    if (agents.length === 0) {
      noAgentsMessage.style.display = 'block';
      agentsList.innerHTML = '';
      agentsList.appendChild(noAgentsMessage);
      return;
    }

    noAgentsMessage.style.display = 'none';
    agentsList.innerHTML = '';

    agents.forEach((agent, index) => {
      const agentCard = document.createElement('div');
      agentCard.className = 'agent-card';
      
      // Build extra fields display
      let extraFieldsHtml = '';
      if (agent.extraFields && Object.keys(agent.extraFields).length > 0) {
        const extraFieldsList = Object.entries(agent.extraFields)
          .map(([key, value]) => `${key}: ${value}`)
          .join(', ');
        extraFieldsHtml = `<div class="agent-extra-fields">Extra: ${extraFieldsList}</div>`;
      }
      
      agentCard.innerHTML = `
        <div class="agent-info">
          <div class="agent-name">@${agent.name}</div>
          <div class="agent-endpoint">${agent.endpoint}</div>
          ${extraFieldsHtml}
        </div>
        <div class="agent-actions">
          <button class="edit-agent-btn" data-index="${index}">Edit</button>
          <button class="delete-agent-btn" data-index="${index}">Delete</button>
        </div>
      `;
      agentsList.appendChild(agentCard);
    });

    // Add event listeners to edit/delete buttons
    document.querySelectorAll('.edit-agent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        editAgent(index, agents[index]);
      });
    });

    document.querySelectorAll('.delete-agent-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        deleteAgent(index, agents[index].name);
      });
    });
  }

  function addAgent() {
    const name = agentNameInput.value.trim();
    const endpoint = agentEndpointInput.value.trim();
    const apiKey = agentApiKeyInput.value.trim();
    const extraFields = getExtraFields();

    if (!name || !endpoint || !apiKey) {
      showAgentStatusMessage('Please fill in all required fields (Name, Endpoint, API Key).', 'error');
      return;
    }

    // Validate agent name (no spaces, no special characters except underscore)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      showAgentStatusMessage('Agent name can only contain letters, numbers, and underscores.', 'error');
      return;
    }

    // Validate endpoint URL
    try {
      new URL(endpoint);
    } catch (e) {
      showAgentStatusMessage('Please enter a valid endpoint URL.', 'error');
      return;
    }

    chrome.storage.local.get(['agents'], function(result) {
      const agents = result.agents || [];
      
      // Check if agent name already exists (unless editing)
      const existingIndex = agents.findIndex(agent => agent.name.toLowerCase() === name.toLowerCase());
      if (existingIndex !== -1 && editingAgentId !== existingIndex) {
        showAgentStatusMessage('An agent with this name already exists.', 'error');
        return;
      }

      const newAgent = { 
        name, 
        endpoint, 
        apiKey,
        extraFields: extraFields // Include extra fields
      };

      if (editingAgentId !== null) {
        // Update existing agent
        agents[editingAgentId] = newAgent;
        showAgentStatusMessage('Agent updated successfully!', 'success');
        cancelEditAgent();
      } else {
        // Add new agent
        agents.push(newAgent);
        showAgentStatusMessage('Agent added successfully!', 'success');
      }

      // Save agents
      chrome.storage.local.set({ agents }, function() {
        console.log('Agents saved successfully');
        renderAgents(agents);
        clearAgentForm();
      });
    });
  }

  function editAgent(index, agent) {
    editingAgentId = index;
    agentNameInput.value = agent.name;
    agentEndpointInput.value = agent.endpoint;
    agentApiKeyInput.value = agent.apiKey;
    
    // Load extra fields if they exist
    if (agent.extraFields) {
      setExtraFields(agent.extraFields);
    } else {
      clearExtraFields();
    }
    
    addAgentButton.textContent = 'Update Agent';
    cancelEditButton.style.display = 'inline-block';
    
    showAgentStatusMessage('Editing agent...', 'success');
  }

  function cancelEditAgent() {
    editingAgentId = null;
    addAgentButton.textContent = 'Add Agent';
    cancelEditButton.style.display = 'none';
    clearAgentForm();
    agentStatus.style.display = 'none';
  }

  function deleteAgent(index, agentName) {
    if (confirm(`Are you sure you want to delete the agent "${agentName}"?`)) {
      chrome.storage.local.get(['agents'], function(result) {
        const agents = result.agents || [];
        agents.splice(index, 1);
        
        chrome.storage.local.set({ agents }, function() {
          console.log('Agent deleted successfully');
          renderAgents(agents);
          showAgentStatusMessage('Agent deleted successfully.', 'success');
        });
      });
    }
  }

  function clearAgentForm() {
    agentNameInput.value = '';
    agentEndpointInput.value = '';
    agentApiKeyInput.value = '';
    clearExtraFields(); // Clear extra fields too
  }

  function showAgentStatusMessage(message, type) {
    agentStatus.textContent = message;
    agentStatus.className = `status-message ${type}`;
    
    // Auto-hide success messages after 3 seconds
    if (type === 'success') {
      setTimeout(() => {
        agentStatus.style.display = 'none';
      }, 3000);
    }
  }

  function toggleAgentPasswordVisibility() {
    if (agentApiKeyInput.type === 'password') {
      agentApiKeyInput.type = 'text';
      toggleAgentApiKeyButton.textContent = 'Hide';
    } else {
      agentApiKeyInput.type = 'password';
      toggleAgentApiKeyButton.textContent = 'Show';
    }
  }

  // Extra fields management functions
  function createExtraFieldPair(key = '', value = '') {
    const fieldPair = document.createElement('div');
    fieldPair.className = 'extra-field-pair';
    
    fieldPair.innerHTML = `
      <input type="text" class="key-input" placeholder="Key (e.g., model)" value="${key}">
      <input type="text" class="value-input" placeholder="Value (e.g., gpt-4)" value="${value}">
      <button type="button" class="remove-field-btn">Remove</button>
    `;
    
    // Add remove functionality
    const removeBtn = fieldPair.querySelector('.remove-field-btn');
    removeBtn.addEventListener('click', () => {
      fieldPair.remove();
    });
    
    return fieldPair;
  }

  function addExtraField() {
    const fieldPair = createExtraFieldPair();
    extraFieldsContainer.appendChild(fieldPair);
    
    // Focus on the key input of the new field
    const keyInput = fieldPair.querySelector('.key-input');
    keyInput.focus();
  }

  function getExtraFields() {
    const extraFields = {};
    const fieldPairs = extraFieldsContainer.querySelectorAll('.extra-field-pair');
    
    fieldPairs.forEach(pair => {
      const keyInput = pair.querySelector('.key-input');
      const valueInput = pair.querySelector('.value-input');
      const key = keyInput.value.trim();
      const value = valueInput.value.trim();
      
      if (key && value) {
        extraFields[key] = value;
      }
    });
    
    return extraFields;
  }

  function setExtraFields(extraFields) {
    // Clear existing fields
    extraFieldsContainer.innerHTML = '';
    
    // Add fields from the object
    if (extraFields && typeof extraFields === 'object') {
      Object.entries(extraFields).forEach(([key, value]) => {
        const fieldPair = createExtraFieldPair(key, value);
        extraFieldsContainer.appendChild(fieldPair);
      });
    }
  }

  function clearExtraFields() {
    extraFieldsContainer.innerHTML = '';
  }

  // Event listeners
  increaseFontButton.addEventListener('click', function() {
    updateAndStoreFontSize(currentFontSizeScale + FONT_SCALE_STEP);
  });

  decreaseFontButton.addEventListener('click', function() {
    updateAndStoreFontSize(currentFontSizeScale - FONT_SCALE_STEP);
  });

  saveCredentialsButton.addEventListener('click', saveCredentials);
  clearCredentialsButton.addEventListener('click', clearCredentials);
  toggleAuthTokenButton.addEventListener('click', togglePasswordVisibility);

  // Agent management event listeners
  addAgentButton.addEventListener('click', addAgent);
  cancelEditButton.addEventListener('click', cancelEditAgent);
  toggleAgentApiKeyButton.addEventListener('click', toggleAgentPasswordVisibility);
  addExtraFieldButton.addEventListener('click', addExtraField);

  // Allow Enter key to save credentials
  authTokenInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      saveCredentials();
    }
  });

  projectIdInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      saveCredentials();
    }
  });

  // Allow Enter key to add/update agent
  agentNameInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      addAgent();
    }
  });

  agentEndpointInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      addAgent();
    }
  });

  agentApiKeyInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
      addAgent();
    }
  });

  console.log("Options page loaded.");
}); 