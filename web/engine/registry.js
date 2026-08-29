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

/** @type {any[]} */
export const SKILLS = [intAddSub, intMulDiv, fracAddSub, fracMulDiv, fracMixed, fracEquiv,
  orderOps, exponents, roots, coords, decimals, percents, simplify];

export const getSkill = (id) => SKILLS.find((s) => s.id === id);

/**
 * How the map is grouped.
 *
 * By the object being worked with, never by the branch of mathematics it is
 * traditionally filed under. That is deliberate: the separation of arithmetic
 * from algebra from geometry from trigonometry is an accident of how textbooks
 * are sold, and it hides the fact that they are the same subject. Grouping by
 * object puts things where they belong to each other -- Graphs holds
 * coordinate geometry beside linear functions, which a textbook would file in
 * two different years.
 *
 * A single "Algebra" bucket would swallow twenty skills and tell a student
 * nothing. Expressions and Equations are separated because the boundary is
 * real rather than a size cut: an expression is a thing you rearrange, an
 * equation is a claim you test, and blurring the two is behind a great deal of
 * what looks like carelessness later.
 *
 * Categories with no skills yet are declared anyway. They cost a line, they
 * say what the catalogue is for, and they stop the next skill being filed
 * under whichever existing name is least wrong. Empty ones do not render.
 *
 * Names are short because they sit in a card footer beside the solved count.
 */
export const CATEGORIES = [
  { id: 'number', name: 'Number', glyph: '±' },
  { id: 'parts', name: 'Parts & Wholes', glyph: '½' },
  { id: 'powers', name: 'Powers & Roots', glyph: 'ⁿ' },
  { id: 'expressions', name: 'Expressions', glyph: 'x' },
  { id: 'equations', name: 'Equations', glyph: '=' },
  { id: 'graphs', name: 'Graphs', glyph: '⌗' },
  { id: 'shape', name: 'Shape & Space', glyph: '△' },
  { id: 'trig', name: 'Trigonometry', glyph: '∡' },
  { id: 'functions', name: 'Functions', glyph: 'ƒ' },
  { id: 'chance', name: 'Chance & Data', glyph: '⚄' },
];

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
