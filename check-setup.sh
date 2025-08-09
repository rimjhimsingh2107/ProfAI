#!/bin/bash

# ProfAI Setup Verification Script
echo "🧠 ProfAI Setup Checker"
echo "======================="

# Function to check if command exists
check_command() {
    if command -v $1 &> /dev/null; then
        echo "✅ $1 is installed: $(command -v $1)"
        if [ "$1" = "node" ]; then
            echo "   Version: $(node --version)"
        elif [ "$1" = "python3" ]; then
            echo "   Version: $(python3 --version)"
        elif [ "$1" = "git" ]; then
            echo "   Version: $(git --version)"
        fi
        return 0
    else
        echo "❌ $1 is NOT installed"
        return 1
    fi
}

# Check prerequisites
echo "📋 Checking Prerequisites:"
check_command "node"
check_command "npm" 
check_command "python3"
check_command "pip3"
check_command "git"

echo ""
echo "📁 Checking Project Structure:"

# Check if we're in the right directory
if [ ! -f "README.md" ]; then
    echo "❌ Not in ProfAI root directory. Please cd to the project folder."
    exit 1
else
    echo "✅ In ProfAI project directory"
fi

# Check folders
for folder in "frontend" "backend" "extension"; do
    if [ -d "$folder" ]; then
        echo "✅ $folder folder exists"
    else
        echo "❌ $folder folder missing"
    fi
done

echo ""
echo "🔧 Checking Configuration:"

# Check for .env files
if [ -f "backend/.env" ]; then
    echo "✅ Backend .env file exists"
    if grep -q "OPENAI_API_KEY=sk-" backend/.env; then
        echo "✅ OpenAI API key configured"
    else
        echo "⚠️  OpenAI API key needs to be set in backend/.env"
    fi
else
    echo "❌ Backend .env file missing - copy backend/.env.example to backend/.env"
fi

if [ -f "frontend/.env" ]; then
    echo "✅ Frontend .env file exists"
else
    echo "⚠️  Frontend .env file missing - create one with Firebase config"
fi

echo ""
echo "📦 Next Steps:"
echo "1. Install missing prerequisites above"
echo "2. Copy backend/.env.example to backend/.env and add your API keys"
echo "3. Create frontend/.env with Firebase configuration"
echo "4. Run: ./start-dev.sh"

echo ""
echo "🔗 Helpful Links:"
echo "• OpenAI API: https://platform.openai.com/api-keys"
echo "• Firebase Console: https://console.firebase.google.com/"
echo "• Setup Guide: See SETUP.md for detailed instructions"
