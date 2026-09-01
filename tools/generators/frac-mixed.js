/**
 * Catalogue authoring tool: builds the problem library for frac-mixed.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { frac, reduce, multiply, divide, combine, isSimplest, format, gcd, nths }
  from '../../web/math/frac.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-mixed.js';
import * as T from '../terms.js';
/** A denominator worth drawing: small enough that the bars stay readable. */
const denominator = (rng, composite = false) =>
  rng.pick(composite ? [4, 6, 8, 9, 10, 12, 14, 15, 16, 18, 20]
                     : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20]);
/**
 * A leftover that leaves the fraction as a book would print it — or, when the
 * level is about simplifying, one that deliberately does not.
 */
function leftover(rng, d, wantsReducible) {
  const options = [];
  for (let n = 1; n < d; n++) {
    const reducible = gcd(n, d) > 1;
    if (reducible === wantsReducible) options.push(n);
  }
  return options.length ? rng.pick(options) : 1;
}
/** improper → mixed */
function toMixed(rng, requireSimplest) {
  // On the simplify level the leftover must actually reduce, or there is
  // nothing to practise. Everywhere else the given fraction reads as printed.
  const d = denominator(rng, requireSimplest);
  const whole = rng.int(1, 9);
  const rest = leftover(rng, d, requireSimplest);
  const improper = frac(whole * d + rest, d);
  const answer = requireSimplest ? reduce(improper) : improper;
  return {
    given: improper,
    answer: { type: 'mixed', value: answer, requireSimplest },
    direction: 'toMixed',
    promptTerms: [T.frac(improper.n, improper.d, 1)],
    text: `${format(improper)} as a mixed number`,
    visual: {
      kind: 'wholesmodel', direction: 'toMixed',
      improper, whole, rest, d,
    },
    explain: `${d} goes into ${improper.n} ${whole} time${whole === 1 ? '' : 's'} `
      + `with ${rest} left over, so ${format(improper)} is ${whole} ${rest}/${d}.`
      + (requireSimplest && gcd(rest, d) > 1
        ? ` The leftover ${rest}/${d} simplifies to ${format(reduce(frac(rest, d)))}, `
          + `giving ${whole} ${format(reduce(frac(rest, d)))}.`
        : ''),
  };
}
/** mixed → improper */
function toImproper(rng) {
  const d = denominator(rng);
  const whole = rng.int(1, 9);
  const rest = leftover(rng, d, false);      // given mixed numbers read as printed
  const improper = frac(whole * d + rest, d);
  return {
    given: improper,
    answer: { type: 'frac', value: improper, requireSimplest: false },
    direction: 'toImproper',
    promptTerms: [T.mixed(whole, rest, d, 1)],
    text: `${whole} ${rest}/${d} as an improper fraction`,
    visual: {
      kind: 'wholesmodel', direction: 'toImproper',
      improper, whole, rest, d,
    },
    explain: `Each whole is ${d}/${d}, so ${whole} wholes are ${whole * d}/${d}. `
      + `Add the ${rest}/${d} already there: ${format(improper)}.`,
  };
}
/** improper that lands exactly on a whole number */
function exactlyWhole(rng) {
  const d = denominator(rng);
  const whole = rng.int(2, 9);
  const improper = frac(whole * d, d);
  return {
    given: improper,
    answer: { type: 'mixed', value: improper, requireSimplest: false },
    direction: 'toMixed',
    promptTerms: [T.frac(improper.n, improper.d, 1)],
    text: `${format(improper)} as a mixed number`,
    visual: {
      kind: 'wholesmodel', direction: 'toMixed',
      improper, whole, rest: 0, d,
    },
    explain: `${d} goes into ${improper.n} exactly ${whole} times with nothing `
      + `left over, so ${format(improper)} is just ${whole}.`,
  };
}
/**
 * The strategic layer: which form serves the job in front of you.
 *
 * Improper form is for *working* — multiplying and dividing need a single
 * fraction. Mixed form is for *reading* — nobody pictures 23/4 of a pizza.
 * Students drilled only on the conversions can do both and still have no idea
 * which to reach for, which is most of what "bad at fractions" means.
 *
 * The situations are written so that no surface feature gives it away: you
 * have to think about what is being done with the number.
 */
const SITUATIONS = [
  { text: 'You need to multiply {mixed} by 3.', want: 'improper',
    why: 'Multiplying wants a single fraction — you cannot multiply the whole and the part separately.' },
  { text: 'You need to divide {mixed} by 2.', want: 'improper',
    why: 'Dividing wants a single fraction, so it can be flipped and multiplied.' },
  { text: 'You need to work out {mixed} × {mixed2}.', want: 'improper',
    why: 'Two mixed numbers multiplied together must both become single fractions first.' },
  { text: 'You are telling someone how much juice is left in the jug.', want: 'mixed',
    why: 'A mixed number is the one a person can picture. Nobody imagines {improper} of a jug.' },
  { text: 'You want to know roughly how big {improper} is, at a glance.', want: 'mixed',
    why: 'The whole number tells you the size immediately; {improper} makes you stop and work it out.' },
  { text: 'You need to say whether {improper} is more than 3.', want: 'mixed',
    why: 'Once it is written as a whole and a bit, the comparison is immediate.' },
  { text: 'You need to write {mixed} as the answer to a word problem about lengths.', want: 'mixed',
    why: 'A measurement is reported the way a person would read it.' },
];
/** Which form suits the job? */
function whichForm(rng) {
  const d = denominator(rng);
  const whole = rng.int(2, 8);
  const rest = leftover(rng, d, false);
  const improper = frac(whole * d + rest, d);
  const mixedText = `${whole} ${rest}/${d}`;
  const improperText = format(improper);
  const situation = rng.pick(SITUATIONS);
  const fill = (t) => t
    .replace(/\{mixed2\}/g, `1 1/${d}`)
    .replace(/\{mixed\}/g, mixedText)
    .replace(/\{improper\}/g, improperText);
  return {
    prompt: [T.prose(fill(situation.text))],
    text: fill(situation.text),
    answer: {
      type: 'choice',
      value: situation.want,
      options: rng.shuffle([
        { id: 'improper', label: `Convert to ${improperText}`,
          note: 'a single top-heavy fraction' },
        { id: 'mixed', label: `Convert to ${mixedText}`,
          note: 'a whole number and a fraction' },
      ]),
    },
    parSeconds: PAR_SECONDS[5],
    visual: null,
    explain: fill(situation.why),
  };
}
/**
 * One side of a mixed-number calculation, in whichever form it is written.
 *
 * Four forms, because all four turn up and a student who has only ever seen
 * one of them meets the others as new topics. `2 1/2` is the skill's subject;
 * `5/2` is the same number top-heavy, which is what the conversions were for;
 * `3` is a whole, and `3 − 1/4` is the borrowing case that mixed-number
 * subtraction is famous for; `1/4` is an ordinary proper fraction, which is
 * what makes the whole-number case a question at all.
 *
 * Each carries its own drawn term and its own text, because the *value* is
 * the same in every form and only the writing differs — which is the one
 * sentence this skill exists to install.
 */
function operand(rng, form, slot) {
  if (form === 'whole') {
    const k = rng.int(2, 9);
    return { form, value: frac(k, 1), term: T.num(k, slot), text: String(k) };
  }
  const d = denominator(rng);
  const n = leftover(rng, d, false);
  if (form === 'proper') {
    return { form, value: frac(n, d), term: T.frac(n, d, slot), text: `${n}/${d}` };
  }
  const w = rng.int(1, 5);
  const value = frac(w * d + n, d);
  return form === 'improper'
    ? { form, value, term: T.frac(value.n, value.d, slot), text: `${value.n}/${value.d}` }
    : { form, value, term: T.mixed(w, n, d, slot), text: `${w} ${n}/${d}` };
}

/** Always written over its denominator, so "3" shows as the 3/1 it becomes. */
const topHeavy = (f) => `${f.n}/${f.d}`;

/**
 * How the answer is written: a whole, a whole and a bit, or -- when the
 * result came out under one -- just the bit. Mirrors the mixed answer type's
 * own formatting, so the explain and the accepted answer agree; an earlier
 * version wrote "0 13/46", which is not how anyone writes it and is not what
 * the student would have typed.
 */
const asMixed = (f) => {
  const w = Math.floor(f.n / f.d);
  const rest = f.n - w * f.d;
  if (!rest) return String(w);
  return w ? `${w} ${rest}/${f.d}` : `${rest}/${f.d}`;
};

const FORMS = ['mixed', 'mixed', 'improper', 'proper', 'whole'];

/**
 * Arithmetic on mixed numbers, which nothing in the catalogue asked for.
 *
 * The skill taught both conversions and then had a strategy level asking
 * which form to use before dividing 2 1/2 by 2 -- a judgement about an
 * operation the student had never once performed and never would. That is
 * the same shape of hole as a level arbitrating between expanding and
 * factorising when only expanding was ever drilled: the judgement is real,
 * and it was being made about nothing.
 *
 * It is also, plainly, the form these numbers turn up in. A recipe says 2 1/2
 * cups and a plank is 6 3/4 feet; nobody outside a worksheet says 5/2.
 *
 * All four operations, because the strategy level after this one arbitrates
 * between the two that need converting and the two that do not, and needs
 * each to have been met. The working goes through the top-heavy form on the
 * way, which is the other thing this level is for: the middle of the
 * calculation is improper even when neither end is.
 */
function mixedArithmetic(rng) {
  const op = rng.pick(['+', '−', '×', '÷']);
  const times = op === '×' || op === '÷';
  const a = operand(rng, rng.pick(FORMS), 1);
  const b = operand(rng, rng.pick(FORMS), 2);
  // Two whole numbers is integer arithmetic, and two proper fractions is the
  // fraction skills. At least one side has to be a whole and a bit, or the
  // level is not about anything it names.
  const atLeastOne = (f) => f.form === 'mixed' || f.form === 'improper' || f.form === 'whole';
  if (a.form === 'whole' && b.form === 'whole') return mixedArithmetic(rng);
  if (!atLeastOne(a) && !atLeastOne(b)) return mixedArithmetic(rng);

  // Subtraction stays above zero: this skill's answer type is a mixed number
  // and a mixed number has no way to write a minus. Signed fractions are a
  // skill of their own, where the answer is a plain fraction and can.
  //
  // Compared by cross-multiplication, not by numerator. Comparing the tops
  // across different denominators made 1 16/18 come out "bigger" than 5 1/4,
  // and the build refused the negative answer that followed -- which is the
  // round-trip check doing exactly the job it exists for.
  const bigger = a.value.n * b.value.d >= b.value.n * a.value.d;
  const [x, y] = op === '−' && !bigger ? [b, a] : [a, b];
  const work = times ? null : combine(x.value, y.value, op === '−' ? '-' : '+');
  const raw = op === '×' ? multiply(x.value, y.value)
    : op === '÷' ? divide(x.value, y.value)
    : work.result;
  const value = reduce(raw);
  if (value.n === 0) return mixedArithmetic(rng);
  if (value.n > 400 || value.d > 60) return mixedArithmetic(rng);

  const asked = `${x.text} ${op} ${y.text}`;
  const improperLine = `${topHeavy(x.value)} ${op} ${topHeavy(y.value)}`;
  const whole = value.d === 1;
  // Converting back is the last step, and there is nothing to convert when
  // the answer came out whole -- so that line does not claim there was.
  const lines = times
    ? [asked, improperLine, topHeavy(raw), asMixed(value)]
    : [asked, improperLine, `${topHeavy(work.left)} ${op} ${topHeavy(work.right)}`,
       topHeavy(raw), asMixed(value)];
  const rules = times
    ? ['each one over a denominator', 'then it is ordinary fraction arithmetic',
       whole ? 'and it comes out whole' : 'and back to a whole and a bit']
    : ['each one over a denominator', `over ${nths(work.common)}, so the pieces match`,
       'work it out', whole ? 'and it comes out whole' : 'and back to a whole and a bit'];

  // Whichever sides were not already top-heavy are the ones worth naming.
  const converted = [x, y].filter((f) => f.form !== 'improper' && f.form !== 'proper');
  return {
    promptTerms: [x.term, T.op(op), y.term],
    text: asked,
    answer: { type: 'mixed', value, requireSimplest: true },
    visual: {
      kind: 'evalmodel', lines, rules,
      hint: 'What has to happen before these can be combined?',
    },
    explain: (converted.length
      ? converted.map((f) => `${f.text} is ${topHeavy(f.value)}`).join(' and ') + '. '
      : '')
      + (times
        ? `${improperLine} = ${topHeavy(raw)}`
        : `Over ${nths(work.common)} that is ${topHeavy(work.left)} ${op} `
          + `${topHeavy(work.right)} = ${topHeavy(raw)}`)
      + `, which is ${asMixed(value)}. `
      + (times
        ? 'Multiplying and dividing need the top-heavy form — there is no way to '
          + 'multiply the wholes and the parts separately and get the right answer.'
        : 'Adding and subtracting could be done by keeping the wholes apart, but the '
          + 'top-heavy form never needs a borrow, which is why it is the safer habit.')
      // Dividing by something under one makes the answer bigger, which looks
      // like a mistake until it is named. It is the same fact frac-muldiv's
      // "how many fit" level is built on, and it is worth saying again the
      // first time it turns up with a whole number in front of it.
      + (op === '÷' && y.value.n < y.value.d
        ? ` Dividing by something less than one makes the answer bigger: there are `
          + `${asMixed(value)} lots of ${y.text} in ${x.text}.`
        : ''),
  };
}

function build(rng, level, requireSimplest) {
  if (level === 5) {
    const p = mixedArithmetic(rng);
    return {
      prompt: T.asks(...p.promptTerms),
      text: p.text,
      answer: p.answer,
      visual: p.visual,
      explain: p.explain,
    };
  }
  if (level === 6) return whichForm(rng);
  const make = level === 1 ? toImproper
    : level === 2 ? exactlyWhole
    : level === 0 ? (r) => toMixed(r, requireSimplest)
    : rng.chance(0.5) ? (r) => toMixed(r, requireSimplest) : toImproper;
  const p = make(rng);
  return {
    prompt: T.asks(...p.promptTerms),
    text: p.text,
    answer: p.answer,
    parSeconds: PAR_SECONDS[level],
    visual: p.visual,
    explain: p.explain,
  };
}
/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  if (level >= LAST_LEVEL) {
    const from = rng.int(0, LAST_LEVEL - 1);
    const problem = build(rng, from, true);
    problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
    return problem;
  }
  const problem = build(rng, level, !!LEVELS[level].requireSimplest);
  problem.parSeconds = PAR_SECONDS[level];
  return problem;
}
