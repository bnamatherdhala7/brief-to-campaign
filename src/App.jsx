import { useState, useCallback, useRef } from 'react';
import './index.css';

import { STATES, STATE_LABELS, transition } from './state/fsm.js';
import { makeEvent } from './schemas/types.js';
import { runOrchestrator } from './agents/orchestrator.js';
import { runAnalyst, gapsToQuestions } from './agents/analyst.js';
import { runStrategy } from './agents/strategy.js';
import { runCopy } from './agents/copy.js';
import { runCritic } from './agents/critic.js';

import { TracePanel } from './components/TracePanel.jsx';
import { CostCounter } from './components/CostCounter.jsx';
import { StepCard } from './components/StepCard.jsx';
import { CampaignPack } from './components/CampaignPack.jsx';

// ─── Screen components ────────────────────────────────────────────────────────

function BriefInputScreen({ onSubmit, isLoading }) {
  const [text, setText] = useState('');

  const EXAMPLES = [
    'Launch campaign for Notion AI — target SaaS PMs, goal: signups, tone: smart but approachable',
    'Promote a new fitness app for busy professionals. Want awareness on LinkedIn and Twitter.',
    'Market an indie game "Starfall" — college students, drive downloads, playful tone',
  ];

  return (
    <div className="animate-in" style={{ maxWidth: 640, margin: '0 auto', paddingTop: 'var(--space-16)' }}>
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--c-orchestrator)',
          fontWeight: 600,
          marginBottom: 'var(--space-3)',
        }}>
          Brief → Campaign
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 44px)',
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          lineHeight: 1.15,
          marginBottom: 'var(--space-4)',
        }}>
          Turn a brief into a<br />
          <em style={{ fontStyle: 'italic', color: 'var(--c-strategy)' }}>full campaign pack</em>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: 1.7 }}>
          5 specialised agents analyse your brief, generate strategy concepts, write channel copy, and critique it — all transparently.
        </p>
      </div>

      {/* Text area */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Describe your product, audience, goal, and tone. Be as brief or detailed as you like — the agents will ask if anything's missing."
          disabled={isLoading}
          style={{
            width: '100%',
            minHeight: 140,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--space-4)',
            color: 'var(--text-primary)',
            fontSize: 'var(--text-base)',
            fontFamily: 'var(--font-body)',
            lineHeight: 1.7,
            resize: 'vertical',
            outline: 'none',
          }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
        />
      </div>

      {/* CTA */}
      <button
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={!text.trim() || isLoading}
        style={{
          width: '100%',
          padding: 'var(--space-4)',
          background: text.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-floating)',
          border: `1px solid ${text.trim() && !isLoading ? 'var(--accent)' : 'var(--border-default)'}`,
          borderRadius: 'var(--radius-md)',
          color: text.trim() && !isLoading ? '#fff' : 'var(--text-muted)',
          fontSize: 'var(--text-base)',
          fontWeight: 600,
          fontFamily: 'var(--font-body)',
          cursor: text.trim() && !isLoading ? 'pointer' : 'not-allowed',
          letterSpacing: '-0.01em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-2)',
        }}
        onMouseEnter={e => { if (text.trim() && !isLoading) e.currentTarget.style.opacity = '0.9'; }}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        {isLoading ? (
          <>
            <span style={{ width: 14, height: 14, border: '2px solid #fff6', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="spin" />
            Running agents…
          </>
        ) : (
          'Generate Campaign →'
        )}
      </button>

      {/* Examples */}
      <div style={{ marginTop: 'var(--space-6)' }}>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 'var(--space-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Try an example
        </div>
        {EXAMPLES.map((ex, i) => (
          <button
            key={i}
            onClick={() => setText(ex)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              background: 'none',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--space-2) var(--space-3)',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              fontFamily: 'var(--font-body)',
              cursor: 'pointer',
              marginBottom: 'var(--space-2)',
              lineHeight: 1.5,
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

function ClarificationScreen({ questions, brief, onSubmit }) {
  const [answers, setAnswers] = useState({});

  const allAnswered = questions.every(q => (answers[q.field] || '').trim());

  return (
    <div className="animate-in" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 'var(--space-10)' }}>
      <StepCard
        agent="Brief Analyst"
        model="Haiku"
        title="A couple of things…"
        rationale="The Brief Analyst extracted your brief but found some fields missing. Answering these 2 questions lets the Strategy agent work with a complete picture."
        status="done"
      >
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
          The analyst needs a bit more detail before generating strategy:
        </p>

        {questions.map(q => (
          <div key={q.field} style={{ marginBottom: 'var(--space-4)' }}>
            <label style={{
              display: 'block',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-primary)',
              fontWeight: 500,
              marginBottom: 'var(--space-2)',
            }}>
              {q.question}
            </label>
            <input
              type="text"
              value={answers[q.field] || ''}
              onChange={e => setAnswers(a => ({ ...a, [q.field]: e.target.value }))}
              style={{
                width: '100%',
                background: 'var(--bg-overlay)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--space-3)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-body)',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--c-analyst)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-default)'}
            />
          </div>
        ))}

        <button
          onClick={() => onSubmit({ ...brief, ...Object.fromEntries(questions.map(q => [q.field, answers[q.field]])), gaps: [] })}
          disabled={!allAnswered}
          style={{
            width: '100%',
            padding: 'var(--space-3)',
            background: allAnswered ? 'var(--c-analyst)' : 'var(--bg-overlay)',
            border: `1px solid ${allAnswered ? 'var(--c-analyst)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            color: allAnswered ? '#fff' : 'var(--text-muted)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
            cursor: allAnswered ? 'pointer' : 'not-allowed',
          }}
          onMouseEnter={e => { if (allAnswered) e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Continue to Strategy →
        </button>
      </StepCard>
    </div>
  );
}

function ConceptPickScreen({ concepts, onPick, onRegenerate, isRegenerating }) {
  const [hovered, setHovered] = useState(null);

  const SONNET_COST_ESTIMATE = '$0.003';

  return (
    <div className="animate-in" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 'var(--space-10)' }}>
      <StepCard
        agent="Strategy"
        model="Sonnet"
        title="Pick a concept"
        rationale="The Strategy agent generated 3 meaningfully different campaign angles. You must select one — it becomes the creative direction for all copy. Confidence scores reflect how well each concept aligns with your stated goal."
        status="done"
      >
        <div style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          {concepts.map((concept, i) => (
            <button
              key={i}
              onClick={() => onPick(concept)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                background: hovered === i ? 'var(--bg-overlay)' : 'var(--bg-floating)',
                border: `1px solid ${hovered === i ? 'var(--c-strategy)66' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transform: hovered === i ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'transform 150ms ease, border-color 150ms ease, background 150ms ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2)' }}>
                <span style={{
                  fontSize: 'var(--text-base)',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.01em',
                }}>
                  {concept.name}
                </span>
                {/* Confidence bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <div style={{ width: 52, height: 4, background: 'var(--border-default)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${concept.confidence * 100}%`,
                      height: '100%',
                      background: concept.confidence >= 0.75 ? 'var(--c-strategy)' : concept.confidence >= 0.5 ? '#BA7517' : '#D85A30',
                      borderRadius: 2,
                    }} />
                  </div>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    fontFamily: 'ui-monospace, Consolas, monospace',
                  }}>
                    {Math.round(concept.confidence * 100)}%
                  </span>
                </div>
              </div>

              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--c-strategy)', marginBottom: 'var(--space-2)', fontWeight: 500 }}>
                {concept.hook}
              </p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                {concept.rationale}
              </p>
            </button>
          ))}
        </div>

        {/* Regenerate option */}
        <button
          onClick={onRegenerate}
          disabled={isRegenerating}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-2)',
            background: 'none',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--space-2) var(--space-3)',
            color: 'var(--text-muted)',
            fontSize: 'var(--text-xs)',
            fontFamily: 'var(--font-body)',
            cursor: isRegenerating ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!isRegenerating) e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          {isRegenerating
            ? <><span className="spin" style={{ width: 10, height: 10, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} />  Regenerating…</>
            : `↺  Regenerate concepts (≈ ${SONNET_COST_ESTIMATE})`
          }
        </button>
      </StepCard>
    </div>
  );
}

function RunningScreen({ fsmState }) {
  const messages = {
    [STATES.EXTRACTING]:  'Brief Analyst is reading your brief…',
    [STATES.STRATEGIZING]: 'Strategy agent is ideating concepts…',
    [STATES.WRITING]:     'Copy agent is writing for all 3 channels…',
    [STATES.REVIEWING]:   'Critic agent is evaluating copy quality…',
    [STATES.RETRYING]:    'Copy agent is revising based on critique…',
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 'var(--space-16)',
      gap: 'var(--space-4)',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--border-default)',
        borderTopColor: 'var(--accent)',
        borderRadius: '50%',
      }} className="spin" />
      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)' }}>
        {messages[fsmState] || 'Running…'}
      </p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        Watch the agent trace on the left
      </p>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [fsmState, setFsmState]       = useState(STATES.IDLE);
  const [events, setEvents]           = useState([]);
  const [totalCost, setTotalCost]     = useState(0);
  const [brief, setBrief]             = useState(null);
  const [rawBrief, setRawBrief]       = useState('');
  const [clarifyQs, setClarifyQs]     = useState([]);
  const [concepts, setConcepts]       = useState([]);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [copyBundle, setCopyBundle]   = useState(null);
  const [critique, setCritique]       = useState(null);
  const [error, setError]             = useState(null);
  const [retryCount, setRetryCount]   = useState(0);
  const [isRegeneratingConcepts, setIsRegeneratingConcepts] = useState(false);

  const MAX_RETRIES = 2;

  // Emit an agent event and update cost atomically
  const emit = useCallback((event, cost = 0) => {
    setEvents(evs => [...evs, event]);
    if (cost > 0) setTotalCost(t => t + cost);
  }, []);

  // FSM transition helper — throws on invalid
  const go = useCallback((to) => {
    setFsmState(current => {
      transition(current, to); // validates
      return to;
    });
  }, []);

  // Reset everything
  const restart = useCallback(() => {
    setFsmState(STATES.IDLE);
    setEvents([]);
    setTotalCost(0);
    setBrief(null);
    setRawBrief('');
    setClarifyQs([]);
    setConcepts([]);
    setSelectedConcept(null);
    setCopyBundle(null);
    setCritique(null);
    setError(null);
    setRetryCount(0);
  }, []);

  // ── Step 1: Submit brief → Orchestrator + Analyst ──
  const handleBriefSubmit = useCallback(async (text) => {
    setRawBrief(text);
    setError(null);
    go(STATES.EXTRACTING);

    try {
      // 1a. Orchestrator plans the workflow
      const { cost: oCost } = await runOrchestrator(text, (ev) => emit(ev));
      setTotalCost(t => t + oCost);

      // 1b. Brief Analyst extracts schema
      const { brief: extracted, cost: aCost } = await runAnalyst(text, (ev) => emit(ev));
      setTotalCost(t => t + aCost);
      setBrief(extracted);

      if (extracted.gaps && extracted.gaps.length > 0) {
        // Need clarification
        const questions = gapsToQuestions(extracted.gaps);
        setClarifyQs(questions);
        go(STATES.AWAITING_CLARIFICATION);
      } else {
        // Proceed straight to strategy
        await runStrategyPhase(extracted);
      }
    } catch (err) {
      setError(err.message);
      setFsmState(STATES.ERROR);
    }
  }, [emit, go]);

  // ── Step 2: Clarification answered ──
  const handleClarificationSubmit = useCallback(async (completeBrief) => {
    setBrief(completeBrief);
    await runStrategyPhase(completeBrief);
  }, []);

  // ── Strategy phase ──
  const runStrategyPhase = useCallback(async (completeBrief) => {
    try {
      setFsmState(STATES.STRATEGIZING);
      const { concepts: newConcepts, cost } = await runStrategy(completeBrief, (ev) => emit(ev));
      setTotalCost(t => t + cost);
      setConcepts(newConcepts);
      setFsmState(STATES.AWAITING_CONCEPT_PICK);
    } catch (err) {
      setError(err.message);
      setFsmState(STATES.ERROR);
    }
  }, [emit]);

  // ── Regenerate concepts ──
  const handleRegenerateConcepts = useCallback(async () => {
    setIsRegeneratingConcepts(true);
    try {
      setFsmState(STATES.STRATEGIZING);
      const { concepts: newConcepts, cost } = await runStrategy(brief, (ev) => emit(ev));
      setTotalCost(t => t + cost);
      setConcepts(newConcepts);
      setFsmState(STATES.AWAITING_CONCEPT_PICK);
    } catch (err) {
      setError(err.message);
      setFsmState(STATES.ERROR);
    } finally {
      setIsRegeneratingConcepts(false);
    }
  }, [brief, emit]);

  // ── Step 3: Concept picked → Copy + Critic ──
  const handleConceptPick = useCallback(async (concept) => {
    setSelectedConcept(concept);
    setRetryCount(0);
    await runCopyPhase(concept, brief, null, 0);
  }, [brief]);

  // ── Copy + Critic loop ──
  const runCopyPhase = useCallback(async (concept, currentBrief, critiqueNotes, currentRetry) => {
    try {
      // Writing
      setFsmState(currentRetry > 0 ? STATES.RETRYING : STATES.WRITING);
      const { copyBundle: newBundle, cost: copyCost } = await runCopy(concept, currentBrief, critiqueNotes, (ev) => emit(ev));
      setTotalCost(t => t + copyCost);
      setCopyBundle(newBundle);

      // Reviewing
      setFsmState(STATES.REVIEWING);
      const { critique: newCritique, cost: criticCost } = await runCritic(newBundle, currentBrief, (ev) => emit(ev));
      setTotalCost(t => t + criticCost);
      setCritique(newCritique);

      const needsRetry = newCritique.retry && newCritique.retry.length > 0;

      if (needsRetry && currentRetry < MAX_RETRIES) {
        setRetryCount(currentRetry + 1);
        await runCopyPhase(concept, currentBrief, newCritique, currentRetry + 1);
      } else {
        setFsmState(STATES.DONE);
      }
    } catch (err) {
      setError(err.message);
      setFsmState(STATES.ERROR);
    }
  }, [emit]);

  // ── Determine which screen to show ──
  const showTracePanel = fsmState !== STATES.IDLE;

  const mainContent = () => {
    switch (fsmState) {
      case STATES.IDLE:
        return <BriefInputScreen onSubmit={handleBriefSubmit} isLoading={false} />;

      case STATES.EXTRACTING:
        return <RunningScreen fsmState={fsmState} />;

      case STATES.AWAITING_CLARIFICATION:
        return (
          <ClarificationScreen
            questions={clarifyQs}
            brief={brief}
            onSubmit={handleClarificationSubmit}
          />
        );

      case STATES.STRATEGIZING:
        return <RunningScreen fsmState={fsmState} />;

      case STATES.AWAITING_CONCEPT_PICK:
        return (
          <ConceptPickScreen
            concepts={concepts}
            onPick={handleConceptPick}
            onRegenerate={handleRegenerateConcepts}
            isRegenerating={isRegeneratingConcepts}
          />
        );

      case STATES.WRITING:
      case STATES.REVIEWING:
      case STATES.RETRYING:
        return <RunningScreen fsmState={fsmState} />;

      case STATES.DONE:
        return (
          <CampaignPack
            brief={brief}
            concept={selectedConcept}
            copyBundle={copyBundle}
            critique={critique}
            totalCost={totalCost}
            onRestart={restart}
          />
        );

      case STATES.ERROR:
        return (
          <div className="animate-in" style={{
            maxWidth: 480,
            margin: '0 auto',
            paddingTop: 'var(--space-16)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 32, marginBottom: 'var(--space-4)' }}>⚠</div>
            <h2 style={{ color: 'var(--c-critic)', marginBottom: 'var(--space-3)', fontSize: 'var(--text-xl)' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)' }}>
              {error || 'An unexpected error occurred. Check the trace panel for details.'}
            </p>
            <button
              onClick={restart}
              style={{
                background: 'var(--bg-floating)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-3) var(--space-6)',
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                fontFamily: 'var(--font-body)',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100dvh',
      flexDirection: showTracePanel ? 'row' : 'column',
    }}>
      {/* ── Trace panel (30%) ── */}
      {showTracePanel && (
        <div style={{
          width: '30%',
          minWidth: 240,
          maxWidth: 340,
          height: '100dvh',
          position: 'sticky',
          top: 0,
          flexShrink: 0,
        }}>
          <TracePanel events={events} currentState={STATE_LABELS[fsmState]} />
        </div>
      )}

      {/* ── Main content (70%) ── */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: showTracePanel ? 'var(--space-6) var(--space-8)' : 'var(--space-4) var(--space-6)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--space-4)',
          paddingBottom: 'var(--space-4)',
          borderBottom: showTracePanel ? '1px solid var(--border-subtle)' : 'none',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
        }}>
          <div style={{
            fontSize: 'var(--text-sm)',
            fontFamily: 'var(--font-display)',
            color: 'var(--text-muted)',
            letterSpacing: '-0.02em',
          }}>
            Brief → Campaign
          </div>
          {totalCost > 0 && <CostCounter totalCost={totalCost} />}
        </div>

        {/* Screen content */}
        <div style={{ flex: 1 }}>
          {mainContent()}
        </div>
      </div>
    </div>
  );
}
