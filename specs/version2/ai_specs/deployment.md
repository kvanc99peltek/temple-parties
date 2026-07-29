# Deployment

> **OpenOwls SDD** — Read by engineers and DevOps-minded team members.
> Defines how the application is built, configured, and deployed across environments.
> Claude Code uses this file to understand deployment targets and avoid environment-specific mistakes.

---

## Environments
<!-- Define each environment and its purpose. -->

| Environment | Purpose | URL |
|-------------|---------|-----|
| Local | Development and testing on your own machine | `http://localhost:5173` |
| Staging | Pre-production testing, shared with the team | _e.g. `https://app-staging.vercel.app`_ |
| Production | Live application for real users | _e.g. `https://app.vercel.app`_ |

---

## Hosting Platforms
<!-- Where is each part of the application hosted and why? -->

| Component | Platform | Tier | Notes |
|-----------|----------|------|-------|
| Frontend | _e.g. Vercel_ | Free | _Auto-deploys from `main` branch_ |
| Backend | _e.g. Render_ | Free | _Spins down after 15min inactivity_ |
| Database | _e.g. Supabase_ | Free | _500MB limit on free tier_ |
| File Storage | _e.g. Cloudflare R2_ | Free | _Optional, only if needed_ |

---

## Environment Variables
<!-- List every environment variable required to run the application.
     Never put actual values here. Use a .env.example file for that. -->

### Backend
| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for LLM calls |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for signing JWT tokens |
| `ENVIRONMENT` | Yes | `local`, `staging`, or `production` |
| _`VARIABLE_NAME`_ | _Yes/No_ | _Description_ |

### Frontend
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Base URL of the backend API |
| _`VARIABLE_NAME`_ | _Yes/No_ | _Description_ |

> ⚠️ Never commit `.env` files to the repository. Add them to `.gitignore`.
> Always keep a `.env.example` file with dummy values checked in.

---

## Local Development Setup
<!-- Step-by-step instructions to run the project locally from scratch. -->

### Prerequisites
- _e.g. Node.js 20+_
- _e.g. Python 3.11+_
- _e.g. PostgreSQL 15+_
- _e.g. A free Anthropic API key from console.anthropic.com_

### Steps

```bash
# 1. Clone the repository
git clone [repo-url]
cd [project-name]

# 2. Set up backend
cd backend
cp .env.example .env        # Fill in your actual values
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# 3. Set up frontend (in a new terminal)
cd frontend
cp .env.example .env        # Fill in your actual values
npm install
npm run dev
```

---

## Deployment Process
<!-- How do you deploy to staging and production? -->

### Frontend (Vercel)
1. Push to `main` branch — Vercel auto-deploys
2. Environment variables are set in the Vercel dashboard under _Settings → Environment Variables_
3. Check deployment status at `https://vercel.com/dashboard`

### Backend (Render)
1. Push to `main` branch — Render auto-deploys
2. Environment variables are set in the Render dashboard under _Environment_
3. First deploy may take 3-5 minutes
4. Check logs at `https://dashboard.render.com`

### Database (Supabase)
1. Migrations are run manually: `python -m alembic upgrade head`
2. Never modify the production database schema directly
3. Always test migrations on staging first

---

## CI/CD Pipeline
<!-- Describe any automated build, test, or deploy pipelines. -->

_e.g. GitHub Actions runs on every pull request:_
- Linting (`black`, `eslint`)
- Unit tests (`pytest`, `jest`)
- Build check

_Merging to `main` triggers automatic deployment to staging._
_Production deploys are manual and require faculty approval._

---

## Common Deployment Issues
<!-- Document problems the team has encountered and how to fix them. -->

| Issue | Likely Cause | Fix |
|-------|-------------|-----|
| Backend returns 500 on first request | Missing environment variable | Check Render logs, verify all env vars are set |
| Frontend can't reach backend | Wrong `VITE_API_BASE_URL` | Confirm the backend URL in Vercel env vars |
| Database connection fails | `DATABASE_URL` format incorrect | Use the connection string from Supabase dashboard |
| _Add more as you encounter them_ | | |

---

## Secrets Management
<!-- How are secrets handled safely? -->

- All secrets are stored in the hosting platform's environment variable settings, never in code
- Rotate the `JWT_SECRET` and `ANTHROPIC_API_KEY` if they are ever accidentally committed
- Each environment (local, staging, production) uses its own separate API keys and database
- Students should use their own personal API keys for local development
