// Gemeinsame Grundlage für alle Spiele: Spieler, Host, Wegbleiben und Verlauf.
// Jedes Spiel erweitert diese Klasse (siehe games/poker/room.js) und füllt die Haken unten.
import { randomBytes } from 'node:crypto';
import { cleanName } from './security.js';
import { RoomClock } from './room-clock.js';

export const AVATARS = ['🦊', '🐻', '🐼', '🐸', '🦉', '🐯', '🐙', '🦄', '🐺', '🐧', '🦁', '🐢'];
export const MAX_PEOPLE = 30;         // Spieler und Zuschauer pro Raum
export const HISTORY_ROUNDS = 500;    // so viele Runden bleiben im Verlauf (auch über einen Neustart)
const HISTORY_MAX = 40000;            // Notbremse: höchstens so viele Einträge
// Verlauf-Filter: action (Aktionen), win (Gewinne), cards (Karten), system, react (Reaktionen), hand (Überschrift einer Runde)
export const LOG_CATS = ['action', 'win', 'cards', 'system', 'react'];
const CAT_OF_KIND = { hand: 'hand', bet: 'action', street: 'cards', win: 'win', summary: 'win', react: 'react' };

export class BaseRoom {
  constructor(code, onChange) {
    this.code = code;
    this.clock = new RoomClock();
    this.players = new Map(); // id → Spieler
    this.hostId = null;
    this.log = [];            // ganzer Verlauf: { n, text, kind, cat, hand, at }
    this.logSeq = 0;
    this.historyDirty = false;
    // onChange(kind, data): 'state' = alle neu zeichnen, 'handDone' = speichern;
    // mit data.to geht das Ereignis nur an diesen Spieler (z. B. Anstupsen)
    this.onChange = onChange || (() => {});
    this.lastActivity = Date.now();
    this.unlisted = false;    // privater Tisch: erscheint nicht in der Liste der offenen Tische (nur per Code/Link)
  }

  // ---------- Haken für das Spiel ----------
  get round() { return 0; }          // Nummer der laufenden Runde (für den Verlauf)
  get busy() { return false; }       // läuft gerade eine Runde? Dann wird nicht gespeichert
  playerFields() { return {}; }      // spielspezifische Felder für neue Spieler
  leaveGame() { return false; }      // beim Entfernen: true = erst nach der laufenden Runde verschwinden
  dispose() { this.clock.dispose(); } // Timer stoppen, wenn der Raum gelöscht wird
  afterChange() {}                   // nach jedem Ereignis: Timer nachziehen, automatische Züge …
  view() { return {}; }              // was ein Spieler sehen darf (nur das!)
  // Für die Liste der offenen Tische – NUR Unbedenkliches: { seats: [{ name, avatar, bot }], max, watchers, status }. null = nicht listen.
  lobbyInfo() { return null; }
  snapshot() { return {}; }          // Spielstand zum Speichern

  // Gemeinsame Sofort-Pause: nur der Host; ein expliziter Wert macht Wiederholungen sicher.
  get gamePaused() { return this.clock.paused; }
  pauseView() { return { gamePaused: this.gamePaused, now: this.clock.now() }; }
  setGamePaused(id, value) {
    this.requireHost(id);
    if (typeof value !== 'boolean') throw new Error('Bitte Pause oder Weiterspielen wählen');
    if (value === this.gamePaused) return;
    if (value && !this.busy && !this.started) throw new Error('Gerade läuft kein Spiel');
    this.clock.setPaused(value);
    this.onGamePause(value);
    this.say(value ? 'Der Host hat das Spiel für alle angehalten' : 'Der Host setzt das Spiel fort', 'warn');
  }
  onGamePause() {} // Haken: zusätzliche Spielanzeigen auf die Pause abstimmen

  // ---------- Spieler ----------
  // Name und Emoji-Avatar kommen aus der Lobby
  // bot: Computer-Mitspieler bekommen eine eigene ID mit Präfix „bot_“ und nie eine Konto-ID (V2-01)
  addPlayer(name, avatar, { bot = false } = {}) {
    if (typeof name !== 'string') throw new Error('Bitte gib einen Namen ein');
    name = cleanName(name);
    if (!name) throw new Error('Bitte gib einen Namen ein');
    if (this.nameTaken(name)) throw Object.assign(new Error('Der Name ist schon vergeben'), { extra: { suggestion: this.uniqueName(name) } });
    if (this.players.size >= MAX_PEOPLE) throw new Error('Der Raum ist voll');
    const p = {
      id: bot ? `bot_${randomBytes(5).toString('hex')}` : randomBytes(6).toString('hex'), token: randomBytes(24).toString('hex'), name,
      avatar: AVATARS.includes(avatar) ? avatar : AVATARS[this.players.size % AVATARS.length],
      connected: false, socketId: null,
    };
    Object.assign(p, this.playerFields(p));
    this.players.set(p.id, p);
    if (!this.hostId) this.hostId = p.id;
    this.say(`${name} ist da`);
    return p;
  }

  nameTaken(name) { return [...this.players.values()].some((p) => p.name.toLowerCase() === name.toLowerCase()); }
  // Freier Name zum Vorschlagen: „Tobi 2“, „Tobi 3“ … (höchstens 16 Zeichen)
  uniqueName(name) {
    for (let n = 2; n < 100; n++) {
      const suffix = ` ${n}`;
      const candidate = name.slice(0, 16 - suffix.length).trimEnd() + suffix;
      if (!this.nameTaken(candidate)) return candidate;
    }
    return null;
  }

  byToken(token) {
    for (const p of this.players.values()) if (p.token === token) return p;
    return null;
  }

  remove(id, message) {
    const p = this.players.get(id);
    if (!p || p.kicked) return;
    this.say(message || `${p.name} wurde vom Tisch entfernt`);
    if (this.hostId === id) this.transferHost();
    // Läuft noch eine Runde, verschwindet er erst danach (das Spiel räumt dann auf)
    if (this.leaveGame(p)) { p.kicked = true; return; }
    this.players.delete(id);
  }

  // Wer länger als ms offline ist, fliegt mit allen Daten raus. Ist es der Host, übernimmt jemand anderes.
  dropAway(ms, now = Date.now()) {
    let dropped = 0;
    for (const p of [...this.players.values()]) {
      if (p.bot || p.connected || p.kicked || now - (p.offlineSince ?? now) < ms) continue;
      this.remove(p.id, `${p.name} war ${Math.round(ms / 60000) || 'ein paar'} Minuten weg und wurde entfernt`);
      dropped++;
    }
    return dropped;
  }

  // Niemand mehr da: alle entfernt oder nur noch auf dem Weg raus
  get abandoned() {
    return [...this.players.values()].every((p) => p.kicked || p.bot);
  }

  transferHost() {
    const next = [...this.players.values()].find((p) => p.connected && !p.bot && !p.kicked && p.id !== this.hostId)
      || [...this.players.values()].find((p) => !p.bot && !p.kicked && p.id !== this.hostId);
    if (next) { this.hostId = next.id; this.say(`${next.name} ist jetzt Host`); }
  }

  // Host-Menü „Spiel“: laufende Runde abbrechen (Spiele überschreiben das)
  abortRound() { throw new Error('Dieses Spiel kann keine Runde abbrechen'); }
  requireHost(id) { if (id !== this.hostId) throw new Error('Nur der Host darf das'); }

  // ---------- Verlauf ----------
  // Jeder Eintrag merkt sich die Runde, in der er passiert ist (0 = vor der ersten Runde)
  say(text, kind = 'info', cat = CAT_OF_KIND[kind] || 'system') {
    this.log.push({ n: ++this.logSeq, text, kind, cat, hand: this.round, at: Date.now() });
    this.trimLog();
    this.historyDirty = true;
    this.lastActivity = Date.now();
  }

  // Nur die letzten 500 Runden behalten
  trimLog() {
    const oldest = this.round - HISTORY_ROUNDS + 1;
    if (this.log.length > HISTORY_MAX) this.log.splice(0, this.log.length - HISTORY_MAX);
    // Höchstens einmal pro Runde nötig: danach liegt der älteste Eintrag wieder im Fenster
    if (this.log.length && this.log[0].hand < oldest) this.log = this.log.filter((e) => e.hand >= oldest);
  }

  // Für die Verlauf-Ansicht: alles nach Eintrag n (0 = ganzer Verlauf)
  historyAfter(n = 0) {
    const after = Number(n) || 0;
    return after ? this.log.filter((e) => e.n > after) : this.log.slice();
  }

  // Verlauf aus der Datei (oder aus einem alten Stand ohne Nummern) übernehmen
  loadHistory(entries) {
    if (!Array.isArray(entries)) return;
    let n = 0;
    this.log = entries.slice(-HISTORY_MAX).map((e) => ({
      n: ++n, text: String(e.text ?? ''), kind: String(e.kind || 'info'),
      cat: LOG_CATS.includes(e.cat) || e.cat === 'hand' ? e.cat : CAT_OF_KIND[e.kind] || 'system',
      hand: Number.isInteger(e.hand) ? e.hand : this.round, at: Number(e.at) || 0,
    }));
    this.logSeq = n;
  }

  // Kleine Reaktion am Tisch – kommt auch in den Verlauf
  react(id, text) {
    const p = this.players.get(id);
    if (p) this.say(`${p.name}: ${text}`, 'react');
  }
}
