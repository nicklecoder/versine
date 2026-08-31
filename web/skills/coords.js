/**
 * The coordinate plane.
 *
 * The first skill where an answer is a *place* rather than a quantity, which
 * is the idea the whole of graphing rests on. Reading a point off a grid comes
 * before naming one, because recognising is easier than producing and both
 * are the same fact.
 *
 * Quadrants get their own level for one reason: the sign pattern is what makes
 * a graph readable at a glance later, and a student who has to reason it out
 * every time will not notice when a curve crosses into a region where the
 * signs change.
 */

export const LEVELS = [
  { name: 'Reading Across', slug: 'reading-across', blurb: 'A point is drawn. How far along is it?' },
  { name: 'Reading Up', slug: 'reading-up', blurb: 'The other half of the pair — how far up or down.' },
  { name: 'Negative Directions', slug: 'negative-directions', blurb: 'Left and down are the same idea with a sign on it.' },
  { name: 'Which Quadrant', slug: 'which-quadrant', blurb: 'The signs of a pair tell you where it lives.' },
  {
    name: 'Distance Along a Line', slug: 'distance-along-a-line',
    blurb: 'Two points sharing a row or column. How far apart?',
  },
  {
    name: 'Steepness', slug: 'steepness',
    blurb: 'Up divided by along. A gradient is a rate, and a rate is a ratio.',
    // This is the edge the whole ratio skill was built to make available:
    // rise over run is a unit rate, and the line is the picture of it.
    dependsOn: [{ skill: 'ratio', level: 4 }],
  },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Every kind mixed. Clear this against the clock to finish the '
      + 'skill for the day.',
  },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 14, 16, 14, 18, 22, 18];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'coords',
  name: 'The Coordinate Plane',
  category: 'coordinates',
  glyph: '⊹',
  blurb: 'Where a pair of numbers puts you, and how to read one off.',
  answerInput: 'int',
  dependsOn: ['int-addsub', 'ratio'],
  levels: LEVELS,
};
