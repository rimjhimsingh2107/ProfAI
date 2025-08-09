import React, { useState, useRef, useEffect } from 'react';
import './index.css';

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [conversationMode, setConversationMode] = useState('podcast');
  
  const recognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);

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
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          handleInput(finalTranscript, true);
          stopListening();
        }
      };

      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  const startListening = () => {
    if (recognitionRef.current && !isListening && !isProcessing && !isSpeaking) {
      setIsListening(true);
      setTranscript('');
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      setIsListening(false);
      recognitionRef.current.stop();
    }
  };

  const handleInput = async (text, isVoice = false) => {
    if (!text.trim()) return;

    setIsProcessing(true);
    setTextInput('');
    setTranscript('');
    
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      isVoice
    };
    
    setConversation(prev => [...prev, userMessage]);

    try {
      const response = await fetch(`http://localhost:5001/api/podcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationHistory: [] })
      });
      
      const data = await response.json();
      console.log('Got response:', data);
      
      const podcastMessage = {
        id: Date.now() + 1,
        role: 'podcast',
        content: data.summary || 'Discussion',
        timestamp: new Date(),
        segments: data.segments || []
      };
      
      setConversation(prev => [...prev, podcastMessage]);
      
      // Play the segments
      if (data.segments && data.segments.length > 0) {
        playSegments(data.segments, 0);
      }
      
    } catch (error) {
      console.error('Error:', error);
    }
    
    setIsProcessing(false);
  };

  const playSegments = async (segments, index) => {
    if (!segments || index >= segments.length) {
      setIsSpeaking(false);
      return;
    }

    setIsSpeaking(true);
    const segment = segments[index];
    console.log(`Playing segment ${index + 1}: ${segment.speaker}`);

    if (segment.audio_data) {
      // Try OpenAI audio first
      try {
        const audioData = new Uint8Array(
          segment.audio_data.match(/.{1,2}/g).map(byte => parseInt(byte, 16))
        );
        const audioBlob = new Blob([audioData], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        const audio = new Audio(audioUrl);
        audioPlayerRef.current = audio;
        
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl);
          setTimeout(() => playSegments(segments, index + 1), 500);
        };
        
        audio.onerror = () => {
          console.log('OpenAI audio failed, using browser TTS');
          URL.revokeObjectURL(audioUrl);
          playWithTTS(segment, () => playSegments(segments, index + 1));
        };
        
        await audio.play();
        console.log('Playing OpenAI audio');
        return;
        
      } catch (e) {
        console.log('OpenAI audio error:', e);
      }
    }
    
    // Fallback to TTS
    playWithTTS(segment, () => playSegments(segments, index + 1));
  };

  const playWithTTS = (segment, onComplete) => {
    const utterance = new SpeechSynthesisUtterance(segment.text);
    const voices = speechSynthesis.getVoices();
    
    // Simple voice selection
    if (segment.speaker === 'Sarah') {
      const femaleVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Samantha') || v.name.includes('Karen'))
      );
      if (femaleVoice) utterance.voice = femaleVoice;
      utterance.pitch = 1.1;
    } else {
      const maleVoice = voices.find(v => 
        v.lang.startsWith('en') && 
        (v.name.includes('Alex') || v.name.includes('Daniel'))
      );
      if (maleVoice) utterance.voice = maleVoice;
      utterance.pitch = 0.9;
    }
    
    utterance.rate = 0.9;
    utterance.volume = 0.8;
    
    utterance.onend = () => {
      setTimeout(onComplete, 500);
    };
    
    speechSynthesis.speak(utterance);
    console.log(`Playing TTS for ${segment.speaker}`);
  };

  const stopSpeaking = () => {
    setIsSpeaking(false);
    speechSynthesis.cancel();
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">ProfAI - Working Version</h1>
          <p className="text-gray-400">Simple audio test</p>
        </div>

        <div className="bg-gray-800/50 rounded-2xl p-8 mb-8">
          {/* Microphone Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isProcessing || isSpeaking}
              className={`w-20 h-20 rounded-full flex items-center justify-center text-2xl transition-all ${
                isListening ? 'bg-red-500 animate-pulse' : 
                isProcessing ? 'bg-yellow-500' :
                isSpeaking ? 'bg-blue-500' :
                'bg-gradient-to-br from-purple-500 to-pink-600 hover:scale-105'
              } disabled:opacity-50`}
            >
              {isProcessing ? '⏳' : '🎤'}
            </button>
          </div>

          {/* Status */}
          <div className="text-center mb-6">
            {isListening && <p className="text-green-400">Listening... "{transcript}"</p>}
            {isProcessing && <p className="text-yellow-400">Creating discussion...</p>}
            {isSpeaking && <p className="text-blue-400">Speaking...</p>}
            {!isListening && !isProcessing && !isSpeaking && (
              <p className="text-gray-400">Click microphone to ask a question</p>
            )}
          </div>

          {/* Stop Button */}
          {isSpeaking && (
            <div className="flex justify-center mb-6">
              <button
                onClick={stopSpeaking}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg"
              >
                Stop Speaking
              </button>
            </div>
          )}

          {/* Text Input */}
          <form onSubmit={(e) => { e.preventDefault(); handleInput(textInput); }} className="flex gap-3">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Or type your question..."
              disabled={isListening || isProcessing || isSpeaking}
              className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isListening || isProcessing || isSpeaking}
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 rounded-lg disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>

        {/* Conversation History */}
        <div className="bg-gray-800/50 rounded-2xl p-6 max-h-96 overflow-y-auto">
          {conversation.length === 0 ? (
            <p className="text-center text-gray-500">No conversation yet...</p>
          ) : (
            conversation.map((msg) => (
              <div key={msg.id} className="mb-4 p-4 rounded-lg bg-gray-700/50">
                <div className="font-medium text-sm text-gray-400 mb-2">
                  {msg.role === 'user' ? 'You' : 'Sarah & Marcus Discussion'}
                </div>
                <div className="text-white">
                  {msg.content}
                </div>
                {msg.segments && (
                  <div className="mt-3 space-y-1 text-sm">
                    {msg.segments.map((seg, i) => (
                      <div key={i} className="text-gray-300">
                        <span className="font-medium text-blue-400">{seg.speaker}:</span> {seg.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
