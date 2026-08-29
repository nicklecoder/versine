/**
 * Catalogue authoring tool: builds the problem library for coords.
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
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/coords.js';

const SPAN = 8;
const RANGE = { xRange: [-SPAN, SPAN], yRange: [-SPAN, SPAN], grid: 1 };
const QUADRANTS = ['I', 'II', 'III', 'IV'];

/**
 * Read one coordinate off a plotted point.
 *
 * Points are allowed to sit on an axis. A student who only ever meets points
 * floating in a quadrant is surprised by (5, 0), and "how far up is it" having
 * the answer zero is worth meeting early rather than in the middle of a graph.
 */
function read(rng, axis, negatives) {
  const lo = negatives ? -SPAN : 0;
  let x = rng.int(lo, SPAN);
  let y = rng.int(lo, SPAN);
  if (x === 0 && y === 0) { x = rng.int(1, SPAN); }
  const asked = axis === 'x' ? x : y;
  const word = axis === 'x' ? 'along' : 'up or down';
  return {
    prompt: [T.prose(`How far ${word} is this point?`)],
    text: `point (${x}, ${y}): ${axis}`,
    answer: { type: 'int', value: asked },
    // The point itself is the question, so it is drawn from the start. What
    // is withheld is the reading -- the dashed line to the axis and the label.
    visual: {
      kind: 'plane', ...RANGE,
      marks: [{ kind: 'point', at: [x, y], tone: 'var(--vec-1)' }],
      answer: [
        { kind: 'segment', from: axis === 'x' ? [x, 0] : [0, y], to: [x, y] },
        { kind: 'point', at: axis === 'x' ? [x, 0] : [0, y], label: String(asked) },
      ],
    },
    explain: `The point sits at (${x}, ${y}). Counting ${axis === 'x' ? 'across from' : 'up from'} `
      + `the origin gives ${asked}.`,
  };
}

/** Which quadrant does a pair land in? */
function quadrant(rng) {
  const x = rng.pick([-1, 1]) * rng.int(1, SPAN);
  const y = rng.pick([-1, 1]) * rng.int(1, SPAN);
  const q = x > 0 ? (y > 0 ? 'I' : 'IV') : (y > 0 ? 'II' : 'III');
  return {
    prompt: [T.prose(`Which quadrant holds (${x}, ${y})?`)],
    text: `quadrant of (${x}, ${y})`,
    answer: {
      type: 'choice',
      value: q,
      options: QUADRANTS.map((id) => ({
        id,
        label: `Quadrant ${id}`,
        note: { I: 'right and up', II: 'left and up', III: 'left and down', IV: 'right and down' }[id],
      })),
    },
    visual: {
      kind: 'plane', ...RANGE,
      marks: [],
      answer: [{ kind: 'point', at: [x, y], label: `(${x}, ${y})` }],
    },
    explain: `${x} is ${x > 0 ? 'positive' : 'negative'} so the point is to the `
      + `${x > 0 ? 'right' : 'left'}, and ${y} is ${y > 0 ? 'positive' : 'negative'} so it is `
      + `${y > 0 ? 'up' : 'down'}. That is quadrant ${q}.`,
  };
}

/** Two points sharing a row or column. */
function distance(rng) {
  const horizontal = rng.chance(0.5);
  const fixed = rng.int(-SPAN + 1, SPAN - 1);
  let a = rng.int(-SPAN, SPAN - 2);
  let b = rng.int(a + 2, SPAN);
  const from = horizontal ? [a, fixed] : [fixed, a];
  const to = horizontal ? [b, fixed] : [fixed, b];
  return {
    prompt: [T.prose(`How far apart are (${from[0]}, ${from[1]}) and (${to[0]}, ${to[1]})?`)],
    text: `distance (${from[0]},${from[1]}) to (${to[0]},${to[1]})`,
    answer: { type: 'int', value: b - a },
    visual: {
      kind: 'plane', ...RANGE,
      marks: [
        { kind: 'point', at: from, tone: 'var(--vec-1)' },
        { kind: 'point', at: to, tone: 'var(--vec-2)' },
      ],
      answer: [{ kind: 'segment', from, to, label: String(b - a) }],
    },
    explain: `They share the same ${horizontal ? 'row' : 'column'}, so only the `
      + `${horizontal ? 'first' : 'second'} number changes: ${b} − ${a} = ${b - a}.`,
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return read(rng, 'x', false);
      case 1: return read(rng, 'y', false);
      case 2: return read(rng, rng.chance(0.5) ? 'x' : 'y', true);
      case 3: return quadrant(rng);
      case 4: return distance(rng);
      default: return rng.pick([
        (r) => read(r, 'x', true), (r) => read(r, 'y', true), quadrant, distance,
      ])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
