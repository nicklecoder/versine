/**
 * Ratio, rate and proportion.
 *
 * The rung that trigonometry stands on, and the one that decides whether the
 * step from arithmetic into algebra feels like a continuation or a new
 * subject. A rate is a slope, a proportion is a linear equation with one
 * unknown, and a trigonometric ratio is a ratio -- none of which is available
 * to a student who has only ever met ratios as a notation.
 *
 * Scaling a ratio is the same move as building an equivalent fraction, and
 * putting one in simplest form is dividing both parts by their greatest
 * common factor. Both edges are declared rather than left implied, because
 * meeting the move a second time under a new name is where it either
 * generalises or becomes a second thing to remember.
 *
 * The confusion the skill is built around is part-to-part against
 * part-to-whole. Told that red and blue are in the ratio 3 : 5, a student who
 * reaches for 3/5 of the counters rather than 3/8 has not misread the
 * question -- they have read the ratio as a fraction, which it looks exactly
 * like. So the picture draws both readings at once: one bar cut into eight
 * with three shaded shows 3 to 5 against the unshaded part, and 3 of 8
 * against the whole, and neither has to be taken on trust.
 */

export const LEVELS = [
  {
    name: 'Equivalent Ratios', slug: 'equivalent-ratios',
    blurb: 'Multiply both parts by the same number and the ratio is unchanged.',
    // The identical move, met first on fractions.
    dependsOn: [{ skill: 'frac-equiv', level: 0 }],
  },
  {
    name: 'Simplest Form', slug: 'simplest-form',
    blurb: 'The same ratio in the fewest parts. Divide both by what they share.',
    // "What they share", taken all the way, is the greatest common factor.
    dependsOn: [{ skill: 'factors', level: 3 }],
  },
  { name: 'Part and Whole', slug: 'part-and-whole',
    blurb: '3 : 5 is three parts in every eight, not three fifths. The one that catches everyone.' },
  { name: 'Unit Rate', slug: 'unit-rate',
    blurb: 'What one of them is worth. Divide, and everything else follows from it.' },
  { name: 'Scaling Up and Down', slug: 'scaling-up-and-down',
    blurb: 'Four cost this much, so seven cost what? Down to one, then back up.' },
  {
    name: 'Scale, or Find One?', slug: 'scale-or-find-one', kind: 'strategy',
    blurb: 'Sometimes one multiplication does it. Sometimes it cannot, and pretending costs you.',
    // The judgement is entirely "is the target a whole number of lots of what
    // I have?", which is the factor-pair question wearing a rate's clothes.
    dependsOn: [{ skill: 'factors', level: 0 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed, with no warning which is coming. Clear this '
      + 'against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 14, 22, 16, 24, 16, 24];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'ratio',
  name: 'Ratio & Proportion',
  category: 'ratio',
  glyph: '3:4',
  blurb: 'Comparing two amounts, and keeping the comparison when the amounts change.',
  answerInput: 'int',
  dependsOn: ['frac-equiv', 'factors', 'int-muldiv'],
  levels: LEVELS,

  /**
   * The rate levels write their working a line at a time, and the sequence is
   * the teaching -- a single derived sentence would lose the middle of it.
   *
   * The ratio levels and the strategy level fall through to the derived steps
   * instead: the ratio bar reveals in one move rather than progressively, and
   * a judgement question's `explain` is the whole of its argument.
   */
  lesson(problem) {
    if (problem.visual?.kind !== 'evalmodel') return null;
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
