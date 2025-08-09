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
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setConversation(prev => [...prev, userMessage]);

    try {
      // Much more natural, conversational prompt
      const conversationalPrompt = `You are ProfAI, a knowledgeable and approachable AI educator. You're having a natural conversation with someone curious about AI and machine learning.

Key guidelines for your responses:
- Speak as if you're talking to a colleague or friend - natural, warm, and conversational
- Use natural speech patterns: "Well, that's a great question..." "You know what's interesting..." "Here's the thing..."
- Keep responses conversational length (30-45 seconds when spoken aloud)
- Use relatable analogies and examples from everyday life
- Show genuine enthusiasm for the topic without being overly excited
- Ask thoughtful follow-up questions to keep the conversation flowing
- Explain complex topics in an accessible way without being condescending
- Use occasional verbal connectors: "So", "Now", "Actually", "The thing is"
- Vary sentence structure and length for natural flow

Remember: This is a voice conversation, so write for spoken delivery, not formal writing. Make it sound like two people having an engaging discussion about fascinating topics.`;

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
            preferredPace: 'natural'
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
      
      // Speak the response with better settings
      speakText(data.response);
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'Hmm, I seem to have lost my connection there for a moment. Could you try that question again?',
        timestamp: new Date()
      };
      setConversation(prev => [...prev, errorMessage]);
      speakText(errorMessage.content);
    }
    
    setIsProcessing(false);
  };

  const speakText = (text) => {
    if (synthRef.current && text) {
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Get available voices and find the best natural-sounding one
      const voices = synthRef.current.getVoices();
      
      // Priority order for natural voices
      const preferredVoices = [
        'Samantha', 'Alex', 'Siri Female', 'Siri Male', 'Ava', 'Tom',
        'Google US English', 'Microsoft David', 'Microsoft Zira',
        'Karen', 'Daniel', 'Moira', 'Fiona'
      ];
      
      let selectedVoice = null;
      
      for (const preferredName of preferredVoices) {
        selectedVoice = voices.find(voice => 
          voice.name.includes(preferredName) && voice.lang.startsWith('en')
        );
        if (selectedVoice) break;
      }
      
      // Fallback to any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => 
          voice.lang.startsWith('en') && 
          (voice.name.includes('Natural') || voice.name.includes('Premium'))
        );
      }
      
      // Final fallback to first English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // More natural speech settings
      utterance.rate = 0.85; // Slightly slower for better understanding
      utterance.pitch = 1.0;  // Natural pitch
      utterance.volume = 0.9; // Clear volume
      
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
      {/* Professional Header */}
      <div className="border-b border-gray-700/50 bg-black/20 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">ProfAI</h1>
                <p className="text-sm text-gray-400">Voice Learning Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <div className={`flex items-center space-x-2 ${
                isListening ? 'text-green-400' : 
                isProcessing ? 'text-yellow-400' : 
                isSpeaking ? 'text-blue-400' : 'text-gray-400'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isListening ? 'bg-green-400 animate-pulse' : 
                  isProcessing ? 'bg-yellow-400 animate-pulse' : 
                  isSpeaking ? 'bg-blue-400 animate-pulse' : 'bg-gray-500'
                }`}></div>
                <span>
                  {isListening ? 'Listening' : 
                   isProcessing ? 'Processing' : 
                   isSpeaking ? 'Speaking' : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Voice Interface */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
              {/* Voice Control */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-6">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing || isSpeaking}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl transition-all duration-300 relative ${
                      isListening 
                        ? 'bg-red-500/90 hover:bg-red-600/90' 
                        : isProcessing
                        ? 'bg-yellow-500/90'
                        : isSpeaking
                        ? 'bg-blue-500/90'
                        : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105'
                    } disabled:opacity-50 shadow-lg border border-white/10`}
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : isSpeaking ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    ) : isListening ? (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    )}
                  </button>

                  {/* Audio level visualization */}
                  {isListening && (
                    <>
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="absolute inset-0 rounded-full border-2 border-red-400/30 animate-ping"
                          style={{
                            animationDelay: `${i * 0.5}s`,
                            transform: `scale(${1 + audioLevel * 1.5 + i * 0.2})`,
                          }}
                        />
                      ))}
                    </>
                  )}
                </div>

                {/* Status and Transcript */}
                <div className="text-center">
                  {isListening && (
                    <div className="mb-4">
                      <p className="text-lg font-medium text-green-400 mb-2">Listening...</p>
                      {transcript && (
                        <div className="bg-gray-700/50 rounded-lg px-4 py-2 max-w-md">
                          <p className="text-gray-300 italic">"{transcript}"</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isProcessing && (
                    <p className="text-lg font-medium text-yellow-400">Processing your question...</p>
                  )}
                  
                  {isSpeaking && (
                    <div>
                      <p className="text-lg font-medium text-blue-400 mb-4">Speaking...</p>
                      <button
                        onClick={stopSpeaking}
                        className="px-4 py-2 bg-red-500/90 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors border border-red-400/50"
                      >
                        Stop
                      </button>
                    </div>
                  )}
                  
                  {!isListening && !isProcessing && !isSpeaking && (
                    <div>
                      <p className="text-lg font-medium text-gray-300 mb-2">Ready to help</p>
                      <p className="text-sm text-gray-500">Click the microphone to ask a question</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleVoiceInput("What is machine learning?")}
                  disabled={isListening || isProcessing || isSpeaking}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50"
                >
                  What is ML?
                </button>
                
                <button
                  onClick={() => handleVoiceInput("How do neural networks work?")}
                  disabled={isListening || isProcessing || isSpeaking}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50"
                >
                  Neural Networks
                </button>
                
                <button
                  onClick={() => handleVoiceInput("Explain deep learning")}
                  disabled={isListening || isProcessing || isSpeaking}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50"
                >
                  Deep Learning
                </button>
                
                <button
                  onClick={() => setConversation([])}
                  disabled={isListening || isProcessing || isSpeaking}
                  className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50 text-gray-400"
                >
                  Clear Chat
                </button>
              </div>
            </div>
          </div>

          {/* Conversation Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 h-[600px] flex flex-col">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Conversation
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4">
                {conversation.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>Start a conversation by asking a question</p>
                  </div>
                ) : (
                  conversation.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-medium ${
                          message.role === 'user' ? 'text-blue-400' : 'text-green-400'
                        }`}>
                          {message.role === 'user' ? 'You' : 'ProfAI'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      
                      <div className={`p-3 rounded-lg text-sm leading-relaxed ${
                        message.role === 'user' 
                          ? 'bg-blue-500/20 border border-blue-500/30' 
                          : 'bg-gray-700/50 border border-gray-600/50'
                      }`}>
                        <p>{message.content}</p>
                        
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => speakText(message.content)}
                            disabled={isSpeaking}
                            className="mt-2 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                            Replay
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
