import { el, mount } from './dom.js';
import { renderVisual, hasVisual } from './visuals.js';
import { buildLesson, lessonFor } from '../engine/lesson.js';

/**
 * A worked example, stepped at the student's pace.
 *
 * Deliberately an overlay rather than a screen: it is opened from the mode
 * screen *and* from inside a Practice run, and a run must not lose its state
 * because someone asked how this works. It captures the keyboard while open
 * and hands it straight back on close.
 */

/**
 * @param {{skill:object, level:number, problem?:object, onClose:Function}} opts
 * @returns {HTMLElement} the overlay, ready to append to document.body
 */
export function walkthrough({ skill, level, problem: initialProblem = null, onClose }) {
  let problem = initialProblem;
  let lesson = null;
  let step = 0;
  let seed = Date.now();

  const visualBox = el('div.visual');
  const promptEl = el('div.problem.problem--lesson');
  const captionEl = el('p.wt__caption');
  const dots = el('div.wt__dots');
  const nextBtn = el('button.btn.btn--go');
  const againBtn = el('button.btn.btn--sm.btn--ghost', {}, 'Another example');

  /**
   * Opened from a live run it walks *that* problem, so the commentary matches
   * what is on screen behind the overlay. Opened cold it invents one.
   */
  function load(target = null) {
    lesson = target ? lessonFor(skill, level, target) : buildLesson(skill, level, seed);
    step = 0;
    paint();
  }

  function paint() {
    const current = lesson.steps[step];
    const last = step === lesson.steps.length - 1;

    promptEl.innerHTML = lesson.problem.prompt;
    captionEl.textContent = current.caption;

    if (hasVisual(lesson.problem.visual)) {
      visualBox.classList.remove('hidden');
      renderVisual(visualBox, lesson.problem.visual, current.opts);
    } else {
      visualBox.classList.add('hidden');
    }

    mount(dots, lesson.steps.map((_, i) =>
      el('span', { class: `wt__dot${i === step ? ' is-here' : ''}${i < step ? ' is-done' : ''}` })));

    nextBtn.textContent = last ? 'Got it ⏎' : 'Next ⏎';
    againBtn.classList.toggle('hidden', !last);
  }

  function advance() {
    if (step < lesson.steps.length - 1) { step += 1; paint(); return; }
    close();
  }

  function another() {
    seed = Date.now() + Math.floor(Math.random() * 1000);
    problem = null;              // from here on, invent fresh examples
    load();
  }

  const onKey = (e) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      advance();
    }
  };

  function close() {
    document.removeEventListener('keydown', onKey, true);
    overlay.remove();
    onClose?.();
  }

  nextBtn.addEventListener('click', advance);
  againBtn.addEventListener('click', another);

  const overlay = el('div.wt', { onclick: (e) => { if (e.target === overlay) close(); } },
    el('div.wt__panel', {},
      el('div.between', {},
        el('div.eyebrow', {}, `${skill.name} · ${skill.levels[level].name}`),
        el('button.btn.btn--sm.btn--ghost', { onclick: () => close() }, 'Close esc')),
      promptEl,
      visualBox,
      captionEl,
      dots,
      el('div.row-flex', { style: { justifyContent: 'center' } }, againBtn, nextBtn)));

  // Capture, so the play screen underneath never sees these keys.
  document.addEventListener('keydown', onKey, true);

  load(problem);
  return overlay;
}

/** Open a walkthrough and return a function that closes it. */
export function openWalkthrough(opts) {
  const node = walkthrough(opts);
  document.body.append(node);
  return () => node.remove();
}
