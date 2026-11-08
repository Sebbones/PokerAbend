import { randomInt } from 'node:crypto';

export const BOARD_LENGTH = 24;
export const BOARD_ITEMS = ['boost', 'shield', 'snare'];
export const tileKind = (position) => position >= BOARD_LENGTH ? 'finish' : position > 0 && position % 6 === 0 ? 'storm' : position % 4 === 0 ? 'item' : position % 3 === 0 ? 'bonus' : 'task';
export function beginBoard(p) {
  p.board = { cursor: 0, die: 0, positions: Object.fromEntries(p.roster.map(({ id }) => [id, 0])),
    items: Object.fromEntries(p.roster.map(({ id }) => [id, 'shield'])), boosts: {}, shields: {}, history: [] };
}
export function boardStation(p, random = randomInt) {
  const b = p.board;
  b.die = 1 + random(6);
  b.cursor += b.die;
  return structuredClone(p.config.entries[(b.cursor - 1) % p.config.entries.length]);
}
export function scoreBoard(p, row, random = randomInt) {
  const b = p.board;
  for (const { id } of p.roster) {
    if (!(row.points[id] > 0)) continue; // Void rounds never re-trigger a tile or consume a boost.
    const movement = (row.points[id] || 0) + (b.boosts[id] || 0);
    delete b.boosts[id];
    if (!Object.hasOwn(row.points, id)) continue;
    b.positions[id] = Math.min(BOARD_LENGTH, b.positions[id] + movement);
    const tile = tileKind(b.positions[id]);
    if (tile === 'bonus') p.scores[id] += 2;
    if (tile === 'item' && !b.items[id]) b.items[id] = BOARD_ITEMS[random(BOARD_ITEMS.length)];
    if (tile === 'storm') {
      if (b.shields[id]) delete b.shields[id];
      else b.positions[id] = Math.max(0, b.positions[id] - 2);
    }
    b.history.push({ index: row.index, id, movement, position: b.positions[id], tile });
  }
  row.board = { positions: { ...b.positions }, cursor: b.cursor, die: b.die };
  return Object.values(b.positions).some((n) => n >= BOARD_LENGTH) || p.index + 1 >= p.config.boardRounds;
}
export function boardItem(room, id, { item, target } = {}) {
  const p = room.partyProgram, b = p?.board;
  if (!b || p.config.mode !== 'party-brett' || p.status !== 'between' || room.busy || room.gamePaused) throw new Error('Items gehen nur auf dem Brett zwischen Minispielen');
  if (!p.roster.some((person) => person.id === id) || !room.players.has(id) || b.items[id] !== item || !BOARD_ITEMS.includes(item)) throw new Error('Dieses Item hast du nicht');
  if (item === 'snare' && (target === id || !p.roster.some((person) => person.id === target))) throw new Error('Wähle einen anderen Mitspieler');
  if (item === 'boost') b.boosts[id] = 2;
  if (item === 'shield') b.shields[id] = true;
  if (item === 'snare') {
    if (b.shields[target]) delete b.shields[target];
    else b.positions[target] = Math.max(0, b.positions[target] - 2);
  }
  b.items[id] = null;
  b.history.push({ index: p.index, id, item, ...(item === 'snare' ? { target } : {}) });
}
export function boardWinners(p) {
  const best = Math.max(...Object.values(p.board.positions));
  const finalists = p.roster.filter(({ id }) => p.board.positions[id] === best);
  const score = Math.max(...finalists.map(({ id }) => p.scores[id]));
  return finalists.filter(({ id }) => p.scores[id] === score).map((person) => person.name);
}
export function validBoard(p) {
  const b = p.board, ids = p.roster.map(({ id }) => id);
  return b && Number.isInteger(b.cursor) && b.cursor >= 0 && b.cursor <= 72 && Number.isInteger(b.die) && b.die >= 1 && b.die <= 6
    && b.positions && b.items && b.boosts && b.shields && ids.every((id) => Number.isInteger(b.positions[id]) && b.positions[id] >= 0 && b.positions[id] <= BOARD_LENGTH && (b.items[id] === null || BOARD_ITEMS.includes(b.items[id])))
    && [b.positions, b.items, b.boosts, b.shields].every((o) => Object.keys(o).every((id) => ids.includes(id)))
    && Object.values(b.boosts).every((n) => n === 2) && Object.values(b.shields).every((v) => v === true)
    && Array.isArray(b.history) && b.history.length <= 500;
}
