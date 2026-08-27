/**
 * Seeded, reproducible RNG (mulberry32). Seeding means a session can be
 * replayed exactly -- useful for "same problems, race your sibling" later.
 */

/**
 * @param {number} [seed]
 * @returns {Rng}
 */
export function makeRng(seed = (Date.now() ^ (Math.random() * 0xffffffff)) >>> 0) {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    seed,
    float: next,
    /** Inclusive on both ends. */
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    /** Inclusive, but never zero. */
    nonZero(min, max) {
      for (let i = 0; i < 50; i++) {
        const v = this.int(min, max);
        if (v !== 0) return v;
      }
      return min < 0 ? -1 : 1;
    },
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    shuffle(arr) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
  };
}

/**
 * @typedef {object} Rng
 * @property {number} seed
 * @property {() => number} float
 * @property {(min:number,max:number) => number} int
 * @property {(min:number,max:number) => number} nonZero
 * @property {<T>(arr:T[]) => T} pick
 * @property {(p:number) => boolean} chance
 * @property {() => number} sign
 * @property {<T>(arr:T[]) => T[]} shuffle
 */
