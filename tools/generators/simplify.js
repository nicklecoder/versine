/**
 * Catalogue authoring tool: builds the problem library for simplify.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/simplify.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/**
 * The question is drawn by the same renderer the student's own typing goes
 * through, so what they are shown and what they see themselves type are set
 * identically. It also means a question that will not parse cannot be
 * published: the build fails on it here rather than a student meeting it.
 */
function ask(src) {
  const r = previewOf(src);
  if (!r.ok) throw new Error(`simplify: cannot draw "${src}" — ${r.error}`);
  return [...r.terms, T.op('='), T.blank()];
}

/** `mx + c` the way a person writes it: 1x is x, +−3 is −3, +0 is nothing. */
function linear(m, c, v) {
  const head = m === 1 ? v : m === -1 ? `-${v}` : `${m}${v}`;
  if (!c) return head;
  return `${head} ${c > 0 ? '+' : '-'} ${Math.abs(c)}`;
}

/** Same letter, so the numbers in front add. */
function collect(rng) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 12);
  const b = rng.int(2, 12);
  const src = `${a}${v} + ${b}${v}`;
  return {
    prompt: ask(src),
    text: src,
    answer: { type: 'expr', value: linear(a + b, 0, v) },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${a} lots of ${v} and ${b} more`, `${a} + ${b} = ${a + b}`, linear(a + b, 0, v)],
      rules: ['both count the same thing', 'so the numbers in front add', 'giving'],
      hint: 'What is each term counting?',
    },
    explain: `Both terms count ${v}s, so they combine: ${a} + ${b} = ${a + b}, `
      + `giving ${linear(a + b, 0, v)}.`,
  };
}

/** Some of it combines and some of it cannot. */
function partial(rng) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 9);
  const b = rng.int(2, 9);
  const c = rng.int(2, 15);
  const src = `${a}${v} + ${c} + ${b}${v}`;
  return {
    prompt: ask(src),
    text: src,
    answer: { type: 'expr', value: linear(a + b, c, v) },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${a}${v} + ${b}${v} counts ${v}s; ${c} does not`,
              `${a} + ${b} = ${a + b}`, linear(a + b, c, v)],
      rules: ['sort them by what they count', 'add the ones that match', 'and the rest stays'],
      hint: 'Which of these are counting the same thing?',
    },
    explain: `${a}${v} and ${b}${v} both count ${v}s and combine to ${linear(a + b, 0, v)}. `
      + `${c} counts nothing but itself, so it stays: ${linear(a + b, c, v)}.`,
  };
}

/** A bracket multiplied hits everything inside it. */
function distribute(rng, andCollect) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 9);
  const b = rng.int(1, 12) * (rng.chance(0.3) ? -1 : 1);
  const inner = b >= 0 ? `${v} + ${b}` : `${v} - ${-b}`;
  const extra = andCollect ? rng.int(2, 9) : 0;
  const src = andCollect ? `${a}(${inner}) + ${extra}${v}` : `${a}(${inner})`;
  const m = a + extra;
  const c = a * b;
  return {
    prompt: ask(src),
    text: src,
    answer: { type: 'expr', value: linear(m, c, v) },
    visual: {
      kind: 'evalmodel',
      lines: [src,
              `${a} × ${v} and ${a} × ${b >= 0 ? b : `(${b})`}`,
              andCollect ? `${linear(a, c, v)} + ${extra}${v}` : linear(a, c, v),
              linear(m, c, v)],
      rules: ['the multiplier reaches both terms',
              andCollect ? 'which gives' : 'so',
              andCollect ? `${a} + ${extra} = ${m} lots of ${v}` : 'and that is it'],
      hint: 'What does the number outside multiply?',
    },
    explain: `${a} multiplies both terms inside: ${a} × ${v} = ${linear(a, 0, v)} and `
      + `${a} × ${b >= 0 ? b : `(${b})`} = ${c}. `
      + (andCollect
        ? `Then ${linear(a, 0, v)} and ${extra}${v} combine to ${linear(m, 0, v)}, `
          + `leaving ${linear(m, c, v)}.`
        : `That gives ${linear(m, c, v)}.`),
  };
}

/**
 * The strategic layer, and the reason this skill exists.
 *
 * Brackets are kept when the next step divides by them or cancels them, and
 * opened when the next step needs like terms to be visible. Neither form is
 * simpler in the abstract -- what is about to happen decides.
 */
const SITUATIONS = [
  { text: 'You need to solve {f} = {p} for {v}.', want: 'keep',
    why: 'Dividing both sides by {a} undoes the bracket in one step. Expanding first makes more work, not less.' },
  { text: 'You need to add {f} to {e}{v}.', want: 'open',
    why: 'Like terms can only be collected once they are visible, and the bracket hides them.' },
  { text: 'You need the number in front of {v} in {f}.', want: 'open',
    why: 'The coefficient is only readable once the bracket is gone.' },
  { text: 'You need to cancel a factor of {a} from {f} over {a}.', want: 'keep',
    why: 'The {a} is already a factor of the whole thing. Expanding would hide what cancels.' },
  { text: 'You need to check whether {f} matches another expression written as {m}{v} + {c}.', want: 'open',
    why: 'Two expressions are compared in the same form, and standard form is the one to meet in.' },
  { text: 'You need to divide {f} by {a} exactly.', want: 'keep',
    why: 'With the {a} outside, the division is one step and stays exact.' },
];

function whichForm(rng) {
  const v = rng.pick(VARS);
  const a = rng.int(2, 9);
  const b = rng.int(1, 9);
  const e = rng.int(2, 9);
  const f = `${a}(${v} + ${b})`;
  const s = rng.pick(SITUATIONS);
  const fill = (t) => t
    .replace(/\{f\}/g, f).replace(/\{v\}/g, v).replace(/\{a\}/g, String(a))
    .replace(/\{e\}/g, String(e)).replace(/\{m\}/g, String(a))
    .replace(/\{c\}/g, String(a * b)).replace(/\{p\}/g, String(a * (b + rng.int(1, 6))));
  return {
    prompt: [T.prose(fill(s.text))],
    text: fill(s.text),
    answer: {
      type: 'choice', value: s.want,
      options: rng.shuffle([
        { id: 'keep', label: 'Keep the brackets', note: 'so the whole thing can be divided or cancelled' },
        { id: 'open', label: 'Multiply them out', note: 'so like terms and coefficients are visible' },
      ]),
    },
    visual: null,
    explain: fill(s.why),
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return collect(rng);
      case 1: return partial(rng);
      case 2: return distribute(rng, false);
      case 3: return distribute(rng, true);
      case 4: return whichForm(rng);
      default: return rng.pick([collect, partial,
        (r) => distribute(r, false), (r) => distribute(r, true)])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
