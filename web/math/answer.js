/**
 * Answer types. A skill declares what *kind* of thing it wants back, and the
 * type owns parsing, comparison, and formatting. This is the seam that lets
 * fractions, expressions and radicals slot in later without touching the
 * engine: define a type here, and every skill can use it.
 *
 * @typedef {object} AnswerType
 * @property {string} id
 * @property {'int'|'frac'|'text'|'choice'} input   which input widget to show
 * @property {string} hint                          shown when parsing fails
 * @property {(raw:string) => {ok:boolean, value?:any}} parse
 * @property {(a:any, b:any) => boolean} equals
 * @property {(v:any) => string} format
 */

/** @type {Record<string, AnswerType>} */
const TYPES = {};

/** @param {AnswerType} type */
export function defineType(type) {
  TYPES[type.id] = type;
  return type;
}

/** @param {string} id @returns {AnswerType} */
export function getType(id) {
  const t = TYPES[id];
  if (!t) throw new Error(`Unknown answer type: ${id}`);
  return t;
}

/** Normalise the various dashes a keyboard or a copy-paste can produce. */
const normalize = (raw) =>
  String(raw).trim().replace(/[−–—]/g, '-').replace(/\s+/g, '');

defineType({
  id: 'int',
  input: 'int',
  hint: 'Type a whole number (a minus sign is fine).',
  parse(raw) {
    const s = normalize(raw);
    if (!/^[+-]?\d+$/.test(s)) return { ok: false };
    return { ok: true, value: parseInt(s, 10) };
  },
  equals: (a, b) => a === b,
  format: (v) => (v < 0 ? `−${Math.abs(v)}` : String(v)),
});

defineType({
  id: 'frac',
  input: 'frac',
  hint: 'Type a numerator and a denominator.',
  parse(raw) {
    const s = normalize(raw);
    // A whole number is a fraction over one -- accept it rather than nitpick.
    if (/^[+-]?\d+$/.test(s)) return { ok: true, value: { n: parseInt(s, 10), d: 1 } };
    const m = s.match(/^([+-]?\d+)\/(\d+)$/);
    if (!m) return { ok: false };
    const d = parseInt(m[2], 10);
    if (d === 0) return { ok: false };
    return { ok: true, value: { n: parseInt(m[1], 10), d } };
  },
  equals: (a, b) => a.n * b.d === b.n * a.d,
  /** Stacked notation, matching how the question is written. */
  html: (v) => (v.d === 1 ? String(v.n)
    : `<span class="frac-term"><span class="fn">${v.n}</span>`
      + `<span class="fl"></span><span class="fd">${v.d}</span></span>`),
  /** Used only where a level asks for simplest form. */
  isSimplest: (v) => {
    let x = Math.abs(v.n), y = Math.abs(v.d);
    while (y) [x, y] = [y, x % y];
    return (x || 1) === 1;
  },
  format: (v) => (v.d === 1 ? String(v.n) : `${v.n}/${v.d}`),
});

defineType({
  id: 'mixed',
  input: 'mixed',
  hint: 'Give a whole number and a fraction, like 1 3/4.',
  /**
   * Parsed to a single improper fraction, so comparison is just fraction
   * equality. The *form* is checked separately: a mixed number whose fraction
   * part is not proper hasn't finished the job, and accepting it would let a
   * student answer "0 7/4" to the question "what is 7/4 as a mixed number".
   */
  parse(raw) {
    // The shared normaliser strips whitespace; here the space between the
    // whole and the fraction is the only thing separating them.
    const text = String(raw).trim().replace(/[−–—]/g, '-').replace(/\s+/g, ' ');
    if (!text) return { ok: false };

    const parts = text.split(' ');
    const asFraction = (t) => t.match(/^(\d+)\/(\d+)$/);
    let whole = 0, n = 0, d = 1;

    if (parts.length === 2) {
      if (!/^\d+$/.test(parts[0])) return { ok: false };
      const f = asFraction(parts[1]);
      if (!f) return { ok: false };
      whole = Number(parts[0]); n = Number(f[1]); d = Number(f[2]);
    } else if (parts.length === 1) {
      if (/^\d+$/.test(parts[0])) {
        whole = Number(parts[0]);
      } else {
        const f = asFraction(parts[0]);
        if (!f) return { ok: false };
        n = Number(f[1]); d = Number(f[2]);
      }
    } else {
      return { ok: false };
    }

    if (d === 0) return { ok: false };
    if (n >= d) {
      return { ok: false, hint: `${n}/${d} is still top-heavy — take another whole out of it.` };
    }
    return { ok: true, value: { n: whole * d + n, d } };
  },
  equals: (a, b) => a.n * b.d === b.n * a.d,
  isSimplest: (v) => {
    let x = Math.abs(v.n), y = Math.abs(v.d);
    while (y) [x, y] = [y, x % y];
    return (x || 1) === 1;
  },
  format(v) {
    const whole = Math.floor(v.n / v.d);
    const rest = v.n % v.d;
    if (!rest) return String(whole);
    return whole ? `${whole} ${rest}/${v.d}` : `${rest}/${v.d}`;
  },
  html(v) {
    const whole = Math.floor(v.n / v.d);
    const rest = v.n % v.d;
    const frac = rest
      ? `<span class="frac-term"><span class="fn">${rest}</span>`
        + `<span class="fl"></span><span class="fd">${v.d}</span></span>`
      : '';
    if (!rest) return String(whole);
    return whole ? `<span class="mixed-term">${whole}${frac}</span>` : frac;
  },
});

defineType({
  id: 'choice',
  input: 'choice',
  hint: 'Pick one.',
  /**
   * The options travel on the answer spec, not here, because they change with
   * every problem. Parsing is trivial; the interesting work is in the widget
   * and in writing options that cannot be guessed from surface features.
   */
  parse(raw) {
    const s = String(raw).trim();
    return s ? { ok: true, value: s } : { ok: false };
  },
  equals: (a, b) => a === b,
  format: (v) => String(v),
});
