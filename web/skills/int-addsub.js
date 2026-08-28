/**
 * Adding and subtracting positive and negative integers.
 *
 * Levels are ordered by the *idea*, not by the size of the numbers:
 * "subtracting a negative" is the hard one, so it gets a level of its own
 * rather than being buried in a general mix.
 */

export const LEVELS = [
  { name: 'First Steps',           blurb: 'Positive second number. Find your feet on the line.' },
  { name: 'Adding Negatives',      blurb: 'Adding a negative walks you backwards.' },
  { name: 'Subtracting Negatives', blurb: 'The tricky one: two minus signs make a plus.' },
  { name: 'Mixed Integers',        blurb: 'Both operations, both signs, bigger numbers.' },
  {
    name: 'Chains',
    blurb: 'Three terms at once, left to right.',
    // Three terms take roughly twice as long to work through as two, so the
    // default two-minute clock made this level near-unpassable.
    trial: { duration: 180 },
  },
  { name: 'All Together', blurb: 'Everything mixed, with no warning which is coming. '
    + 'Clear this against the clock to finish the skill for the day.' },
];

/** The last level is always the mixed review: it draws from every level before it. */
export const LAST_LEVEL = LEVELS.length - 1;

export const PAR_SECONDS = [11, 12, 14, 12, 20, 16];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'int-addsub',
  name: 'Integer Add & Subtract',
  category: 'integers',
  glyph: '±',
  blurb: 'Positive and negative numbers on the line.',
  answerInput: 'int',
  levels: LEVELS,

};
