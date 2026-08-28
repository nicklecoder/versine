import { frac, reduce, combine, isSimplest, format, gcd } from '../math/frac.js';

/**
 * Adding and subtracting fractions.
 *
 * The levels walk the one idea that matters: you can only add matching units.
 * Same denominator first, then one denominator that already divides the other
 * (only one side has to change), then genuinely unlike denominators, then
 * subtraction, then simplifying.
 *
 * From the "Simplify" level onward, simplest form is required — declared per
 * level rather than hardcoded, so the requirement arrives exactly when it has
 * been taught and stays required after that.
 */

const LEVELS = [
  { name: 'Same Denominator', blurb: 'Matching pieces add straight across.' },
  { name: 'One Fits the Other', blurb: 'One denominator already divides the other — only one side changes.' },
  { name: 'Unlike Denominators', blurb: 'The real thing: both sides rewritten before they combine.' },
  { name: 'Taking Away', blurb: 'Subtraction, same rules.' },
  {
    name: 'Simplify the Answer',
    blurb: 'Right value, lowest terms. From here on, simplest form is expected.',
    requireSimplest: true,
  },
  {
    name: 'All Together',
    blurb: 'Everything mixed, in simplest form. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;

const PAR_SECONDS = [12, 16, 20, 20, 22, 22];

/**
 * A numerator that leaves the fraction already in lowest terms — given
 * fractions should look like the ones in a book, not like 2/8.
 */
function coprimeNumerator(rng, d, max) {
  const options = [];
  for (let n = 1; n <= Math.min(max, d - 1); n++) if (gcd(n, d) === 1) options.push(n);
  return options.length ? rng.pick(options) : 1;
}

/**
 * Denominator pairs whose lowest common denominator stays drawable.
 *
 * Built rather than listed. A hand-written list of six pairs looks like plenty
 * until you count what survives the "sum stays under one" filter: with 2 and 3
 * there is exactly one valid problem. A student then meets the same dozen sums
 * every session and recalls them instead of finding a common denominator,
 * which is the opposite of what the level is for.
 *
 * @param {number} maxLcd  keep the bar model readable on a phone
 * @param {boolean} nested true for pairs where one denominator divides the
 *                         other, so only one side has to change
 */
function denominatorPairs(maxLcd, nested) {
  const pairs = [];
  for (let a = 2; a <= 12; a++) {
    for (let b = a + 1; b <= 12; b++) {
      const divides = b % a === 0;
      if (divides !== nested) continue;
      if ((a * b) / gcd(a, b) <= maxLcd) pairs.push([a, b]);
    }
  }
  return pairs;
}

const UNLIKE = denominatorPairs(36, false);
const NESTED = denominatorPairs(36, true);

/**
 * Denominator pairs, capped so the lowest common denominator stays readable.
 */
function draw(rng, level) {
  switch (level) {
    case 0: {                                    // same denominator
      const d = rng.pick([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20]);
      const n1 = rng.int(1, d - 1);
      const n2 = rng.int(1, d - n1);             // keep the sum at or below 1
      return { a: frac(n1, d), b: frac(n2, d), op: '+' };
    }
    case 1: {                                    // one denominator divides the other
      const [small, big] = rng.pick(NESTED);
      const a = frac(coprimeNumerator(rng, small, small - 1), small);
      const b = frac(coprimeNumerator(rng, big, big - 1), big);
      return rng.chance(0.5) ? { a, b, op: '+' } : { a: b, b: a, op: '+' };
    }
    case 2: {                                    // genuinely unlike
      // Numerators run the full coprime range; the caller rejects any sum that
      // lands at or above one, which is a far less blunt filter than capping
      // the numerator at half the denominator was.
      const [d1, d2] = rng.pick(UNLIKE);
      return {
        a: frac(coprimeNumerator(rng, d1, d1 - 1), d1),
        b: frac(coprimeNumerator(rng, d2, d2 - 1), d2),
        op: '+',
      };
    }
    default: {                                   // subtraction, larger minus smaller
      const [d1, d2] = rng.pick(rng.chance(0.75) ? UNLIKE : NESTED);
      let a = frac(coprimeNumerator(rng, d1, d1 - 1), d1);
      let b = frac(coprimeNumerator(rng, d2, d2 - 1), d2);
      if (a.n / a.d < b.n / b.d) [a, b] = [b, a];
      return { a, b, op: '-' };
    }
  }
}

function build(rng, level, requireSimplest) {
  let a, b, op, work;
  for (let i = 0; i < 40; i++) {
    ({ a, b, op } = draw(rng, level));
    work = combine(a, b, op);
    // Reject: nothing to do (zero), a whole number, or a result above one.
    // A bar model draws a single whole, so improper results have no picture
    // here -- they belong to the improper/mixed-number skill instead.
    if (work.result.n > 0 && work.result.n < work.result.d) break;
  }

  const expected = requireSimplest ? reduce(work.result) : work.result;
  const opSign = op === '-' ? '−' : '+';

  const frag = (f, cls) =>
    `<span class="${cls} frac-term"><span class="fn">${f.n}</span>`
    + `<span class="fl"></span><span class="fd">${f.d}</span></span>`;

  return {
    prompt: frag(a, 't1') + `<span class="op">${opSign}</span>` + frag(b, 't2')
      + `<span class="op">=</span><span class="q">?</span>`,
    text: `${format(a)} ${opSign} ${format(b)}`,
    answer: { type: 'frac', value: expected, requireSimplest },
    parSeconds: PAR_SECONDS[level],
    visual: {
      kind: 'barmodel',
      a, b, op: opSign,
      common: work.common,
      left: work.left, right: work.right,
      result: work.result,
    },
    explain: explain(a, b, opSign, work, requireSimplest),
  };
}

function explain(a, b, opSign, work, requireSimplest) {
  const simplified = reduce(work.result);
  const tail = requireSimplest && !isSimplest(work.result)
    ? ` Then ${format(work.result)} simplifies to ${format(simplified)}.`
    : '';

  if (a.d === b.d) {
    return `The pieces already match, so add the numerators and keep the `
      + `denominator: ${format(work.result)}.${tail}`;
  }
  return `${a.d} and ${b.d} both divide into ${work.common}, so rewrite both in `
    + `${work.common}ths: ${format(work.left)} and ${format(work.right)}. `
    + `Now the pieces match, so combine them: ${format(work.result)}.${tail}`;
}

export default {
  id: 'frac-addsub',
  name: 'Add & Subtract Fractions',
  category: 'fractions',
  glyph: '⁄',
  blurb: 'Matching the pieces before you combine them.',
  answerInput: 'frac',
  dependsOn: ['int-addsub'],
  levels: LEVELS,

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
  generate(rng, level) {
    if (level >= LAST_LEVEL) {
      const from = rng.int(0, LAST_LEVEL - 1);
      const problem = build(rng, from, true);
      problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
      return problem;
    }
    return build(rng, level, !!LEVELS[level].requireSimplest);
  },
};
