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
 *
 * The first five levels can all be cleared by spotting a whole-number
 * multiplier, which is a lookup rather than a piece of reasoning -- and a
 * student who has only ever done that is stuck the moment the bottoms are
 * 6 and 9. Through Simplest Form is that case, and the strategy level after
 * it is the judgement of which situation you are in.
 */

export const LEVELS = [
  { name: 'Build It Up', slug: 'build-it-up', blurb: 'Multiply both parts by the same number.' },
  { name: 'Which Bottom?', slug: 'which-bottom', blurb: 'Same move, but the denominator is missing.' },
  { name: 'Cut It Down', slug: 'cut-it-down', blurb: 'Divide both parts. One factor does it.',
    requireSimplest: true },
  {
    name: 'All the Way Down', slug: 'all-the-way-down',
    blurb: 'Keep going until nothing divides both.',
    requireSimplest: true,
    // "Nothing divides both" is the greatest common factor having been
    // taken out. Knowing it names the stopping point.
    dependsOn: [{ skill: 'factors', level: 3 }],
  },
  { name: 'Missing Piece', slug: 'missing-piece', blurb: 'An equivalence that shrinks — what fits the gap?' },
  {
    name: 'Through Simplest Form', slug: 'through-simplest-form',
    blurb: 'Neither bottom is a multiple of the other. Go down to lowest terms, then up.',
    // The case every level before this one avoids. 2/3 = ?/12 can be cleared
    // by spotting "× 4" without ever thinking about equivalence; 4/6 = ?/9
    // cannot, because there is no whole number to spot. Which is why it needs
    // the greatest common factor by name rather than "a factor you noticed".
    dependsOn: [{ skill: 'factors', level: 3 }],
  },
  {
    name: 'Straight Up, or Simplify?', slug: 'straight-up-or-simplify', kind: 'strategy',
    blurb: 'One multiplication, or a detour through lowest terms? The bottoms decide.',
    // Sits after both routes exist, which is the first point at which
    // reaching for the wrong one costs anything. The discriminator is
    // whether one bottom divides the other -- a factor question.
    dependsOn: [{ skill: 'factors', level: 0 }],
  },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed, in lowest terms. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 14, 14, 18, 16, 22, 16, 16];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'frac-equiv',
  name: 'Equivalent & Simplest Form',
  category: 'fractions',
  glyph: '≡',
  blurb: 'Same amount, different pieces.',
  answerInput: 'int',
  dependsOn: ['frac-addsub', 'factors'],
  levels: LEVELS,

};
