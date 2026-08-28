/**
 * Term builders for prompts.
 *
 * Authoring-time only: generators compose these into the term arrays stored in
 * the catalogue. The matching renderer is web/ui/prompt.js, which is the half
 * that ships. Keep the two in step — the term kinds here are the ones it knows.
 */
export const num = (v, s = 1) => ({ t: 'num', v: String(v), s });
export const frac = (n, d, s = 1) => ({ t: 'frac', n, d, s });
export const mixed = (w, n, d, s = 1) => ({ t: 'mixed', w, n, d, s });
export const op = (v) => ({ t: 'op', v });
export const blank = () => ({ t: 'blank' });
export const prose = (v, s = 1) => ({ t: 'prose', v: String(v), s });

/** The common shape: terms, an equals, and the space for an answer. */
export const asks = (...terms) => [...terms, op('='), blank()];
