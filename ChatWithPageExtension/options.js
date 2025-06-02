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

  let currentFontSizeScale = 1; // Default scale
  const FONT_SCALE_STEP = 0.1;
  const MIN_FONT_SCALE = 0.7;
  const MAX_FONT_SCALE = 1.5;

  // Load saved font size and update preview
  chrome.storage.local.get(['fontSizeScale'], function(result) {
    if (result.fontSizeScale) {
      currentFontSizeScale = result.fontSizeScale;
    }
    updateFontSizePreview();
  });

  // Load saved credentials
  loadCredentials();

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

  console.log("Options page loaded.");
}); 