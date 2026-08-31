import { el, mount } from './dom.js';

/**
 * Sign-and-size model, for multiplying and dividing.
 *
 * These problems are two independent questions wearing one coat: what sign
 * does the answer have, and how big is it? Kids who "can't do negatives" can
 * almost always do 3 × 4 -- what they lose track of is the sign. So the widget
 * splits the problem in two and answers neither until the student has.
 *
 * The size row only ever prints what it is given, so a term's `abs` may be a
 * number or already-formatted text like "2/3". That is the whole of what
 * signed fractions needed from this renderer: the argument it makes -- the
 * sign is a separate question from the size -- is not about integers, it is
 * about multiplication, and −2/3 × 3/4 wants exactly the same split.
 *
 * The result arrives as `answer` when it is a whole number and as `result`
 * when it is a fraction. Two fields rather than one loose one, so the schema
 * can still say which shape it expects and the deploy gate can still check.
 *
 * Like the number line, it reveals nothing while the question is open.
 *
 * @typedef {object} SignSpec
 * @property {Array<{sign:'+'|'−', abs:number|string}>} terms
 * @property {string[]} ops   one shorter than terms, e.g. ['×'] or ['×','÷']
 * @property {number} [answer]              a whole-number result
 * @property {{n:number, d:number}} [result] a fractional one
 */

const HIDDEN = '?';

/**
 * @param {HTMLElement} container
 * @param {SignSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawSignModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { terms, ops, answer, result } = spec;

  const negatives = terms.filter((t) => t.sign === '−').length;
  const negative = result ? result.n < 0 : answer < 0;
  const resultSign = negative ? '−' : '+';
  const size = result
    ? (result.d === 1 ? String(Math.abs(result.n)) : `${Math.abs(result.n)}/${result.d}`)
    : String(Math.abs(answer));

  /** Interleave terms with operators: a × b ÷ c */
  const sequence = (render) => {
    const out = [];
    terms.forEach((t, i) => {
      if (i) out.push(el('span.sm-op', {}, ops[i - 1]));
      out.push(render(t, i));
    });
    return out;
  };

  const signRow = el('div.sm-row', {},
    ...sequence((t) => el('span', { class: `sm-sign is-${t.sign === '−' ? 'neg' : 'pos'}` }, t.sign)),
    el('span.sm-eq', {}, '='),
    el('span', {
      class: `sm-out ${reveal ? (resultSign === '−' ? 'is-neg' : 'is-pos') : 'is-open'}`,
    }, reveal ? resultSign : HIDDEN));

  const sizeRow = el('div.sm-row', {},
    ...sequence((t) => el('span.sm-abs', {}, String(t.abs))),
    el('span.sm-eq', {}, '='),
    el('span', { class: `sm-out ${reveal ? 'is-size' : 'is-open'}` },
      reveal ? size : HIDDEN));

  const panels = el('div.signmodel', {},
    el('div.sm-panel', {},
      el('div.sm-label', {}, negatives === 1 ? 'Sign — one negative'
        : negatives > 1 ? `Sign — ${negatives} negatives` : 'Sign'),
      signRow),
    el('div.sm-panel', {},
      el('div.sm-label', {}, 'Size'),
      sizeRow));

  const nodes = [panels];

  if (reveal) {
    nodes.push(el('div.sm-result', {},
      el('span.sm-result__value', { class: resultSign === '−' ? 'is-neg' : 'is-pos' },
        negative ? `−${size}` : size),
      verdict
        ? el('span', { class: `sm-verdict is-${verdict}` }, verdict === 'ok' ? '✓' : '✗')
        : null));
  }

  mount(container, nodes);
}
