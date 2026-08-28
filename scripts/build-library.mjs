/**
 * Materialise every level's problem space into a library.
 *
 * The point is not speed. It is that a drilling platform does not need to
 * *solve* anything: if the problems and their acceptable answers are written
 * down ahead of time, judging a student's answer is a lookup, and the whole
 * computer-algebra problem -- which is undecidable in general -- never arises.
 *
 * Two properties this build has to guarantee:
 *
 *   Determinism. An unchanged level must produce a byte-identical file, or
 *   every rebuild rewrites all 43 libraries and the diff is useless for
 *   review. Seeds are derived from the skill id and level, never from the
 *   clock or from iteration order.
 *
 *   Honesty about coverage. A level whose space is smaller than the cap is
 *   recorded as exhaustive; one that hits the cap is recorded as a sample.
 *   The difference decides whether problems can be dealt without replacement.
 *
 * Usage: node scripts/build-library.mjs [--cap N] [--check]
 *   --check  build into memory and compare against what is on disk, exiting
 *            non-zero on any difference. For CI and for catching a generator
 *            change that nobody rebuilt.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// The generators reach for the DOM when they build prompt markup; none of it
// is inspected here, so a stub is enough to run them outside a browser.
const stub = () => ({
  classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
  setAttribute() {}, append() {}, addEventListener() {}, focus() {},
  style: { setProperty() {} },
});
globalThis.document = { createElement: stub, createTextNode: (t) => ({ t }), activeElement: null };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'web', 'library');

const { SKILLS } = await import(join(ROOT, 'web/engine/registry.js'));
const { makeRng } = await import(join(ROOT, 'web/engine/rng.js'));
const { getType } = await import(join(ROOT, 'web/math/answer.js'));

const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const capArg = args.indexOf('--cap');
const DEFAULT_CAP = capArg > -1 ? Number(args[capArg + 1]) : 1000;

/** Draws to make before accepting that a level's space has been exhausted. */
const PATIENCE = 40000;

/** A level with fewer problems than this is memorisable rather than drillable. */
const FLOOR = 50;

/** Stable numeric seed from a level's identity, so rebuilds are reproducible. */
function seedFor(skillId, level) {
  let h = 2166136261;
  for (const ch of `${skillId}:${level}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function buildLevel(skill, level) {
  const cap = skill.levels[level].libraryCap ?? DEFAULT_CAP;
  const rng = makeRng(seedFor(skill.id, level));
  const byText = new Map();
  let sinceNew = 0;

  for (let i = 0; i < PATIENCE && byText.size < cap; i++) {
    const p = skill.generate(rng, level);
    if (byText.has(p.text)) { sinceNew++; continue; }
    const type = getType(p.answer.type);
    // The stated answer must survive its own parser -- the same check the
    // session makes when a student types it back.
    const round = type.parse(type.format(p.answer.value));
    if (!round.ok || !type.equals(round.value, p.answer.value)) {
      throw new Error(`${skill.id} L${level + 1}: "${p.text}" answer does not round-trip`);
    }
    byText.set(p.text, {
      ...p,
      answer: {
        ...p.answer,
        // Acceptable surface forms. Today every answer type has exactly one
        // canonical rendering, so this is a single entry; it exists as a list
        // because expression answers will have several (factored as well as
        // expanded) and the format should not have to change then.
        accept: [type.format(p.answer.value)],
      },
    });
    sinceNew = 0;
  }

  // Sort by text so the file is stable regardless of the order draws happened
  // to arrive in, which keeps diffs readable.
  const problems = [...byText.values()].sort((a, b) => (a.text < b.text ? -1 : a.text > b.text ? 1 : 0));
  return {
    skill: skill.id,
    level,
    levelName: skill.levels[level].name,
    count: problems.length,
    // Exhaustive means: we stopped finding new problems long before the cap,
    // so this is the whole space and a run can deal without replacement.
    exhaustive: problems.length < cap && sinceNew > PATIENCE / 4,
    cap,
    problems,
  };
}

const manifest = [];
const warnings = [];
let changed = 0, bytes = 0;
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

for (const skill of SKILLS) {
  for (let level = 0; level < skill.levels.length; level++) {
    const lib = buildLevel(skill, level);
    const json = JSON.stringify(lib) + '\n';
    const path = join(OUT, `${skill.id}-${level}.json`);
    const prev = existsSync(path) ? readFileSync(path, 'utf8') : null;

    if (prev !== json) {
      changed++;
      if (CHECK) warnings.push(`STALE  ${skill.id} L${level + 1} — library differs from the generator`);
      else writeFileSync(path, json);
    }
    bytes += json.length;
    if (lib.count < FLOOR) warnings.push(`THIN   ${skill.id} L${level + 1} "${lib.levelName}" — only ${lib.count} problems`);
    manifest.push({
      skill: skill.id, level, name: lib.levelName,
      count: lib.count, exhaustive: lib.exhaustive,
      file: `${skill.id}-${level}.json`,
    });
  }
}

const manifestJson = JSON.stringify({ built: manifest.length, levels: manifest }, null, 2) + '\n';
const manifestPath = join(OUT, 'manifest.json');
const prevManifest = existsSync(manifestPath) ? readFileSync(manifestPath, 'utf8') : null;
if (prevManifest !== manifestJson) {
  if (CHECK) warnings.push('STALE  manifest.json');
  else writeFileSync(manifestPath, manifestJson);
}

const exhaustive = manifest.filter((m) => m.exhaustive).length;
console.log(`${manifest.length} levels, ${manifest.reduce((n, m) => n + m.count, 0).toLocaleString()} problems, ${(bytes / 1024 / 1024).toFixed(1)} MB`);
console.log(`${exhaustive} levels exhaustive (can deal without replacement), ${manifest.length - exhaustive} sampled at the cap`);
console.log(CHECK ? `${changed} file(s) would change` : `${changed} file(s) written`);
for (const w of warnings) console.log('  ' + w);
if (CHECK && changed) { console.error('\nLibraries are stale. Run: node scripts/build-library.mjs'); process.exit(1); }
