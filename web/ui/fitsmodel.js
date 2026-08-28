import { drawSegments } from './segments.js';

/**
 * "How many of these fit into that?" — the picture for dividing fractions.
 *
 * No area can show division, so this uses length. The dividend is laid along a
 * whole, and the divisor is shown beside it as a single tile. On reveal the
 * dividend is chopped into copies of that tile and they are counted, including
 * a part-copy at the end when the answer is not whole.
 *
 * Getting this idea first is what stops "flip the second one" being a spell.
 *
 * Drawn on the 'fine' skin: both fractions have to land on shared cell edges,
 * so the bar is cut into their common units — up to forty of them, where
 * per-cell borders would be all you could see.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {{a:Frac, b:Frac, fine:number, quotient?:Frac}} FitsSpec
 */

/**
 * @param {HTMLElement} container
 * @param {FitsSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawFitsModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { a, b, quotient, fine } = spec;

  // Work in the finest units both fractions share, so copies land on cell edges.
  const total = fine;
  const span = a.n * (fine / a.d);          // fine units the dividend covers
  const copy = b.n * (fine / b.d);          // fine units one copy covers
  const whole = Math.floor(span / copy);
  const leftover = span % copy;

  const rows = [
    { label: a, bars: [{ total, filled: span, ...(reveal ? { copies: copy } : {}) }] },
    { label: b, tag: 'one piece', bars: [{ total, filled: 0, unit: copy, slim: true }] },
  ];

  if (!reveal) {
    return drawSegments(container, {
      skin: 'fine', rows,
      note: `How many ${b.n}/${b.d} pieces fit into ${a.n}/${a.d}?`,
    }, { verdict });
  }

  const count = `${whole} whole ${whole === 1 ? 'piece' : 'pieces'}`
    + (leftover ? ` and ${leftover}/${copy} of another` : '');
  const value = quotient.d === 1 ? quotient.n : `${quotient.n}/${quotient.d}`;

  drawSegments(container, {
    skin: 'fine', rows: [...rows, { answer: count, value: `= ${value}`, verdict: true }],
  }, { verdict });
}
