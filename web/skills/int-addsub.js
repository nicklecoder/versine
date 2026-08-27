import { niceBounds } from '../ui/numberline.js';
import { signed, minus } from '../ui/dom.js';

/**
 * Adding and subtracting positive and negative integers.
 *
 * Levels are ordered by the *idea*, not by the size of the numbers:
 * "subtracting a negative" is the hard one, so it gets a level of its own
 * rather than being buried in a general mix.
 */

const LEVELS = [
  { name: 'First Steps',           blurb: 'Positive second number. Find your feet on the line.' },
  { name: 'Adding Negatives',      blurb: 'Adding a negative walks you backwards.' },
  { name: 'Subtracting Negatives', blurb: 'The tricky one: two minus signs make a plus.' },
  { name: 'Mixed Integers',        blurb: 'Both operations, both signs, bigger numbers.' },
  {
    name: 'Chains',
    blurb: 'Three terms at once, left to right.',
    // Three terms take roughly twice as long to work through as two, so the
    // default two-minute clock made this level near-unpassable.
    trial: { duration: 180 },
  },
  { name: 'All Together', blurb: 'Everything mixed, with no warning which is coming. '
    + 'Clear this against the clock to finish the skill for the day.' },
];

/** The last level is always the mixed review: it draws from every level before it. */
export const LAST_LEVEL = LEVELS.length - 1;

const PAR_SECONDS = [11, 12, 14, 12, 20, 16];

/** @param {number} level @returns {{a:number, op:string, b:number}} */
function draw(rng, level) {
  switch (level) {
    case 0:
      return { a: rng.int(-9, 9), op: rng.pick(['+', '-']), b: rng.int(1, 9) };
    case 1:
      return { a: rng.int(-10, 10), op: '+', b: -rng.int(1, 12) };
    case 2:
      return { a: rng.int(-12, 12), op: '-', b: rng.chance(0.75) ? -rng.int(1, 12) : rng.int(1, 12) };
    case 3:
      return { a: rng.nonZero(-25, 25), op: rng.pick(['+', '-']), b: rng.nonZero(-25, 25) };
    default:
      return { a: rng.nonZero(-20, 20), op: rng.pick(['+', '-']), b: rng.nonZero(-15, 15) };
  }
}

const apply = (a, op, b) => (op === '+' ? a + b : a - b);

/** Human-readable reason, shown on demand in Practice. */
function explain(a, op, b, answer) {
  const A = minus(a), B = Math.abs(b);
  if (op === '-' && b < 0) {
    return `Subtracting a negative is the same as adding. ${A} − (−${B}) becomes ${A} + ${B}, which is ${minus(answer)}.`;
  }
  if (op === '+' && b < 0) {
    return `Adding a negative moves you left. ${A} + (−${B}) becomes ${A} − ${B}, which is ${minus(answer)}.`;
  }
  if (op === '-') {
    return `Start at ${A} and move ${B} to the left. You land on ${minus(answer)}.`;
  }
  return `Start at ${A} and move ${B} to the right. You land on ${minus(answer)}.`;
}

/** Two terms: 4 + (−7) = ? */
function twoTerm(rng, level) {
  let a, op, b, answer;
  // Reject degenerate problems (b = 0, or an answer that gives nothing away).
  for (let i = 0; i < 40; i++) {
    ({ a, op, b } = draw(rng, level));
    answer = apply(a, op, b);
    if (b !== 0 && !(a === 0 && level > 0)) break;
  }

  const delta = op === '+' ? b : -b;
  const bounds = niceBounds([a, answer, 0]);

  return {
    prompt: `<span class="t1">${minus(a)}</span>`
      + `<span class="op">${op === '+' ? '+' : '−'}</span>`
      + `<span class="t2">${signed(b)}</span>`
      + `<span class="op">=</span><span class="q">?</span>`,
    text: `${minus(a)} ${op === '+' ? '+' : '−'} ${signed(b)}`,
    answer: { type: 'int', value: answer },
    parSeconds: PAR_SECONDS[level],
    visual: {
      kind: 'numberline',
      ...bounds,
      answer,
      steps: [
        { from: 0, to: a, label: a === 0 ? '' : `${a > 0 ? '+' : '−'}${Math.abs(a)}` },
        { from: a, to: answer, label: `${delta > 0 ? '+' : '−'}${Math.abs(delta)}` },
      ],
    },
    explain: explain(a, op, b, answer),
  };
}

/** Three terms: −6 + (−3) − (−8) = ? */
function threeTerm(rng) {
  const a = rng.nonZero(-15, 15);
  const op1 = rng.pick(['+', '-']);
  const b = rng.nonZero(-12, 12);
  const op2 = rng.pick(['+', '-']);
  const c = rng.nonZero(-12, 12);

  const mid = apply(a, op1, b);
  const answer = apply(mid, op2, c);
  const d1 = op1 === '+' ? b : -b;
  const d2 = op2 === '+' ? c : -c;

  return {
    prompt: `<span class="t1">${minus(a)}</span>`
      + `<span class="op">${op1 === '+' ? '+' : '−'}</span><span class="t2">${signed(b)}</span>`
      + `<span class="op">${op2 === '+' ? '+' : '−'}</span><span class="t3">${signed(c)}</span>`
      + `<span class="op">=</span><span class="q">?</span>`,
    text: `${minus(a)} ${op1 === '+' ? '+' : '−'} ${signed(b)} ${op2 === '+' ? '+' : '−'} ${signed(c)}`,
    answer: { type: 'int', value: answer },
    parSeconds: PAR_SECONDS[4],
    visual: {
      kind: 'numberline',
      ...niceBounds([a, mid, answer, 0]),
      answer,
      steps: [
        { from: 0, to: a, label: `${a > 0 ? '+' : '−'}${Math.abs(a)}` },
        { from: a, to: mid, label: `${d1 > 0 ? '+' : '−'}${Math.abs(d1)}` },
        { from: mid, to: answer, label: `${d2 > 0 ? '+' : '−'}${Math.abs(d2)}` },
      ],
    },
    explain: `Work left to right. ${minus(a)} ${op1 === '+' ? '+' : '−'} ${signed(b)} = ${minus(mid)}, `
      + `then ${minus(mid)} ${op2 === '+' ? '+' : '−'} ${signed(c)} = ${minus(answer)}.`,
  };
}

export default {
  id: 'int-addsub',
  name: 'Integer Add & Subtract',
  category: 'integers',
  glyph: '±',
  blurb: 'Positive and negative numbers on the line.',
  answerInput: 'int',
  levels: LEVELS,

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
  generate(rng, level) {
    if (level >= LAST_LEVEL) {
      // Mixed review: pick any earlier level at random, so they can't settle
      // into one shape and coast.
      const from = rng.int(0, LAST_LEVEL - 1);
      const problem = from >= 4 ? threeTerm(rng) : twoTerm(rng, from);
      problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
      return problem;
    }
    return level >= 4 ? threeTerm(rng) : twoTerm(rng, level);
  },
};
