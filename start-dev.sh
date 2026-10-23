#!/bin/bash
# Starts the backend and frontend together. Ctrl+C stops both.

if [ ! -f backend/.env ]; then
    echo "backend/.env not found. Copy backend/.env.example and add your OpenAI key."
    exit 1
fi

cd backend
if [ ! -d venv ]; then
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    source venv/bin/activate
fi
python app_podcast.py &
BACKEND_PID=$!
cd ..

cd frontend
[ -d node_modules ] || npm install
npm start &
FRONTEND_PID=$!
cd ..

trap 'kill $BACKEND_PID $FRONTEND_PID; exit' INT
wait
