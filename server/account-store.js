// Verzeichnis aller Konten (data/accounts.json): interne AccountId (nie öffentlich), kurze öffentliche Game-ID, letzter Name.
// Ein Konto entsteht ohne E-Mail und Passwort beim ersten Besuch eines Browsers. Bots sind nie Konten.
// Format versioniert (schemaVersion); eine unlesbare Datei wird vor dem Überschreiben gesichert.
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanName } from './security.js';

export const SCHEMA_VERSION = 1;
export const ACCOUNT_ID = /^[a-f0-9]{32}$/;
// Ohne leicht verwechselbare Zeichen (0/O, 1/I/L)
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const GAME_ID = /^#[A-HJKMNP-Z2-9]{4,6}$/;
const AUDIT_MAX = 200;
// V2-04: Profil-Freigaben (Vorbereitung für V2-05). Standard: Statistik, Favoriten, letzte Partien und Erfolge sichtbar, Discord-Name nicht.
export const PRIVACY_DEFAULTS = Object.freeze({ hidden: false, showDiscord: false, showStats: true, showFavorites: true, showRecent: true, showAchievements: true });
export const PRIVACY_KEYS = Object.keys(PRIVACY_DEFAULTS);
const emptyState = () => ({ schemaVersion: SCHEMA_VERSION, accounts: {}, externals: {}, audit: [] });

export function createAccountStore(dir, { now = Date.now, onChange = () => {} } = {}) {
  const file = join(dir, 'accounts.json');
  let state = emptyState(), dirty = false, unreadable = null;
  try { if (existsSync(file)) state = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { unreadable = e.message; }
  if (!state || typeof state !== 'object' || Array.isArray(state) || !state.accounts || typeof state.accounts !== 'object' || Array.isArray(state.accounts)) { unreadable ||= 'unerwartete Struktur'; state = emptyState(); }
  if (state.schemaVersion > SCHEMA_VERSION) { unreadable ||= `schemaVersion ${state.schemaVersion} ist neuer als ${SCHEMA_VERSION}`; state = emptyState(); }
  if (unreadable) {
    console.error('Konto-Verzeichnis nicht lesbar:', unreadable);
    try { copyFileSync(file, `${file}.unlesbar-${new Date().toISOString().replace(/[:.]/g, '-')}`); }
    catch (e) { console.error('Sicherung des Konto-Verzeichnisses fehlgeschlagen:', e.message); }
  }
  state.accounts = Object.assign(Object.create(null), state.accounts);
  state.externals = Object.assign(Object.create(null), state.externals && typeof state.externals === 'object' ? state.externals : {});
  state.audit = Array.isArray(state.audit) ? state.audit.slice(-AUDIT_MAX) : [];
  const byGameId = new Map(Object.values(state.accounts).filter((a) => a?.gameId).map((a) => [a.gameId, a.id]));

  const touched = () => { dirty = true; onChange(); }; // der Besitzer speichert verzögert (server/index.js)
  const audit = (action, detail = '') => { state.audit.push({ at: now(), action, detail: String(detail).slice(0, 200) }); if (state.audit.length > AUDIT_MAX) state.audit.shift(); touched(); };
  function newGameId() {
    for (let length = 4; length <= 6; length++) {
      for (let tries = 0; tries < 50; tries++) {
        let id = '#';
        for (let i = 0; i < length; i++) id += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
        if (!byGameId.has(id)) return id;
      }
    }
    throw new Error('Keine freie Game-ID gefunden');
  }
  // Ein Konto, das in ein anderes aufgegangen ist (zweites Gerät), zeigt auf das Ziel
  function resolve(id) {
    for (let hops = 0; hops < 5 && typeof id === 'string'; hops++) {
      const a = state.accounts[id];
      if (!a?.mergedInto) return a ? id : null;
      id = a.mergedInto;
    }
    return null;
  }

  return {
    newId: () => randomBytes(16).toString('hex'),
    resolve,
    has: (id) => typeof id === 'string' && !!state.accounts[id],
    // Legt das Konto beim ersten Gebrauch an. Nur gültige, vom Server gewürfelte IDs (nie „bot_…“)
    ensure(id) {
      if (typeof id !== 'string' || !ACCOUNT_ID.test(id)) return null;
      const target = resolve(id);
      if (target) { const a = state.accounts[target]; a.lastSeen = now(); return a; }
      const a = { id, gameId: newGameId(), createdAt: now(), lastSeen: now(), name: '', avatar: '', mergedInto: null, discord: null, privacy: { ...PRIVACY_DEFAULTS }, achievements: {} };
      state.accounts[id] = a; byGameId.set(a.gameId, id); audit('Konto angelegt', a.gameId);
      return a;
    },
    get(id) { const t = resolve(id); return t ? state.accounts[t] : null; },
    // V2-03: „registriert“ = mit einer Discord-Identität verknüpft (Gäste und Bots sind es nie). Die ID kommt vom Server, nie vom Client.
    isRegistered(id) { const t = resolve(id); return !!t && Object.entries(state.externals).some(([key, owner]) => key.startsWith('discord:') && resolve(owner) === t); },
    byGameId: (gameId) => { const id = byGameId.get(gameId); return id ? state.accounts[id] : null; },
    // Der zuletzt benutzte Anzeigename; er ist nie die Identität
    touch(id, { name, avatar } = {}) {
      const a = this.get(id); if (!a) return null;
      const clean = typeof name === 'string' ? cleanName(name) : '';
      if (clean && clean !== a.name) { a.name = clean; touched(); }
      if (typeof avatar === 'string' && avatar.length <= 8 && avatar !== a.avatar) { a.avatar = avatar; touched(); }
      return a;
    },
    // Zweites Gerät wird dieselbe Person: from zeigt danach auf to
    merge(from, to) {
      const f = resolve(from), t = resolve(to);
      if (!f || !t || f === t) return false;
      { const src = state.accounts[f], dst = state.accounts[t]; if (src.achievements) { dst.achievements = dst.achievements || {}; for (const [k, v] of Object.entries(src.achievements)) if (!dst.achievements[k] || v < dst.achievements[k]) dst.achievements[k] = v; } }
      state.accounts[f].mergedInto = t; byGameId.delete(state.accounts[f].gameId);
      audit('Geräte verbunden', `${state.accounts[f].gameId} → ${state.accounts[t].gameId}`);
      return true;
    },
    // Vorbereitung für V2-02: eine externe Identität (z. B. „discord“) hängt an genau einem Konto
    linkExternal(id, provider, externalId) {
      const t = resolve(id); const key = `${provider}:${externalId}`;
      if (!t || !/^[a-z]{2,16}$/.test(String(provider)) || !/^[\w.-]{1,64}$/.test(String(externalId))) throw new Error('Ungültige externe Identität');
      if (state.externals[key] && state.externals[key] !== t) throw new Error('Diese externe Identität gehört schon zu einem anderen Konto');
      state.externals[key] = t; audit('Externe Identität verknüpft', provider);
      return true;
    },
    unlinkExternal(id, provider) {
      const t = resolve(id); let removed = false;
      for (const [key, owner] of Object.entries(state.externals)) if (key.startsWith(`${provider}:`) && resolve(owner) === t) { delete state.externals[key]; removed = true; }
      if (removed) { state.accounts[t].discord = null; audit('Externe Identität getrennt', provider); }
      return removed;
    },
    // Anzeigedaten des Anbieters (z. B. Discord-Name); die ID selbst steht nur in externals
    setExternalProfile(id, data) { const t = resolve(id); if (!t) return false; state.accounts[t].discord = data; touched(); return true; },
    findExternal: (provider, externalId) => resolve(state.externals[`${provider}:${externalId}`]),
    // V2-04: Freigaben – immer vollständig und nur mit bekannten Schaltern (alte Konten ohne Feld bekommen die Standardwerte)
    privacyOf(id) { const a = this.get(id); const own = a?.privacy && typeof a.privacy === 'object' ? a.privacy : {}; return Object.fromEntries(PRIVACY_KEYS.map((k) => [k, typeof own[k] === 'boolean' ? own[k] : PRIVACY_DEFAULTS[k]])); },
    setPrivacy(id, patch) {
      const a = this.get(id); if (!a) return false;
      const next = { ...this.privacyOf(id) };
      for (const k of PRIVACY_KEYS) if (typeof patch?.[k] === 'boolean') next[k] = patch[k];
      a.privacy = next; audit('Profil-Freigaben geändert', a.gameId); return true;
    },
    // Erfolge: erster Zeitpunkt je freigeschaltetem Erfolg (die Berechnung selbst bleibt in achievements.js)
    achievementTimes(id) { const a = this.get(id); return a?.achievements && typeof a.achievements === 'object' ? { ...a.achievements } : {}; },
    recordAchievements(id, ids, at = now()) {
      const a = this.get(id); if (!a) return [];
      const known = a.achievements && typeof a.achievements === 'object' ? a.achievements : (a.achievements = {}), fresh = [];
      for (const key of ids) if (/^[a-zäöüß-]{2,40}$/.test(String(key)) && !known[key]) { known[key] = at; fresh.push(key); }
      if (fresh.length) touched();
      return fresh;
    },
    audit,
    auditLog: (n = 50) => state.audit.slice(-n).reverse(),
    count: () => Object.values(state.accounts).filter((a) => !a.mergedInto).length,
    save() {
      if (!dirty) return;
      mkdirSync(dir, { recursive: true });
      writeFileSync(file + '.tmp', JSON.stringify(state), { mode: 0o600 });
      renameSync(file + '.tmp', file);
      dirty = false;
    },
  };
}
