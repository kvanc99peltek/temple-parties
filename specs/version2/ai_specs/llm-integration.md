# LLM Integration

> **OpenOwls SDD** — Read by engineers and the AI coding assistant.
> Every OpenOwls project has an LLM layer. This file defines what the LLM is responsible for,
> how it is integrated, how prompts are designed, and how the results are evaluated.
> Treat the LLM as a first-class component of the system — not an afterthought.

---

## What the LLM Does in This App
<!-- Describe clearly what role the LLM plays. What problem does it solve that
     a traditional algorithm cannot? Be specific — avoid vague answers like "it helps users". -->

| Responsibility | Description |
|----------------|-------------|
| _e.g. Recommendation_ | _Analyzes outstanding tasks and suggests which to prioritize_ |
| _e.g. Summarization_ | _Summarizes completed items into a weekly report_ |
| _Add more_ | |

---

## Model

<!-- Which model is used and why? -->

| Setting | Value |
|---------|-------|
| Provider | _e.g. Anthropic_ |
| Model | _e.g. claude-sonnet-4-6_ |
| Why this model | _e.g. Best balance of reasoning quality and cost for our use case_ |
| Called from | _e.g. Backend service layer only — never directly from the frontend_ |
| API key location | _e.g. Server-side environment variable `ANTHROPIC_API_KEY`_ |

---

## Prompts

<!-- Define each prompt the application uses. Keep all prompts in one place —
     never hardcode them inline in route handlers.
     For each prompt, document the system prompt, the user input, and the expected output. -->

### Prompt 1: [Name — e.g. Task Prioritization]

**Purpose:** _What decision or output does this prompt produce?_

**System Prompt:**
```
_Write the system prompt here. Be specific about the role, tone, and constraints.
Example: "You are a productivity assistant helping a student manage their academic workload.
Given a list of outstanding tasks, identify the top 3 to focus on today and explain why.
Be concise. Respond in JSON only."_
```

**User Input:**
```
_Describe what dynamic data is injected into the prompt at runtime.
Example: A JSON list of the user's outstanding tasks including title, due date, and priority._
```

**Expected Output Format:**
```json
{
  "recommendations": [
    {
      "task_id": "string",
      "reason": "string"
    }
  ]
}
```

**Notes:**
- _e.g. Cap input at 50 tasks to avoid exceeding context limits_
- _e.g. If the model returns malformed JSON, retry once then return a fallback message_

---

### Prompt 2: [Name]

**Purpose:** _What decision or output does this prompt produce?_

**System Prompt:**
```
_Write the system prompt here._
```

**User Input:**
```
_Describe what dynamic data is injected at runtime._
```

**Expected Output Format:**
```
_Describe or show the expected output structure._
```

---

## Architecture

<!-- Where do LLM calls live in the codebase and how do they flow? -->

- **Prompt definitions location:** _e.g. `backend/app/llm/prompts.py`_
- **LLM service location:** _e.g. `backend/app/llm/service.py`_
- **Called by:** _e.g. Task route handler in `backend/app/routes/tasks.py`_
- **Frontend interaction:** _e.g. Frontend calls `/api/tasks/recommend` — it never calls the LLM directly_

### Call Flow
```
User action (frontend)
  → API request to backend route
    → Business logic service
      → LLM service (constructs prompt, calls API)
        → Parse and validate response
      → Return structured result to route
    → JSON response to frontend
  → Display recommendation to user
```

---

## Context & Token Management

<!-- LLMs have token limits and cost money per token. Document how you manage this. -->

| Concern | Decision |
|---------|----------|
| Max input size | _e.g. No more than 50 task items per call_ |
| Max output tokens | _e.g. 500 tokens — recommendations are concise_ |
| Estimated tokens per call | _e.g. ~800 input + 300 output = ~1,100 tokens_ |
| Estimated cost per call | _e.g. ~$0.003 at current Sonnet pricing_ |
| What is excluded from context | _e.g. Completed tasks older than 30 days are never sent_ |

---

## Error Handling & Fallbacks

<!-- LLM calls can fail or return unexpected output. Always have a plan. -->

| Scenario | Handling |
|----------|----------|
| API timeout | _e.g. Retry once after 2 seconds, then return a friendly fallback message_ |
| Malformed JSON response | _e.g. Log the raw response, return fallback, alert via monitoring_ |
| Rate limit hit | _e.g. Queue the request and retry after 60 seconds_ |
| Empty or unhelpful response | _e.g. Return a default message: "No recommendations available right now"_ |

---

## Privacy & Safety

<!-- What data is sent to the LLM? What must never be sent? -->

- **Sent to LLM:** _e.g. Task titles, due dates, priority levels_
- **Never sent to LLM:** _e.g. User email, password, payment info, or any PII_
- **Data retention:** _e.g. Anthropic's API does not train on API inputs by default — verify current policy_
- **Content safety:** _e.g. User-generated task titles are passed through — consider input sanitization_

---

## Evaluation

<!-- How do you know the LLM is doing a good job? Define what "good" looks like. -->

| Metric | How to Measure | Target |
|--------|---------------|--------|
| _e.g. Recommendation relevance_ | _Manual review of 20 sample outputs_ | _>80% rated useful by testers_ |
| _e.g. Response time_ | _Logged per API call_ | _<3 seconds p95_ |
| _e.g. JSON parse success rate_ | _Logged in service layer_ | _>98%_ |
| _e.g. Fallback rate_ | _Logged when fallback is returned_ | _<2%_ |

---

## Prompt Iteration Log
<!-- Document prompt changes over time so the team knows what was tried and why it changed. -->

| Date | Prompt | Change Made | Reason |
|------|--------|-------------|--------|
| YYYY-MM-DD | _Prompt 1_ | _Initial version_ | _Baseline_ |
| YYYY-MM-DD | _Prompt 1_ | _Added JSON-only instruction_ | _Model was returning prose instead of structured output_ |
