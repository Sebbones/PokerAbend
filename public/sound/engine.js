// EXP-F1. All sound is synthesized locally; importing this module creates no AudioContext.
import standard from './palettes/standard.js';
export const REQUIRED_EVENTS = Object.freeze(['select', 'confirm', 'deny', 'turn', 'win', 'lose']);
export const PALETTES = Object.freeze(['standard', 'casino', 'holz', 'kneipe', 'party']);
export const MIXER_DEFAULTS = Object.freeze({ enabled: true, master: 1, effects: 1, atmosphere: 0, speech: 1, mutedGames: Object.freeze([]) });
const clamp = (n, fallback = 1) => Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
export function normalizeMixer(value = {}) {
  return { enabled: value.enabled !== false, master: clamp(value.master), effects: clamp(value.effects), atmosphere: clamp(value.atmosphere, 0), speech: clamp(value.speech), mutedGames: Array.isArray(value.mutedGames) ? value.mutedGames.filter(id => typeof id === 'string') : [] };
}
const loaders = {
  casino: () => import('./palettes/casino.js'), holz: () => import('./palettes/holz.js'),
  kneipe: () => import('./palettes/kneipe.js'), party: () => import('./palettes/party.js'),
};
const paletteCache = new Map([['standard', Promise.resolve(standard)]]);
export function loadPalette(name) {
  if (!PALETTES.includes(name)) return Promise.reject(new Error('Unknown sound palette: ' + name));
  if (!paletteCache.has(name)) paletteCache.set(name, loaders[name]().then(m => m.default).catch(error => { paletteCache.delete(name); throw error; }));
  return paletteCache.get(name);
}

export function createSoundEngine({ settings = () => MIXER_DEFAULTS, game = () => null, host = globalThis,
  contextFactory = () => new (host.AudioContext || host.webkitAudioContext)() } = {}) {
  let context, master, effects, atmosphere, palette = standard, selection = 0, loading = null, activeGame = game();
  let ambientName = null, ambientVoice = null, disposed = false;
  const voices = new Set();
  const mixer = () => normalizeMixer(settings());
  const hidden = () => !!host.document?.hidden;
  const logging = () => Array.isArray(host.__soundLog);
  const allowed = (channel, id = game()) => {
    const m = mixer();
    return !disposed && !hidden() && m.enabled && m.master > 0 && m[channel] > 0 && !m.mutedGames.includes(id);
  };
  function stopVoice(voice) {
    if (!voice) return;
    voices.delete(voice);
    for (const source of voice.sources) { try { source.stop(); } catch { /* already ended */ } }
    for (const node of voice.nodes) { try { node.disconnect(); } catch { /* already disconnected */ } }
    if (ambientVoice === voice) ambientVoice = null;
  }
  function stopAll() { for (const voice of [...voices]) stopVoice(voice); }
  function syncGame() {
    const id = game();
    if (id !== activeGame) { activeGame = id; ambientName = null; stopAll(); palette = standard; selection++; loading = null; }
  }
  function ensureContext() {
    if (disposed) return null;
    try {
      if (!context) {
        context = contextFactory();
        master = context.createGain(); effects = context.createGain(); atmosphere = context.createGain();
        effects.connect(master); atmosphere.connect(master); master.connect(context.destination);
      }
      const m = mixer();
      master.gain.value = m.enabled && !m.mutedGames.includes(game()) ? m.master : 0;
      effects.gain.value = m.effects; atmosphere.gain.value = m.atmosphere;
      // A rejected resume (autoplay restrictions) is harmless. Never replay a backlog after unlocking.
      if (context.state === 'suspended') context.resume().catch(() => {});
      return context;
    } catch { return null; }
  }
  function log(event, channel, id, opts = {}) {
    if (!logging()) return false;
    // Test mode also stops any previously audible ambient or effects.
    stopAll();
    host.__soundLog.push({ event, palette: palette.id, game: id, channel, ...opts });
    return true;
  }
  function reserve(sources, nodes, end) {
    // Count an FM carrier+modulator as one voice; each audible chord note is its own voice.
    while (voices.size >= 6) stopVoice([...voices].find(voice => voice !== ambientVoice) || voices.values().next().value);
    const voice = { sources, nodes, end };
    voices.add(voice);
    sources[0].onended = () => stopVoice(voice);
    return voice;
  }
  function render(note, channel, volume = 1, loop = false) {
    const ctx = ensureContext();
    if (!ctx || ctx.state === 'suspended') return null;
    const now = ctx.currentTime, at = now + (Math.max(0, note.at || 0) + Math.random() * (note.jitter || 0)) / 1000;
    const duration = Math.max(0.001, note.ms / 1000), end = at + duration;
    const gain = ctx.createGain(), sources = [], nodes = [gain];
    gain.connect(channel === 'atmosphere' ? atmosphere : effects);
    const level = Math.max(0.0001, (note.vol ?? 0.05) * clamp(volume));
    if (note.kind === 'chord') {
      gain.disconnect();
      for (const freq of note.freqs.slice(0, 6)) render({ ...note, kind: 'soft', freq }, channel, volume);
      return null;
    }
    if (note.kind === 'noise') {
      const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, len, ctx.sampleRate), data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (loop ? 1 : 1 - i / len);
      const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter();
      source.buffer = buffer; source.loop = loop;
      filter.type = note.type || 'bandpass'; filter.frequency.value = note.freq; filter.Q.value = note.q ?? 1;
      source.connect(filter); filter.connect(gain); sources.push(source); nodes.push(source, filter);
      gain.gain.value = level; // The original noise already decays in the sample buffer.
    } else {
      const source = ctx.createOscillator();
      source.type = note.type || (note.kind === 'tock' ? 'triangle' : 'sine');
      source.frequency.setValueAtTime(note.freq, at);
      source.connect(gain); sources.push(source); nodes.push(source);
      if (note.kind === 'plop' || note.kind === 'bass' || note.kind === 'tock') source.frequency.exponentialRampToValueAtTime(Math.max(25, note.freq * 0.45), end);
      if (note.kind === 'bell') {
        const mod = ctx.createOscillator(), depth = ctx.createGain();
        mod.frequency.value = note.freq * (note.ratio ?? 2);
        depth.gain.setValueAtTime(note.freq * (note.index ?? 1), at); depth.gain.exponentialRampToValueAtTime(0.0001, end);
        mod.connect(depth); depth.connect(source.frequency); sources.push(mod); nodes.push(mod, depth);
      }
      gain.gain.setValueAtTime(note.kind === 'soft' ? 0.0001 : level, at);
      if (note.kind === 'soft') gain.gain.linearRampToValueAtTime(level, at + Math.min(0.04, duration / 4));
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
    }
    const voice = reserve(sources, nodes, end);
    for (const source of sources) { source.start(at); if (!loop) source.stop(end); }
    return voice;
  }
  function playNotes(event, notes, opts = {}) {
    syncGame();
    const id = opts.game ?? game();
    if (!Array.isArray(notes) || !notes.length || !allowed('effects', id)) return false;
    const safe = notes.map(n => ({ ...n, ms: Math.max(1, Math.min(n.ms, ['win', 'lose', 'highlight'].includes(event) ? 5000 : Math.max(1, 600 - (n.at || 0) - (n.jitter || 0)))) }));
    if (log(event, 'effects', id)) return true;
    try { for (const note of safe) render(note, 'effects', opts.volume); } catch { return false; }
    return !!context && context.state !== 'suspended';
  }
  function play(event, opts = {}) {
    syncGame();
    if (loading) {
      const pending = loading, requested = Date.now(), id = game();
      return pending.then(() => Date.now() - requested < 600 && game() === id ? play(event, opts) : false, () => false);
    }
    const aliases = { draw: 'deal', chips: 'chip', hit: 'capture', end: 'lose' };
    return playNotes(event, palette.events[event] || palette.events[aliases[event]] || standard.events[event], opts);
  }
  function use(name) {
    syncGame();
    const request = ++selection;
    loading = loadPalette(name).then(next => {
      if (request !== selection || disposed) return false;
      if (palette !== next) { stopAll(); ambientName = null; palette = next; }
      return true;
    }).finally(() => { if (request === selection) loading = null; });
    return loading;
  }
  function ambient(name) {
    syncGame(); stopVoice(ambientVoice);
    ambientName = typeof name === 'string' && name ? name : null;
    if (!ambientName || !allowed('atmosphere')) return false;
    if (log('ambient', 'atmosphere', game(), { name: ambientName })) return true;
    // A quiet, filtered noise bed; world-specific atmospheres belong to EXP-F5.
    try { ambientVoice = render({ kind: 'noise', ms: 2000, freq: 240, type: 'lowpass', vol: 0.025, q: 0.5 }, 'atmosphere', 1, true); } catch { return false; }
    return !!ambientVoice;
  }
  function refresh() {
    syncGame();
    if (logging() || hidden() || !allowed('effects')) {
      for (const voice of [...voices]) if (voice !== ambientVoice) stopVoice(voice);
    }
    if (context) {
      const m = mixer();
      master.gain.value = m.enabled && !m.mutedGames.includes(game()) && !hidden() ? m.master : 0;
      effects.gain.value = m.effects; atmosphere.gain.value = m.atmosphere;
    }
    if (!allowed('atmosphere') || logging()) stopVoice(ambientVoice);
    else if (ambientName && !ambientVoice) ambient(ambientName);
  }
  const onVisibility = () => { if (hidden()) { ambientName = null; stopAll(); } else refresh(); };
  const onPageHide = () => { ambientName = null; stopAll(); };
  // Unlock only on an actual gesture, without creating an AudioContext before any sound is requested.
  const unlock = () => { if (context?.state === 'suspended') context.resume().then(refresh).catch(() => {}); };
  // Navigation away from a table must stop ambient even when no further sound is played.
  const observer = host.MutationObserver && host.document?.body ? new host.MutationObserver(() => { if (game() !== activeGame) refresh(); }) : null;
  observer?.observe(host.document.body, { childList: true, subtree: true });
  host.addEventListener?.('hashchange', refresh);
  host.addEventListener?.('settingschange', refresh);
  host.addEventListener?.('pagehide', onPageHide);
  host.document?.addEventListener('visibilitychange', onVisibility);
  host.document?.addEventListener('pointerdown', unlock);
  host.document?.addEventListener('keydown', unlock);
  return {
    use, play, ambient, refresh,
    beep: (freq = 660, ms = 120, vol = 0.05, type = 'sine') => playNotes('beep', [{ kind: 'tone', freq, ms, vol, type }]),
    noise: (sec, freq, vol, type = 'bandpass', q = 1) => playNotes('noise', [{ kind: 'noise', freq, ms: sec * 1000, vol, type, q }]),
    get palette() { return palette.id; },
    get voiceCount() { return voices.size; },
    dispose() {
      disposed = true; selection++; loading = null; stopAll(); observer?.disconnect();
      host.removeEventListener?.('hashchange', refresh);
      host.removeEventListener?.('settingschange', refresh); host.removeEventListener?.('pagehide', onPageHide);
      host.document?.removeEventListener('visibilitychange', onVisibility);
      host.document?.removeEventListener('pointerdown', unlock); host.document?.removeEventListener('keydown', unlock);
      return context?.close().catch(() => {});
    },
  };
}
