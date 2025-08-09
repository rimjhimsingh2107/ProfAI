import React, { useState } from 'react';
import './index.css';

function App() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: '🧠 Hello! I\'m ProfAI, your AI learning companion. What would you like to learn about today?',
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          learningProfile: {
            preferredLearningStyle: 'mixed',
            preferredExplanationDepth: 'intermediate',
            preferredPace: 'medium'
          },
          conversationHistory: messages.slice(-5)
        })
      });
      
      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Sorry, I had trouble connecting. Please try again!',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
    
    setLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600">
      {/* Header */}
      <div className="glassmorphism border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <div className="text-4xl mr-3">🧠</div>
            <div>
              <h1 className="text-2xl font-bold text-white">ProfAI</h1>
              <p className="text-sm text-white/70">Your AI Learning Companion</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-200px)] overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex mb-4 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${
              msg.role === 'assistant' ? 'flex-row' : 'flex-row-reverse'
            }`}>
              <div className={`flex-shrink-0 ${msg.role === 'assistant' ? 'mr-3' : 'ml-3'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  msg.role === 'assistant' 
                    ? 'bg-gradient-to-br from-purple-400 to-pink-400' 
                    : 'bg-white/20'
                }`}>
                  {msg.role === 'assistant' ? '🧠' : '👤'}
                </div>
              </div>
              
              <div className={`glassmorphism rounded-2xl px-4 py-3 ${
                msg.role === 'assistant' ? 'rounded-tl-sm' : 'rounded-tr-sm'
              }`}>
                <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
                <div className="mt-2 text-xs text-white/50">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="glassmorphism rounded-2xl px-4 py-3 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600/50 to-transparent p-4">
        <div className="max-w-4xl mx-auto">
          <div className="glassmorphism rounded-2xl p-4 flex items-center space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about AI and machine learning..."
                className="w-full bg-transparent text-white placeholder-white/60 resize-none focus:outline-none"
                rows={1}
                style={{ minHeight: '24px', maxHeight: '120px' }}
              />
            </div>
            
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || loading}
              className="px-6 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
