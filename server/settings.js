// Einstellungen (V2-05/V2-15): ein validiertes Schema für alles, was an der Spieler-ID hängt und auf allen verbundenen Geräten gilt.
// Rein lokale Anzeigen (Theme, Filter, Blöcke) stehen hier; öffentliche Privatsphäre steht getrennt in account.privacy (V2-04).
// UI-Ausblenden ändert nie Rechte oder Spielregeln – der Server prüft Berechtigungen unabhängig von diesen Werten.
export const CATEGORIES = ['karten', 'wuerfel', 'brett', 'party', 'einzelspieler'];
export const BLOCKS = ['presence', 'recent', 'favorites', 'achievements', 'leaderboard', 'reviews', 'planning', 'roadmap', 'tickets'];
export const FILTERS = ['all', 'fav', 'p2', 'p34', 'p56', 'p7'];

export const SETTINGS_DEFAULTS = Object.freeze({
  display: Object.freeze({ theme: 'classic', cardSize: 'normal', calm: false, reduceGlass: false, language: 'de' }),
  controls: Object.freeze({ doubleTap: true, confirmations: true }),
  hub: Object.freeze({ hiddenCategories: Object.freeze([]), defaultFilter: 'all', hiddenBlocks: Object.freeze([]) }),
  sound: Object.freeze({ enabled: true }),
});

const bool = (v) => typeof v === 'boolean';
const oneOf = (list) => (v) => typeof v === 'string' && list.includes(v);
const subset = (list) => (v) => Array.isArray(v) && v.length <= list.length * 2 && v.every((x) => typeof x === 'string' && list.includes(x));
// Jedes Feld: Prüfung und Bereinigung. Alles Unbekannte oder Ungültige fällt auf den Standard (bzw. den bisherigen Wert) zurück.
const FIELDS = {
  display: { theme: oneOf(['classic', 'night']), cardSize: oneOf(['normal', 'large', 'xl']), calm: bool, reduceGlass: bool, language: oneOf(['de', 'en']) },
  controls: { doubleTap: bool, confirmations: bool },
  hub: { hiddenCategories: subset(CATEGORIES), defaultFilter: oneOf(FILTERS), hiddenBlocks: subset(BLOCKS) },
  sound: { enabled: bool },
};
const clone = (v) => (Array.isArray(v) ? [...v] : v);
const fresh = () => Object.fromEntries(Object.entries(SETTINGS_DEFAULTS).map(([s, o]) => [s, Object.fromEntries(Object.entries(o).map(([k, v]) => [k, clone(v)]))]));

// Nimmt beliebige Eingaben und liefert immer ein vollständiges, gültiges Objekt (auf Basis von base).
export function mergeSettings(base, patch) {
  const out = sanitizeSettings(base);
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return out;
  for (const [section, fields] of Object.entries(FIELDS)) {
    const p = patch[section];
    if (!p || typeof p !== 'object' || Array.isArray(p)) continue;
    for (const [key, valid] of Object.entries(fields)) if (Object.hasOwn(p, key) && valid(p[key])) out[section][key] = Array.isArray(p[key]) ? [...new Set(p[key])] : p[key];
  }
  return out;
}
export const sanitizeSettings = (input) => {
  const out = fresh();
  if (!input || typeof input !== 'object' || Array.isArray(input)) return out;
  for (const [section, fields] of Object.entries(FIELDS)) {
    const p = input[section];
    if (!p || typeof p !== 'object' || Array.isArray(p)) continue;
    for (const [key, valid] of Object.entries(fields)) if (Object.hasOwn(p, key) && valid(p[key])) out[section][key] = Array.isArray(p[key]) ? [...new Set(p[key])] : p[key];
  }
  return out;
};
// Ein Patch ist gültig, wenn er nur bekannte Bereiche/Felder mit gültigen Werten enthält (für die Schnittstelle: ablehnen statt still ignorieren)
export function patchProblem(patch) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || !Object.keys(patch).length) return 'Ungültige Einstellungen';
  for (const [section, p] of Object.entries(patch)) {
    if (!FIELDS[section] || !p || typeof p !== 'object' || Array.isArray(p) || !Object.keys(p).length) return `Unbekannter Bereich: ${section}`.slice(0, 80);
    for (const [key, value] of Object.entries(p)) if (!FIELDS[section][key]) return `Unbekannte Einstellung: ${key}`.slice(0, 80); else if (!FIELDS[section][key](value)) return `Ungültiger Wert für ${key}`.slice(0, 80);
  }
  return '';
}
export const isDefault = (settings) => JSON.stringify(sanitizeSettings(settings)) === JSON.stringify(SETTINGS_DEFAULTS);
