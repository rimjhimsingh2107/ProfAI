# ProfAI

A voice tutor you can talk to. Ask it a question out loud (or type it) and it
answers back in a spoken voice, adjusting how it explains things based on how
confused you sound.

## What it does

**Tutor mode.** You ask a question, ProfAI answers, and the answer is read out
using OpenAI's text-to-speech. Before each request the frontend checks your
message for words like "confused", "lost" or "got it" and scores it from
confused to confident. That score picks the instruction sent along with your
question, so a confused message gets simpler wording and more analogies while
a confident one gets a quicker answer that goes a bit further.

**Podcast mode.** Instead of one answer, you get a short conversation between
two hosts, Sarah and Marcus, each with their own voice. It's meant to feel like
listening in on two people talking through the topic. Follow-up questions get
a shorter back-and-forth.

**Quizzes.** Every five questions in tutor mode, ProfAI offers a quick
multiple-choice question based on what you've been asking about.

There's also a Chrome extension in `extension/` for asking about text on any
page. It's still a work in progress and not hooked up to the current backend.

## Tech stack

- Frontend: React, TypeScript, Tailwind CSS, Web Speech API for voice input
- Backend: Python, Flask
- AI: OpenAI GPT-4o for answers and quizzes, OpenAI TTS for voices

## Running it locally

You'll need Node.js, Python 3 and an OpenAI API key.

1. Set up the backend env file:

   ```bash
   cp backend/.env.example backend/.env
   ```

   Then put your OpenAI key in `backend/.env`.

2. Start everything:

   ```bash
   ./start-dev.sh
   ```

   On Windows, run `start-dev.bat` instead.

   Or run the two parts yourself:

   ```bash
   cd backend && pip install -r requirements.txt && python app_podcast.py
   ```

   ```bash
   cd frontend && npm install && npm start
   ```

The frontend runs on http://localhost:3000 and talks to the backend on port
5001. Voice input works best in Chrome.
