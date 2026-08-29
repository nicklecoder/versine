/**
 * Multiplying and dividing fractions.
 *
 * Two genuinely different ideas, so two different pictures. Multiplying asks
 * "what is a part of a part?" and is drawn as an area: shade a strip across a
 * square, another down it, and the product is the overlap — which is also why
 * multiplying by a proper fraction makes things *smaller*, a result that
 * surprises most students.
 *
 * Dividing asks "how many of these fit into that?", which no area can show. It
 * gets a length picture instead: the dividend laid out, then chopped into
 * copies of the divisor and counted. Once that idea lands, flipping the
 * divisor is a shortcut rather than a spell.
 */

export const LEVELS = [
  { name: 'A Part of a Part', slug: 'a-part-of-a-part', blurb: 'Unit fractions. See why the answer gets smaller.' },
  { name: 'Multiplying Any Two', slug: 'multiplying-any-two', blurb: 'Numerators across the top, denominators along the bottom.' },
  { name: 'How Many Fit', slug: 'how-many-fit', blurb: 'Division as counting copies — the answers come out whole.' },
  { name: 'Dividing Fractions', slug: 'dividing-fractions', blurb: 'The general case: flip the second one and multiply.' },
  {
    name: 'Simplify the Answer', slug: 'simplify-the-answer',
    blurb: 'Right value, lowest terms. Expected from here on.',
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
export const PAR_SECONDS = [14, 16, 18, 22, 22, 22];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'frac-muldiv',
  name: 'Multiply & Divide Fractions',
  category: 'fractions',
  glyph: '×⁄',
  blurb: 'Parts of parts, and how many fit.',
  answerInput: 'frac',
  dependsOn: ['frac-addsub'],
  levels: LEVELS,

};
