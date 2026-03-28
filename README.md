# NeuroFlow

> "We don't track tasks — we preserve human focus and memory."

A context-aware productivity platform that saves and restores your mental state across work sessions.

## Quick Start

### Backend
```bash
.\venv\Scripts\uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
cd backend
python -m venv venv && source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # fill in your values
alembic upgrade head
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env  # set VITE_API_BASE_URL
npm run dev
```

### Chrome Extension
1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click "Load unpacked" → select `extension/` folder

### Tests
```bash
# Backend
cd backend && pytest -v

# Frontend
cd frontend && npm run test:run
```

## Deploy
- Frontend → Vercel (auto via GitHub Actions)
- Backend → Railway (auto via GitHub Actions)
- Database → Neon PostgreSQL

## Environment Variables

See `backend/.env.example` and `frontend/.env.example`
