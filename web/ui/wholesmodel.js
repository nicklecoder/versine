import { el, mount } from './dom.js';

/**
 * Wholes and what is left over — the picture for improper fractions and mixed
 * numbers.
 *
 * Each bar is one whole. The trick in both directions is to show the *setup*
 * without handing over the count:
 *
 *  - going to a mixed number, the question is "how many wholes fit into
 *    seven quarters?", so the ask shows one quarter and says there are seven
 *    of them. Laying all seven out would be the answer.
 *  - going the other way, the ask draws the whole bars **undivided**. You can
 *    see two wholes and a third, but to count thirds you have to know a whole
 *    is three of them, which is the arithmetic.
 *
 * @typedef {object} WholesSpec
 * @property {'toMixed'|'toImproper'} direction
 * @property {{n:number, d:number}} improper
 * @property {number} whole
 * @property {number} rest
 * @property {number} d
 */

/** One whole, either sliced into `segments` or left as a solid block. */
function bar(segments, filled, tone, { solid = false, from = 0 } = {}) {
  if (solid) {
    return el('div.whole-bar.is-solid', { style: { '--tone': tone } });
  }
  const cells = [];
  for (let i = 0; i < segments; i++) {
    cells.push(el('div', {
      class: `whole-cell${i < filled ? ' is-filled' : ''}`,
      style: { '--tone': tone },
    }));
  }
  return el('div.whole-bar', { style: { '--segments': segments } }, cells);
}

const caption = (text) => el('p.bar-hint', {}, text);

/**
 * @param {HTMLElement} container
 * @param {WholesSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawWholesModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { direction, improper, whole, rest, d } = spec;
  const tick = verdict
    ? el('span', { class: `bar-verdict is-${verdict}` }, verdict === 'ok' ? '✓' : '✗')
    : null;

  if (direction === 'toMixed') {
    if (!reveal) {
      mount(container, el('div.wholes', {},
        el('div.wholes__row', {},
          el('div.wholes__tag', {}, `1/${d}`),
          bar(d, 1, 'var(--vec-2)')),
        caption(`One piece is 1/${d}. You have ${improper.n} of them — `
          + 'how many whole bars does that make?')));
      return;
    }

    const bars = Math.ceil(improper.n / d) || 1;
    const rows = [];
    let left = improper.n;
    for (let i = 0; i < bars; i++) {
      const filled = Math.min(left, d);
      left -= filled;
      const full = filled === d;
      rows.push(el('div.wholes__row', {},
        el('div.wholes__tag', {}, full ? '1 whole' : `${filled}/${d}`),
        bar(d, filled, full ? 'var(--vec-1)' : 'var(--result)')));
    }
    mount(container, el('div.wholes', {},
      ...rows,
      el('div.wholes__answer', {},
        el('span', {}, rest
          ? `${whole} whole${whole === 1 ? '' : 's'} and ${rest}/${d} left over`
          : `${whole} whole${whole === 1 ? '' : 's'}, nothing left over`),
        tick)));
    return;
  }

  // toImproper: wholes are solid until the answer is in.
  if (!reveal) {
    mount(container, el('div.wholes', {},
      el('div.wholes__row', {},
        el('div.wholes__tag', {}, `${whole} whole${whole === 1 ? '' : 's'}`),
        el('div.wholes__stack', {},
          ...Array.from({ length: whole }, () => bar(1, 1, 'var(--vec-1)', { solid: true })))),
      el('div.wholes__row', {},
        el('div.wholes__tag', {}, `${rest}/${d}`),
        bar(d, rest, 'var(--vec-2)')),
      caption(`Each whole is ${d}/${d}. How many ${d}ths altogether?`)));
    return;
  }

  mount(container, el('div.wholes', {},
    el('div.wholes__row', {},
      el('div.wholes__tag', {}, `${whole} × ${d}/${d}`),
      el('div.wholes__stack', {},
        ...Array.from({ length: whole }, () => bar(d, d, 'var(--vec-1)')))),
    el('div.wholes__row', {},
      el('div.wholes__tag', {}, `${rest}/${d}`),
      bar(d, rest, 'var(--vec-2)')),
    el('div.wholes__answer', {},
      el('span', {}, `${whole} × ${d} + ${rest} = ${improper.n}, so ${improper.n}/${d}`),
      tick)));
}
