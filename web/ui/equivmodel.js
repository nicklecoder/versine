import { drawSegments } from './segments.js';

/**
 * Equivalent fractions: the same length of bar, cut into different pieces.
 *
 * While the question is open only the fraction you were *given* is drawn. The
 * second bar would show the answer directly — you could count the shaded
 * pieces off it — so it arrives with the reveal, aligned underneath, where
 * seeing the two shadings end at exactly the same place is the whole point.
 *
 * `via` is for the case where neither bottom is a multiple of the other.
 * 4/6 = ?/9 cannot be captioned "× something top and bottom", because there
 * is no whole number to multiply by; the route runs down to lowest terms and
 * back up. Drawing that middle bar is the difference between a picture that
 * explains the detour and one that asserts a factor of 1.5.
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {{from:Frac, to:Frac, via?:Frac}} EquivSpec
 */

const row = (f, tone) => ({ label: f, bars: [{ total: f.d, filled: f.n, tone }] });

/** The caption between two bars, which is only ever a whole-number step. */
const step = (from, to) => (to.d > from.d
  ? `× ${to.d / from.d} top and bottom`
  : `÷ ${from.d / to.d} top and bottom`);

/**
 * @param {HTMLElement} container
 * @param {EquivSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawEquivModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { from, to, via } = spec;

  if (!reveal) {
    return drawSegments(container, {
      rows: [row(from, 'var(--vec-1)')],
      note: `${from.n} of ${from.d} equal pieces. The same amount can be cut a different way.`,
    }, { verdict });
  }

  const sep = (text) => ({ sep: text, tone: 'note', verdict: true });

  drawSegments(container, {
    rows: via
      ? [
        row(from, 'var(--vec-1)'),
        sep(step(from, via)),
        row(via, 'var(--vec-2)'),
        sep(step(via, to)),
        row(to, 'var(--result)'),
      ]
      : [
        row(from, 'var(--vec-1)'),
        sep(step(from, to)),
        row(to, 'var(--result)'),
      ],
    note: via
      ? 'Three cuts of the same length. No single whole number gets from the first to the last.'
      : 'Both shadings stop in the same place — same amount, different pieces.',
  }, { verdict });
}
