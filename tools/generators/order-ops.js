/**
 * Catalogue authoring tool: builds the problem library for order-ops.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding -- when a
 * systematic fault affects too many rows to correct by hand, or when a level
 * is redesigned. Individual bad problems are fixed in the library directly.
 *
 * Run via: node scripts/build-library.mjs
 */
import { evaluate, render } from '../../web/math/expression.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/order-ops.js';
const OPS = ['+', '−'];
const MULOPS = ['×', '÷'];
/** Build a candidate expression for a level. Correctness is checked after. */
function shape(rng, level) {
  const n = (lo, hi) => rng.int(lo, hi);
  switch (level) {
    case 0:
      return rng.chance(0.5)
        ? [n(2, 12), rng.pick(OPS), n(2, 9), '×', n(2, 9)]
        : [n(2, 9), '×', n(2, 9), rng.pick(OPS), n(2, 12)];
    case 1: {
      // Build the dividend from the divisor, or the division is almost never
      // exact and every attempt falls through to the subtraction shape.
      const divisor = n(2, 6);
      return rng.chance(0.5)
        ? [divisor * n(2, 12), '÷', divisor, '×', n(2, 5)]
        : [n(10, 30), '−', n(2, 9), rng.pick(OPS), n(2, 9)];
    }
    case 2:
      return rng.chance(0.5)
        ? [[n(2, 12), rng.pick(OPS), n(2, 9)], rng.pick(MULOPS), n(2, 6)]
        : [n(2, 9), '×', [n(3, 14), rng.pick(OPS), n(2, 9)]];
    case 3:
      return rng.chance(0.5)
        ? [n(2, 20), rng.pick(OPS), n(2, 5), '^', rng.pick([2, 3])]
        : [[n(2, 6), rng.pick(OPS), n(1, 4)], '^', 2, rng.pick(OPS), n(2, 15)];
    default:
      return rng.chance(0.5)
        ? [n(2, 6), '×', [n(2, 9), rng.pick(OPS), n(2, 6), '×', n(2, 5)]]
        : [[n(4, 18), '−', [n(2, 6), '×', n(2, 4)]], rng.pick(MULOPS), n(2, 4)];
  }
}
function build(rng, level) {
  let expression;
  let result;
  for (let i = 0; i < 60; i++) {
    expression = shape(rng, level);
    result = evaluate(expression);
    // Whole numbers only, at least two steps of work, nothing enormous.
    if (result.ok && result.lines.length >= 3 && Math.abs(result.value) <= 200) break;
  }
  const rules = [...new Set(result.rules)];
  return {
    prompt: `<span class="t1">${result.lines[0]}</span>`
      + '<span class="op">=</span><span class="q">?</span>',
    text: result.lines[0],
    answer: { type: 'int', value: result.value },
    parSeconds: PAR_SECONDS[level],
    visual: { kind: 'evalmodel', lines: result.lines, rules: result.rules },
    explain: `Work through it in order — ${rules.join(', then ')}. `
      + `${result.lines.join(', then ')}.`,
  };
}
/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */

  /** @param {import('../engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  if (level >= LAST_LEVEL) {
    const from = rng.int(0, LAST_LEVEL - 1);
    const problem = build(rng, from);
    problem.parSeconds = PAR_SECONDS[LAST_LEVEL];
    return problem;
  }
  return build(rng, level);
}
