import { TurnRoom } from '../../server/turn-room.js';
import { die, shuffle } from '../../server/random.js';
import { BOARD, COLORS, PROPERTIES, group, EVENTS, CHEST, redemption } from '../../public/games/monopoly/data.js';
import { boardStore } from './boards.js';
import { TOKENS } from '../../public/games/monopoly/tokens.js';
export { BOARD, COLORS, PROPERTIES, group, EVENTS, CHEST };
const integer = (n) => Number.isSafeInteger(n) && n >= 0;

export class Room extends TurnRoom {
  static OPTIONS = [
    { key: 'theme', label: 'Brettgestaltung', type: 'select', values: [{ value: 'modern', label: 'Bisheriges Thema' }, { value: 'classic', label: 'Klassik' }] },
    { key: 'startMoney', label: 'Startgeld', type: 'number', min: 200, max: 5000 },
    { key: 'timeLimit', label: 'Zeitlimit in Minuten (0 = ohne)', type: 'number', min: 0, max: 180 },
    { key: 'turnTime', label: 'Sekunden pro Entscheidung', type: 'number', min: 5, max: 180 },
    { key: 'auctionTime', label: 'Sekunden pro Versteigerungsgebot', type: 'number', min: 5, max: 60 },
    { key: 'parkingPot', label: 'Steuern auf Frei Parken sammeln', type: 'bool' },
    { key: 'doubleGo', label: 'Doppelter Startbonus genau auf Los', type: 'bool' },
    { key: 'noAuction', label: 'Keine Versteigerung bei Kaufverzicht', type: 'bool' },
    { key: 'quick', label: 'Schnellstart mit zwei zufälligen Grundstücken', type: 'bool' },
  ];
  defaultSettings() { return { theme: 'modern', startMoney: 1500, timeLimit: 0, turnTime: 45, auctionTime: 15, parkingPot: false, doubleGo: false, noAuction: false, quick: false, board: 'default' }; }
  clampSettings(input, base) { const s = super.clampSettings(input, base); if (typeof input.board === 'string' && /^[a-zA-Z0-9-]{1,50}$/.test(input.board)) s.board = input.board; return s; }
  constructor(code, settings, onChange) {
    super(code, settings, onChange, { minPlayers: 2, maxPlayers: 8, scoreLabel: 'Siege', winPoints: 1 });
    this.people = {}; this.owned = {}; this.bank = 10000000; this.pot = 0; this.stock = { houses: 32, hotels: 12 };
    this.auction = null; this.auctionQueue = []; this.trade = null; this.payments = []; this.debt = null; this.deferred = null;
    this.endTimer = null; this.roll = die; this.board = boardStore().get('default'); this.serial = 0; this.moveSerial = 0;
    this.tokens = {};
  }
  validateStart() { this.board = boardStore().get(this.settings.board); }
  fieldName(i) { const at = PROPERTIES.indexOf(i); return at < 0 ? BOARD[i].name : this.board.names[at]; }
  chooseBoard(id, board) { this.requireHost(id); if (this.busy) throw new Error('Brettwechsel nur zwischen Partien'); this.board = boardStore().get(board); this.settings.board = board; this.say(`Brett: ${this.board.title}`); }
  saveBoard(id, input) { this.requireHost(id); if (this.busy) throw new Error('Bretter zwischen Partien anlegen'); const b = boardStore().save(input, this.players.get(id)?.accountId); this.chooseBoard(id, b.id); return b; }
  setupRound() {
    const available = Object.keys(TOKENS).filter((t) => !this.order.some((id) => this.tokens[id] === t));
    for (const id of this.order) if (!this.tokens[id]) this.tokens[id] = available.shift();
    this.people = Object.fromEntries(this.order.map((id) => [id, { money: this.settings.startMoney, position: 0, jail: false, tries: 0, free: [], out: false }]));
    this.owned = Object.fromEntries(PROPERTIES.map((i) => [i, { owner: null, level: 0, mortgage: false }]));
    this.bank = 10000000 - this.order.length * this.settings.startMoney; this.pot = 0; this.stock = { houses: 32, hotels: 12 };
    this.auction = null; this.auctionQueue = []; this.trade = null; this.payments = []; this.debt = null; this.deferred = null;
    this.decks = { event: shuffle(EVENTS.map((_, i) => i)), chest: shuffle(CHEST.map((_, i) => i)) }; this.card = null; this.lastMove = null; this.dice = [1, 1]; this.rollNo = 0; this.turnNo = 0; this.traded = {};
    if (this.settings.quick) { const cards = shuffle([...PROPERTIES]); for (const id of this.order) for (let k = 0; k < 2; k++) this.owned[cards.pop()].owner = id; }
    this.endsAt = this.settings.timeLimit ? this.clock.now() + this.settings.timeLimit * 60000 : null;
    this.clock.clearTimeout(this.endTimer);
    if (this.endsAt) { this.endTimer = this.clock.setTimeout(() => { if (this.phase === 'playing') this.finishWealth(); this.onChange('state'); }, this.settings.timeLimit * 60000); this.endTimer.unref?.(); }
  }
  chooseToken(id, token) {
    if (!this.players.has(id) || !TOKENS[token]) throw new Error('Unbekannte Spielfigur');
    if (Object.entries(this.tokens).some(([p, t]) => p !== id && t === token && this.seats.includes(p))) throw new Error('Diese Figur ist schon gewählt');
    this.tokens[id] = token; this.act(id, `wählt ${TOKENS[token].name}`);
  }
  saveExtra() { return { tokens: this.tokens }; }
  loadExtra(x) { this.tokens = x.tokens || {}; }
  get actor() { return this.order[this.turn] || null; }
  get currentId() { return this.phase !== 'playing' ? null : this.debt ? this.debt.from : this.auction ? this.auction.participants.find((id) => !this.auction.passed.includes(id) && id !== this.auction.leader) || this.actor : this.trade ? this.trade.to : this.actor; }
  onTurnStart() { this.turnNo++; this.doubles = 0; this.again = false; this.step = this.people[this.actor]?.jail ? 'jail' : 'roll'; this.act(this.actor, 'beginnt den Zug'); }
  active(id) { if (this.phase !== 'playing' || !this.order.includes(id)) throw new Error('Du spielst gerade nicht mit'); }
  requireActor(id) { this.active(id); if (id !== this.actor || this.debt || this.auction || this.trade) throw new Error('Erst die offene Entscheidung abschließen oder auf deinen Zug warten'); }
  cash(from, to, amount, reason, tax = false) {
    if (!integer(amount)) throw new Error('Ungültiger Betrag');
    if (from && this.people[from].money < amount) throw new Error('Nicht genug Bargeld');
    if (from) this.people[from].money -= amount; else this.bank -= amount;
    if (to) this.people[to].money += amount; else if (tax && this.settings.parkingPot) this.pot += amount; else this.bank += amount;
    this.say(`${from ? this.name(from) : 'Bank'} zahlt ${amount} an ${to ? this.name(to) : tax && this.settings.parkingPot ? 'Frei Parken' : 'Bank'} · ${reason}`, 'bet');
  }
  charge(from, to, amount, reason, tax = false) { if (amount > 0) this.payments.push({ from, to, amount, reason, tax }); this.settlePayments(); }
  settlePayments() {
    this.debt = null;
    while (this.payments.length) {
      const p = this.payments[0];
      if (!this.order.includes(p.from)) { this.payments.shift(); continue; }
      if (p.to && !this.order.includes(p.to)) p.to = null;
      if (this.people[p.from].money < p.amount) { this.debt = { ...p }; this.moveNo++; return; }
      this.cash(p.from, p.to, p.amount, p.reason, p.tax); this.payments.shift();
    }
    if (this.deferred) {
      const d = this.deferred; this.deferred = null;
      if (this.order.includes(d.id) && d.kind === 'jailMove') this.walk(d.id, d.steps);
    }
    if (this.auctionQueue.length && !this.auction && !this.debt) this.nextAuction();
    this.checkEnd();
  }
  rent(field, sum = this.dice.reduce((a, b) => a + b, 0), special = null) {
    const f = BOARD[field], p = this.owned[field]; if (!p?.owner || p.mortgage) return 0;
    if (f.type === 'street') return p.level ? f.rents[p.level] : f.rents[0] * (group(field).every((i) => this.owned[i].owner === p.owner) ? 2 : 1);
    const count = PROPERTIES.filter((i) => BOARD[i].type === f.type && this.owned[i].owner === p.owner).length;
    return f.type === 'rail' ? 25 * 2 ** (count - 1) * (special === 'rail' ? 2 : 1) : sum * (special === 'utility' || count === 2 ? 10 : 4);
  }
  throwDice(id) {
    this.requireActor(id); if (!['roll', 'jail'].includes(this.step)) throw new Error('Du kannst gerade nicht würfeln');
    this.dice = [this.roll(), this.roll()]; this.rollNo++; const sum = this.dice[0] + this.dice[1], double = this.dice[0] === this.dice[1], p = this.people[id];
    this.act(id, `würfelt ${this.dice.join(' + ')}`); this.card = null;
    if (p.jail) {
      this.again = false; this.step = 'end';
      if (double) { p.jail = false; p.tries = 0; return this.walk(id, sum); }
      if (++p.tries < 3) return;
      p.jail = false; p.tries = 0; this.deferred = { kind: 'jailMove', id, steps: sum }; return this.charge(id, null, 50, 'Dritter Gefängnisversuch');
    }
    this.doubles = double ? this.doubles + 1 : 0; this.again = double;
    if (this.doubles === 3) return this.jail(id);
    this.walk(id, sum);
  }
  walk(id, steps, special = null, depth = 0) {
    const p = this.people[id], from = p.position, path = [from];
    for (let k = 0; k < Math.abs(steps); k++) { p.position = (p.position + (steps < 0 ? -1 : 1) + 40) % 40; path.push(p.position); if (steps > 0 && p.position === 0) this.cash(null, id, 200, 'Über Los'); }
    if (steps > 0 && p.position === 0 && this.settings.doubleGo) this.cash(null, id, 200, 'Genau auf Los');
    this.lastMove = { n: ++this.moveSerial, id, from, path, to: p.position };
    this.say(`${this.name(id)} landet auf ${this.fieldName(p.position)}`, 'info', 'action'); this.land(id, special, depth);
  }
  land(id, special = null, depth = 0) {
    if (depth > 8) throw new Error('Zu viele verkettete Ereignisse');
    this.step = this.again ? 'roll' : 'end'; const p = this.people[id], f = BOARD[p.position], own = this.owned[p.position];
    if (own) {
      if (!own.owner) { this.step = 'buy'; return; }
      if (own.owner !== id) { const sum = special === 'utility' ? this.roll() + this.roll() : this.dice[0] + this.dice[1]; this.charge(id, own.owner, this.rent(f.index, sum, special), `Miete ${this.fieldName(f.index)}`); }
    } else if (f.type === 'tax') this.charge(id, null, f.tax, f.name, true);
    else if (f.type === 'gotojail') this.jail(id);
    else if (f.type === 'parking' && this.settings.parkingPot && this.pot) { const value = this.pot; this.pot = 0; this.people[id].money += value; this.say(`${this.name(id)} erhält ${value} von Frei Parken`, 'bet'); }
    else if (f.type === 'event' || f.type === 'chest') this.drawCard(id, f.type, depth + 1);
  }
  drawCard(id, deck, depth = 0) {
    const index = this.decks[deck].shift(), c = (deck === 'event' ? EVENTS : CHEST)[index];
    if (c.kind !== 'free') this.decks[deck].push(index); else this.people[id].free.push({ deck, index });
    this.card = { deck, index, text: c.text }; this.say(c.text, 'street');
    if (c.kind === 'move') this.walk(id, (c.field - this.people[id].position + 40) % 40, null, depth);
    else if (c.kind === 'back') this.walk(id, -c.steps, null, depth);
    else if (c.kind === 'jail') this.jail(id);
    else if (c.kind === 'rail' || c.kind === 'utility') {
      const from = this.people[id].position; let steps = 1; while (BOARD[(from + steps) % 40].type !== c.kind) steps++;
      this.walk(id, steps, c.kind, depth);
    } else if (c.kind === 'bank') { if (c.amount > 0) this.cash(null, id, c.amount, 'Ereigniskarte'); else this.charge(id, null, -c.amount, 'Ereigniskarte'); }
    else if (c.kind === 'repairs') {
      const own = PROPERTIES.filter((i) => this.owned[i].owner === id);
      const total = own.reduce((s, i) => s + (this.owned[i].level === 5 ? c.hotel : this.owned[i].level * c.house), 0);
      this.charge(id, null, total, 'Reparaturen');
    } else if (c.kind === 'each') {
      for (const other of this.order.filter((p) => p !== id)) this.payments.push({ from: c.amount > 0 ? other : id, to: c.amount > 0 ? id : other, amount: Math.abs(c.amount), reason: 'Gemeinschaftskarte', tax: false });
      this.settlePayments();
    }
  }
  jail(id) { const p = this.people[id], from = p.position; p.position = 10; p.jail = true; p.tries = 0; this.again = false; this.doubles = 0; this.step = 'end'; this.lastMove = { n: ++this.moveSerial, id, from, path: [from, 10], to: 10 }; this.say(`${this.name(id)} muss ins Gefängnis`, 'warn'); }
  leaveJail(id, method) {
    this.requireActor(id); const p = this.people[id]; if (!p.jail || this.step !== 'jail') throw new Error('Du bist gerade nicht im Gefängnis');
    if (method === 'card') { const free = p.free.shift(); if (!free) throw new Error('Keine Freikarte vorhanden'); this.decks[free.deck].push(free.index); }
    else if (method !== 'pay') throw new Error('Freikarte oder 50 bezahlen wählen');
    p.jail = false; p.tries = 0; this.step = 'roll'; this.act(id, method === 'card' ? 'nutzt eine Freikarte' : 'zahlt die Gefängnisgebühr');
    if (method === 'pay') this.charge(id, null, 50, 'Gefängnisgebühr');
  }
  buy(id, yes) {
    this.requireActor(id); const field = this.people[id].position;
    if (this.step !== 'buy' || !this.owned[field] || this.owned[field].owner) throw new Error('Hier gibt es gerade nichts zu kaufen');
    if (yes) { this.cash(id, null, BOARD[field].price, `Kauf ${this.fieldName(field)}`); this.owned[field].owner = id; }
    this.step = this.again ? 'roll' : 'end'; this.act(id, yes ? `kauft ${this.fieldName(field)}` : 'verzichtet auf den Kauf');
    if (!yes && !this.settings.noAuction) this.startAuctions([field]);
  }
  startAuctions(fields) { this.auctionQueue.push(...fields); if (!this.auction) this.nextAuction(); }
  nextAuction() {
    if (!this.order.length) { this.auctionQueue = []; this.auction = null; this.checkEnd(); return; }
    const field = this.auctionQueue.shift();
    if (field === undefined) { this.auction = null; this.checkEnd(); return; }
    this.auction = { field, bid: 0, leader: null, passed: [], participants: [...this.order] }; this.moveNo++;
    this.say(`${this.fieldName(field)} wird versteigert – Mindestgebot 1`, 'info', 'action');
  }
  bid(id, amount) {
    this.active(id); const a = this.auction;
    if (!a || a.passed.includes(id) || !integer(amount) || amount <= a.bid || amount > this.people[id].money) throw new Error('Biete mindestens eins mehr und höchstens dein Bargeld');
    a.bid = amount; a.leader = id; this.act(id, `bietet ${amount} auf ${this.fieldName(a.field)}`);
    this.maybeAuctionDone();
  }
  passAuction(id) {
    this.active(id); const a = this.auction; if (!a || a.leader === id || a.passed.includes(id)) throw new Error('Dein Höchstgebot bleibt verbindlich');
    a.passed.push(id); this.act(id, 'steigt aus der Versteigerung aus'); this.maybeAuctionDone();
  }
  maybeAuctionDone() { const a = this.auction; if (a && a.participants.every((id) => a.passed.includes(id) || id === a.leader)) this.finishAuction(); }
  finishAuction() {
    const a = this.auction; if (!a) return;
    if (a.leader && this.order.includes(a.leader)) { this.cash(a.leader, null, a.bid, `Versteigerung ${this.fieldName(a.field)}`); this.owned[a.field].owner = a.leader; }
    else this.say(`${this.fieldName(a.field)} bleibt bei der Bank`);
    this.auction = null; this.nextAuction(); this.moveNo++;
  }
  buildingGroup(field) { return BOARD[field]?.color ? group(field) : [field]; }
  manage(id, field, action) {
    this.active(id); const f = BOARD[field], p = this.owned[field];
    if (!p || p.owner !== id) throw new Error('Dieses Grundstück gehört dir nicht');
    if (this.auction || this.trade || this.debt && (this.debt.from !== id || !['sell', 'sellAll', 'mortgage'].includes(action))) throw new Error('Während dieser Entscheidung ist das nicht möglich');
    const members = this.buildingGroup(field), levels = members.map((i) => this.owned[i].level);
    if (action === 'build') {
      if (!f.color || members.some((i) => this.owned[i].owner !== id || this.owned[i].mortgage) || p.level >= 5 || p.level > Math.min(...levels)) throw new Error('Baue gleichmäßig in einer vollständigen, unbelasteten Farbgruppe');
      if (p.level === 4 ? this.stock.hotels < 1 : this.stock.houses < 1) throw new Error('Der Gebäudevorrat reicht nicht');
      this.cash(id, null, f.build, `Bau ${this.fieldName(field)}`);
      if (p.level === 4) { this.stock.houses += 4; this.stock.hotels--; } else this.stock.houses--;
      p.level++;
    } else if (action === 'sell' || action === 'sellAll') {
      if (!f.color || !p.level || action === 'sell' && p.level < Math.max(...levels)) throw new Error('Gebäude müssen gleichmäßig verkauft werden');
      if (action === 'sellAll') {
        const amount = members.reduce((s, i) => s + this.owned[i].level * f.build / 2, 0);
        for (const i of members) { const q = this.owned[i]; if (q.level === 5) this.stock.hotels++; else this.stock.houses += q.level; q.level = 0; }
        this.cash(null, id, amount, 'Gebäude einer Farbgruppe verkauft');
      } else {
        if (p.level === 5 && this.stock.houses < 4) throw new Error('Für den Hotelabbau fehlen vier Häuser; die gesamte Gruppe kann verkauft werden');
        if (p.level === 5) { this.stock.hotels++; this.stock.houses -= 4; } else this.stock.houses++;
        p.level--; this.cash(null, id, f.build / 2, 'Gebäude verkauft');
      }
    } else if (action === 'mortgage') {
      if (p.mortgage || levels.some((n) => n > 0)) throw new Error('Erst alle Gebäude der Farbe verkaufen; eine Hypothek geht nur einmal');
      p.mortgage = true; this.cash(null, id, f.price / 2, `Hypothek ${this.fieldName(field)}`);
    } else if (action === 'unmortgage') {
      if (!p.mortgage) throw new Error('Keine Hypothek vorhanden');
      this.cash(id, null, redemption(field), `Hypothek auslösen ${this.fieldName(field)}`); p.mortgage = false;
    } else throw new Error('Unbekannte Grundstücksaktion');
    this.act(id, `${this.fieldName(field)}: ${{ build: 'gebaut', sell: 'Gebäude verkauft', sellAll: 'Gruppe abgebaut', mortgage: 'belastet', unmortgage: 'ausgelöst' }[action]}`);
    if (this.debt) this.settlePayments();
  }
  offerSide(id, side = {}) {
    const money = side.money ?? 0, free = side.free ?? 0, properties = side.properties ?? [];
    if (!integer(money) || money > this.people[id].money || !integer(free) || free > this.people[id].free.length || !Array.isArray(properties) || properties.length > 28 || new Set(properties).size !== properties.length) throw new Error('Geld, Freikarten oder Grundstücke stimmen nicht');
    for (const i of properties) if (!Number.isInteger(i) || this.owned[i]?.owner !== id || this.buildingGroup(i).some((f) => this.owned[f].level > 0)) throw new Error('Nur eigene unbebaute Grundstücke handeln');
    return { money, free, properties: [...properties] };
  }
  proposeTrade(id, target, give, take) {
    this.active(id); this.active(target); if (id === target || this.auction || this.debt || this.trade && !(this.trade.to === id && this.trade.from === target)) throw new Error('Handel geht gerade nicht');
    const a = this.offerSide(id, give), b = this.offerSide(target, take);
    if (!a.money && !a.free && !a.properties.length && !b.money && !b.free && !b.properties.length) throw new Error('Das Angebot ist leer');
    this.trade = { n: ++this.serial, from: id, to: target, give: a, take: b }; this.act(id, `bietet ${this.name(target)} einen Handel an`);
  }
  respondTrade(id, accept) {
    this.active(id); const t = this.trade; if (!t || t.to !== id) throw new Error('Kein Angebot an dich');
    if (!accept) { this.trade = null; this.act(id, 'lehnt den Handel ab'); return; }
    // Vor dem ersten Schreibzugriff den gesamten Tausch samt Übernahmezinsen prüfen.
    this.offerSide(t.from, t.give); this.offerSide(t.to, t.take);
    const interest = (side) => side.properties.reduce((s, i) => s + (this.owned[i].mortgage ? Math.ceil(BOARD[i].price / 20) : 0), 0);
    const fromFee = interest(t.take), toFee = interest(t.give);
    if (this.people[t.from].money - t.give.money + t.take.money < fromFee || this.people[t.to].money - t.take.money + t.give.money < toFee) throw new Error('Das Geld reicht nicht für die sofortigen 10 % Übernahmezinsen');
    // Netto abrechnen: kein zwischenzeitlich negativer Kontostand bei einem symmetrischen Geldtausch.
    const net = t.give.money - t.take.money; if (net > 0) this.cash(t.from, t.to, net, 'Handel'); else if (net < 0) this.cash(t.to, t.from, -net, 'Handel');
    for (const i of t.give.properties) this.owned[i].owner = t.to; for (const i of t.take.properties) this.owned[i].owner = t.from;
    const fromCards = this.people[t.from].free.splice(0, t.give.free), toCards = this.people[t.to].free.splice(0, t.take.free);
    this.people[t.to].free.push(...fromCards); this.people[t.from].free.push(...toCards);
    if (fromFee) this.cash(t.from, null, fromFee, 'Übernahmezinsen'); if (toFee) this.cash(t.to, null, toFee, 'Übernahmezinsen');
    this.trade = null; this.act(id, 'nimmt den Handel an');
  }
  liquidation(id) { return this.people[id].money + PROPERTIES.filter((i) => this.owned[i].owner === id).reduce((s, i) => s + (this.owned[i].mortgage ? 0 : BOARD[i].price / 2) + this.owned[i].level * (BOARD[i].build || 0) / 2, 0); }
  wealth(id) { return this.people[id].money + PROPERTIES.filter((i) => this.owned[i].owner === id).reduce((s, i) => s + BOARD[i].price * (this.owned[i].mortgage ? .5 : 1) + this.owned[i].level * (BOARD[i].build || 0), 0); }
  bankrupt(id, force = false) {
    this.active(id); if (!force && (!this.debt || this.debt.from !== id || this.liquidation(id) >= this.debt.amount)) throw new Error('Erst mögliche Gebäudeverkäufe und Hypotheken nutzen');
    const creditor = this.debt?.from === id && this.debt.to && this.order.includes(this.debt.to) ? this.debt.to : null;
    const actor = this.actor, index = this.order.indexOf(id), properties = PROPERTIES.filter((i) => this.owned[i].owner === id);
    if (this.people[id].money) this.cash(id, creditor, this.people[id].money, 'Bankrott');
    let interest = 0;
    for (const i of properties) {
      const p = this.owned[i];
      if (p.level) { const amount = p.level * BOARD[i].build / 2; if (p.level === 5) this.stock.hotels++; else this.stock.houses += p.level; p.level = 0; this.cash(null, creditor, amount, 'Gebäudeverwertung bei Bankrott'); }
      p.owner = creditor;
      if (!creditor) p.mortgage = false; else if (p.mortgage) interest += Math.ceil(BOARD[i].price / 20);
    }
    if (creditor) this.people[creditor].free.push(...this.people[id].free);
    else for (const c of this.people[id].free) this.decks[c.deck].push(c.index);
    this.people[id].free = []; this.people[id].out = true;
    this.order.splice(index, 1); if (index < this.turn) this.turn--; if (this.turn >= this.order.length) this.turn = 0;
    this.trade = null; this.debt = null; this.payments = this.payments.filter((p) => p.from !== id);
    if (this.deferred?.id === id) this.deferred = null;
    this.act(id, creditor ? `ist bankrott – Besitz an ${this.name(creditor)}` : 'ist bankrott – Besitz an die Bank');
    if (actor === id && this.order.length) this.onTurnStart();
    if (interest) this.payments.unshift({ from: creditor, to: null, amount: interest, reason: 'Übernahmezinsen', tax: false });
    if (!creditor) this.auctionQueue.push(...properties);
    this.settlePayments();
    this.checkEnd();
  }
  endTurn(id) { this.requireActor(id); if (this.step !== 'end') throw new Error('Erst würfeln und das Feld abschließen'); this.next(); }
  finishWealth() { const max = Math.max(...this.order.map((id) => this.wealth(id))), winners = this.order.filter((id) => this.wealth(id) === max); this.finish(winners, `Zeitlimit: ${winners.map((id) => this.name(id)).join(', ')} gewinnt mit ${max} Vermögen`); }
  checkEnd() { if (this.phase === 'playing' && this.order.length <= 1 && !this.debt && !this.auction) this.finish([...this.order], this.order.length ? `${this.name(this.order[0])} bleibt als Letzter übrig` : 'Alle sind ausgeschieden'); }
  finish(winners, text) { this.dispose(); this.trade = null; this.auction = null; this.debt = null; this.finishRound(winners, text, Object.fromEntries(winners.map((id) => [id, 1]))); }
  dispose() { super.dispose(); this.clock.clearTimeout(this.endTimer); this.endTimer = null; }
  onAbort() { this.dispose(); this.trade = null; this.auction = null; this.debt = null; }
  dropOut(p, message) {
    if (!this.order.includes(p.id)) return;
    if (message) this.say(message);
    if (this.auction) { const a = this.auction; a.participants = a.participants.filter((id) => id !== p.id); a.passed = a.passed.filter((id) => id !== p.id); if (a.leader === p.id) { a.leader = null; a.bid = 0; } }
    this.bankrupt(p.id, true); this.maybeAuctionDone();
  }
  botDue() {
    const bot = (id) => this.players.get(id)?.bot;
    if (this.debt) return bot(this.debt.from) ? this.debt.from : null;
    if (this.auction) return this.auction.participants.find((id) => bot(id) && !this.auction.passed.includes(id) && this.auction.leader !== id) || null;
    return bot(this.currentId) ? this.currentId : null;
  }
  syncTimer() {
    const seconds = this.auction ? this.settings.auctionTime : this.settings.turnTime;
    const key = this.phase === 'playing' ? `${this.roundNo}:${this.currentId}:${this.moveNo}` : null;
    if (key === this.timerKey) return;
    this.clock.clearTimeout(this.turnTimer); this.turnTimer = null; this.timerKey = key; this.deadline = null;
    if (!key) return;
    this.deadline = this.clock.now() + seconds * 1000;
    this.turnTimer = this.clock.setTimeout(() => { if (this.timerKey !== key) return; this.onTimeout(this.currentId); this.syncTimer(); this.onChange('state'); }, seconds * 1000); this.turnTimer.unref?.();
  }
  onTimeout(id) {
    if (this.debt) {
      for (let guard = 0; this.debt && guard < 80; guard++) {
        id = this.debt.from;
        const built = PROPERTIES.find((i) => this.owned[i].owner === id && this.owned[i].level);
        const loan = PROPERTIES.find((i) => this.owned[i].owner === id && !this.owned[i].mortgage && !this.buildingGroup(i).some((j) => this.owned[j].level));
        if (built !== undefined) this.manage(id, built, 'sellAll');
        else if (loan !== undefined) this.manage(id, loan, 'mortgage');
        else { this.bankrupt(id); break; }
      } return;
    }
    if (this.auction) return this.finishAuction();
    if (this.trade) return this.respondTrade(this.trade.to, false);
    if (this.step === 'buy') return this.buy(this.actor, false);
    if (this.step === 'roll' || this.step === 'jail') return this.throwDice(this.actor);
    return this.endTurn(this.actor);
  }
  possible(id) {
    if (!this.order.includes(id)) return [];
    return PROPERTIES.filter((i) => this.owned[i].owner === id).map((i) => {
      const p = this.owned[i], f = BOARD[i], members = this.buildingGroup(i), levels = members.map((j) => this.owned[j].level), blocked = !!(this.auction || this.trade), debtor = !this.debt || this.debt.from === id;
      return { field: i, build: !blocked && !this.debt && !!f.color && members.every((j) => this.owned[j].owner === id && !this.owned[j].mortgage) && p.level < 5 && p.level === Math.min(...levels) && this.people[id].money >= f.build && (p.level === 4 ? this.stock.hotels > 0 : this.stock.houses > 0),
        sell: !blocked && debtor && p.level > 0 && p.level === Math.max(...levels) && (p.level < 5 || this.stock.houses >= 4), sellAll: !blocked && debtor && p.level > 0,
        mortgage: !blocked && debtor && !p.mortgage && !levels.some((n) => n > 0), unmortgage: !blocked && !this.debt && p.mortgage && this.people[id].money >= redemption(i) };
    });
  }
  publicPlayer(p) { const q = this.people[p.id]; return q ? { money: q.money, position: q.position, jail: q.jail, out: q.out, wealth: this.wealth(p.id), properties: PROPERTIES.filter((i) => this.owned[i].owner === p.id).length } : {}; }
  gameView(id) {
    return { board: structuredClone(this.board), tokens: this.tokens, people: structuredClone(this.people), owned: structuredClone(this.owned), stock: { ...this.stock }, pot: this.pot, actor: this.actor,
      dice: [...this.dice], rollNo: this.rollNo, doubles: this.doubles, step: this.step, turnNo: this.turnNo, endsAt: this.endsAt, card: this.card, lastMove: this.lastMove ? structuredClone(this.lastMove) : null,
      auction: this.auction ? structuredClone(this.auction) : null, trade: this.trade ? structuredClone(this.trade) : null, debt: this.debt ? { ...this.debt } : null,
      possible: this.possible(id), liquidation: this.people[id] ? this.liquidation(id) : 0, boards: this.phase === 'lobby' ? boardStore().list() : null };
  }
  view(id) { const v = super.view(id); v.monopolyBoards = boardStore().list(); v.monopolyTokens = this.tokens; return v; }
  static restore(data, onChange) { const r = TurnRoom.restoreInto(new this(data.code, data.settings, onChange), data); try { r.board = boardStore().get(r.settings.board); } catch { r.settings.board = 'default'; } return r; }
}
