/**
 * Catalogue authoring tool: builds the problem library for exponents.
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
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/exponents.js';

/**
 * Bases wide enough that a level is not memorisable, capped by the size of the
 * result rather than the size of the base: the difficulty here is the rule,
 * and 12² is not a harder rule than 2², only a slightly harder multiplication.
 */
const BASES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20];
const MAX_VALUE = 100000;

/** The exponents this base can take before the value stops being holdable. */
function exponentsFor(base, max = MAX_VALUE) {
  const out = [];
  for (let e = 2; base ** e <= max; e++) out.push(e);
  return out.length ? out : [2];
}

/** Superscript digits, so working lines read as they would be written. */
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
const sup = (n) => String(n).split('').map((c) => SUP[c] ?? c).join('');
const power = (b, e) => `${b}${sup(e)}`;

/** 2 × 2 × 2, so that a rule about exponents is visibly a rule about factors. */
const spelt = (b, e) => (e === 0 ? '1' : Array.from({ length: e }, () => b).join(' × '));

/**
 * What a power is, asked both ways.
 *
 * Reading a power and writing one are different skills, and the second is the
 * one that transfers: a student who can only go from 3⁴ to 81 has learned an
 * operation, while one who sees 3 × 3 × 3 × 3 and writes 3⁴ has learned a
 * notation. Asking both also doubles a level that is otherwise small, because
 * b to the e with a sane value cap does not have many members.
 */
function value(rng) {
  const b = rng.pick(BASES);
  const e = rng.pick(exponentsFor(b, 10000));
  const v = b ** e;

  if (rng.chance(0.45)) {
    // Backwards: given the factors, write the power.
    return {
      prompt: [T.num(spelt(b, e), 1), T.op('='), T.pow(b, null, 2)],
      text: `${spelt(b, e)} = ${b}^?`,
      answer: { type: 'int', value: e },
      visual: {
        kind: 'evalmodel',
        lines: [spelt(b, e), `${b} used ${e} times`, power(b, e)],
        rules: ['count the factors', 'write it as a power'],
        hint: 'How many times does the base appear?',
      },
      explain: `${b} appears ${e} times, so this is ${power(b, e)}.`,
    };
  }

  return {
    prompt: T.asks(T.pow(b, e, 1)),
    text: `${b}^${e}`,
    answer: { type: 'int', value: v },
    visual: {
      kind: 'evalmodel',
      lines: [power(b, e), spelt(b, e), String(v)],
      rules: [`${b} multiplied by itself ${e} times`, 'work it out'],
      hint: 'How many times is the base multiplied by itself?',
    },
    explain: `${power(b, e)} means ${spelt(b, e)}. That comes to ${v}.`,
  };
}

/** The three rules that combine two powers of the same base. */
function rule(rng, which) {
  const b = rng.pick(BASES);
  let a, c, answer, lines, rules, prompt, text, why;

  if (which === 'multiply') {
    a = rng.int(2, 6); c = rng.int(2, 6);
    answer = a + c;
    prompt = [T.pow(b, a, 1), T.op('×'), T.pow(b, c, 2), T.op('='), T.pow(b, null, 3)];
    text = `${b}^${a} × ${b}^${c} = ${b}^?`;
    lines = [`${power(b, a)} × ${power(b, c)}`,
             `(${spelt(b, a)}) × (${spelt(b, c)})`,
             power(b, answer)];
    rules = ['write out the factors', `count them: ${a} + ${c} = ${answer}`];
    why = `Multiplying puts all the factors in one pile: ${a} of them and ${c} more `
      + `makes ${answer}. So the exponents add, giving ${power(b, answer)}.`;
  } else if (which === 'divide') {
    c = rng.int(2, 5); answer = rng.int(1, 5); a = c + answer;
    prompt = [T.pow(b, a, 1), T.op('÷'), T.pow(b, c, 2), T.op('='), T.pow(b, null, 3)];
    text = `${b}^${a} ÷ ${b}^${c} = ${b}^?`;
    lines = [`${power(b, a)} ÷ ${power(b, c)}`,
             `(${spelt(b, a)}) ÷ (${spelt(b, c)})`,
             `${c} pairs cancel`,
             power(b, answer)];
    rules = ['write out the factors', `each factor below cancels one above`,
             `${a} − ${c} = ${answer} left`];
    why = `Every factor underneath cancels one above it. ${c} cancel, leaving `
      + `${a} − ${c} = ${answer}. So the exponents subtract, giving ${power(b, answer)}.`;
  } else {
    a = rng.int(2, 5); c = rng.int(2, 4);
    answer = a * c;
    prompt = [T.num('(', 1), T.pow(b, a, 1), T.num(')', 1), T.pow('', c, 2),
              T.op('='), T.pow(b, null, 3)];
    text = `(${b}^${a})^${c} = ${b}^?`;
    lines = [`(${power(b, a)})${sup(c)}`,
             Array.from({ length: c }, () => power(b, a)).join(' × '),
             power(b, answer)];
    rules = [`${power(b, a)} multiplied by itself ${c} times`,
             `${c} lots of ${a} factors: ${a} × ${c} = ${answer}`];
    why = `Raising to the ${c}th means ${c} copies of ${power(b, a)}, and each copy `
      + `brings ${a} factors. ${a} × ${c} = ${answer}, so the exponents multiply.`;
  }

  return {
    prompt, text,
    answer: { type: 'int', value: answer },
    visual: { kind: 'evalmodel', lines, rules, hint: 'Same base — so what happens to the exponents?' },
    explain: why,
  };
}

/** Zero and negative exponents, which fall out of the dividing rule. */
function zeroOrNegative(rng) {
  const b = rng.pick(BASES);
  if (rng.chance(0.35)) {
    return {
      prompt: T.asks(T.pow(b, 0, 1)),
      text: `${b}^0`,
      answer: { type: 'int', value: 1 },
      visual: {
        kind: 'evalmodel',
        lines: [power(b, 0), `${power(b, 3)} ÷ ${power(b, 3)}`, `${b ** 3} ÷ ${b ** 3}`, '1'],
        rules: ['anything divided by itself', 'which is', 'so any base to the zero is 1'],
        hint: 'What would you divide to get an exponent of zero?',
      },
      explain: `${power(b, 3)} ÷ ${power(b, 3)} is ${b ** 3} ÷ ${b ** 3} = 1, and by the `
        + `dividing rule it is also ${power(b, 0)}. So ${power(b, 0)} = 1.`,
    };
  }
  const e = rng.pick([1, ...exponentsFor(b, 4000)]);
  const denom = b ** e;
  return {
    prompt: T.asks(T.pow(b, `−${e}`, 1)),
    text: `${b}^-${e}`,
    answer: { type: 'frac', value: { n: 1, d: denom }, requireSimplest: true },
    visual: {
      kind: 'evalmodel',
      lines: [power(b, `−${e}`), `1 ÷ ${power(b, e)}`, `1/${denom}`],
      rules: ['a negative exponent is one over the positive one', 'work out the bottom'],
      hint: 'What does a negative exponent do?',
    },
    explain: `A negative exponent means one over the positive one: ${power(b, `−${e}`)} `
      + `is 1 ÷ ${power(b, e)} = 1/${denom}.`,
  };
}

/**
 * The strategic layer: a power is sometimes the answer and sometimes the
 * obstacle. Multiplying and dividing want it left alone -- the rules only work
 * on powers -- while comparing, or adding to something, needs the value.
 */
const SITUATIONS = [
  { text: 'You need to multiply {p} by {q}.', want: 'keep',
    why: 'The exponent rules only work on powers. Multiply them out first and you have thrown the rule away.' },
  { text: 'You need to divide {p} by {q}.', want: 'keep',
    why: 'Dividing powers of the same base is a rule about exponents. It needs them still written as powers.' },
  { text: 'You need to simplify {p} × {q} × {p}.', want: 'keep',
    why: 'Three powers of the same base collapse into one by adding exponents — but only while they are powers.' },
  { text: 'You need to add 5 to {p}.', want: 'work out',
    why: 'There is no rule for adding a power to a number. It has to become a value first.' },
  { text: 'You need to say whether {p} is bigger than 100.', want: 'work out',
    why: 'Comparing sizes needs a number. The exponent alone will not tell you.' },
  { text: 'You need to write {p} as the final answer to a counting problem.', want: 'work out',
    why: 'A count is a number. Nobody reports having {p} things.' },
];

function whichForm(rng) {
  const b = rng.pick([2, 3, 4, 5]);
  const p = power(b, rng.int(2, 4));
  const q = power(b, rng.int(2, 4));
  const situation = rng.pick(SITUATIONS);
  const fill = (t) => t.replace(/\{p\}/g, p).replace(/\{q\}/g, q);
  return {
    prompt: [T.prose(fill(situation.text))],
    text: fill(situation.text),
    answer: {
      type: 'choice',
      value: situation.want,
      options: rng.shuffle([
        { id: 'keep', label: 'Leave it as a power', note: 'so the exponent rules still apply' },
        { id: 'work out', label: 'Work out the value', note: 'so it can be counted or compared' },
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
      case 0: return value(rng);
      case 1: return rule(rng, 'multiply');
      case 2: return rule(rng, 'divide');
      case 3: return rule(rng, 'power');
      case 4: return zeroOrNegative(rng);
      case 5: return whichForm(rng);
      default: return rng.pick([value, (r) => rule(r, 'multiply'), (r) => rule(r, 'divide'),
                                (r) => rule(r, 'power'), zeroOrNegative])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 2) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
