import { minus, signed } from '../ui/dom.js';

/**
 * Multiplying and dividing positive and negative integers.
 *
 * Levels are ordered by the *idea*, not the size of the numbers. "Two
 * negatives make a positive" is the counter-intuitive one, so it gets a level
 * to itself rather than being mixed in from the start.
 */

const LEVELS = [
  {
    name: 'Sign Rules',
    blurb: 'One negative flips the answer negative.',
    // Knowing how a negative number behaves comes first.
    dependsOn: [{ skill: 'int-addsub', level: 1 }],
  },
  { name: 'Two Negatives', blurb: 'The odd one: two negatives make a positive.' },
  { name: 'Dividing',      blurb: 'Same sign rules, sharing instead of grouping.' },
  { name: 'Bigger Facts',  blurb: 'Both operations, both signs, further up the tables.' },
  {
    name: 'Chains',
    blurb: 'Three at a time — count the negatives.',
    trial: { duration: 180 },
    // Evaluating three terms left to right is the same habit either way.
    dependsOn: [{ skill: 'int-addsub', level: 4 }],
  },
  { name: 'All Together',  blurb: 'Everything mixed, with no warning which is coming. '
    + 'Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;

const PAR_SECONDS = [10, 11, 13, 13, 21, 15];

const sym = (n) => (n < 0 ? '−' : '+');

/** The picture: sign and size, each answered separately. */
const model = (values, ops, answer) => ({
  kind: 'signmodel',
  terms: values.map((v) => ({ sign: sym(v), abs: Math.abs(v) })),
  ops,
  answer,
});

/** a × b, or a ÷ b. Division is always exact -- built from the answer up. */
function twoTerm(rng, level) {
  let a, b, op, answer;

  switch (level) {
    case 0: {                                   // one negative, small tables
      const x = rng.int(2, 9);
      const y = rng.int(2, 9);
      [a, b] = rng.chance(0.5) ? [-x, y] : [x, -y];
      op = '×';
      break;
    }
    case 1: {                                   // both negative
      a = -rng.int(2, 9);
      b = -rng.int(2, 9);
      op = '×';
      break;
    }
    case 2: {                                   // exact division, mixed signs
      const quotient = rng.int(2, 9);
      const divisor = rng.int(2, 9);
      a = quotient * divisor;
      b = divisor;
      if (rng.chance(0.5)) a = -a;
      if (rng.chance(0.5)) b = -b;
      op = '÷';
      break;
    }
    default: {                                  // both operations, bigger
      op = rng.chance(0.5) ? '×' : '÷';
      if (op === '×') {
        a = rng.int(2, 12) * rng.sign();
        b = rng.int(2, 12) * rng.sign();
      } else {
        const quotient = rng.int(2, 12);
        const divisor = rng.int(2, 12);
        a = quotient * divisor * rng.sign();
        b = divisor * rng.sign();
      }
    }
  }

  answer = op === '×' ? a * b : a / b;

  return {
    prompt: `<span class="t1">${minus(a)}</span>`
      + `<span class="op">${op}</span>`
      + `<span class="t2">${signed(b)}</span>`
      + `<span class="op">=</span><span class="q">?</span>`,
    text: `${minus(a)} ${op} ${signed(b)}`,
    answer: { type: 'int', value: answer },
    parSeconds: PAR_SECONDS[level],
    visual: model([a, b], [op], answer),
    explain: explainTwo(a, b, op, answer),
  };
}

function explainTwo(a, b, op, answer) {
  const A = Math.abs(a);
  const B = Math.abs(b);
  const size = `${A} ${op} ${B} = ${Math.abs(answer)}`;
  const negatives = [a, b].filter((v) => v < 0).length;

  if (negatives === 2) {
    return `Two negatives make a positive, so the answer is positive. ${size}, `
      + `so ${minus(a)} ${op} ${signed(b)} = ${answer}.`;
  }
  if (negatives === 1) {
    return `One negative makes the answer negative. ${size}, `
      + `so ${minus(a)} ${op} ${signed(b)} = ${minus(answer)}.`;
  }
  return `Both are positive, so the answer is too. ${size}.`;
}

/** Three at a time: a × b × c, or (a × b) ÷ c with c chosen to divide exactly. */
function chain(rng) {
  const useDivision = rng.chance(0.35);
  const values = [];
  let ops;
  let answer;

  if (useDivision) {
    const a = rng.int(2, 9) * rng.sign();
    const b = rng.int(2, 9) * rng.sign();
    const product = a * b;
    // Pick a divisor that divides the product exactly.
    const options = [];
    for (let d = 2; d <= 12; d++) if (product % d === 0) options.push(d);
    const c = (options.length ? rng.pick(options) : 1) * rng.sign();
    values.push(a, b, c);
    ops = ['×', '÷'];
    answer = product / c;
  } else {
    values.push(rng.int(2, 6) * rng.sign(), rng.int(2, 6) * rng.sign(), rng.int(2, 6) * rng.sign());
    ops = ['×', '×'];
    answer = values[0] * values[1] * values[2];
  }

  const [a, b, c] = values;
  const negatives = values.filter((v) => v < 0).length;

  return {
    prompt: `<span class="t1">${minus(a)}</span>`
      + `<span class="op">${ops[0]}</span><span class="t2">${signed(b)}</span>`
      + `<span class="op">${ops[1]}</span><span class="t3">${signed(c)}</span>`
      + `<span class="op">=</span><span class="q">?</span>`,
    text: `${minus(a)} ${ops[0]} ${signed(b)} ${ops[1]} ${signed(c)}`,
    answer: { type: 'int', value: answer },
    parSeconds: PAR_SECONDS[4],
    visual: model(values, ops, answer),
    explain: `Count the negatives: ${negatives} of them, so the answer is `
      + `${negatives % 2 === 0 ? 'positive' : 'negative'}. `
      + `Ignoring signs, ${Math.abs(a)} ${ops[0]} ${Math.abs(b)} ${ops[1]} ${Math.abs(c)} `
      + `= ${Math.abs(answer)}, so the answer is ${minus(answer)}.`,
  };
}

export default {
  id: 'int-muldiv',
  name: 'Integer Multiply & Divide',
  category: 'integers',
  glyph: '×',
  blurb: 'Sign rules for times and divide.',
  // Soft: a nudge about what this builds on, not a gate.
  dependsOn: ['int-addsub'],
  answerInput: 'int',
  levels: LEVELS,

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
  generate(rng, level) {
    if (level >= LAST_LEVEL) {
      const from = rng.int(0, LAST_LEVEL - 1);
      const problem = from >= 4 ? chain(rng) : twoTerm(rng, from);
      problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
      return problem;
    }
    return level >= 4 ? chain(rng) : twoTerm(rng, level);
  },
};
