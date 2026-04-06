import { useState } from 'react';
import { AGENT_COLORS } from '../schemas/types.js';

const STATUS_COLORS = {
  started:   'var(--status-started)',
  completed: 'var(--status-completed)',
  retrying:  'var(--status-retrying)',
  failed:    'var(--status-failed)',
};

const STATUS_LABELS = {
  started:   'running',
  completed: 'done',
  retrying:  'retry',
  failed:    'failed',
};

const MODEL_BADGE = {
  'Orchestrator':   'Haiku',
  'Brief Analyst':  'Haiku',
  'Strategy':       'Sonnet',
  'Copy':           'Sonnet',
  'Critic':         'Haiku',
};

function EventRow({ event }) {
  const [open, setOpen] = useState(false);
  const color = AGENT_COLORS[event.agent] || '#8B92A8';
  const statusColor = STATUS_COLORS[event.status] || 'var(--text-secondary)';

  const payloadStr = event.payload
    ? JSON.stringify(event.payload).slice(0, 200) + (JSON.stringify(event.payload).length > 200 ? '…' : '')
    : null;

  return (
    <div
      className="animate-in"
      style={{
        borderLeft: `2px solid ${color}`,
        paddingLeft: 'var(--space-3)',
        paddingTop: 'var(--space-2)',
        paddingBottom: 'var(--space-2)',
        marginBottom: 'var(--space-1)',
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {/* Pulsing dot */}
        <span style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          flexShrink: 0,
          animation: event.status === 'started' ? 'pulse-dot 1.2s ease infinite' : 'none',
        }} />

        {/* Agent name */}
        <span style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 600,
          color: color,
        }}>
          {event.agent}
        </span>

        {/* Status badge */}
        <span style={{
          fontSize: 'var(--text-xs)',
          padding: '1px 7px',
          borderRadius: 100,
          background: statusColor + '22',
          color: statusColor,
          border: `1px solid ${statusColor}44`,
          fontWeight: 500,
        }}>
          {STATUS_LABELS[event.status] || event.status}
        </span>

        {/* Model badge */}
        <span style={{
          fontSize: 'var(--text-xs)',
          padding: '1px 6px',
          borderRadius: 100,
          background: 'var(--bg-overlay)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-default)',
        }}>
          {MODEL_BADGE[event.agent] || 'AI'}
        </span>
      </div>

      {/* Metrics row */}
      {(event.latency_ms || event.token_count) && (
        <div style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-1)',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
          fontFamily: 'ui-monospace, Consolas, monospace',
        }}>
          {event.latency_ms && <span>{event.latency_ms}ms</span>}
          {event.token_count && <span>{event.token_count} tok</span>}
        </div>
      )}

      {/* Collapsible payload */}
      {payloadStr && (
        <div style={{ marginTop: 'var(--space-1)' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{
              display: 'inline-block',
              transform: open ? 'rotate(90deg)' : 'rotate(0)',
              transition: 'transform 150ms ease',
            }}>▶</span>
            payload
          </button>
          {open && (
            <pre style={{
              marginTop: 'var(--space-1)',
              padding: 'var(--space-2)',
              background: 'var(--bg-overlay)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 10,
              color: 'var(--text-secondary)',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              lineHeight: 1.5,
            }}>
              {payloadStr}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

export function TracePanel({ events, currentState }) {
  return (
    <aside style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-floating)',
      borderRight: '1px solid var(--border-default)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--space-4) var(--space-4) var(--space-3)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0,
      }}>
        <div style={{
          fontSize: 'var(--text-xs)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-muted)',
          fontWeight: 600,
          marginBottom: 'var(--space-2)',
        }}>
          Agent Trace
        </div>
        {currentState && (
          <div style={{
            fontSize: 'var(--text-xs)',
            padding: '2px 8px',
            background: 'var(--accent-glow)',
            color: 'var(--accent)',
            borderRadius: 100,
            display: 'inline-block',
            fontFamily: 'ui-monospace, Consolas, monospace',
          }}>
            {currentState}
          </div>
        )}
      </div>

      {/* Events list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-3) var(--space-4)',
      }}>
        {events.length === 0 ? (
          <p style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
            textAlign: 'center',
            marginTop: 'var(--space-8)',
          }}>
            Agent events will appear here as they run.
          </p>
        ) : (
          events.map((ev, i) => <EventRow key={i} event={ev} />)
        )}
      </div>
    </aside>
  );
}
