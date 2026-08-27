/**
 * Fractions.
 *
 * Kept as plain `{ n, d }` rather than reduced on construction, because the
 * unreduced form is often the thing being taught: 1/2 + 1/3 becomes 3/6 + 2/6,
 * and showing `3/6` is the whole point of that step.
 *
 * @typedef {{n:number, d:number}} Frac
 */

export const gcd = (a, b) => {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a || 1;
};

export const lcm = (a, b) => Math.abs(a * b) / gcd(a, b);

/** @returns {Frac} */
export function frac(n, d) {
  if (d === 0) throw new Error('fraction with zero denominator');
  // Keep the sign in the numerator so formatting and comparison stay simple.
  return d < 0 ? { n: -n, d: -d } : { n, d };
}

/** @param {Frac} f @returns {Frac} */
export function reduce(f) {
  const g = gcd(f.n, f.d);
  return frac(f.n / g, f.d / g);
}

export const isSimplest = (f) => gcd(f.n, f.d) === 1;

export const isWhole = (f) => f.n % f.d === 0;

export const isProper = (f) => Math.abs(f.n) < f.d;

/**
 * Add or subtract over the *lowest* common denominator, which is what gets
 * taught — the product would work arithmetically but produces uglier numbers.
 * @returns {{common:number, left:Frac, right:Frac, result:Frac}}
 */
export function combine(a, b, op) {
  const common = lcm(a.d, b.d);
  const left = frac(a.n * (common / a.d), common);
  const right = frac(b.n * (common / b.d), common);
  const result = frac(op === '-' ? left.n - right.n : left.n + right.n, common);
  return { common, left, right, result };
}

/** @returns {Frac} unreduced, so `2/3 × 3/4 = 6/12` can be shown as drawn. */
export const multiply = (a, b) => frac(a.n * b.n, a.d * b.d);

/** Dividing is multiplying by the flip. @returns {Frac} */
export const divide = (a, b) => frac(a.n * b.d, a.d * b.n);

/** Equal in value, regardless of how either is written. */
export const equals = (a, b) => a.n * b.d === b.n * a.d;

export const toNumber = (f) => f.n / f.d;

export const format = (f) => (f.d === 1 ? `${f.n}` : `${f.n}/${f.d}`);
