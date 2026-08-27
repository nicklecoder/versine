/**
 * The number line. This is the whole pedagogical payload of the integer
 * skills, so it earns real care.
 *
 * Arrows *chain*: the first runs 0 → a, the second starts where the first
 * finished and is flipped by the operator, so the last arrowhead lands exactly
 * on the answer. (The original prototype drew both arrows from zero, which
 * meant subtraction never pointed at the result.)
 *
 * @typedef {object} Step
 * @property {number} from
 * @property {number} to
 * @property {string} [label]
 *
 * @typedef {object} LineSpec
 * @property {number} min
 * @property {number} max
 * @property {Step[]} steps
 * @property {number} answer
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const STEP_COLORS = ['var(--vec-1)', 'var(--vec-2)', 'var(--vec-3)'];
const RAW_COLORS = ['#ff5f6d', '#35d6ff', '#c084fc'];

const node = (name, attrs = {}) => {
  const n = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};

/** Pick a tick interval that keeps labels from colliding at this width. */
function labelInterval(span, usableWidth) {
  const maxLabels = Math.max(5, Math.floor(usableWidth / 46));
  for (const step of [1, 2, 5, 10, 20, 25, 50]) {
    if (span / step <= maxLabels) return step;
  }
  return 100;
}

/**
 * How high hop `i` arcs above the axis. Height scales with the hop's length,
 * the way it is drawn in a textbook: a long jump is a big arc, a short one a
 * small hop that tucks underneath. The `i * 12` term breaks ties so that two
 * equal-and-opposite hops (5 then −5) don't land exactly on top of each other.
 *
 * A quadratic Bezier peaks halfway to its control point, so the control point
 * is placed at twice this -- getting that wrong is what made the arcs collide.
 */
const apexOf = (dx, i) => Math.min(96, Math.max(26, 22 + 0.22 * Math.abs(dx) + i * 12));

/**
 * While a problem is being asked, only the *first* hop is drawn: it anchors
 * where you start without handing over where you finish. The second hop is
 * revealed once an answer has been committed. (An earlier version drew the
 * whole chain up front, which quietly turned the teaching aid into the answer
 * key.)
 *
 * @param {SVGSVGElement} svg
 * @param {LineSpec} spec
 * `reveal` controls how many hops are *drawn*, but every hop still counts
 * toward the layout -- otherwise the line would change height the moment the
 * answer appeared, and the whole card would jump.
 *
 * @param {{reveal?:number, showAnswer?:boolean, animateFrom?:number|null,
 *          verdict?:'ok'|'bad'}} [opts]
 */
export function drawNumberLine(svg, spec, {
  reveal = null, showAnswer = false, animateFrom = null, verdict = null,
} = {}) {
  const { min, max, steps = [] } = spec;

  // One viewBox unit == one CSS pixel. Without this the whole drawing scales
  // with the container, so on a phone the line collapses to a squashed
  // 50px-tall smear with unreadable type.
  const measured = Math.round(svg.getBoundingClientRect().width);
  const W = Math.max(320, measured || 720);
  const marginX = W < 460 ? 22 : 34;

  const span = max - min || 1;
  const xOf = (n) => marginX + ((n - min) / span) * (W - 2 * marginX);

  // Geometry first: the axis sits low enough to clear the tallest hop.
  const hops = steps
    .filter((s) => s.from !== s.to)
    .map((s, i) => ({ ...s, x1: xOf(s.from), x2: xOf(s.to), i }))
    .map((h) => ({ ...h, apex: apexOf(h.x2 - h.x1, h.i) }));

  const axisY = Math.max(...hops.map((h) => h.apex), 26) + 34;
  const H = axisY + 46;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  // ── Arrowhead markers, one pair per step colour ──────────────────────────
  const defs = node('defs');
  RAW_COLORS.forEach((color, i) => {
    for (const [id, points] of [
      [`ah${i}`, '0 0, 10 4, 0 8'],
      [`ah${i}r`, '10 0, 0 4, 10 8'],
    ]) {
      const marker = node('marker', {
        id, markerWidth: 10, markerHeight: 8,
        refX: id.endsWith('r') ? 1.5 : 8.5, refY: 4,
        orient: 'auto', markerUnits: 'userSpaceOnUse',
      });
      marker.append(node('polygon', { points, fill: color }));
      defs.append(marker);
    }
  });
  svg.append(defs);

  // ── Axis and ticks ───────────────────────────────────────────────────────
  svg.append(node('line', {
    x1: marginX - 10, y1: axisY, x2: W - marginX + 10, y2: axisY,
    stroke: 'var(--axis)', 'stroke-width': 2.5, 'stroke-linecap': 'round',
  }));

  const every = labelInterval(span, W - 2 * marginX);
  const tickStep = span > 40 ? every : 1;
  for (let n = Math.ceil(min / tickStep) * tickStep; n <= max; n += tickStep) {
    const x = xOf(n);
    const labelled = n % every === 0;
    const zero = n === 0;
    svg.append(node('line', {
      x1: x, y1: axisY - (labelled ? 9 : 5), x2: x, y2: axisY + (labelled ? 9 : 5),
      stroke: zero ? 'var(--axis-zero)' : labelled ? 'var(--axis-major)' : 'var(--axis)',
      'stroke-width': zero ? 2.5 : labelled ? 2 : 1.5,
    }));
    if (labelled) {
      const t = node('text', {
        x, y: axisY + 27, 'text-anchor': 'middle',
        class: zero ? 'nl-label nl-label--zero' : 'nl-label',
      });
      t.textContent = n < 0 ? `−${Math.abs(n)}` : String(n);
      svg.append(t);
    }
  }

  // ── Chained arrows ───────────────────────────────────────────────────────
  svg.append(node('circle', {
    cx: xOf(0), cy: axisY, r: 4, fill: 'var(--axis-zero)',
  }));

  const shown = reveal ?? hops.length;

  hops.forEach(({ x1, x2, apex, i, label }) => {
    if (i >= shown) return;
    const rightward = x2 > x1;
    const color = STEP_COLORS[i % STEP_COLORS.length];

    const path = node('path', {
      d: `M ${x1} ${axisY - 2} Q ${(x1 + x2) / 2} ${axisY - 2 * apex} ${x2} ${axisY - 2}`,
      fill: 'none', stroke: color, 'stroke-width': 3.5, 'stroke-linecap': 'round',
      'marker-end': `url(#ah${i % 3}${rightward ? '' : 'r'})`,
      class: 'nl-arc',
    });
    svg.append(path);

    if (label) {
      const t = node('text', {
        x: (x1 + x2) / 2, y: axisY - apex - 9, 'text-anchor': 'middle',
        class: 'nl-vec', fill: color,
      });
      t.textContent = label;
      svg.append(t);
    }

    // Waypoint where each arrow lands.
    svg.append(node('circle', {
      cx: x2, cy: axisY, r: 5, fill: color, stroke: 'var(--bg)', 'stroke-width': 2.5,
    }));

    if (animateFrom != null && i >= animateFrom) {
      const len = path.getTotalLength();
      path.style.strokeDasharray = String(len);
      path.style.strokeDashoffset = String(len);
      path.style.animation = `nl-draw .4s ${(i - animateFrom) * 0.25}s ease-out forwards`;
    }
  });

  // ── The answer ───────────────────────────────────────────────────────────
  if (showAnswer && Number.isFinite(spec.answer)) {
    const x = xOf(spec.answer);
    const g = node('g', { class: animateFrom != null ? 'nl-pop' : '' });
    g.append(node('circle', {
      cx: x, cy: axisY, r: 11, fill: 'var(--result)',
      stroke: 'var(--bg)', 'stroke-width': 3,
    }));
    const t = node('text', {
      x, y: axisY + 27, 'text-anchor': 'middle', class: 'nl-answer',
    });
    t.textContent = spec.answer < 0 ? `−${Math.abs(spec.answer)}` : String(spec.answer);
    g.append(t);

    if (verdict) {
      const ok = verdict === 'ok';
      const bx = x + 17;
      const by = axisY - 15;
      g.append(node('circle', {
        cx: bx, cy: by, r: 9.5,
        fill: ok ? 'var(--grow)' : 'var(--hot)',
        stroke: 'var(--bg)', 'stroke-width': 2.5,
      }));
      g.append(node('path', {
        d: ok
          ? `M ${bx - 4.5} ${by} l 3 3.2 l 6 -6.4`
          : `M ${bx - 3.6} ${by - 3.6} l 7.2 7.2 M ${bx + 3.6} ${by - 3.6} l -7.2 7.2`,
        fill: 'none', stroke: 'var(--bg)', 'stroke-width': 2.4,
        'stroke-linecap': 'round', 'stroke-linejoin': 'round',
      }));
    }
    svg.append(g);
  }
}

/** Round a span outward to tidy endpoints so the line doesn't jitter. */
export function niceBounds(values, pad = 2) {
  const lo = Math.min(...values, 0) - pad;
  const hi = Math.max(...values, 0) + pad;
  const round = (n, dir) => {
    const step = hi - lo > 40 ? 10 : 5;
    return dir < 0 ? Math.floor(n / step) * step : Math.ceil(n / step) * step;
  };
  return { min: round(lo, -1), max: round(hi, 1) };
}
