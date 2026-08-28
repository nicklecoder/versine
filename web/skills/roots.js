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
  { name: 'Perfect Squares', blurb: 'Squares you should know on sight, read both ways.' },
  { name: 'Between Whole Numbers', blurb: 'Most roots are not whole. Where does this one land?' },
  { name: 'Pulling Out Squares', blurb: 'A square hiding inside the root can come out of it.' },
  {
    name: 'Simplest Radical Form',
    blurb: 'Take out every square there is, not just the first one you spot.',
  },
  {
    name: 'Which Form?',
    kind: 'strategy',
    blurb: 'Exact or approximate? Simplified or as it came? The job decides.',
    // Placed after simplifying, because the choice between an exact radical
    // and a decimal cannot cost anything until you can produce both.
    dependsOn: [{ skill: 'exponents', level: 0 }],
  },
  {
    name: 'All Together',
    blurb: 'Every kind mixed. Clear this against the clock to finish the '
      + 'skill for the day.',
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 18, 20, 22, 18, 22];

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
