import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { cleanText } from '../../server/security.js';
import { BOARD, PROPERTIES } from '../../public/games/monopoly/data.js';

// Ersteller: interne Konto-ID (V2-01) – bleibt auf dem Server, die Brettliste nennt sie nie
const creatorId = (value) => (typeof value === 'string' && /^[a-f0-9]{32}$/.test(value) ? value : null);

export function createBoardStore(dir = null) {
  const file = dir ? join(dir, 'monopoly-boards.json') : null;
  let boards = [];
  if (file && existsSync(file)) {
    const data = JSON.parse(readFileSync(file, 'utf8'));
    if (!Array.isArray(data.boards) || data.boards.length > 20) throw new Error('Ungültige Monopoly-Brettdatei');
    boards = data.boards.map((b) => ({ ...validate(b, b.id), creator: creatorId(b.creator) }));
    if (new Set(boards.map((b) => b.id)).size !== boards.length) throw new Error('Doppelte Brett-ID');
  }
  function validate(input, id) {
    if (typeof id !== 'string' || !/^[a-zA-Z0-9-]{1,50}$/.test(id)) throw new Error('Ungültige Brett-ID');
    const title = cleanText(input?.title, 60);
    if (!title || !Array.isArray(input.names) || input.names.length !== PROPERTIES.length) throw new Error('Titel und 28 Grundstücksnamen angeben');
    const names = input.names.map((n) => cleanText(n, 40));
    if (names.some((n) => !n)) throw new Error('Alle Grundstücke brauchen einen Namen');
    return { id, title, names };
  }
  const persistBoards = (list) => {
    if (!file) return;
    mkdirSync(dir, { recursive: true });
    const temp = file + '.tmp';
    writeFileSync(temp, JSON.stringify({ version: 1, boards: list }, null, 2), { mode: 0o600 });
    renameSync(temp, file);
  };
  const list = () => [{ id: 'default', title: 'Spieleabend-Stadt', names: PROPERTIES.map((i) => BOARD[i].name) }, ...structuredClone(boards).map(({ creator, ...board }) => board)];
  return {
    list,
    get(id = 'default') { const b = list().find((b) => b.id === id); if (!b) throw new Error('Brett nicht gefunden'); return b; },
    save(input, creator = null) {
      if (boards.length >= 20) throw new Error('Höchstens 20 eigene Bretter');
      const b = { ...validate(input, randomUUID()), creator: creatorId(creator) }, next = [...boards, b];
      persistBoards(next);
      boards = next; const { creator: _creator, ...open } = b; return structuredClone(open);
    },
    // V2-01: Ersteller wechselt, wenn zwei Geräte eine Person werden
    rebind(from, to) {
      if (!creatorId(to)) return 0;
      const next = boards.map((b) => (b.creator === from ? { ...b, creator: to } : b)), n = next.filter((b, i) => b !== boards[i]).length;
      if (n) { persistBoards(next); boards = next; }
      return n;
    },
  };
}
let store = createBoardStore();
export const boardStore = () => store;
export const configureBoards = (dir) => {
  try { store = createBoardStore(dir); }
  catch (error) {
    console.error('Eigene Monopoly-Bretter konnten nicht geladen werden:', error.message);
    const fallback = createBoardStore();
    store = { ...fallback, save() { throw new Error('Die Brettdatei kann nicht gelesen werden. Sie bleibt erhalten; eigene Bretter sind vorübergehend schreibgeschützt.'); } };
  }
};
