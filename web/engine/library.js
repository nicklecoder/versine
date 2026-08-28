/**
 * Serving problems from a pre-built library.
 *
 * Every level's problems and their acceptable answers are written down at
 * build time (see scripts/build-library.mjs), so nothing here has to *solve*
 * anything -- judging an answer is a lookup, and the undecidable business of
 * deciding whether two expressions are equal never comes up.
 *
 * The other reason to hold the whole level at once: dealing. Drawing at random
 * from a 116-problem level shows a student about 17 distinct problems in a
 * 20-problem run. Dealing from a shuffled deck shows 20. On levels this small
 * -- most of them -- that difference is the whole variety budget.
 */

const cache = new Map();

/** @returns {Promise<{count:number, exhaustive:boolean, problems:object[]}>} */
export async function loadLevel(skillId, level) {
  const key = `${skillId}-${level}`;
  if (!cache.has(key)) {
    cache.set(key, fetch(`library/${key}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`No library for ${key} (${r.status})`);
        return r.json();
      })
      .catch((err) => { cache.delete(key); throw err; }));
  }
  return cache.get(key);
}

/**
 * A shuffled deck over a level's problems.
 *
 * Deals without replacement until the deck runs out, then reshuffles -- so a
 * run never repeats a problem unless it has been through every one of them.
 * The reshuffle avoids handing back the problem that was just seen, which is
 * the one repeat a student would actually notice.
 */
export function dealer(problems, rng = Math.random) {
  let deck = [];
  let last = null;

  const shuffle = () => {
    deck = problems.map((_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    // Don't open a fresh deck with the card that closed the last one.
    if (deck.length > 1 && deck[deck.length - 1] === last) {
      [deck[deck.length - 1], deck[0]] = [deck[0], deck[deck.length - 1]];
    }
  };

  return {
    next() {
      if (!deck.length) shuffle();
      last = deck.pop();
      return problems[last];
    },
    get remaining() { return deck.length; },
  };
}
