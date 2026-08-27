import { el, mount } from './dom.js';

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
 * @typedef {{n:number, d:number}} Frac
 * @typedef {{a:Frac, b:Frac, quotient:Frac, fine:number}} FitsSpec
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

  const label = (f, text) => el('div.fits__label', {},
    el('span.bar__num', {}, String(f.n)),
    el('span.bar__line'),
    el('span.bar__den', {}, String(f.d)),
    text ? el('span.fits__tag', {}, text) : null);

  /** The dividend along a whole, optionally cut into copies. */
  const cells = [];
  for (let i = 0; i < total; i++) {
    const inside = i < span;
    const copyIndex = Math.floor(i / copy);
    const startsCopy = reveal && inside && i % copy === 0 && i !== 0;
    cells.push(el('div', {
      class: `fits__cell${inside ? ' is-filled' : ''}${startsCopy ? ' starts-copy' : ''}`
        + (reveal && inside ? ` copy-${copyIndex % 2}` : ''),
    }));
  }

  const whole = Math.floor(span / copy);
  const leftover = span % copy;

  mount(container, el('div.fits', {},
    el('div.fits__row', {}, label(a), el('div.fits__bar', { style: { '--total': total } }, cells)),
    el('div.fits__row', {},
      label(b, 'one piece'),
      el('div.fits__bar.is-unit', { style: { '--total': total } },
        Array.from({ length: total }, (_, i) =>
          el('div', { class: `fits__cell${i < copy ? ' is-unit' : ''}` })))),
    reveal
      ? el('div.fits__count', {},
          el('span', {}, `${whole} whole `
            + `${whole === 1 ? 'piece' : 'pieces'}${leftover ? ` and ${leftover}/${copy} of another` : ''}`),
          el('span.fits__answer', {}, `= ${quotient.d === 1 ? quotient.n : `${quotient.n}/${quotient.d}`}`),
          verdict ? el('span', { class: `bar-verdict is-${verdict}` },
            verdict === 'ok' ? '✓' : '✗') : null)
      : el('p.bar-hint', {}, `How many ${b.n}/${b.d} pieces fit into ${a.n}/${a.d}?`)));
}
