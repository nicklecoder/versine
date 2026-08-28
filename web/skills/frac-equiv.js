import { frac, reduce, gcd, format } from '../math/frac.js';

/**
 * Equivalent fractions and simplifying.
 *
 * Both directions are the same move: multiply or divide the top and the bottom
 * by the same number. Building up comes first because multiplying is the
 * easier direction to see, then cutting down, then the case that trips people
 * — reducing all the way rather than stopping at the first factor you spot.
 *
 * Levels that ask for a missing number want a single integer; levels that ask
 * for a simplified fraction want two boxes. The input follows the problem.
 */

const LEVELS = [
  { name: 'Build It Up', blurb: 'Multiply both parts by the same number.' },
  { name: 'Which Bottom?', blurb: 'Same move, but the denominator is missing.' },
  { name: 'Cut It Down', blurb: 'Divide both parts. One factor does it.',
    requireSimplest: true },
  { name: 'All the Way Down', blurb: 'Keep going until nothing divides both.',
    requireSimplest: true },
  { name: 'Missing Piece', blurb: 'An equivalence that shrinks — what fits the gap?' },
  {
    name: 'All Together',
    blurb: 'Everything mixed, in lowest terms. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
const PAR_SECONDS = [14, 14, 14, 18, 16, 16];

/** Base fractions already in lowest terms, small enough to draw. */
function baseFraction(rng, choices = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]) {
  const d = rng.pick(choices);
  const options = [];
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) options.push(n);
  return frac(rng.pick(options), d);
}

/**
 * The bigger denominator has to stay drawable: past about thirty segments a
 * bar is a smear. Pick a multiplier that keeps it inside that.
 *
 * This cap is the whole reason this skill's levels are small -- every problem
 * has to fit in one bar. Raising it trades legibility on a phone for variety;
 * thirty is about where a segment is still wide enough to see on a narrow
 * screen.
 */
const MAX_SEGMENTS = 40;
function multiplier(rng, baseD, candidates) {
  const fits = candidates.filter((k) => baseD * k <= MAX_SEGMENTS);
  return fits.length ? rng.pick(fits) : 2;
}

const fracHtml = (n, d, cls = '') =>
  `<span class="${cls} frac-term"><span class="fn">${n}</span>`
  + `<span class="fl"></span><span class="fd">${d}</span></span>`;

const blankHtml = (n, d) =>
  `<span class="t2 frac-term"><span class="fn">${n ?? '?'}</span>`
  + `<span class="fl"></span><span class="fd">${d ?? '?'}</span></span>`;

/** base = ?/big  — find the numerator */
function buildUp(rng) {
  const base = baseFraction(rng);
  const k = multiplier(rng, base.d, [2, 3, 4, 5]);
  const big = frac(base.n * k, base.d * k);
  return {
    prompt: fracHtml(base.n, base.d, 't1') + '<span class="op">=</span>'
      + blankHtml(null, big.d),
    text: `${format(base)} = ?/${big.d}`,
    answer: { type: 'int', value: big.n },
    visual: { kind: 'equivmodel', from: base, to: big, reveal: 'to' },
    explain: `${base.d} × ${k} = ${big.d}, so multiply the top by ${k} too: `
      + `${base.n} × ${k} = ${big.n}. That gives ${format(big)}.`,
  };
}

/** base = big/?  — find the denominator */
function whichBottom(rng) {
  const base = baseFraction(rng);
  const k = multiplier(rng, base.d, [2, 3, 4, 5]);
  const big = frac(base.n * k, base.d * k);
  return {
    prompt: fracHtml(base.n, base.d, 't1') + '<span class="op">=</span>'
      + blankHtml(big.n, null),
    text: `${format(base)} = ${big.n}/?`,
    answer: { type: 'int', value: big.d },
    visual: { kind: 'equivmodel', from: base, to: big, reveal: 'to' },
    explain: `${base.n} × ${k} = ${big.n}, so multiply the bottom by ${k} too: `
      + `${base.d} × ${k} = ${big.d}. That gives ${format(big)}.`,
  };
}

/**
 * Simplify. `steps` controls how far it is from lowest terms: one factor for
 * "Cut It Down", a composite factor for "All the Way Down" so that stopping
 * early leaves a fraction that still reduces.
 */
function cutDown(rng, composite) {
  // A composite factor needs room: with a base of sixths, even ×4 blows past
  // the segment cap and the fallback would quietly hand back a prime factor,
  // which is the one thing this level is not about.
  const base = baseFraction(rng, composite ? [2, 3, 4, 5, 6, 7] : [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const k = composite
    ? multiplier(rng, base.d, [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20])
    : multiplier(rng, base.d, [2, 3, 5, 7, 11]);
  const big = frac(base.n * k, base.d * k);
  return {
    prompt: fracHtml(big.n, big.d, 't1')
      + '<span class="op">=</span><span class="q">?</span>',
    text: `${format(big)} in lowest terms`,
    answer: { type: 'frac', value: base, requireSimplest: true },
    visual: { kind: 'equivmodel', from: big, to: base, reveal: 'to' },
    explain: `${k} divides both ${big.n} and ${big.d}`
      + (composite ? ', and a smaller factor would leave more to do' : '') + '. '
      + `${big.n} ÷ ${k} = ${base.n} and ${big.d} ÷ ${k} = ${base.d}, so ${format(base)}.`,
  };
}

/** big = base.n/?  — the equivalence read backwards */
function missingPiece(rng) {
  const base = baseFraction(rng);
  const k = multiplier(rng, base.d, [2, 3, 4, 5]);
  const big = frac(base.n * k, base.d * k);
  return {
    prompt: fracHtml(big.n, big.d, 't1') + '<span class="op">=</span>'
      + blankHtml(base.n, null),
    text: `${format(big)} = ${base.n}/?`,
    answer: { type: 'int', value: base.d },
    visual: { kind: 'equivmodel', from: big, to: base, reveal: 'to' },
    explain: `${big.n} ÷ ${base.n} = ${k}, so divide the bottom by ${k} as well: `
      + `${big.d} ÷ ${k} = ${base.d}.`,
  };
}

const MAKERS = [buildUp, whichBottom, (r) => cutDown(r, false), (r) => cutDown(r, true), missingPiece];

function build(rng, level) {
  const p = MAKERS[level](rng);
  return { ...p, parSeconds: PAR_SECONDS[level] };
}

export default {
  id: 'frac-equiv',
  name: 'Equivalent & Simplest Form',
  category: 'fractions',
  glyph: '≡',
  blurb: 'Same amount, different pieces.',
  answerInput: 'int',
  dependsOn: ['frac-addsub'],
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
};
