#!/bin/bash

# ProfAI Development Startup Script

echo "🧠 Starting ProfAI Development Environment..."

# Check if required tools are installed
check_requirements() {
    echo "📋 Checking requirements..."
    
    if ! command -v node &> /dev/null; then
        echo "❌ Node.js is not installed. Please install Node.js 16+ and try again."
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is not installed. Please install Python 3.8+ and try again."
        exit 1
    fi
    
    echo "✅ Requirements check passed!"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # Frontend dependencies
    echo "Installing frontend dependencies..."
    cd frontend
    if [ ! -d "node_modules" ]; then
        npm install
    fi
    cd ..
    
    # Backend dependencies
    echo "Installing backend dependencies..."
    cd backend
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
    fi
    cd ..
    
    echo "✅ Dependencies installed!"
}

# Check environment variables
check_env() {
    echo "🔧 Checking environment configuration..."
    
    if [ ! -f "backend/.env" ]; then
        echo "⚠️  Backend .env file not found. Please copy .env.example to .env and configure it."
        echo "   cd backend && cp .env.example .env"
    fi
    
    if [ ! -f "frontend/.env" ]; then
        echo "⚠️  Frontend .env file not found. Please create one with your Firebase config."
    fi
}

# Start services
start_services() {
    echo "🚀 Starting ProfAI services..."
    
    # Start backend
    echo "Starting backend server..."
    cd backend
    if [ -d "venv" ]; then
        source venv/bin/activate
    fi
    python app.py &
    BACKEND_PID=$!
    cd ..
    
    # Wait a moment for backend to start
    sleep 3
    
    # Start frontend
    echo "Starting frontend development server..."
    cd frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    echo ""
    echo "🎉 ProfAI is starting up!"
    echo "🌐 Frontend: http://localhost:3000"
    echo "🔧 Backend: http://localhost:5000"
    echo ""
    echo "📱 To install the Chrome extension:"
    echo "   1. Go to chrome://extensions/"
    echo "   2. Enable Developer mode"
    echo "   3. Click 'Load unpacked' and select the 'extension' folder"
    echo ""
    echo "Press Ctrl+C to stop all services"
    
    # Wait for user to stop
    trap 'echo "🛑 Stopping services..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT
    wait
}

# Main execution
main() {
    check_requirements
    install_dependencies
    check_env
    start_services
}

# Run the script
main
