import { el, mount } from './dom.js';

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
 * @typedef {{n:number, d:number}} Frac
 * @typedef {object} BarSpec
 * @property {Frac} a
 * @property {Frac} b
 * @property {'+'|'−'} op
 * @property {number} common     the lowest common denominator
 * @property {Frac} left         a rewritten over `common`
 * @property {Frac} right        b rewritten over `common`
 * @property {Frac} result
 */

/** One bar: `segments` equal pieces, the first `filled` of them shaded. */
function bar(segments, filled, tone, { ghost = 0 } = {}) {
  const cells = [];
  for (let i = 0; i < segments; i++) {
    const state = i < filled ? 'is-filled'
      : i < filled + ghost ? 'is-ghost' : '';
    cells.push(el('div', { class: `bar__cell ${state}`, style: { '--tone': tone } }));
  }
  return el('div.bar', { style: { '--segments': segments } }, cells);
}

const label = (f) => el('div.bar__label', {},
  el('span.bar__num', {}, String(f.n)),
  el('span.bar__line'),
  el('span.bar__den', {}, String(f.d)));

function row(f, tone, opts) {
  return el('div.bar-row', {}, label(f), bar(f.d, f.n, tone, opts));
}

/**
 * @param {HTMLElement} container
 * @param {BarSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawBarModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { a, b, op, common, left, right, result } = spec;

  if (!reveal) {
    mount(container, el('div.bars', {},
      row(a, 'var(--vec-1)'),
      el('div.bar-op', {}, op),
      row(b, 'var(--vec-2)'),
      el('p.bar-hint', {},
        a.d === b.d
          ? 'Same sized pieces — they can be added directly.'
          : 'Different sized pieces. They need matching parts before they combine.')));
    return;
  }

  // Revealed: both rewritten over the common denominator, then the result.
  // Subtraction shows what is taken away as a ghost rather than a second bar.
  const resultRow = op === '−'
    ? el('div.bar-row', {}, label(result),
        bar(common, result.n, 'var(--result)', { ghost: right.n }))
    : el('div.bar-row', {}, label(result), bar(common, result.n, 'var(--result)'));

  mount(container, el('div.bars', {},
    row(left, 'var(--vec-1)'),
    el('div.bar-op', {}, op),
    row(right, 'var(--vec-2)'),
    el('div.bar-eq', {},
      el('span', {}, '='),
      verdict ? el('span', { class: `bar-verdict is-${verdict}` },
        verdict === 'ok' ? '✓' : '✗') : null),
    resultRow,
    el('p.bar-hint', {},
      `Both rewritten in ${common}ths, so the pieces match.`)));
}
