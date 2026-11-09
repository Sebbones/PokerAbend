import Motion, { createTableMotion } from './motion.js';
const $ = selector => document.querySelector(selector), root = $('#table');
const motion = Motion.table('demo', { root }), other = createTableMotion({ root: $('#other-table') });
const socketHandlers = new Map();
const socket = { on(name, fn) { if (!socketHandlers.has(name)) socketHandlers.set(name, new Set()); socketHandlers.get(name).add(fn); }, off(name, fn) { socketHandlers.get(name)?.delete(fn); }, emit(name, value) { for (const fn of socketHandlers.get(name) || []) fn(value); } };
let revision = 0;
const reset = () => {
  root.querySelectorAll('.piece,.card,.die,.chip,[data-motion-celebration]').forEach(el => { el.style.transform = ''; el.style.opacity = ''; delete el.dataset.motionValue; });
  $('#card').textContent = '?'; $('#die').textContent = '?';
};
function render(state) {
  reset(); root.dataset.revision = String(state.revision);
  if (state.card !== undefined) motion.flip($('#card'), { value: state.card, confirmed: true });
  if (state.die !== undefined) motion.roll({ el: $('#die'), value: state.die, confirmed: true });
  $('#status').textContent = `Zustand ${state.revision}`;
}
motion.bind(socket, { render, mode: state => ({ spectator: !!state.spectator }) });
socket.emit('state', { revision });
other.update({ revision }, () => {});
const actions = {
  flyTo: opts => motion.flyTo($('#piece'), $('#target'), opts),
  flip: opts => motion.flip($('#card'), { ...opts, confirmed: true, value: 'A♠' }),
  deal: opts => motion.deal(3, { ...opts, elements: root.querySelectorAll('.deal-card'), from: $('#source') }),
  roll: opts => motion.roll({ el: $('#die'), confirmed: true, value: 4 }, opts),
  walk: opts => motion.walk($('#piece'), [{ x: root.getBoundingClientRect().left + 110, y: root.getBoundingClientRect().top + 100 }, $('#target')], opts),
  stack: opts => motion.stack(root.querySelectorAll('.chip'), opts),
  shake: opts => motion.shake($('#card'), opts),
  pulse: opts => motion.pulse($('#piece'), opts),
  celebrate: opts => motion.celebrate(3, { ...opts, elements: $('#celebration') }),
};
function run(name, opts = {}) { return actions[name](opts); }
document.querySelectorAll('[data-motion]').forEach(button => button.addEventListener('click', async () => { await run(button.dataset.motion); $('#status').textContent = 'Bewegung beendet'; }));
$('#all').addEventListener('click', async () => { await Promise.all(Object.keys(actions).map(name => run(name))); $('#status').textContent = 'Alle Bewegungen beendet'; });
$('#reset').addEventListener('click', () => socket.emit('state', { revision: ++revision }));
$('#new-state').addEventListener('click', () => socket.emit('state', { revision: ++revision, card: 'K♥', die: 6 }));
$('#pause').addEventListener('click', () => socket.emit('state', { revision: ++revision, card: 'D♦', die: 2, gamePaused: true }));
$('#watch').addEventListener('click', () => socket.emit('state', { revision: ++revision, card: '9♣', die: 3, spectator: true }));
$('#reconnect').addEventListener('click', () => { socket.emit('disconnect'); socket.emit('connect'); socket.emit('state', { revision: ++revision, card: '7♠', die: 5 }); });
$('#reduced').checked = motion.reduceMotion();
$('#reduced').addEventListener('change', event => {
  const prefs = JSON.parse(localStorage.getItem('poker:prefs') || '{}'); prefs.calm = event.target.checked;
  localStorage.setItem('poker:prefs', JSON.stringify(prefs));
  const stored = JSON.parse(localStorage.getItem('poker:settings') || 'null');
  if (stored?.v?.display) { stored.v.display.calm = prefs.calm; localStorage.setItem('poker:settings', JSON.stringify(stored)); }
  window.dispatchEvent(new Event('settingschange'));
});
window.motionDemo = { motion, other, run, socket, root, reset, actions };
