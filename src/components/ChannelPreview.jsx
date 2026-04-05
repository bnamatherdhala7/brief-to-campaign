/**
 * CSS-only social channel preview cards.
 * Renders LinkedIn, Twitter, Email mockups without any image generation.
 */

function Avatar({ name, color }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export function LinkedInPreview({ copy, product }) {
  return (
    <div style={{
      background: '#1B1F23',
      borderRadius: 8,
      border: '1px solid #2D3035',
      overflow: 'hidden',
      fontFamily: '"Segoe UI", Arial, sans-serif',
      maxWidth: 540,
    }}>
      {/* Post header */}
      <div style={{ padding: '12px 16px 0', display: 'flex', gap: 10 }}>
        <Avatar name={product || 'My Product'} color="#0A66C2" />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#E7E9EA' }}>{product || 'Your Company'}</div>
          <div style={{ fontSize: 12, color: '#838894' }}>1,248 followers • Promoted</div>
        </div>
      </div>

      {/* Copy body */}
      <div style={{ padding: '10px 16px 12px' }}>
        <p style={{
          fontSize: 14, lineHeight: 1.6, color: '#E7E9EA',
          whiteSpace: 'pre-wrap', margin: 0,
        }}>
          <strong style={{ display: 'block', marginBottom: 6, fontSize: 15 }}>{copy.headline}</strong>
          {copy.body}
        </p>
      </div>

      {/* CTA banner */}
      <div style={{
        borderTop: '1px solid #2D3035',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#161A1D',
      }}>
        <span style={{ fontSize: 12, color: '#838894' }}>See how you compare</span>
        <button style={{
          background: 'transparent',
          border: '1px solid #70B5F9',
          color: '#70B5F9',
          borderRadius: 16,
          padding: '5px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'default',
        }}>
          {copy.cta}
        </button>
      </div>

      {/* Engagement bar */}
      <div style={{
        borderTop: '1px solid #2D3035',
        padding: '8px 16px',
        display: 'flex',
        gap: 16,
        fontSize: 12,
        color: '#838894',
      }}>
        <span>👍 Like</span>
        <span>💬 Comment</span>
        <span>🔁 Repost</span>
        <span>✈️ Send</span>
      </div>
    </div>
  );
}

export function TwitterPreview({ copy, product }) {
  return (
    <div style={{
      background: '#16181C',
      borderRadius: 12,
      border: '1px solid #2F3336',
      padding: '12px 16px',
      fontFamily: '"Chirp", "Segoe UI", Arial, sans-serif',
      maxWidth: 540,
    }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Avatar name={product || 'My Product'} color="#1D9BF0" />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#E7E9EA' }}>{product || 'YourBrand'}</span>
            <span style={{ fontSize: 13, color: '#71767B' }}>@yourbrand</span>
            <span style={{ fontSize: 13, color: '#71767B' }}>· now</span>
          </div>

          <p style={{
            fontSize: 15, lineHeight: 1.55, color: '#E7E9EA',
            margin: '0 0 10px', whiteSpace: 'pre-wrap',
          }}>
            {copy.body}
          </p>

          {/* Link card mockup */}
          <div style={{
            border: '1px solid #2F3336',
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 10,
          }}>
            <div style={{ fontSize: 13, color: '#71767B', marginBottom: 2 }}>yourdomain.com</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E7E9EA' }}>{copy.headline}</div>
            <div style={{ fontSize: 13, color: '#E7E9EA', marginTop: 2 }}>{copy.cta} →</div>
          </div>

          <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#71767B' }}>
            <span>💬 12</span>
            <span>🔁 34</span>
            <span>❤️ 128</span>
            <span>📊 4.2K</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmailPreview({ copy, product }) {
  return (
    <div style={{
      background: '#F9F9F9',
      borderRadius: 8,
      border: '1px solid #E0E0E0',
      overflow: 'hidden',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      maxWidth: 540,
    }}>
      {/* Email header */}
      <div style={{ background: '#FFFFFF', padding: '12px 20px', borderBottom: '1px solid #E0E0E0' }}>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>
          <span style={{ fontWeight: 600, color: '#333' }}>From:</span> {product || 'Your Brand'} &lt;hello@yourbrand.com&gt;
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>
          <span style={{ fontWeight: 600, color: '#333' }}>Subject:</span>{' '}
          <strong style={{ color: '#111' }}>{copy.headline}</strong>
        </div>
      </div>

      {/* Email body */}
      <div style={{ background: '#FFFFFF', padding: '24px 28px' }}>
        <p style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: '#333',
          whiteSpace: 'pre-wrap',
          margin: '0 0 20px',
        }}>
          {copy.body}
        </p>

        {/* CTA button */}
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <button style={{
            background: '#111',
            color: '#FFF',
            border: 'none',
            borderRadius: 6,
            padding: '12px 28px',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'default',
          }}>
            {copy.cta}
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#999', textAlign: 'center', margin: 0 }}>
          You're receiving this because you opted in. <u>Unsubscribe</u>
        </p>
      </div>
    </div>
  );
}
