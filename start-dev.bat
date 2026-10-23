@echo off
:: Starts the backend and frontend in separate windows.

if not exist "backend\.env" (
    echo backend\.env not found. Copy backend\.env.example and add your OpenAI key.
    exit /b 1
)

cd backend
if not exist "venv" (
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate.bat
)
start "ProfAI backend" cmd /k "python app_podcast.py"
cd ..

cd frontend
if not exist "node_modules" call npm install
start "ProfAI frontend" cmd /k "npm start"
cd ..
