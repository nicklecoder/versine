/**
 * Simplifying expressions.
 *
 * The first skill where the answer is an expression rather than a number, so
 * it is typed into a single box and rendered back as the student types. That
 * is not only an input change: an answer that is itself an expression is the
 * whole reason algebra needs a different kind of judgement, and meeting it
 * here, on expressions small enough to check by eye, is the point.
 *
 * The strategy level is the one this skill exists for. Expanding and factoring
 * are both easy; knowing that you keep the brackets to divide both sides of an
 * equation by them, and lose them to collect like terms, is what decides
 * whether algebra feels like a machine or a mystery. A student who can do both
 * and chooses at random has learned neither.
 */

export const LEVELS = [
  { name: 'Collecting Like Terms', slug: 'collecting-like-terms',
    blurb: 'Same letter, so they count the same thing. Add the numbers in front.' },
  { name: 'What Will Not Combine', slug: 'what-will-not-combine',
    blurb: 'Numbers and letters count different things. Some of it stays as it is.' },
  { name: 'Distributing', slug: 'distributing',
    blurb: 'A bracket multiplied hits everything inside it, not just the first.' },
  { name: 'Distribute and Collect', slug: 'distribute-and-collect',
    blurb: 'Open the bracket, then gather what matches.' },
  {
    name: 'Which Form?', slug: 'which-form', kind: 'strategy',
    blurb: 'Keep the brackets or open them? What you are about to do decides.',
    // After both forms can be produced, which is the first point at which
    // preferring one costs anything.
    dependsOn: [{ skill: 'order-ops', level: 2 }],
  },
  { name: 'All Together', slug: 'all-together',
    blurb: 'Everything mixed. Clear this against the clock to finish the skill for the day.' },
];

export const LAST_LEVEL = LEVELS.length - 1;
export const PAR_SECONDS = [16, 20, 20, 26, 18, 26];

/**
 * The runtime definition of this skill: what the student sees and how the
 * app navigates it. Problems come from the pre-built library in
 * web/library/, never from code -- the generator that first produced that
 * library lives in tools/generators/ and does not ship.
 */
export default {
  id: 'simplify',
  name: 'Simplifying Expressions',
  category: 'expressions',
  glyph: '2x',
  blurb: 'Gathering what matches, and opening brackets when it helps.',
  answerInput: 'expr',
  dependsOn: ['order-ops', 'int-muldiv'],
  levels: LEVELS,
};
