import { useState, useCallback } from 'react';
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

// ─── Workflow pipeline definition ─────────────────────────────────────────────

const PIPELINE = [
  {
    id: 'analyse',
    label: 'Analyse Brief',
    description: 'Extract product, audience, goal and tone from your brief.',
    agent: 'Brief Analyst',
    model: 'Haiku',
    est: '~4s',
    activeStates: [STATES.EXTRACTING, STATES.AWAITING_CLARIFICATION],
    doneStates:   [],
  },
  {
    id: 'strategy',
    label: 'Generate Strategy',
    description: 'Create 3 distinct campaign concepts with confidence scores.',
    agent: 'Strategy',
    model: 'Sonnet',
    est: '~10s',
    activeStates: [STATES.STRATEGIZING, STATES.AWAITING_CONCEPT_PICK],
    doneStates:   [],
  },
  {
    id: 'write',
    label: 'Write Copy',
    description: 'Write LinkedIn, Email and Twitter copy for your chosen concept.',
    agent: 'Copy',
    model: 'Sonnet',
    est: '~15s',
    activeStates: [STATES.WRITING, STATES.RETRYING],
    doneStates:   [],
  },
  {
    id: 'review',
    label: 'Review Quality',
    description: 'Score copy against the brief. Retry any channel that scores below 6.',
    agent: 'Critic',
    model: 'Haiku',
    est: '~4s',
    activeStates: [STATES.REVIEWING],
    doneStates:   [],
  },
];

const STATE_STEP_INDEX = {
  [STATES.EXTRACTING]:             0,
  [STATES.AWAITING_CLARIFICATION]: 0,
  [STATES.STRATEGIZING]:           1,
  [STATES.AWAITING_CONCEPT_PICK]:  1,
  [STATES.WRITING]:                2,
  [STATES.RETRYING]:               2,
  [STATES.REVIEWING]:              3,
  [STATES.DONE]:                   4,
};

// ─── WorkflowProgress ─────────────────────────────────────────────────────────

function WorkflowProgress({ fsmState }) {
  const currentIdx = STATE_STEP_INDEX[fsmState] ?? -1;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      marginBottom: 'var(--space-8)',
      padding: 'var(--space-4) var(--space-6)',
      background: 'var(--bg-elevated)',
      borderBottom: '1px solid var(--border-subtle)',
    }}>
      {PIPELINE.map((step, i) => {
        const isDone    = currentIdx > i;
        const isActive  = currentIdx === i;
        const isUpcoming = currentIdx < i;

        const dotColor = isDone ? 'var(--c-strategy)'
          : isActive ? 'var(--accent)'
          : 'var(--border-strong)';

        return (
          <div key={step.id} style={{ display: 'flex', alignItems: 'center', flex: i < PIPELINE.length - 1 ? 1 : 'none' }}>
            {/* Step */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
              {/* Dot */}
              <div style={{
                width: 22, height: 22,
                borderRadius: '50%',
                background: isDone ? 'var(--c-strategy)' : isActive ? 'var(--accent-glow)' : 'var(--bg-overlay)',
                border: `2px solid ${dotColor}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                animation: isActive ? 'pulse-dot 1.4s ease infinite' : 'none',
              }}>
                {isDone ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                    fontFamily: 'ui-monospace, monospace',
                  }}>{i + 1}</span>
                )}
              </div>

              {/* Label */}
              <div>
                <div style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: isActive ? 700 : 500,
                  color: isDone ? 'var(--c-strategy)' : isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </div>
                {isUpcoming && (
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
                    {step.est}
                  </div>
                )}
                {isActive && (
                  <div style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'ui-monospace, monospace' }}>
                    running…
                  </div>
                )}
                {isDone && (
                  <div style={{ fontSize: 10, color: 'var(--c-strategy)' }}>done</div>
                )}
              </div>
            </div>

            {/* Connector line */}
            {i < PIPELINE.length - 1 && (
              <div style={{
                flex: 1,
                height: 1,
                margin: '0 var(--space-3)',
                background: isDone ? 'var(--c-strategy)' : 'var(--border-subtle)',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── BriefInputScreen ─────────────────────────────────────────────────────────

function BriefInputScreen({ onSubmit, isLoading }) {
  const [text, setText] = useState('');

  const EXAMPLES = [
    'Launch campaign for Notion AI — target SaaS PMs, goal: signups, tone: smart but approachable',
    'Promote a new fitness app for busy professionals. Want awareness on LinkedIn and Twitter.',
    'Market an indie game "Starfall" — college students, drive downloads, playful tone',
  ];

  return (
    <div className="animate-in" style={{ maxWidth: 620, margin: '0 auto', paddingTop: 'var(--space-16)' }}>

      {/* Eyebrow */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: '4px 12px',
        borderRadius: 100,
        background: 'var(--accent-glow)',
        border: '1px solid rgba(127,119,221,0.25)',
        marginBottom: 'var(--space-5)',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          5-agent AI system
        </span>
      </div>

      <h1 style={{
        fontFamily: 'var(--font-display)',
        fontSize: 'clamp(30px, 5vw, 46px)',
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
        lineHeight: 1.1,
        marginBottom: 'var(--space-4)',
      }}>
        Brief in.<br />
        <em style={{ fontStyle: 'italic', color: 'var(--c-strategy)' }}>Campaign pack out.</em>
      </h1>

      <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-base)', lineHeight: 1.7, marginBottom: 'var(--space-8)', maxWidth: 520 }}>
        Paste a rough brief. Five specialised agents analyse it, generate strategy concepts, write copy for LinkedIn, Email and Twitter, then critique it — all in under 45 seconds.
      </p>

      {/* Pipeline preview */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-2)',
        marginBottom: 'var(--space-8)',
        flexWrap: 'wrap',
      }}>
        {[
          { label: 'Analyse', color: 'var(--c-analyst)', est: '4s' },
          { label: 'Strategy', color: 'var(--c-strategy)', est: '10s' },
          { label: 'Write Copy', color: 'var(--c-copy)', est: '15s' },
          { label: 'Review', color: 'var(--c-critic)', est: '4s' },
        ].map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '3px 10px',
              background: 'var(--bg-floating)',
              border: '1px solid var(--border-default)',
              borderRadius: 100,
              fontSize: 'var(--text-xs)',
              color: step.color,
              fontWeight: 500,
            }}>
              <span style={{ fontFamily: 'ui-monospace, monospace', color: 'var(--text-muted)', fontSize: 10 }}>{step.est}</span>
              {step.label}
            </div>
            {i < 3 && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>}
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-3)' }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Describe your product, audience, goal and tone. Be as rough as you like — the agents will ask if anything's missing."
          disabled={isLoading}
          rows={5}
          style={{
            width: '100%',
            background: 'var(--bg-elevated)',
            border: '1.5px solid var(--border-default)',
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

      <button
        onClick={() => text.trim() && onSubmit(text.trim())}
        disabled={!text.trim() || isLoading}
        style={{
          width: '100%',
          padding: 'var(--space-4)',
          background: text.trim() && !isLoading ? 'var(--accent)' : 'var(--bg-floating)',
          border: `1.5px solid ${text.trim() && !isLoading ? 'var(--accent)' : 'var(--border-default)'}`,
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
          marginBottom: 'var(--space-6)',
        }}
        onMouseEnter={e => { if (text.trim() && !isLoading) e.currentTarget.style.opacity = '0.88'; }}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        onMouseDown={e => { if (text.trim() && !isLoading) e.currentTarget.style.transform = 'scale(0.99)'; }}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isLoading ? (
          <>
            <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block' }} className="spin" />
            Running agents…
          </>
        ) : 'Generate Campaign →'}
      </button>

      {/* Examples */}
      <div>
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
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            {ex}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── ClarificationScreen ──────────────────────────────────────────────────────

function ClarificationScreen({ questions, brief, onSubmit }) {
  const [answers, setAnswers] = useState({});
  const allAnswered = questions.every(q => (answers[q.field] || '').trim());

  return (
    <div className="animate-in" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 'var(--space-10)' }}>
      <StepCard
        agent="Brief Analyst"
        model="Haiku"
        title="A couple of things…"
        rationale="The Brief Analyst extracted your brief but found some fields missing. Answering these questions lets the Strategy agent work with a complete picture."
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
          onMouseEnter={e => { if (allAnswered) e.currentTarget.style.opacity = '0.88'; }}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Continue to Strategy →
        </button>
      </StepCard>
    </div>
  );
}

// ─── ConceptPickScreen ────────────────────────────────────────────────────────

function ConceptPickScreen({ concepts, onPick, onRegenerate, isRegenerating }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="animate-in" style={{ maxWidth: 680, margin: '0 auto', paddingTop: 'var(--space-8)' }}>
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
                border: `1.5px solid ${hovered === i ? 'var(--c-strategy)66' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                transform: hovered === i ? 'translateY(-2px)' : 'translateY(0)',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <div style={{ width: 52, height: 4, background: 'var(--border-default)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      width: `${concept.confidence * 100}%`,
                      height: '100%',
                      background: concept.confidence >= 0.75 ? 'var(--c-strategy)' : concept.confidence >= 0.5 ? '#BA7517' : '#D85A30',
                      borderRadius: 2,
                    }} />
                  </div>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'ui-monospace, monospace' }}>
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
            ? <><span className="spin" style={{ width: 10, height: 10, border: '1.5px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} /> Regenerating…</>
            : '↺  Regenerate concepts (≈ $0.002)'}
        </button>
      </StepCard>
    </div>
  );
}

// ─── RunningScreen ────────────────────────────────────────────────────────────

const RUNNING_CONTEXT = {
  [STATES.EXTRACTING]: {
    agent: 'Brief Analyst',
    color: 'var(--c-analyst)',
    title: 'Analysing your brief',
    detail: 'Extracting product, audience, goal, channels and tone into a typed schema.',
    nextSteps: ['Strategy Agent generates 3 concepts (~10s)', 'You pick a direction', 'Copy Agent writes all 3 channels (~15s)', 'Critic reviews quality (~4s)'],
  },
  [STATES.STRATEGIZING]: {
    agent: 'Strategy',
    color: 'var(--c-strategy)',
    title: 'Generating campaign concepts',
    detail: 'Creating 3 meaningfully different campaign angles with confidence scores.',
    nextSteps: ['You pick a direction', 'Copy Agent writes all 3 channels (~15s)', 'Critic reviews quality (~4s)'],
  },
  [STATES.WRITING]: {
    agent: 'Copy',
    color: 'var(--c-copy)',
    title: 'Writing channel copy',
    detail: 'Writing LinkedIn, Email and Twitter copy for your concept in one batched call.',
    nextSteps: ['Critic reviews all 3 channels (~4s)', 'Campaign pack ready'],
  },
  [STATES.REVIEWING]: {
    agent: 'Critic',
    color: 'var(--c-critic)',
    title: 'Reviewing copy quality',
    detail: 'Scoring each channel against the brief. Any channel below 6/10 triggers a revision.',
    nextSteps: ['Campaign pack ready'],
  },
  [STATES.RETRYING]: {
    agent: 'Copy',
    color: 'var(--c-copy)',
    title: 'Revising copy',
    detail: 'Re-writing flagged channels using the Critic\'s notes as context.',
    nextSteps: ['Critic re-evaluates revised channels (~4s)', 'Campaign pack ready'],
  },
};

function RunningScreen({ fsmState }) {
  const ctx = RUNNING_CONTEXT[fsmState] || RUNNING_CONTEXT[STATES.EXTRACTING];

  return (
    <div className="animate-in" style={{
      maxWidth: 520,
      margin: '0 auto',
      paddingTop: 'var(--space-10)',
    }}>
      {/* Agent card */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: `1px solid ${ctx.color}33`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
          <div style={{
            width: 36, height: 36,
            borderRadius: 'var(--radius-sm)',
            background: ctx.color + '20',
            border: `1px solid ${ctx.color}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{
              width: 10, height: 10,
              borderRadius: '50%',
              background: ctx.color,
              display: 'inline-block',
              animation: 'pulse-dot 1.2s ease infinite',
            }} />
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: ctx.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {ctx.agent} Agent
            </div>
            <div style={{ fontSize: 'var(--text-lg)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>
              {ctx.title}
            </div>
          </div>

          {/* Spinner */}
          <div style={{ marginLeft: 'auto' }}>
            <div style={{
              width: 20, height: 20,
              border: `2px solid ${ctx.color}33`,
              borderTopColor: ctx.color,
              borderRadius: '50%',
            }} className="spin" />
          </div>
        </div>

        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          {ctx.detail}
        </p>
      </div>

      {/* What's next */}
      {ctx.nextSteps.length > 0 && (
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-3)' }}>
            What's next
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {ctx.nextSteps.map((step, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '1.5px solid var(--border-strong)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--border-strong)', display: 'block' }} />
                </span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{step}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [fsmState, setFsmState]       = useState(STATES.IDLE);
  const [events, setEvents]           = useState([]);
  const [totalCost, setTotalCost]     = useState(0);
  const [brief, setBrief]             = useState(null);
  const [clarifyQs, setClarifyQs]     = useState([]);
  const [concepts, setConcepts]       = useState([]);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [copyBundle, setCopyBundle]   = useState(null);
  const [critique, setCritique]       = useState(null);
  const [error, setError]             = useState(null);
  const [isRegeneratingConcepts, setIsRegeneratingConcepts] = useState(false);

  const MAX_RETRIES = 1; // one retry max — saves ~$0.005 vs 2 retries

  const emit = useCallback((event, cost = 0) => {
    setEvents(evs => [...evs, event]);
    if (cost > 0) setTotalCost(t => t + cost);
  }, []);

  const go = useCallback((to) => {
    setFsmState(current => {
      transition(current, to);
      return to;
    });
  }, []);

  const restart = useCallback(() => {
    setFsmState(STATES.IDLE);
    setEvents([]);
    setTotalCost(0);
    setBrief(null);
    setClarifyQs([]);
    setConcepts([]);
    setSelectedConcept(null);
    setCopyBundle(null);
    setCritique(null);
    setError(null);
  }, []);

  const handleBriefSubmit = useCallback(async (text) => {
    setError(null);
    go(STATES.EXTRACTING);

    try {
      const { cost: oCost } = await runOrchestrator(text, (ev) => emit(ev));
      setTotalCost(t => t + oCost);

      const { brief: extracted, cost: aCost } = await runAnalyst(text, (ev) => emit(ev));
      setTotalCost(t => t + aCost);
      setBrief(extracted);

      if (extracted.gaps && extracted.gaps.length > 0) {
        setClarifyQs(gapsToQuestions(extracted.gaps));
        go(STATES.AWAITING_CLARIFICATION);
      } else {
        await runStrategyPhase(extracted);
      }
    } catch (err) {
      setError(err.message);
      setFsmState(STATES.ERROR);
    }
  }, [emit, go]);

  const handleClarificationSubmit = useCallback(async (completeBrief) => {
    setBrief(completeBrief);
    await runStrategyPhase(completeBrief);
  }, []);

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

  const handleConceptPick = useCallback(async (concept) => {
    setSelectedConcept(concept);
    await runCopyPhase(concept, brief, null, 0);
  }, [brief]);

  const runCopyPhase = useCallback(async (concept, currentBrief, critiqueNotes, currentRetry) => {
    try {
      setFsmState(currentRetry > 0 ? STATES.RETRYING : STATES.WRITING);
      const { copyBundle: newBundle, cost: copyCost } = await runCopy(concept, currentBrief, critiqueNotes, (ev) => emit(ev));
      setTotalCost(t => t + copyCost);
      setCopyBundle(newBundle);

      setFsmState(STATES.REVIEWING);
      const { critique: newCritique, cost: criticCost } = await runCritic(newBundle, currentBrief, (ev) => emit(ev));
      setTotalCost(t => t + criticCost);
      setCritique(newCritique);

      const needsRetry = newCritique.retry && newCritique.retry.length > 0;

      if (needsRetry && currentRetry < MAX_RETRIES) {
        await runCopyPhase(concept, currentBrief, newCritique, currentRetry + 1);
      } else {
        setFsmState(STATES.DONE);
      }
    } catch (err) {
      setError(err.message);
      setFsmState(STATES.ERROR);
    }
  }, [emit]);

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
            <div style={{
              width: 48, height: 48,
              borderRadius: 'var(--radius-md)',
              background: 'rgba(216,90,48,0.12)',
              border: '1px solid rgba(216,90,48,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto var(--space-4)',
              fontSize: 22,
            }}>⚠</div>
            <h2 style={{ color: 'var(--c-critic)', marginBottom: 'var(--space-3)', fontSize: 'var(--text-xl)', fontFamily: 'var(--font-display)' }}>
              Something went wrong
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-6)', lineHeight: 1.7 }}>
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
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
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
          maxWidth: 320,
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
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Top bar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: 'var(--space-4) var(--space-8)',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          flexShrink: 0,
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

        {/* Progress stepper — visible during workflow */}
        {showTracePanel && fsmState !== STATES.DONE && fsmState !== STATES.ERROR && (
          <WorkflowProgress fsmState={fsmState} />
        )}

        {/* Screen content */}
        <div style={{ flex: 1, padding: showTracePanel ? 'var(--space-6) var(--space-8)' : 'var(--space-4) var(--space-6)' }}>
          {mainContent()}
        </div>
      </div>
    </div>
  );
}
