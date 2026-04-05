/**
 * Brief Analyst Agent — claude-haiku-4-5
 * Role: Structured extraction of brief into typed BriefSchema.
 * Input: Raw brief string
 * Output: BriefSchema JSON — { product, audience, goal, channels, tone, gaps[] }
 * Rule: Pure extraction. If gaps[] non-empty, surface clarification UI. Max 2 questions.
 */
import { MODELS, makeEvent, emptyBriefSchema } from '../schemas/types.js';
import { callAnthropic, parseJSON } from './api.js';

const SYSTEM = `You are the Brief Analyst agent in a campaign generation system.
Your ONLY job is to extract structured information from a raw marketing brief.

Extract exactly these fields:
- product: what product/service/feature is being marketed (string or null)
- audience: who is the target audience (string or null)
- goal: primary campaign goal — must be one of "downloads", "signups", "awareness", or null if unclear
- channels: array of marketing channels from ["linkedin", "email", "twitter"] mentioned or implied
- tone: desired tone of voice (string or null)
- gaps: array of field NAMES that are null or missing (e.g. ["audience", "goal"])

Rules:
- If channels is empty or not mentioned, default to ["linkedin", "email", "twitter"]
- gaps must contain the field name (not a question) for any field that is null
- Maximum 2 items in gaps — pick the most important missing fields

Respond with ONLY valid JSON matching the BriefSchema — no preamble, no explanation, no markdown code fences:
{
  "product": "...",
  "audience": "...",
  "goal": "...",
  "channels": ["linkedin", "email", "twitter"],
  "tone": "...",
  "gaps": []
}`;

/**
 * @param {string} rawBrief
 * @param {function} onEvent
 * @returns {{ brief: BriefSchema, cost: number }}
 */
export async function runAnalyst(rawBrief, onEvent) {
  onEvent(makeEvent('Brief Analyst', 'started'));

  try {
    const result = await callAnthropic({
      model: MODELS.ANALYST,
      system: SYSTEM,
      messages: [{ role: 'user', content: rawBrief }],
      max_tokens: 300,
    });

    const brief = parseJSON(result.content);

    // Ensure all required fields exist
    const schema = emptyBriefSchema();
    const normalised = { ...schema, ...brief };

    // Ensure gaps is an array
    if (!Array.isArray(normalised.gaps)) normalised.gaps = [];

    // Ensure channels has defaults
    if (!normalised.channels || normalised.channels.length === 0) {
      normalised.channels = ['linkedin', 'email', 'twitter'];
    }

    onEvent(makeEvent('Brief Analyst', 'completed', {
      token_count: result.usage.input_tokens + result.usage.output_tokens,
      latency_ms: result.latency_ms,
      payload: normalised,
    }));

    return { brief: normalised, cost: result.cost };
  } catch (err) {
    onEvent(makeEvent('Brief Analyst', 'failed', { payload: { error: err.message } }));
    throw err;
  }
}

/**
 * Generate clarification questions for gaps in the brief.
 * Returns max 2 questions, one per gap field.
 */
export function gapsToQuestions(gaps) {
  const QUESTIONS = {
    product:  'What product or service are you marketing?',
    audience: 'Who is your target audience?',
    goal:     'What is the primary goal? (downloads / signups / awareness)',
    channels: 'Which channels should we target? (LinkedIn, Email, Twitter)',
    tone:     'What tone should the campaign have? (e.g. professional, playful, urgent)',
  };
  return gaps.slice(0, 2).map(field => ({
    field,
    question: QUESTIONS[field] || `Can you clarify the ${field}?`,
  }));
}
