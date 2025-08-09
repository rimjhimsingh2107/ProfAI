// Background service worker for ProfAI Chrome Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('ProfAI Extension installed');
  
  // Create context menu for selected text
  chrome.contextMenus.create({
    id: 'explainWithProfAI',
    title: 'Explain with ProfAI',
    contexts: ['selection']
  });
  
  chrome.contextMenus.create({
    id: 'askProfAI',
    title: 'Ask ProfAI about this page',
    contexts: ['page']
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'explainWithProfAI') {
    const selectedText = info.selectionText;
    if (selectedText) {
      await handleExplanationRequest(selectedText, tab.id);
    }
  } else if (info.menuItemId === 'askProfAI') {
    await handlePageAnalysis(tab);
  }
});

// Handle explanation requests
async function handleExplanationRequest(text, tabId) {
  try {
    // Get user's learning profile from storage
    const result = await chrome.storage.sync.get(['userProfile', 'authToken']);
    const userProfile = result.userProfile || getDefaultProfile();
    
    // Send explanation request to backend
    const response = await fetch('http://localhost:5000/api/explain', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${result.authToken}`
      },
      body: JSON.stringify({
        text: text,
        learningProfile: userProfile,
        context: 'browser_selection'
      })
    });
    
    const data = await response.json();
    
    // Inject explanation into the page
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: showExplanation,
      args: [text, data.explanation]
    });
    
  } catch (error) {
    console.error('Failed to get explanation:', error);
  }
}

// Handle page analysis
async function handlePageAnalysis(tab) {
  try {
    // Extract page content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent
    });
    
    const pageContent = results[0].result;
    
    // Analyze page for learning opportunities
    const response = await fetch('http://localhost:5000/api/analyze-page', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: tab.url,
        title: tab.title,
        content: pageContent
      })
    });
    
    const analysis = await response.json();
    
    // Show learning suggestions
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: showLearningSuggestions,
      args: [analysis]
    });
    
  } catch (error) {
    console.error('Page analysis failed:', error);
  }
}
// Function to extract page content (injected into page)
function extractPageContent() {
  const content = {
    headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent).slice(0, 10),
    paragraphs: Array.from(document.querySelectorAll('p')).map(p => p.textContent).slice(0, 5),
    codeBlocks: Array.from(document.querySelectorAll('code, pre')).map(c => c.textContent).slice(0, 3),
    links: Array.from(document.querySelectorAll('a')).map(a => ({ text: a.textContent, href: a.href })).slice(0, 10)
  };
  
  return content;
}

// Function to show explanation popup (injected into page)
function showExplanation(selectedText, explanation) {
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
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 9.99 5.16-.25 9-4.44 9-9.99V7l-10-5z" stroke="currentColor" stroke-width="2"/>
          <path d="M8 11l2 2 4-4" stroke="currentColor" stroke-width="2"/>
        </svg>
        ProfAI
      </div>
      <button class="profai-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="profai-popup-content">
      <div class="profai-selected-text">
        <strong>Selected:</strong> "${selectedText.substring(0, 100)}${selectedText.length > 100 ? '...' : ''}"
      </div>
      <div class="profai-explanation">
        ${explanation}
      </div>
      <div class="profai-actions">
        <button class="profai-btn profai-btn-primary" onclick="askFollowUp('${selectedText}')">
          Ask Follow-up
        </button>
        <button class="profai-btn profai-btn-secondary" onclick="openProfAI()">
          Open ProfAI
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
    popup.style.top = `${rect.bottom + 10}px`;
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
}

// Function to show learning suggestions (injected into page)
function showLearningSuggestions(analysis) {
  const suggestions = document.createElement('div');
  suggestions.id = 'profai-learning-suggestions';
  suggestions.className = 'profai-suggestions';
  suggestions.innerHTML = `
    <div class="profai-suggestions-header">
      <span>📚 Learning Opportunities</span>
      <button onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
    <div class="profai-suggestions-content">
      ${analysis.suggestions?.map(suggestion => `
        <div class="profai-suggestion-item" onclick="explainConcept('${suggestion.concept}')">
          <strong>${suggestion.concept}</strong>
          <p>${suggestion.description}</p>
        </div>
      `).join('') || '<p>No specific learning opportunities detected on this page.</p>'}
    </div>
  `;
  
  suggestions.style.position = 'fixed';
  suggestions.style.bottom = '20px';
  suggestions.style.right = '20px';
  suggestions.style.zIndex = '10000';
  
  document.body.appendChild(suggestions);
}

// Helper functions available globally on injected pages
window.askFollowUp = function(text) {
  chrome.runtime.sendMessage({
    action: 'askFollowUp',
    text: text
  });
};

window.openProfAI = function() {
  window.open('http://localhost:3000/chat', '_blank');
};

window.explainConcept = function(concept) {
  chrome.runtime.sendMessage({
    action: 'explainConcept',
    concept: concept
  });
};

// Default learning profile
function getDefaultProfile() {
  return {
    preferredLearningStyle: 'mixed',
    conceptualUnderstanding: 5,
    practicalSkills: 5,
    preferredPace: 'medium',
    preferredExplanationDepth: 'intermediate',
    responseToEncouragement: 5
  };
}