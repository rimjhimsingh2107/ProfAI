@echo off
title ProfAI Development Environment

echo 🧠 Starting ProfAI Development Environment...

:: Check if Node.js is installed
echo 📋 Checking requirements...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 16+ and try again.
    pause
    exit /b 1
)

:: Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

echo ✅ Requirements check passed!

:: Install frontend dependencies
echo 📦 Installing dependencies...
echo Installing frontend dependencies...
cd frontend
if not exist "node_modules" (
    call npm install
)
cd ..

:: Install backend dependencies
echo Installing backend dependencies...
cd backend
if not exist "venv" (
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)
cd ..

echo ✅ Dependencies installed!

:: Check environment files
echo 🔧 Checking environment configuration...
if not exist "backend\.env" (
    echo ⚠️  Backend .env file not found. Please copy .env.example to .env and configure it.
    echo    cd backend ^&^& copy .env.example .env
)

if not exist "frontend\.env" (
    echo ⚠️  Frontend .env file not found. Please create one with your Firebase config.
)

:: Start services
echo 🚀 Starting ProfAI services...

echo Starting backend server...
cd backend
if exist "venv" (
    call venv\Scripts\activate.bat
)
start /min cmd /c "python app.py"
cd ..

:: Wait for backend to start
timeout /t 3 /nobreak >nul

echo Starting frontend development server...
cd frontend
start cmd /c "npm start"
cd ..

echo.
echo 🎉 ProfAI is starting up!
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend: http://localhost:5000
echo.
echo 📱 To install the Chrome extension:
echo    1. Go to chrome://extensions/
echo    2. Enable Developer mode
echo    3. Click 'Load unpacked' and select the 'extension' folder
echo.
echo Press any key to stop all services...

pause >nul

:: Stop services (simplified)
taskkill /f /im python.exe >nul 2>nul
taskkill /f /im node.exe >nul 2>nul
echo 🛑 Services stopped.
