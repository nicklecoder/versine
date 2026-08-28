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
import { frac, reduce, isSimplest, format, gcd } from '../../web/math/frac.js';
import { LEVELS, LAST_LEVEL, PAR_SECONDS } from '../../web/skills/frac-mixed.js';
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
    promptHtml: fracHtml(improper, 't1'),
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
    promptHtml: `<span class="t1 mixed-term">${whole}`
      + `<span class="frac-term"><span class="fn">${rest}</span>`
      + `<span class="fl"></span><span class="fd">${d}</span></span></span>`,
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
    promptHtml: fracHtml(improper, 't1'),
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
const fracHtml = (f, cls) =>
  `<span class="${cls} frac-term"><span class="fn">${f.n}</span>`
  + `<span class="fl"></span><span class="fd">${f.d}</span></span>`;
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
    prompt: `<span class="t1 situation">${fill(situation.text)}</span>`,
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
function build(rng, level, requireSimplest) {
  if (level === 5) return whichForm(rng);
  const make = level === 1 ? toImproper
    : level === 2 ? exactlyWhole
    : level === 0 ? (r) => toMixed(r, requireSimplest)
    : rng.chance(0.5) ? (r) => toMixed(r, requireSimplest) : toImproper;
  const p = make(rng);
  return {
    prompt: p.promptHtml + `<span class="op">=</span><span class="q">?</span>`,
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
  return build(rng, level, !!LEVELS[level].requireSimplest);
}
