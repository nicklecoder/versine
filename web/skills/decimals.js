/**
 * Decimals.
 *
 * Held throughout as fractions over powers of ten, because that is what a
 * decimal *is* — and because a student who has done fractions already owns
 * most of this. Place value comes first for the same reason: 0.7 and 0.65 trip
 * people up only when the digits are read as a whole number with a dot in it,
 * and once tenths and hundredths are units the comparison is the one they
 * already know.
 *
 * Multiplying gets its own level for the result that surprises everyone:
 * 0.3 × 0.4 is smaller than either. Same fact as multiplying proper fractions,
 * met again in the notation most people actually use.
 *
 * Dividing gets one for the opposite surprise — 4.8 ÷ 0.4 is twelve, which is
 * bigger than either — and because the move it needs is not a new rule at
 * all. Multiplying both numbers by ten leaves the quotient alone, which is
 * the equivalent-fractions move under another name, and saying so is the
 * difference between a shift a student can reconstruct and one they have to
 * remember the direction of.
 */

export const LEVELS = [
  { name: 'Tenths and Hundredths', slug: 'tenths-and-hundredths',
    blurb: 'What each place is worth. A decimal is a fraction with a hidden bottom.' },
  { name: 'Which Is Bigger', slug: 'which-is-bigger',
    blurb: 'Compare by place, not by how many digits there are.' },
  { name: 'Adding and Taking Away', slug: 'adding-and-taking-away',
    blurb: 'Line up the point, then it is ordinary arithmetic.' },
  { name: 'Multiplying', slug: 'multiplying',
    blurb: 'Multiply the digits, then count the places. Answers get smaller.' },
  {
    name: 'Dividing', slug: 'dividing',
    blurb: 'Shift both until the thing you are dividing by is whole. Then divide.',
    // Multiplying both by ten is building an equivalent fraction: 4.8/0.4 and
    // 48/4 are the same quotient, which is why the shift is allowed at all.
    dependsOn: [{ skill: 'frac-equiv', level: 0 }],
  },
  { name: 'Into Fractions', slug: 'into-fractions',
    blurb: 'Every terminating decimal is a fraction. Read it off and simplify.' },
  {
    name: 'Which Form?', slug: 'which-form', kind: 'strategy',
    blurb: 'Decimal or fraction? Exactness and arithmetic pull opposite ways.',
    // After both forms can be produced, which is where preferring one first
    // costs something.
    dependsOn: [{ skill: 'frac-equiv', level: 0 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [14, 14, 18, 20, 22, 18, 16, 20];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'decimals',
  name: 'Decimals',
  category: 'decimals',
  glyph: '0.5',
  blurb: 'Fractions over tens, written the way the world writes them.',
  answerInput: 'decimal',
  dependsOn: ['frac-equiv', 'int-muldiv'],
  levels: LEVELS,
};
