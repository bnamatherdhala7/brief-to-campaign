import { MAX_COST_WARNING, MAX_COST_CAP } from '../schemas/types.js';

export function CostCounter({ totalCost }) {
  const pct = Math.min(totalCost / MAX_COST_CAP, 1);
  const isWarning = totalCost >= MAX_COST_WARNING;
  const isCapped  = totalCost >= MAX_COST_CAP;

  const color = isCapped ? '#D85A30' : isWarning ? '#BA7517' : '#1D9E75';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-2)',
      padding: 'var(--space-2) var(--space-3)',
      background: 'var(--bg-floating)',
      border: `1px solid ${isWarning ? color + '44' : 'var(--border-default)'}`,
      borderRadius: 'var(--radius-sm)',
      fontSize: 'var(--text-xs)',
      fontFamily: 'ui-monospace, Consolas, monospace',
      color: color,
    }}>
      <span style={{ opacity: 0.6, color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
        Cost
      </span>
      <span style={{ fontWeight: 600, letterSpacing: '0.02em' }}>
        ${totalCost.toFixed(4)}
      </span>
      {/* Mini progress bar */}
      <div style={{
        width: 36,
        height: 3,
        background: 'var(--border-default)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct * 100}%`,
          height: '100%',
          background: color,
          borderRadius: 2,
          transition: 'width 400ms ease',
        }} />
      </div>
      {isWarning && !isCapped && (
        <span style={{ color: '#BA7517', fontSize: 'var(--text-xs)' }}>near limit</span>
      )}
      {isCapped && (
        <span style={{ color: '#D85A30', fontSize: 'var(--text-xs)' }}>⚠ cap reached</span>
      )}
    </div>
  );
}
