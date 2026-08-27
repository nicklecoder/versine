import { makeRng } from './rng.js';

/**
 * Lessons.
 *
 * A lesson is a worked example stepped through at the student's pace, using
 * the level's own visual. Nothing new has to be authored for it: `explain` is
 * already written as the sentences of an argument, so splitting it gives the
 * commentary, and the visual holds its "asking" state until the final sentence
 * — the moment the answer is genuinely being explained rather than shown.
 *
 * A level may instead point at a recorded video:
 *
 *     { name: 'Unlike Denominators', lesson: { video: 'lessons/unlike.mp4' } }
 *
 * When that file is present it is offered instead. That way videos can be
 * recorded one level at a time, whenever, with nothing to rework in between
 * and no level ever left without *something*.
 *
 * A skill can also author its own steps by exporting `lesson(problem, level)`.
 */

/** Split prose into the sentences of an argument. */
function sentences(text) {
  const parts = String(text ?? '').match(/[^.!?]+[.!?]+(\s|$)/g);
  return (parts ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/**
 * Question first, then the reasoning one sentence at a time, with the answer
 * arriving only on the last.
 */
function derivedSteps(problem, levelDef) {
  const asking = { reveal: 1, animateFrom: null };
  const shown = { showAnswer: true, animateFrom: 1 };

  const lines = sentences(problem.explain);
  const steps = [{ caption: levelDef?.blurb ?? 'One of these, worked through.', opts: asking }];

  lines.forEach((line, i) => {
    const last = i === lines.length - 1;
    steps.push({ caption: line, opts: last ? shown : asking });
  });

  // A one-sentence explanation would otherwise never show the answer.
  if (steps.length === 1) steps.push({ caption: problem.explain, opts: shown });
  return steps;
}

/** Commentary for a problem that already exists — the one on screen, say. */
export function lessonFor(skill, level, problem) {
  const levelDef = skill.levels[level];
  const authored = typeof skill.lesson === 'function' ? skill.lesson(problem, level) : null;
  return {
    problem,
    video: levelDef?.lesson?.video ?? null,
    steps: authored ?? derivedSteps(problem, levelDef),
  };
}

/** A fresh worked example for this level. */
export function buildLesson(skill, level, seed = Date.now()) {
  return lessonFor(skill, level, skill.generate(makeRng(seed), level));
}
