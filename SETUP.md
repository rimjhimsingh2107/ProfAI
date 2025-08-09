# ProfAI Configuration Guide

## 🔧 Environment Setup

### 1. Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication and Firestore Database
4. Get your configuration from Project Settings

#### Frontend Environment (.env in frontend folder):
```bash
REACT_APP_FIREBASE_API_KEY=AIzaSyC...
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
REACT_APP_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
REACT_APP_OPENAI_API_KEY=sk-...
REACT_APP_BACKEND_URL=http://localhost:5000
```

#### Backend Environment (.env in backend folder):
```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Firebase Service Account (from Firebase Console > Project Settings > Service Accounts)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=123456789
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs/firebase-adminsdk-xxxxx%40your-project.iam.gserviceaccount.com

# Flask
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000
```

### 2. OpenAI API Setup

1. Go to [OpenAI API](https://platform.openai.com/)
2. Create an account and get API key
3. Add the key to both frontend and backend .env files

### 3. Firebase Setup Steps

1. **Enable Authentication:**
   - Go to Authentication > Sign-in method
   - Enable Email/Password and Google sign-in

2. **Setup Firestore:**
   - Go to Firestore Database
   - Create database in production mode
   - Create collection "users" (will be auto-created by app)

3. **Generate Service Account:**
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Download JSON file and extract values for backend .env

### 4. Development Setup

1. **Install Dependencies:**
   ```bash
   # Frontend
   cd frontend && npm install
   
   # Backend
   cd backend && pip install -r requirements.txt
   ```

2. **Start Development:**
   ```bash
   # Easy way (uses startup scripts)
   ./start-dev.sh  # macOS/Linux
   start-dev.bat   # Windows
   
   # Manual way
   # Terminal 1: Backend
   cd backend && python app.py
   
   # Terminal 2: Frontend  
   cd frontend && npm start
   ```

### 5. Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `extension` folder from this project
5. Pin the extension to your toolbar

## 🎨 Customization Options

### UI Themes
You can customize the gradient colors in:
- `frontend/tailwind.config.js` - Color palette
- `frontend/src/index.css` - CSS custom properties

### AI Behavior
Modify the AI's teaching style in:
- `backend/app.py` - `create_personalized_prompt()` function
- Adjust temperature, max_tokens, and other OpenAI parameters

### Learning Analytics
Customize learning pattern detection in:
- `backend/app.py` - `LearningProfileAnalyzer` class
- Add new metrics and analysis methods

## 🚀 Production Deployment

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Backend (Railway/Heroku)
1. Add `Procfile`: `web: gunicorn app:app`
2. Set environment variables in platform dashboard
3. Deploy from GitHub

### Extension (Chrome Web Store)
1. Create ZIP file of extension folder
2. Submit to Chrome Web Store
3. Wait for review and approval

## 🔒 Security Best Practices

1. **Never commit .env files** - They're in .gitignore
2. **Use environment variables** for all secrets
3. **Enable Firebase security rules**
4. **Rotate API keys** regularly
5. **Use HTTPS** in production

## 📊 Analytics & Monitoring

### Built-in Analytics
- User learning progress
- Conversation patterns
- Emotional state tracking
- Extension usage statistics

### External Monitoring (Optional)
- Google Analytics for web app
- Sentry for error tracking
- Firebase Performance Monitoring

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found" errors:**
   ```bash
   cd frontend && npm install
   cd backend && pip install -r requirements.txt
   ```

2. **Firebase authentication errors:**
   - Check environment variables
   - Verify Firebase project settings
   - Ensure service account has correct permissions

3. **OpenAI API errors:**
   - Verify API key is correct
   - Check account billing and usage limits
   - Ensure model access (GPT-4 requires approval)

4. **Extension not loading:**
   - Check manifest.json syntax
   - Enable Developer mode in Chrome
   - Check console for errors

### Debug Mode
Enable detailed logging by setting:
```bash
FLASK_DEBUG=True
REACT_APP_DEBUG=true
```

## 📞 Support

If you encounter issues:
1. Check this configuration guide
2. Review the README.md file
3. Check the browser console and backend logs
4. Create an issue on GitHub with error details

---

**Happy Learning with ProfAI! 🧠✨**
