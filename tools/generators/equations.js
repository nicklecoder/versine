/**
 * Catalogue authoring tool: builds the problem library for equations.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { previewOf } from '../../web/ui/express.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/equations.js';

const VARS = ['x', 'y', 'n', 'a', 't'];

/**
 * The equation is drawn by the renderer the student's own typing goes through,
 * with the answer after it as its own blank.
 *
 * Each side is parsed separately, because the parser reads expressions and an
 * equation is two of them joined by a relation. That is the right boundary
 * rather than a gap: `expr` answers are expressions, the committed syntax has
 * no `=`, and a parser that quietly accepted relations would let a level ask
 * for one without anything having decided that it should.
 *
 * A question that will not parse cannot be published: the build throws on it
 * here rather than a student meeting it.
 */
function ask(src, v) {
  const [lhs, rhs] = src.split(' = ');
  const L = previewOf(lhs);
  const R = previewOf(rhs);
  if (!L.ok) throw new Error(`equations: cannot draw "${lhs}" — ${L.error}`);
  if (!R.ok) throw new Error(`equations: cannot draw "${rhs}" — ${R.error}`);
  return [...L.terms, T.op('='), ...R.terms,
          T.op(','), T.letter(v), T.op('='), T.blank()];
}

/** x + 7 = 12, or x − 4 = 9. */
function undoAdd(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(1, 20);
  const b = rng.int(1, 20);
  const plus = rng.chance(0.6);
  const rhs = plus ? x + b : x - b;
  const src = `${v} ${plus ? '+' : '-'} ${b} = ${rhs}`;
  const move = plus ? `subtract ${b} from both sides` : `add ${b} to both sides`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} = ${rhs} ${plus ? '−' : '+'} ${b}`, `${v} = ${x}`],
      rules: [move, 'which leaves'],
      hint: 'What has been done to the letter?',
    },
    explain: `${b} was ${plus ? 'added to' : 'taken from'} ${v}, so ${move}: `
      + `${rhs} ${plus ? '−' : '+'} ${b} = ${x}.`,
  };
}

/**
 * 4x = 20, or x/3 = 4.
 *
 * Built from the solution outwards rather than from the equation inwards. An
 * earlier version picked a number, used it as the right-hand side of the
 * division case, and then reported it as the solution -- so x/3 = 4 claimed
 * x = 4. Naming the solution once and deriving both sides from it removes the
 * place that mistake could live.
 */
function undoMultiply(rng) {
  const v = rng.pick(VARS);
  const k = rng.int(2, 12);
  const divide = rng.chance(0.35);
  const other = rng.int(2, 15);          // the number on the right-hand side
  const solution = divide ? other * k : other;
  const src = divide ? `${v}/${k} = ${other}` : `${k}${v} = ${k * other}`;
  const move = divide ? `multiply both sides by ${k}` : `divide both sides by ${k}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: solution },
    visual: {
      kind: 'evalmodel',
      lines: [src,
              divide ? `${v} = ${other} × ${k}` : `${v} = ${k * other} ÷ ${k}`,
              `${v} = ${solution}`],
      rules: [move, 'which leaves'],
      hint: 'Was the letter multiplied or divided?',
    },
    explain: divide
      ? `${v} was divided by ${k}, so ${move}: ${other} × ${k} = ${solution}.`
      : `${v} was multiplied by ${k}, so ${move}: ${k * other} ÷ ${k} = ${solution}.`,
  };
}

/**
 * 3x + 4 = 19.
 *
 * Solutions stay positive here, and not for gentleness. The widget follows the
 * answer's type and a level that can go negative gets the full keyboard rather
 * than the numeric pad, so mixing the two would swap a student's keyboard
 * partway through a timed run. Negative solutions get their own level in the
 * follow-on skill, where the whole level allows them.
 */
function twoSteps(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(1, 12);
  const k = rng.int(2, 9);
  const b = rng.int(1, 20);
  if (x === 0) return twoSteps(rng);
  const rhs = k * x + b;
  const src = b >= 0 ? `${k}${v} + ${b} = ${rhs}` : `${k}${v} - ${-b} = ${rhs}`;
  const undo = b >= 0 ? `subtract ${b} from both sides` : `add ${-b} to both sides`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${k}${v} = ${rhs - b}`, `${v} = ${x}`],
      rules: [undo, `divide both sides by ${k}`],
      hint: 'Which was done to the letter last?',
    },
    explain: `${v} was multiplied by ${k} first and ${b} added after, `
      + 'so undo them the other way round: '
      + `${undo} to get ${k}${v} = ${rhs - b}, then divide by ${k} to get ${v} = ${x}.`,
  };
}

/** A minus in front of the letter, which is the case people get wrong. */
function negatives(rng) {
  const v = rng.pick(VARS);
  const x = rng.int(1, 14);
  if (rng.chance(0.5)) {
    // 12 − x = 5
    const a = x + rng.int(1, 15);
    const src = `${a} - ${v} = ${a - x}`;
    return {
      prompt: ask(src, v), text: src,
      answer: { type: 'int', value: x },
      visual: {
        kind: 'evalmodel',
        lines: [src, `${a} - ${a - x} = ${v}`, `${v} = ${x}`],
        rules: [`add ${v} to both sides and subtract ${a - x}`, 'which leaves'],
        hint: 'The letter is being taken away, not added.',
      },
      explain: `Here ${v} is being subtracted, so it moves across as a positive: `
        + `${a} − ${a - x} = ${x}.`,
    };
  }
  // −4x = 20
  const k = rng.int(2, 9);
  const src = `-${k}${v} = ${-k * x}`;
  return {
    prompt: ask(src, v), text: src,
    answer: { type: 'int', value: x },
    visual: {
      kind: 'evalmodel',
      lines: [src, `${v} = ${-k * x} ÷ (−${k})`, `${v} = ${x}`],
      rules: [`divide both sides by −${k}`, 'a negative divided by a negative'],
      hint: 'What is multiplying the letter, sign and all?',
    },
    explain: `${v} is multiplied by −${k}, so divide both sides by −${k}. `
      + `A negative divided by a negative is positive: ${v} = ${x}.`,
  };
}

/**
 * The strategic layer, and the contrast the whole skill turns on.
 *
 * 3x + 4 = 19 and 3(x + 4) = 19 look almost identical and want opposite first
 * moves. In the first the 4 is outside the multiplication, so it comes off
 * first; in the second the bracket makes the multiplication outermost, so the
 * division comes first. A student drilled only on "do the opposite" gets the
 * second one wrong every time.
 */
function whichFirst(rng) {
  const v = rng.pick(VARS);
  const k = rng.int(2, 9);
  const b = rng.int(1, 12);
  const bracketed = rng.chance(0.5);
  const x = rng.int(1, 10);
  const rhs = bracketed ? k * (x + b) : k * x + b;
  const src = bracketed ? `${k}(${v} + ${b}) = ${rhs}` : `${k}${v} + ${b} = ${rhs}`;
  return {
    prompt: [T.prose(`Solving ${src} — which move first?`)],
    text: `first move for ${src}`,
    answer: {
      type: 'choice',
      value: bracketed ? 'divide' : 'subtract',
      options: rng.shuffle([
        { id: 'subtract', label: `Subtract ${b} from both sides`, note: 'undo the addition first' },
        { id: 'divide', label: `Divide both sides by ${k}`, note: 'undo the multiplication first' },
      ]),
    },
    visual: null,
    explain: bracketed
      ? `The bracket makes the multiplication the outermost thing done to ${v}, `
        + `so it comes off first: dividing by ${k} gives ${v} + ${b} = ${rhs / k}. `
        + `Subtracting ${b} first would be wrong — it is inside the bracket.`
      : `Here ${b} was added after the multiplication, so it comes off first: `
        + `subtracting gives ${k}${v} = ${rhs - b}. Undo in the reverse of the order applied.`,
  };
}

/**
 * The four content levels, in order. The strategy level is its own thing and
 * the last level redraws from these four -- which is why there is no default
 * branch here: every level is either one of these, the strategy level, or a
 * mix of these. An earlier version had one, and it was unreachable.
 */
const CONTENT = [undoAdd, undoMultiply, twoSteps, negatives];

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const p = level === 4 ? whichFirst(rng)
    : level >= LAST_LEVEL ? rng.pick(CONTENT)(rng)
    : CONTENT[level](rng);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
