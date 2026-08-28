import { drawSegments } from './segments.js';

/**
 * Equivalent fractions: the same length of bar, cut into different pieces.
 *
 * While the question is open only the fraction you were *given* is drawn. The
 * second bar would show the answer directly — you could count the shaded
 * pieces off it — so it arrives with the reveal, aligned underneath, where
 * seeing the two shadings end at exactly the same place is the whole point.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {{from:Frac, to:Frac}} EquivSpec
 */

const row = (f, tone) => ({ label: f, bars: [{ total: f.d, filled: f.n, tone }] });

/**
 * @param {HTMLElement} container
 * @param {EquivSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawEquivModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { from, to } = spec;

  if (!reveal) {
    return drawSegments(container, {
      rows: [row(from, 'var(--vec-1)')],
      note: `${from.n} of ${from.d} equal pieces. The same amount can be cut a different way.`,
    }, { verdict });
  }

  const growing = to.d > from.d;
  const factor = growing ? to.d / from.d : from.d / to.d;

  drawSegments(container, {
    rows: [
      row(from, 'var(--vec-1)'),
      { sep: `${growing ? '×' : '÷'} ${factor} top and bottom`, tone: 'note', verdict: true },
      row(to, 'var(--result)'),
    ],
    note: 'Both shadings stop in the same place — same amount, different pieces.',
  }, { verdict });
}
