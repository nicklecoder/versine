/**
 * Catalogue authoring tool: builds the problem library for percents.
 *
 * NOT part of the running application. Nothing here is served to a browser
 * or imported by the server. It exists to produce web/library/ once, and to
 * regenerate it on the rare occasion a whole level needs rebuilding.
 *
 * Run via: node scripts/build-library.mjs
 */
import * as T from '../terms.js';
import { reduce } from '../../web/math/frac.js';
import { LAST_LEVEL, PAR_SECONDS } from '../../web/skills/percents.js';

const dec = (n, places) => ({ n, d: 10 ** places });
const show = (v) => {
  const whole = Math.floor(Math.abs(v.n) / v.d), rem = Math.abs(v.n) - whole * v.d;
  const places = String(v.d).length - 1;
  const frac = rem ? '.' + String(rem).padStart(places, '0').replace(/0+$/, '') : '';
  return (v.n < 0 ? '−' : '') + whole + frac;
};

/** Percent means hundredths, read straight off. */
function outOfHundred(rng) {
  const p = rng.int(2, 99);
  const r = reduce({ n: p, d: 100 });
  return {
    prompt: [T.prose(`${p}% of a whole, as a fraction in lowest terms.`),
             T.frac(null, r.d, 2)],
    text: `${p}% = ?/${r.d}`,
    answer: { type: 'int', value: r.n },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}%`, `${p}/100`, `${r.n}/${r.d}`],
      rules: ['percent means hundredths', 'in lowest terms'],
      hint: 'A hundred of what?',
    },
    explain: `${p}% is ${p} out of 100, which simplifies to ${r.n}/${r.d}.`,
  };
}

/** Two places, and knowing why it is two. */
function asDecimal(rng) {
  const p = rng.chance(0.3) ? rng.int(1, 99) * 10 : rng.int(1, 99);
  return {
    prompt: [T.prose(`Write ${p}% as a decimal.`)],
    text: `${p}% as a decimal`,
    answer: { type: 'decimal', value: dec(p, 2) },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}%`, `${p}/100`, `${p} ÷ 100`, show(dec(p, 2))],
      rules: ['percent means hundredths', 'which is a division', 'two places to the right'],
      hint: 'Dividing by a hundred moves the point how far?',
    },
    explain: `${p}% is ${p}/100. Dividing by 100 moves the point two places, `
      + `giving ${show(dec(p, 2))}.`,
  };
}

/** A part of a whole, when the whole is not a hundred. */
function percentOf(rng) {
  const p = rng.pick([5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90]);
  const base = rng.pick([20, 40, 60, 80, 120, 140, 160, 180, 200, 240, 300, 400, 500]);
  const value = (p * base) / 100;
  if (!Number.isInteger(value)) return percentOf(rng);
  return {
    prompt: [T.prose(`What is ${p}% of ${base}?`)],
    text: `${p}% of ${base}`,
    answer: { type: 'int', value },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}% of ${base}`, `${p}/100 × ${base}`,
              `${base} ÷ 100 = ${base / 100}, then × ${p}`, String(value)],
      rules: ['percent means hundredths', 'one percent first', 'then that many'],
      hint: 'A hundred of what, this time?',
    },
    explain: `One percent of ${base} is ${base / 100}, so ${p}% is `
      + `${p} × ${base / 100} = ${value}.`,
  };
}

/** The question backwards. */
function whatPercent(rng) {
  const p = rng.pick([5, 10, 20, 25, 40, 50, 60, 75, 80]);
  const base = rng.pick([20, 40, 50, 60, 80, 100, 120, 200, 400]);
  const part = (p * base) / 100;
  if (!Number.isInteger(part) || part === 0) return whatPercent(rng);
  return {
    prompt: [T.prose(`${part} is what percent of ${base}?`)],
    text: `${part} is ?% of ${base}`,
    answer: { type: 'int', value: p },
    visual: {
      kind: 'evalmodel',
      lines: [`${part} out of ${base}`, `${part}/${base}`,
              `× 100 to make it hundredths`, `${p}%`],
      rules: ['write the part over the whole', 'percent is per hundred', 'so'],
      hint: 'Which number is the whole here?',
    },
    explain: `${part} out of ${base} is ${part}/${base}. Multiplying by 100 turns `
      + `that into hundredths: ${p}%.`,
  };
}

/** Increase and decrease -- and which whole each is of. */
function change(rng) {
  const p = rng.pick([10, 20, 25, 50, 5, 40, 75]);
  const base = rng.pick([20, 40, 60, 80, 120, 160, 200, 240, 400]);
  const delta = (p * base) / 100;
  if (!Number.isInteger(delta)) return change(rng);
  const up = rng.chance(0.55);
  const value = up ? base + delta : base - delta;
  return {
    prompt: [T.prose(`${base} ${up ? 'increased' : 'decreased'} by ${p}%. What is it now?`)],
    text: `${base} ${up ? 'up' : 'down'} ${p}%`,
    answer: { type: 'int', value },
    visual: {
      kind: 'evalmodel',
      lines: [`${p}% of ${base}`, String(delta),
              `${base} ${up ? '+' : '−'} ${delta}`, String(value)],
      rules: ['the change is a percent of the ORIGINAL', 'which is', 'so the new amount is'],
      hint: 'The percent is of which number?',
    },
    explain: `${p}% of ${base} is ${delta}, so ${base} ${up ? 'rises' : 'falls'} to ${value}. `
      + `Note the percent is of the original ${base} — going back the other way by ${p}% `
      + `would be ${p}% of ${value}, which is a different amount.`,
  };
}

/** @param {import('../../web/engine/rng.js').Rng} rng @param {number} level */
export function generate(rng, level) {
  const build = (lv) => {
    switch (lv) {
      case 0: return outOfHundred(rng);
      case 1: return asDecimal(rng);
      case 2: return percentOf(rng);
      case 3: return whatPercent(rng);
      case 4: return change(rng);
      default: return rng.pick([outOfHundred, asDecimal, percentOf, whatPercent, change])(rng);
    }
  };
  const p = build(level >= LAST_LEVEL ? rng.int(0, LAST_LEVEL - 1) : level);
  p.parSeconds = PAR_SECONDS[level];
  return p;
}
