/**
 * Catalogue authoring tool: builds the problem library for equations-both.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. Run via: node scripts/build-library.mjs
 *
 * Every problem is built outwards from its solution rather than inwards from
 * its equation. Solving Equations had a level that did the reverse and 496
 * problems claimed the wrong answer -- the equation and the solution were
 * chosen independently and quietly disagreed.
 */
import * as T from '../terms.js';
import { previewOf } from '../../web/ui/express.js';
import { reduce } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/equations-both.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/** Each side parsed on its own: the parser reads expressions, not relations. */
function ask(src, v) {
  const [lhs, rhs] = src.split(' = ');
  const L = previewOf(lhs);
  const R = previewOf(rhs);
  if (!L.ok) throw new Error(`equations-both: cannot draw "${lhs}" — ${L.error}`);
  if (!R.ok) throw new Error(`equations-both: cannot draw "${rhs}" — ${R.error}`);
  return [...L.terms, T.op('='), ...R.terms, T.op(','), T.letter(v), T.op('='), T.blank()];
}

const term = (k, v) => (k === 1 ? v : k === -1 ? `-${v}` : `${k}${v}`);
const tail = (c) => (c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`);

/**
 * ax = bx + c, with a > b so the gathering leaves a positive coefficient.
 *
 * The solution may land either side of zero. By this skill a student has met
 * Answers Below Zero, and the point of having met it is that a negative
 * stops needing its own level and starts turning up wherever the numbers
 * happen to send it -- which is where it turns up in real work.
 */
function bothSides(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(2, 12) * rng.pick([1, 1, -1]);
  const b = rng.int(1, 6);
  const a = b + rng.int(1, 6);
  const c = (a - b) * x;
  const src = `${term(a, v)} = ${term(b, v)}${tail(c)}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${term(a, v)} - ${term(b, v)} = ${c}`, `${term(a - b, v)} = ${c}`, `${v} = ${x}`],
      rules: [`take ${term(b, v)} off both sides`, 'gather the letters', `divide both sides by ${a - b}`],
      hint: 'The letter is on both sides. What has to happen first?',
    },
    explain: `Both sides have ${v}s. Taking ${term(b, v)} off both leaves `
      + `${term(a - b, v)} = ${c}, so ${v} = ${x}.`,
  };
}

/** ax + p = bx + q. */
function gatherThenUndo(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(2, 12) * rng.pick([1, 1, -1]);
  const b = rng.int(1, 6);
  const a = b + rng.int(1, 6);
  const p = rng.int(1, 15);
  const q = (a - b) * x + p;
  const src = `${term(a, v)}${tail(p)} = ${term(b, v)}${tail(q)}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${term(a - b, v)}${tail(p)} = ${q}`, `${term(a - b, v)} = ${q - p}`, `${v} = ${x}`],
      rules: [`take ${term(b, v)} off both sides`, `take ${p} off both sides`,
              `divide both sides by ${a - b}`],
      hint: 'Two kinds of thing on both sides. Gather each in turn.',
    },
    explain: `Gather the letters: ${term(a, v)} − ${term(b, v)} = ${term(a - b, v)}. `
      + `Gather the numbers: ${q} − ${p} = ${q - p}. Then divide by ${a - b}.`,
  };
}

/** k(x + b) = c, solvable by dividing first or expanding first. */
function brackets(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(1, 12) * rng.pick([1, 1, -1]);
  const k = rng.int(2, 8);
  const b = rng.int(1, 12);
  const c = k * (x + b);
  const src = `${k}(${v} + ${b}) = ${c}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} + ${b} = ${c / k}`, `${v} = ${x}`],
      rules: [`divide both sides by ${k}`, `take ${b} off both sides`],
      hint: 'The bracket is one package. What is being done to all of it?',
    },
    explain: `Dividing both sides by ${k} undoes the bracket in one step: `
      + `${v} + ${b} = ${c / k}, so ${v} = ${x}. Expanding first also works — `
      + `${k}${v} + ${k * b} = ${c} — but it is more writing for the same answer.`,
  };
}

/** kx = c where the answer is a fraction, and that is fine -- either sign. */
function notWhole(rng) {
  const v = rng.pick(VARS);
  const k = rng.int(2, 12);
  let c = rng.int(2, 40);
  if (c % k === 0) c += 1;                    // insist it does not come out whole
  if (rng.chance(0.3)) c = -c;
  const value = reduce({ n: c, d: k });
  const src = `${term(k, v)} = ${c}`;
  const shown = `${value.n}/${value.d}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'frac', value, requireSimplest: true },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} = ${c}/${k}`,
              value.d === k ? `${v} = ${c}/${k}` : `${v} = ${shown}`],
      rules: [`divide both sides by ${k}`, 'in lowest terms'],
      hint: 'It will not divide evenly. That is allowed.',
    },
    explain: `${c} ÷ ${k} does not come out whole, and it does not need to: `
      + `${v} = ${shown} exactly. A fraction is an answer, not a mistake`
      + `${c < 0 ? ', and neither is a minus sign in front of one' : ''}.`,
  };
}

/**
 * The strategic layer: which side to gather the letters on.
 *
 * Collecting on the side that already has more of them leaves a positive
 * coefficient. Collecting on the other leaves a negative one, which is not
 * wrong but is where sign mistakes come from -- so the choice is a kindness a
 * student can do for themselves.
 */
function whichSide(rng) {
  const v = rng.pick(VARS);
  const b = rng.int(1, 6);
  const a = b + rng.int(1, 6);
  const bigLeft = rng.chance(0.5);
  const lhs = bigLeft ? term(a, v) : term(b, v);
  const rhs = bigLeft ? term(b, v) : term(a, v);
  const src = `${lhs} + ${rng.int(1, 9)} = ${rhs} + ${rng.int(1, 9)}`;
  return {
    prompt: [T.prose(`Solving ${src} — which side should the letters go?`)],
    text: `which side for ${src}`,
    answer: {
      type: 'choice',
      value: bigLeft ? 'left' : 'right',
      // The notes describe the two moves and nothing about this problem.
      // They used to say which side "leaves a positive number of xs", which
      // is the answer stated as fact on one of the two buttons: a student
      // could pick the level clean without ever looking at the equation.
      options: rng.shuffle([
        { id: 'left', label: 'Gather them on the left',
          note: `take the right-hand ${v}s across` },
        { id: 'right', label: 'Gather them on the right',
          note: `take the left-hand ${v}s across` },
      ]),
    },
    visual: null,
    explain: `There are more ${v}s on the ${bigLeft ? 'left' : 'right'}, so gathering `
      + `them there leaves ${term(a - b, v)} — a positive number of them. Gathering on `
      + `the other side gives −${a - b}${v}, which is not wrong but is where sign `
      + `mistakes come from.`,
  };
}

const CONTENT = [bothSides, gatherThenUndo, brackets, notWhole];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  // The last level redraws from the content levels, but not `notWhole`: its
  // answers are fractions, and mixing them in would swap the answer widget
  // between one and two boxes according to whether this problem's answer
  // happens to be whole -- which tells a student the answer before they solve.
  const p = level === 4 ? whichSide(rng)
    : level >= LAST_LEVEL ? rng.pick(CONTENT.slice(0, 3))(rng)
    : CONTENT[level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
