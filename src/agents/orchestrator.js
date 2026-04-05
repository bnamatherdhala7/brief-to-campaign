/**
 * Orchestrator Agent — claude-haiku-4-5
 * Role: Planner + router + state manager.
 * Input: Raw user brief (free text)
 * Output: Workflow plan as typed JSON — ordered subtask list with agent assignments
 * Rule: Never writes copy. Never does domain work. Coordination only.
 */
import { MODELS, makeEvent } from '../schemas/types.js';
import { callAnthropic, parseJSON } from './api.js';

const SYSTEM = `You are the Orchestrator agent in a multi-agent campaign generation system.
Your ONLY job is to parse the user's raw brief and produce a structured workflow plan.
You do NOT write copy, strategy, or creative content. You coordinate only.

Respond with ONLY valid JSON matching this schema — no preamble, no explanation, no markdown code fences:
{
  "plan": [
    { "step": 1, "agent": "Brief Analyst", "task": "Extract structured brief from raw input" },
    { "step": 2, "agent": "Strategy", "task": "Generate campaign concepts" },
    { "step": 3, "agent": "Copy", "task": "Write channel copy for selected concept" },
    { "step": 4, "agent": "Critic", "task": "Evaluate copy quality vs brief" }
  ],
  "brief_summary": "<one sentence summary of the brief>",
  "detected_channels": ["linkedin", "email", "twitter"]
}`;

/**
 * @param {string} rawBrief
 * @param {function} onEvent - AgentEvent emitter
 * @returns {{ plan: Array, brief_summary: string, detected_channels: string[], cost: number }}
 */
export async function runOrchestrator(rawBrief, onEvent) {
  onEvent(makeEvent('Orchestrator', 'started'));

  let result;
  try {
    result = await callAnthropic({
      model: MODELS.ORCHESTRATOR,
      system: SYSTEM,
      messages: [{ role: 'user', content: rawBrief }],
      max_tokens: 256,
    });

    const parsed = parseJSON(result.content);

    onEvent(makeEvent('Orchestrator', 'completed', {
      token_count: result.usage.input_tokens + result.usage.output_tokens,
      latency_ms: result.latency_ms,
      payload: parsed,
    }));

    return { ...parsed, cost: result.cost };
  } catch (err) {
    onEvent(makeEvent('Orchestrator', 'failed', { payload: { error: err.message } }));
    throw err;
  }
}
