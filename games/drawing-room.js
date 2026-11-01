import { PartyRoom, partyOptions, cleanAnswer } from './party-room.js';
import { cleanDrawing, WORDS, wordKey } from './drawing.js';
import { shuffle } from '../server/random.js';

// Gemeinsamer Ablauf und gemeinsame Eingabeprüfung der drei Zeichenspiele.
export class DrawingRoom extends PartyRoom {
  static OPTIONS = partyOptions();
  defaultSettings() { return { rounds: 3, writeSecs: 90, voteSecs: 30, target: 0, spectators: false }; }
  constructor(code, settings, onChange) {
    super(code, settings, onChange, { minPlayers: 3, maxPlayers: 12 });
    this.unit = 'Runde';
  }
  catalog() { return WORDS.map((q, i) => ({ id: `w${i}`, q })); }
  validateStart(ids = this.seats) {
    super.validateStart();
    if (ids.some((id) => this.players.get(id)?.bot)) throw new Error('Zeichenspiele brauchen menschliche Mitspieler; entferne die Bots im Host-Menü');
  }
  parseCustom(line, i) { return line.length >= 2 && wordKey(line) ? { id: `x${i}`, q: line } : null; }
  get stateKey() { return `${this.roundNo}:${this.q}:${this.stage}:${this.sub}`; }
  requireWrite(id, key) {
    if (this.phase !== 'playing' || this.stage !== 'write' || key !== this.stateKey || !this.order.includes(id)) throw new Error('Dieser Beitrag gehört nicht zur aktuellen Aufgabe');
  }
  drawing(id, key, strokes, done = false) {
    this.requireWrite(id, key);
    if (!this.canDraw(id) || this.isReady(id)) throw new Error('Gerade kannst du nicht zeichnen');
    const image = cleanDrawing(strokes);
    if (done && !image.length) throw new Error('Zeichne erst etwas');
    this.images[id] = image;
    if (done) { this.ready[id] = true; this.act(id, '✓ gezeichnet'); this.checkDone(); }
  }
  publicPlayer(p) {
    // Während anonymer Abstimmungen auch über die Fertig-Anzeige keine Autoren verraten.
    return { pts: this.gamePts[p.id] || 0, ready: this.stage === 'write' && this.order.includes(p.id) && this.isReady(p.id) };
  }
  gameView(id) { return { ...super.gameView(id), key: this.stateKey }; }
  static restore(data, onChange) { return PartyRoom.restoreInto(new this(data.code, data.settings, onChange), data); }
}

export class KritzelRoom extends DrawingRoom {
  static OPTIONS = partyOptions({ voting: false }).filter((o) => o.key !== 'spectators').map((o) => o.key === 'rounds' ? { ...o, max: 3 } : o);
  defaultSettings() { return { rounds: 1, writeSecs: 90, target: 0 }; }
  startQuestion() {
    this.authors = [...this.order];
    this.chains = this.authors.map((id) => ({ owner: id, pages: [] }));
    this.images = {}; this.ready = {}; this.texts = {};
  }
  chain(id) { const i = this.authors.indexOf(id); return i < 0 ? null : this.chains[(i - this.sub + this.authors.length) % this.authors.length]; }
  canDraw(id) { return this.sub % 2 === 1 && !!this.chain(id); }
  answer(id, key, text) {
    this.requireWrite(id, key);
    if (this.canDraw(id) || this.isReady(id)) throw new Error('Gerade wird gezeichnet oder dein Beitrag ist schon fertig');
    const clean = cleanAnswer(text);
    if (!clean) throw new Error('Schreib erst einen Begriff oder eine Beschreibung');
    this.texts[id] = clean; this.ready[id] = true; this.act(id, '✓ geschrieben'); this.checkDone();
  }
  waiting() { return this.order.filter((id) => !this.ready[id]); }
  isReady(id) { return !!this.ready?.[id]; }
  closeStage(stage) {
    if (stage !== 'write') return;
    for (const id of this.authors) {
      const image = this.images[id] || [];
      const text = this.texts[id] || '';
      this.chain(id).pages.push(this.canDraw(id) ? { author: id, image } : { author: id, text });
      if (this.order.includes(id) && (this.canDraw(id) ? image.length : text)) this.addPoints(id, 100);
    }
  }
  moreSteps(stage) { return stage === 'write' && this.sub + 1 < this.authors.length; }
  enter(stage) { if (stage === 'write') { this.images = {}; this.texts = {}; this.ready = {}; } }
  revealTime() { return 60; }
  stageView(id) {
    if (this.stage === 'reveal') return { chains: this.chains, authors: this.authors };
    const chain = this.chain(id);
    return { step: this.sub + 1, steps: this.authors.length, canWrite: this.order.includes(id) && !this.isReady(id), draw: this.canDraw(id), previous: chain?.pages.at(-1) ? { text: chain.pages.at(-1).text, image: chain.pages.at(-1).image } : null, mine: this.texts[id] || '', image: this.images[id] || [], ready: this.isReady(id) };
  }
}

export class CaptionRoom extends DrawingRoom {
  get flow() { return ['write', 'vote', 'reveal']; }
  startQuestion() {
    this.artist = this.order[this.q % this.order.length];
    this.images = {}; this.ready = {}; this.texts = {}; this.display = []; this.votes = {}; this.results = [];
  }
  canDraw(id) { return id === this.artist && this.sub === 0; }
  canCaption(id) { return this.order.includes(id) && id !== this.artist && this.sub === 1; }
  answer(id, key, text) {
    this.requireWrite(id, key);
    if (!this.canCaption(id) || this.isReady(id)) throw new Error('Du kannst gerade keine Bildunterschrift abgeben');
    const clean = cleanAnswer(text);
    if (!clean) throw new Error('Schreib erst eine Bildunterschrift');
    this.texts[id] = clean; this.ready[id] = true; this.act(id, '✓ geschrieben'); this.checkDone();
  }
  waiting(stage) {
    if (stage === 'write') return this.order.filter((id) => (this.sub === 0 ? id === this.artist : id !== this.artist) && !this.ready[id]);
    if (stage === 'vote') return this.order.filter((id) => this.canVote(id) && !Object.hasOwn(this.votes, id));
    return [];
  }
  isReady(id) { return !!this.ready?.[id]; }
  moreSteps(stage) { return stage === 'write' && this.sub === 0; }
  closeStage(stage) { if (stage === 'write' && this.sub === 1) this.display = shuffle(this.order.filter((id) => this.texts[id])); }
  canVote(id) { return (this.order.includes(id) || this.settings.spectators && this.players.has(id) && !this.players.get(id).kicked) && this.display.some((author) => author !== id); }
  vote(id, key, choice) {
    if (this.phase !== 'playing' || this.stage !== 'vote' || key !== this.stateKey || !this.canVote(id)) throw new Error('Gerade kannst du nicht abstimmen');
    if (!Number.isInteger(choice) || !this.display[choice] || this.display[choice] === id) throw new Error('Wähle eine fremde Bildunterschrift');
    this.votes[id] = this.display[choice]; this.checkDone();
  }
  enter(stage) {
    if (stage !== 'reveal') return;
    this.results = this.display.map((id) => ({ id, text: this.texts[id], votes: Object.values(this.votes).filter((v) => v === id).length }));
    for (const row of this.results) this.addPoints(row.id, row.votes * 100);
    if (this.images[this.artist]?.length) this.addPoints(this.artist, 100);
  }
  stageView(id) {
    const base = { image: this.images[this.artist] || [], step: this.sub + 1, steps: 2 };
    if (this.stage === 'reveal') return { ...base, results: this.results, artist: this.artist };
    if (this.stage === 'vote') return { ...base, canVote: this.canVote(id), answers: this.display.map((author, i) => ({ i, text: this.texts[author], mine: author === id })), myVote: Object.hasOwn(this.votes, id) ? this.display.indexOf(this.votes[id]) : null };
    return { ...base, draw: this.canDraw(id), prompt: id === this.artist ? this.cur.q : null, canWrite: (this.canDraw(id) || this.canCaption(id)) && !this.isReady(id), ready: this.isReady(id), mine: this.texts[id] || '' };
  }
}

export class GuessRoom extends DrawingRoom {
  static OPTIONS = partyOptions({ voting: false }).filter((o) => o.key !== 'spectators');
  defaultSettings() { return { rounds: 6, writeSecs: 90, target: 0 }; }
  startQuestion() {
    this.artist = this.order[this.q % this.order.length];
    this.images = {}; this.ready = {}; this.guessed = []; this.attempts = {}; this.lastGuess = {};
  }
  canDraw(id) { return id === this.artist; }
  isReady(id) { return this.guessed?.includes(id); }
  waiting() { return this.order.filter((id) => id !== this.artist && !this.guessed.includes(id)); }
  answer(id, key, text) {
    this.requireWrite(id, key);
    if (id === this.artist || this.guessed.includes(id)) throw new Error('Du zeichnest oder hast den Begriff schon erraten');
    const clean = cleanAnswer(text);
    if (!clean) throw new Error('Schreib erst eine Vermutung');
    if (this.clock.now() - (this.lastGuess[id] || 0) < 700) throw new Error('Warte kurz vor der nächsten Vermutung');
    this.lastGuess[id] = this.clock.now(); this.attempts[id] = clean;
    if (wordKey(clean) === wordKey(this.cur.q)) {
      this.addPoints(id, Math.max(100, 300 - this.guessed.length * 25)); this.addPoints(this.artist, 100);
      this.guessed.push(id); this.act(id, '✓ erraten'); this.checkDone();
    }
  }
  closeStage() {}
  stageView(id) {
    const base = { image: this.images[this.artist] || [], artist: this.artist, guessed: [...this.guessed] };
    if (this.stage === 'reveal') return { ...base, prompt: this.cur.q };
    return { ...base, draw: this.canDraw(id), prompt: id === this.artist ? this.cur.q : null, canWrite: this.order.includes(id) && id !== this.artist && !this.isReady(id), mine: this.attempts[id] || '', ready: this.isReady(id) };
  }
}

// Nicht jede Zeichenrunde kennt jeden Befehl (z. B. hat „Malen & Raten“ keine Abstimmung)
const supported = (room, action) => { if (typeof room[action] !== 'function') throw new Error('Das gibt es in diesem Spiel nicht'); return room; };
export const drawingEvents = {
  drawing: (room, p, { key, strokes, done }) => supported(room, 'drawing').drawing(p.id, key, strokes, done === true),
  answer: (room, p, { key, text }) => supported(room, 'answer').answer(p.id, key, typeof text === 'string' ? text : ''),
  vote: (room, p, { key, choice }) => supported(room, 'vote').vote(p.id, key, choice),
};
