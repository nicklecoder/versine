/**
 * Improper fractions and mixed numbers.
 *
 * Two directions, and they are genuinely different operations: going to a
 * mixed number is division with a remainder, going back is multiply-and-add.
 * Each gets its own level rather than being mixed from the start.
 *
 * The third level exists because of a specific stumble: an improper fraction
 * that comes out exactly whole. Students who have learned "there is always a
 * bit left over" write `2 0/4`, so it is worth meeting on its own.
 */

export const LEVELS = [
  { name: 'Into Wholes', blurb: 'Top-heavy fractions become a whole and a bit.' },
  { name: 'Back Again', blurb: 'A whole and a bit becomes a top-heavy fraction.' },
  { name: 'Exactly Whole', blurb: 'Sometimes nothing is left over at all.' },
  { name: 'Both Ways', blurb: 'Either direction, without warning which.' },
  {
    name: 'Simplify Too',
    blurb: 'Convert, then put the leftover in lowest terms. Expected from here on.',
    requireSimplest: true,
  },
  {
    name: 'Which Form?',
    kind: 'strategy',
    blurb: 'Knowing how to convert is half of it. Knowing when to is the rest.',
    // Sits here, immediately after both conversions and after multiplying and
    // dividing fractions, because that is the first point where the choice can
    // actually cost you something. Earlier would mean teaching the strategy
    // before the situation that needs it exists.
    dependsOn: [{ skill: 'frac-muldiv', level: 0 }],
  },
  {
    name: 'All Together',
    blurb: 'Everything mixed, in simplest form. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 14, 12, 16, 20, 16, 18];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'frac-mixed',
  name: 'Improper & Mixed Numbers',
  category: 'fractions',
  glyph: '1½',
  blurb: 'Top-heavy fractions and the wholes hiding in them.',
  answerInput: 'mixed',
  dependsOn: ['frac-addsub', 'frac-muldiv'],
  levels: LEVELS,

};
