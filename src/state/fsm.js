/**
 * Finite State Machine for the Brief → Campaign workflow.
 * All state transitions are defined and validated here.
 */

export const STATES = {
  IDLE:                    'IDLE',
  EXTRACTING:              'EXTRACTING',
  AWAITING_CLARIFICATION:  'AWAITING_CLARIFICATION',
  STRATEGIZING:            'STRATEGIZING',
  AWAITING_CONCEPT_PICK:   'AWAITING_CONCEPT_PICK',
  WRITING:                 'WRITING',
  REVIEWING:               'REVIEWING',
  RETRYING:                'RETRYING',
  DONE:                    'DONE',
  ERROR:                   'ERROR',
};

// Valid transitions: from → [to, ...]
const TRANSITIONS = {
  [STATES.IDLE]:                   [STATES.EXTRACTING],
  [STATES.EXTRACTING]:             [STATES.AWAITING_CLARIFICATION, STATES.STRATEGIZING, STATES.ERROR],
  [STATES.AWAITING_CLARIFICATION]: [STATES.STRATEGIZING, STATES.ERROR],
  [STATES.STRATEGIZING]:           [STATES.AWAITING_CONCEPT_PICK, STATES.ERROR],
  [STATES.AWAITING_CONCEPT_PICK]:  [STATES.WRITING, STATES.STRATEGIZING],
  [STATES.WRITING]:                [STATES.REVIEWING, STATES.ERROR],
  [STATES.REVIEWING]:              [STATES.RETRYING, STATES.DONE, STATES.ERROR],
  [STATES.RETRYING]:               [STATES.REVIEWING, STATES.DONE, STATES.ERROR],
  [STATES.DONE]:                   [STATES.IDLE],
  [STATES.ERROR]:                  [STATES.IDLE],
};

/**
 * Validate and execute a state transition.
 * @param {string} from
 * @param {string} to
 * @returns {string} the new state
 * @throws if the transition is invalid
 */
export function transition(from, to) {
  const allowed = TRANSITIONS[from] || [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid FSM transition: ${from} → ${to}`);
  }
  return to;
}

/**
 * Human-readable label for each state.
 */
export const STATE_LABELS = {
  [STATES.IDLE]:                   'Ready',
  [STATES.EXTRACTING]:             'Analysing Brief',
  [STATES.AWAITING_CLARIFICATION]: 'Needs Clarification',
  [STATES.STRATEGIZING]:           'Generating Strategy',
  [STATES.AWAITING_CONCEPT_PICK]:  'Pick a Concept',
  [STATES.WRITING]:                'Writing Copy',
  [STATES.REVIEWING]:              'Reviewing Quality',
  [STATES.RETRYING]:               'Retrying Copy',
  [STATES.DONE]:                   'Campaign Ready',
  [STATES.ERROR]:                  'Error',
};

/**
 * Which FSM states show the trace panel prominently.
 */
export const ACTIVE_STATES = new Set([
  STATES.EXTRACTING,
  STATES.STRATEGIZING,
  STATES.WRITING,
  STATES.REVIEWING,
  STATES.RETRYING,
]);
