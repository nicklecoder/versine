import { drawSegments } from './segments.js';

/**
 * A fraction of a quantity: the whole cut into the denominator's parts, with
 * the numerator's worth shaded.
 *
 * The second adapter over the segments primitive, and it exists to be the
 * same picture as the ratio bar. "3/8 of 24" and "red and blue are 3 : 5,
 * how many of the 24 are red" are one question in two notations, and a
 * student who has to be told that has been shown two different diagrams.
 * Here they are shown one: a bar in eight parts with three shaded.
 *
 * The bar is cut into `d` parts rather than into `whole` units. Twelfths of
 * 180 would be 180 cells and unreadable, and the count of units is not what
 * the picture is for -- what one part is worth is.
 *
 * @typedef {{n:number, d:number, whole:number, each?:number, value?:number}} QuantitySpec
 */

/**
 * @param {HTMLElement} container
 * @param {QuantitySpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
/** "1 part", "3 parts" -- a unit fraction is the commonest case here. */
const parts = (k) => `${k} part${k === 1 ? '' : 's'}`;

export function drawQuantityModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { n, d, whole, each, value } = spec;
  const bar = (tone) => ({ label: { n, d }, bars: [{ total: d, filled: n, tone }] });

  // `each` and `value` are both withheld while the question is open: one is
  // the answer and the other is a division away from it.
  if (!reveal || each === undefined) {
    return drawSegments(container, {
      rows: [bar('var(--vec-1)')],
      skin: d > 20 ? 'fine' : 'ruled',
      note: `The whole bar is ${whole}, cut into ${d} equal parts.`,
    }, { verdict });
  }

  drawSegments(container, {
    rows: [
      bar('var(--vec-1)'),
      { sep: `${whole} ÷ ${d} = ${each} in each part`, tone: 'note', verdict: true },
      { answer: `${n} × ${each} = ${value}` },
    ],
    skin: d > 20 ? 'fine' : 'ruled',
    note: `${parts(n)} of ${d}, which is ${n}/${d} of ${whole}.`,
  }, { verdict });
}
