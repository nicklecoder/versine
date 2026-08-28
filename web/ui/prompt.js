import { el } from './dom.js';

/**
 * Rendering a problem's prompt.
 *
 * A prompt is a list of terms — data the system understands — rather than a
 * string of markup it merely echoes. That buys four things:
 *
 *   Notation can be restyled everywhere at once. Changing how a fraction is
 *   set is a change here, not a rewrite of 27,000 catalogue rows.
 *
 *   Nothing from the catalogue reaches innerHTML. Terms become elements with
 *   textContent, so a stray angle bracket in a problem is a character, not
 *   markup.
 *
 *   Prompts can be checked. A term naming a type that does not exist, or
 *   missing a field, is caught by the deploy gate rather than rendering as
 *   nothing in front of a student.
 *
 *   New notation is available to the whole catalogue at once. Adding a term
 *   type here — a radical, an exponent, a coordinate pair — lets every level
 *   use it immediately, which is the point of a shared vocabulary.
 *
 * Slots (`s`) carry the accent colour a term is drawn in, matching the visual
 * beside it: the first operand and its bar are the same hue. They are
 * presentation, not meaning.
 */

/** A fraction, or a blank where a number is being asked for. */
function fracNode(n, d, cls) {
  const part = (v, c) => v === null || v === undefined
    ? el(`span.${c}.is-blank`, {}, '?')
    : el(`span.${c}`, {}, String(v));
  return el(`span.frac-term${cls}`, {},
    part(n, 'fn'), el('span.fl'), part(d, 'fd'));
}

const TERMS = {
  /** A plain number or short expression: `2`, `(−2)`, `10 + 2 × 2`. */
  num: (t) => el(`span.t${t.s ?? 1}`, {}, String(t.v)),

  /** A fraction. `n` or `d` may be null to show a blank for the unknown. */
  frac: (t) => fracNode(t.n, t.d, `.t${t.s ?? 1}`),

  /** A whole number beside a fraction. */
  mixed: (t) => el(`span.t${t.s ?? 1}.mixed-term`, {},
    String(t.w), fracNode(t.n, t.d, '')),

  /** An operator or relation between terms. */
  op: (t) => el('span.op', {}, String(t.v)),

  /** Where the answer goes. */
  blank: () => el('span.q', {}, '?'),

  /** A sentence rather than an expression — strategy levels ask in words. */
  prose: (t) => el(`span.t${t.s ?? 1}.situation`, {}, String(t.v)),
};

export const TERM_KINDS = Object.keys(TERMS);

/**
 * @param {HTMLElement} node   where the prompt goes
 * @param {Array<object>} terms
 * @param {{blankAs?: object}} [opts]  a term to show in place of the blank,
 *        used once an answer is committed. Substituting a term rather than
 *        rewriting markup means the answer is set in the same notation the
 *        question was asked in, whatever that notation later becomes.
 */
export function renderPrompt(node, terms, opts = {}) {
  node.replaceChildren(...(terms ?? []).map((t) => {
    if (t?.t === 'blank' && opts.blankAs) {
      const filled = TERMS[opts.blankAs.t];
      if (filled) {
        const n = filled(opts.blankAs);
        n.classList.add('a');
        return n;
      }
    }
    const make = TERMS[t?.t];
    // A term the system does not know is a catalogue fault, not a student's.
    // Show a marker rather than nothing, so it is obvious on sight.
    return make ? make(t) : el('span.t1.is-unknown', {}, '⚠');
  }));
}

/**
 * The term that shows a committed answer, in the notation of its type.
 * @param {string} type  an answer type id
 * @param {any} value
 */
export function answerTerm(type, value) {
  switch (type) {
    case 'frac': return { t: 'frac', n: value.n, d: value.d };
    case 'mixed': return value.w !== undefined && value.w !== 0
      ? { t: 'mixed', w: value.w, n: value.n, d: value.d }
      : { t: 'frac', n: value?.n ?? value, d: value?.d ?? 1 };
    default: return { t: 'num', v: String(value) };
  }
}

/**
 * The same terms as plain text, for aria labels, logs and the attempt record.
 */
export function promptText(terms) {
  return (terms ?? []).map((t) => {
    switch (t?.t) {
      case 'num': return String(t.v);
      case 'frac': return `${t.n ?? '?'}/${t.d ?? '?'}`;
      case 'mixed': return `${t.w} ${t.n}/${t.d}`;
      case 'op': return ` ${t.v} `;
      case 'blank': return '?';
      case 'prose': return String(t.v);
      default: return '';
    }
  }).join('').replace(/\s+/g, ' ').trim();
}
