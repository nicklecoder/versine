import { frac, reduce, multiply, divide, isSimplest, format, lcm, gcd } from '../math/frac.js';

/**
 * Multiplying and dividing fractions.
 *
 * Two genuinely different ideas, so two different pictures. Multiplying asks
 * "what is a part of a part?" and is drawn as an area: shade a strip across a
 * square, another down it, and the product is the overlap — which is also why
 * multiplying by a proper fraction makes things *smaller*, a result that
 * surprises most students.
 *
 * Dividing asks "how many of these fit into that?", which no area can show. It
 * gets a length picture instead: the dividend laid out, then chopped into
 * copies of the divisor and counted. Once that idea lands, flipping the
 * divisor is a shortcut rather than a spell.
 */

const LEVELS = [
  { name: 'A Part of a Part', blurb: 'Unit fractions. See why the answer gets smaller.' },
  { name: 'Multiplying Any Two', blurb: 'Numerators across the top, denominators along the bottom.' },
  { name: 'How Many Fit', blurb: 'Division as counting copies — the answers come out whole.' },
  { name: 'Dividing Fractions', blurb: 'The general case: flip the second one and multiply.' },
  {
    name: 'Simplify the Answer',
    blurb: 'Right value, lowest terms. Expected from here on.',
    requireSimplest: true,
  },
  {
    name: 'All Together',
    blurb: 'Everything mixed, in simplest form. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
const PAR_SECONDS = [14, 16, 18, 22, 22, 22];

/** A numerator leaving the fraction in lowest terms, as a book would print it. */
function coprimeNumerator(rng, d, max) {
  const options = [];
  for (let n = 1; n <= Math.min(max, d - 1); n++) if (gcd(n, d) === 1) options.push(n);
  return options.length ? rng.pick(options) : 1;
}

function draw(rng, level) {
  switch (level) {
    case 0: {                                   // unit fraction × unit fraction
      const d1 = rng.int(2, 12);
      const d2 = rng.int(2, 12);
      return { a: frac(1, d1), b: frac(1, d2), op: '×' };
    }
    case 1: {                                   // any two proper fractions
      const d1 = rng.int(2, 12);
      const d2 = rng.int(2, 12);
      return {
        a: frac(coprimeNumerator(rng, d1, d1 - 1), d1),
        b: frac(coprimeNumerator(rng, d2, d2 - 1), d2),
        op: '×',
      };
    }
    case 2: {
      // "How many eighths fit into three quarters?" A unit-fraction divisor
      // keeps the count whole and the question speakable. The dividend is
      // reduced for display; the picture works from the common denominator
      // either way.
      const k = rng.pick([4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20]);
      const copies = rng.int(2, Math.min(9, k - 1));
      return { a: reduce(frac(copies, k)), b: frac(1, k), op: '÷' };
    }
    default: {                                  // general division
      const d1 = rng.int(2, 12);
      const d2 = rng.int(2, 12);
      return {
        a: frac(coprimeNumerator(rng, d1, d1 - 1), d1),
        b: frac(coprimeNumerator(rng, d2, d2 - 1), d2),
        op: '÷',
      };
    }
  }
}

function build(rng, level, requireSimplest) {
  let a, b, op, raw;
  for (let i = 0; i < 40; i++) {
    ({ a, b, op } = draw(rng, level));
    raw = op === '×' ? multiply(a, b) : divide(a, b);
    // Reject the trivial: an answer of exactly one, or a divisor equal to the
    // dividend. Also keep quotients sane so the picture stays drawable.
    if (raw.n !== raw.d && raw.n / raw.d <= 8) break;
  }

  // Multiplying, the unreduced product IS the taught step: 2/3 × 3/4 = 6/12
  // shows the mechanism. Dividing, it is just noise -- nobody wants "how many
  // quarters fit into three quarters" answered as 12/4 -- so division always
  // presents the tidy value. Equivalent answers stay acceptable either way,
  // because the frac type compares by cross-multiplication.
  const tidy = op === '÷' || requireSimplest;
  const expected = tidy ? reduce(raw) : raw;
  const opSign = op;

  const frag = (f, cls) =>
    `<span class="${cls} frac-term"><span class="fn">${f.n}</span>`
    + `<span class="fl"></span><span class="fd">${f.d}</span></span>`;

  return {
    prompt: frag(a, 't1') + `<span class="op">${opSign}</span>` + frag(b, 't2')
      + `<span class="op">=</span><span class="q">?</span>`,
    text: `${format(a)} ${opSign} ${format(b)}`,
    answer: { type: 'frac', value: expected, requireSimplest },
    parSeconds: PAR_SECONDS[level],
    visual: op === '×'
      ? { kind: 'areamodel', a, b, product: raw }
      : { kind: 'fitsmodel', a, b, quotient: reduce(raw), fine: lcm(a.d, b.d) },
    explain: explain(a, b, op, raw, requireSimplest),
  };
}

function explain(a, b, op, raw, requireSimplest) {
  const simplified = reduce(raw);
  const tail = requireSimplest && !isSimplest(raw)
    ? ` Then ${format(raw)} simplifies to ${format(simplified)}.`
    : '';

  if (op === '×') {
    return `Multiply straight across: ${a.n} × ${b.n} = ${raw.n} on top, `
      + `${a.d} × ${b.d} = ${raw.d} underneath, giving ${format(raw)}.${tail}`;
  }
  return `Dividing by ${format(b)} is the same as multiplying by ${format(frac(b.d, b.n))}. `
    + `So ${format(a)} × ${format(frac(b.d, b.n))} = ${format(simplified)}.`;
}

export default {
  id: 'frac-muldiv',
  name: 'Multiply & Divide Fractions',
  category: 'fractions',
  glyph: '×⁄',
  blurb: 'Parts of parts, and how many fit.',
  answerInput: 'frac',
  dependsOn: ['frac-addsub'],
  levels: LEVELS,

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
  generate(rng, level) {
    if (level >= LAST_LEVEL) {
      const from = rng.int(0, LAST_LEVEL - 1);
      const problem = build(rng, from, true);
      problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
      return problem;
    }
    return build(rng, level, !!LEVELS[level].requireSimplest);
  },
};
