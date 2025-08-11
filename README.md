
# 🧠 ProfAI - Your Personal AI Learning Companion

ProfAI is an emotionally intelligent AI professor that adapts to your learning style and helps you master AI and machine learning concepts. It features a beautiful web application, powerful backend analytics, a Chrome extension for contextual learning anywhere on the web, and immersive podcast-style learning.

**🎥 Live Demo:** https://drive.google.com/file/d/1wivQMEBUIj5wUNbW_pckhxAucRr31l0H/view?usp=sharing

---

## ✨ Features

### 🎯 Personalized Learning
- **Adaptive Teaching**: Learns your preferred learning style (visual, auditory, kinesthetic, or mixed)
- **Emotional Intelligence**: Detects confusion, frustration, and excitement to adjust explanations
- **Progress Tracking**: Monitors your understanding and suggests next topics
- **Learning Analytics**: Detailed insights into your learning patterns and progress

### 🎙 Podcast Mode
- **Hosted by Sarah & Marcus**: Friendly AI podcast hosts for a relatable learning experience
- **Natural Voice Output**: Powered by OpenAI’s TTS API with lifelike voices
- **Storytelling Approach**: Explains concepts in a conversational and engaging style
- **Multi-Mode Learning**: Switch seamlessly between podcast mode and chat mode

### 🧪 Active Learning
- **Strengths & Weakness Adaptation**: Every 4 questions, the app tests you on concepts tailored to your skill profile
- **Memory Retention Boost**: Reinforces weaker topics while challenging stronger areas
- **Instant Feedback**: Clear explanations for correct and incorrect answers

### 💬 Interactive Chat Interface
- **Voice & Text**: Support for both voice and text-based conversations
- **Real-time Audio**: Text-to-speech responses for immersive learning
- **Beautiful UI**: Modern, gradient-based design with glassmorphism effects
- **Responsive**: Works perfectly on desktop and mobile devices

### 📊 Backend Intelligence
- **Sentiment Analysis for Understanding Prediction**: Calculates sentiment score by analyzing text and voice to gauge comprehension and adjust future explanations.
- **Learning Profile Analysis**: ML-powered tracking of strengths, weaknesses, and topic mastery
- **Personalized Prompts**: Dynamic prompt generation based on user profile
- **Firebase Integration**: Secure user data and progress synchronization

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+ and pip
- Firebase account
- OpenAI API key

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd ProfAI

# Setup frontend
cd frontend
npm install
cd ..

# Setup backend
cd backend
pip install -r requirements.txt
cd ..
```

### 2. Configure Environment Variables

#### Frontend (.env)
```bash
# Copy to frontend/.env
REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
REACT_APP_OPENAI_API_KEY=your_openai_api_key
REACT_APP_BACKEND_URL=http://localhost:5000
```

#### Backend (.env)
```bash
# Copy backend/.env.example to backend/.env and fill in values
OPENAI_API_KEY=your_openai_api_key_here
FIREBASE_PROJECT_ID=your_firebase_project_id
# ... other Firebase credentials
```

### 3. Start the Application

```bash
# Terminal 1: Start backend
cd backend
python app.py

# Terminal 2: Start frontend
cd frontend
npm start

# The app will open at http://localhost:3000
```

## 🧠 AI Features

### Personalization Engine
```python
# Example: Learning profile adaptation
profile = {
    'preferredLearningStyle': 'visual',  # visual, auditory, kinesthetic, mixed
    'conceptualUnderstanding': 7,        # 1-10 scale
    'practicalSkills': 6,                # 1-10 scale
    'preferredPace': 'medium',           # slow, medium, fast
    'responseToEncouragement': 8         # 1-10 scale
}

# AI adapts explanations based on this profile
```

### Emotional Intelligence
- Sentiment analysis of user messages
- Confusion and frustration detection
- Excitement and engagement measurement
- Adaptive response tone and complexity

### Learning Analytics
- Conversation pattern analysis
- Comprehension level estimation
- Topic mastery tracking
- Next topic recommendations

## 📱 Chrome Extension Features

### Smart Context Detection
- Automatically highlights AI/ML terms
- Detects technical content on pages
- Suggests learning opportunities
- Non-intrusive notifications

### Quick Actions
- **Double-click**: Explain any term
- **Ctrl+Shift+E**: Explain selected text
- **Ctrl+Shift+P**: Open ProfAI chat
- **Right-click menu**: Context-sensitive options

## 🔧 Technical Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Firebase SDK** for authentication
- **React Router** for navigation
- **Lucide React** for icons

### Backend
- **Flask** web framework
- **OpenAI GPT-4** for AI responses
- **Firebase Admin SDK** for user management
- **Scikit-learn** for learning analytics
- **Speech Recognition** for voice input
- **NumPy & Pandas** for data processing

### Extension
- **Manifest V3** Chrome extension
- **Content Scripts** for page interaction
- **Service Worker** for background tasks
- **Chrome APIs** for tabs and storage

## 📊 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Flask API     │    │   OpenAI API    │
│                 │◄──►│                 │◄──►│                 │
│ • Authentication│    │ • User profiles │    │ • GPT-4 chat    │
│ • Chat UI       │    │ • Analytics     │    │ • Embeddings    │
│ • Dashboard     │    │ • ML models     │    │ • Completions   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                 ▲
                                 │
                       ┌─────────────────┐
                       │   Firebase      │
                       │                 │
                       │ • Authentication│
                       │ • User data     │
                       │ • Real-time DB  │
                       └─────────────────┘
```

## 🎯 Learning Personalization

ProfAI adapts to your learning style:

### Visual Learners
- Diagrams and visual analogies
- Step-by-step breakdowns
- Color-coded explanations
- Interactive examples

### Auditory Learners
- Verbal explanations
- Sound metaphors
- Audio responses
- Conversational approach

### Kinesthetic Learners
- Hands-on examples
- Interactive coding exercises
- Practical applications
- Learning-by-doing approach

### Mixed Learners
- Balanced combination of all approaches
- Dynamic adaptation based on topic
- Varied explanation methods

## 🔐 Security & Privacy

- **Firebase Authentication**: Secure user management
- **API Key Protection**: Server-side API key storage
- **Data Encryption**: All user data encrypted at rest
- **Privacy First**: Minimal data collection
- **Local Storage**: Extension data stored locally when possible

## 📈 Analytics & Insights

### Learning Metrics
- Comprehension level (1-10)
- Question complexity analysis
- Topic mastery tracking
- Session duration and frequency

### Emotional Analysis
- Sentiment detection from text
- Confusion pattern recognition
- Engagement level measurement
- Frustration early warning system

### Progress Tracking
- Concepts mastered over time
- Learning velocity
- Difficulty progression
- Personalized recommendations

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd frontend
npm run build
vercel --prod
```

### Backend (Heroku/Railway)
```bash
cd backend
# Add Procfile: web: gunicorn app:app
git push heroku main
```

### Extension (Chrome Web Store)
1. Zip the extension folder
2. Submit to Chrome Web Store
3. Follow review process

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

##  Acknowledgments

- OpenAI for GPT-4 API
- Firebase for backend services
---

**Built by 24-bit Code team for Hack-Nation**

*Making AI education accessible, personalized, and enjoyable for everyone.*
