import React from 'react';
import { motion } from 'framer-motion';
import { Brain, User, Volume2 } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isAssistant = message.role === 'assistant';

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
      case 'excited':
        return 'border-green-400/30 bg-green-500/10';
      case 'confused':
      case 'frustrated':
        return 'border-yellow-400/30 bg-yellow-500/10';
      case 'negative':
        return 'border-red-400/30 bg-red-500/10';
      default:
        return 'border-white/20 bg-white/10';
    }
  };

  const playAudio = () => {
    if (message.audioUrl) {
      const audio = new Audio(message.audioUrl);
      audio.play();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex mb-4 ${isAssistant ? 'justify-start' : 'justify-end'}`}
    >
      <div className={`flex max-w-xs lg:max-w-md xl:max-w-lg ${
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      }`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${
          isAssistant ? 'mr-3' : 'ml-3'
        }`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isAssistant 
              ? 'bg-gradient-to-br from-purple-400 to-pink-400' 
              : 'bg-white/20'
          }`}>
            {isAssistant ? (
              <Brain className="w-5 h-5 text-white" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
        </div>

        {/* Message Bubble */}
        <div className={`glassmorphism rounded-2xl px-4 py-3 border ${
          getSentimentColor(message.emotionalTone?.sentiment)
        } ${isAssistant ? 'rounded-tl-sm' : 'rounded-tr-sm'}`}>
          <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          
          {/* Audio Control */}
          {message.audioUrl && (
            <motion.button
              onClick={playAudio}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="mt-2 flex items-center space-x-1 text-white/70 hover:text-white transition-colors"
            >
              <Volume2 className="w-4 h-4" />
              <span className="text-xs">Play Audio</span>
            </motion.button>
          )}
          
          {/* Learning Metrics for Assistant Messages */}
          {isAssistant && message.learningMetrics && (
            <div className="mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center space-x-4 text-xs text-white/60">
                <span>Comprehension: {message.learningMetrics.comprehensionLevel}/10</span>
                <span>Mastery: {message.learningMetrics.topicMastery}/10</span>
              </div>
            </div>
          )}
          
          {/* Timestamp */}
          <div className="mt-2 text-xs text-white/50">
            {message.timestamp.toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatBubble;
