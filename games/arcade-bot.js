// Bots der Arcade-Spiele: sie bekommen nur die eigene Ansicht (dieselben Frames wie Menschen), nie den Raum.
// Rhythmus-Bots tippen im Raum selbst (dieselbe Wertung wie bei Menschen) und brauchen hier keine Absicht.
import { GIFT, GRID, BOMB, blastCells, cellIndex, giftY } from './arcade-logic.js';

export function arcadeIntent(view, id) {
  const self = view.bodies.find((p) => p.id === id);
  if (!self?.alive) return null;
  if (view.kind === 'gift') return giftIntent(view, self);
  if (view.kind === 'freeze') return freezeIntent(view, self);
  if (view.kind === 'bomb') return bombIntent(view, self);
  return null;
}

function giftIntent(view, self) {
  const t = view.elapsed;
  // Nächstes Geschenk (keine Bombe), das noch über dem Korb ist.
  const wanted = view.items.filter((i) => i.kind !== 'bomb' && giftY(i, t) < GIFT.floor - 20).sort((a, b) => giftY(b, t) - giftY(a, t))[0];
  const bombs = view.items.filter((i) => i.kind === 'bomb' && giftY(i, t) > 250 && giftY(i, t) < GIFT.floor);
  let x = wanted ? Math.sign(wanted.x - self.x) * (Math.abs(wanted.x - self.x) > 12 ? 1 : 0) : 0;
  const reach = (self.w || GIFT.basket) / 2 + 20;
  const next = self.x + x * 100;
  if (bombs.some((b) => Math.abs(b.x - next) < reach)) x = bombs.some((b) => Math.abs(b.x - self.x) < reach) ? (self.x > 450 ? -1 : 1) : 0;
  return { x, y: 0 };
}

// Reaktion: bei Gelb meist anhalten, bei Rot immer – kleine Fehler machen Bots menschlich.
function freezeIntent(view, self) {
  if (self.stun > 0) return { x: 0, y: 0 };
  if (view.signal === 'red') return { x: 0, y: 0 };
  if (view.signal === 'amber') return { x: 0, y: Math.floor(view.elapsed / 200) % 10 === 0 ? -1 : 0 };
  return { x: 0, y: -1 };
}

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function bombIntent(view, self) {
  const cells = [...view.cells].map(Number), at = (x, y) => cellIndex(x, y);
  const inside = (x, y) => x >= 0 && y >= 0 && x < GRID.cols && y < GRID.rows;
  const bombCells = new Set(view.bombs.map((b) => at(b.cx, b.cy)));
  const danger = new Set(view.flames.map(([i]) => i));
  for (const b of view.bombs) for (const i of blastCells(cells, b.cx, b.cy).hit) if (b.explodeAt - view.elapsed < BOMB.fuse) danger.add(i);
  const walkable = (x, y, extra = null) => inside(x, y) && cells[at(x, y)] === 0 && !bombCells.has(at(x, y)) && !(extra && extra.has(at(x, y)));
  // Breitensuche: erstes Feld eines kürzesten Weges zum nächsten Feld, das goal(x,y) erfüllt.
  const route = (goal, blocked = null, maxDepth = 30, avoidDanger = true) => {
    const seen = new Set([at(self.cx, self.cy)]);
    let layer = [{ x: self.cx, y: self.cy, first: null }];
    for (let depth = 0; depth < maxDepth && layer.length; depth++) {
      const nextLayer = [];
      for (const n of layer) for (const [dx, dy] of DIRS) {
        const x = n.x + dx, y = n.y + dy, i = inside(x, y) ? at(x, y) : -1;
        if (i < 0 || seen.has(i) || !walkable(x, y, blocked) || (avoidDanger && danger.has(i))) continue;
        seen.add(i);
        const first = n.first || { x: dx, y: dy };
        if (goal(x, y)) return first;
        nextLayer.push({ x, y, first });
      }
      layer = nextLayer;
    }
    return null;
  };
  const here = at(self.cx, self.cy);
  if (danger.has(here)) {
    const away = route((x, y) => !danger.has(at(x, y)), null, 12, false);
    return away ? { ...away } : { x: 0, y: 0 };
  }
  const mine = view.bombs.some((b) => b.owner === self.id);
  const enemies = view.bodies.filter((p) => p.id !== self.id && p.alive);
  const nearCrate = DIRS.some(([dx, dy]) => inside(self.cx + dx, self.cy + dy) && cells[at(self.cx + dx, self.cy + dy)] === 2);
  const nearEnemy = enemies.some((e) => (e.cx === self.cx && Math.abs(e.cy - self.cy) <= 2) || (e.cy === self.cy && Math.abs(e.cx - self.cx) <= 2));
  if (!mine && !bombCells.has(here) && (nearCrate || nearEnemy)) {
    // Nur legen, wenn nach dem Legen ein sicheres Feld in Reichweite bleibt.
    const hypo = new Set(blastCells(cells, self.cx, self.cy).hit);
    const bombed = new Set([here]);
    const seen = new Set([here]); let layer = [[self.cx, self.cy]], escape = false;
    for (let depth = 0; depth < 6 && layer.length && !escape; depth++) {
      const nextLayer = [];
      for (const [x, y] of layer) for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (!inside(nx, ny) || seen.has(at(nx, ny)) || cells[at(nx, ny)] !== 0 || bombCells.has(at(nx, ny)) || bombed.has(at(nx, ny)) || danger.has(at(nx, ny))) continue;
        seen.add(at(nx, ny));
        if (!hypo.has(at(nx, ny))) { escape = true; break; }
        nextLayer.push([nx, ny]);
      }
      layer = nextLayer;
    }
    if (escape) return { x: 0, y: 0, bomb: true };
  }
  const crateAdjacent = (x, y) => DIRS.some(([dx, dy]) => inside(x + dx, y + dy) && cells[at(x + dx, y + dy)] === 2);
  const target = enemies.length && Math.floor(view.elapsed / 8000) % 2 ? (x, y) => enemies.some((e) => e.cx === x && e.cy === y) : crateAdjacent;
  const step = route(target) || route(crateAdjacent);
  return step ? { ...step } : { x: 0, y: 0 };
}
