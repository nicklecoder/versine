/**
 * Game modes. A mode is a small policy object -- it never generates problems
 * or touches the DOM, it only decides how a run starts, ends, and is judged.
 *
 * Two modes, on purpose: one to learn in, one to prove it in. Every extra mode
 * is another decision between a kid and the maths.
 *
 * @typedef {object} Mode
 * @property {string} id
 * @property {string} name
 * @property {string} glyph
 * @property {string} blurb
 * @property {boolean} [allowExplain]    offer the "why?" button
 * @property {boolean} [allowRetryQueue] re-serve missed problems later
 * @property {boolean} [scored]
 * @property {boolean} [gate]            passing unlocks the next level
 * @property {number}  [duration]        seconds
 * @property {number}  [target]          correct answers needed to pass
 */

/** @type {Record<string, Mode>} */
export const MODES = {
  practice: {
    id: 'practice',
    name: 'Practice',
    glyph: '∞',
    blurb: 'No clock, no limit. Ask why whenever you like, and wrong answers '
      + 'just come back around.',
    allowExplain: true,
    allowRetryQueue: true,
    scored: false,
  },

  trial: {
    id: 'trial',
    name: 'Time Trial',
    glyph: '⏱',
    blurb: 'Solve enough before the clock runs out and the next level unlocks. '
      + 'Mistakes cost you time, not lives.',
    duration: 120,
    target: 12,
    scored: true,
    gate: true,
  },
};

export const MODE_ORDER = ['practice', 'trial'];

/**
 * Time Trial settings for one level. The mode carries defaults; a level that is
 * genuinely harder per problem can override them, because a fixed clock across
 * levels quietly makes the late ones unpassable.
 *
 * @param {{trial?:{duration?:number, target?:number}}} [levelDef]
 * @returns {{duration:number, target:number}}
 */
export function trialSettings(levelDef) {
  return {
    duration: levelDef?.trial?.duration ?? MODES.trial.duration,
    target: levelDef?.trial?.target ?? MODES.trial.target,
  };
}

/** "3 min", "2 min 30 s", "90 s" */
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m} min ${s} s` : `${m} min`;
}
