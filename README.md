# ProfAI

A voice-driven AI tutor that adapts how it explains things to the student in
front of it.

## Overview

Most tutoring tools explain a concept the same way every time, then repeat
themselves when a student is lost. ProfAI listens, tracks how the student is
actually doing, and changes its approach — switching to an analogy, slowing
down, or moving to audio — rather than restating the same explanation louder.

It runs as a web app alongside a Chrome extension that picks up the page a
student is reading, so questions can be asked in context instead of copied
into a separate tab.

Teaching

- Speech in and out, for hands-free sessions
- Explanations adapted to visual, auditory and hands-on learners
- Podcast mode, turning a topic into something listenable
- Active recall through generated questions

Tracking

- Per-topic progress and comprehension signals
- Detecting when a student is stuck, not merely wrong

## Tech Stack

Frontend

- React
- TypeScript
- Tailwind CSS
- Framer Motion

Backend

- Python
- Firebase for auth and data

Extension

- Chrome extension for in-page context
