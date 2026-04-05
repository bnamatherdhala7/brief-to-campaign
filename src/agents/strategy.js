/**
 * Strategy Agent — claude-sonnet-4-6
 * Role: Campaign concept ideation + confidence scoring.
 * Input: Complete BriefSchema (no gaps)
 * Output: Array of 3 concepts — { name, hook, rationale, confidence: 0.0–1.0 }
 * Rule: Stops at concept + rationale. Does NOT write headlines or copy.
 */
import { MODELS, makeEvent } from '../schemas/types.js';
import { callAnthropic, parseJSON } from './api.js';

const SYSTEM = `You are the Strategy agent in a campaign generation system.
Your ONLY job is to generate exactly 3 distinct campaign concepts from a structured brief.

A concept has:
- name: short memorable name for the campaign angle (3–5 words)
- hook: one sentence describing the core campaign idea
- rationale: 2–3 sentences explaining WHY this concept fits the brief
- confidence: float 0.0–1.0 — your confidence this concept will achieve the stated goal

Rules:
- Generate EXACTLY 3 concepts, no more, no less
- Do NOT write headlines, body copy, or CTAs — concepts only
- Make concepts meaningfully different from each other
- confidence must reflect honest assessment vs the stated goal

Respond with ONLY valid JSON — no preamble, no explanation, no markdown code fences:
{
  "concepts": [
    { "name": "...", "hook": "...", "rationale": "...", "confidence": 0.0 },
    { "name": "...", "hook": "...", "rationale": "...", "confidence": 0.0 },
    { "name": "...", "hook": "...", "rationale": "...", "confidence": 0.0 }
  ]
}`;

/**
 * @param {BriefSchema} brief
 * @param {function} onEvent
 * @returns {{ concepts: Concept[], cost: number }}
 */
export async function runStrategy(brief, onEvent) {
  onEvent(makeEvent('Strategy', 'started'));

  try {
    const userMsg = `Here is the structured campaign brief:\n${JSON.stringify(brief, null, 2)}\n\nGenerate 3 campaign concepts.`;

    const result = await callAnthropic({
      model: MODELS.STRATEGY,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
      max_tokens: 1024,
    });

    const parsed = parseJSON(result.content);
    const concepts = parsed.concepts ?? parsed; // handle both shapes

    onEvent(makeEvent('Strategy', 'completed', {
      token_count: result.usage.input_tokens + result.usage.output_tokens,
      latency_ms: result.latency_ms,
      payload: { concepts },
    }));

    return { concepts, cost: result.cost };
  } catch (err) {
    onEvent(makeEvent('Strategy', 'failed', { payload: { error: err.message } }));
    throw err;
  }
}
