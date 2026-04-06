# CLAUDE.md — Brief → Campaign Multi-Agent System

## Project Overview
A multi-agent AI system that transforms vague creative briefs into structured campaign packs.
Built to demonstrate agent orchestration, FSM workflow design, and human-in-the-loop UX
. Stack: React artifact + Anthropic API (Sonnet 4.6 + Haiku 4.5).

---

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.
- **Read this entire CLAUDE.md** before writing a single line of code or making any architectural decision.
- **Check `brand_assets/`** for any logos, color tokens, or style guides before designing.

---

## Agent Architecture (Non-Negotiable)

There are exactly **5 agents**. Do not collapse, merge, or skip any of them.

### 1. Orchestrator Agent — `claude-haiku-4-5`
- **Role:** Planner + router + state manager. Coordinates all other agents.
- **Input:** Raw user brief (free text)
- **Output:** Workflow plan as typed JSON — ordered subtask list with agent assignments
- **Rule:** Never writes copy. Never does domain work. Coordination only.
- **Cost:** Haiku — routing logic does not need Sonnet reasoning depth.

### 2. Brief Analyst Agent — `claude-haiku-4-5`
- **Role:** Structured extraction of brief into typed schema.
- **Input:** Raw brief string from Orchestrator
- **Output:** `BriefSchema` JSON — `{ product, audience, goal, channels, tone, gaps[] }`
- **Rule:** Pure extraction. If `gaps[]` is non-empty, surface clarification UI. Max 2 questions.
- **Cost:** Haiku — JSON extraction is pattern matching, not reasoning.

### 3. Strategy Agent — `claude-sonnet-4-6`
- **Role:** Campaign concept ideation + confidence scoring.
- **Input:** Complete `BriefSchema` (no gaps)
- **Output:** Array of 3 concepts — `{ name, hook, rationale, confidence: 0.0–1.0 }`
- **Rule:** Stops at concept + rationale. Does NOT write headlines or copy.
- **Cost:** Sonnet — creative reasoning required here.

### 4. Copy Agent — `claude-sonnet-4-6`
- **Role:** Channel-specific copy writing.
- **Input:** Selected concept + complete `BriefSchema`
- **Output:** `CopyBundle` — `{ linkedin: {headline, body, cta}, email: {...}, twitter: {...} }`
- **Rule:** All 3 channels batched in ONE API call to minimise cost. Never 3 separate calls.
- **Cost:** Sonnet — creative writing requires full reasoning.

### 5. Critic Agent — `claude-haiku-4-5`
- **Role:** LLM-as-judge quality evaluation.
- **Input:** `CopyBundle` + original `BriefSchema`
- **Output:** `CritiqueResult` — `{ scores: {linkedin, email, twitter}, retry: string[], notes: string }`
- **Rule:** Scores each channel 0–10 vs brief fidelity. Any score < 7 triggers retry.
- **Rule:** Max 2 retries total. After 2, surface to user with critique notes visible.
- **Cost:** Haiku — evaluation is structured comparison, not generation.

---

## Typed Schemas (Use These Exactly)

```typescript
// All agent communication must use these shapes

interface BriefSchema {
  product: string | null;
  audience: string | null;
  goal: string | null;          // "downloads" | "signups" | "awareness"
  channels: string[];           // ["linkedin", "email", "twitter"]
  tone: string | null;
  gaps: string[];               // fields that are null — trigger clarification
}

interface Concept {
  name: string;
  hook: string;
  rationale: string;
  confidence: number;           // 0.0 – 1.0
}

interface ChannelCopy {
  headline: string;
  body: string;
  cta: string;
}

interface CopyBundle {
  linkedin: ChannelCopy;
  email: ChannelCopy;
  twitter: ChannelCopy;
}

interface CritiqueResult {
  scores: { linkedin: number; email: number; twitter: number };
  retry: string[];              // channels that scored < 7
  notes: string;
}

interface AgentEvent {
  agent: string;
  status: "started" | "completed" | "retrying" | "failed";
  timestamp: number;
  token_count?: number;
  latency_ms?: number;
  payload?: unknown;
}
```

---

## FSM Workflow States (Non-Negotiable)

Model the workflow as a **finite state machine**. Use these exact state names in code.

```
IDLE
  → EXTRACTING           (Brief Analyst running)
  → AWAITING_CLARIFICATION  (gaps[] non-empty, waiting for user input)
  → STRATEGIZING         (Strategy Agent running)
  → AWAITING_CONCEPT_PICK   (human checkpoint — user must pick concept)
  → WRITING              (Copy Agent running)
  → REVIEWING            (Critic Agent running)
  → RETRYING             (Copy Agent re-running with critique notes)
  → DONE                 (campaign pack assembled)
  → ERROR                (unrecoverable failure)
```

**State transitions must be explicit and logged as `AgentEvent` entries.**
Never skip states. Never transition backwards except WRITING → RETRYING.

---

## Human-in-the-Loop Gates

There are exactly **2 mandatory human checkpoints**. The system cannot proceed past either without explicit user action.

1. **Clarification gate** — after Brief Analyst, if `gaps[]` is non-empty.
   - Show targeted questions (max 2). User fills answers. Orchestrator merges into `BriefSchema`.
2. **Concept selection gate** — after Strategy Agent returns 3 concepts.
   - User must click one concept to proceed. Show confidence scores.
   - Include "Regenerate concepts" option (costs 1 extra Sonnet call — show cost estimate).

---

## Observability Panel (Required Feature)

Every run must show a **live agent trace panel** visible to the user. This is non-negotiable — it is the primary signal to engineering managers that the system is transparent and debuggable.

The panel must display per agent event:
- Agent name + color-coded dot
- Status badge: `started` / `completed` / `retrying` / `failed`
- Model used: `Haiku` or `Sonnet`
- Token count (input + output)
- Latency in ms
- Collapsible payload preview (raw JSON, truncated to 200 chars)

**The trace panel streams in real time** — do not wait for completion to render events.

---

## Cost Display

Show a **running cost counter** in the UI, updated after every agent call.

```
Cost formula:
  Sonnet input:  tokens × $0.000003
  Sonnet output: tokens × $0.000015
  Haiku input:   tokens × $0.0000008
  Haiku output:  tokens × $0.000004
```

Display format: `$0.0000` (4 decimal places). Show final total on campaign pack screen.
Cap display at `$0.0500` and show warning if approaching — prevents runaway demo costs.

---

## API Usage Rules

```javascript
// Model constants — never hardcode strings inline
const MODELS = {
  ORCHESTRATOR: "claude-haiku-4-5-20251001",
  ANALYST:      "claude-haiku-4-5-20251001",
  STRATEGY:     "claude-sonnet-4-6",
  COPY:         "claude-sonnet-4-6",
  CRITIC:       "claude-haiku-4-5-20251001",
};

// All prompts must instruct the model to return ONLY valid JSON
// No preamble. No markdown fences. No explanation outside the schema.
// Example system prompt suffix:
// "Respond with ONLY valid JSON matching the provided schema.
//  No preamble, no explanation, no markdown code fences."

// Always wrap API calls in try/catch
// On failure: emit AgentEvent with status "failed", transition to ERROR state
// Never silently swallow errors
```

---

## UI / Design Rules

### Layout
- **Two-column layout on desktop:** Left = agent trace panel (30%), Right = campaign workflow (70%)
- **Single column on mobile:** Trace panel collapses to expandable drawer at bottom
- Brief input at top. Steps flow vertically downward.

### Step Cards
Each workflow step renders as a card with:
- Agent name + model badge (Haiku/Sonnet)
- Status indicator (idle / running / done / retried)
- Output area — editable by user before proceeding
- "Why this step?" expandable rationale (1–2 sentences)
- Action buttons: `Regenerate` (costs tokens — show estimate) + `Proceed →`

### Colors — Agent Identity
Use consistent color per agent throughout UI and trace panel:
- Orchestrator → Purple (`#7F77DD`)
- Brief Analyst → Blue (`#378ADD`)
- Strategy → Teal (`#1D9E75`)
- Copy → Amber (`#BA7517`)
- Critic → Coral (`#D85A30`)

### Typography
- Never use Inter, Roboto, or system-ui as primary font
- Pair a display font (headings) with a clean sans (body)
- Apply tight tracking (`-0.03em`) on large headings
- Body line-height: 1.7

### Anti-Generic Rules (Inherited)
- Never use default Tailwind palette (indigo-500, blue-600, etc.)
- Never use `transition-all`
- Every clickable element must have hover + focus-visible + active states
- Surfaces must have layering (base → elevated → floating)
- Animations: only `transform` and `opacity`

---

## Project Folder Structure

```
/
├── CLAUDE.md               ← this file
├── brand_assets/           ← logos, color tokens (check before designing)
├── src/
│   ├── agents/
│   │   ├── orchestrator.js     ← Orchestrator agent logic
│   │   ├── analyst.js          ← Brief Analyst agent
│   │   ├── strategy.js         ← Strategy agent
│   │   ├── copy.js             ← Copy agent
│   │   └── critic.js           ← Critic agent
│   ├── state/
│   │   └── fsm.js              ← FSM state machine — all transitions here
│   ├── schemas/
│   │   └── types.js            ← All TypeScript/JSDoc type definitions
│   ├── components/
│   │   ├── TracePanel.jsx      ← Live agent observability panel
│   │   ├── StepCard.jsx        ← Reusable workflow step card
│   │   ├── CostCounter.jsx     ← Running cost display
│   │   └── CampaignPack.jsx    ← Final output assembly
│   └── App.jsx                 ← Root — layout + FSM wiring
├── index.html
└── README.md
```

---

## What to Demonstrate to Engineering Manager

When walking through the demo, highlight these explicitly:

1. **"5 agents with single responsibility"** — point to the trace panel showing each agent firing separately
2. **"Typed JSON contracts between agents"** — expand a payload in the trace panel
3. **"FSM state model"** — show the state label updating in real time (top of UI)
4. **"Critic + retry loop"** — if it doesn't trigger naturally, mention it: "if copy scores below 7, it auto-retries with the critique notes as context"
5. **"Model routing"** — point to Haiku badges on Orchestrator/Analyst/Critic vs Sonnet on Strategy/Copy
6. **"Cost transparency"** — show the cost counter: "entire campaign, 5 agents, ~$0.027"

**60-second pitch:**
> "5 agents, typed JSON contracts, FSM state model with 8 explicit transitions,
> critic-retry quality loop, two human checkpoints, full observability panel,
> and model-aware routing that keeps cost under 3 cents per campaign."

---

## Hard Rules

- Do not collapse agents — 5 agents minimum, no exceptions
- Do not use a single monolithic prompt — each agent has its own focused system prompt
- Do not call Copy agent 3 times for 3 channels — batch in one call always
- Do not skip the Critic agent to save tokens — it is the reliability signal
- Do not use `transition-all` anywhere
- Do not use Sonnet for Orchestrator, Analyst, or Critic — Haiku only for those three
- Do not render the trace panel after completion — it must stream in real time
- Do not proceed past human checkpoints without explicit user action
- Do not display raw API errors to the user — catch, log to trace panel, show friendly message
