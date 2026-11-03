// Einfache Computer-Züge für die Rundenspiele: regelkonform, mit etwas Zufall.
// Jede Funktion macht genau eine Aktion für den Spieler id, der gerade dran ist.
// Für Massentests und echte Bot-Mitspieler; Entscheidungen nutzen nur eigene bzw. offene Informationen.
import { PHASES, partition, cardPoints, hitSide } from './zehnetappen/room.js';
import { JOKER } from './stapelrennen/room.js';
import { valueOf } from './maexchen/room.js';
import { UPPER } from './kniffel/room.js';
import { handValue } from './schwimmen/room.js';
import { randomFleet, around, SIZE } from './schiffe/room.js';
import { total as bjTotal, cardValue } from './blackjack/room.js';
import { newDeck, score7, omahaScore } from './poker/engine/cards.js';
import { judge } from './schocken/room.js';
import { botColumn } from './viergewinnt/room.js';
import { combos as stbCombos } from './shutthebox/room.js';
import { bestTake } from './zehntausend/room.js';
import { botMove as muehleMove } from './muehle/room.js';
import { evaluate as pokerDiceEval } from './wuerfelpoker/room.js';
import { botMove as reversiMove } from './reversi/room.js';
import { botMove as dameMove } from './dame/room.js';
import { LETTERS as PAKET_LETTERS } from './tickendes-paket/room.js';
import { botMove as sechsNimmt } from './sechs-nimmt/room.js';
import { botMove as monopolyDeal } from './monopoly-deal/room.js';
import { botMove as monopoly } from './monopoly/bot.js';
import { botCell as hexCell } from './hex/room.js';
const lifeBot = (room, id) => room.botMove(id);
const scotlandYardBot = (room, id, rng) => room.botMove(id, rng);
const hexBot = (room, id, rng) => {
  if (room.canSwap(id) && Math.abs(Math.floor(room.last / room.size) - (room.size - 1) / 2) + Math.abs(room.last % room.size - (room.size - 1) / 2) <= 2) room.swapSides(id);
  else room.place(id, hexCell(room.board, room.size, room.colors[id], rng));
};
const duelBot = (room, id) => room.onTimeout(id);

const one = (list, rng) => list[Math.floor(rng() * list.length)];

// Mau-Mau und UNO: passende Karte spielen, sonst ziehen, sonst weiter
function shedding(room, id, rng) {
  if (room.variantBot) return room.variantBot(id, rng);
  if (room.forgot === id) room.lateCall(id);
  else if (room.forgot) room.catchForgot(id);
  const v = room.gameView(id);
  if (v.playable.length) {
    const colors = (c) => v.hand.filter((x) => x[1] === c[1]).length;
    // Farbwahl als Reserve behalten, statt ständig Aktionskarten im Kreis zu spielen.
    const value = (c) => room.cardPoints(c) + colors(c) * 4 - (room.needsWish(c) && v.hand.length > 2 ? 100 : 0);
    // Gelegentliche Variation verhindert feste Ablege-Zyklen bei zwei Spielern.
    const c = rng() < 0.15 ? one(v.playable, rng) : [...v.playable].sort((a, b) => value(b) - value(a))[0];
    const wishes = ['c', 's', 'h', 'd', 'r', 'y', 'g', 'b'].filter((w) => room.validWish(w));
    wishes.sort((a, b) => v.hand.filter((x) => x !== c && x[1] === b).length - v.hand.filter((x) => x !== c && x[1] === a).length);
    const target = room.order.filter((p) => p !== id).sort((a, b) => room.hands[a].length - room.hands[b].length)[0];
    return room.play(id, c, room.needsWish(c) ? wishes[0] : undefined, true, target);
  }
  return v.drawn ? room.pass(id) : room.draw(id);
}

// Mäxchen: meist ehrlich ansagen, sonst knapp drüber bluffen.
// Anzweifeln umso eher, je schwerer die Ansage mit einem echten Wurf zu überbieten ist.
const ALL_ROLLS = [1, 2, 3, 4, 5, 6].flatMap((a) => [1, 2, 3, 4, 5, 6].map((b) => valueOf([a, b])));
function maexchen(room, id, rng) {
  const v = room.gameView(id);
  if (v.cup) {
    const from = v.last ? v.values.indexOf(v.last.value) + 1 : 0;
    const allowed = v.values.slice(from);
    const real = valueOf(v.cup);
    const value = allowed.includes(real) && rng() < 0.9 ? real : rng() < 0.75 || allowed.length < 2 ? allowed[0] : allowed[1];
    return room.announce(id, value);
  }
  if (v.last?.value === 21) return rng() < 0.5 ? room.doubt(id) : room.accept(id);
  if (v.last) {
    const r = v.values.indexOf(v.last.value);
    const beat = ALL_ROLLS.filter((x) => v.values.indexOf(x) > r).length / 36;
    if (rng() < (beat < 0.15 ? 0.8 : beat < 0.3 ? 0.55 : beat < 0.5 ? 0.25 : 0.06)) return room.doubt(id);
    // Ungesehen weitergeben (wenn erlaubt), knapp über der letzten Ansage – nur solange das noch glaubhaft ist
    const next = v.values[r + 1];
    if (next && room.settings.blindPass && beat > 0.4 && rng() < 0.15) return room.passBlind(id, next);
  }
  return room.throwDice(id);
}

function schocken(room, id, rng) {
  const n = room.throws[id] || 0;
  if (!n) return room.throwDice(id);
  const d = room.dice[id];
  if (room.settings.sixToOne && n < room.maxThrows && room.forced[id] === undefined && d.filter((x) => x === 6).length === 2) return room.turnSixes(id);
  if (room.reroll[id] !== undefined) return room.throwDice(id, []); // nach dem Drehen weiterwürfeln
  if (n < room.maxThrows && judge(d).cat < 3) {
    const ones = d.map((v, i) => v === 1 ? i : -1).filter((i) => i >= 0);
    const pair = d.find((v) => d.filter((x) => x === v).length === 2);
    const keep = ones.length ? ones : pair ? d.map((v, i) => v === pair ? i : -1).filter((i) => i >= 0) : [];
    return room.throwDice(id, keep);
  }
  return room.stop(id);
}

// Mensch ärgere Dich nicht: ins Ziel, schlagen, rauskommen; Felder meiden, die ein fremdes Hütchen mit 1–6 erreicht,
// und bedrohte Hütchen in Sicherheit ziehen
function huetchen(room, id, rng) {
  if (room.rolled === null) return room.throwDice(id);
  const owner = room.controlled(id), TRACK = room.track, GOAL = room.track;
  const foes = room.order.filter((p) => p !== owner && p !== room.partner(owner)).flatMap((p) => room.pieces[p].filter((x) => x >= 0 && x < TRACK).map((x) => room.abs(p, x)));
  const danger = (progress) => progress >= 0 && progress < GOAL && foes.some((f) => { const k = (room.abs(owner, progress) - f + TRACK) % TRACK; return k >= 1 && k <= 6; });
  const value = (i) => {
    const from = room.pieces[owner][i];
    const to = from < 0 ? 0 : from + room.rolled;
    return (to >= GOAL ? 100 : 0) + (room.captures(owner, i, room.rolled) ? 60 : 0) + (from < 0 ? 25 : to)
      + (danger(from) ? 8 : 0) - (to < GOAL && danger(to) ? 10 : 0) + rng() * 2;
  };
  return room.move(id, [...room.options].sort((a, b) => value(b) - value(a))[0]);
}

// Phase 10: Phase suchen und auslegen, dann anlegen, sonst abwerfen
function findPhase(hand, groups, limit = 4000) {
  const need = groups.reduce((a, [, k]) => a + k, 0);
  if (hand.length < need) return null;
  const pick = [];
  let tries = 0;
  const go = (start) => {
    if (pick.length === need) { tries++; return partition(pick.map((i) => hand[i]), groups) ? pick.slice() : null; }
    for (let i = start; i <= hand.length - (need - pick.length) && tries < limit; i++) {
      pick.push(i);
      const r = go(i + 1);
      pick.pop();
      if (r) return r;
    }
    return null;
  };
  const idx = go(0);
  return idx && idx.map((i) => hand[i]);
}
// Wie sehr hilft eine Karte bei der eigenen Phase? Joker immer, Aussetzen nie; nach dem Auslegen nur, wenn sie anlegbar ist.
function usefulness(room, id, card, hand) {
  if (card.c === 'j') return 100;
  if (card.c === 's') return -100;
  if (room.done.has(id)) return Object.values(room.laid).some((gs) => gs.some((g) => hitSide(g, card))) ? 50 : -cardPoints(card) / 5;
  const others = hand.filter((x) => x !== card && x.c !== 's' && x.c !== 'j');
  let u = 0;
  for (const [type] of PHASES[room.phaseOf(id)]) {
    if (type === 'set') u = Math.max(u, others.filter((x) => x.n === card.n).length * 3);
    if (type === 'color') u = Math.max(u, others.filter((x) => x.c === card.c).length * 1.2);
    if (type === 'run') {
      const ns = new Set(others.map((x) => x.n));
      u = Math.max(u, ns.has(card.n) ? 0 : [-2, -1, 1, 2].filter((d) => ns.has(card.n + d)).length * 2);
    }
  }
  return u - cardPoints(card) / 10;
}
function zehnetappen(room, id, rng) {
  if (room.step === 'draw') {
    const top = room.discard[room.discard.length - 1];
    // Auch eine nützliche Ablage gelegentlich liegen lassen: sonst können vier
    // unveränderte Hände dieselben Karten endlos im Kreis tauschen.
    const want = top && top.c !== 's' && usefulness(room, id, top, room.hands[id]) >= 4 && rng() < .9;
    return room.drawCard(id, want ? 'discard' : 'deck');
  }
  const hand = room.hands[id];
  if (!room.done.has(id)) {
    const cards = findPhase(hand.filter((c) => c.c !== 's'), PHASES[room.phaseOf(id)]);
    if (cards) return room.layPhase(id, cards.map((c) => c.id));
  } else {
    for (const c of hand) {
      for (const owner of Object.keys(room.laid)) {
        const g = room.laid[owner].findIndex((gr) => hitSide(gr, c));
        if (g >= 0) return room.hit(id, c.id, owner, g);
      }
    }
  }
  // Die unnützeste Karte abwerfen; Aussetzen trifft, wer am weitesten ist
  const c = [...hand].sort((a, b) => usefulness(room, id, a, hand) - usefulness(room, id, b, hand) + (rng() - 0.5) * 0.2)[0];
  const others = room.order.filter((p) => p !== id && p !== room.partner(id));
  const ahead = (p) => room.phaseOf(p) * 20 + (room.done.has(p) ? 10 : 0) - room.hands[p].length + rng();
  return room.throwAway(id, c.id, c.c === 's' ? others.sort((a, b) => ahead(b) - ahead(a))[0] : undefined);
}
// Skip-Bo: was passt, auf die Baureihen (Stapel zuerst), sonst abwerfen
function stapelrennen(room, id, rng) {
  const sources = [];
  const partner = room.partner(id);
  if (partner) { const s = room.stock[partner]; if (s.length) sources.push([{ kind: 'stock', owner: partner }, s.at(-1)]); room.piles[partner].forEach((p, index) => { if (p.length) sources.push([{ kind: 'pile', index, owner: partner }, p.at(-1)]); }); }
  const stock = room.stock[id];
  if (stock.length) sources.push([{ kind: 'stock' }, stock[stock.length - 1]]);
  room.hand[id].forEach((n, i) => sources.push([{ kind: 'hand', index: i }, n]));
  room.piles[id].forEach((p, i) => { if (p.length) sources.push([{ kind: 'pile', index: i }, p[p.length - 1]]); });
  for (const [from, n] of sources) {
    // Joker nicht verschwenden, wenn es auch anders geht – außer vom Stapel
    if (n === JOKER && from.kind !== 'stock' && rng() < 0.5) continue;
    const to = room.build.findIndex((b) => n === JOKER || b.length + 1 === n);
    if (to >= 0) return room.play(id, from, to);
  }
  if (!room.hand[id].length) return room.pass(id); // kein Nachziehen möglich: ohne Abwerfen weiter
  // Abwerfen: keinen Joker; am liebsten auf gleiche Zahl oder eins drüber (später absteigend spielbar), sonst auf eine leere Ablage
  let best = null;
  room.hand[id].forEach((n, i) => room.piles[id].forEach((p, k) => {
    const top = p[p.length - 1];
    let v = n === JOKER ? -100 : n / 2;
    if (top === undefined) v += 5; else if (top === n) v += 12; else if (top === n + 1) v += 10; else if (top > n) v += 3; else v -= 6;
    v += rng();
    if (!best || v > best.v) best = { i, k, v };
  }));
  return room.throwAway(id, best.i, best.k);
}

// Schwimmen: meist der Tausch, der am meisten bringt; manchmal zufällig, alle drei oder schieben; klopft mit guter Hand
function schwimmen(room, id, rng) {
  const fire = room.settings.fire;
  const hand = room.hands[id];
  const cur = handValue(hand, fire);
  // Je länger der Durchgang dauert, desto eher wird geklopft (sonst tauschen zwei Bots ewig hin und her)
  const rounds = room.turnsTaken / room.order.length;
  if (room.canKnock() && (cur >= 31 - rounds + rng() * 3 || rounds > 12) && rng() < 0.7) return room.knock(id);
  if (room.settings.passing && rng() < 0.12) return room.pass(id);
  if (rng() < 0.08 || handValue(room.middle, fire) > cur + 3) return room.swapAll(id);
  let best = null;
  for (let h = 0; h < 3; h++) for (let m = 0; m < 3; m++) {
    const t = [...hand]; t[h] = room.middle[m];
    const v = handValue(t, fire);
    if (!best || v > best.v) best = { v, h, m };
  }
  if (rng() < 0.2) return room.swap(id, Math.floor(rng() * 3), Math.floor(rng() * 3));
  if (best.v <= cur && room.settings.passing && rng() < 0.5) return room.pass(id);
  return room.swap(id, best.h, best.m);
}

// Schiffe versenken: zufällig setzen. Schießen: liegen zwei Treffer in einer Linie, die Linie verlängern;
// sonst neben offene Treffer; sonst im Schachbrettmuster suchen. Ohne Berühren bleiben Felder um versenkte Schiffe frei.
function schiffe(room, id, rng) {
  if (room.step === 'place') return room.place(id, randomFleet(room.fleet(), room.settings.touch, rng));
  if (room.variant === 'salvo') return room.salvo(id, room.salvoTargets(id, rng));
  const mine = room.shots[id];
  const sunk = room.sea(room.other(id), id).sunk.flatMap((ship) => ship.cells);
  const sunkCells = new Set(sunk);
  const blocked = new Set(room.settings.touch ? [] : sunk.flatMap(around));
  const free = (c) => c >= 0 && c < SIZE * SIZE && !mine[c] && !blocked.has(c);
  const open = Object.keys(mine).map(Number).filter((c) => mine[c] === 'hit' && !sunkCells.has(c));
  const openSet = new Set(open);
  const row = (c) => Math.floor(c / SIZE);
  const line = [];
  for (const c of open) {
    for (const d of [1, SIZE]) {
      if (!openSet.has(c + d) || (d === 1 && row(c + d) !== row(c))) continue;
      // Linie in beide Richtungen bis zum Ende verfolgen
      let a = c; while (openSet.has(a - d) && (d !== 1 || row(a - d) === row(a))) a -= d;
      let b = c + d; while (openSet.has(b + d) && (d !== 1 || row(b + d) === row(b))) b += d;
      if (free(a - d) && (d !== 1 || row(a - d) === row(a))) line.push(a - d);
      if (free(b + d) && (d !== 1 || row(b + d) === row(b))) line.push(b + d);
    }
  }
  const near = open.flatMap((c) => around(c).filter((n) => free(n) && (row(n) === row(c) || n % SIZE === c % SIZE)));
  const all = [...Array(SIZE * SIZE).keys()].filter(free);
  const parity = all.filter((c) => (row(c) + c) % 2 === 0);
  const pool = line.length ? line : near.length ? near : parity.length && rng() < 0.9 ? parity : all;
  return room.shoot(id, one(pool.length ? pool : [...Array(SIZE * SIZE).keys()].filter((c) => !mine[c]), rng));
}

// Blackjack: kleiner Einsatz und Grundstrategie anhand der offenen Dealerkarte.
function blackjack(room, id, rng) {
  const min = room.settings.minBet;
  if (room.step === 'bet') {
    if (room.stacks[id] < min && room.canRebuy(id)) room.rebuy(id);
    if (room.stacks[id] < min) return room.sitOut(id);
    return room.bet(id, min);
  }
  if (room.step === 'insure') return room.insure(id, false);
  const cards = room.hands[id][room.handIdx].cards;
  const { total: t, soft } = bjTotal(cards);
  const dealer = cardValue(room.gameView(id).dealer.cards[0]);
  const pair = cardValue(cards[0]);
  if (room.canSplit(id) && (pair === 11 || pair === 8 || (pair === 9 && [2, 3, 4, 5, 6, 8, 9].includes(dealer)) || ([2, 3, 6, 7].includes(pair) && dealer <= 6))) return room.split(id);
  if (room.canDouble(id) && (!soft && (t === 11 && dealer < 11 || t === 10 && dealer < 10 || t === 9 && dealer >= 3 && dealer <= 6) || soft && t >= 16 && t <= 18 && dealer >= 4 && dealer <= 6)) return room.double(id);
  if (soft ? t < 18 || t === 18 && dealer >= 9 : t <= 11 || t === 12 && (dealer < 4 || dealer > 6) || t < 17 && dealer >= 7) return room.hit(id);
  return room.stay(id);
}

// Kniffel: Würfel behalten, die zu einem offenen Feld passen (Straße, Full House, viele Gleiche), bis zu 3 Würfe.
// Eintragen nach Wert: oben möglichst drei Gleiche (Bonus), Chance und Pasch-Felder nicht mit wenig Punkten verschenken.
function kniffelKeep(d, open) {
  const c = [0, 0, 0, 0, 0, 0, 0]; d.forEach((x) => c[x]++);
  const idxOf = (faces) => { const used = new Set(); return faces.map((f) => d.findIndex((x, i) => x === f && !used.has(i) && used.add(i))); };
  // Längste Folge verschiedener Augen
  let run = [];
  for (let s = 1; s <= 6; s++) { const r = []; for (let f = s; f <= 6 && c[f]; f++) r.push(f); if (r.length > run.length) run = r; }
  if (run.length >= 5 && open('largeStraight')) return [0, 1, 2, 3, 4];
  if (run.length >= 4 && (open('largeStraight') || open('smallStraight'))) return open('largeStraight') ? idxOf(run.slice(0, 4)) : [0, 1, 2, 3, 4];
  if (open('fullHouse') && c.filter((n) => n === 3).length === 1 && c.filter((n) => n === 2).length === 1) return [0, 1, 2, 3, 4];
  const max = Math.max(...c.slice(1));
  if (max <= 2 && run.length === 3 && (open('largeStraight') || open('smallStraight'))) return idxOf(run);
  // Viele Gleiche: die häufigste (bei Gleichstand die höhere) Augenzahl, deren Feld noch etwas bringt
  const kind = open('threeKind') || open('fourKind') || open('kniffel');
  const faces = [6, 5, 4, 3, 2, 1].filter((f) => c[f] && (kind || open(UPPER[f - 1])));
  if (!faces.length) return [];
  const f = faces.sort((a, b) => c[b] - c[a])[0];
  return d.map((x, i) => (x === f ? i : -1)).filter((i) => i >= 0);
}
function kniffel(room, id, rng) {
  if (room.variant === 'triple') return room.botMove(id);
  const sheet = room.sheets[id];
  const open = (f) => sheet[f] === null;
  if (!room.rolls) return room.throwDice(id, []);
  if (room.rolls < 3) {
    const keep = kniffelKeep(room.dice, open);
    if (keep.length < 5) return room.throwDice(id, keep);
  }
  const worth = ([f, v]) => {
    const up = UPPER.indexOf(f);
    if (up >= 0) return v - 3 * (up + 1) + (v >= 3 * (up + 1) ? 6 : 0);
    if (f === 'chance') return v - 23;
    if (f === 'threeKind' || f === 'fourKind') return v - 18;
    return v; // feste Werte: Full House, Straßen, Kniffel
  };
  const opts = Object.entries(room.options(id)).sort((a, b) => worth(b) - worth(a) || (rng() < 0.5 ? -1 : 1));
  if (opts[0][1] > 0 && worth(opts[0]) > -7) return room.score(id, opts[0][0]);
  // Nichts Gutes: Chance mit ordentlich Punkten, sonst das unwichtigste Feld opfern
  const chance = opts.find(([f]) => f === 'chance');
  if (chance && chance[1] >= 20) return room.score(id, 'chance');
  const order = ['ones', 'twos', 'kniffel', 'threes', 'largeStraight', 'fourKind', 'fours', 'smallStraight', 'fullHouse', 'threeKind', 'fives', 'sixes', 'chance'];
  return room.score(id, order.find((f) => opts.some(([k]) => k === f)) || opts[0][0]);
}

// Vier gewinnt: eigener Sieg, Gegner blocken, Mitte.
function viergewinnt(room, id, rng) {
  if (room.variant !== 'classic') return room.variantBot(id, rng);
  const foe = room.order.find((p) => p !== id);
  return room.drop(id, botColumn(room.board, id, foe, rng));
}

// Shut the Box: meist die Kombination mit den höchsten Klappen, manchmal zufällig; ein Würfel, wenn wenig offen ist
function shutthebox(room, id, rng) {
  if (!room.pending) return room.throwDice(id, room.canOneDie(id) && (room.boxes[id].reduce((a, b) => a + b, 0) <= 6 || rng() < 0.3) ? 1 : 2);
  const all = stbCombos(room.boxes[id], room.dice.reduce((a, b) => a + b, 0));
  all.sort((a, b) => Math.max(...b) - Math.max(...a));
  return room.close(id, rng() < 0.2 ? all[Math.floor(rng() * all.length)] : all[0]);
}

// Zehntausend: punktende Würfel herauslegen – bestehen sie nur aus einzelnen Einsen/Fünfen, lieber nur eine nehmen
// und mit mehr Würfeln weiter. Aufhören, sobald die Zugpunkte das Risiko der übrigen Würfel nicht mehr lohnen.
// In der letzten Runde weiter, bis die Führung überboten ist.
const BANK_AT = [0, 250, 300, 400, 900, 2000, 3500]; // ab so vielen Zugpunkten aufhören, je nach übrigen Würfeln
function zehntausend(room, id, rng) {
  if (room.rolled) {
    const best = bestTake(room.dice, room.scoring());
    const singles = best.idx.every((i) => room.dice[i] === 1 || room.dice[i] === 5) && best.points === best.idx.reduce((a, i) => a + (room.dice[i] === 1 ? 100 : 50), 0);
    const left = room.dice.length - best.idx.length;
    if (singles && best.idx.length > 1 && left > 0 && rng() < 0.85) {
      const one1 = best.idx.find((i) => room.dice[i] === 1);
      return room.take(id, [one1 ?? best.idx[0]]);
    }
    return room.take(id, best.idx);
  }
  if (!room.canBank(id)) return room.throwDice(id);
  const me = room.banked[id];
  const lead = Math.max(0, ...room.order.filter((p) => p !== id).map((p) => room.banked[p] || 0));
  if (room.final) return me + room.turnPoints > lead ? room.bank(id) : room.throwDice(id);
  if (me + room.turnPoints >= room.settings.target) return room.bank(id);
  const need = BANK_AT[room.remaining] * (0.85 + rng() * 0.3) * (lead - me > 3000 ? 1.4 : 1);
  return room.turnPoints >= need ? room.bank(id) : room.throwDice(id);
}

// Unbekannte Karten werden für jede Schätzung neu gezogen, nie aus dem echten Deck gelesen.
export function pokerDecision(view, rng = Math.random) {
  const L = view.legal;
  if (!L) return null;
  const own = view.seats[view.you.seat].cards;
  const board = view.hand.board;
  const opponents = view.seats.filter((p) => p && p.inHand && !p.folded && p.id !== view.you.id).length;
  const omaha = own.length === 4;
  const rank = (hole, river) => (omaha ? omahaScore(hole, river) : score7([...hole, ...river]));
  const unseen = newDeck().filter((c) => !own.includes(c) && !board.includes(c));
  let wins = 0;
  for (let trial = 0; trial < 80; trial++) {
    const deck = [...unseen];
    const draw = () => deck.splice(Math.floor(rng() * deck.length), 1)[0];
    const river = [...board];
    while (river.length < 5) river.push(draw());
    const score = rank(own, river);
    let ties = 1, lost = false;
    for (let i = 0; i < opponents; i++) {
      const other = rank(omaha ? [draw(), draw(), draw(), draw()] : [draw(), draw()], river);
      if (other > score) lost = true;
      if (other === score) ties++;
    }
    if (!lost) wins += 1 / ties;
  }
  const equity = wins / 80;
  const pot = view.hand.pots.reduce((sum, n) => sum + n, 0) + view.hand.bets;
  return pokerWagerDecision(L, pot, equity, rng);
}

// Shared betting policy; variant samplers supply equity using only their public view.
export function pokerWagerDecision(L, pot, equity, rng = Math.random) {
  if (!L) return null;
  if (L.canRaise && equity > 0.68 && rng() < 0.65) return { type: 'raise', amount: Math.min(L.maxTo, Math.max(L.minTo, L.bet + L.toCall + Math.round(pot * 0.6))) };
  if (L.canCheck) return { type: 'check' };
  return { type: equity > L.toCall / Math.max(1, pot + L.toCall) + 0.07 ? 'call' : 'fold' };
}
function poker(room, id, rng) {
  const action = pokerDecision(room.view(id), rng);
  if (action) room.act(id, action);
}

// Mühle: Mühle schließen, gegnerische verhindern, sonst zufällig (manchmal ganz zufällig, damit die Partien verschieden sind)
function muehle(room, id, rng) {
  if (room.step !== 'remove' && rng() < 0.03) {
    const l = room.legal(id);
    if (l.place) return room.place(id, l.place[Math.floor(rng() * l.place.length)]);
    const mv = Object.entries(l.moves).flatMap(([f, ts]) => ts.map((t) => [Number(f), t]));
    const [f, t] = mv[Math.floor(rng() * mv.length)];
    return room.move(id, f, t);
  }
  return muehleMove(room, id, rng);
}

// Schätzmeister: richtige Antwort mit Zufallsfaktor (siehe Room.botGuess); Partyspiele geben ihre Antworten gleichzeitig ab
function schaetzmeister(room, id, rng) { return room.guess(id, room.botGuess(rng)); }
// Schlagfertig, Wer hat das gesagt?: Platzhalter-Antworten schreiben und zufällig abstimmen/raten (siehe botStep im Raum)
const partyBot = (room, id, rng) => room.botStep(id, rng);


// Mogeln: ehrlich legen, wenn der Wert da ist, sonst eine Karte bluffen. Zweifeln, wenn es unmöglich ist oder der Vorgänger fast fertig ist.
function mogeln(room, id, rng) {
  const hand = room.hands[id];
  const L = room.last;
  if (L && L.by !== id) {
    const mine = hand.filter((c) => c[0] === L.rank).length;
    const nearlyOut = room.hands[L.by].length <= 2;
    if (L.count + mine > 4 || rng() < (nearlyOut ? 0.5 : room.pile.length > 12 ? 0.03 : 0.07)) return room.call(id);
  }
  const good = hand.filter((c) => c[0] === room.need);
  if (hand.length <= room.settings.maxCards && hand.length > 0 && rng() < 0.7) return room.play(id, [...hand]); // alles auf einmal loswerden (auch geblufft)
  if (good.length) return room.play(id, good.slice(0, Math.max(1, Math.min(room.settings.maxCards, good.length))));
  return room.play(id, [one(hand, rng)]);
}

// Präsident: aufsteigend ausspielen, überbieten mit der kleinsten passenden Gruppe, sonst passen
function praesident(room, id, rng) {
  const hand = room.hands[id];
  const groups = {};
  for (const c of hand) (groups[c[0]] ||= []).push(c);
  const ranks = Object.keys(groups).sort((a, b) => ORDER_P.indexOf(a) - ORDER_P.indexOf(b));
  const t = room.pile;
  if (!t) { const r = ranks[0]; return room.play(id, groups[r]); }
  const fit = ranks.find((r) => ORDER_P.indexOf(r) > ORDER_P.indexOf(t.rank) && groups[r].length >= t.count);
  if (fit && rng() < 0.92) return room.play(id, groups[fit].slice(0, t.count));
  return room.pass(id);
}

// Durak: billigste schlagende Karte, Trumpf möglichst sparen; angreifen mit niedrigen Karten
function durak(room, id, rng) {
  const hand = room.hands[id];
  const tr = room.trump;
  const cost = (c) => rankDurak(c) + (c[1] === tr ? 20 : 0);
  if (id === room.defender && !room.taking) {
    const idx = room.board.findIndex((p) => !p.d);
    if (idx < 0) return room.pass(id);
    const beat = hand.filter((c) => room.beats(c, room.board[idx].a)).sort((a, b) => cost(a) - cost(b));
    if (beat.length && !(beat[0][1] === tr && room.deck.length > 4 && rng() < 0.3)) return room.defend(id, beat[0], idx);
    return room.take(id);
  }
  const ranks = room.ranksOnTable();
  const legal = hand.filter((c) => !room.board.length || ranks.has(c[0])).sort((a, b) => cost(a) - cost(b));
  if (!room.board.length) return room.attack(id, legal[0]);
  if (legal.length && room.canAdd(id) && (legal[0][1] !== tr) && rng() < (id === room.attacker ? 0.85 : 0.5)) return room.attack(id, legal[0]);
  return room.pass(id);
}
const ORDER_P = ['3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A', '2'];
const rankDurak = (c) => ['6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'].indexOf(c[0]);

// Würfelpoker: die häufigste Augenzahl liegen lassen, bei Drilling oder besser (oder Straße) aufhören
function wuerfelpoker(room, id, rng) {
  if (!room.throws) return room.throwDice(id);
  const ev = pokerDiceEval(room.dice);
  if (ev[0] >= 3 || rng() < 0.05) return room.stop(id);
  const count = {};
  for (const d of room.dice) count[d] = (count[d] || 0) + 1;
  const face = Object.keys(count).map(Number).sort((a, b) => count[b] - count[a] || b - a)[0];
  const keep = room.dice.map((d, i) => (d === face ? i : -1)).filter((i) => i >= 0);
  return room.throwDice(id, keep.length === 5 ? keep.slice(1) : keep);
}

// Lügenwürfel: Erwartungswert aus den eigenen Würfeln und dem Rest, zweifeln, wenn das Gebot deutlich darüber liegt
function luegenwuerfel(room, id, rng) {
  const mine = room.cups[id];
  const others = room.total() - mine.length;
  const wild = room.settings.wild;
  const own = (f) => mine.filter((d) => d === f || (wild && d === 1 && f !== 1)).length;
  const exp = (f) => own(f) + others * (wild && f !== 1 ? 2 / 6 : 1 / 6);
  const B = room.bid;
  if (B && B.n > exp(B.face) + 0.8 + rng() * 0.6) return room.doubt(id);
  for (let n = B ? B.n : 1; n <= room.total(); n++) {
    const faces = [1, 2, 3, 4, 5, 6].filter((f) => room.higher(n, f) && exp(f) >= n - 0.7);
    if (faces.length) {
      faces.sort((a, b) => exp(b) - exp(a));
      return room.makeBid(id, n, faces[0]);
    }
  }
  return B ? room.doubt(id) : room.makeBid(id, 1, 1);
}

// Domino: den Stein mit den meisten Augen anlegen, sonst ziehen, sonst aussetzen
function domino(room, id, rng) {
  const opts = room.playable(id);
  if (opts.length) {
    opts.sort((a, b) => dominoPips(b.tile) - dominoPips(a.tile));
    return room.play(id, opts[0].tile, one(opts[0].sides, rng));
  }
  return room.stock.length ? room.draw(id) : room.pass(id);
}
const dominoPips = (t) => t.split('-').reduce((s, x) => s + Number(x), 0);

// Tickendes Paket: ein ausgedachtes Wort mit dem verlangten Anfangsbuchstaben (ein Bot kennt keine Kategorien)
function tickendesPaket(room, id, rng) {
  const syl = ['ba', 'ro', 'li', 'mu', 'ta', 'ne', 'so', 'ki', 'pe', 'du', 'la', 'ri'];
  for (let k = 0; k < 20; k++) {
    const w = room.prompt.letter + syl[Math.floor(rng() * syl.length)] + syl[Math.floor(rng() * syl.length)] + (k ? syl[Math.floor(rng() * syl.length)] : '');
    try { return room.answer(id, w); } catch { /* schon benutzt – nochmal */ }
  }
  return room.onTimeout(id);
}
void PAKET_LETTERS;

export const BOTS = { 'spiel-des-lebens': lifeBot, monopoly, 'monopoly-deal': monopolyDeal, 'sechs-nimmt': sechsNimmt, broeckelboden: partyBot, kronenjagd: partyBot, 'laser-huepfer': partyBot, 'tickendes-paket': tickendesPaket, werwolf: partyBot, zahlenzoo: partyBot, 'gedaechtnis-kueche': partyBot, pfeilfieber: partyBot, sortierstation: partyBot, wuerfelpoker, luegenwuerfel, chicago: (room, id) => room.throwDice(id), reversi: (room, id, rng) => room.place(id, reversiMove(room.board, id, rng)), dame: (room, id, rng) => { const m = dameMove(room.board, room.color(id), room.chain, rng); return room.move(id, m.from, m.to); }, domino, omaha: poker, mogeln, praesident, durak, poker, maumau: shedding, farbenchaos: shedding, maexchen, schocken, huetchen, zehnetappen, stapelrennen, schwimmen, schiffe, blackjack, kniffel, viergewinnt, shutthebox, zehntausend, muehle, schaetzmeister, schlagfertig: partyBot, werhatdasgesagt: partyBot };

Object.assign(BOTS, { 'scotland-yard': scotlandYardBot, hex: hexBot, wuerfelduell: duelBot });
Object.assign(BOTS, { 'risiko-wuerfeln':(room,id)=>room.botStep(id),'story-chaos':(room,id,rng)=>room.botStep(id,rng),zahlenreihe:(room,id,rng)=>room.botStep(id,rng) });

Object.assign(BOTS, {wuerfeljagd:(room,id)=>room.botStep(id),monsterwuerfel:(room,id)=>room.botStep(id),'wuerfel-auktion':(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{backgammon:(room,id)=>room.botStep(id)});

Object.assign(BOTS,{hearts:(room,id)=>room.botStep(id)});

Object.assign(BOTS,{'five-card-draw':(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{'scrabble':(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{'omaha-hi-lo':(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{'short-deck':(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{'seven-card-stud':(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{schach:(room,id,rng)=>room.botStep(id,rng)});
Object.assign(BOTS,{'exploding-deck':(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{doppelagent:(room,id,rng)=>room.botStep(id,rng)});

Object.assign(BOTS,{luegenbaron:(room,id,rng)=>room.botStep(id,rng)});
