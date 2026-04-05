# Brief → Campaign — Multi-Agent Workflow

> Turn a vague marketing brief into a structured, channel-ready campaign pack using 5 specialised AI agents, a finite state machine, and two human-in-the-loop checkpoints.

---

## The Problem

Marketing teams start with a brief like:

> *"Launch something for our new AI feature. Target developers. Make it feel smart."*

That brief is too vague to act on — but too common to ignore. Someone has to extract the structure, generate strategy options, write copy for each channel, and check the quality. That process takes hours and multiple people.

This system does it in under 60 seconds, transparently, with every agent decision visible and auditable.

---

## How It Works

### 5 Agents, Single Responsibility Each

| Agent | Model | Role |
|---|---|---|
| **Orchestrator** | Haiku | Parses brief → produces ordered workflow plan. Never writes copy. |
| **Brief Analyst** | Haiku | Extracts structured schema: product, audience, goal, channels, tone. Flags gaps. |
| **Strategy** | Sonnet | Generates 3 distinct campaign concepts with confidence scores. |
| **Copy** | Sonnet | Writes headline + body + CTA for all 3 channels in one batched call. |
| **Critic** | Haiku | Scores copy 0–10 per channel vs brief fidelity. Triggers retry if any score < 7. |

Haiku handles structured extraction and evaluation (pattern matching). Sonnet handles creative reasoning. This keeps cost under **~$0.008 per campaign**.

### Finite State Machine

The workflow is modelled as an explicit FSM — no implicit control flow.

```
IDLE
  → EXTRACTING              (Brief Analyst running)
  → AWAITING_CLARIFICATION  (gaps found — user must answer)
  → STRATEGIZING            (Strategy Agent running)
  → AWAITING_CONCEPT_PICK   (user must pick a concept)
  → WRITING                 (Copy Agent running)
  → REVIEWING               (Critic Agent running)
  → RETRYING                (Copy Agent re-running with critique notes)
  → DONE
  → ERROR
```

Every transition is logged as a typed `AgentEvent` and shown live in the trace panel.

### Two Human-in-the-Loop Gates

1. **Clarification gate** — if the Brief Analyst finds missing fields (e.g. no audience, no goal), it surfaces max 2 targeted questions. The workflow is blocked until answered.
2. **Concept selection gate** — the Strategy Agent returns 3 concepts. The user must pick one before copy is written. Includes a "Regenerate" option with cost estimate shown.

### Critic → Retry Loop

After copy is written, the Critic scores each channel. Any channel scoring below 7/10 is flagged for revision. The Copy Agent retries with the critique notes as additional context. Max 2 retries — after that, the critique notes are surfaced to the user alongside the output.

---

## Workflow Screenshots

### 1. Brief Input
![Brief input screen](docs/screenshots/01-brief-input.png)

### 2. Clarification Gate (when brief has gaps)
![Clarification questions](docs/screenshots/02-clarification.png)

### 3. Concept Selection Gate
![Concept picker with confidence scores](docs/screenshots/03-concept-pick.png)

### 4. Live Agent Trace Panel
![Trace panel showing agent events, tokens, latency](docs/screenshots/04-trace-panel.png)

### 5. Campaign Pack Output
![Final campaign pack with LinkedIn, Email, Twitter copy](docs/screenshots/05-campaign-pack.png)

> **To add screenshots:** take them while running locally and save to `docs/screenshots/`. File names match the references above.

---

## Running Locally

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/settings/keys)

### Setup

```sh
# 1. Install dependencies
npm install

# 2. Create your .env file
cp .env.example .env
# Edit .env and paste your ANTHROPIC_API_KEY

# 3. Start both servers (proxy + Vite) with one command
npm run dev
```

Open **http://localhost:5173** (or the port Vite picks if 5173 is in use).

### How the local setup works

`npm run dev` runs two processes via `concurrently`:
- **`node server.cjs`** — a plain Node HTTP proxy on port 3001 that forwards requests to the Anthropic API using your key from `.env`. This exists because browsers can't call the Anthropic API directly (no CORS + key exposure).
- **`vite`** — the React dev server, configured to proxy `/api/*` to `localhost:3001`.

---

## Project Structure

```
/
├── api/agent.js          ← Vercel serverless function (production)
├── server.cjs            ← Local dev proxy (port 3001)
├── src/
│   ├── agents/
│   │   ├── orchestrator.js
│   │   ├── analyst.js
│   │   ├── strategy.js
│   │   ├── copy.js
│   │   └── critic.js
│   ├── state/fsm.js      ← All FSM states + transition validation
│   ├── schemas/types.js  ← Typed schemas + cost calculation
│   └── components/
│       ├── TracePanel.jsx    ← Live observability panel
│       ├── CostCounter.jsx   ← Running cost with cap warning
│       ├── StepCard.jsx      ← Reusable workflow step card
│       └── CampaignPack.jsx  ← Final output
└── .env.example
```

---

## Typed Agent Contracts

All agent communication uses typed JSON schemas — no free-form strings between agents.

```typescript
interface BriefSchema {
  product: string | null;
  audience: string | null;
  goal: "downloads" | "signups" | "awareness" | null;
  channels: string[];
  tone: string | null;
  gaps: string[];           // missing fields — trigger clarification gate
}

interface Concept {
  name: string;
  hook: string;
  rationale: string;
  confidence: number;       // 0.0 – 1.0
}

interface CopyBundle {
  linkedin: { headline: string; body: string; cta: string };
  email:    { headline: string; body: string; cta: string };
  twitter:  { headline: string; body: string; cta: string };
}

interface CritiqueResult {
  scores: { linkedin: number; email: number; twitter: number };
  retry: string[];          // channels scoring < 7
  notes: string;
}
```

---

## Cost

| Agent | Model | Typical cost |
|---|---|---|
| Orchestrator + Analyst | Haiku | ~$0.0002 |
| Strategy | Sonnet | ~$0.0011 |
| Copy | Sonnet | ~$0.0042 |
| Critic | Haiku | ~$0.0009 |
| **Total** | | **~$0.006–0.009** |

With up to 2 Critic-triggered retries: max ~$0.014. A $0.05 cap is enforced in the UI.

---

## Key Design Decisions

**Why Haiku for Orchestrator/Analyst/Critic?**
Routing, extraction, and evaluation are structured comparisons — they don't need Sonnet's reasoning depth. Sonnet is reserved for the two tasks that genuinely require creativity: ideating concepts and writing copy.

**Why batch all 3 channels in one Copy call?**
Three separate calls would triple the latency and input token cost (the system prompt + brief + concept would be sent three times). One call with all channels specified is ~40% cheaper.

**Why an explicit FSM?**
An implicit workflow (a chain of `await` calls) is invisible and hard to debug. The FSM makes every state transition a named, logged, validatable event — which is exactly what you need when something goes wrong at 2am.

**Why two human checkpoints?**
The clarification gate ensures the agents never hallucinate missing brief fields. The concept selection gate ensures a human owns the creative direction before tokens are spent on full copy. Both gates are non-bypassable by design.
