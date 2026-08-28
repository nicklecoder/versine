import { el, mount } from './dom.js';

/**
 * A length cut into segments, with some of them emphasised.
 *
 * This is one primitive wearing four names. Adding fractions, showing
 * equivalence, counting wholes out of an improper fraction, and counting how
 * many copies of a divisor fit into a dividend were four renderers with four
 * sets of class names, drawing the same thing: a stack of rows, each a label
 * beside a bar of cells, with separators between them and a caption below.
 * `.bar__cell` and `.equiv-cell` were byte-identical CSS rules.
 *
 * They were four because each was named after the situation that prompted it
 * rather than the shape it draws. Named after the geometry, it is one — and a
 * fifth situation now costs an adapter rather than a renderer.
 *
 * Three skins, because the drawing genuinely differs with density:
 *   'ruled'  bordered cells, the default; reads well up to ~20 segments
 *   'plain'  no borders, for whole bars where the divisions are the point
 *   'fine'   hairline dividers and blended fills, for the 40-segment bars
 *            where per-cell borders would be all you could see
 *
 * @typedef {{n:number, d:number}} Frac
 * @typedef {object} Bar
 * @property {number} total    how many segments the bar is cut into
 * @property {number} filled   how many are shaded, from the left
 * @property {string} [tone]   CSS colour for the shading
 * @property {number} [ghost]  segments after `filled` drawn as outlines --
 *                             what subtraction takes away
 * @property {number} [unit]   segments shaded as the comparison tile
 * @property {number} [copies] shade in alternating bands this many segments
 *                             wide, so copies can be counted at a glance
 * @property {boolean} [solid] draw as one undivided block: you can see a whole
 *                             without being told how many pieces it holds
 * @property {boolean} [slim]  drawn shorter, for a bar that is a reference
 *                             rather than a quantity
 *
 * @typedef {object} Row
 * @property {Frac|string} [label]  a fraction, or free text
 * @property {string} [tag]         a note beside the label
 * @property {Bar[]} [bars]         drawn side by side
 * @property {string} [sep]         a separator row instead: an operator, or
 *                                  an equals that may carry the verdict
 * @property {'note'} [tone]        a separator that explains rather than
 *                                  operates, set quieter and further in
 * @property {string} [value]       the result, picked out of an answer line
 * @property {string} [answer]      a concluding line, set in the result colour
 * @property {boolean} [verdict]    show the tick or cross on this row
 */

const fracLabel = (f) => [
  el('span.bar__num', {}, String(f.n)),
  el('span.bar__line'),
  el('span.bar__den', {}, String(f.d)),
];

function cells(bar) {
  const { total, filled = 0, ghost = 0, unit = 0, copies = 0, tone } = bar;
  const out = [];
  for (let i = 0; i < total; i++) {
    const classes = ['seg__cell'];
    if (i < filled) classes.push('is-filled');
    else if (i < filled + ghost) classes.push('is-ghost');
    if (i < unit) classes.push('is-unit');
    if (copies && i < filled) {
      classes.push(`copy-${Math.floor(i / copies) % 2}`);
      if (i % copies === 0 && i !== 0) classes.push('starts-copy');
    }
    out.push(el('div', { class: classes.join(' '), style: tone ? { '--tone': tone } : {} }));
  }
  return out;
}

function drawBar(bar) {
  if (bar.solid) {
    return el('div.seg__bar.is-solid', { style: bar.tone ? { '--tone': bar.tone } : {} });
  }
  return el(`div.seg__bar${bar.slim ? '.is-slim' : ''}`, { style: { '--segments': bar.total } }, cells(bar));
}

const tick = (verdict) => (verdict
  ? el('span', { class: `bar-verdict is-${verdict}` }, verdict === 'ok' ? '✓' : '✗')
  : null);

function drawRow(row, verdict) {
  if (row.sep !== undefined) {
    return el(`div.seg__sep${row.tone === 'note' ? '.is-note' : ''}`, {},
      el('span', {}, row.sep), row.verdict ? tick(verdict) : null);
  }
  if (row.answer !== undefined) {
    return el(`div.seg__answer${row.value !== undefined ? '.has-value' : ''}`, {},
      el('span', {}, row.answer),
      row.value !== undefined ? el('span.seg__value', {}, row.value) : null,
      row.verdict ? tick(verdict) : null);
  }
  const label = row.label === undefined ? null
    : el('div.seg__label', {},
        typeof row.label === 'string' ? row.label : fracLabel(row.label),
        row.tag ? el('span.seg__tag', {}, row.tag) : null);
  const bars = (row.bars ?? []).map(drawBar);
  return el('div.seg__row', {}, label,
    bars.length > 1 ? el('div.seg__stack', {}, bars) : bars[0] ?? null);
}

/**
 * @param {HTMLElement} container
 * @param {{rows: Row[], note?: string, skin?: 'ruled'|'plain'|'fine'}} model
 * @param {{verdict?: 'ok'|'bad'}} [opts]
 */
export function drawSegments(container, model, { verdict = null } = {}) {
  const { rows, note, skin = 'ruled' } = model;
  mount(container, el(`div.seg.seg--${skin}`, {},
    ...rows.map((r) => drawRow(r, verdict)),
    note ? el('p.bar-hint', {}, note) : null));
}
