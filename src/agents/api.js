/**
 * Shared API call wrapper used by all agents.
 * Routes through /api/agent (Vercel serverless or local dev proxy).
 */
import { calcCost } from '../schemas/types.js';

/**
 * Call the Anthropic API via our backend proxy.
 * @param {{ model: string, system: string, messages: Array, max_tokens?: number }} params
 * @returns {{ content: string, usage: object, cost: number, latency_ms: number }}
 */
export async function callAnthropic({ model, system, messages, max_tokens = 1024 }) {
  const start = Date.now();

  const response = await fetch('/api/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, system, messages, max_tokens }),
  });

  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) {
      throw new Error(
        `Proxy error (HTTP ${response.status}). Is the dev server running?\n` +
        `Run: node server.cjs`
      );
    }
    throw new Error(`Invalid JSON from proxy (status ${response.status})`);
  }

  if (response.status === 429) {
    throw new Error(data.error || 'Daily limit reached. This demo allows 2 campaigns per day. Try again tomorrow.');
  }

  if (!response.ok || data.error) {
    throw new Error(data.error || `API error ${response.status}`);
  }

  const latency_ms = Date.now() - start;
  const text = data.content?.[0]?.text ?? '';
  const usage = data.usage ?? { input_tokens: 0, output_tokens: 0 };
  const cost = calcCost(model, usage);

  return { content: text, usage, cost, latency_ms };
}

/**
 * Parse JSON from a model response, stripping any accidental markdown fences.
 */
export function parseJSON(text) {
  // Strip markdown fences if the model misbehaves
  const cleaned = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(cleaned);
}
