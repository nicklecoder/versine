import { evaluate, render } from '../math/expression.js';

/**
 * Order of operations.
 *
 * Ordered by the rule being learned, not by how long the expression is. The
 * second level exists for the trap that catches almost everyone: when two
 * operations are the same rank, you go left to right, so 12 ÷ 3 × 2 is 8 and
 * not 2. Most people who "know PEMDAS" get that one wrong.
 *
 * The lesson for this skill is authored rather than derived, because the
 * evaluation already produces its own steps — one line per rule applied.
 */

const LEVELS = [
  { name: 'Times Before Plus', blurb: 'Multiplying and dividing happen before adding and subtracting.' },
  { name: 'Left to Right', blurb: 'Same rank? Work left to right. This is the one that catches people.' },
  { name: 'Brackets First', blurb: 'Whatever is in brackets goes first, whatever it is.' },
  { name: 'Powers Too', blurb: 'Powers come before multiplying, after brackets.' },
  { name: 'Nested', blurb: 'Brackets inside brackets. Work from the inside out.' },
  {
    name: 'All Together',
    blurb: 'Everything mixed, with no warning which rule bites. Clear this '
      + 'against the clock to finish the skill for the day.',
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
const PAR_SECONDS = [14, 16, 15, 18, 24, 20];

const OPS = ['+', '−'];
const MULOPS = ['×', '÷'];

/** Build a candidate expression for a level. Correctness is checked after. */
function shape(rng, level) {
  const n = (lo, hi) => rng.int(lo, hi);
  switch (level) {
    case 0:
      return rng.chance(0.5)
        ? [n(2, 12), rng.pick(OPS), n(2, 9), '×', n(2, 9)]
        : [n(2, 9), '×', n(2, 9), rng.pick(OPS), n(2, 12)];
    case 1: {
      // Build the dividend from the divisor, or the division is almost never
      // exact and every attempt falls through to the subtraction shape.
      const divisor = n(2, 6);
      return rng.chance(0.5)
        ? [divisor * n(2, 12), '÷', divisor, '×', n(2, 5)]
        : [n(10, 30), '−', n(2, 9), rng.pick(OPS), n(2, 9)];
    }
    case 2:
      return rng.chance(0.5)
        ? [[n(2, 12), rng.pick(OPS), n(2, 9)], rng.pick(MULOPS), n(2, 6)]
        : [n(2, 9), '×', [n(3, 14), rng.pick(OPS), n(2, 9)]];
    case 3:
      return rng.chance(0.5)
        ? [n(2, 20), rng.pick(OPS), n(2, 5), '^', rng.pick([2, 3])]
        : [[n(2, 6), rng.pick(OPS), n(1, 4)], '^', 2, rng.pick(OPS), n(2, 15)];
    default:
      return rng.chance(0.5)
        ? [n(2, 6), '×', [n(2, 9), rng.pick(OPS), n(2, 6), '×', n(2, 5)]]
        : [[n(4, 18), '−', [n(2, 6), '×', n(2, 4)]], rng.pick(MULOPS), n(2, 4)];
  }
}

function build(rng, level) {
  let expression;
  let result;
  for (let i = 0; i < 60; i++) {
    expression = shape(rng, level);
    result = evaluate(expression);
    // Whole numbers only, at least two steps of work, nothing enormous.
    if (result.ok && result.lines.length >= 3 && Math.abs(result.value) <= 200) break;
  }

  const rules = [...new Set(result.rules)];
  return {
    prompt: `<span class="t1">${result.lines[0]}</span>`
      + '<span class="op">=</span><span class="q">?</span>',
    text: result.lines[0],
    answer: { type: 'int', value: result.value },
    parSeconds: PAR_SECONDS[level],
    visual: { kind: 'evalmodel', lines: result.lines, rules: result.rules },
    explain: `Work through it in order — ${rules.join(', then ')}. `
      + `${result.lines.join(', then ')}.`,
  };
}

export default {
  id: 'order-ops',
  name: 'Order of Operations',
  category: 'algebra',
  glyph: '( )',
  blurb: 'Which part of an expression goes first.',
  answerInput: 'int',
  dependsOn: ['int-addsub', 'int-muldiv'],
  levels: LEVELS,

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
  generate(rng, level) {
    if (level >= LAST_LEVEL) {
      const from = rng.int(0, LAST_LEVEL - 1);
      const problem = build(rng, from);
      problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
      return problem;
    }
    return build(rng, level);
  },

  /**
   * One step per line of working, naming the rule that justified it. The
   * derived lesson would collapse this into a single sentence; the whole point
   * of this skill is the sequence.
   */
  lesson(problem) {
    const { lines, rules } = problem.visual;
    const steps = [{
      caption: 'Look at it before touching anything. Which part is allowed to go first?',
      opts: { reveal: 1 },
    }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1
          ? `Finally ${rule}: ${lines[i + 1]}.`
          : `${i === 0 ? 'First' : 'Then'} ${rule} — ${lines[i]} becomes ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
