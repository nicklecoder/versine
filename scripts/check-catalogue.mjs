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
const { SKILLS, CATEGORIES, validateGraph } = await import(join(ROOT, 'web/engine/registry.js'));

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

// The map is built by walking the categories and collecting each one's skills,
// so a skill filed under a name that is not declared does not appear on it --
// silently, with no error anywhere. That is a typo away at any time.
const known = new Set(CATEGORIES.map((c) => c.id));
for (const s of SKILLS) {
  if (!known.has(s.category)) {
    fail.push(`${s.id}: category "${s.category}" is not declared, so the skill would not appear on the map`);
  }
}
const ids = CATEGORIES.map((c) => c.id);
if (new Set(ids).size !== ids.length) fail.push('two categories share an id');

// A level's slug is its identity in the database. Positions used to be, which
// meant inserting a level silently reattributed every student's history to
// different levels. Slugs must therefore exist, be unique within their skill,
// and look like slugs -- and once published they must not be edited, which no
// check can enforce but the comment beside them says.
for (const s of SKILLS) {
  const seen = new Set();
  s.levels.forEach((l, i) => {
    const at = `${s.id} L${i + 1} "${l.name}"`;
    if (!l.slug) { fail.push(`${at}: has no slug; it is the level's identity in the database`); return; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(l.slug)) fail.push(`${at}: slug "${l.slug}" is not lower-case-kebab`);
    if (seen.has(l.slug)) fail.push(`${at}: slug "${l.slug}" is already used in this skill`);
    seen.add(l.slug);
  });
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
const filled = CATEGORIES.filter((c) => SKILLS.some((s) => s.category === c.id)).length;
const strategy = SKILLS.flatMap((s) => s.levels.filter((l) => l.kind === 'strategy')).length;

if (fail.length) {
  console.log(`${fail.length} problem(s):`);
  for (const f of fail) console.log('  ' + f);
  process.exit(1);
}
console.log(`${SKILLS.length} skills, ${levels} levels (${strategy} strategy), `
  + `${filled} of ${CATEGORIES.length} categories in use — catalogue valid`);
