import { api } from './engine/api.js';
import { unlockOnFirstGesture } from './engine/audio.js';
import { mount } from './ui/dom.js';
import { state, setRenderer, go } from './ui/router.js';
import { loginScreen, setupScreen } from './ui/auth.js';
import { mapScreen, skillScreen, modeScreen } from './ui/map.js';
import { playScreen, summaryScreen } from './ui/play.js';
import { teacherScreen, studentScreen } from './ui/teacher.js';

const root = document.getElementById('app');

function render() {
  const r = state.route;
  if (state.needsSetup) return mount(root, setupScreen());
  if (!state.me) return mount(root, loginScreen());

  switch (r.name) {
    case 'skill':   return mount(root, skillScreen(r.skillId));
    case 'mode':    return mount(root, modeScreen(r.skillId, r.level));
    case 'play':    return mount(root, playScreen(r));
    case 'summary': return mount(root, summaryScreen(r));
    case 'teacher': return mount(root, teacherScreen());
    case 'student': return mount(root, studentScreen(r.id));
    default:        return mount(root, mapScreen());
  }
}

setRenderer(render);
unlockOnFirstGesture();

(async function boot() {
  const data = await api.bootstrap();
  state.needsSetup = data.needs_setup;
  state.users = data.users;
  state.me = data.me;
  if (state.me) {
    state.progress = await api.progress();
    go({ name: state.me.role === 'teacher' ? 'teacher' : 'map' });
  } else {
    render();
  }
})();
