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

  /**
   * A power. `e` may be null to ask for the exponent, which is what the
   * exponent rules actually drill: 2³ × 2⁴ = 2^? is a question about adding
   * exponents, and asking for 128 instead would let a student multiply their
   * way past the rule without using it.
   */
  pow: (t) => el(`span.t${t.s ?? 1}.pow-term`, {},
    String(t.b),
    t.e === null || t.e === undefined
      ? el('sup.is-blank', {}, '?')
      : el('sup', {}, String(t.e))),

  /**
   * A square root, optionally with a coefficient in front. Either part may be
   * null to ask for it: √50 = ?√2 asks for the coefficient, which is the whole
   * of what simplifying a radical is.
   */
  root: (t) => el(`span.t${t.s ?? 1}.root-term`, {},
    t.c === undefined ? null
      : t.c === null ? el('span.is-blank', {}, '?') : el('span', {}, String(t.c)),
    el('span.root-term__sign', {}, '√'),
    el('span.root-term__body', {},
      t.v === null || t.v === undefined ? el('span.is-blank', {}, '?') : String(t.v))),

  /** A sentence rather than an expression — strategy levels ask in words. */
  prose: (t) => el(`span.t${t.s ?? 1}.situation`, {}, String(t.v)),
};

export const TERM_KINDS = Object.keys(TERMS);

/**
 * Which fields of which terms, when null, mean "the student fills this in".
 *
 * Exported so the deploy gate can tell whether a prompt has anywhere for the
 * answer to go without keeping its own copy of the rule. The first version of
 * that check knew only about `blank` and fractions, and the moment powers and
 * roots arrived it declared 2,034 correct problems broken -- which is the
 * right failure, but only once.
 */
export const BLANK_FIELDS = { frac: ['n', 'd'], pow: ['e'], root: ['c', 'v'] };

/**
 * Where the answer goes in a prompt, and how to put it there.
 *
 * A blank is not always a term of its own. "1/10 = ?/20" asks for a numerator
 * *inside* a fraction, and "2⁵ × 2³ = 2^?" asks for an exponent inside a
 * power — in both the question would read as nonsense if the gap were lifted
 * out into a separate `?`. So a term may carry its own blank, and filling one
 * means rewriting that term rather than replacing it.
 *
 * @returns {object|null} the term with its blank filled, or null if it has none
 */
function fillBlank(term, shown) {
  switch (term?.t) {
    case 'frac':
      if (term.n === null) return { ...term, n: shown };
      if (term.d === null) return { ...term, d: shown };
      return null;
    case 'pow':
      return term.e === null || term.e === undefined ? { ...term, e: shown } : null;
    case 'root':
      if (term.c === null) return { ...term, c: shown };
      if (term.v === null) return { ...term, v: shown };
      return null;
    default:
      return null;
  }
}

/**
 * @param {HTMLElement} node   where the prompt goes
 * @param {Array<object>} terms
 * @param {{blankAs?: object, shown?: string|number}} [opts]  what to show once
 *        an answer is committed: `blankAs` is a whole term replacing a `blank`,
 *        `shown` is a scalar filling a blank carried inside a term.
 *        Substituting terms rather than rewriting markup means the answer is
 *        set in the same notation the question was asked in.
 */
export function renderPrompt(node, terms, opts = {}) {
  let filled = false;
  node.replaceChildren(...(terms ?? []).map((t) => {
    if (!filled && t?.t === 'blank' && opts.blankAs) {
      const make = TERMS[opts.blankAs.t];
      if (make) {
        filled = true;
        const n = make(opts.blankAs);
        n.classList.add('a');
        return n;
      }
    }
    if (!filled && opts.shown !== undefined) {
      const done = fillBlank(t, opts.shown);
      if (done) {
        filled = true;
        const n = TERMS[done.t](done);
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
      case 'pow': return `${t.b}^${t.e ?? '?'}`;
      case 'root': return `${t.c === undefined ? '' : (t.c ?? '?')}sqrt(${t.v ?? '?'})`;
      case 'op': return ` ${t.v} `;
      case 'blank': return '?';
      case 'prose': return String(t.v);
      default: return '';
    }
  }).join('').replace(/\s+/g, ' ').trim();
}
