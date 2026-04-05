/**
 * Copy Agent — claude-sonnet-4-6
 * Role: Channel-specific copy writing.
 * Input: Selected concept + complete BriefSchema
 * Output: CopyBundle — { linkedin, email, twitter } each with { headline, body, cta }
 * Rule: ALL 3 channels batched in ONE API call — never 3 separate calls.
 */
import { MODELS, makeEvent } from '../schemas/types.js';
import { callAnthropic, parseJSON } from './api.js';

const SYSTEM = `You are the Copy agent in a campaign generation system.
Your ONLY job is to write channel-specific marketing copy for all 3 channels in ONE response.

Write copy for: LinkedIn, Email, and Twitter.

Each channel must have:
- headline: attention-grabbing headline (LinkedIn: ≤100 chars, Email: ≤60 chars subject line, Twitter: ≤80 chars)
- body: main copy (LinkedIn: 150–250 words professional post, Email: 120–200 words email body, Twitter: ≤240 chars tweet)
- cta: call-to-action text (≤30 chars)

Rules:
- Match the tone from the brief exactly
- ALL 3 channels must be written in this SINGLE response
- Tailor format to each platform's conventions
- LinkedIn: professional, insight-driven, can use line breaks
- Email: warm, clear, benefit-led
- Twitter: punchy, direct, may use 1-2 hashtags

Respond with ONLY valid JSON — no preamble, no explanation, no markdown code fences:
{
  "linkedin": { "headline": "...", "body": "...", "cta": "..." },
  "email":    { "headline": "...", "body": "...", "cta": "..." },
  "twitter":  { "headline": "...", "body": "...", "cta": "..." }
}`;

/**
 * @param {Concept} concept
 * @param {BriefSchema} brief
 * @param {object|null} critiqueNotes - optional critique from previous run
 * @param {function} onEvent
 * @returns {{ copyBundle: CopyBundle, cost: number }}
 */
export async function runCopy(concept, brief, critiqueNotes, onEvent) {
  onEvent(makeEvent('Copy', 'started'));

  try {
    let userMsg = `Campaign Brief:\n${JSON.stringify(brief, null, 2)}\n\nSelected Concept:\n${JSON.stringify(concept, null, 2)}\n\nWrite copy for all 3 channels.`;

    if (critiqueNotes) {
      userMsg += `\n\nIMPORTANT — Previous copy was rejected. Critique notes:\n${JSON.stringify(critiqueNotes, null, 2)}\n\nFix the issues noted above in this revision.`;
    }

    const result = await callAnthropic({
      model: MODELS.COPY,
      system: SYSTEM,
      messages: [{ role: 'user', content: userMsg }],
      max_tokens: 2048,
    });

    const copyBundle = parseJSON(result.content);

    onEvent(makeEvent('Copy', 'completed', {
      token_count: result.usage.input_tokens + result.usage.output_tokens,
      latency_ms: result.latency_ms,
      payload: copyBundle,
    }));

    return { copyBundle, cost: result.cost };
  } catch (err) {
    onEvent(makeEvent('Copy', 'failed', { payload: { error: err.message } }));
    throw err;
  }
}
