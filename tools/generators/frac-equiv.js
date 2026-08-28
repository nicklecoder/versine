/**
 * Catalogue authoring tool: builds the problem library for frac-equiv.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { frac, reduce, gcd, format } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-equiv.js';
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
/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  if (level >= LAST_LEVEL) {
    const from = rng.int(0, LAST_LEVEL - 1);
    const problem = build(rng, from);
    problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
    return problem;
  }
  return build(rng, level);
}
