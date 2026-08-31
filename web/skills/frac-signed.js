/**
 * Multiplying and dividing signed fractions.
 *
 * Split off from Multiply & Divide Fractions rather than bolted onto it, on
 * the same reasoning that separated Unknowns on Both Sides from Solving
 * Equations: multiplying fractions is hard enough on its own without a sign
 * to lose track of at the same time. A student who is still deciding which
 * numerator goes where does not need to be deciding anything else. So the
 * mechanics are finished next door, and this skill adds one thing.
 *
 * That one thing is genuinely the intersection of two skills a student
 * already has — the sign rules from Integer Multiply & Divide, and the
 * arithmetic from Multiply & Divide Fractions — and the whole design is to
 * keep them apart. The sign-and-size picture is int-muldiv's own, reused
 * unchanged: what sign is the answer, and how big is it, are two questions,
 * and answering them separately is the technique rather than a teaching aid.
 * Someone who "can't do negative fractions" can almost always do 2/3 × 3/4.
 *
 * The skill opens on something that is not about multiplying at all. −3/4,
 * 3/−4 and −(3/4) are one number written three ways, and a student who has
 * not settled that has no stable thing to apply a sign rule *to* — they will
 * read a minus in a denominator as a second negative and cancel a sign that
 * was never there twice.
 */

export const LEVELS = [
  {
    name: 'Where the Minus Lives', slug: 'where-the-minus-lives',
    blurb: '−3/4, 3/−4 and −(3/4) are one number. Put it in front and simplify.',
    // A minus in the denominator is a division by a negative, which is where
    // the sign rules say it may be moved from.
    dependsOn: [{ skill: 'int-muldiv', level: 2 }],
  },
  {
    name: 'One Negative', slug: 'one-negative',
    blurb: 'Multiply as usual, then ask what sign it is. Two questions, not one.',
    dependsOn: [{ skill: 'int-muldiv', level: 0 }],
  },
  {
    name: 'Two Negatives', slug: 'two-negatives',
    blurb: 'Both negative, so the answer is not. Same rule as whole numbers.',
    dependsOn: [{ skill: 'int-muldiv', level: 1 }],
  },
  {
    name: 'Dividing with Signs', slug: 'dividing-with-signs',
    blurb: 'Flip the second one — sign and all — then it is a multiplication.',
    dependsOn: [{ skill: 'frac-muldiv', level: 4 }],
  },
  {
    name: 'What Sign Will It Be?', slug: 'what-sign-will-it-be', kind: 'strategy',
    blurb: 'Before working anything out: count the negatives. It costs a second and saves the answer.',
    // The judgement is worth its own level because the sign is knowable
    // before any arithmetic is done, and knowing it first is what stops a
    // long calculation ending in a coin flip.
    dependsOn: [{ skill: 'int-muldiv', level: 4 }],
  },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed, in simplest form. Clear this against the clock '
      + 'to finish the skill for the day.',
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [18, 22, 22, 26, 14, 26];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'frac-signed',
  name: 'Signed Fractions',
  category: 'fractions',
  glyph: '±⁄',
  blurb: 'Fraction arithmetic you can already do, with a sign to keep track of.',
  answerInput: 'frac',
  dependsOn: ['frac-muldiv', 'int-muldiv'],
  levels: LEVELS,

  /**
   * Only the opening level walks its working: the sign-and-size picture
   * reveals in one move rather than progressively, and a judgement question's
   * `explain` is the whole of its argument.
   */
  lesson(problem) {
    if (problem.visual?.kind !== 'evalmodel') return null;
    const { lines, rules } = problem.visual;
    const steps = [{ caption: problem.visual.hint ?? 'What is this asking?', opts: { reveal: 1 } }];
    rules.forEach((rule, i) => {
      steps.push({
        caption: i === rules.length - 1 ? `Which leaves ${lines[i + 1]}.` : `${rule}: ${lines[i + 1]}.`,
        opts: { reveal: i + 2 },
      });
    });
    return steps;
  },
};
