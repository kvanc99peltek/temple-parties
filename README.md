# Temple Parties

Find the best parties on campus. A full-stack party discovery app for Temple University students.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | Python FastAPI, Pydantic |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Magic Links, @temple.edu only) |
| Maps | Leaflet + React-Leaflet |
| Real-time | Supabase Realtime |
| Hosting | Vercel (frontend), Railway (backend) |

## Quick Start

See [CONTRIBUTING.md](CONTRIBUTING.md) for full setup instructions.

```bash
# Frontend
cd frontend && npm install && npm run dev

# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload
```

## Documentation

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System design, API reference, data flows
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Local setup, branching workflow, database changes
