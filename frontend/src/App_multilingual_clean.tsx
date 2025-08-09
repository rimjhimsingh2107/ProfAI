import React, { useState, useRef, useEffect } from 'react';
import './index.css';

// Supported languages with their configurations
const LANGUAGES = {
  'en-US': { name: 'English', flag: '🇺🇸', code: 'en-US' },
  'es-ES': { name: 'Español', flag: '🇪🇸', code: 'es-ES' },
  'fr-FR': { name: 'Français', flag: '🇫🇷', code: 'fr-FR' },
  'de-DE': { name: 'Deutsch', flag: '🇩🇪', code: 'de-DE' },
  'zh-CN': { name: '中文', flag: '🇨🇳', code: 'zh-CN' },
  'ja-JP': { name: '日本語', flag: '🇯🇵', code: 'ja-JP' },
  'ar-SA': { name: 'العربية', flag: '🇸🇦', code: 'ar-SA' }
};

function App() {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversation, setConversation] = useState([]);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [currentLanguage, setCurrentLanguage] = useState('en-US');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const microphoneRef = useRef(null);

  // Initialize speech recognition with current language
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = LANGUAGES[currentLanguage].code;

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
  }, [currentLanguage]);

  // Add welcome message when language changes
  useEffect(() => {
    const greetings = {
      'en-US': 'Hello! I\'m ProfAI, ready to help you learn about any topic.',
      'es-ES': '¡Hola! Soy ProfAI, listo para ayudarte a aprender sobre cualquier tema.',
      'fr-FR': 'Bonjour ! Je suis ProfAI, prêt à vous aider à apprendre.',
      'de-DE': 'Hallo! Ich bin ProfAI, bereit dir zu helfen.',
      'zh-CN': '你好！我是ProfAI，准备帮助您学习任何主题。',
      'ja-JP': 'こんにちは！私はProfAI、学習をサポートします。',
      'ar-SA': 'مرحبا! أنا ProfAI، مستعد لمساعدتك في التعلم.'
    };
    
    const welcomeMessage = {
      id: `welcome-${currentLanguage}`,
      role: 'assistant',
      content: greetings[currentLanguage],
      timestamp: new Date(),
      language: currentLanguage
    };
    
    setConversation([welcomeMessage]);
  }, [currentLanguage]);

  const changeLanguage = (langCode) => {
    setCurrentLanguage(langCode);
    setShowLanguageMenu(false);
    if (isSpeaking) {
      stopSpeaking();
    }
  };

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
      isVoice,
      language: currentLanguage
    };
    
    setConversation(prev => [...prev, userMessage]);

    try {
      const language = LANGUAGES[currentLanguage];
      
      const multilingualPrompt = `You are ProfAI, a knowledgeable multilingual AI educator. 

IMPORTANT: Respond entirely in ${language.name}. Do not use any other language.

Guidelines for responses in ${language.name}:
- Speak naturally and conversationally
- Use appropriate cultural references and examples
- Keep responses engaging (30-45 seconds when spoken)
- Ask follow-up questions
- Be enthusiastic about teaching
- Use natural speech patterns for ${language.name}

Topic: ${text}`;

      const response = await fetch('http://localhost:5001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: text,
          language: currentLanguage,
          languageName: language.name,
          learningProfile: {
            preferredLearningStyle: 'conversational',
            preferredExplanationDepth: 'intermediate',
            preferredPace: 'natural'
          },
          conversationHistory: conversation.slice(-4),
          systemPrompt: multilingualPrompt
        })
      });
      
      const data = await response.json();
      
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        language: currentLanguage
      };
      
      setConversation(prev => [...prev, assistantMessage]);
      speakText(data.response);
      
    } catch (error) {
      console.error('Error:', error);
      const errorMessages = {
        'en-US': 'I seem to have lost my connection. Could you try again?',
        'es-ES': 'Parece que perdí la conexión. ¿Podrías intentarlo de nuevo?',
        'fr-FR': 'Je semble avoir perdu ma connexion. Pourriez-vous réessayer?',
        'de-DE': 'Ich scheine meine Verbindung verloren zu haben.',
        'zh-CN': '我似乎失去了连接。你能再试一次吗��',
        'ja-JP': '接続が失われたようです。もう一度試していただけますか？',
        'ar-SA': 'يبدو أنني فقدت اتصالي. هل يمكنك المحاولة مرة أخرى؟'
      };
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: errorMessages[currentLanguage] || errorMessages['en-US'],
        timestamp: new Date(),
        language: currentLanguage
      };
      setConversation(prev => [...prev, errorMessage]);
      speakText(errorMessage.content);
    }
    
    setIsProcessing(false);
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
      
      // Find voice for current language
      const languageCode = LANGUAGES[currentLanguage].code.split('-')[0];
      let selectedVoice = voices.find(voice => voice.lang.startsWith(languageCode));
      
      // Fallback to English if no voice found for the language
      if (!selectedVoice) {
        selectedVoice = voices.find(voice => voice.lang.startsWith('en'));
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
      
      // Adjust speech rate for different languages
      utterance.rate = currentLanguage === 'zh-CN' || currentLanguage === 'ja-JP' ? 0.8 : 0.85;
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
    
    setIsSpeaking(false);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getPlaceholder = () => {
    const placeholders = {
      'en-US': 'Type your question...',
      'es-ES': 'Escribe tu pregunta...',
      'fr-FR': 'Tapez votre question...',
      'de-DE': 'Geben Sie Ihre Frage ein...',
      'zh-CN': '输入您的问题...',
      'ja-JP': '質問を入力...',
      'ar-SA': 'اكتب سؤالك...'
    };
    return placeholders[currentLanguage] || placeholders['en-US'];
  };

  const getQuickActions = () => {
    const actions = {
      'en-US': [
        { label: 'What is ML?', query: 'What is machine learning?' },
        { label: 'Neural Networks', query: 'How do neural networks work?' },
        { label: 'Deep Learning', query: 'Explain deep learning' },
        { label: 'Clear Chat', action: 'clear' }
      ],
      'es-ES': [
        { label: '¿Qué es ML?', query: '¿Qué es el aprendizaje automático?' },
        { label: 'Redes Neuronales', query: '¿Cómo funcionan las redes neuronales?' },
        { label: 'Aprendizaje Profundo', query: 'Explica el aprendizaje profundo' },
        { label: 'Limpiar Chat', action: 'clear' }
      ],
      'fr-FR': [
        { label: 'Qu\'est-ce que ML?', query: 'Qu\'est-ce que l\'apprentissage automatique?' },
        { label: 'Réseaux Neuronaux', query: 'Comment fonctionnent les réseaux neuronaux?' },
        { label: 'Apprentissage Profond', query: 'Expliquez l\'apprentissage profond' },
        { label: 'Effacer Chat', action: 'clear' }
      ],
      'de-DE': [
        { label: 'Was ist ML?', query: 'Was ist maschinelles Lernen?' },
        { label: 'Neuronale Netze', query: 'Wie funktionieren neuronale Netze?' },
        { label: 'Deep Learning', query: 'Erklären Sie Deep Learning' },
        { label: 'Chat Löschen', action: 'clear' }
      ],
      'zh-CN': [
        { label: '什么是ML?', query: '什么是机器学习?' },
        { label: '神经网络', query: '神经网络如何工作?' },
        { label: '深度学习', query: '解释深度学习' },
        { label: '清除聊天', action: 'clear' }
      ],
      'ja-JP': [
        { label: 'MLとは？', query: '機械学習とは何ですか？' },
        { label: 'ニューラルネット', query: 'ニューラルネットワークはどう動作しますか？' },
        { label: 'ディープラーニング', query: 'ディープラーニングを説明して' },
        { label: 'チャットクリア', action: 'clear' }
      ],
      'ar-SA': [
        { label: 'ما هو ML؟', query: 'ما هو التعلم الآلي؟' },
        { label: 'الشبكات العصبية', query: 'كيف تعمل الشبكات العصبية؟' },
        { label: 'التعلم العميق', query: 'اشرح التعلم العميق' },
        { label: 'مسح المحادثة', action: 'clear' }
      ]
    };
    
    return actions[currentLanguage] || actions['en-US'];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-slate-800 text-white">
      {/* Professional Header with Language Selector */}
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
                <p className="text-sm text-gray-400">Multilingual AI Learning Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg transition-colors border border-gray-600/50"
                >
                  <span className="text-lg">{LANGUAGES[currentLanguage].flag}</span>
                  <span className="text-sm font-medium">{LANGUAGES[currentLanguage].name}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showLanguageMenu && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-gray-800 border border-gray-600/50 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                    {Object.entries(LANGUAGES).map(([code, config]) => (
                      <button
                        key={code}
                        onClick={() => changeLanguage(code)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-700/50 transition-colors ${
                          currentLanguage === code ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300'
                        }`}
                      >
                        <span className="text-lg">{config.flag}</span>
                        <span className="text-sm font-medium">{config.name}</span>
                      </button>
                    ))}
                  </div>
                )}
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
                   isSpeaking ? 'Speaking' : 'Ready'}
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
              {/* Current Language Display */}
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-4">
                  <span className="text-3xl mr-3">{LANGUAGES[currentLanguage].flag}</span>
                  <div>
                    <h2 className="text-lg font-semibold text-white">{LANGUAGES[currentLanguage].name}</h2>
                    <p className="text-sm text-gray-400">Voice & Text Learning</p>
                  </div>
                </div>
              </div>

              {/* Voice Control */}
              <div className="flex flex-col items-center mb-8">
                <div className="relative mb-6">
                  <button
                    onClick={isListening ? stopListening : startListening}
                    disabled={isProcessing || isSpeaking}
                    className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening ? 'bg-red-500/90 hover:bg-red-600/90' : 
                      isProcessing ? 'bg-yellow-500/90' :
                      isSpeaking ? 'bg-blue-500/90' :
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

                {/* Status and Transcript */}
                <div className="text-center mb-6">
                  {isListening && (
                    <div className="mb-4">
                      <p className="text-lg font-medium text-green-400 mb-2">
                        {currentLanguage === 'en-US' ? 'Listening...' :
                         currentLanguage === 'es-ES' ? 'Escuchando...' :
                         currentLanguage === 'fr-FR' ? 'Écoute...' :
                         currentLanguage === 'de-DE' ? 'Zuhören...' :
                         currentLanguage === 'zh-CN' ? '正在聆听...' :
                         currentLanguage === 'ja-JP' ? '聞いています...' :
                         currentLanguage === 'ar-SA' ? 'أستمع...' : 'Listening...'}
                      </p>
                      {transcript && (
                        <div className="bg-gray-700/50 rounded-lg px-4 py-2 max-w-md">
                          <p className="text-gray-300 italic" dir={currentLanguage === 'ar-SA' ? 'rtl' : 'ltr'}>
                            "{transcript}"
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {isProcessing && (
                    <p className="text-lg font-medium text-yellow-400">
                      {currentLanguage === 'en-US' ? 'Processing...' :
                       currentLanguage === 'es-ES' ? 'Procesando...' :
                       currentLanguage === 'fr-FR' ? 'Traitement...' :
                       currentLanguage === 'de-DE' ? 'Verarbeitung...' :
                       currentLanguage === 'zh-CN' ? '处理中...' :
                       currentLanguage === 'ja-JP' ? '処理中...' :
                       currentLanguage === 'ar-SA' ? 'معالجة...' : 'Processing...'}
                    </p>
                  )}
                  
                  {isSpeaking && (
                    <div>
                      <p className="text-lg font-medium text-blue-400 mb-4">
                        {currentLanguage === 'en-US' ? 'Speaking...' :
                         currentLanguage === 'es-ES' ? 'Hablando...' :
                         currentLanguage === 'fr-FR' ? 'Parlant...' :
                         currentLanguage === 'de-DE' ? 'Sprechen...' :
                         currentLanguage === 'zh-CN' ? '正在说话...' :
                         currentLanguage === 'ja-JP' ? '話しています...' :
                         currentLanguage === 'ar-SA' ? 'أتحدث...' : 'Speaking...'}
                      </p>
                      <button
                        onClick={stopSpeaking}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors border border-red-400/50 flex items-center space-x-2 shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 6h12v12H6z"/>
                        </svg>
                        <span>
                          {currentLanguage === 'en-US' ? 'Stop' :
                           currentLanguage === 'es-ES' ? 'Parar' :
                           currentLanguage === 'fr-FR' ? 'Arrêter' :
                           currentLanguage === 'de-DE' ? 'Stoppen' :
                           currentLanguage === 'zh-CN' ? '停止' :
                           currentLanguage === 'ja-JP' ? '停止' :
                           currentLanguage === 'ar-SA' ? 'إيقاف' : 'Stop'}
                        </span>
                      </button>
                    </div>
                  )}
                  
                  {!isListening && !isProcessing && !isSpeaking && (
                    <div>
                      <p className="text-lg font-medium text-gray-300 mb-2">
                        {currentLanguage === 'en-US' ? 'Ready to help' :
                         currentLanguage === 'es-ES' ? 'Listo para ayudar' :
                         currentLanguage === 'fr-FR' ? 'Prêt à aider' :
                         currentLanguage === 'de-DE' ? 'Bereit zu helfen' :
                         currentLanguage === 'zh-CN' ? '准备好帮助您' :
                         currentLanguage === 'ja-JP' ? 'お手伝いの準備ができています' :
                         currentLanguage === 'ar-SA' ? 'مستعد للمساعدة' : 'Ready to help'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {currentLanguage === 'en-US' ? 'Ask anything using voice or text' :
                         currentLanguage === 'es-ES' ? 'Pregunta usando voz o texto' :
                         currentLanguage === 'fr-FR' ? 'Demandez par voix ou texte' :
                         currentLanguage === 'de-DE' ? 'Fragen Sie mit Sprache oder Text' :
                         currentLanguage === 'zh-CN' ? '使用语音或文字询问' :
                         currentLanguage === 'ja-JP' ? '音声またはテキストで質問' :
                         currentLanguage === 'ar-SA' ? 'اسأل باستخدام الصوت أو النص' : 'Ask using voice or text'}
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
                        placeholder={getPlaceholder()}
                        disabled={isListening || isProcessing || isSpeaking}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600/50 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500/50 focus:bg-gray-600/50 transition-all disabled:opacity-50"
                        dir={currentLanguage === 'ar-SA' ? 'rtl' : 'ltr'}
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

              {/* Language-Specific Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                {getQuickActions().map((action, index) => (
                  <button
                    key={index}
                    onClick={() => action.action === 'clear' ? setConversation([]) : handleInput(action.query)}
                    disabled={isListening || isProcessing || isSpeaking}
                    className="p-3 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-sm font-medium transition-colors border border-gray-600/50 disabled:opacity-50"
                  >
                    {action.label}
                  </button>
                ))}
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
                {currentLanguage === 'en-US' ? 'Conversation' :
                 currentLanguage === 'es-ES' ? 'Conversación' :
                 currentLanguage === 'fr-FR' ? 'Conversation' :
                 currentLanguage === 'de-DE' ? 'Unterhaltung' :
                 currentLanguage === 'zh-CN' ? '对话' :
                 currentLanguage === 'ja-JP' ? '会話' :
                 currentLanguage === 'ar-SA' ? 'محادثة' : 'Conversation'}
              </h3>
              
              <div className="flex-1 overflow-y-auto space-y-4">
                {conversation.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="mb-4">
                      <span className="text-4xl">{LANGUAGES[currentLanguage].flag}</span>
                    </div>
                    <p className="text-lg font-medium mb-2">
                      {currentLanguage === 'en-US' ? 'Ready to chat!' :
                       currentLanguage === 'es-ES' ? '¡Listo para chatear!' :
                       currentLanguage === 'fr-FR' ? 'Prêt à discuter!' :
                       currentLanguage === 'de-DE' ? 'Bereit zum Chatten!' :
                       currentLanguage === 'zh-CN' ? '准备好聊天了！' :
                       currentLanguage === 'ja-JP' ? 'チャットの準備ができました！' :
                       currentLanguage === 'ar-SA' ? 'مستعد للدردشة!' : 'Ready to chat!'}
                    </p>
                    <p className="text-sm">
                      {currentLanguage === 'en-US' ? 'Ask me anything in your language' :
                       currentLanguage === 'es-ES' ? 'Pregúntame en tu idioma' :
                       currentLanguage === 'fr-FR' ? 'Demandez dans votre langue' :
                       currentLanguage === 'de-DE' ? 'Fragen Sie in Ihrer Sprache' :
                       currentLanguage === 'zh-CN' ? '用您的语言问我' :
                       currentLanguage === 'ja-JP' ? 'あなたの言語で質問してください' :
                       currentLanguage === 'ar-SA' ? 'اسألني بلغتك' : 'Ask in your language'}
                    </p>
                  </div>
                ) : (
                  conversation.map((message) => (
                    <div key={message.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${
                            message.role === 'user' ? 'text-blue-400' : 'text-green-400'
                          }`}>
                            {message.role === 'user' ? (
                              currentLanguage === 'en-US' ? 'You' :
                              currentLanguage === 'es-ES' ? 'Tú' :
                              currentLanguage === 'fr-FR' ? 'Vous' :
                              currentLanguage === 'de-DE' ? 'Sie' :
                              currentLanguage === 'zh-CN' ? '您' :
                              currentLanguage === 'ja-JP' ? 'あなた' :
                              currentLanguage === 'ar-SA' ? 'أنت' : 'You'
                            ) : 'ProfAI'}
                          </span>
                          
                          {message.language && (
                            <span className="text-xs text-gray-500">
                              {LANGUAGES[message.language]?.flag}
                            </span>
                          )}
                          
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
                          : 'bg-gray-700/50 border border-gray-600/50'
                      }`}>
                        <p className="mb-2" dir={currentLanguage === 'ar-SA' ? 'rtl' : 'ltr'}>
                          {message.content}
                        </p>
                        
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => speakText(message.content)}
                            disabled={isSpeaking}
                            className="mt-2 text-xs text-gray-400 hover:text-white transition-colors disabled:opacity-50 flex items-center"
                          >
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                            </svg>
                            {currentLanguage === 'en-US' ? 'Replay' :
                             currentLanguage === 'es-ES' ? 'Repetir' :
                             currentLanguage === 'fr-FR' ? 'Rejouer' :
                             currentLanguage === 'de-DE' ? 'Wiederholen' :
                             currentLanguage === 'zh-CN' ? '重播' :
                             currentLanguage === 'ja-JP' ? '再生' :
                             currentLanguage === 'ar-SA' ? 'إعادة' : 'Replay'}
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
      
      {/* Language Menu Overlay */}
      {showLanguageMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowLanguageMenu(false)}
        />
      )}
    </div>
  );
}

export default App;
