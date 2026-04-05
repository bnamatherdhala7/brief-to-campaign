import { LinkedInPreview, TwitterPreview, EmailPreview } from './ChannelPreview.jsx';
import { CostCounter } from './CostCounter.jsx';

function CopySection({ channel, copy, color, label, Preview }) {
  return (
    <div style={{
      marginBottom: 'var(--space-8)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        marginBottom: 'var(--space-4)',
      }}>
        <span style={{
          width: 3, height: 20,
          background: color, borderRadius: 2,
        }} />
        <h3 style={{
          fontSize: 'var(--text-lg)',
          fontFamily: 'var(--font-display)',
          color: 'var(--text-primary)',
        }}>
          {label}
        </h3>
      </div>

      {/* Preview */}
      <div style={{ marginBottom: 'var(--space-4)', overflowX: 'auto' }}>
        <Preview copy={copy} />
      </div>

      {/* Copy fields */}
      <div style={{
        display: 'grid',
        gap: 'var(--space-3)',
        background: 'var(--bg-floating)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-4)',
      }}>
        {[
          { label: 'Headline', value: copy.headline },
          { label: 'Body', value: copy.body },
          { label: 'CTA', value: copy.cta },
        ].map(({ label: fieldLabel, value }) => (
          <div key={fieldLabel}>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {fieldLabel}
            </div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CampaignPack({ brief, concept, copyBundle, critique, totalCost, onRestart }) {
  if (!copyBundle) return null;

  const allPassed = critique && critique.retry.length === 0;
  const scores = critique?.scores;

  function ScorePill({ score }) {
    const color = score >= 7 ? '#1D9E75' : score >= 5 ? '#BA7517' : '#D85A30';
    return (
      <span style={{
        fontSize: 'var(--text-xs)',
        padding: '1px 8px',
        borderRadius: 100,
        background: color + '22',
        color,
        border: `1px solid ${color}44`,
        fontWeight: 600,
        fontFamily: 'ui-monospace, Consolas, monospace',
      }}>
        {score}/10
      </span>
    );
  }

  return (
    <div className="animate-in" style={{ padding: 'var(--space-6) 0' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        marginBottom: 'var(--space-8)',
      }}>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-2)' }}>
            Campaign Pack
          </div>
          <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--text-primary)', marginBottom: 'var(--space-2)' }}>
            {concept?.name || 'Campaign'}
          </h2>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', maxWidth: 480 }}>
            {concept?.hook}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', alignItems: 'flex-end' }}>
          <CostCounter totalCost={totalCost} />
          {scores && (
            <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Quality:</span>
              <ScorePill score={scores.linkedin} />
              <ScorePill score={scores.email} />
              <ScorePill score={scores.twitter} />
            </div>
          )}
        </div>
      </div>

      {/* Critic notes if anything was retried */}
      {critique?.notes && !allPassed && (
        <div style={{
          background: '#BA751718',
          border: '1px solid #BA751744',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
          fontSize: 'var(--text-sm)',
          color: '#BA7517',
        }}>
          <strong>Critic notes (max retries reached):</strong> {critique.notes}
        </div>
      )}

      {/* Channel sections */}
      <CopySection
        channel="linkedin"
        copy={copyBundle.linkedin}
        color="#0A66C2"
        label="LinkedIn"
        Preview={({ copy }) => <LinkedInPreview copy={copy} product={brief?.product} />}
      />
      <CopySection
        channel="twitter"
        copy={copyBundle.twitter}
        color="#1D9BF0"
        label="Twitter / X"
        Preview={({ copy }) => <TwitterPreview copy={copy} product={brief?.product} />}
      />
      <CopySection
        channel="email"
        copy={copyBundle.email}
        color="#D85A30"
        label="Email"
        Preview={({ copy }) => <EmailPreview copy={copy} product={brief?.product} />}
      />

      {/* Restart */}
      <div style={{ textAlign: 'center', paddingTop: 'var(--space-8)', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          onClick={onRestart}
          style={{
            background: 'var(--bg-floating)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-3) var(--space-6)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            fontFamily: 'var(--font-body)',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-strong)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-default)'}
        >
          Start new campaign
        </button>
      </div>
    </div>
  );
}
