import { drawNumberLine } from './numberline.js';
import { drawSignModel } from './signmodel.js';
import { drawBarModel } from './barmodel.js';
import { drawAreaModel } from './areamodel.js';
import { drawFitsModel } from './fitsmodel.js';
import { drawWholesModel } from './wholesmodel.js';
import { drawEquivModel } from './equivmodel.js';
import { drawEvalModel } from './evalmodel.js';

/**
 * Visual registry.
 *
 * A catalogue item names the kind of picture it wants and supplies its
 * parameters; the play screen never needs to know what kinds exist. Adding a
 * new kind of picture -- an x/y plane, a triangle, a unit circle -- means
 * adding one entry here, and every catalogue item can use it immediately.
 *
 * Each entry declares a `schema` alongside its renderer. The schema is plain
 * data, not code, for a specific reason: scripts/build-library.mjs writes the
 * schemas out to web/library/schemas.json, and the Python deploy gate reads
 * them from there. So a malformed visual spec is caught before it ships,
 * rather than failing silently in a student's browser -- which is what happens
 * today, and is the whole reason the catalogue needs a declared vocabulary
 * rather than an implied one.
 *
 * Schema types: 'int' | 'number' | 'string' | 'bool' | 'frac' ({n,d}) |
 * 'enum' (with `values`) | 'array' (with `of`) | 'object' | 'any'.
 * Add `required: true` to insist, `min`/`max` to bound a number.
 *
 * Mark a field `phase: 'answer'` when it carries the result. Such fields are
 * **withheld from the renderer** until an answer has been committed -- not
 * hidden by it. Reveal discipline was previously a convention every renderer
 * had to remember, and a renderer that forgot would show a student the answer
 * with the question. A renderer cannot leak a field it was never given.
 *
 * Two visuals cannot express their answer as a separate field, and say why
 * below; scripts/check-reveal.mjs covers them by rendering every problem in
 * ask-state and failing if the answer appears in the output.
 *
 * A note on naming, learned the hard way: every one of the eight kinds below
 * serves exactly one skill, because each was named after the situation that
 * prompted it rather than the shape it draws. `barmodel`, `fitsmodel`,
 * `wholesmodel` and `equivmodel` are all a length cut into segments with some
 * emphasised. Name a primitive after its geometry, not its pedagogy, and it
 * gets reused; name it after the lesson and it never will.
 */
const FRAC = { type: 'frac' };

export const VISUALS = {
  numberline: {
    schema: {
      min: { type: 'int', required: true },
      max: { type: 'int', required: true },
      answer: { type: 'int', required: true, phase: 'answer' },
      steps: { type: 'array', of: { type: 'object' }, required: true },
    },
  },
  signmodel: {
    schema: {
      terms: { type: 'array', of: { type: 'object' }, required: true },
      ops: { type: 'array', of: { type: 'string' }, required: true },
      answer: { type: 'int', required: true, phase: 'answer' },
    },
  },
  barmodel: {
    schema: {
      a: { ...FRAC, required: true }, b: { ...FRAC, required: true },
      op: { type: 'enum', values: ['+', '-', '−'], required: true },
      common: { type: 'int', min: 1, max: 64 },
      left: FRAC, right: FRAC,
      result: { ...FRAC, phase: 'answer' },
    },
  },
  areamodel: {
    schema: {
      a: { ...FRAC, required: true }, b: { ...FRAC, required: true },
      product: { ...FRAC, required: true, phase: 'answer' },
    },
  },
  fitsmodel: {
    schema: {
      a: { ...FRAC, required: true }, b: { ...FRAC, required: true },
      quotient: { ...FRAC, required: true, phase: 'answer' },
      fine: { type: 'int', min: 1, max: 40 },
    },
  },
  // No answer field to withhold: which half is the question depends on
  // `direction`. Going to a mixed number the improper fraction is given and
  // whole/rest are the answer; going the other way it is reversed. The
  // renderer draws the setup either way and check-reveal.mjs verifies it.
  wholesmodel: {
    schema: {
      direction: { type: 'enum', values: ['toImproper', 'toMixed'], required: true },
      improper: { ...FRAC, required: true },
      whole: { type: 'int', required: true },
      rest: { type: 'int', required: true },
      d: { type: 'int', min: 1, max: 64, required: true },
    },
  },
  equivmodel: {
    schema: {
      from: { ...FRAC, required: true },
      to: { ...FRAC, required: true, phase: 'answer' },
      reveal: { type: 'enum', values: ['to', 'from', 'none'] },
    },
  },
  // Reveal here is progressive, not binary: the lesson walks the working one
  // line at a time, so `lines` is both question and answer depending on how
  // far the student has stepped. Covered by check-reveal.mjs.
  evalmodel: {
    schema: {
      lines: { type: 'array', of: { type: 'string' }, required: true },
      rules: { type: 'array', of: { type: 'string' }, required: true },
      hint: { type: 'string' },
    },
  },
};

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

// Every declared kind must have a renderer and vice versa; a mismatch means a
// catalogue item could name a picture nothing knows how to draw.
for (const kind of Object.keys(VISUALS)) {
  if (!RENDERERS[kind]) throw new Error(`Visual "${kind}" is declared but has no renderer`);
}
for (const kind of Object.keys(RENDERERS)) {
  if (!VISUALS[kind]) throw new Error(`Renderer "${kind}" has no declared schema`);
}

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
  render(container, withheldUntilAnswered(spec, opts), opts);
}

/**
 * Strip the fields a schema marks as carrying the answer, until one has been
 * committed. This is what makes reveal discipline a property of the system
 * rather than something each renderer is trusted to remember.
 */
export function withheldUntilAnswered(spec, opts) {
  if (opts.showAnswer) return spec;
  const schema = VISUALS[spec.kind]?.schema;
  if (!schema) return spec;
  let out = null;
  for (const [field, rule] of Object.entries(schema)) {
    if (rule.phase !== 'answer' || !(field in spec)) continue;
    out ??= { ...spec };
    delete out[field];
  }
  return out ?? spec;
}
