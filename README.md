Portuguese Memorizer

Overview
- FastAPI backend (Python) serving flashcard data, training questions, answer checking, and progress storage.
- React + Vite + TypeScript frontend with three training modes, instant feedback, progress visualization, and reset capability.
- Responsive UI for phones and tablets.

Features
- Modes:
  1) Portuguese → Russian (multiple choice)
  2) Russian → Portuguese (multiple choice)
  3) Portuguese → Russian (typed input)
- Feedback on correctness for each attempt
- Progress tracking per card (seen, correct, incorrect, streak)
- Learned determination (>=3 correct and streak >=2)
- Overall stats and a progress bar
- Reset progress button

Project structure
backend/
  app/main.py          FastAPI app and endpoints
  data/words.json      Initial card dataset (PT/RU)
  requirements.txt     Backend deps
frontend/
  src/                 React app (components/pages)
  index.html, vite.config.ts, package.json

Run locally
1) Backend
- Create and activate a virtual environment (optional but recommended).
- Install deps: pip install -r backend/requirements.txt
- Run dev server from backend folder: uvicorn app.main:app --reload --port 8000

2) Frontend
- From frontend folder: npm install
- Start dev server: npm run dev
- Open the printed local URL (defaults to http://localhost:5173)

Configuration
- Frontend expects the backend at http://127.0.0.1:8000 by default.
- To change it, set VITE_API_BASE in a .env file in frontend (e.g., VITE_API_BASE=http://localhost:8000) and restart the dev server.

Notes
- CORS for http://localhost:5173 is preconfigured in the backend.
- Progress is saved to backend/data/progress.json. Reset clears that file.
- The TypeScript build may show a harmless "Unused default export" warning in App.tsx; it does not affect functionality.

Endpoints
- GET /api/question?mode=pt2ru_choice|ru2pt_choice|pt2ru_input&options=4
- POST /api/answer { card_id, mode, answer }
- GET /api/progress
- POST /api/reset
- GET /api/words


