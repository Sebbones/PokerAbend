// Betrieb: Version, Admin-Protokoll, Browser-Fehler und Systemwerte für die Admin-Seite.
import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanText } from './security.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Version aus package.json, Commit aus dem Build-Argument (APP_COMMIT) */
export function versionInfo(env = process.env) {
  let version = '0.0.0';
  try { version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version || version; } catch { /* ohne package.json: unbekannt */ }
  const raw = String(env.APP_COMMIT || '').trim().toLowerCase();
  const commit = /^[0-9a-f]{7,40}$/.test(raw) ? raw : '';
  return { version, commit, short: commit.slice(0, 7) };
}

// ---------- Admin-Protokoll ----------
// Wer hat wann was getan. Eine defekte Datei bleibt unangetastet; das Protokoll läuft dann nur im Speicher.
const LOG_MAX = 500;
export function createAdminLog(dir) {
  const file = join(dir, 'admin-log.json');
  let entries = [], writable = true;
  try { if (existsSync(file)) entries = JSON.parse(readFileSync(file, 'utf8')); if (!Array.isArray(entries)) throw new Error('kein Protokoll'); }
  catch (error) { entries = []; writable = false; console.error('Admin-Protokoll nicht lesbar:', error.message); }
  return {
    add(action, detail = '') {
      entries.push({ at: Date.now(), action: cleanText(action, 60), detail: cleanText(detail, 200) });
      if (entries.length > LOG_MAX) entries.splice(0, entries.length - LOG_MAX);
      if (!writable) return;
      try {
        mkdirSync(dir, { recursive: true });
        writeFileSync(file + '.tmp', JSON.stringify(entries));
        renameSync(file + '.tmp', file);
      } catch (error) { console.error('Admin-Protokoll nicht gespeichert:', error.message); }
    },
    recent(n = 50) { return entries.slice(-n).reverse(); },
  };
}

// ---------- Fehler aus dem Browser ----------
const GROUPS_MAX = 100;
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const redactUrl =(text) => text.replace(/https?:\/\/[^\s)'"]+/g, (url) => url.split(/[?#]/)[0]);
/** Text kürzen, URL-Parameter und bekannte Spielernamen entfernen – Namen und Chat-Inhalte gehören nicht ins Fehlerprotokoll */
export function cleanClientError(text, names = [], max = 200) {
  let out = redactUrl(cleanText(text, 1000));
  for (const name of names) {
    const n = String(name || '').trim();
    if (n.length >= 2) out = out.replace(new RegExp(escapeRegExp(n), 'gi'), '…');
  }
  return out.slice(0, max);
}
export function createClientErrors() {
  const groups = new Map();
  return {
    record({ message, where = '', game = 'hub' }) {
      if (!message) return;
      const key = `${game}\n${message}`;
      let g = groups.get(key);
      if (!g) {
        if (groups.size >= GROUPS_MAX) {
          const oldest = [...groups.entries()].sort((a, b) => a[1].last - b[1].last)[0];
          groups.delete(oldest[0]);
        }
        g = { message, game, where, count: 0, first: Date.now(), last: 0 };
        groups.set(key, g);
      }
      g.count++; g.last = Date.now();
    },
    list(n = 50) { return [...groups.values()].sort((a, b) => b.last - a.last).slice(0, n); },
    get size() { return groups.size; },
  };
}

// ---------- Systemwerte ----------
export function createSystemSampler() {
  let last = { usage: process.cpuUsage(), at: process.hrtime.bigint() }, percent = 0;
  const sample = () => {
    const now = process.hrtime.bigint(), usage = process.cpuUsage();
    const wallUs = Number(now - last.at) / 1000;
    const cpuUs = (usage.user - last.usage.user) + (usage.system - last.usage.system);
    if (wallUs > 0) percent = Math.min(100 * 8, Math.round((cpuUs / wallUs) * 1000) / 10);
    last = { usage, at: now };
  };
  const timer = setInterval(sample, 10000);
  timer.unref();
  return {
    stats() {
      sample();
      const m = process.memoryUsage();
      return { uptimeSec: Math.round(process.uptime()), node: process.version, cpuPercent: percent, memory: { rss: m.rss, heapUsed: m.heapUsed, heapTotal: m.heapTotal } };
    },
  };
}

/** Größe der Datendateien; Verläufe zusammengefasst, Schlüsseldatei nur mit Größe ohne Inhalt */
export function dataFiles(dir) {
  const files = [];
  let history = { name: 'history-*.json', count: 0, size: 0 };
  try {
    for (const name of readdirSync(dir)) {
      let st; try { st = statSync(join(dir, name)); } catch { continue; }
      if (!st.isFile() || name.endsWith('.tmp')) continue;
      if (/^history-[A-Z0-9]+\.json$/.test(name)) { history.count++; history.size += st.size; continue; }
      files.push({ name, size: st.size, modified: st.mtimeMs });
    }
  } catch { /* Ordner fehlt noch */ }
  if (history.count) files.push({ name: `history-*.json (${history.count})`, size: history.size, modified: null });
  const sorted = files.sort((a, b) => b.size - a.size);
  return { files: sorted, total: sorted.reduce((sum, f) => sum + f.size, 0) };
}
