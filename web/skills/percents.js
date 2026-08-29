/**
 * Percents.
 *
 * A percent is a fraction whose denominator is always a hundred, and nearly
 * every mistake made with them comes from forgetting the second half of that
 * sentence: *a hundred of what*. So the levels keep asking what the whole is,
 * and the last of them asks it about a whole that has changed.
 *
 * Percent change is the one that matters beyond school. A 20% rise followed by
 * a 20% fall does not return you to where you started, and a student who
 * cannot say why will be misled by a graph or a price for the rest of their
 * life.
 */

export const LEVELS = [
  { name: 'Out of a Hundred', slug: 'out-of-a-hundred',
    blurb: 'Percent means hundredths. Read it straight off.' },
  { name: 'As a Decimal', slug: 'as-a-decimal',
    blurb: 'Move the point two places. Know why it is two.' },
  { name: 'Percent of a Number', slug: 'percent-of-a-number',
    blurb: 'A part of a whole, when the whole is not a hundred.' },
  { name: 'What Percent Is It', slug: 'what-percent-is-it',
    blurb: 'The question backwards: which part of the whole is this?' },
  { name: 'Up and Down', slug: 'up-and-down',
    blurb: 'Increase and decrease. Notice which whole each one is of.' },
  {
    name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [12, 14, 18, 20, 22, 20];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'percents',
  name: 'Percents',
  category: 'decimals',
  glyph: '%',
  blurb: 'Hundredths, and remembering a hundred of what.',
  answerInput: 'int',
  dependsOn: ['decimals', 'frac-equiv'],
  levels: LEVELS,
};
