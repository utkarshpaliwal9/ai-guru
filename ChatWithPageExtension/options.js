document.addEventListener('DOMContentLoaded', function() {
  const increaseFontButton = document.getElementById('increaseFont');
  const decreaseFontButton = document.getElementById('decreaseFont');
  const fontSizePreview = document.getElementById('currentFontSizePreview');

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

  increaseFontButton.addEventListener('click', function() {
    updateAndStoreFontSize(currentFontSizeScale + FONT_SCALE_STEP);
  });

  decreaseFontButton.addEventListener('click', function() {
    updateAndStoreFontSize(currentFontSizeScale - FONT_SCALE_STEP);
  });

  console.log("Options page loaded.");
}); 