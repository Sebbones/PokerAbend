// EXP-F2: presentation only. Call update() with the authoritative view before scheduling motion.
const MAX_ITEMS = 32;
const finite = (n, fallback = 0) => Number.isFinite(n) ? n : fallback;
const duration = (n, fallback) => Math.max(0, Math.min(5000, finite(n, fallback)));
const elements = (value) => (Array.isArray(value) ? value : value?.nodeType ? [value] : Array.from(value || [])).filter(el => el?.nodeType === 1).slice(0, MAX_ITEMS);
const valueOf = (object) => Object.hasOwn(object, 'value') && object.value !== undefined && object.value !== null;
function savedReduction(host) {
  try {
    if (typeof Settings !== 'undefined') return !!Settings.get().display.calm;
    if (typeof prefs !== 'undefined') return !!prefs.calm;
    const settings = JSON.parse(host.localStorage?.getItem('poker:settings') || 'null');
    if (settings?.v?.display) return !!settings.v.display.calm;
    return !!JSON.parse(host.localStorage?.getItem('poker:prefs') || 'null')?.calm;
  } catch { return false; }
}
const position = (point) => {
  if (point?.getBoundingClientRect) { const r = point.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  if (Number.isFinite(point?.x) && Number.isFinite(point?.y)) return point;
  throw new TypeError('Motion target must be an element or a viewport point { x, y }');
};

export class TableMotion {
  constructor({ root = globalThis.document?.body, host = globalThis, reduced = () => savedReduction(host) } = {}) {
    if (!root) throw new TypeError('Motion needs a table root');
    this.root = root; this.host = host; this.reduced = reduced;
    this.version = 0; this.queue = []; this.active = null; this.initial = true; this.disposed = false;
    this.mode = { paused: false, spectator: false, reconnecting: false };
    this.instant = false; this.unbind = null;
    this.media = host.matchMedia?.('(prefers-reduced-motion: reduce)');
    this.onReduction = () => { if (this.reduceMotion()) this.finish(); };
    this.onHide = () => { if (host.document?.hidden) this.finish(); };
    this.onPageHide = () => this.finish();
    this.media?.addEventListener('change', this.onReduction);
    host.addEventListener?.('settingschange', this.onReduction);
    host.addEventListener?.('pagehide', this.onPageHide);
    host.document?.addEventListener('visibilitychange', this.onHide);
  }
  reduceMotion() { return !!this.reduced() || !!this.media?.matches; }
  immediate() { return this.instant || this.disposed || this.host.document?.hidden || Object.values(this.mode).some(Boolean); }

  // Finishing is synchronous: all confirmed endpoints are installed before the new render.
  // Settled animation promises only release handles; they never write an old state later.
  finish() {
    const jobs = [this.active, ...this.queue].filter(Boolean);
    this.active = null; this.queue = [];
    for (const job of jobs) {
      for (const animation of job.animations) animation.cancel();
      if (!job.started) this.install(job);
      job.resolve({ status: 'finished', version: job.version });
    }
  }
  update(state, render = () => {}, mode = {}) {
    if (this.disposed) return this.version;
    const interrupted = !!this.active || !!this.queue.length, reconnecting = this.mode.reconnecting;
    this.finish(); this.version++;
    this.mode = { paused: !!state?.gamePaused, spectator: !!state?.spectator, reconnecting: false, ...mode };
    this.instant = this.initial || interrupted || reconnecting;
    this.initial = false;
    try { render(state, this); } finally { this.instant = false; }
    return this.version;
  }
  setMode(mode) { this.finish(); this.version++; this.mode = { ...this.mode, ...mode }; }
  bind(socket, { render, select = state => state, mode = () => ({}) } = {}) {
    this.unbind?.();
    if (typeof render !== 'function') throw new TypeError('Motion.bind needs an authoritative render function');
    const state = raw => { const view = select(raw); if (view) this.update(view, render, mode(view)); };
    const disconnected = () => this.setMode({ reconnecting: true });
    // A reconnect remains instant until a complete state has actually arrived.
    socket.on('state', state); socket.on('disconnect', disconnected); socket.on('connect', disconnected);
    this.unbind = () => { socket.off('state', state); socket.off('disconnect', disconnected); socket.off('connect', disconnected); this.unbind = null; };
    return this.unbind;
  }
  install(job) {
    job.started = true;
    job.plans = job.prepare();
    for (const plan of job.plans) {
      plan.commit?.();
      const end = plan.final || plan.frames.at(-1);
      if (end.transform !== undefined) plan.el.style.transform = end.transform;
      if (end.opacity !== undefined) plan.el.style.opacity = String(end.opacity);
    }
  }
  enqueue(prepare, opts = {}) {
    if (this.disposed || (opts.version !== undefined && opts.version !== this.version)) return Promise.resolve({ status: 'stale', version: this.version });
    const job = { prepare, opts, version: this.version, animations: [], started: false };
    const result = new Promise(resolve => { job.resolve = resolve; });
    if (this.immediate() || opts.instant) {
      this.install(job); job.resolve({ status: 'instant', version: job.version });
    } else {
      if (this.queue.length >= MAX_ITEMS) this.finish();
      this.queue.push(job); this.drain();
    }
    return result;
  }
  drain() {
    if (this.active || !this.queue.length || this.disposed) return;
    const job = this.queue.shift(); this.active = job;
    this.install(job);
    const reduce = this.reduceMotion();
    for (const plan of job.plans) {
      if (!plan.el.isConnected || typeof plan.el.animate !== 'function' || this.immediate()) continue;
      const ms = duration(job.opts.duration, plan.duration ?? 360), delay = duration(plan.delay, 0);
      // Reduction covers the complete group, not 150 ms per staggered item.
      const time = reduce ? Math.min(150, ms) : ms;
      if (!time) continue;
      try {
        const animation = plan.el.animate(plan.frames, { duration: time, delay: reduce ? 0 : delay, easing: 'ease-out', fill: 'none' });
        job.animations.push(animation);
      } catch { /* unsupported WAAPI: the final state is already visible */ }
    }
    Promise.all(job.animations.map(animation => animation.finished.catch(() => {}))).then(() => {
      // A newer update/finish owns the DOM now. Never commit endpoints here.
      if (this.active !== job) return;
      for (const animation of job.animations) animation.cancel();
      this.active = null; job.resolve({ status: 'completed', version: job.version }); this.drain();
    });
  }
  base(el) {
    const style = this.host.getComputedStyle?.(el);
    return { transform: !style || style.transform === 'none' ? '' : style.transform, opacity: style?.opacity ?? '1', inline: { transform: el.style.transform, opacity: el.style.opacity } };
  }
  flyTo(el, target, opts = {}) {
    return this.enqueue(() => {
      const base = this.base(el), rect = el.getBoundingClientRect(), to = position(target);
      const dx = to.x - rect.left - rect.width / 2, dy = to.y - rect.top - rect.height / 2;
      const end = `translate(${dx}px, ${dy}px) ${base.transform}`.trim();
      return [{ el, frames: [{ transform: base.transform || 'none', opacity: base.opacity }, { transform: end, opacity: base.opacity }], duration: 420 }];
    }, opts);
  }
  flip(el, opts = {}) {
    if (!opts.confirmed || !valueOf(opts)) return Promise.resolve({ status: 'waiting', version: this.version });
    const value = String(opts.value);
    return this.enqueue(() => {
      const base = this.base(el);
      return [{ el, final: base.inline, commit: () => { el.textContent = value; el.dataset.motionValue = value; },
        frames: [{ transform: `${base.transform} scaleX(0)`.trim(), opacity: 0 }, { transform: base.transform || 'none', opacity: base.opacity }], duration: 300 }];
    }, opts);
  }
  deal(n, { elements: cards, from = this.root, ...opts } = {}) {
    const list = elements(cards).slice(0, Math.max(0, Math.min(MAX_ITEMS, Math.floor(finite(n)))));
    return this.enqueue(() => {
      const origin = position(from);
      return list.map((el, i) => {
        const base = this.base(el), rect = el.getBoundingClientRect();
        return { el, final: base.inline, frames: [{ transform: `translate(${origin.x - rect.left - rect.width / 2}px, ${origin.y - rect.top - rect.height / 2}px) rotate(-12deg) ${base.transform}`.trim(), opacity: 0 }, { transform: base.transform || 'none', opacity: base.opacity }], duration: 320, delay: i * 45 };
      });
    }, opts);
  }
  roll(dice, opts = {}) {
    const list = (Array.isArray(dice) ? dice : [dice]).slice(0, MAX_ITEMS);
    const known = list.filter(die => die?.el?.nodeType === 1 && die.confirmed === true && Number.isInteger(die.value) && die.value >= 1 && die.value <= 6).map(({ el, value }) => ({ el, value }));
    if (!known.length) return Promise.resolve({ status: 'waiting', version: this.version });
    // The animation rotates the confirmed face; it never invents intermediate/random faces.
    return this.enqueue(() => known.map(({ el, value }, i) => {
      const base = this.base(el);
      return { el, final: base.inline, commit: () => { el.textContent = String(value); el.dataset.motionValue = String(value); },
        frames: [{ transform: `${base.transform} rotate(-160deg) scale(.85)`.trim(), opacity: base.opacity }, { transform: `${base.transform} rotate(18deg) scale(1.06)`.trim(), offset: 0.75 }, { transform: base.transform || 'none', opacity: base.opacity }], duration: 480, delay: i * 35 };
    }), opts);
  }
  walk(piece, path, opts = {}) {
    const points = Array.from(path || []).slice(0, 64);
    return this.enqueue(() => {
      const base = this.base(piece), rect = piece.getBoundingClientRect(), origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      return [{ el: piece, frames: [{ transform: base.transform || 'none' }, ...points.map(point => {
        const to = position(point); return { transform: `translate(${to.x - origin.x}px, ${to.y - origin.y}px) ${base.transform}`.trim() };
      })], duration: Math.min(1500, Math.max(1, points.length) * 180) }];
    }, opts);
  }
  stack(chips, opts = {}) {
    const list = elements(chips), gap = finite(opts.gap, 5);
    return this.enqueue(() => {
      if (!list.length) return [];
      const target = position(opts.target || list[0]);
      return list.map((el, i) => {
        const base = this.base(el), rect = el.getBoundingClientRect();
        return { el, frames: [{ transform: base.transform || 'none', opacity: base.opacity }, { transform: `translate(${target.x - rect.left - rect.width / 2}px, ${target.y - rect.top - rect.height / 2 - i * gap}px) ${base.transform}`.trim(), opacity: base.opacity }], duration: 340, delay: i * 30 };
      });
    }, opts);
  }
  accent(el, transforms, opts, ms) {
    return this.enqueue(() => { const base = this.base(el); return [{ el, final: base.inline, frames: [base.transform || 'none', ...transforms.map(t => `${base.transform} ${t}`.trim()), base.transform || 'none'].map(transform => ({ transform })), duration: ms }]; }, opts);
  }
  shake(el, opts = {}) { return this.accent(el, ['translateX(-5px)', 'translateX(5px)', 'translateX(0)'], opts, 360); }
  pulse(el, opts = {}) { return this.accent(el, ['scale(1.06)'], opts, 500); }
  celebrate(level = 1, opts = {}) {
    const list = elements(opts.elements || this.root.querySelector('[data-motion-celebration]') || this.root);
    const stage = Math.max(1, Math.min(3, Math.floor(finite(level, 1))));
    return this.enqueue(() => list.map((el, i) => {
      const base = this.base(el);
      return { el, final: base.inline, frames: [{ transform: base.transform || 'none', opacity: base.opacity }, { transform: `${base.transform} translateY(${-8 * stage}px) rotate(${(i % 2 ? 1 : -1) * stage * 3}deg) scale(${1 + stage * .04})`.trim(), offset: .45, opacity: 1 }, { transform: base.transform || 'none', opacity: base.opacity }], duration: 350 + stage * 180, delay: i * 25 };
    }), opts);
  }
  dispose() {
    this.finish(); this.disposed = true; this.unbind?.();
    this.media?.removeEventListener('change', this.onReduction);
    this.host.removeEventListener?.('settingschange', this.onReduction); this.host.removeEventListener?.('pagehide', this.onPageHide);
    this.host.document?.removeEventListener('visibilitychange', this.onHide);
  }
}
export const createTableMotion = options => new TableMotion(options);
const tables = new Map();
export const Motion = {
  table(id, options = {}) {
    if (!tables.has(id) || tables.get(id).disposed) tables.set(id, createTableMotion(options));
    return tables.get(id);
  },
  release(id) { tables.get(id)?.dispose(); tables.delete(id); },
};
for (const name of ['flyTo', 'flip', 'deal', 'roll', 'walk', 'stack', 'shake', 'pulse', 'celebrate']) Motion[name] = (...args) => Motion.table('default')[name](...args);
export default Motion;
