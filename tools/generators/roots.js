/**
 * Catalogue authoring tool: builds the problem library for roots.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/roots.js';

/**
 * Squares worth knowing on sight. Stops at 35 because past that the answer
 * comes from multiplying rather than from recall, which is a different skill.
 */
const ROOTS = Array.from({ length: 34 }, (_, i) => i + 2);   // 2..35

/**
 * Square-free multipliers. They must be square-free, or the "biggest square
 * that divides" would not be the one the problem was built from and the
 * prompt would disagree with its own working.
 */
const SQUARE_FREE = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15, 17, 19, 21, 22, 23, 26, 29, 30];

/** The largest square dividing n, and what is left beside it. */
function pullOut(n) {
  let best = 1;
  for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) best = k;
  return { outside: best, inside: n / (best * best) };
}

/** Squares you should know, asked both ways. */
function perfect(rng) {
  const r = rng.pick(ROOTS);
  const sq = r * r;
  if (rng.chance(0.45)) {
    return {
      prompt: T.asks(T.pow(r, 2, 1)),
      text: `${r}^2`,
      answer: { type: 'int', value: sq },
      visual: {
        kind: 'evalmodel',
        lines: [`${r}²`, `${r} × ${r}`, String(sq)],
        rules: ['a square is the number times itself', 'work it out'],
        hint: 'What does squaring do?',
      },
      explain: `${r}² is ${r} × ${r} = ${sq}.`,
    };
  }
  return {
    prompt: T.asks(T.root(sq, undefined, 1)),
    text: `sqrt(${sq})`,
    answer: { type: 'int', value: r },
    visual: {
      kind: 'evalmodel',
      lines: [`√${sq}`, `what squared gives ${sq}?`, `${r} × ${r} = ${sq}`, String(r)],
      rules: ['a root asks the squaring question backwards', 'and this one fits', 'so the root is'],
      hint: 'What number, multiplied by itself, gives this?',
    },
    explain: `√${sq} asks what squared gives ${sq}. ${r} × ${r} = ${sq}, so the root is ${r}.`,
  };
}

/** Most roots are not whole. Where does this one sit? */
function between(rng) {
  // A number strictly between two consecutive squares.
  const low = rng.int(2, 20);
  const n = rng.int(low * low + 1, (low + 1) * (low + 1) - 1);
  return {
    prompt: [T.root(n, undefined, 1), T.op('lies just above'), T.blank()],
    text: `sqrt(${n}) lies just above ?`,
    answer: { type: 'int', value: low },
    visual: {
      kind: 'evalmodel',
      lines: [`√${n}`, `${low}² = ${low * low}, and ${low + 1}² = ${(low + 1) ** 2}`,
              `${low * low} < ${n} < ${(low + 1) ** 2}`,
              `so √${n} is between ${low} and ${low + 1}`],
      rules: ['find the squares either side', 'the number sits between them', 'so the root does too'],
      hint: 'Which two squares is this number between?',
    },
    explain: `${low}² = ${low * low} and ${low + 1}² = ${(low + 1) ** 2}. Since ${n} sits `
      + `between them, √${n} sits between ${low} and ${low + 1} — just above ${low}.`,
  };
}

/** A square hiding inside the root can come out of it. */
function simplify(rng, hard) {
  // Build the number from a square factor and a square-free remainder, so
  // there is always something to pull out and something left behind.
  const outside = rng.int(2, hard ? 12 : 8);
  const inside = rng.pick(hard ? SQUARE_FREE : SQUARE_FREE.slice(0, 8));
  const n = outside * outside * inside;
  if (n > 4000) return simplify(rng, false);
  // Read the factorisation back off the number rather than trusting the one it
  // was built from: the prompt, the working and the answer then cannot
  // disagree, whatever the multiplier lists later become.
  const check = pullOut(n);
  // Ask for the coefficient, which is the whole of what simplifying does.
  return {
    prompt: [T.root(n, undefined, 1), T.op('='), T.root(check.inside, null, 2)],
    text: `sqrt(${n}) = ?sqrt(${check.inside})`,
    answer: { type: 'int', value: check.outside },
    visual: {
      kind: 'evalmodel',
      lines: [`√${n}`, `√(${check.outside * check.outside} × ${check.inside})`,
              `√${check.outside * check.outside} × √${check.inside}`,
              `${check.outside}√${check.inside}`],
      rules: [`${check.outside * check.outside} is the biggest square that divides ${n}`,
              'a root of a product splits', 'and the square root comes out whole'],
      hint: 'What is the biggest square that divides this?',
    },
    explain: `${n} = ${check.outside * check.outside} × ${check.inside}, and `
      + `√${check.outside * check.outside} = ${check.outside}. So √${n} = ${check.outside}√${check.inside}.`,
  };
}

/**
 * The strategic layer: an exact radical and a decimal are answers to different
 * questions. Exactness is for carrying on with; a decimal is for judging size
 * or reporting a measurement.
 */
const SITUATIONS = [
  { text: 'You need to give the exact answer to {r}.', want: 'simplify',
    why: 'A decimal for {r} is rounded, so it is not exact. The simplified radical is.' },
  { text: 'You need to add {r} to another radical.', want: 'simplify',
    why: 'Radicals only combine when what is under the root matches. Simplifying is what reveals whether it does.' },
  { text: 'You need to cut a piece of wood {r} inches long.', want: 'estimate',
    why: 'A saw does not take a radical. Anything you build with needs a decimal.' },
  { text: 'You need to say whether {r} is more than 9.', want: 'estimate',
    why: 'Comparing sizes needs a number you can place on a line.' },
  { text: 'You need to check whether {r} equals another radical.', want: 'simplify',
    why: 'Two radicals that look different can be the same. Only simplest form settles it.' },
  { text: 'You need to plot {r} on a number line.', want: 'estimate',
    why: 'A position on a line is a decimal. The exact form does not tell you where to put the dot.' },
];

function whichForm(rng) {
  const outside = rng.int(2, 6);
  const inside = rng.pick([2, 3, 5, 6, 7]);
  const label = `√${outside * outside * inside}`;
  const situation = rng.pick(SITUATIONS);
  const fill = (t) => t.replace(/\{r\}/g, label);
  return {
    prompt: [T.prose(fill(situation.text))],
    text: fill(situation.text),
    answer: {
      type: 'choice',
      value: situation.want,
      options: rng.shuffle([
        { id: 'simplify', label: 'Simplest radical form', note: `exact: ${outside}√${inside}` },
        { id: 'estimate', label: 'A decimal estimate', note: 'a number you can measure with' },
      ]),
    },
    visual: null,
    explain: fill(situation.why),
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return perfect(rng);
      case 1: return between(rng);
      case 2: return simplify(rng, false);
      case 3: return simplify(rng, true);
      case 4: return whichForm(rng);
      default: return rng.pick([perfect, between, (r) => simplify(r, true)])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
