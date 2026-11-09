// EXP-F5: Ambient scenes, synthesized locally from seeded noise and oscillators – no recordings.
// Each scene renders a deterministic mono loop. The tail is cross-faded into the head so the loop has no seam.
export const SCENE_RATE = 22050;
export const SCENE_SECONDS = 12;
const FADE_SECONDS = 1;
export const TARGET_RMS = 0.06;
export const PEAK_LIMIT = 0.6;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// RBJ biquad, processed sample by sample.
function biquad(type, freq, q, sr) {
  const w = 2 * Math.PI * freq / sr, cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
  let b0, b1, b2;
  if (type === 'lowpass') { b0 = (1 - cos) / 2; b1 = 1 - cos; b2 = b0; }
  else if (type === 'highpass') { b0 = (1 + cos) / 2; b1 = -(1 + cos); b2 = b0; }
  else { b0 = alpha; b1 = 0; b2 = -alpha; } // bandpass, 0 dB peak
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => { const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; };
}
function noises(r) {
  let b0 = 0, b1 = 0, b2 = 0, brown = 0;
  return {
    white: () => r() * 2 - 1,
    pink: () => { const w = r() * 2 - 1; b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913; return (b0 + b1 + b2 + w * 0.1848) * 0.25; },
    brown: () => { brown = (brown + 0.02 * (r() * 2 - 1)) / 1.02; return brown * 3.5; },
  };
}
// Short decaying events (crackles, clinks, droplets) mixed into a buffer.
function addBurst(out, start, len, fn) { for (let i = 0; i < len && start + i < out.length; i++) out[start + i] += fn(i, len); }
const tau = 2 * Math.PI;
// Smooth random envelope: steps every `every` seconds, one-pole smoothed (speech-like murmur, wind).
function wander(r, sr, every, smooth) {
  let target = r(), value = target, left = 0; const k = 1 / (smooth * sr);
  return () => { if (--left <= 0) { target = r(); left = Math.round(every * sr * (0.6 + r() * 0.8)); } value += (target - value) * k; return value; };
}

const SCENE_DEFS = {
  // Leises Raumrauschen (F1 'room'): gefiltertes Rauschbett.
  room: { title: 'Raum', render(n, sr, r) { const s = noises(r), lp = biquad('lowpass', 240, 0.5, sr); return Float32Array.from({ length: n }, () => lp(s.white())); } },
  kamin: { title: 'Kaminfeuer', render(n, sr, r) {
    const s = noises(r), lp = biquad('lowpass', 320, 0.6, sr), out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = lp(s.brown()) * 0.7;
    const hp = biquad('highpass', 1600, 0.7, sr), bp = biquad('bandpass', 900, 1.2, sr);
    for (let i = 0; i < n; i++) {
      if (r() < 5 / sr) { const amp = 0.4 + r() * 0.9; addBurst(out, i, Math.round(sr * (0.003 + r() * 0.011)), (k, len) => hp(s.white()) * amp * Math.exp(-5 * k / len)); }
      if (r() < 0.35 / sr) { const amp = 1.2 + r(); addBurst(out, i, Math.round(sr * 0.028), (k, len) => bp(s.white()) * amp * Math.exp(-4 * k / len)); }
    }
    return out;
  } },
  kneipe: { title: 'Kneipe', render(n, sr, r) {
    const s = noises(r), bp = biquad('bandpass', 520, 0.7, sr), voice = wander(r, sr, 0.14, 0.05), crowd = wander(r, sr, 2.5, 0.8), out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = bp(s.pink()) * (0.35 + 0.65 * voice()) * (0.6 + 0.4 * crowd()) * 3;
    for (let t = 1 + r() * 2; t * sr < n; t += 2.5 + r() * 3.5) {
      const f = 2600 + r() * 800, amp = 0.15 + r() * 0.15;
      addBurst(out, Math.round(t * sr), Math.round(sr * 0.35), (k) => (Math.sin(tau * f * k / sr) + 0.4 * Math.sin(tau * f * 2.76 * k / sr)) * amp * Math.exp(-12 * k / sr));
    }
    return out;
  } },
  salon: { title: 'Salon', render(n, sr, r) {
    const s = noises(r), bp = biquad('bandpass', 420, 0.8, sr), voice = wander(r, sr, 0.2, 0.08), out = new Float32Array(n), hp = biquad('highpass', 4000, 0.7, sr);
    for (let i = 0; i < n; i++) out[i] = bp(s.pink()) * (0.4 + 0.6 * voice()) * 2.2;
    for (let t = 1.5 + r() * 2; t * sr < n; t += 3 + r() * 4) for (let c = 0, count = 2 + Math.floor(r() * 3); c < count; c++) {
      addBurst(out, Math.round((t + c * (0.05 + r() * 0.04)) * sr), Math.round(sr * 0.004), (k, len) => hp(s.white()) * 0.5 * (1 - k / len));
    }
    return out;
  } },
  meer: { title: 'Meer', render(n, sr, r) {
    const s = noises(r), lp = biquad('lowpass', 900, 0.6, sr), hp = biquad('highpass', 2500, 0.7, sr), env = new Float32Array(n), out = new Float32Array(n);
    for (let t = r(); t * sr < n; t += 5 + r() * 2) {
      const start = Math.round(t * sr), rise = 2.2 * sr, fall = 3.2 * sr, peak = 0.7 + r() * 0.3;
      for (let k = 0; k < rise + fall && start + k < n; k++) env[start + k] = Math.max(env[start + k], peak * (k < rise ? Math.sin(Math.PI / 2 * k / rise) ** 2 : Math.exp(-3 * (k - rise) / fall)));
    }
    for (let i = 0; i < n; i++) out[i] = lp(s.pink()) * (0.25 + env[i]) * 2 + hp(s.white()) * env[i] ** 3 * 0.35;
    return out;
  } },
  stadtregen: { title: 'Stadtregen', render(n, sr, r) {
    const s = noises(r), hp = biquad('highpass', 900, 0.6, sr), soft = biquad('lowpass', 4500, 0.7, sr), lp = biquad('lowpass', 120, 0.7, sr), out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = soft(hp(s.pink())) * 1.4 + lp(s.brown()) * 0.5;
    for (let i = 0; i < n; i++) if (r() < 22 / sr) { const f = 1800 + r() * 2400, amp = 0.12 + r() * 0.18; addBurst(out, i, Math.round(sr * 0.03), (k) => Math.sin(tau * f * k / sr) * amp * Math.exp(-160 * k / sr)); }
    return out;
  } },
  'wald-nacht': { title: 'Wald bei Nacht', render(n, sr, r) {
    const s = noises(r), lp = biquad('lowpass', 500, 0.6, sr), gust = wander(r, sr, 3, 1.2), out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = lp(s.brown()) * (0.25 + 0.5 * gust());
    // Grillen: Perioden teilen die Schleifenlänge, damit die Überblendung im Takt bleibt.
    const cricket = (period, f, amp, offset) => { for (let t = offset; t * sr < n; t += period) for (let p = 0; p < 3; p++) addBurst(out, Math.round((t + p * 0.04) * sr), Math.round(sr * 0.018), (k, len) => Math.sin(tau * f * k / sr) * amp * Math.sin(Math.PI * k / len)); };
    cricket(0.75, 4300, 0.12, 0.1); cricket(1.2, 4700, 0.08, 0.4);
    const hoot = (at, ms, f0, f1, amp) => addBurst(out, Math.round(at * sr), Math.round(sr * ms / 1000), (k, len) => { const f = f0 + (f1 - f0) * k / len; return (Math.sin(tau * f * k / sr) + 0.2 * Math.sin(tau * 2 * f * k / sr)) * amp * Math.sin(Math.PI * k / len) ** 2; });
    hoot(6.8, 260, 410, 380, 0.25); hoot(7.25, 620, 370, 350, 0.25);
    return out;
  } },
  jahrmarkt: { title: 'Jahrmarkt', render(n, sr, r) {
    const s = noises(r), bp = biquad('bandpass', 600, 0.7, sr), voice = wander(r, sr, 0.15, 0.06), out = new Float32Array(n);
    for (let i = 0; i < n; i++) out[i] = bp(s.pink()) * (0.4 + 0.6 * voice()) * 0.7;
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5], step = 0.42;
    for (let t = 0, idx = 0; t * sr < n; t += step) {
      idx = Math.max(0, Math.min(scale.length - 1, idx + Math.floor(r() * 5) - 2)); const f = scale[idx];
      addBurst(out, Math.round(t * sr), Math.round(sr * step * 0.95), (k, len) => { const v = 1 + 0.004 * Math.sin(tau * 5.5 * k / sr), ph = tau * f * v * k / sr; return (Math.sin(ph) + 0.3 * Math.sin(2 * ph) + 0.15 * Math.sin(3 * ph)) * 0.3 * Math.min(1, k / (0.02 * sr)) * (1 - k / len); });
    }
    return out;
  } },
};
export const SCENES = Object.freeze(Object.keys(SCENE_DEFS));
export const sceneTitle = (name) => SCENE_DEFS[name]?.title || null;
const seedOf = (name) => [...name].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

export function renderScene(name, { sampleRate = SCENE_RATE, seconds = SCENE_SECONDS } = {}) {
  const def = SCENE_DEFS[name];
  if (!def) throw new Error('Unknown ambient scene: ' + name);
  const len = Math.round(seconds * sampleRate), fade = Math.round(FADE_SECONDS * sampleRate);
  const raw = def.render(len + fade, sampleRate, rng(seedOf(name)));
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = raw[i];
  // Equal-power cross-fade: the head continues the tail, so sample len-1 → 0 is a natural continuation.
  for (let i = 0; i < fade; i++) { const x = i / fade; out[i] = raw[i] * Math.sin(Math.PI / 2 * x) + raw[len + i] * Math.cos(Math.PI / 2 * x); }
  let sum = 0; for (const v of out) sum += v * v;
  const gain = TARGET_RMS / Math.max(1e-9, Math.sqrt(sum / len));
  // Soft limiter keeps rare crackles/clinks below the peak budget without hard clipping.
  for (let i = 0; i < len; i++) out[i] = PEAK_LIMIT * Math.tanh(out[i] * gain / PEAK_LIMIT);
  return out;
}
const cache = new Map();
export function sceneBuffer(name) { if (!cache.has(name)) cache.set(name, renderScene(name)); return cache.get(name); }
