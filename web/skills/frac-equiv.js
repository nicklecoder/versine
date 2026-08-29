/**
 * Equivalent fractions and simplifying.
 *
 * Both directions are the same move: multiply or divide the top and the bottom
 * by the same number. Building up comes first because multiplying is the
 * easier direction to see, then cutting down, then the case that trips people
 * — reducing all the way rather than stopping at the first factor you spot.
 *
 * Levels that ask for a missing number want a single integer; levels that ask
 * for a simplified fraction want two boxes. The input follows the problem.
 */

export const LEVELS = [
  { name: 'Build It Up', slug: 'build-it-up', blurb: 'Multiply both parts by the same number.' },
  { name: 'Which Bottom?', slug: 'which-bottom', blurb: 'Same move, but the denominator is missing.' },
  { name: 'Cut It Down', slug: 'cut-it-down', blurb: 'Divide both parts. One factor does it.',
    requireSimplest: true },
  { name: 'All the Way Down', slug: 'all-the-way-down', blurb: 'Keep going until nothing divides both.',
    requireSimplest: true },
  { name: 'Missing Piece', slug: 'missing-piece', blurb: 'An equivalence that shrinks — what fits the gap?' },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed, in lowest terms. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 14, 14, 18, 16, 16];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'frac-equiv',
  name: 'Equivalent & Simplest Form',
  category: 'parts',
  glyph: '≡',
  blurb: 'Same amount, different pieces.',
  answerInput: 'int',
  dependsOn: ['frac-addsub'],
  levels: LEVELS,

};
