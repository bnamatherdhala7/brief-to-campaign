// Vercel serverless function — proxies agent calls to Anthropic
// Rate limited to 2 campaigns/day per IP via Upstash Redis
// Required env vars: ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN

const DAILY_LIMIT = 2;

// Lightweight Upstash Redis fetch — no SDK needed at runtime, but we use the npm package
async function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null; // rate limiting disabled if Upstash not configured
  }
  const { Redis } = await import('@upstash/redis');
  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

function getIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    req.socket?.remoteAddress ||
    'unknown'
  );
}

function todayKey(ip) {
  const d = new Date().toISOString().slice(0, 10); // "2026-04-05"
  return `ratelimit:${ip}:${d}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const redis = await getRedis();
  if (redis) {
    const ip  = getIP(req);
    const key = todayKey(ip);

    const count = await redis.incr(key);
    if (count === 1) {
      // First request today — expire key at midnight (up to 86400s)
      const now = new Date();
      const secondsUntilMidnight = 86400 - (now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds());
      await redis.expire(key, secondsUntilMidnight);
    }

    res.setHeader('X-RateLimit-Limit', DAILY_LIMIT);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, DAILY_LIMIT - count));

    if (count > DAILY_LIMIT) {
      res.status(429).json({
        error: `Daily limit reached. This demo allows ${DAILY_LIMIT} campaigns per day per user. Try again tomorrow.`,
      });
      return;
    }
  }

  // ── API key check ──────────────────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server.' });
    return;
  }

  const { model, system, messages, max_tokens = 1024 } = req.body;
  if (!model || !messages) {
    res.status(400).json({ error: 'Missing model or messages' });
    return;
  }

  // ── Forward to Anthropic ───────────────────────────────────────────────────
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({ model, system, messages, max_tokens }),
    });

    const data = await response.json();

    if (!response.ok) {
      res.status(response.status).json({ error: data.error?.message || 'Anthropic API error' });
      return;
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
