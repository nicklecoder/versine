import { el, mount } from './dom.js';
import { gcd } from '../math/frac.js';

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

function bar(f, tone) {
  const cells = [];
  for (let i = 0; i < f.d; i++) {
    cells.push(el('div', {
      class: `equiv-cell${i < f.n ? ' is-filled' : ''}`,
      style: { '--tone': tone },
    }));
  }
  return el('div.equiv-bar', { style: { '--segments': f.d } }, cells);
}

const label = (f) => el('div.equiv-label', {},
  el('span.bar__num', {}, String(f.n)),
  el('span.bar__line'),
  el('span.bar__den', {}, String(f.d)));

const row = (f, tone) => el('div.equiv-row', {}, label(f), bar(f, tone));

/**
 * @param {HTMLElement} container
 * @param {EquivSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawEquivModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { from, to } = spec;

  if (!reveal) {
    mount(container, el('div.equiv', {},
      row(from, 'var(--vec-1)'),
      el('p.bar-hint', {},
        `${from.n} of ${from.d} equal pieces. The same amount can be cut a different way.`)));
    return;
  }

  const growing = to.d > from.d;
  const factor = growing ? to.d / from.d : from.d / to.d;

  mount(container, el('div.equiv', {},
    row(from, 'var(--vec-1)'),
    el('div.equiv-op', {},
      el('span', {}, growing ? `× ${factor} top and bottom` : `÷ ${factor} top and bottom`),
      verdict ? el('span', { class: `bar-verdict is-${verdict}` },
        verdict === 'ok' ? '✓' : '✗') : null),
    row(to, 'var(--result)'),
    el('p.bar-hint', {},
      'Both shadings stop in the same place — same amount, different pieces.')));
}
