import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, Settings, LogOut, Brain, Volume2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ChatMessage } from '../types';
import { aiService } from '../services/aiService';
import ChatBubble from './ChatBubble';
import VoiceVisualizer from './VoiceVisualizer';

const ChatInterface: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: '1',
      role: 'assistant',
      content: `Hello ${currentUser?.displayName || 'there'}! I'm ProfAI, your personal AI learning companion. I'm here to help you master AI and machine learning concepts in a way that works best for you. What would you like to explore today?`,
      timestamp: new Date(),
      emotionalTone: {
        sentiment: 'positive',
        confidence: 0.9,
        engagement: 0.8
      }
    };
    setMessages([welcomeMessage]);
  }, [currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (content: string, audioBlob?: Blob) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {      const response = await aiService.generateResponse(
        content,
        messages,
        currentUser!.learningProfile,
        audioBlob
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        audioUrl: response.audioUrl,
        emotionalTone: response.emotionalTone,
        learningMetrics: response.learningMetrics
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Play audio response if available
      if (response.audioUrl) {
        playAudio(response.audioUrl);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I'm sorry, I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
        emotionalTone: {
          sentiment: 'neutral',
          confidence: 0.5,
          engagement: 0.3
        }
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const playAudio = (audioUrl: string) => {
    setIsSpeaking(true);
    const audio = new Audio(audioUrl);
    audio.onended = () => setIsSpeaking(false);
    audio.play();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage);
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-600 to-blue-600">
      {/* Header */}
      <div className="glassmorphism border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full mr-3">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">ProfAI</h1>
              <p className="text-sm text-white/70">Your AI Learning Companion</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all"
            >
              <Settings className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              onClick={logout}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all"
            >
              <LogOut className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-200px)] overflow-y-auto">
        <AnimatePresence>
          {messages.map((message) => (
            <ChatBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mb-4"
          >
            <div className="glassmorphism rounded-2xl px-4 py-3 max-w-xs">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-600/50 to-transparent p-4">
        <div className="max-w-4xl mx-auto">
          {isListening && <VoiceVisualizer />}
          
          <div className="glassmorphism rounded-2xl p-4 flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsListening(!isListening)}
              className={`p-3 rounded-full transition-all ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </motion.button>
            
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about AI and machine learning..."
                className="w-full bg-transparent text-white placeholder-white/60 resize-none focus:outline-none"
                rows={1}
                style={{ minHeight: '24px', maxHeight: '120px' }}
              />
            </div>
            
            {isSpeaking && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="p-3 bg-blue-500/20 rounded-full"
              >
                <Volume2 className="w-5 h-5 text-blue-300" />
              </motion.div>
            )}
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isLoading}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5 text-white" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
