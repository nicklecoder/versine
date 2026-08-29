/**
 * The skill catalogue. Add a module here and it appears on the map --
 * nothing else in the engine needs to know it exists.
 */
import intAddSub from '../skills/int-addsub.js';
import intMulDiv from '../skills/int-muldiv.js';
import fracAddSub from '../skills/frac-addsub.js';
import fracMulDiv from '../skills/frac-muldiv.js';
import fracMixed from '../skills/frac-mixed.js';
import fracEquiv from '../skills/frac-equiv.js';
import orderOps from '../skills/order-ops.js';
import exponents from '../skills/exponents.js';
import roots from '../skills/roots.js';
import coords from '../skills/coords.js';
import decimals from '../skills/decimals.js';
import percents from '../skills/percents.js';
import simplify from '../skills/simplify.js';
import equations from '../skills/equations.js';

/** @type {any[]} */
export const SKILLS = [intAddSub, intMulDiv, fracAddSub, fracMulDiv, fracMixed, fracEquiv,
  orderOps, exponents, roots, coords, decimals, percents, simplify, equations];

export const getSkill = (id) => SKILLS.find((s) => s.id === id);

/**
 * How the map is grouped, in two layers.
 *
 * A subject is the broad territory -- Arithmetic, Algebra, Geometry. A
 * category is a working group of three to ten skills inside it. Two layers
 * rather than one because "Trigonometry" and "Calculus" are territories, not
 * groups: filing every trigonometric skill under one heading would produce
 * exactly the twenty-skill bucket that tells a student nothing.
 *
 * A subject is where a category is *filed*, not a claim about which branch
 * owns it. The separation of arithmetic from algebra from geometry is an
 * accident of how textbooks are sold, and several categories genuinely sit in
 * two places: Coordinates is coordinate geometry and it is linear functions,
 * Powers & Roots is arithmetic and it is algebra. Each is filed once, where a
 * student is most likely to look for it, and the comments say where else it
 * belongs. Nothing in the engine treats a subject as ownership, so a skill is
 * never kept from anything by the box it sits in.
 *
 * Expressions and Equations are separate categories because that boundary is
 * real rather than a size cut: an expression is a thing you rearrange, an
 * equation is a claim you test.
 *
 * Categories and subjects with no skills yet are declared anyway. They cost a
 * line, they say what the catalogue is for, and they stop the next skill being
 * filed under whichever existing name is least wrong. Empty ones do not render.
 */
export const SUBJECTS = [
  { id: 'arithmetic', name: 'Arithmetic' },
  { id: 'algebra', name: 'Algebra' },
  { id: 'geometry', name: 'Geometry' },
  { id: 'trigonometry', name: 'Trigonometry' },
  { id: 'data', name: 'Chance & Data' },
];

/** Names are short: they sit in a card footer beside the solved count. */
export const CATEGORIES = [
  // ── Arithmetic ────────────────────────────────────────────────────────
  { id: 'integers', subject: 'arithmetic', name: 'Integers', glyph: '±' },
  { id: 'fractions', subject: 'arithmetic', name: 'Fractions', glyph: '½' },
  { id: 'decimals', subject: 'arithmetic', name: 'Decimals & Percents', glyph: '%' },
  // Also algebra: the exponent rules are the same rules with letters in them.
  { id: 'powers', subject: 'arithmetic', name: 'Powers & Roots', glyph: 'ⁿ' },
  { id: 'factors', subject: 'arithmetic', name: 'Factors & Multiples', glyph: '×' },

  // ── Algebra ───────────────────────────────────────────────────────────
  { id: 'expressions', subject: 'algebra', name: 'Expressions', glyph: 'x' },
  { id: 'equations', subject: 'algebra', name: 'Equations', glyph: '=' },
  { id: 'sequences', subject: 'algebra', name: 'Sequences', glyph: '…' },
  // Also analysis: this is where calculus readiness is actually decided.
  { id: 'functions', subject: 'algebra', name: 'Functions', glyph: 'ƒ' },

  // ── Geometry ──────────────────────────────────────────────────────────
  // Also algebra: reading a point off a grid and graphing a line are one skill.
  { id: 'coordinates', subject: 'geometry', name: 'Coordinates', glyph: '⌗' },
  { id: 'angles', subject: 'geometry', name: 'Lines & Angles', glyph: '∠' },
  { id: 'shapes', subject: 'geometry', name: 'Shapes', glyph: '△' },
  { id: 'measure', subject: 'geometry', name: 'Area & Volume', glyph: '▭' },

  // ── Trigonometry ──────────────────────────────────────────────────────
  { id: 'right-triangles', subject: 'trigonometry', name: 'Right Triangles', glyph: '◺' },
  { id: 'unit-circle', subject: 'trigonometry', name: 'The Unit Circle', glyph: '◯' },
  { id: 'identities', subject: 'trigonometry', name: 'Identities', glyph: '≡' },

  // ── Chance & Data ─────────────────────────────────────────────────────
  { id: 'probability', subject: 'data', name: 'Probability', glyph: '⚄' },
  { id: 'statistics', subject: 'data', name: 'Statistics', glyph: '⌾' },
];

/** The subject a category is filed under. */
export const subjectOf = (categoryId) => {
  const cat = CATEGORIES.find((c) => c.id === categoryId);
  return SUBJECTS.find((s) => s.id === cat?.subject) ?? null;
};

/**
 * The learning graph.
 *
 * Nodes are exactly what a student sees: Skills, and the Levels inside them.
 * There is no separate vocabulary to maintain — the relationships are plain
 * many-to-many links between artefacts that already exist in the UI.
 *
 * `dependsOn` is deliberately soft. It says "this builds on that", not "this
 * is forbidden until that is finished". Level unlocking inside a Skill is a
 * separate, hard rule; these edges only inform and advise.
 *
 *   Skill.dependsOn  -> ['int-addsub', ...]                 coarse
 *   Level.dependsOn  -> [{ skill: 'int-addsub', level: 4 }] precise
 *
 * A Level may only depend on Skills its parent Skill already declares, so the
 * fine-grained edges can never contradict the coarse ones.
 */

/** @returns {string[]} skill ids this skill declares a dependency on */
export const dependenciesOf = (skill) => skill.dependsOn ?? [];

/** @returns {Array<{skill:string, level:number}>} */
export const levelDependencies = (skill, levelIndex) =>
  skill.levels[levelIndex]?.dependsOn ?? [];

/** Skills that declare a dependency on `skillId`. */
export const dependentsOf = (skillId) =>
  SKILLS.filter((s) => dependenciesOf(s).includes(skillId));

/**
 * How deep a skill sits in the graph: the longest chain of dependencies
 * beneath it. Foundational skills are 0. Used to weight advanced work more
 * heavily than the basics it rests on.
 */
export function depthOf(skillId, seen = new Set()) {
  if (seen.has(skillId)) return 0;            // cycles are caught elsewhere
  const skill = SKILLS.find((s) => s.id === skillId);
  const deps = dependenciesOf(skill ?? {});
  if (!deps.length) return 0;
  const next = new Set([...seen, skillId]);
  return 1 + Math.max(...deps.map((d) => depthOf(d, next)));
}

/**
 * Check the graph is internally consistent. Called by the test suite; cheap
 * enough to call anywhere.
 * @returns {string[]} problems found, empty when the graph is sound
 */
export function validateGraph() {
  const problems = [];
  const byId = new Map(SKILLS.map((s) => [s.id, s]));

  for (const skill of SKILLS) {
    for (const dep of dependenciesOf(skill)) {
      if (!byId.has(dep)) problems.push(`${skill.id} depends on unknown skill "${dep}"`);
      if (dep === skill.id) problems.push(`${skill.id} depends on itself`);
    }

    skill.levels.forEach((level, i) => {
      for (const link of levelDependencies(skill, i)) {
        const target = byId.get(link.skill);
        if (!target) {
          problems.push(`${skill.id}[${i}] depends on unknown skill "${link.skill}"`);
          continue;
        }
        if (!dependenciesOf(skill).includes(link.skill)) {
          problems.push(
            `${skill.id}[${i}] depends on ${link.skill} but ${skill.id} does not declare it`);
        }
        if (!(link.level >= 0 && link.level < target.levels.length)) {
          problems.push(`${skill.id}[${i}] depends on ${link.skill}[${link.level}], out of range`);
        }
      }
    });
  }

  // No cycles: a skill must not, through any chain, depend on itself.
  const seen = new Set();
  const walk = (id, path) => {
    if (path.includes(id)) { problems.push(`cycle: ${[...path, id].join(' -> ')}`); return; }
    if (seen.has(id)) return;
    seen.add(id);
    for (const dep of dependenciesOf(byId.get(id) ?? {})) walk(dep, [...path, id]);
  };
  for (const s of SKILLS) walk(s.id, []);

  return problems;
}
