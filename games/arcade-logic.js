// Reine, deterministische Hilfen der vier Echtzeit-Arcade-Spiele (Geschenkfänger, Rhythmus-Rausch,
// Stillgestanden!, Bomben-Duell). Kein Zustand, keine Uhr: Der Raum entscheidet, diese Datei rechnet nur.

// Kleiner seedbarer Zufall – alle Spieler einer Runde bekommen aus demselben Seed denselben Ablauf.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- Rhythmus-Rausch ----------
export const NOTE_WINDOWS = { perfect: 60, good: 130, ok: 200 }; // ± Millisekunden um den Notenzeitpunkt
export const NOTE_POINTS = { perfect: 100, good: 60, ok: 25 };
export const NOTE_LEAD = 2000;   // Zeit vom Start bis zur ersten Note
export const NOTE_SHOW = 2300;   // so lange vor dem Treffpunkt ist eine Note sichtbar
export const STRAY_PENALTY = 10;
export const comboBonus = (combo) => Math.min(combo, 10) * 5;

export function makeChart(seed, secs, lanes = 4, fast = false) {
  const rnd = mulberry32(seed), beat = fast ? 420 : 560, end = secs * 1000 - 1500, notes = [];
  let last = -1;
  const add = (t, avoid) => {
    let lane = Math.floor(rnd() * lanes);
    if (lanes > 1 && (lane === last || lane === avoid)) lane = (lane + 1 + Math.floor(rnd() * (lanes - 1))) % lanes;
    if (lanes > 1 && lane === avoid) lane = (lane + 1) % lanes;
    notes.push({ id: notes.length, lane, t: Math.round(t) });
    last = lane;
    return lane;
  };
  for (let t = NOTE_LEAD; t <= end; t += beat) {
    if (rnd() < .16) continue;
    const lane = add(t, -1);
    if (lanes > 1 && t + beat / 2 <= end && rnd() < (fast ? .25 : .15)) add(t + beat / 2, lane);
  }
  return notes;
}

export function gradeOf(dt) {
  const d = Math.abs(dt);
  return d <= NOTE_WINDOWS.perfect ? 'perfect' : d <= NOTE_WINDOWS.good ? 'good' : d <= NOTE_WINDOWS.ok ? 'ok' : null;
}

// ---------- Geschenkfänger ----------
export const GIFT = { floor: 545, spawnY: -30, basket: 110, minBasket: 60, speed: 420, margin: 14 };
export const GIFT_POINTS = { small: 10, big: 20, gold: 50, bomb: -30 };
export const giftY = (item, elapsed) => GIFT.spawnY + (elapsed - item.t0) * item.speed / 1000;

export function makeItems(seed, secs, golden = false) {
  const rnd = mulberry32(seed), items = [], end = secs * 1000 - 1800;
  for (let t = 700; t <= end; t += 380 + Math.floor(rnd() * 360)) {
    const r = rnd(), kind = r < .22 ? 'bomb' : golden && r < .3 ? 'gold' : r < .55 ? 'big' : 'small';
    items.push({ id: items.length, kind, x: Math.round(40 + rnd() * 820), t0: t, speed: Math.round(170 + rnd() * 70 + Math.min(70, t / 1000 * 1.4)) });
  }
  return items;
}

// ---------- Bomben-Duell ----------
export const GRID = { cols: 15, rows: 10, tile: 60 };
export const BOMB = { fuse: 2200, flame: 450, radius: 2, move: 160 };
export const SPAWNS = [[0, 0], [14, 9], [14, 0], [0, 9], [7, 0], [7, 9], [0, 4], [14, 4]];
export const cellIndex = (x, y) => y * GRID.cols + x;
export const cellCentre = (x, y) => ({ x: x * GRID.tile + GRID.tile / 2, y: y * GRID.tile + GRID.tile / 2 });

// 0 frei, 1 fester Pfeiler, 2 Kiste. Die Startfelder und ihre Nachbarn bleiben frei.
export function makeGrid(seed) {
  const rnd = mulberry32(seed), cells = new Array(GRID.cols * GRID.rows).fill(0);
  for (let y = 0; y < GRID.rows; y++) for (let x = 0; x < GRID.cols; x++) {
    if (x % 2 === 1 && y % 2 === 1) cells[cellIndex(x, y)] = 1;
    else if (rnd() < .5 && !SPAWNS.some(([sx, sy]) => Math.abs(sx - x) + Math.abs(sy - y) <= 1)) cells[cellIndex(x, y)] = 2;
  }
  return cells;
}

// Felder, die eine Explosion trifft; eine Kiste wird getroffen, bremst aber den Strahl. bombsAt: Set der Felder mit Bomben.
export function blastCells(cells, cx, cy, radius = BOMB.radius) {
  const hit = [cellIndex(cx, cy)], crates = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    for (let i = 1; i <= radius; i++) {
      const x = cx + dx * i, y = cy + dy * i;
      if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) break;
      const c = cells[cellIndex(x, y)];
      if (c === 1) break;
      hit.push(cellIndex(x, y));
      if (c === 2) { crates.push(cellIndex(x, y)); break; }
    }
  }
  return { hit, crates };
}

// ---------- Stillgestanden! ----------
export const FREEZE = { speed: .04, amber: 600, graceBase: 250, fakeMs: 420, stunReturn: 900, stunSoft: 2000 };
