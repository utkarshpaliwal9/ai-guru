document.addEventListener('DOMContentLoaded', function() {
  const sendButton = document.getElementById('sendButton');
  const userInput = document.getElementById('userInput');
  const messagesDiv = document.getElementById('messages');

  sendButton.addEventListener('click', function() {
    const question = userInput.value;
    if (question.trim() === '') {
      return;
    }
    // Display user's question
    displayMessage('User', question);
    userInput.value = '';

    // Send the question to the background script
    chrome.runtime.sendMessage({ type: 'ASK_QUESTION', question: question }, function(response) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        displayMessage('Error', 'Could not get a response from the background script.');
        return;
      }
      if (response && response.answer) {
        displayMessage('Bot', response.answer);
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
    messageElement.innerHTML = `<strong>${sender}:</strong> ${message}`;
    messagesDiv.appendChild(messageElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight; // Scroll to the bottom
  }
}); 