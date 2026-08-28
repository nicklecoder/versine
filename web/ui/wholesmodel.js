import { drawSegments } from './segments.js';

/**
 * Wholes and what is left over — the picture for improper fractions and mixed
 * numbers.
 *
 * Each bar is one whole. The trick in both directions is to show the *setup*
 * without showing the count:
 *
 *  - going to a mixed number, the question is "how many wholes fit into
 *    these pieces?", so the ask draws one whole divided into its pieces and
 *    tells you how many you have, but does not lay them out.
 *
 *  - going the other way, the ask draws the whole bars **undivided**. You can
 *    see two wholes and a third, but to count thirds you have to know a whole
 *    is three of them, which is the arithmetic.
 *
 * Drawn on the 'plain' skin: these bars are about how many wholes there are,
 * so the divisions should not compete with the outline.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {object} WholesSpec
 * @property {'toMixed'|'toImproper'} direction
 * @property {Frac} improper
 * @property {number} whole
 * @property {number} rest
 * @property {number} d
 */

/**
 * @param {HTMLElement} container
 * @param {WholesSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawWholesModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { direction, improper, whole, rest, d } = spec;
  const plural = (n) => (n === 1 ? '' : 's');

  if (direction === 'toMixed') {
    if (!reveal) {
      return drawSegments(container, {
        skin: 'plain',
        rows: [{ label: `1/${d}`, bars: [{ total: d, filled: 1, tone: 'var(--vec-2)' }] }],
        note: `One piece is 1/${d}. You have ${improper.n} of them — `
          + 'how many whole bars does that make?',
      }, { verdict });
    }

    // Lay the pieces out a whole at a time and let the count be read off.
    const bars = Math.ceil(improper.n / d) || 1;
    const rows = [];
    let left = improper.n;
    for (let i = 0; i < bars; i++) {
      const filled = Math.min(left, d);
      left -= filled;
      const full = filled === d;
      rows.push({
        label: full ? '1 whole' : `${filled}/${d}`,
        bars: [{ total: d, filled, tone: full ? 'var(--vec-1)' : 'var(--result)' }],
      });
    }
    return drawSegments(container, {
      skin: 'plain',
      rows: [...rows, {
        answer: rest
          ? `${whole} whole${plural(whole)} and ${rest}/${d} left over`
          : `${whole} whole${plural(whole)}, nothing left over`,
        verdict: true,
      }],
    }, { verdict });
  }

  // toImproper: the wholes stay solid until the answer is in, so the count of
  // pieces inside them is something you work out rather than something you see.
  const restRow = { label: `${rest}/${d}`, bars: [{ total: d, filled: rest, tone: 'var(--vec-2)' }] };

  if (!reveal) {
    return drawSegments(container, {
      skin: 'plain',
      rows: [
        {
          label: `${whole} whole${plural(whole)}`,
          bars: Array.from({ length: whole }, () => ({ solid: true, tone: 'var(--vec-1)' })),
        },
        restRow,
      ],
      note: `Each whole is ${d}/${d}. How many ${d}ths altogether?`,
    }, { verdict });
  }

  drawSegments(container, {
    skin: 'plain',
    rows: [
      {
        label: `${whole} × ${d}/${d}`,
        bars: Array.from({ length: whole }, () => ({ total: d, filled: d, tone: 'var(--vec-1)' })),
      },
      restRow,
      { answer: `${whole} × ${d} + ${rest} = ${improper.n}, so ${improper.n}/${d}`, verdict: true },
    ],
  }, { verdict });
}
