/**
 * Order of operations.
 *
 * Ordered by the rule being learned, not by how long the expression is. The
 * second level exists for the trap that catches almost everyone: when two
 * operations are the same rank, you go left to right, so 12 ÷ 3 × 2 is 8 and
 * not 2. Most people who "know PEMDAS" get that one wrong.
 *
 * The lesson for this skill is authored rather than derived, because the
 * evaluation already produces its own steps — one line per rule applied.
 */

export const LEVELS = [
  { name: 'Times Before Plus', blurb: 'Multiplying and dividing happen before adding and subtracting.' },
  { name: 'Left to Right', blurb: 'Same rank? Work left to right. This is the one that catches people.' },
  { name: 'Brackets First', blurb: 'Whatever is in brackets goes first, whatever it is.' },
  { name: 'Powers Too', blurb: 'Powers come before multiplying, after brackets.' },
  { name: 'Nested', blurb: 'Brackets inside brackets. Work from the inside out.' },
  {
    name: 'All Together',
    blurb: 'Everything mixed, with no warning which rule bites. Clear this '
      + 'against the clock to finish the skill for the day.',
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 16, 15, 18, 24, 20];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'order-ops',
  name: 'Order of Operations',
  category: 'algebra',
  glyph: '( )',
  blurb: 'Which part of an expression goes first.',
  answerInput: 'int',
  dependsOn: ['int-addsub', 'int-muldiv'],
  levels: LEVELS,

  /**
   * One step per line of working, naming the rule that justified it. The
   * derived lesson would collapse this into a single sentence; the whole point
   * of this skill is the sequence.
   */
  lesson(problem) {
    const { lines, rules } = problem.visual;
    const steps = [{
      caption: 'Look at it before touching anything. Which part is allowed to go first?',
      opts: { reveal: 1 },
    }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1
          ? `Finally ${rule}: ${lines[i + 1]}.`
          : `${i === 0 ? 'First' : 'Then'} ${rule} — ${lines[i]} becomes ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
