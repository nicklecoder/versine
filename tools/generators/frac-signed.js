/**
 * Catalogue authoring tool: builds the problem library for frac-signed.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import { frac, reduce, multiply, divide, format, gcd } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-signed.js';
import * as T from '../terms.js';

/** A numerator leaving the fraction in lowest terms, as a book would print it. */
function coprimeNumerator(rng, d) {
  const options = [];
  for (let n = 1; n < d; n++) if (gcd(n, d) === 1) options.push(n);
  return rng.pick(options);
}

/** A proper fraction in lowest terms, with the sign asked for. */
function pick(rng, sign) {
  const d = rng.int(2, 12);
  return frac(coprimeNumerator(rng, d) * sign, d);
}

/** The magnitude, as the size row wants to print it. */
const size = (f) => format(frac(Math.abs(f.n), f.d));
const sign = (f) => (f.n < 0 ? '−' : '+');

/**
 * Where the minus lives.
 *
 * −3/4, 3/−4 and −(3/4) are the same number, and the standard way to write it
 * puts the sign in front. This is not pedantry about notation: a student who
 * reads the minus in 3/−4 as belonging to the denominator will treat
 * (−3)/(−4) as having a sign to cancel *and* a sign to keep, and get a
 * confident wrong answer twice.
 *
 * The rows that start with a negative denominator are the ones that carry
 * the level. A double negative simplifies away entirely, which is the same
 * fact as a negative divided by a negative, and saying so is the point.
 */
function whereTheMinus(rng) {
  const d = rng.int(2, 12);
  const k = rng.int(2, 6);                          // so there is something to simplify
  const base = coprimeNumerator(rng, d);
  if (base * k > 60 || d * k > 60) return whereTheMinus(rng);
  const shape = rng.int(0, 2);
  // 0: −n/d      1: n/−d      2: −n/−d
  const n = shape === 1 ? base * k : -base * k;
  const den = shape === 0 ? d * k : -d * k;
  const value = reduce(frac(n, den));
  const shown = `${n}/${den}`.replace(/-/g, '−');

  return {
    prompt: [T.prose(`Write ${shown} as a fraction in lowest terms.`)],
    text: `${n}/${den} in lowest terms`,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'evalmodel',
      lines: [shown,
              shape === 2 ? 'a negative over a negative, so it is positive'
                : 'one negative, so the whole fraction is negative',
              `${Math.abs(n)}/${Math.abs(den)}, sign in front`,
              format(value).replace(/-/g, '−')],
      rules: ['count the negatives',
              'a minus below the line means the same as one in front',
              'then divide both by what they share'],
      hint: 'How many negatives are there, and where do they end up?',
    },
    explain: (shape === 2
      ? `Two negatives: a negative divided by a negative is positive, so ${shown} is `
        + `${Math.abs(n)}/${Math.abs(den)}. `
      : `One negative, and it does not matter which line it is on — ${shown} means the `
        + `same as −${Math.abs(n)}/${Math.abs(den)}, because dividing by a negative and `
        + 'taking the negative of a division come to the same thing. ')
      + `Then ${Math.abs(n)} and ${Math.abs(den)} share a factor of ${k}, `
      + `leaving ${format(value).replace(/-/g, '−')}.`,
  };
}

/**
 * Multiply or divide, with the sign kept as a separate question.
 *
 * `negatives` says how many of the two are negative, so the caller decides
 * which level this is rather than the draw doing it. The picture is
 * int-muldiv's sign-and-size model, unchanged: it prints whatever magnitudes
 * it is handed, and 2/3 × 3/4 is exactly as printable as 2 × 3.
 */
function signedOperation(rng, negatives, dividing) {
  // With one negative it may be either of the two, so the level is not "the
  // first one has the minus on it" four hundred times over -- which a student
  // would learn to read instead of counting.
  const firstNegative = negatives === 2 || (negatives === 1 && rng.chance(0.5));
  const a = pick(rng, firstNegative ? -1 : 1);
  const b = pick(rng, negatives === 2 || (negatives === 1 && !firstNegative) ? -1 : 1);
  const raw = dividing ? divide(a, b) : multiply(a, b);
  const value = reduce(raw);
  if (Math.abs(value.n) === value.d) return signedOperation(rng, negatives, dividing);
  const op = dividing ? '÷' : '×';

  return {
    prompt: T.asks(T.frac(a.n, a.d, 1), T.op(op), T.frac(b.n, b.d, 2)),
    text: `${format(a)} ${op} ${format(b)}`,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'signmodel',
      terms: [{ sign: sign(a), abs: size(a) }, { sign: sign(b), abs: size(b) }],
      ops: [op],
      result: value,
    },
    explain: `Two questions. The sign: ${negatives === 2 ? 'two negatives, so positive'
      : 'one negative, so negative'}. The size: `
      + (dividing
        ? `${size(a)} ÷ ${size(b)} is ${size(a)} × ${format(frac(b.d, Math.abs(b.n)))} = `
          + `${size(value)}`
        : `${size(a)} × ${size(b)} = ${size(value)}`)
      + `. Put them together: ${format(value).replace(/-/g, '−')}.`
      + (dividing
        ? ' Flipping the second fraction leaves its sign alone — the reciprocal of a '
          + 'negative is negative.'
        : ''),
  };
}

/**
 * The sign, before any arithmetic at all.
 *
 * Knowable from counting negatives and nothing else, which is why it is worth
 * a level: a student who works out the size first and decides the sign at the
 * end is deciding it while tired, and a long calculation that ends in a coin
 * flip was wasted. Three terms, so counting is a real count rather than a
 * glance.
 */
function whatSign(rng) {
  const count = rng.int(0, 3);
  const terms = [0, 1, 2].map((i) => pick(rng, i < count ? -1 : 1));
  const shuffled = rng.shuffle(terms);
  const ops = [rng.pick(['×', '÷']), rng.pick(['×', '÷'])];
  const src = `${format(shuffled[0])} ${ops[0]} ${format(shuffled[1])} `
    + `${ops[1]} ${format(shuffled[2])}`;
  const negative = count % 2 === 1;

  return {
    prompt: [T.prose(`Without working it out: will ${src.replace(/-/g, '−')} `
      + 'be positive or negative?')],
    text: `sign of ${src}`,
    answer: {
      type: 'choice',
      value: negative ? 'negative' : 'positive',
      options: rng.shuffle([
        { id: 'positive', label: 'Positive', note: 'the negatives pair off' },
        { id: 'negative', label: 'Negative', note: 'one is left over' },
      ]),
    },
    visual: null,
    explain: `There ${count === 1 ? 'is 1 negative' : `are ${count} negatives`}, and `
      + `${count} is ${negative ? 'odd' : 'even'}, so the answer is `
      + `${negative ? 'negative' : 'positive'}. Negatives cancel in pairs, and dividing `
      + 'behaves exactly as multiplying does about this — so the count is all you need, '
      + 'and you have it before doing any of the arithmetic.',
  };
}

/** Dividing draws either one negative or two, so both cases stay live. */
const CONTENT = [
  whereTheMinus,
  (r) => signedOperation(r, 1, false),
  (r) => signedOperation(r, 2, false),
  (r) => signedOperation(r, r.chance(0.6) ? 1 : 2, true),
];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The mixed level leaves out the strategy level, whose answer is a choice.
  const p = level === 4 ? whatSign(rng)
    : level >= LAST_LEVEL ? rng.pick(CONTENT)(rng)
    : CONTENT[level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
