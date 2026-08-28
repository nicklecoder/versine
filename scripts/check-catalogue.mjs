/**
 * Validate the catalogue's structure: the learning graph, and the rules that
 * govern where a strategy level may sit.
 *
 * Complements scripts/check-library.py, which validates the problems
 * themselves. This one checks the shape of the catalogue around them, and
 * deliberately loads only what the browser loads -- if this passes but the app
 * breaks, the difference is a clue.
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const stub = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, append() {}, addEventListener() {}, focus() {},
  style: { setProperty() {} },
});
globalThis.document = { createElement: stub, createTextNode: (t) => ({ t }), activeElement: null };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { SKILLS, validateGraph } = await import(join(ROOT, 'web/engine/registry.js'));

const fail = [];

for (const p of validateGraph()) fail.push(`graph: ${JSON.stringify(p)}`);

// Generation belongs to tools/generators. A skill that still carries it would
// ship generation logic to students and invite a silent second source of
// problems alongside the reviewed library.
for (const s of SKILLS) {
  if (typeof s.generate === 'function') {
    fail.push(`${s.id}: still exposes generate(); generators belong in tools/generators/`);
  }
}

// Strategy levels drill which method to reach for. They must sit where the
// choice first costs something -- never first (nothing to choose between yet),
// never last (that slot is the skill's combined final level), and never
// leaning on a skill their own skill has not declared.
for (const s of SKILLS) {
  s.levels.forEach((l, i) => {
    if (l.kind !== 'strategy') return;
    const at = `${s.id} L${i + 1} "${l.name}"`;
    if (i === 0) fail.push(`${at}: a strategy level cannot be a skill's first level`);
    if (i === s.levels.length - 1) fail.push(`${at}: a strategy level cannot be the last level`);
    if (!Array.isArray(l.dependsOn) || !l.dependsOn.length) {
      fail.push(`${at}: must name the skill whose need it arbitrates`);
    }
    for (const d of l.dependsOn ?? []) {
      if (!(s.dependsOn ?? []).includes(d.skill)) {
        fail.push(`${at}: leans on ${d.skill}, which ${s.id} does not declare`);
      }
    }
  });
}

const levels = SKILLS.reduce((n, s) => n + s.levels.length, 0);
const strategy = SKILLS.flatMap((s) => s.levels.filter((l) => l.kind === 'strategy')).length;

if (fail.length) {
  console.log(`${fail.length} problem(s):`);
  for (const f of fail) console.log('  ' + f);
  process.exit(1);
}
console.log(`${SKILLS.length} skills, ${levels} levels (${strategy} strategy) — catalogue valid`);
