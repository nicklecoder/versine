import { el, mount } from './dom.js';

/**
 * Area model for multiplying fractions.
 *
 * One square is one whole. The first fraction shades a strip across it, the
 * second a strip down it, and the product is the overlap. That single picture
 * carries the two things students most often miss: *why* you multiply top by
 * top and bottom by bottom (the grid has d1 × d2 cells, the overlap n1 × n2),
 * and why multiplying by a proper fraction makes the answer *smaller* — which
 * contradicts everything multiplication has meant up to now.
 *
 * While the question is open the strips are drawn without grid lines. You can
 * see the overlap, but reading it as a fraction means imposing the grid
 * yourself, which is the arithmetic. On reveal the grid appears and the
 * overlap is counted.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {{a:Frac, b:Frac, product:Frac}} AreaSpec
 */

/**
 * @param {HTMLElement} container
 * @param {AreaSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawAreaModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { a, b, product } = spec;
  const cols = a.d;
  const rows = b.d;

  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const inA = c < a.n;                 // strip across
      const inB = r < b.n;                 // strip down
      const state = inA && inB ? 'is-both' : inA ? 'is-a' : inB ? 'is-b' : '';
      cells.push(el('div', { class: `area__cell ${state}` }));
    }
  }

  const grid = el('div', {
    class: `area${reveal ? ' is-revealed' : ''}`,
    style: { '--cols': cols, '--rows': rows },
  }, cells);

  const legend = el('div.area-legend', {},
    // "across"/"down" reads backwards: a fraction of the width is drawn as a
    // vertical strip. Name the dimension instead.
    el('span.area-key.is-a', {}, `${a.n}/${a.d} of the width`),
    el('span.area-key.is-b', {}, `${b.n}/${b.d} of the height`),
    reveal ? el('span.area-key.is-both', {},
      `overlap ${product.n}/${product.d}`) : null,
    reveal && verdict
      ? el('span', { class: `bar-verdict is-${verdict}` }, verdict === 'ok' ? '✓' : '✗')
      : null);

  mount(container, el('div.area-wrap', {}, grid, legend,
    el('p.bar-hint', {}, reveal
      ? `${cols} × ${rows} = ${product.d} pieces in the whole, and `
        + `${a.n} × ${b.n} = ${product.n} of them are in both strips.`
      : 'Where the two strips cross is the answer.')));
}
