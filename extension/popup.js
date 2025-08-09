// ProfAI Extension Popup Script

document.addEventListener('DOMContentLoaded', function() {
  initializePopup();
});

async function initializePopup() {
  try {
    // Load user stats and preferences
    await loadUserStats();
    
    // Setup event listeners
    setupEventListeners();
    
    // Show main content
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    
  } catch (error) {
    console.error('Failed to initialize popup:', error);
    showError('Failed to load extension');
  }
}

function setupEventListeners() {
  // Open chat button
  document.getElementById('open-chat').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/chat' });
    window.close();
  });
  
  // Analyze page button
  document.getElementById('explain-page').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    chrome.tabs.sendMessage(tab.id, {
      action: 'analyzePage'
    });
    
    window.close();
  });
  
  // Settings button
  document.getElementById('settings').addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    window.close();
  });
  
  // Dashboard link
  document.getElementById('dashboard-link').addEventListener('click', (e) => {
    e.preventDefault();
    chrome.tabs.create({ url: 'http://localhost:3000/dashboard' });
    window.close();
  });
  
  // Help link
  document.getElementById('help-link').addEventListener('click', (e) => {
    e.preventDefault();
    showHelp();
  });
}

async function loadUserStats() {
  try {
    // Get stats from storage
    const result = await chrome.storage.sync.get(['userStats', 'userProfile']);
    const stats = result.userStats || { totalExplanations: 0, conceptsLearned: 0 };
    
    // Update UI
    document.getElementById('total-explanations').textContent = stats.totalExplanations || 0;
    document.getElementById('concepts-learned').textContent = stats.conceptsLearned || 0;
    
  } catch (error) {
    console.error('Failed to load user stats:', error);
  }
}

function showError(message) {
  const loading = document.getElementById('loading');
  loading.innerHTML = `
    <div style="color: #ff6b6b; text-align: center;">
      <div style="font-size: 24px; margin-bottom: 8px;">⚠️</div>
      <div>${message}</div>
    </div>
  `;
}

function showHelp() {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div style="padding: 20px;">
      <h3 style="margin: 0 0 16px 0; color: white;">🆘 How to Use ProfAI Extension</h3>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9);">Quick Explanations</h4>
        <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.8); font-size: 14px;">
          <li>Double-click any technical term to get an explanation</li>
          <li>Select text and press Ctrl+Shift+E (or Cmd+Shift+E on Mac)</li>
          <li>Right-click selected text and choose "Explain with ProfAI"</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 16px;">
        <h4 style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9);">Page Analysis</h4>
        <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.8); font-size: 14px;">
          <li>Click "Analyze This Page" to find learning opportunities</li>
          <li>AI/ML content is automatically highlighted</li>
          <li>Get suggestions for related concepts to learn</li>
        </ul>
      </div>
      
      <div style="margin-bottom: 20px;">
        <h4 style="margin: 0 0 8px 0; color: rgba(255,255,255,0.9);">Keyboard Shortcuts</h4>
        <ul style="margin: 0; padding-left: 20px; color: rgba(255,255,255,0.8); font-size: 14px;">
          <li>Ctrl+Shift+P: Open ProfAI chat</li>
          <li>Ctrl+Shift+E: Explain selected text</li>
        </ul>
      </div>
      
      <button onclick="goBack()" style="
        width: 100%;
        padding: 12px;
        background: rgba(255,255,255,0.2);
        border: none;
        border-radius: 8px;
        color: white;
        cursor: pointer;
        font-size: 14px;
      ">← Back to Main</button>
    </div>
  `;
}

function goBack() {
  location.reload();
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateStats') {
    loadUserStats();
  }
});

// Track usage statistics
function trackUsage(action) {
  chrome.storage.sync.get(['userStats'], (result) => {
    const stats = result.userStats || { totalExplanations: 0, conceptsLearned: 0, lastUsed: null };
    
    if (action === 'explanation') {
      stats.totalExplanations = (stats.totalExplanations || 0) + 1;
    } else if (action === 'concept') {
      stats.conceptsLearned = (stats.conceptsLearned || 0) + 1;
    }
    
    stats.lastUsed = new Date().toISOString();
    
    chrome.storage.sync.set({ userStats: stats });
  });
}

// Export for use in other parts of extension
window.trackUsage = trackUsage;
