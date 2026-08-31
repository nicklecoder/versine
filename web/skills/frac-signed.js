/**
 * Fraction arithmetic with signs — all four operations.
 *
 * Split off from the fraction skills rather than bolted onto them, on the
 * same reasoning that separated Unknowns on Both Sides from Solving
 * Equations: combining fractions is hard enough on its own without a sign to
 * lose track of at the same time. A student still deciding which numerator
 * goes where does not need to be deciding anything else. So the mechanics
 * are finished next door, and this skill adds one thing to each of them.
 *
 * That one thing is the intersection of skills a student already has — the
 * sign rules from the two integer skills, and the arithmetic from the two
 * fraction ones — and the whole design is to keep them apart. Someone who
 * "can't do negative fractions" can almost always do 2/3 × 3/4.
 *
 * The two halves want different pictures because they are different rules,
 * and that is the point of the arrangement. Multiplying, the sign is a
 * *count*: how many negatives, odd or even, knowable before any arithmetic —
 * so the sign-and-size split is the technique, and it is int-muldiv's own
 * picture, reused unchanged. Adding, the sign is a *comparison*: −3/4 + 1/2
 * is negative because three quarters is more than a half, and counting the
 * negatives would give the wrong answer. Getting the two confused is the
 * single most common way this goes wrong, so the additive levels come first
 * and the strategy level names the boundary out loud.
 *
 * The skill opens on something that is not about arithmetic at all. −3/4,
 * 3/−4 and −(3/4) are one number written three ways, and a student who has
 * not settled that has no stable thing to apply any sign rule *to* — they
 * will read a minus in a denominator as a second negative and cancel a sign
 * that was never there twice.
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
    name: 'Adding a Negative', slug: 'adding-a-negative',
    blurb: 'Match the pieces, then it is whole numbers with signs. Which one is bigger decides.',
    // Once both are over a common denominator the sign question is exactly
    // int-addsub's, done on numerators.
    dependsOn: [{ skill: 'int-addsub', level: 1 }],
  },
  {
    name: 'Subtracting a Negative', slug: 'subtracting-a-negative',
    blurb: 'Two minus signs in a row. The answer gets bigger, and that is not a trick.',
    dependsOn: [{ skill: 'int-addsub', level: 2 }],
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
    blurb: 'Count the negatives — but only when it is × or ÷. Adding plays by a different rule.',
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
export const PAR_SECONDS = [18, 26, 26, 22, 22, 26, 16, 28];

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
  dependsOn: ['frac-addsub', 'frac-muldiv', 'int-addsub', 'int-muldiv'],
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
