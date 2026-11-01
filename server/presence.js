// Anwesenheit und zuletzt gesehen ausschließlich im Speicher. Namen wie in der Bestenliste bündeln.
import { cleanName } from './security.js';
import { nameKey } from './leaderboard.js';
import { AVATARS } from './base-room.js';

const DAY = 24 * 60 * 60 * 1000;
const MAX_REMEMBERED = 200; // „zuletzt online“ und versteckte Namen: Obergrenze gegen ständig wechselnde Namen
const priority = { playing: 4, watching: 3, home: 2, away: 1 };
export function createPresence({ location = () => ({ kind: 'home' }), emit = () => {}, now = Date.now, delay = 2000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const connections = new Map(), recent = new Map(), hidden = new Map();
  let timer = null, last = '';
  function snapshot() {
    const groups = new Map();
    for (const [id, p] of connections) {
      if (!groups.has(p.key)) groups.set(p.key, []);
      groups.get(p.key).push({ ...p, id });
    }
    const online = [];
    for (const [key, tabs] of groups) {
      if (tabs.some((p) => !p.visible) || hidden.has(key)) continue;
      const rows = tabs.map((p) => {
        const place = location(p.id);
        if (!place || place.bot) return null;
        const kind = !p.active || p.parked ? 'away' : place.kind || 'home';
        const base = { key, name: p.name, avatar: p.avatar, kind,
          status: kind === 'away' ? 'kurz weg' : kind === 'home' ? 'auf der Startseite' : place.private ? 'an einem privaten Tisch' : `${kind === 'playing' ? 'spielt' : 'schaut'} ${place.gameName}${kind === 'watching' ? ' zu' : ''}` };
        if (kind !== 'away' && !place.private && place.code) Object.assign(base, { code: place.code, game: place.game, canJoin: !!place.canJoin });
        return base;
      }).filter(Boolean).sort((a, b) => priority[b.kind] - priority[a.kind]);
      if (rows.length) online.push(rows[0]);
    }
    const active = new Set(online.map((p) => p.key));
    for (const [key, p] of recent) if (now() - p.at >= DAY) recent.delete(key);
    for (const [key, at] of hidden) if (!groups.has(key) && now() - at >= DAY) hidden.delete(key);
    return { online: online.sort((a, b) => a.name.localeCompare(b.name, 'de')), recent: [...recent.values()].filter((p) => !active.has(p.key) && !hidden.has(p.key)).sort((a, b) => b.at - a.at) };
  }
  function changed() {
    if (timer !== null) return;
    timer = setTimer(() => {
      timer = null;
      const data = snapshot(), json = JSON.stringify(data);
      if (json !== last) { last = json; emit(data); }
    }, delay);
    timer?.unref?.();
  }
  function remember(p) {
    if (!p || !p.visible || hidden.has(p.key) || [...connections.values()].some((other) => other.key === p.key)) return;
    const place = location(p.id);
    if (place?.bot) return;
    recent.delete(p.key);
    recent.set(p.key, { key: p.key, name: p.name, avatar: p.avatar, at: now() });
    while (recent.size > MAX_REMEMBERED) recent.delete(recent.keys().next().value);
  }
  return {
    snapshot, changed,
    update(id, data) {
      if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.name !== 'string') return false;
      if (data.visible !== undefined && typeof data.visible !== 'boolean' || data.active !== undefined && typeof data.active !== 'boolean') return false;
      const name = cleanName(data.name);
      if (!name) return false;
      const p = { id, name, key: nameKey(name), avatar: AVATARS.includes(data.avatar) ? data.avatar : AVATARS[0], visible: data.visible !== false, active: data.active !== false, parked: false };
      const old = connections.get(id);
      connections.set(id, p);
      if (old?.key !== p.key) remember(old);
      if (!p.visible) {
        hidden.delete(p.key); hidden.set(p.key, now()); recent.delete(p.key);
        while (hidden.size > MAX_REMEMBERED) hidden.delete(hidden.keys().next().value);
      }
      else if (![...connections.values()].some((other) => other.key === p.key && !other.visible)) hidden.delete(p.key);
      changed();
      return true;
    },
    park(id) { const p = connections.get(id); if (p) { p.parked = true; changed(); } },
    disconnect(id) { const p = connections.get(id); connections.delete(id); remember(p); changed(); },
    dispose() { if (timer !== null) clearTimer(timer); timer = null; connections.clear(); recent.clear(); hidden.clear(); },
  };
}
