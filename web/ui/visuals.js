import { drawNumberLine } from './numberline.js';
import { drawSignModel } from './signmodel.js';
import { drawBarModel } from './barmodel.js';
import { drawAreaModel } from './areamodel.js';
import { drawFitsModel } from './fitsmodel.js';
import { drawWholesModel } from './wholesmodel.js';
import { drawEquivModel } from './equivmodel.js';
import { drawEvalModel } from './evalmodel.js';

/**
 * Visual registry. A skill names the kind of picture its problems want; the
 * play screen doesn't need to know what kinds exist. Adding a bar model for
 * fractions means adding one entry here.
 */
const RENDERERS = {
  /** The number line owns an <svg> inside the container. */
  numberline(container, spec, opts) {
    let svg = container.querySelector('svg.nl');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'nl');
      container.replaceChildren(svg);
    }
    drawNumberLine(svg, spec, opts);
  },

  barmodel(container, spec, opts) {
    drawBarModel(container, spec, { reveal: opts.showAnswer, verdict: opts.verdict });
  },

  areamodel(container, spec, opts) {
    drawAreaModel(container, spec, { reveal: opts.showAnswer, verdict: opts.verdict });
  },

  fitsmodel(container, spec, opts) {
    drawFitsModel(container, spec, { reveal: opts.showAnswer, verdict: opts.verdict });
  },

  wholesmodel(container, spec, opts) {
    drawWholesModel(container, spec, { reveal: opts.showAnswer, verdict: opts.verdict });
  },

  equivmodel(container, spec, opts) {
    drawEquivModel(container, spec, { reveal: opts.showAnswer, verdict: opts.verdict });
  },

  evalmodel(container, spec, opts) {
    drawEvalModel(container, spec, opts);
  },

  signmodel(container, spec, opts) {
    drawSignModel(container, spec, {
      reveal: opts.showAnswer,
      verdict: opts.verdict,
    });
  },
};

export const hasVisual = (spec) => !!spec && spec.kind in RENDERERS;

/**
 * @param {HTMLElement} container
 * @param {{kind:string}} spec
 * @param {{reveal?:number, showAnswer?:boolean, animateFrom?:number|null,
 *          verdict?:'ok'|'bad'}} [opts]
 */
export function renderVisual(container, spec, opts = {}) {
  const render = RENDERERS[spec?.kind];
  if (!render) {
    container.replaceChildren();
    return;
  }
  render(container, spec, opts);
}
