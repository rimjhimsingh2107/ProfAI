        <div class="profai-assistant-message">
          Hi! I noticed you're reading about AI/ML. I can help explain any concepts you find confusing. Just double-click on any term or select text and press Ctrl+Shift+E.
        </div>
        <div class="profai-assistant-actions">
          <button onclick="this.parentElement.parentElement.parentElement.remove()" class="profai-btn-small">Dismiss</button>
          <button onclick="openProfAI()" class="profai-btn-small profai-btn-primary">Open ProfAI</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(assistant);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (assistant.parentNode) {
        assistant.remove();
      }
    }, 10000);
  }
  
  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(detectAIContent, 1000);
    });
  } else {
    setTimeout(detectAIContent, 1000);
  }
  
})();

// Global functions for injected scripts
window.openProfAI = function() {
  window.open('http://localhost:3000/chat', '_blank');
};

window.showExplanation = function(selectedText, explanation) {
  // Remove existing popup
  const existingPopup = document.getElementById('profai-explanation-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup element
  const popup = document.createElement('div');
  popup.id = 'profai-explanation-popup';
  popup.className = 'profai-popup';
  popup.innerHTML = `
    <div class="profai-popup-header">
      <div class="profai-logo">
        <div class="profai-logo-icon">🧠</div>
        <span>ProfAI</span>
      </div>
      <button class="profai-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="profai-popup-content">
      <div class="profai-selected-text">
        <strong>Explaining:</strong> <em>"${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"</em>
      </div>
      <div class="profai-explanation">
        ${explanation}
      </div>
      <div class="profai-actions">
        <button class="profai-btn profai-btn-primary" onclick="askFollowUp('${selectedText}')">
          Ask Follow-up
        </button>
        <button class="profai-btn profai-btn-secondary" onclick="openProfAI()">
          Open ProfAI Chat
        </button>
      </div>
    </div>
  `;
  
  // Position popup near the selection
  const selection = window.getSelection();
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    popup.style.position = 'fixed';
    popup.style.top = `${Math.min(rect.bottom + 10, window.innerHeight - 300)}px`;
    popup.style.left = `${Math.min(rect.left, window.innerWidth - 400)}px`;
    popup.style.zIndex = '10000';
  }
  
  document.body.appendChild(popup);
  
  // Auto-remove after 30 seconds
  setTimeout(() => {
    if (popup.parentNode) {
      popup.remove();
    }
  }, 30000);
};

window.askFollowUp = function(text) {
  const followUp = prompt(`Ask a follow-up question about "${text}":`, `Can you explain more about ${text}?`);
  if (followUp) {
    chrome.runtime.sendMessage({
      action: 'askFollowUp',
      text: text,
      question: followUp
    });
  }
};
