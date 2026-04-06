/**
 * Typed schemas for all agent communication.
 * These are the canonical shapes — all agents read/write these.
 */

// Model constants — never hardcode inline
export const MODELS = {
  ORCHESTRATOR: 'claude-haiku-4-5-20251001',
  ANALYST:      'claude-haiku-4-5-20251001',
  STRATEGY:     'claude-sonnet-4-6',
  COPY:         'claude-sonnet-4-6',
  CRITIC:       'claude-haiku-4-5-20251001',
};

// Agent color identity
export const AGENT_COLORS = {
  Orchestrator:   '#7B61FF',
  'Brief Analyst': '#1473E6',
  Strategy:       '#2D9D78',
  Copy:           '#E68619',
  Critic:         '#E34850',
};

// Cost per token (USD)
export const TOKEN_COSTS = {
  [MODELS.STRATEGY]: { input: 0.000003,  output: 0.000015 },
  [MODELS.COPY]:     { input: 0.000003,  output: 0.000015 },
  [MODELS.ANALYST]:  { input: 0.0000008, output: 0.000004 },
  [MODELS.ORCHESTRATOR]: { input: 0.0000008, output: 0.000004 },
  [MODELS.CRITIC]:   { input: 0.0000008, output: 0.000004 },
};

export const MAX_COST_WARNING = 0.04;
export const MAX_COST_CAP     = 0.05;

/**
 * @typedef {Object} BriefSchema
 * @property {string|null} product
 * @property {string|null} audience
 * @property {string|null} goal        - "downloads" | "signups" | "awareness"
 * @property {string[]}    channels    - ["linkedin","email","twitter"]
 * @property {string|null} tone
 * @property {string[]}    gaps        - fields that are null → trigger clarification
 */
export function emptyBriefSchema() {
  return { product: null, audience: null, goal: null, channels: [], tone: null, gaps: [] };
}

/**
 * @typedef {Object} Concept
 * @property {string} name
 * @property {string} hook
 * @property {string} rationale
 * @property {number} confidence   - 0.0–1.0
 */

/**
 * @typedef {Object} ChannelCopy
 * @property {string} headline
 * @property {string} body
 * @property {string} cta
 */

/**
 * @typedef {Object} CopyBundle
 * @property {ChannelCopy} linkedin
 * @property {ChannelCopy} email
 * @property {ChannelCopy} twitter
 */

/**
 * @typedef {Object} CritiqueResult
 * @property {{ linkedin: number, email: number, twitter: number }} scores
 * @property {string[]} retry   - channels scoring < 7
 * @property {string}   notes
 */

/**
 * @typedef {Object} AgentEvent
 * @property {string}  agent
 * @property {'started'|'completed'|'retrying'|'failed'} status
 * @property {number}  timestamp
 * @property {number}  [token_count]
 * @property {number}  [latency_ms]
 * @property {*}       [payload]
 */
export function makeEvent(agent, status, extra = {}) {
  return { agent, status, timestamp: Date.now(), ...extra };
}

/**
 * Calculate cost from a usage object returned by Anthropic API.
 * @param {string} model
 * @param {{ input_tokens: number, output_tokens: number }} usage
 * @returns {number} USD
 */
export function calcCost(model, usage) {
  const rates = TOKEN_COSTS[model];
  if (!rates) return 0;
  return (usage.input_tokens * rates.input) + (usage.output_tokens * rates.output);
}
