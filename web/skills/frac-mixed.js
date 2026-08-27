import { frac, reduce, isSimplest, format, gcd } from '../math/frac.js';

/**
 * Improper fractions and mixed numbers.
 *
 * Two directions, and they are genuinely different operations: going to a
 * mixed number is division with a remainder, going back is multiply-and-add.
 * Each gets its own level rather than being mixed from the start.
 *
 * The third level exists because of a specific stumble: an improper fraction
 * that comes out exactly whole. Students who have learned "there is always a
 * bit left over" write `2 0/4`, so it is worth meeting on its own.
 */

const LEVELS = [
  { name: 'Into Wholes', blurb: 'Top-heavy fractions become a whole and a bit.' },
  { name: 'Back Again', blurb: 'A whole and a bit becomes a top-heavy fraction.' },
  { name: 'Exactly Whole', blurb: 'Sometimes nothing is left over at all.' },
  { name: 'Both Ways', blurb: 'Either direction, without warning which.' },
  {
    name: 'Simplify Too',
    blurb: 'Convert, then put the leftover in lowest terms. Expected from here on.',
    requireSimplest: true,
  },
  {
    name: 'Which Form?',
    kind: 'strategy',
    blurb: 'Knowing how to convert is half of it. Knowing when to is the rest.',
    // Sits here, immediately after both conversions and after multiplying and
    // dividing fractions, because that is the first point where the choice can
    // actually cost you something. Earlier would mean teaching the strategy
    // before the situation that needs it exists.
    dependsOn: [{ skill: 'frac-muldiv', level: 0 }],
  },
  {
    name: 'All Together',
    blurb: 'Everything mixed, in simplest form. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
const PAR_SECONDS = [14, 14, 12, 16, 20, 16, 18];

/** A denominator worth drawing: small enough that the bars stay readable. */
const denominator = (rng, composite = false) =>
  rng.pick(composite ? [4, 6, 8, 10, 12] : [2, 3, 4, 5, 6, 8, 10, 12]);

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
  const whole = rng.int(1, 4);
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
  const whole = rng.int(1, 4);
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
  const whole = rng.int(2, 5);
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
  const whole = rng.int(2, 4);
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

export default {
  id: 'frac-mixed',
  name: 'Improper & Mixed Numbers',
  category: 'fractions',
  glyph: '1½',
  blurb: 'Top-heavy fractions and the wholes hiding in them.',
  answerInput: 'mixed',
  dependsOn: ['frac-addsub', 'frac-muldiv'],
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
