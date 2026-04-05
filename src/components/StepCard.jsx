import { useState } from 'react';
import { AGENT_COLORS } from '../schemas/types.js';

const STATUS_STYLES = {
  idle:    { bg: 'var(--bg-floating)', border: 'var(--border-subtle)', label: 'Waiting' },
  running: { bg: 'var(--bg-floating)', border: 'var(--accent)44',      label: 'Running…' },
  done:    { bg: 'var(--bg-floating)', border: 'var(--status-completed)44', label: 'Done' },
  retried: { bg: 'var(--bg-floating)', border: 'var(--status-retrying)44',  label: 'Retried' },
  error:   { bg: 'var(--bg-floating)', border: 'var(--status-failed)44',    label: 'Error' },
};

/**
 * @param {{
 *   agent: string,
 *   model: string,
 *   title: string,
 *   rationale: string,
 *   status: 'idle'|'running'|'done'|'retried'|'error',
 *   children: React.ReactNode,
 * }} props
 */
export function StepCard({ agent, model, title, rationale, status = 'idle', children }) {
  const [showRationale, setShowRationale] = useState(false);
  const color = AGENT_COLORS[agent] || '#8B92A8';
  const style = STATUS_STYLES[status] || STATUS_STYLES.idle;

  return (
    <div
      className="animate-in"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-6)',
        marginBottom: 'var(--space-4)',
      }}
    >
      {/* Card header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 'var(--space-4)',
        flexWrap: 'wrap',
        gap: 'var(--space-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          {/* Agent color bar */}
          <span style={{
            width: 3,
            height: 20,
            background: color,
            borderRadius: 2,
            flexShrink: 0,
          }} />
          <div>
            <div style={{
              fontSize: 'var(--text-xs)',
              color: color,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
            }}>
              {agent}
            </div>
            <div style={{
              fontSize: 'var(--text-lg)',
              fontFamily: 'var(--font-display)',
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
            }}>
              {title}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          {/* Model badge */}
          <span style={{
            fontSize: 'var(--text-xs)',
            padding: '2px 8px',
            borderRadius: 100,
            background: 'var(--bg-overlay)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-default)',
          }}>
            {model}
          </span>
          {/* Status badge */}
          <span style={{
            fontSize: 'var(--text-xs)',
            padding: '2px 8px',
            borderRadius: 100,
            background: color + '18',
            color: color,
            border: `1px solid ${color}44`,
            fontWeight: 500,
          }}>
            {status === 'running'
              ? <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, border: `2px solid ${color}`, borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block' }} className="spin" />
                  Running
                </span>
              : style.label
            }
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginBottom: rationale ? 'var(--space-4)' : 0 }}>
        {children}
      </div>

      {/* Why this step? expandable */}
      {rationale && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-3)' }}>
          <button
            onClick={() => setShowRationale(r => !r)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: showRationale ? 'rotate(90deg)' : 'rotate(0)',
              transition: 'transform 150ms ease',
              fontSize: 9,
            }}>▶</span>
            Why this step?
          </button>
          {showRationale && (
            <p style={{
              marginTop: 'var(--space-2)',
              fontSize: 'var(--text-sm)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}>
              {rationale}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
