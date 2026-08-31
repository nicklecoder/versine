/**
 * Square roots and radicals.
 *
 * A square root is introduced as the question a square answers, not as a
 * button: √144 is "what number, squared, gives 144", and the level asks it
 * both ways so that squaring and rooting are visibly the same fact read in
 * two directions.
 *
 * The middle of the skill is the part that usually gets skipped — that most
 * roots are not whole. Knowing √50 sits just above 7 is what stops a student
 * accepting 25 for it, and it has to come before simplifying, because 5√2
 * means nothing to someone with no sense of how big √50 is.
 */

export const LEVELS = [
  { name: 'Perfect Squares', slug: 'perfect-squares', blurb: 'Squares you should know on sight, read both ways.' },
  { name: 'Between Whole Numbers', slug: 'between-whole-numbers', blurb: 'Most roots are not whole. Where does this one land?' },
  { name: 'Pulling Out Squares', slug: 'pulling-out-squares', blurb: 'A square hiding inside the root can come out of it.' },
  {
    name: 'Simplest Radical Form', slug: 'simplest-radical-form',
    blurb: 'Take out every square there is, not just the first one you spot.',
  },
  {
    name: 'Cubes and Cube Roots', slug: 'cubes-and-cube-roots',
    blurb: 'The same question one dimension up. Three of them multiplied.',
    // A cube is a power before it is a root, and reading a power both ways is
    // exactly what the first exponents level is.
    dependsOn: [{ skill: 'exponents', level: 0 }],
  },
  {
    name: 'Which Form?', slug: 'which-form',
    kind: 'strategy',
    blurb: 'Exact or approximate? Simplified or as it came? The job decides.',
    // Placed after simplifying, because the choice between an exact radical
    // and a decimal cannot cost anything until you can produce both.
    dependsOn: [{ skill: 'exponents', level: 0 }],
  },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Every kind mixed. Clear this against the clock to finish the '
      + 'skill for the day.',
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 18, 20, 22, 18, 18, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'roots',
  name: 'Square Roots & Radicals',
  category: 'powers',
  glyph: '√',
  blurb: 'The question a square answers, and how to tidy the answer up.',
  answerInput: 'int',
  dependsOn: ['exponents', 'int-muldiv'],
  levels: LEVELS,

  /** One line of working per step, same as the other worked-lines skills. */
  lesson(problem) {
    // The strategy level carries no visual, so it falls back to the
    // sentences of `explain` -- which for a judgement question is the
    // whole of the argument anyway.
    if (problem.visual?.kind !== 'evalmodel') return null;
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'What is this asking?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1 ? `Which leaves ${lines[i + 1]}.`
          : `${i === 0 ? 'First' : 'Then'} ${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
