/**
 * Shared app state and the world's smallest router. Screens import from here
 * rather than from app.js so there is no import cycle.
 */
export const state = {
  me: null,
  users: [],
  needsSetup: false,
  progress: null,
  route: { name: 'login' },
};

let renderer = () => {};
export const setRenderer = (fn) => { renderer = fn; };
export const rerender = () => renderer();
export function go(route) {
  state.route = route;
  renderer();
  window.scrollTo(0, 0);
}
