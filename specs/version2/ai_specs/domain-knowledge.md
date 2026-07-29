# Domain Knowledge

> **OpenOwls SDD** — Read primarily by the AI coding assistant.
> Captures domain-specific concepts, terminology, business rules, and constraints
> that are not obvious from the code itself. Faculty seeds this file; students expand it.

---

## Domain Overview
<!-- What domain does this application operate in? Give a brief description. -->

_e.g. This application operates in the task management domain, specifically for academic settings where students manage assignments, deadlines, and study goals._

---

## Key Concepts & Terminology
<!-- Define terms that have a specific meaning in this domain.
     This prevents the AI from making wrong assumptions. -->

| Term | Definition |
|------|------------|
| _e.g. Task_ | _A single unit of work with a title, due date, and completion status_ |
| _e.g. Sprint_ | _A two-week work period used by the student team_ |
| _Add more_ | |

---

## Business Rules
<!-- Rules that must always be enforced, regardless of implementation details. -->

- _e.g. A task cannot be marked complete if it has incomplete sub-tasks_
- _e.g. Due dates cannot be set in the past_
- _e.g. Each user can only see their own tasks_

---

## Domain Constraints
<!-- Technical or domain limitations the AI should be aware of. -->

- _e.g. The LLM should never be given more than 50 outstanding tasks at once to avoid token limits_
- _e.g. All dates should be stored in UTC and displayed in the user's local timezone_

---

## Common Pitfalls
<!-- Things that are easy to get wrong in this domain. -->

- _e.g. Don't confuse "priority" (user-assigned) with "urgency" (LLM-inferred)_
- _e.g. Tasks deleted by a user should be soft-deleted, not hard-deleted_

---

## External Dependencies & Integrations
<!-- Any third-party services, APIs, or data sources this app depends on. -->

| Service | Purpose | Notes |
|---------|---------|-------|
| _e.g. Anthropic API_ | _LLM recommendations_ | _Rate limit: 1000 requests/min on free tier_ |
| _Add more_ | | |

---

## References
<!-- Links to any external documentation, papers, or resources relevant to this domain. -->

- _e.g. [Anthropic API Docs](https://docs.anthropic.com)_
