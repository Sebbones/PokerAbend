// Städtehandel: Hexbrett "Aurelia" – Geometrie, Rohstoffe und Aufbau des Feldes (eigene Namen, keine Vorlagen-Grafik).
// Die Topologie (Ecken, Kanten, Felder) hängt nur von der Brettgröße ab; Landschaften und Zahlen kommen aus dem Spielstand.
export const RES = ['holz', 'ton', 'wolle', 'korn', 'kupfer'];
export const RES_NAMES = { holz: 'Holz', ton: 'Ton', wolle: 'Wolle', korn: 'Korn', kupfer: 'Kupfer' };
export const TERRAIN_NAMES = { holz: 'Wald', ton: 'Tongrube', wolle: 'Weide', korn: 'Acker', kupfer: 'Gebirge', duene: 'Düne' };

export const SIZES = {
  standard: {
    label: 'Aurelia (3–4 Spieler)', rows: [3, 4, 5, 4, 3], players: [3, 4], ports: 9, genericPorts: 4, bank: 19,
    terrain: { holz: 4, ton: 3, wolle: 4, korn: 4, kupfer: 3, duene: 1 },
    tokens: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12],
    dev: { ritter: 14, siegpunkt: 5, strassenbau: 2, erfindung: 2, monopol: 2 },
  },
  xl: {
    label: 'Groß-Aurelia (5–6 Spieler)', rows: [3, 4, 5, 6, 5, 4, 3], players: [5, 6], ports: 11, genericPorts: 6, bank: 24,
    terrain: { holz: 6, ton: 5, wolle: 6, korn: 6, kupfer: 5, duene: 2 },
    tokens: [2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11, 11, 11, 12, 12],
    dev: { ritter: 20, siegpunkt: 5, strassenbau: 3, erfindung: 3, monopol: 3 },
  },
};

const S = 60, SQ = Math.sqrt(3), cache = {};
const key = (x, y) => `${Math.round(x * 10)},${Math.round(y * 10)}`;

// Pointy-top-Sechsecke in Reihen. Ecken 0..5 laufen im Uhrzeigersinn ab der Spitze oben.
export function topology(size) {
  if (cache[size]) return cache[size];
  const cfg = SIZES[size];
  if (!cfg) throw new Error('Unbekannte Brettgröße');
  const hexes = [], vIndex = new Map(), vs = [], eIndex = new Map(), es = [];
  cfg.rows.forEach((len, r) => { for (let i = 0; i < len; i++) hexes.push({ id: hexes.length, row: r, x: S * SQ * (i - (len - 1) / 2), y: S * 1.5 * (r - (cfg.rows.length - 1) / 2), vs: [], es: [], nb: [] }); });
  const vertex = (x, y) => {
    const k = key(x, y);
    if (!vIndex.has(k)) { vIndex.set(k, vs.length); vs.push({ id: vs.length, x: +x.toFixed(2), y: +y.toFixed(2), hexes: [], es: [], adj: [] }); }
    return vIndex.get(k);
  };
  for (const h of hexes) {
    for (let k = 0; k < 6; k++) {
      const a = ((-90 + 60 * k) * Math.PI) / 180;
      const v = vertex(h.x + S * Math.cos(a), h.y + S * Math.sin(a));
      h.vs.push(v); vs[v].hexes.push(h.id);
    }
    for (let k = 0; k < 6; k++) {
      const a = h.vs[k], b = h.vs[(k + 1) % 6], ek = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!eIndex.has(ek)) { eIndex.set(ek, es.length); es.push({ id: es.length, a: Math.min(a, b), b: Math.max(a, b), hexes: [] }); vs[a].adj.push(b); vs[b].adj.push(a); vs[a].es.push(es.length - 1); vs[b].es.push(es.length - 1); }
      const e = eIndex.get(ek); es[e].hexes.push(h.id); h.es.push(e);
    }
  }
  for (const e of es) if (e.hexes.length === 2) { hexes[e.hexes[0]].nb.push(e.hexes[1]); hexes[e.hexes[1]].nb.push(e.hexes[0]); }
  // Küstenkanten im Kreis (nach Winkel um die Brettmitte) – dort liegen die Häfen
  const coast = es.filter((e) => e.hexes.length === 1).map((e) => {
    const A = vs[e.a], B = vs[e.b], mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, h = hexes[e.hexes[0]];
    const dx = mx - h.x, dy = my - h.y, len = Math.hypot(dx, dy);
    return { e: e.id, angle: Math.atan2(my, mx), lx: +(mx + (dx / len) * 34).toFixed(2), ly: +(my + (dy / len) * 34).toFixed(2) };
  }).sort((p, q) => p.angle - q.angle);
  const slots = Array.from({ length: cfg.ports }, (_, j) => coast[Math.floor((j * coast.length) / cfg.ports + 0.5) % coast.length]);
  const xs = vs.map((v) => v.x), ys = vs.map((v) => v.y), pad = 78;
  const box = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + 2 * pad, Math.max(...ys) - Math.min(...ys) + 2 * pad].map((n) => Math.round(n));
  return (cache[size] = { size, hexes, vs, es, slots, box, S });
}

export const shuffle = (list, rng = Math.random) => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const hot = (n) => n === 6 || n === 8;

// Zufälliges Feld: rote Zahlen (6 und 8) grenzen nie aneinander
export function randomLayout(size, rng = Math.random) {
  const cfg = SIZES[size], t = topology(size);
  const terrains = Object.entries(cfg.terrain).flatMap(([k, n]) => Array(n).fill(k));
  let best = null;
  for (let attempt = 0; attempt < 400; attempt++) {
    const terrain = shuffle(terrains, rng), tokens = shuffle(cfg.tokens, rng);
    let i = 0;
    const nums = terrain.map((k) => (k === 'duene' ? null : tokens[i++]));
    best = { terrain, nums };
    if (t.hexes.every((h) => !hot(nums[h.id]) || h.nb.every((n) => !hot(nums[n])))) return best;
  }
  return best;
}

// Festes Einsteigerfeld (nur Standardbrett): ausgewogen, keine benachbarten 6/8, Düne in der Mitte
export const BEGINNER = {
  terrain: ['kupfer', 'wolle', 'holz', 'korn', 'ton', 'korn', 'wolle', 'holz', 'wolle', 'duene', 'kupfer', 'holz', 'korn', 'holz', 'ton', 'wolle', 'korn', 'kupfer', 'ton'],
  nums: [10, 2, 9, 12, 6, 4, 10, 9, 11, null, 3, 8, 8, 3, 4, 5, 5, 6, 11],
};

export function makeBoard(size, layout, rng = Math.random) {
  if (layout === 'beginner' && size === 'standard') return { terrain: [...BEGINNER.terrain], nums: [...BEGINNER.nums] };
  return randomLayout(size, rng);
}

export function portTypes(size, rng = Math.random) {
  const cfg = SIZES[size];
  return shuffle([...Array(cfg.genericPorts).fill('any'), ...RES], rng).slice(0, cfg.ports);
}

export const pips = (n) => (n ? 6 - Math.abs(7 - n) : 0);
