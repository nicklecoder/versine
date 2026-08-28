/**
 * Powers and the exponent rules.
 *
 * The rules are asked as rules. `2³ × 2⁴ = 2^?` wants the exponent, not 128 —
 * ask for the value and a student can multiply their way to it without ever
 * using the rule, which is the thing that has to transfer to x³ × x⁴ later.
 * Only the first level and the last ask for a value, where evaluating *is*
 * the skill.
 *
 * Bases stay small and familiar. The difficulty here is the rule, and 7¹¹ is
 * not a harder rule than 2¹¹ — it is only harder arithmetic, which belongs to
 * a different skill.
 */

export const LEVELS = [
  { name: 'What a Power Is', blurb: 'Repeated multiplication, written short. Work out the value.' },
  { name: 'Multiplying Powers', blurb: 'Same base, so the factors pile up: the exponents add.' },
  { name: 'Dividing Powers', blurb: 'Factors cancel in pairs, so the exponents subtract.' },
  { name: 'Power of a Power', blurb: 'A power raised to a power. The exponents multiply.' },
  {
    name: 'Zero and Negative',
    blurb: 'Keep subtracting exponents past zero and see where it lands.',
  },
  {
    name: 'Which Form?',
    kind: 'strategy',
    blurb: 'Leave it as a power, or work it out? The job decides.',
    // Sits after all four rules, because until you can keep something as a
    // power there is no choice to make about whether to.
    dependsOn: [{ skill: 'int-muldiv', level: 3 }],
  },
  {
    name: 'All Together',
    blurb: 'Every rule mixed, with no warning which one bites. Clear this '
      + 'against the clock to finish the skill for the day.',
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 16, 16, 16, 20, 18, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'exponents',
  name: 'Powers & Exponent Rules',
  category: 'powers',
  glyph: 'xⁿ',
  blurb: 'Short ways of writing repeated multiplication, and the rules that follow.',
  answerInput: 'int',
  dependsOn: ['int-muldiv', 'order-ops'],
  levels: LEVELS,

  /**
   * One line of working per rule applied, same as order of operations: the
   * sequence is the teaching, and a single derived sentence would lose it.
   */
  lesson(problem) {
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'What is this asking?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1
          ? `Which leaves ${lines[i + 1]}.`
          : `${i === 0 ? 'First' : 'Then'} ${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
