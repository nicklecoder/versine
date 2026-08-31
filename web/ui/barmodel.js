import { drawSegments } from './segments.js';
import { nths } from '../math/frac.js';

/**
 * Aligned bar model for adding and subtracting fractions.
 *
 * Two bars of *identical length* — same whole — divided by their own
 * denominators. That alignment is the whole point: it makes visible that a
 * third and a half are different-sized pieces, which is the misconception
 * behind 1/2 + 1/3 = 2/5. The denominator names the unit, and you can only
 * add matching units.
 *
 * While the question is open, only the two original quantities are drawn. You
 * can see they don't match; you cannot read the answer off them. On reveal the
 * bars re-divide into the common denominator and a result bar appears.
 *
 * The drawing is done by segments.js; what lives here is the argument about
 * which bars to show and what to say about them.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {object} BarSpec
 * @property {Frac} a
 * @property {Frac} b
 * @property {'+'|'−'} op
 * @property {number} common     the lowest common denominator
 * @property {Frac} left         a rewritten over `common`
 * @property {Frac} right        b rewritten over `common`
 * @property {Frac} [result]     withheld until an answer is committed
 */

const row = (f, tone, extra = {}) => ({
  label: f, bars: [{ total: f.d, filled: f.n, tone, ...extra }],
});

/**
 * @param {HTMLElement} container
 * @param {BarSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawBarModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { a, b, op, common, left, right, result } = spec;

  if (!reveal) {
    return drawSegments(container, {
      rows: [row(a, 'var(--vec-1)'), { sep: op }, row(b, 'var(--vec-2)')],
      note: a.d === b.d
        ? 'Same sized pieces — they can be added directly.'
        : 'Different sized pieces. They need matching parts before they combine.',
    }, { verdict });
  }

  // Revealed: both rewritten over the common denominator, then the result.
  // Subtraction shows what is taken away as a ghost rather than a second bar.
  const resultRow = {
    label: result,
    bars: [{
      total: common, filled: result.n, tone: 'var(--result)',
      ...(op === '−' ? { ghost: right.n } : {}),
    }],
  };

  drawSegments(container, {
    rows: [
      row(left, 'var(--vec-1)'),
      { sep: op },
      row(right, 'var(--vec-2)'),
      { sep: '=', verdict: true },
      resultRow,
    ],
    note: `Both rewritten in ${nths(common)}, so the pieces match.`,
  }, { verdict });
}
