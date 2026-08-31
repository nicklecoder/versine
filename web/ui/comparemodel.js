import { drawSegments } from './segments.js';
import { nths } from '../math/frac.js';

/**
 * Two fractions side by side, to be compared rather than combined.
 *
 * The third adapter over the segments primitive, and the ask-state is
 * deliberately the bar model's: two bars of *identical* length cut by their
 * own denominators. That is the same argument in a new job -- you cannot see
 * which of a third and three eighths is bigger unless the wholes are the same
 * length, which is exactly why this is drawn as bars and not as pies.
 *
 * Only the two given fractions are drawn while the question is open. Cutting
 * both into the common denominator is the answer: once the pieces match you
 * can count them, so the recut bars arrive with the reveal.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {{a:Frac, b:Frac, common?:number, left?:Frac, right?:Frac}} CompareSpec
 */

const row = (f, tone) => ({ label: f, bars: [{ total: f.d, filled: f.n, tone }] });

/**
 * @param {HTMLElement} container
 * @param {CompareSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawCompareModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { a, b, common, left, right } = spec;

  if (!reveal || !left || !right) {
    return drawSegments(container, {
      rows: [row(a, 'var(--vec-1)'), { sep: 'or', tone: 'note' }, row(b, 'var(--vec-2)')],
      skin: Math.max(a.d, b.d) > 20 ? 'fine' : 'ruled',
      note: a.d === b.d
        ? 'Same sized pieces, so it is only a question of how many.'
        : 'Different sized pieces. More of them is not the same as more.',
    }, { verdict });
  }

  const bigger = left.n > right.n ? left : right;
  drawSegments(container, {
    rows: [
      row(left, 'var(--vec-1)'),
      { sep: `both in ${nths(common)}`, tone: 'note', verdict: true },
      row(right, 'var(--vec-2)'),
    ],
    skin: common > 20 ? 'fine' : 'ruled',
    note: `${left.n} against ${right.n} of the same piece, so `
      + `${bigger.n}/${bigger.d} reaches further.`,
  }, { verdict });
}
