import { drawSegments } from './segments.js';

/**
 * A ratio, drawn as one bar cut into all of its parts with the first share
 * shaded.
 *
 * One bar rather than two, and not for economy. Bars drawn together in a row
 * are stacked and each flexes to the full width, so three parts and five
 * parts would come out the same length -- a picture of a ratio that gets the
 * ratio wrong. Cutting a single bar into eight and shading three keeps the
 * proportions honest and puts both readings on the screen at once: 3 to 5
 * against the unshaded part, and 3 of 8 against the whole. That pair is the
 * confusion this skill exists to settle, so the picture should hold both
 * rather than quietly pick one.
 *
 * While the question is open only the ratio you were given is drawn. The
 * scaled bar arrives with the reveal, underneath it, where the two shadings
 * ending in the same place is the thing worth seeing.
 *
 * `via` is for the case where neither ratio is a whole number of times the
 * other. 6 : 8 = ? : 12 has no single multiplier, and the route runs down to
 * simplest form and back up; drawing that middle bar shows the detour rather
 * than asserting a factor that is not a whole number. It is the same middle
 * bar equivmodel draws for 4/6 = ?/9, deliberately -- the two pictures are
 * the same picture, and a student meeting the second should recognise it.
 *
 * @typedef {{a:number, b:number}} Parts
 * @typedef {{a:number, b:number, to?:Parts, via?:Parts, by?:string,
 *            note?:string}} RatioSpec
 */

/** "1 part", "3 parts" -- a unit ratio is common and reads badly pluralised. */
const parts = (k) => `${k} part${k === 1 ? '' : 's'}`;

const row = (a, b, tone) => ({ label: `${a} : ${b}`, bars: [{ total: a + b, filled: a, tone }] });

/**
 * Per-cell borders are all you can see once a bar is cut this fine.
 *
 * Chosen from the densest bar actually drawn, which means it can change when
 * the answer lands and the scaled bar appears. That is deliberate: the
 * alternative is to carry the final density in a field the renderer gets up
 * front, and since that number is the two parts added together, a student
 * could subtract the part they were given and read the answer off it.
 */
const skinFor = (total) => (total > 20 ? 'fine' : 'ruled');

/**
 * @param {HTMLElement} container
 * @param {RatioSpec} spec
 * @param {{reveal?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawRatioModel(container, spec, { reveal = false, verdict = null } = {}) {
  const { a, b, to, via, by, note } = spec;

  if (!reveal || !to) {
    return drawSegments(container, {
      rows: [row(a, b, 'var(--vec-1)')],
      skin: skinFor(a + b),
      note: note ?? `${parts(a)} to ${b}, so ${a + b} parts in all.`,
    }, { verdict });
  }

  const sep = (text) => ({ sep: text, tone: 'note', verdict: true });

  drawSegments(container, {
    rows: via
      ? [
        row(a, b, 'var(--vec-1)'),
        sep(`÷ ${(a + b) / (via.a + via.b)} on both parts`),
        row(via.a, via.b, 'var(--vec-2)'),
        sep(`× ${(to.a + to.b) / (via.a + via.b)} on both parts`),
        row(to.a, to.b, 'var(--result)'),
      ]
      : [
        row(a, b, 'var(--vec-1)'),
        sep(by ?? 'the same ratio, in bigger parts'),
        row(to.a, to.b, 'var(--result)'),
      ],
    skin: skinFor(Math.max(a + b, to.a + to.b)),
    note: via
      ? 'Three cuts of the same length. No single whole number gets from the first to the last.'
      : 'Both shadings stop in the same place — the same ratio, differently cut.',
  }, { verdict });
}
