#!/bin/bash

echo "🚀 Quick Test Setup for ProfAI"
echo "==============================="

# Check if OpenAI API key is provided
if [ -z "$1" ]; then
    echo "Usage: ./quick-test.sh YOUR_OPENAI_API_KEY"
    echo ""
    echo "Example:"
    echo "./quick-test.sh sk-your-openai-api-key-here"
    echo ""
    echo "Get your API key from: https://platform.openai.com/api-keys"
    exit 1
fi

OPENAI_KEY=$1

echo "📝 Creating minimal configuration..."

# Create minimal backend .env
cat > backend/.env << EOL
OPENAI_API_KEY=$OPENAI_KEY
FLASK_ENV=development
FLASK_DEBUG=True
PORT=5000

# Minimal Firebase config (will work without Firebase features)
FIREBASE_PROJECT_ID=test-project
FIREBASE_PRIVATE_KEY_ID=test
FIREBASE_PRIVATE_KEY="test"
FIREBASE_CLIENT_EMAIL=test@test.com
FIREBASE_CLIENT_ID=123
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_X509_CERT_URL=https://test.com
EOL

# Create minimal frontend .env
cat > frontend/.env << EOL
REACT_APP_OPENAI_API_KEY=$OPENAI_KEY
REACT_APP_BACKEND_URL=http://localhost:5000

# Test Firebase config (will work in demo mode)
REACT_APP_FIREBASE_API_KEY=test
REACT_APP_FIREBASE_AUTH_DOMAIN=test.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=test
REACT_APP_FIREBASE_STORAGE_BUCKET=test.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123
REACT_APP_FIREBASE_APP_ID=1:123:web:test
EOL

echo "✅ Configuration created!"
echo ""
echo "🚀 Starting ProfAI in test mode..."
echo "   (Authentication will be disabled, but chat will work)"

# Install and start
./start-dev.sh
