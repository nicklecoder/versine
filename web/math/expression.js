import { minus } from '../ui/dom.js';

/**
 * Small arithmetic expressions, and the step-by-step story of evaluating one.
 *
 * An expression is a nested array of numbers and operator strings, where a
 * nested array is a bracketed group:
 *
 *     [3, '+', 4, '×', 2]          →  3 + 4 × 2
 *     [[3, '+', 4], '×', 2]        →  (3 + 4) × 2
 *
 * `evaluate` doesn't just return the answer — it returns every rewrite along
 * the way, and which rule justified it. That sequence *is* the lesson for this
 * skill, so it has to come out of the maths rather than be written by hand.
 */

const PRECEDENCE = { '^': 3, '×': 2, '÷': 2, '+': 1, '−': 1 };

const RULE = {
  '^': 'powers',
  '×': 'multiply and divide',
  '÷': 'multiply and divide',
  '+': 'add and subtract',
  '−': 'add and subtract',
};

const SUPERSCRIPT = { 2: '²', 3: '³' };

function apply(a, op, b) {
  switch (op) {
    case '+': return a + b;
    case '−': return a - b;
    case '×': return a * b;
    case '÷': return b === 0 ? NaN : a / b;
    case '^': return a ** b;
    default: return NaN;
  }
}

/** Render an expression the way it should be read. */
export function render(node, top = true) {
  if (!Array.isArray(node)) return minus(node);

  const parts = [];
  for (let i = 0; i < node.length; i++) {
    const item = node[i];
    // Powers are written as superscripts rather than with a caret.
    if (node[i + 1] === '^' && SUPERSCRIPT[node[i + 2]]) {
      parts.push(render(item, false) + SUPERSCRIPT[node[i + 2]]);
      i += 2;
      continue;
    }
    parts.push(Array.isArray(item) ? render(item, false) : minus(item));
  }

  const body = parts.join(' ');
  return top ? body : `(${body})`;
}

/**
 * Perform exactly one reduction: innermost bracket first, then the
 * highest-precedence operator, leftmost when tied.
 * @returns {{node:Array, rule:string}|null} null when fully reduced
 */
function reduceOnce(node) {
  for (let i = 0; i < node.length; i++) {
    const item = node[i];
    if (!Array.isArray(item)) continue;

    if (item.length === 1) {                       // a stray (7)
      const next = node.slice();
      next[i] = item[0];
      return { node: next, rule: 'brackets' };
    }
    const inner = reduceOnce(item);
    if (inner) {
      const next = node.slice();
      // Unwrap in the same step: a student writes "7 × 2", never "(7) × 2".
      next[i] = inner.node.length === 1 ? inner.node[0] : inner.node;
      return { node: next, rule: 'brackets' };
    }
  }

  let at = -1;
  let best = 0;
  for (let i = 1; i < node.length; i += 2) {
    const p = PRECEDENCE[node[i]];
    if (p > best) { best = p; at = i; }
  }
  if (at < 0) return null;

  const value = apply(node[at - 1], node[at], node[at + 1]);
  return {
    node: [...node.slice(0, at - 1), value, ...node.slice(at + 2)],
    rule: RULE[node[at]],
  };
}

/**
 * The whole evaluation, as the lines a student would write.
 * @returns {{lines:string[], rules:string[], value:number, ok:boolean}}
 */
export function evaluate(expression) {
  const lines = [render(expression)];
  const rules = [];
  let node = expression;
  let ok = true;

  for (let guard = 0; guard < 24; guard++) {
    const step = reduceOnce(node);
    if (!step) break;
    node = step.node;
    rules.push(step.rule);
    lines.push(render(node));

    // Reject anything that stops being whole-number arithmetic partway.
    const flat = JSON.stringify(node).match(/-?\d+(\.\d+)?/g) ?? [];
    if (flat.some((n) => !Number.isInteger(Number(n)) || Math.abs(Number(n)) > 400)) {
      ok = false;
      break;
    }
  }

  const value = Array.isArray(node) ? node[0] : node;
  return { lines, rules, value, ok: ok && Number.isInteger(value) };
}
