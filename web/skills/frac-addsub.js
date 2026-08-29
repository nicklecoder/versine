/**
 * Adding and subtracting fractions.
 *
 * The levels walk the one idea that matters: you can only add matching units.
 * Same denominator first, then one denominator that already divides the other
 * (only one side has to change), then genuinely unlike denominators, then
 * subtraction, then simplifying.
 *
 * From the "Simplify" level onward, simplest form is required — declared per
 * level rather than hardcoded, so the requirement arrives exactly when it has
 * been taught and stays required after that.
 */

export const LEVELS = [
  { name: 'Same Denominator', slug: 'same-denominator', blurb: 'Matching pieces add straight across.' },
  { name: 'One Fits the Other', slug: 'one-fits-the-other', blurb: 'One denominator already divides the other — only one side changes.' },
  { name: 'Unlike Denominators', slug: 'unlike-denominators', blurb: 'The real thing: both sides rewritten before they combine.' },
  { name: 'Taking Away', slug: 'taking-away', blurb: 'Subtraction, same rules.' },
  {
    name: 'Simplify the Answer', slug: 'simplify-the-answer',
    blurb: 'Right value, lowest terms. From here on, simplest form is expected.',
    requireSimplest: true,
  },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed, in simplest form. Clear this against the clock '
      + 'to finish the skill for the day.',
    requireSimplest: true,
  },
];

export const LAST_LEVEL = LEVELS.length - 1;

export const PAR_SECONDS = [12, 16, 20, 20, 22, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'frac-addsub',
  name: 'Add & Subtract Fractions',
  category: 'parts',
  glyph: '⁄',
  blurb: 'Matching the pieces before you combine them.',
  answerInput: 'frac',
  dependsOn: ['int-addsub'],
  levels: LEVELS,

};
