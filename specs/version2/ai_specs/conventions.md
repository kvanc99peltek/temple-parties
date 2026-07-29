# Conventions

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Defines how code is written on this project. These rules apply to every file, every session.
> Claude Code must follow these conventions without being reminded each time.

---

## Language & Framework Versions
<!-- Be specific. This prevents the AI from using deprecated syntax. -->

| Technology | Version |
|------------|---------|
| Python | 3.11+ |
| Node.js | 20+ |
| React | 18+ |
| _Add more_ | |

---

## Naming Conventions

| Context | Convention | Example |
|---------|------------|---------|
| Python variables & functions | `snake_case` | `get_user_tasks()` |
| Python classes | `PascalCase` | `TaskService` |
| React components | `PascalCase` | `TaskCard.jsx` |
| React hooks | `camelCase` prefixed with `use` | `useTaskList` |
| CSS classes | `kebab-case` | `task-card-container` |
| Database tables | `snake_case`, plural | `user_tasks` |
| Environment variables | `UPPER_SNAKE_CASE` | `ANTHROPIC_API_KEY` |
| Git branches | `type/short-description` | `feature/add-due-dates` |

---

## File & Folder Conventions

- One component per file in React
- File name must match the component name exactly
- Test files live in a dedicated `tests/` folder mirroring the source layout (e.g. `backend/tests/`)
- All API route files named after the resource they handle (e.g. `tasks.py`)

---

## Code Style

- **Python:** Follow PEP 8. Use `black` for formatting.
- **JavaScript/TypeScript:** Follow ESLint recommended rules. Use `prettier` for formatting.
- Maximum line length: 100 characters
- No commented-out code in commits — delete it or add a `TODO:` comment with explanation
- No `console.log` left in production code

---

## Git Conventions

- Commit messages follow this format: `type: short description`
  - Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
  - Example: `feat: add due date to task model`
- Every feature must be on its own branch
- No direct commits to `main`
- Pull requests require at least one review before merging

---

## Testing Conventions

- Every backend function must have at least one unit test
- Tests must pass before any PR is merged
- Test file naming: `test_[module_name].py` (Python) or `[module].test.js` (JS)
- Use descriptive test names: `test_user_cannot_see_other_users_tasks`

---

## LLM / AI Conventions
<!-- Rules specific to how the team uses AI coding assistants -->

- All prompts to the LLM are defined in a single file (e.g. `backend/app/llm/prompts.py`)
- Never hardcode prompts inline in route handlers
- All LLM calls must have error handling and a fallback response
- Do not send personally identifiable information (PII) to the LLM

---

## What Claude Code Should Never Do

- Never modify files in `ai_specs/` without explicit instruction
- Never skip writing tests to save time
- Never use a library not already in `requirements.txt` or `package.json` without asking first
- Never expose environment variables in frontend code
