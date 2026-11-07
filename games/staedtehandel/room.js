// Städtehandel: Raum (Plattform-Anbindung). Alle Regeln stehen in rules.js; hier laufen Zugprüfung, Verlauf, Bots, Zeit und Speichern.
// Geheim bleiben Rohstoffe, Entwicklungskarten und der Kartenstapel: gameView() gibt jedem nur die eigene Hand preis.
import { TurnRoom } from '../../server/turn-room.js';
import * as R from './rules.js';
import { topology, SIZES, RES, RES_NAMES, TERRAIN_NAMES } from './map.js';
import { strategy, fallback } from './bot.js';

const int = (v) => (typeof v === 'number' ? v : Number(v));
const pretty = (cards) => RES.filter((r) => cards[r] > 0).map((r) => `${cards[r]} ${RES_NAMES[r]}`).join(', ') || 'nichts';
const BOT_OFFER_MS = 25000;

export class Room extends TurnRoom {
  static OPTIONS = [
    { key: 'size', label: 'Brett', type: 'select', values: [{ value: 'standard', label: 'Aurelia – 19 Felder (3–4 Spieler)' }, { value: 'xl', label: 'Groß-Aurelia – 30 Felder (5–6 Spieler)' }] },
    { key: 'layout', label: 'Spielfeld', type: 'select', values: [{ value: 'random', label: 'Zufällig' }, { value: 'beginner', label: 'Festes Einsteigerfeld (nur 3–4 Spieler)' }] },
    { key: 'target', label: 'Siegpunkte zum Gewinnen', type: 'number', min: 6, max: 14 },
    { key: 'turnTime', label: 'Zeit pro Schritt in Sekunden (0 = ohne)', type: 'number', min: 0, max: 600 },
  ];
  defaultSettings() { return { size: 'standard', layout: 'random', target: 10, turnTime: 180 }; }
  constructor(code, settings, onChange) {
    super(code, settings, onChange, { minPlayers: 3, maxPlayers: 6, scoreLabel: 'Siege', winPoints: 1 });
    this.s = null; this.rng = Math.random;
    this.persistMidGame = true; // lange Partie: der Spielstand wird auch mitten im Spiel gespeichert (rooms.json)
    this.offerTimer = null;
  }
  validateStart(ids) {
    const [lo, hi] = SIZES[this.settings.size].players;
    if (ids.length < lo || ids.length > hi) throw new Error(`Dieses Brett ist für ${lo}–${hi} Spieler – ändere das Brett in den Einstellungen`);
  }
  setupRound() {
    this.s = R.newGame({ players: this.order, size: this.settings.size, layout: this.settings.layout, target: this.settings.target }, this.rng);
    this.say(`${SIZES[this.settings.size].label} · ${this.settings.layout === 'beginner' && this.settings.size === 'standard' ? 'Einsteigerfeld' : 'zufälliges Feld'} · Sieg bei ${this.s.target} Punkten`);
    this.say('Aufbau: Jeder setzt zwei Siedlungen mit Straße, in der zweiten Runde rückwärts.', 'info');
  }
  syncTurn() { const s = this.s; if (s && s.cur !== this.currentId) { const i = this.order.indexOf(s.cur); if (i >= 0) this.turn = i; } }
  onTurnStart() {
    if (this.phase !== 'playing' || !this.s) return;
    this.dropOfferTimer();
    if (this.s.stage === 'setup') { this.syncTurn(); return; }
    R.startTurn(this.s, this.currentId);
    this.finished(this.currentId); // Punkte, die erst durch fremde Züge entstanden sind (z. B. Auszeichnungen), zählen zu Beginn des eigenen Zuges
  }
  onAbort() { this.dropOfferTimer(); this.s = null; }
  resetGame() { this.dropOfferTimer(); this.s = null; }
  dispose() { this.dropOfferTimer(); super.dispose(); }
  dropOfferTimer() { this.clock.clearTimeout(this.offerTimer); this.offerTimer = null; }
  onDropOut(p) {
    const s = this.s;
    if (!s || s.out.includes(p.id)) return;
    R.leaveGame(s, p.id);
    this.say(`${p.name} verlässt die Insel – die Gebäude bleiben als Hindernisse stehen`, 'warn');
  }
  timerActive() { return !!this.s; }

  // ---------- Wer ist als Nächstes dran (auch außerhalb des eigenen Zuges)? ----------
  isBot(id) { const p = this.players.get(id); return !!p?.bot && !p.kicked; }
  botDue() {
    const s = this.s;
    if (!s || this.phase !== 'playing') return null;
    if (s.stage === 'discard') return Object.keys(s.discard).find((id) => this.isBot(id)) || null;
    if (s.stage === 'main' && s.offer) {
      const pend = Object.entries(s.offer.res).filter(([, v]) => v === null).map(([p]) => p);
      const bot = pend.find((p) => this.isBot(p));
      if (bot) return bot;
      if (pend.length) return null; // Menschen antworten noch
      return this.isBot(s.offer.from) ? s.offer.from : null;
    }
    return this.isBot(s.cur) ? s.cur : null;
  }

  // ---------- Züge ----------
  guard() {
    if (this.gamePaused) throw new Error('Das Spiel ist angehalten');
    if (this.phase !== 'playing' || !this.s) throw new Error('Gerade läuft keine Runde');
    return this.s;
  }
  turnOf(id) {
    const s = this.guard();
    if (s.cur !== id || !s.players.includes(id) || s.out.includes(id)) throw new Error('Du bist nicht dran');
    return s;
  }
  awards(list) {
    for (const a of list || []) {
      if (a.award === 'longest') this.say(a.to ? `${this.name(a.to)} hat jetzt die längste Handelsstraße (+2 Punkte)` : 'Die längste Handelsstraße geht an niemanden', 'action');
      else this.say(a.to ? `${this.name(a.to)} hat jetzt die größte Rittermacht (+2 Punkte)` : 'Die größte Rittermacht geht an niemanden', 'action');
    }
  }
  ssRoll(id, d = {}) {
    const s = this.turnOf(id);
    const forced = this.diceQueue?.length ? this.diceQueue.shift() : null; // nur für Tests: feste Würfe
    const r = R.roll(s, id, this.rng, forced);
    this.act(id, `würfelt ${r.sum}`, { dice: r.dice });
    const got = Object.entries(r.gains).map(([p, c]) => `${this.name(p)}: ${pretty(c)}`);
    this.say(`${this.name(id)} würfelt ${r.dice[0]} + ${r.dice[1]} = ${r.sum}${r.sum === 7 ? ' – der Räuber kommt!' : got.length ? ` – ${got.join(' · ')}` : ' – niemand bekommt etwas'}`, 'action');
    if (r.sum === 7 && Object.keys(r.discard).length) this.say(`Wer mehr als 7 Karten hat, wirft die Hälfte ab: ${Object.entries(r.discard).map(([p, n]) => `${this.name(p)} ${n}`).join(', ')}`, 'warn');
    void d;
  }
  ssDiscard(id, d = {}) {
    const s = this.guard();
    if (!s.players.includes(id)) throw new Error('Du spielst nicht mit');
    const n = s.discard[id];
    R.discard(s, id, d.cards);
    this.act(id, `wirft ${n} Karten ab`);
    this.say(`${this.name(id)} wirft ${n} Karten ab`, 'action');
  }
  ssRobber(id, d = {}) {
    const s = this.turnOf(id), r = R.moveRobber(s, id, int(d.hex), this.rng);
    this.act(id, `Räuber → ${TERRAIN_NAMES[s.terrain[r.hex]]}`);
    this.say(`${this.name(id)} setzt den Räuber auf ${TERRAIN_NAMES[s.terrain[r.hex]]} (${s.nums[r.hex] ?? '–'})`, 'action');
    if (r.stolen) this.say(`${this.name(id)} stiehlt eine Karte von ${this.name(r.stolen.victim)}`, 'action');
    this.finished(id);
  }
  ssSteal(id, d = {}) {
    const s = this.turnOf(id), r = R.steal(s, id, String(d.victim), this.rng);
    this.act(id, `stiehlt von ${this.name(r.victim)}`);
    this.say(`${this.name(id)} stiehlt eine Karte von ${this.name(r.victim)}`, 'action');
  }
  ssBuild(id, d = {}) {
    const s = this.turnOf(id), kind = String(d.kind), r = R.build(s, id, kind, int(d.at));
    const word = { road: 'eine Straße', settlement: 'eine Siedlung', city: 'eine Stadt' }[kind];
    this.act(id, `baut ${word}`);
    if (r.setup) {
      this.say(`${this.name(id)} setzt ${word}${r.got && Object.keys(r.got).length ? ` und bekommt ${pretty(r.got)}` : ''}`, 'action');
      this.syncTurn();
      if (r.done) this.say('Der Aufbau ist fertig – jetzt wird gewürfelt.', 'hand');
    } else this.say(`${this.name(id)} baut ${word}${r.free ? ' (Straßenbau)' : ''}`, 'action');
    this.awards(r.awards);
    this.finished(id);
  }
  ssBuyDev(id) {
    const s = this.turnOf(id);
    R.buyDev(s, id, this.rng);
    this.act(id, 'kauft eine Entwicklungskarte');
    this.say(`${this.name(id)} kauft eine Entwicklungskarte`, 'cards');
    this.finished(id);
  }
  ssPlay(id, d = {}) {
    const s = this.turnOf(id), card = String(d.card);
    let r = {};
    if (card === 'ritter') { r = R.playKnight(s, id); this.say(`${this.name(id)} spielt einen Ritter (${s.knights[id]})`, 'cards'); }
    else if (card === 'strassenbau') { R.playRoads(s, id); this.say(`${this.name(id)} spielt Straßenbau`, 'cards'); }
    else if (card === 'erfindung') { r = R.playPlenty(s, id, String(d.a), String(d.b)); this.say(`${this.name(id)} erfindet ${RES_NAMES[r.a]} und ${RES_NAMES[r.b]}`, 'cards'); }
    else if (card === 'monopol') { r = R.playMonopoly(s, id, String(d.res)); this.say(`${this.name(id)} errichtet ein Monopol auf ${RES_NAMES[r.res]} und kassiert ${r.n} Karten`, 'cards'); }
    else throw new Error('Diese Karte kann man nicht ausspielen');
    this.act(id, `spielt ${R.DEV_NAMES[card]}`);
    this.awards(r.awards);
    this.finished(id);
  }
  ssEndRoads(id) { const s = this.turnOf(id); R.endRoads(s, id); this.act(id, 'beendet den Straßenbau'); }
  ssBank(id, d = {}) {
    const s = this.turnOf(id), r = R.bankTrade(s, id, String(d.give), String(d.get));
    this.act(id, `tauscht ${r.n}:1 mit der Bank`);
    this.say(`${this.name(id)} tauscht ${r.n} ${RES_NAMES[r.give]} gegen 1 ${RES_NAMES[r.get]} (${r.n}:1)`, 'action');
  }
  ssOffer(id, d = {}) {
    const s = this.turnOf(id), r = R.makeOffer(s, id, d.give, d.want);
    this.act(id, 'macht ein Angebot');
    this.say(`${this.name(id)} bietet ${pretty(s.offer.give)} für ${pretty(s.offer.want)}`, 'action');
    this.dropOfferTimer();
    if (this.isBot(id)) {
      // Menschen sollen nicht ewig auf einen Bot warten müssen – und umgekehrt
      this.offerTimer = this.clock.setTimeout(() => {
        this.offerTimer = null;
        if (this.s?.offer?.id === r.offer) { this.s.offer = null; this.moveNo++; this.onChange('state'); }
      }, BOT_OFFER_MS);
      this.offerTimer.unref?.();
    }
  }
  ssRespond(id, d = {}) {
    const s = this.guard(), r = R.respond(s, id, int(d.offerId), !!d.accept);
    this.act(id, r.accept ? 'nimmt an' : 'lehnt ab');
  }
  ssConfirm(id, d = {}) {
    const s = this.turnOf(id), r = R.confirmOffer(s, id, int(d.offerId), String(d.with));
    this.dropOfferTimer();
    this.act(id, `tauscht mit ${this.name(r.with)}`);
    this.say(`${this.name(id)} tauscht mit ${this.name(r.with)}: ${pretty(r.give)} gegen ${pretty(r.want)}`, 'action');
  }
  ssCancel(id) { const s = this.turnOf(id); R.cancelOffer(s, id); this.dropOfferTimer(); this.act(id, 'zieht das Angebot zurück'); }
  ssEnd(id) {
    const s = this.turnOf(id);
    R.endTurn(s, id);
    this.act(id, 'beendet den Zug');
    this.next();
  }
  finished(id) {
    const s = this.s;
    if (this.phase === 'playing' && s && R.winner(s, id)) this.win(id);
  }
  win(id) {
    const s = this.s, pts = R.points(s, id);
    this.finishRound([id], `${this.name(id)} gewinnt mit ${pts} Punkten und regiert nun Aurelia.`, { [id]: 1 });
  }

  // ---------- Zeit und Bots ----------
  onTimeout(id) {
    const s = this.s, round = this.roundNo;
    if (!s) return;
    const start = this.currentId, setupAt = s.stage === 'setup' ? s.setup.i : -1;
    for (let i = 0; i < 80 && this.phase === 'playing' && this.roundNo === round && this.s === s; i++) {
      let actor = s.cur, single = false;
      if (s.stage === 'discard') actor = Object.keys(s.discard)[0];
      else if (s.stage === 'main' && s.offer && id !== s.cur && s.offer.res[id] === null) { actor = id; single = true; }
      if (!actor) break;
      this.apply(actor, fallback({ game: 'staedtehandel', id: actor, g: this.gameView(actor) }));
      if (single || this.currentId !== start || (setupAt >= 0 && (s.stage !== 'setup' || s.setup.i !== setupAt))) break; // im Aufbau genau ein Platz, sonst bis der Zug weitergeht
    }
  }
  apply(id, a) { return this[a.method](id, ...a.args); }
  botStep(id, rng = Math.random) { return this.apply(id, strategy({ game: 'staedtehandel', id, g: this.gameView(id) }, 'medium', { rng })); }

  // ---------- Ansichten ----------
  publicPlayer(p) {
    const s = this.s;
    if (!s || !s.players.includes(p.id)) return {};
    const left = R.piecesLeft(s, p.id);
    return {
      color: s.players.indexOf(p.id), vp: R.publicPoints(s, p.id), cards: R.cardsOf(s, p.id), devCards: s.dev[p.id].length, knights: s.knights[p.id],
      roadLen: R.roadLength(s, p.id), left, longest: s.longest.holder === p.id, army: s.army.holder === p.id, out: s.out.includes(p.id),
    };
  }
  gameView(id) {
    const s = this.s, t = topology(s.size), mine = s.players.includes(id) && !s.out.includes(id);
    const hand = mine ? { ...s.res[id] } : null, over = this.phase === 'over';
    const legal = mine && this.phase === 'playing' ? R.legal(s, id) : { settlement: [], city: [], road: [], robber: [], victims: [], can: {} };
    const last = s.last && s.last.kind === 'steal' && ![s.last.from, s.last.to].includes(id) ? { ...s.last, res: undefined } : s.last;
    const dev = mine ? [...s.dev[id]] : [];
    const playable = Object.fromEntries(R.DEV_KINDS.map((k) => [k, mine ? Math.max(0, R.playable(s, id, k)) : 0]));
    return {
      me: id, size: s.size, layout: s.layout, target: s.target, stage: s.stage, cur: s.cur, turnNo: s.turnNo, players: [...s.players], order: [...this.order],
      colors: Object.fromEntries(s.players.map((p, i) => [p, i])),
      board: {
        box: t.box,
        hexes: t.hexes.map((h) => ({ id: h.id, x: +h.x.toFixed(2), y: +h.y.toFixed(2), terrain: s.terrain[h.id], num: s.nums[h.id], vs: h.vs })),
        vs: t.vs.map((v) => [v.x, v.y]), es: t.es.map((e) => [e.a, e.b]),
        ports: s.ports.map((p, i) => ({ type: p.type, a: t.es[p.e].a, b: t.es[p.e].b, x: t.slots[i].lx, y: t.slots[i].ly })),
      },
      robber: s.robber, buildings: s.buildings, roads: s.roads,
      setup: s.stage === 'setup' ? { step: s.setup.step, i: s.setup.i, total: s.setup.order.length, second: s.setup.i >= s.players.length } : null,
      dice: s.dice, discard: { ...s.discard }, victims: [...s.victims], roadsLeft: s.roadsLeft,
      offer: s.offer ? { id: s.offer.id, from: s.offer.from, give: s.offer.give, want: s.offer.want, res: { ...s.offer.res } } : null, offers: s.offers,
      bankCards: { ...s.bank }, deckLeft: s.deck.length, longest: s.longest, army: s.army,
      knights: { ...s.knights }, cards: Object.fromEntries(s.players.map((p) => [p, R.cardsOf(s, p)])), devCounts: Object.fromEntries(s.players.map((p) => [p, s.dev[p].length])),
      points: Object.fromEntries(s.players.map((p) => [p, R.publicPoints(s, p)])), myRoad: mine ? R.roadLength(s, id) : 0,
      hand, dev, devPlayable: playable, devPlayed: s.devPlayed, boughtNew: mine && s.cur === id ? s.bought.length : 0,
      ratios: mine ? Object.fromEntries(RES.map((r) => [r, R.ratio(s, id, r)])) : null,
      left: mine ? R.piecesLeft(s, id) : null, myPoints: mine ? R.points(s, id) : null, legal,
      last, final: over ? R.standings(s) : null,
    };
  }

  // ---------- Speichern: auch mitten im Spiel ----------
  saveExtra() {
    return this.s && this.phase !== 'lobby' ? { s: this.s, order: this.order, turn: this.turn, phase: this.phase, roundPlayers: this.roundPlayers, result: this.result, moveNo: this.moveNo } : null;
  }
  loadExtra(x) {
    if (!x?.s) return;
    this.s = x.s; this.order = x.order || []; this.turn = x.turn || 0; this.phase = x.phase === 'over' ? 'over' : 'playing';
    this.roundPlayers = x.roundPlayers || [...this.order]; this.result = x.result || null; this.moveNo = x.moveNo || 0;
    // Ein Bot-Angebot hat nach dem Neustart keine Uhr mehr: es wird zurückgezogen
    if (this.s.offer && this.players.get(this.s.offer.from)?.bot) this.s.offer = null;
  }
  static restore(data, onChange) { return TurnRoom.restoreInto(new this(data.code, data.settings, onChange), data); }
}
