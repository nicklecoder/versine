import { el, mount } from './dom.js';

/**
 * Working, written out the way a student would write it — one line per rule
 * applied, each aligned under the last.
 *
 * While the question is open only the first line is shown: the expression
 * itself, which is the question. Everything after it is the answer being
 * worked out, so it arrives with the reveal. The stepped lesson uses the same
 * renderer with `reveal` climbing one line at a time, which is what makes a
 * walkthrough of this skill worth having.
 *
 * @typedef {{lines:string[], rules:string[]}} EvalSpec
 */

/**
 * @param {HTMLElement} container
 * @param {EvalSpec} spec
 * @param {{reveal?:number, showAnswer?:boolean, verdict?:'ok'|'bad'}} [opts]
 */
export function drawEvalModel(container, spec, { reveal = null, showAnswer = false, verdict = null } = {}) {
  const { lines, rules } = spec;
  const shown = showAnswer ? lines.length : Math.max(1, reveal ?? 1);

  const rows = lines.slice(0, shown).map((line, i) => {
    const last = i === shown - 1;
    const done = i === lines.length - 1;
    return el('div', { class: `eval-row${done ? ' is-answer' : ''}${last ? ' is-latest' : ''}` },
      el('span.eval-line', {}, line),
      i > 0 ? el('span.eval-rule', {}, rules[i - 1]) : null,
      done && verdict
        ? el('span', { class: `bar-verdict is-${verdict}` }, verdict === 'ok' ? '✓' : '✗')
        : null);
  });

  mount(container, el('div.eval', {}, ...rows,
    shown === 1
      ? el('p.bar-hint', {}, 'Which part is allowed to go first?')
      : null));
}
