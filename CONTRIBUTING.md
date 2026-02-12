# Contributing to Temple Parties

## Branching Workflow

1. Pull the latest `main`:
   ```bash
   git checkout main && git pull
   ```
2. Create a feature branch using the format `yourname/description`:
   ```bash
   git checkout -b kvanc/add-login-page
   ```
3. Make your changes, commit, and push:
   ```bash
   git push -u origin kvanc/add-login-page
   ```
4. Open a Pull Request on GitHub against `main`.
5. Get at least one review, then merge.

**Never push directly to `main`.**

## Local Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # then fill in your Supabase keys
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # then fill in your keys
npm run dev
```

### Seeding Test Data

```bash
cd backend
python seed_parties.py
```

## Database Changes

When you modify the schema in the Supabase dashboard, add a numbered SQL file under `backend/schema/` (see `backend/schema/README.md`).

## Key Reminders

- Keep secrets out of code — use `.env` files (never commit them).
- Run `npm run build` in `frontend/` before pushing to catch type errors.
- If you need a new env var, add it to the relevant `.env.example` so others know about it.
