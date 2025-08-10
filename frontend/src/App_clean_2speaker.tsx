import React, { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [currentSegment, setCurrentSegment] = useState(0);
  const [playingPodcast, setPlayingPodcast] = useState(null);
  const [conversationMode, setConversationMode] = useState('single');
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Initialize speech recognition
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && (isSpeaking || isListening)) {
        event.preventDefault();
        if (isSpeaking) stopSpeaking();
        if (isListening) stopListening();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

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

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

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

  const handleInput = async (text, isVoice = false) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    if (isVoice) {
      setTranscript('');
    } else {
      setTextInput('');
    }
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      isVoice
    };
    
    setConversation(prev => [...prev, userMessage]);

    try {
      const endpoint = conversationMode === 'podcast' ? '/api/podcast' : '/api/chat';
      
      const requestBody = conversationMode === 'podcast' ? {
        message: text,
        conversationHistory: conversation.slice(-4)
      } : {
        message: text,
        learningProfile: {
          preferredLearningStyle: 'conversational',
          preferredExplanationDepth: 'intermediate',
          preferredPace: 'natural'
        },
        conversationHistory: conversation.slice(-4),
        systemPrompt: `You are ProfAI, a knowledgeable and approachable AI educator. 

Guidelines for your responses:
- Speak as if you're talking to a colleague or friend - natural, warm, and conversational
- Use natural speech patterns: "Well, that's a great question..." "You know what's interesting..." "Here's the thing..."
- Keep responses conversational length (30-45 seconds when spoken aloud)
- Use relatable analogies and examples from everyday life
- Show genuine enthusiasm for the topic without being overly excited
- Ask thoughtful follow-up questions to keep the conversation flowing
- Explain complex topics in an accessible way without being condescending
- Use occasional verbal connectors: "So", "Now", "Actually", "The thing is"
- Vary sentence structure and length for natural flow
- Be helpful with any topic, not just AI/ML - you're knowledgeable about many subjects

Remember: This is a voice conversation, so write for spoken delivery, not formal writing.`
      };

      const response = await fetch(`http://localhost:5001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      
      if (data.type === 'podcast') {
        console.log('Podcast response received:', data); // Debug log
        console.log('Segments:', data.segments); // Debug log
        const podcastMessage = {
          id: Date.now() + 1,
          role: 'podcast',
          content: data.summary,
          timestamp: new Date(),
          podcastData: data,
          segments: data.segments || []
        };
        
        setConversation(prev => [...prev, podcastMessage]);
        setPlayingPodcast(data);
        setCurrentSegment(0);
        setIsSpeaking(true);
        
        // Start playing immediately, don't wait for state update
        setTimeout(() => {
          playPodcastSegmentForced(data.segments, 0);
        }, 100);
        console.log('Starting podcast playback with segments:', data.segments.length); // Debug log
        
      } else {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        
        setConversation(prev => [...prev, assistantMessage]);
        
        if (data.audioData) {
          playOpenAIAudio(data.audioData);
        } else {
          speakText(data.response);
        }
      }
      
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

  const playOpenAIAudio = async (audioDataHex) => {
    try {
      const audioData = new Uint8Array(audioDataHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
      const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioPlayerRef.current = audio;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        audioPlayerRef.current = null;
        setIsSpeaking(false);
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
      };
      
      setIsSpeaking(true);
      await audio.play();
      
    } catch (error) {
      console.error('Error with OpenAI audio playback:', error);
      setIsSpeaking(false);
    }
  };

  const playPodcastSegmentForced = async (segments, segmentIndex) => {
    console.log('playPodcastSegmentForced called:', { segmentIndex, segmentsLength: segments?.length }); // Debug log
    
    if (!segments || segmentIndex >= segments.length) {
      setIsSpeaking(false);
      setCurrentSegment(0);
      setPlayingPodcast(null);
      return;
    }

    const segment = segments[segmentIndex];
    console.log('Playing segment:', segment.speaker, 'has audio:', !!segment.audio_data); // Debug log
    setCurrentSegment(segmentIndex);

    if (segment.audio_data) {
      try {
        const audioData = new Uint8Array(segment.audio_data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioPlayerRef.current = null;
          setTimeout(() => {
            playPodcastSegmentForced(segments, segmentIndex + 1);
          }, 800);
        };
        
        audio.onerror = () => {
          console.log('Audio error, falling back to TTS for:', segment.speaker);
          speakSegmentWithTTS(segment, () => {
            setTimeout(() => {
              playPodcastSegmentForced(segments, segmentIndex + 1);
            }, 800);
          });
        };
        
        console.log('Playing audio for:', segment.speaker);
        await audio.play();
        return;
        
      } catch (error) {
        console.error('Error playing OpenAI audio:', error);
      }
    }

    speakSegmentWithTTS(segment, () => {
      setTimeout(() => {
        playPodcastSegmentForced(segments, segmentIndex + 1);
      }, 800);
    });
  };

  const playPodcastSegment = async (segments, segmentIndex) => {
    console.log('playPodcastSegment called:', { segmentIndex, segmentsLength: segments?.length, isSpeaking }); // Debug log
    
    if (!isSpeaking || !segments || segmentIndex >= segments.length) {
      setIsSpeaking(false);
      setCurrentSegment(0);
      setPlayingPodcast(null);
      return;
    }

    const segment = segments[segmentIndex];
    console.log('Playing segment:', segment.speaker, 'has audio:', !!segment.audio_data); // Debug log
    setCurrentSegment(segmentIndex);

    if (segment.audio_data) {
      try {
        const audioData = new Uint8Array(segment.audio_data.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          audioPlayerRef.current = null;
          if (isSpeaking && playingPodcast) {
            setTimeout(() => {
              if (isSpeaking && playingPodcast) {
                playPodcastSegment(segments, segmentIndex + 1);
              }
            }, 800);
          }
        };
        
        audio.onerror = () => {
          speakSegmentWithTTS(segment, () => {
            if (isSpeaking && playingPodcast) {
              setTimeout(() => {
                playPodcastSegment(segments, segmentIndex + 1);
              }, 800);
            }
          });
        };
        
        await audio.play();
        return;
        
      } catch (error) {
        console.error('Error playing OpenAI audio:', error);
      }
    }

    speakSegmentWithTTS(segment, () => {
      if (isSpeaking && playingPodcast) {
        setTimeout(() => {
          if (isSpeaking && playingPodcast) {
            playPodcastSegment(segments, segmentIndex + 1);
          }
        }, 800);
      }
    });
  };

  const speakSegmentWithTTS = (segment, onComplete) => {
    if (!isSpeaking || !synthRef.current) {
      if (onComplete) onComplete();
      return;
    }
    
    synthRef.current.cancel();
    
    const utterance = new SpeechSynthesisUtterance(segment.text);
    const voices = synthRef.current.getVoices();
    
    let selectedVoice = null;
    
    if (segment.speaker === 'Sarah') {
      selectedVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Female') || 
         voice.name.includes('Samantha') || 
         voice.name.includes('Karen'))
      );
    } else if (segment.speaker === 'Marcus') {
      selectedVoice = voices.find(voice => 
        voice.lang.startsWith('en') && 
        (voice.name.includes('Male') || 
         voice.name.includes('Alex') || 
         voice.name.includes('Daniel'))
      );
    }
    
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = 0.9;
    utterance.pitch = segment.speaker === 'Sarah' ? 1.05 : 0.95;
    utterance.volume = 0.9;
    
    utterance.onend = () => {
      if (isSpeaking && onComplete) onComplete();
    };
    utterance.onerror = () => {
      if (onComplete) onComplete();
    };
    
    synthRef.current.speak(utterance);
  };

  const handleVoiceInput = (text) => handleInput(text, true);

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (textInput.trim()) {
      handleInput(textInput.trim(), false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit(e);
    }
  };

  const speakText = (text) => {
    if (synthRef.current && text) {
      synthRef.current.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synthRef.current.getVoices();
      const preferredVoices = ['Samantha', 'Alex', 'Karen', 'Daniel'];
      
      let selectedVoice = null;
      for (const preferredName of preferredVoices) {
        selectedVoice = voices.find(voice => 
          voice.name.includes(preferredName) && voice.lang.startsWith('en')
        );
        if (selectedVoice) break;
      }
      
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      utterance.rate = 0.85;
      utterance.pitch = 1.0;
      utterance.volume = 0.9;
      
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
    }
    
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    
    setIsSpeaking(false);
    setPlayingPodcast(null);
    setCurrentSegment(0);
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
            
            <div className="flex items-center space-x-6">
              {/* Mode Toggle */}
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-400">Mode:</span>
                <div className="flex bg-gray-700/50 rounded-lg p-1">
                  <button
                    onClick={() => setConversationMode('single')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      conversationMode === 'single' ? 'bg-blue-500 text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    onClick={() => setConversationMode('podcast')}
                    className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                      conversationMode === 'podcast' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Podcast
                  </button>
                </div>
              </div>
              
              {/* Status */}
              <div className={`flex items-center space-x-2 text-sm ${
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
                   isSpeaking ? `Speaking ${playingPodcast ? `(${currentSegment + 1}/${playingPodcast.segments?.length || 1})` : ''}` : 'Ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Main Interface */}
          <div className="lg:col-span-3">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-8">
              {/* Mode Description */}
              <div className="text-center mb-6">
                {conversationMode === 'podcast' ? (
                  <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-purple-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span className="font-semibold text-purple-400">Podcast Mode</span>
                    </div>
                    <p className="text-sm text-purple-300">
                      Ask about any topic to hear <strong>Sarah</strong> and <strong>Marcus</strong> discuss it
                    </p>
                    <div className="flex items-center justify-center mt-2 space-x-4 text-xs">
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-pink-400 rounded-full mr-1"></div>
                        <span>Sarah - AI Researcher</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-1"></div>
                        <span>Marcus - Tech Journalist</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                    <div className="flex items-center justify-center mb-2">
                      <svg className="w-6 h-6 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-semibold text-blue-400">Single Mode</span>
                    </div>
                    <p className="text-sm text-blue-300">Traditional one-on-one conversation with ProfAI</p>
                  </div>
                )}
              </div>

              {/* Voice Control */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-6">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing || isSpeaking}
                    className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                      isListening ? 'bg-red-500/90 hover:bg-red-600/90' : 
                      isProcessing ? 'bg-yellow-500/90' :
                      isSpeaking ? 'bg-blue-500/90' :
                      conversationMode === 'podcast' ? 'bg-gradient-to-br from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 hover:scale-105' :
                      'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 hover:scale-105'
                    } disabled:opacity-50 shadow-lg border border-white/10`}
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                      </svg>
                    )}
                  </button>

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

                {/* Status Display */}
                <div className="text-center mb-6">
                  {isListening && (
                    <div className="mb-4">
                      <p className="text-lg font-medium text-green-400 mb-3">Listening...</p>
                      {transcript && (
                        <div className="bg-gray-700/50 rounded-lg px-4 py-2 max-w-md mb-3">
                          <p className="text-gray-300 italic">"{transcript}"</p>
                        </div>
                      )}
                      <button
                        onClick={stopListening}
                        className="px-4 py-2 bg-red-500/90 hover:bg-red-600 rounded-lg text-sm font-medium transition-colors border border-red-400/50 flex items-center space-x-2 mx-auto"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 6h12v12H6z"/>
                        </svg>
                        <span>Stop Listening</span>
                      </button>
                    </div>
                  )}
                  
                  {isProcessing && (
                    <div>
                      <p className="text-lg font-medium text-yellow-400">
                        {conversationMode === 'podcast' ? 'Creating discussion...' : 'Processing...'}
                      </p>
                      {conversationMode === 'podcast' && (
                        <p className="text-sm text-yellow-300 mt-1">Sarah & Marcus are preparing their discussion</p>
                      )}
                    </div>
                  )}
                  
                  {isSpeaking && (
                    <div>
                      {playingPodcast ? (
                        <div>
                          <p className="text-lg font-medium text-blue-400 mb-2">
                            <span className={`${playingPodcast.segments?.[currentSegment]?.speaker === 'Sarah' ? 'text-pink-400' : 'text-blue-400'}`}>
                              {playingPodcast.segments?.[currentSegment]?.speaker || 'Speaking'}
                            </span> is speaking...
                          </p>
                          <div className="bg-gray-700/50 rounded-lg px-4 py-2 max-w-md mb-4">
                            <p className="text-sm text-gray-300">
                              "{playingPodcast.segments?.[currentSegment]?.text}"
                            </p>
                          </div>
                          <div className="text-sm text-gray-400 mb-4">
                            Segment {currentSegment + 1} of {playingPodcast.segments?.length || 1}
                          </div>
                        </div>
                      ) : (
                        <p className="text-lg font-medium text-blue-400 mb-4">Speaking...</p>
                      )}
                      <button
                        onClick={stopSpeaking}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors border border-red-400/50 flex items-center space-x-2 shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 6h12v12H6z"/>
                        </svg>
                        <span>Stop All</span>
                      </button>
                    </div>
                  )}
                  
                  {!isListening && !isProcessing && !isSpeaking && (
                    <div>
                      <p className="text-lg font-medium text-gray-300 mb-2">Ready to help</p>
                      <p className="text-sm text-gray-500">
                        {conversationMode === 'podcast' 
                          ? 'Ask about any topic for a discussion between Sarah & Marcus'
                          : 'Use voice or text to ask anything'
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Text Input */}
                <div className="w-full max-w-lg">
                  <form onSubmit={handleTextSubmit} className="flex space-x-3">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={conversationMode === 'podcast' 
                          ? "Type a topic for discussion..."
                          : "Type your question..."
                        }
                        disabled={isListening || isProcessing || isSpeaking}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-600/50 transition-all disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!textInput.trim() || isListening || isProcessing || isSpeaking}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                {conversationMode === 'podcast' ? (
                  <>
                    <button
                      onClick={() => handleInput("machine learning fundamentals")}
                      disabled={isListening || isProcessing || isSpeaking}
                      className="p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      ML Discussion
                    </button>
                    <button
                      onClick={() => handleInput("neural networks explained")}
                      disabled={isListening || isProcessing || isSpeaking}
                      className="p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Neural Networks
                    </button>
                    <button
                      onClick={() => handleInput("future of artificial intelligence")}
                      disabled={isListening || isProcessing || isSpeaking}
                      className="p-3 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      Future of AI
                    </button>
                    <button
                      onClick={() => setConversation([])}
                      disabled={isListening || isProcessing || isSpeaking}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50 text-gray-400"
                    >
                      Clear Chat
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleInput("What is machine learning?")}
                      disabled={isListening || isProcessing || isSpeaking}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50"
                    >
                      What is ML?
                    </button>
                    <button
                      onClick={() => handleInput("How do neural networks work?")}
                      disabled={isListening || isProcessing || isSpeaking}
                      className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50"
                    >
                      Neural Networks
                    </button>
                    <button
                      onClick={() => handleInput("Explain deep learning")}
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
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Conversation Sidebar */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-6 h-[700px] flex flex-col">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Conversation
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4">
                {conversation.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="mb-4">
                      <svg className="w-16 h-16 mx-auto text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium mb-2">Ready to chat!</p>
                    <p className="text-sm">Ask anything using voice or text</p>
                  </div>
                ) : (
                  conversation.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${
                            message.role === 'user' ? 'text-blue-400' : 
                            message.role === 'podcast' ? 'text-purple-400' : 'text-green-400'
                          }`}>
                            {message.role === 'user' ? 'You' : 
                             message.role === 'podcast' ? 'Podcast Discussion' : 'ProfAI'}
                          </span>
                          
                          {message.isVoice && (
                            <div className="flex items-center text-xs text-gray-500">
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                              </svg>
                              Voice
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                      
                      <div className={`p-3 rounded-lg text-sm leading-relaxed ${
                        message.role === 'user' 
                          ? 'bg-blue-500/20 border border-blue-500/30'
                          : message.role === 'podcast'
                          ? 'bg-purple-500/20 border border-purple-500/30'
                          : 'bg-gray-700/50 border border-gray-600/50'
                      }`}>
                        <p className="mb-2">{message.content}</p>
                        
                        {message.role === 'podcast' && message.segments && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs text-purple-300 font-medium">Speakers:</div>
                            {message.segments.map((segment, idx) => (
                              <div key={idx} className="text-xs bg-gray-600/30 rounded p-2">
                                <span className={`font-medium ${
                                  segment.speaker === 'Sarah' ? 'text-pink-300' : 'text-blue-300'
                                }`}>
                                  {segment.speaker}:
                                </span>
                                <span className="text-gray-300 ml-2">{segment.text}</span>
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                setPlayingPodcast(message.podcastData);
                                setCurrentSegment(0);
                                setIsSpeaking(true);
                                playPodcastSegment(message.segments, 0);
                              }}
                              disabled={isSpeaking}
                              className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50 flex items-center"
                            >
                              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z"/>
                              </svg>
                              Replay Podcast
                            </button>
                          </div>
                        )}
                        
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => speakText(message.content)}
                            disabled={isSpeaking}
                            className="mt-2 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
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