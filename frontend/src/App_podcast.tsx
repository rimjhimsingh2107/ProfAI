import React, { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleVoiceInput(finalTranscript);
          stopListening();
        } else {
          setTranscript(interimTranscript);
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }
  }, []);

  // Audio visualization
  const startAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      
      microphoneRef.current.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateAudioLevel = () => {
        if (isListening && analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setAudioLevel(average / 255);
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing && !isSpeaking) {
      setIsListening(true);
      setTranscript('');
      recognitionRef.current.start();
      startAudioVisualization();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    }
  };

  const handleVoiceInput = async (text) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    
    // Add user message to conversation
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);

    try {
      // Create conversational prompt for podcast-style response
      const conversationalPrompt = `You are ProfAI, a friendly and enthusiastic AI educator speaking in a natural, conversational podcast-style format. 

Guidelines for your responses:
- Speak naturally and conversationally, as if you're having a friendly chat
- Use filler words occasionally (like "well", "you know", "actually") to sound more human
- Vary your sentence structure and pace
- Show genuine enthusiasm and curiosity about the topic
- Ask follow-up questions to keep the conversation going
- Use analogies and real-world examples that are relatable
- Keep responses engaging and not too long (30-60 seconds when spoken)
- Sound like you're genuinely excited to discuss AI and ML topics

Current conversation context: This is a voice-first podcast-style learning session about AI and machine learning.`;

      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          learningProfile: {
            preferredLearningStyle: 'conversational',
            preferredExplanationDepth: 'intermediate',
            preferredPace: 'medium'
          },
          conversationHistory: conversation.slice(-4),
          systemPrompt: conversationalPrompt
        })
      });
      
      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      
      // Speak the response
      speakText(data.response);
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Oh, I seem to have lost my train of thought there for a moment! Could you try asking that again?',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
      speakText(errorMessage.content);
    }
    
    setIsProcessing(false);
  };

  const speakText = (text) => {
    if (synthRef.current && text) {
      // Cancel any ongoing speech
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Configure voice for more natural, conversational tone
      const voices = synthRef.current.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Samantha') || 
        voice.name.includes('Alex') ||
        voice.name.includes('Natural') ||
        voice.lang.startsWith('en')
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.9; // Slightly slower for better comprehension
      utterance.pitch = 1.1; // Slightly higher pitch for engagement
      utterance.volume = 0.8;
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      setIsSpeaking(true);
      synthRef.current.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    if (synthRef.current) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Header */}
      <div className="text-center py-8">
        <div className="text-6xl mb-4">🎙️</div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
          ProfAI Podcast
        </h1>
        <p className="text-xl text-white/80">Voice-first AI Learning Experience</p>
      </div>

      {/* Main Voice Interface */}
      <div className="max-w-4xl mx-auto px-6">
        {/* Voice Visualization */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Main microphone button */}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || isSpeaking}
              className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
                  : isProcessing
                  ? 'bg-yellow-500 animate-spin'
                  : isSpeaking
                  ? 'bg-blue-500 animate-pulse'
                  : 'bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105'
              } disabled:opacity-50 shadow-2xl`}
            >
              {isProcessing ? '🤔' : isSpeaking ? '🗣️' : isListening ? '🎤' : '🎙️'}
            </button>

            {/* Audio level visualization */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-32 h-32 rounded-full border-2 border-white/30 animate-ping"
                    style={{
                      animationDelay: `${i * 0.5}s`,
                      transform: `scale(${1 + audioLevel * 2 + i * 0.3})`,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Status Display */}
        <div className="text-center mb-8">
          {isListening && (
            <div>
              <p className="text-2xl font-semibold text-green-400 mb-2">🎤 Listening...</p>
              {transcript && (
                <p className="text-lg text-white/80 italic">"{transcript}"</p>
              )}
            </div>
          )}
          
          {isProcessing && (
            <p className="text-2xl font-semibold text-yellow-400">🤔 Thinking...</p>
          )}
          
          {isSpeaking && (
            <div>
              <p className="text-2xl font-semibold text-blue-400 mb-4">🗣️ Speaking...</p>
              <button
                onClick={stopSpeaking}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full font-semibold transition-colors"
              >
                Stop Speaking
              </button>
            </div>
          )}
          
          {!isListening && !isProcessing && !isSpeaking && (
            <div>
              <p className="text-xl text-white/80 mb-4">Ready to chat! Tap the microphone to start.</p>
              <p className="text-sm text-white/60">Ask me anything about AI, machine learning, or technology!</p>
            </div>
          )}
        </div>

        {/* Conversation Log */}
        {conversation.length > 0 && (
          <div className="glassmorphism rounded-2xl p-6 max-h-96 overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="mr-2">💬</span>
              Conversation Log
            </h3>
            
            <div className="space-y-4">
              {conversation.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-gradient-to-br from-purple-500 to-pink-500'
                        : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                    }`}
                  >
                    <div className="flex items-center mb-2">
                      <span className="text-lg mr-2">
                        {message.role === 'user' ? '👤' : '🤖'}
                      </span>
                      <span className="font-semibold">
                        {message.role === 'user' ? 'You' : 'ProfAI'}
                      </span>
                      <span className="ml-auto text-xs opacity-70">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    
                    {message.role === 'assistant' && (
                      <button
                        onClick={() => speakText(message.content)}
                        disabled={isSpeaking}
                        className="mt-2 text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors disabled:opacity-50"
                      >
                        🔊 Replay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => handleVoiceInput("What is machine learning?")}
            disabled={isListening || isProcessing || isSpeaking}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all disabled:opacity-50"
          >
            What is ML?
          </button>
          
          <button
            onClick={() => handleVoiceInput("Explain neural networks simply")}
            disabled={isListening || isProcessing || isSpeaking}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full text-sm font-medium hover:from-blue-600 hover:to-cyan-600 transition-all disabled:opacity-50"
          >
            Neural Networks
          </button>
          
          <button
            onClick={() => handleVoiceInput("What's the future of AI?")}
            disabled={isListening || isProcessing || isSpeaking}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-teal-500 rounded-full text-sm font-medium hover:from-green-600 hover:to-teal-600 transition-all disabled:opacity-50"
          >
            Future of AI
          </button>

          <button
            onClick={() => setConversation([])}
            disabled={isListening || isProcessing || isSpeaking}
            className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full text-sm font-medium hover:from-gray-600 hover:to-gray-700 transition-all disabled:opacity-50"
          >
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
