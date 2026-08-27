/** Minimal DOM helpers. No framework, no magic. */

/**
 * @param {string} tag  e.g. 'div.card.is-active' or 'button#play.btn'
 * @param {object} [attrs]
 * @param {...(Node|string|null|undefined|Array)} children
 */
export function el(tag, attrs = {}, ...children) {
  const [, name, rest] = tag.match(/^([a-z0-9]+)(.*)$/i);
  const node = document.createElement(name);

  for (const token of rest.match(/[.#][^.#]+/g) ?? []) {
    const value = token.slice(1).trim();
    if (!value) continue;
    // Split on whitespace: "div.a b" is a typo for "div.a.b", and classList
    // throws on a token containing spaces rather than saying anything useful.
    if (token[0] === '.') node.classList.add(...value.split(/\s+/));
    else node.id = value;
  }

  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') node.classList.add(...String(v).split(/\s+/).filter(Boolean));
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') applyStyle(node, v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on')) node.addEventListener(k.slice(2).toLowerCase(), v);
    else node.setAttribute(k, v === true ? '' : v);
  }

  append(node, children);
  return node;
}

/**
 * Custom properties (`--tone`, `--segments`) cannot be set through
 * Object.assign: assigning to an unknown key on a CSSStyleDeclaration just
 * creates a dead JavaScript property. They need setProperty.
 */
function applyStyle(node, style) {
  for (const [key, value] of Object.entries(style)) {
    if (value == null) continue;
    if (key.startsWith('--')) node.style.setProperty(key, String(value));
    else node.style[key] = value;
  }
}

function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    if (child instanceof Node) { node.append(child); continue; }
    // A plain object here is a mistake -- almost always a widget passed
    // instead of its .node. Stringifying it silently renders "[object
    // Object]" into the page, which is maddening to track down.
    if (typeof child === 'object') {
      throw new TypeError('el(): expected a Node or a primitive, got an object. '
        + 'Did you mean widget.node?');
    }
    node.append(document.createTextNode(String(child)));
  }
}

export const clear = (node) => {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
};

export const mount = (node, ...children) => {
  clear(node);
  append(node, children);
  return node;
};

/** Format a signed integer with a proper minus sign, in parentheses if negative. */
export const signed = (n) => (n < 0 ? `(−${Math.abs(n)})` : String(n));
export const minus = (n) => (n < 0 ? `−${Math.abs(n)}` : String(n));
