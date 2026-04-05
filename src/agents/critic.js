/**
 * Critic Agent — claude-haiku-4-5
 * Role: LLM-as-judge quality evaluation.
 * Input: CopyBundle + original BriefSchema
 * Output: CritiqueResult — { scores: {linkedin, email, twitter}, retry: string[], notes: string }
 * Rule: Scores each channel 0–10. Any score < 7 triggers retry. Max 2 retries total.
 */
import { MODELS, makeEvent } from '../schemas/types.js';
import { callAnthropic, parseJSON } from './api.js';

const SYSTEM = `You are the Critic agent in a campaign generation system.
Your ONLY job is to evaluate marketing copy quality against the original brief.

Evaluate each channel (LinkedIn, Email, Twitter) on a score from 0–10 based on:
- Brief fidelity: does the copy match the product, audience, goal, and tone from the brief?
- Channel appropriateness: is the format/length/style right for this channel?
- Clarity and impact: is the message clear and likely to achieve the stated goal?
- CTA effectiveness: is the call-to-action compelling and specific?

Scoring guide:
- 9-10: Excellent — publish-ready
- 7-8: Good — minor improvements possible
- 5-6: Mediocre — needs revision
- 0-4: Poor — significant issues

Rules:
- Be strict. A 7 means genuinely good copy.
- Any channel scoring below 6 must be listed in the "retry" array.
- "notes" must be actionable — explain WHAT to fix and HOW, not just that it's bad.

Respond with ONLY valid JSON — no preamble, no explanation, no markdown code fences:
{
  "scores": { "linkedin": 0, "email": 0, "twitter": 0 },
  "retry": [],
  "notes": "..."
}`;

/**
 * @param {CopyBundle} copyBundle
 * @param {BriefSchema} brief
 * @param {function} onEvent
 * @returns {{ critique: CritiqueResult, cost: number }}
 */
export async function runCritic(copyBundle, brief, onEvent) {
  onEvent(makeEvent('Critic', 'started'));

  try {
    const userMsg = `Original Brief:\n${JSON.stringify(brief, null, 2)}\n\nCopy to evaluate:\n${JSON.stringify(copyBundle, null, 2)}\n\nEvaluate all 3 channels.`;

    const result = await callAnthropic({
      model: MODELS.CRITIC,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
      max_tokens: 512,
    });

    const critique = parseJSON(result.content);

    // Ensure retry is derived from scores < 7 if model didn't fill it
    if (!Array.isArray(critique.retry)) {
      critique.retry = Object.entries(critique.scores || {})
        .filter(([, score]) => score < 6)
        .map(([channel]) => channel);
    }

    onEvent(makeEvent('Critic', 'completed', {
      token_count: result.usage.input_tokens + result.usage.output_tokens,
      latency_ms: result.latency_ms,
      payload: critique,
    }));

    return { critique, cost: result.cost };
  } catch (err) {
    onEvent(makeEvent('Critic', 'failed', { payload: { error: err.message } }));
    throw err;
  }
}
