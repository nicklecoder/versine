/**
 * Scoring is deliberately shaped to make *thinking* the winning strategy:
 *  - the speed bonus only exists on a clean (first-try) solve, so guessing
 *    fast is strictly worse than answering slowly and correctly;
 *  - a solve after a miss still counts, but at half value;
 *  - the streak multiplier rewards sustained accuracy, not bursts.
 */

const BASE = 100;

/** Harder levels are worth more, so grinding level 1 never beats climbing. */
export const levelMultiplier = (level) => 1 + level * 0.35;

/**
 * @param {{level:number, elapsedMs:number, parMs:number, clean:boolean, streak:number}} p
 */
export function scoreProblem({ level, elapsedMs, parMs, clean, streak }) {
  const levelMult = levelMultiplier(level);
  const streakMult = 1 + Math.min(streak, 12) * 0.05;

  if (!clean) return Math.round(BASE * levelMult * 0.5);

  // 1.0 when instant, 0 at twice par. Never negative.
  const speed = Math.max(0, Math.min(1, 2 - elapsedMs / Math.max(parMs, 1)));
  return Math.round(BASE * levelMult * (1 + 0.6 * speed) * streakMult);
}
