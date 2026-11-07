import test from 'node:test';
import assert from 'node:assert/strict';
import './index.js'; // registriert den Bot-Zug
import { Room } from './room.js';
import { decide } from './bot.js';
import {
  dkDeck, handSize, sumPoints, legalCards, trickWinner, normalizeContract, scoreDeal, specialPoints, trumpList, isTrump, beats, announceDeadline, base,
} from './rules.js';
import { botObservation, applyBotAction } from '../../server/bot-observation.js';
import { chooseBotAction, seededRandom } from '../bot-strategies/index.js';
import { stepBot } from '../../server/bot-play.js';
import { addBot, nextBot } from '../../server/bots.js';
import { shuffle } from '../poker/engine/cards.js';

const normal = { kind: 'normal' };
const play = (...pairs) => pairs.map(([id, card]) => ({ id, card }));

test('Doppelkopf: 48 bzw. 40 Karten, 240 bzw. 240 Augen, jede Karte doppelt', () => {
  assert.equal(dkDeck(true).length, 48); assert.equal(dkDeck(false).length, 40);
  assert.equal(sumPoints(dkDeck(true)), 240); assert.equal(sumPoints(dkDeck(false)), 240);
  assert.equal(new Set(dkDeck(true)).size, 48);
  assert.equal(handSize(true), 12); assert.equal(handSize(false), 10);
  assert.equal(dkDeck(false).some((c) => c[0] === '9'), false);
});

test('Doppelkopf: Trumpfreihenfolge Dulle, Damen, Buben, Karo – Fehlfarben Ass, Zehn, König, Neun', () => {
  assert.deepEqual(trumpList(normal), ['Th', 'Qc', 'Qs', 'Qh', 'Qd', 'Jc', 'Js', 'Jh', 'Jd', 'Ad', 'Td', 'Kd', '9d']);
  assert.equal(isTrump('Th0', normal), true); assert.equal(isTrump('Ah0', normal), false); assert.equal(isTrump('Td0', normal), true); assert.equal(isTrump('Tc0', normal), false);
  const t = (a, b) => beats(a, b, normal);
  assert.ok(t('Th0', 'Qc0')); assert.ok(t('Qc0', 'Qs0')); assert.ok(t('Qd0', 'Jc0')); assert.ok(t('Jd0', 'Ad0')); assert.ok(t('Ad0', 'Td0')); assert.ok(t('9d0', 'Ac0'));
  assert.ok(t('Ac0', 'Tc0')); // Ass sticht Zehn
  assert.ok(t('Tc0', 'Kc0')); assert.ok(t('Kc0', '9c0'));
});

test('Doppelkopf: gleiche Karten – die erste gewinnt, nur die zweite Dulle schlägt die erste', () => {
  assert.equal(trickWinner(play(['a', 'Ac0'], ['b', 'Ac1'], ['c', '9c0'], ['d', 'Kc0']), normal), 'a');
  assert.equal(trickWinner(play(['a', 'Qc0'], ['b', 'Qc1'], ['c', '9c0'], ['d', 'Kc0']), normal), 'a');
  assert.equal(trickWinner(play(['a', 'Th0'], ['b', 'Th1'], ['c', 'Qc0'], ['d', 'Kc0']), normal), 'b');
  assert.equal(trickWinner(play(['a', 'Ac0'], ['b', '9d0'], ['c', 'Kc0'], ['d', 'Tc0']), normal), 'b'); // kleinster Trumpf sticht Fehl
});

test('Doppelkopf: Farbzwang für Trumpf und Fehlfarbe', () => {
  assert.deepEqual(legalCards(['Tc0', 'Qc0', 'Ah0'], play(['a', 'Kc0']), normal), ['Tc0']);
  assert.deepEqual(legalCards(['Tc0', 'Qc0', 'Ah0'], play(['a', 'Jd0']), normal), ['Qc0']); // Trumpf angespielt: Dame bedient
  assert.deepEqual(legalCards(['Tc0', 'Ah0'], play(['a', 'Qd0']), normal), ['Tc0', 'Ah0']); // kein Trumpf: frei
  assert.deepEqual(legalCards(['Th0', 'Ah0', 'Kh0'], play(['a', '9h0']), normal), ['Ah0', 'Kh0']); // Herz-Zehn ist Trumpf, nicht Herz
});

test('Doppelkopf: Solos ändern die Trumpfliste', () => {
  assert.deepEqual(trumpList({ kind: 'solo', solo: 'queens' }), ['Qc', 'Qs', 'Qh', 'Qd']);
  assert.deepEqual(trumpList({ kind: 'solo', solo: 'jacks' }), ['Jc', 'Js', 'Jh', 'Jd']);
  assert.deepEqual(trumpList({ kind: 'solo', solo: 'plain' }), []);
  assert.deepEqual(trumpList({ kind: 'solo', solo: 'c' }), ['Th', 'Qc', 'Qs', 'Qh', 'Qd', 'Jc', 'Js', 'Jh', 'Jd', 'Ac', 'Tc', 'Kc', '9c']);
  assert.deepEqual(trumpList({ kind: 'solo', solo: 'h' }).slice(-3), ['Ah', 'Kh', '9h']);
  const queens = { kind: 'solo', solo: 'queens' };
  assert.ok(!isTrump('Th0', queens) && !isTrump('Jc0', queens));
  assert.equal(trickWinner(play(['a', 'Kd0'], ['b', 'Jd0'], ['c', 'Td0'], ['d', 'Ad0']), queens), 'd'); // Karo-Ass ist nur Fehlfarbe
  assert.equal(trickWinner(play(['a', 'Jd0'], ['b', 'Qd0'], ['c', 'Ad0'], ['d', 'Th0']), queens), 'b');
  const fleisch = { kind: 'solo', solo: 'plain' };
  assert.equal(trickWinner(play(['a', 'Kc0'], ['b', 'Qc0'], ['c', 'Jc0'], ['d', 'Tc0']), fleisch), 'd'); // Zehn über König
  assert.equal(trickWinner(play(['a', '9h0'], ['b', 'Th0'], ['c', 'Jh0'], ['d', 'Kh0']), fleisch), 'b'); // Dulle zählt nicht als Trumpf
  assert.throws(() => normalizeContract({ kind: 'solo', solo: 'x' }));
  assert.throws(() => normalizeContract({ kind: 'hacker' }));
});

test('Doppelkopf: Schweinchen sind höchster Trumpf', () => {
  const pigs = { kind: 'normal', schweine: true };
  assert.equal(trumpList(pigs)[0], 'Ad');
  assert.ok(beats('Ad0', 'Th0', pigs) && !beats('Th0', 'Ad0', pigs));
  assert.equal(trickWinner(play(['a', 'Th0'], ['b', 'Ad0'], ['c', 'Ad1'], ['d', 'Qc0']), pigs), 'b');
});

test('Doppelkopf: Ansagefristen – Re/Kontra vor der zweiten Karte, jede weitere Ansage eine Karte früher', () => {
  assert.deepEqual([1, 2, 3, 4, 5].map((l) => announceDeadline(12, l)), [11, 10, 9, 8, 7]);
  assert.deepEqual([1, 5].map((l) => announceDeadline(10, l)), [9, 5]);
});

const deal = (over = {}) => ({
  contract: normal, re: ['a', 'b'], kontra: ['c', 'd'], points: { re: 130, kontra: 110 }, tricks: { re: 7, kontra: 5 }, levels: { re: 0, kontra: 0 }, specials: { re: 0, kontra: 0 }, ...over,
});

test('Doppelkopf: Normalspiel – Re mit 121 gewinnt, Kontra mit 120 gegen die Alten', () => {
  let r = scoreDeal(deal({ points: { re: 121, kontra: 119 } }));
  assert.equal(r.winner, 're'); assert.equal(r.gamePoints, 1); assert.deepEqual(r.per, { a: 1, b: 1, c: -1, d: -1 });
  r = scoreDeal(deal({ points: { re: 120, kontra: 120 } }));
  assert.equal(r.winner, 'kontra'); assert.equal(r.gamePoints, 2); assert.deepEqual(r.per, { a: -2, b: -2, c: 2, d: 2 });
});

test('Doppelkopf: keine 90 / 60 / 30 / schwarz gespielt zählen je einen Punkt', () => {
  assert.equal(scoreDeal(deal({ points: { re: 160, kontra: 80 } })).gamePoints, 2); // Sieg + keine 90
  assert.equal(scoreDeal(deal({ points: { re: 190, kontra: 50 } })).gamePoints, 3);
  assert.equal(scoreDeal(deal({ points: { re: 220, kontra: 20 } })).gamePoints, 4);
  assert.equal(scoreDeal(deal({ points: { re: 240, kontra: 0 }, tricks: { re: 12, kontra: 0 } })).gamePoints, 5);
});

test('Doppelkopf: Ansagen Re/Kontra bringen je zwei Punkte, Absagen je einen; verfehlte Ansage verliert', () => {
  let r = scoreDeal(deal({ levels: { re: 1, kontra: 0 }, points: { re: 130, kontra: 110 } }));
  assert.equal(r.winner, 're'); assert.equal(r.gamePoints, 3);
  r = scoreDeal(deal({ levels: { re: 1, kontra: 1 }, points: { re: 130, kontra: 110 } }));
  assert.equal(r.gamePoints, 5);
  r = scoreDeal(deal({ levels: { re: 1, kontra: 0 }, points: { re: 110, kontra: 130 } }));
  assert.equal(r.winner, 'kontra'); assert.equal(r.gamePoints, 1 + 1 + 2);
  // Re sagt „keine 90“ an und holt nur 140 (Kontra 100): verfehlt – Kontra gewinnt
  r = scoreDeal(deal({ levels: { re: 2, kontra: 0 }, points: { re: 140, kontra: 100 } }));
  assert.equal(r.winner, 'kontra');
  r = scoreDeal(deal({ levels: { re: 2, kontra: 0 }, points: { re: 160, kontra: 80 } }));
  assert.equal(r.winner, 're'); assert.equal(r.gamePoints, 1 + 2 + 1 + 1); // Sieg, Re, keine 90 angesagt, keine 90 gespielt
  // beide verfehlen ihre Absage: unentschieden
  r = scoreDeal(deal({ levels: { re: 2, kontra: 2 }, points: { re: 120, kontra: 120 } }));
  assert.equal(r.winner, null); assert.equal(r.value, 0);
  // schwarz angesagt: nur gültig, wenn der Gegner keinen Stich macht
  r = scoreDeal(deal({ levels: { re: 5, kontra: 0 }, points: { re: 230, kontra: 10 }, tricks: { re: 11, kontra: 1 } }));
  assert.equal(r.winner, 'kontra');
});

test('Doppelkopf: Solo zählt dreifach für den Solisten, Hochzeit ohne Partner ebenso', () => {
  const solo = scoreDeal(deal({ contract: { kind: 'solo', solo: 'queens' }, re: ['a'], kontra: ['b', 'c', 'd'], points: { re: 130, kontra: 110 } }));
  assert.deepEqual(solo.per, { a: 3, b: -1, c: -1, d: -1 }); assert.equal(solo.solo, true);
  const soloLost = scoreDeal(deal({ contract: { kind: 'solo', solo: 'plain' }, re: ['a'], kontra: ['b', 'c', 'd'], points: { re: 100, kontra: 140 } }));
  assert.deepEqual(soloLost.per, { a: -3, b: 1, c: 1, d: 1 }); // kein „gegen die Alten“ im Solo
  const lone = scoreDeal(deal({ contract: { kind: 'hochzeit' }, re: ['a'], kontra: ['b', 'c', 'd'], points: { re: 130, kontra: 110 } }));
  assert.equal(lone.per.a, 3);
  const wedding = scoreDeal(deal({ contract: { kind: 'hochzeit' }, points: { re: 130, kontra: 110 } }));
  assert.deepEqual(wedding.per, { a: 1, b: 1, c: -1, d: -1 });
});

test('Doppelkopf: Sonderpunkte Fuchs, Doppelkopf und Karlchen zählen für die Partei', () => {
  const party = (id) => ({ a: 're', b: 're', c: 'kontra', d: 'kontra' })[id];
  const tricks = [
    { plays: play(['a', 'Ad0'], ['c', 'Kc0'], ['b', '9c0'], ['d', 'Qd0']), winner: 'd', points: 18 }, // Kontra fängt Fuchs von Re
    { plays: play(['a', 'Ac0'], ['c', 'Tc0'], ['b', 'Kc1'], ['d', 'Ac1']), winner: 'a', points: 0 + 11 + 10 + 4 + 11 }, // 36
    { plays: play(['c', 'Th0'], ['a', 'Qc0'], ['b', 'Qs0'], ['d', 'Ah1']), winner: 'c', points: 10 + 3 + 3 + 11 }, // Re fängt keinen: Kontra gewinnt mit Dulle
    { plays: play(['a', 'Tc1'], ['c', 'Td0'], ['b', 'Ac0'], ['d', 'Ah0']), winner: 'c', points: 10 + 10 + 11 + 11 },
    { plays: play(['c', 'Kd0'], ['a', 'Jc0'], ['b', 'Js0'], ['d', '9d0']), winner: 'a', points: 4 + 2 + 2 },
  ];
  // Doppelkopf: ein Stich mit 40+ Augen
  tricks.splice(3, 0, { plays: play(['a', 'Ah1'], ['c', 'Th1'], ['b', 'Tc0'], ['d', 'Qh0']), winner: 'c', points: 11 + 10 + 10 + 3 + 6 });
  tricks[3].points = 42;
  tricks.splice(4, 0, { plays: play(['d', 'Ad1'], ['a', 'Qs1'], ['b', '9d0'], ['c', 'Kh0']), winner: 'a', points: 11 + 3 + 4 }); // Re fängt das Fuchs von Kontra
  const s = specialPoints(tricks, party, normal);
  assert.deepEqual(s.list.filter((x) => x.text === 'Fuchs gefangen').map((x) => x.party).sort(), ['kontra', 're']);
  assert.equal(s.list.some((x) => x.text === 'Doppelkopf' && x.party === 'kontra'), true);
  assert.equal(s.list.some((x) => x.text === 'Karlchen' && x.party === 're'), true);
  const pigs = specialPoints(tricks, party, { kind: 'normal', schweine: true });
  assert.equal(pigs.list.some((x) => x.text === 'Fuchs gefangen'), false); // bei Schweinchen keine Füchse
  const noKarlchen = specialPoints(tricks, party, { kind: 'solo', solo: 'queens' });
  assert.equal(noKarlchen.list.some((x) => x.text === 'Karlchen'), false);
});

test('Doppelkopf: Sonderpunkte fließen als Differenz in den Spielwert ein', () => {
  const r = scoreDeal(deal({ specials: { re: 1, kontra: 2 } }));
  assert.equal(r.value, 1 + 1 - 2); assert.deepEqual(r.per, { a: 0, b: 0, c: 0, d: 0 });
});

// ---------- Raum ----------
function room(settings = {}) {
  const r = new Room('DK001', { turnTime: 0, ...settings }, () => {});
  r.game = 'doppelkopf';
  const ids = Array.from({ length: 4 }, (_, i) => { const p = r.addPlayer('P' + i, null); r.sit(p.id); return p.id; });
  return { r, ids };
}
const d = (r) => ({ key: r.dealKey, revision: r.revision });
// Hand 0: beide Kreuz-Damen, Hand 1–3 beliebig
function deckWith(first) {
  const rest = dkDeck(true).filter((c) => !first.includes(c));
  return [...first, ...rest];
}
const HAND_WEDDING = ['Qc0', 'Qc1', 'Qs0', 'Th0', 'Ad0', 'Ac0', 'Ac1', 'Tc0', 'Kc0', '9c0', 'Ks0', '9s0'];

test('Doppelkopf: Raum – gesund-Parteien, Re sind die Kreuz-Damen-Halter, Vorbehalte reihum', () => {
  const { r, ids } = room();
  r.deckFactory = () => dkDeck(true); // Karten der Reihe nach
  r.start(ids[0]);
  assert.equal(r.stage, 'reserve'); assert.equal(r.currentId, ids[0]);
  assert.throws(() => r.reserve(ids[1], { ...d(r), choice: 'healthy' }), /nicht dran/);
  assert.throws(() => r.reserve(ids[0], { ...d(r), choice: 'hochzeit' }), /beide Kreuz-Damen/);
  for (const id of ids) r.reserve(id, { ...d(r), choice: 'healthy' });
  assert.equal(r.stage, 'play'); assert.equal(r.contract.kind, 'normal');
  const re = ids.filter((id) => r.hands[id].some((c) => base(c) === 'Qc'));
  assert.deepEqual(ids.filter((id) => r.partyMap[id] === 're'), re);
  assert.equal(r.currentId, ids[0]);
  assert.ok(r.hands[ids[0]].length === 12);
});

test('Doppelkopf: Raum – Solo setzt den Solisten als Re, überstimmt Hochzeit und führt aus', () => {
  const { r, ids } = room();
  r.deckFactory = () => deckWith(HAND_WEDDING);
  r.start(ids[0]);
  r.reserve(ids[0], { ...d(r), choice: 'hochzeit' });
  r.reserve(ids[1], { ...d(r), choice: 'jacks' });
  assert.equal(r.stage, 'play'); assert.equal(r.contract.kind, 'solo'); assert.equal(r.contract.solo, 'jacks');
  assert.deepEqual(ids.map((id) => r.partyMap[id]), ['kontra', 're', 'kontra', 'kontra']);
  assert.equal(r.currentId, ids[1]); // Solist spielt aus
  assert.equal(r.gameView(ids[2]).soloist, ids[1]);
});

test('Doppelkopf: Raum – Hochzeit findet den Partner im ersten fremden Stich', () => {
  const { r, ids } = room();
  r.deckFactory = () => deckWith(HAND_WEDDING);
  r.start(ids[0]);
  r.reserve(ids[0], { ...d(r), choice: 'hochzeit' });
  for (const id of ids.slice(1)) r.reserve(id, { ...d(r), choice: 'healthy' });
  assert.equal(r.contract.kind, 'hochzeit'); assert.equal(r.hochzeit, ids[0]);
  assert.equal(r.partyMap[ids[0]], 're'); assert.equal(r.partyMap[ids[1]], undefined);
  assert.equal(r.gameView(ids[1]).myParty, null);
  // Hochzeiter spielt Dame aus; jemand anderes sticht mit Dulle
  r.play(ids[0], { ...d(r), card: 'Qs0' });
  let guard = 0;
  while (r.trick.length && guard++ < 5) { const id = r.currentId; const card = r.allowed(id)[0]; r.play(id, { ...d(r), card }); }
  const winner = r.lastTrick.winner;
  if (winner !== ids[0]) { assert.equal(r.partner, winner); assert.equal(r.partyMap[winner], 're'); assert.ok(ids.every((id) => r.partyMap[id])); }
  else assert.equal(r.partner, null);
});

test('Doppelkopf: Raum – Hochzeit ohne Partner nach drei Stichen wird zum Solo', () => {
  const { r, ids } = room();
  // Der Hochzeiter hält beide Dullen und beide Kreuz-Damen und gewinnt mit ihnen die ersten drei Stiche
  const first = ['Qc0', 'Qc1', 'Th0', 'Th1', 'Qs0', 'Ac0', 'Ac1', 'Tc0', 'Kc0', '9c0', 'Ks0', '9s0'];
  r.deckFactory = () => deckWith(first);
  r.start(ids[0]);
  r.reserve(ids[0], { ...d(r), choice: 'hochzeit' });
  for (const id of ids.slice(1)) r.reserve(id, { ...d(r), choice: 'healthy' });
  assert.equal(r.partyMap[ids[1]], undefined);
  for (const lead of ['Qc0', 'Qc1', 'Th0']) {
    r.play(ids[0], { ...d(r), card: lead });
    for (let k = 0; k < 3; k++) { const id = r.currentId; r.play(id, { ...d(r), card: r.allowed(id)[0] }); }
    assert.equal(r.lastTrick.winner, ids[0]);
  }
  assert.equal(r.tricksLog.length, 3); assert.equal(r.partner, null);
  assert.deepEqual(ids.map((id) => r.partyMap[id]), ['re', 'kontra', 'kontra', 'kontra']);
  assert.ok(r.log.some((l) => /keinen Partner/.test(l.text)));
  // Wertung als Solo (dreifach für den Hochzeiter)
  assert.equal(scoreDeal(deal({ contract: r.contract, re: [ids[0]], kontra: ids.slice(1), points: { re: 130, kontra: 110 } })).per[ids[0]], 3);
});

test('Doppelkopf: Raum – Ansagen nur im eigenen Zug, nur für die eigene Partei und innerhalb der Frist', () => {
  const { r, ids } = room();
  r.deckFactory = () => deckWith(HAND_WEDDING.map((c) => c)); // ids[0] hat beide Kreuz-Damen
  r.start(ids[0]);
  for (const id of ids) r.reserve(id, { ...d(r), choice: 'healthy' });
  assert.equal(r.partyMap[ids[0]], 're');
  assert.equal(r.gameView(ids[0]).canAnnounce, 1);
  assert.equal(r.gameView(ids[1]).canAnnounce, 0); // nicht dran
  assert.throws(() => r.announce(ids[1], { ...d(r), level: 1 }), /nicht dran/);
  assert.throws(() => r.announce(ids[0], { ...d(r), level: 2 }), /nicht möglich/); // erst Re
  r.announce(ids[0], { ...d(r), level: 1 });
  assert.equal(r.levels.re, 1); assert.deepEqual(r.knownParties()[ids[0]], 're');
  assert.equal(r.gameView(ids[0]).canAnnounce, 2);
  r.announce(ids[0], { ...d(r), level: 2 });
  assert.equal(r.levels.re, 2);
  assert.throws(() => r.announce(ids[0], { ...d(r), level: 2 }), /nicht möglich/);
  // Frist: nach vier gespielten Karten sind keine Absagen mehr möglich
  r.hands[ids[0]].length = 6;
  assert.equal(r.nextAnnounce(ids[0]), 0);
});

test('Doppelkopf: Raum – ganzes Spiel mit Sonderpunkten und Abrechnung, Summe der Punkte ist null', () => {
  const { r, ids } = room({ deals: 4 });
  r.deckFactory = () => shuffle(dkDeck(true), (n) => Math.floor(seededRandom(77)() * n));
  r.start(ids[0]);
  for (const id of r.pos) r.reserve(id, { ...d(r), choice: 'healthy' });
  let n = 0;
  while (r.stage === 'play' && n++ < 60) { const id = r.currentId; r.play(id, { ...d(r), card: r.allowed(id)[0] }); }
  assert.equal(r.stage, 'deal-over');
  assert.equal(Object.values(r.taken).flat().length, 48);
  assert.equal(r.lastDeal.points.re + r.lastDeal.points.kontra, 240);
  assert.equal(Object.values(r.lastDeal.per).reduce((a, b) => a + b, 0), 0);
  assert.equal(Object.values(r.totals).reduce((a, b) => a + b, 0), 0);
});

test('Doppelkopf: Raum – Variante ohne Neunen gibt zehn Karten, Schweinchen wird erkannt', () => {
  const { r, ids } = room({ nines: false, schweine: true });
  r.deckFactory = (nines) => deckWith(['Ad0', 'Ad1', 'Qc0', 'Th0', 'Tc0', 'Kc0', 'Ks0', 'Tc1', 'Kc1', 'As0']).filter((c) => !nines === false || c[0] !== '9');
  r.start(ids[0]);
  assert.equal(r.hands[ids[0]].length, 10); assert.equal(r.N, 10);
  assert.ok(r.pos.every((id) => r.hands[id].every((c) => c[0] !== '9')));
  for (const id of ids) r.reserve(id, { ...d(r), choice: 'healthy' });
  assert.equal(r.schweineHolder, ids[0]); assert.equal(r.contract.schweine, true);
  assert.equal(r.gameView(ids[2]).schweine, ids[0]);
});

test('Doppelkopf: Zuschauer und Mitspieler sehen weder fremde Hände noch fremde Parteien', () => {
  const { r, ids } = room();
  r.deckFactory = () => deckWith(HAND_WEDDING);
  r.start(ids[0]);
  const spectator = r.addPlayer('Zuschauer', null);
  const others = r.hands[ids[1]].slice();
  const json = JSON.stringify(r.view(ids[0])), watch = JSON.stringify(r.view(spectator.id));
  for (const c of others) { assert.ok(!json.includes(`"${c}"`)); assert.ok(!watch.includes(`"${c}"`)); }
  assert.equal(r.view(spectator.id).g.hand, null); assert.equal(r.view(spectator.id).g.myParty, null);
  for (const id of ids) r.reserve(id, { ...d(r), choice: 'healthy' });
  assert.deepEqual(r.knownParties(), {}); // niemand hat angesagt oder eine Dame gespielt
  assert.equal(r.view(ids[2]).players.every((p) => p.party === null), true);
});

test('Doppelkopf: Bot-Beobachtung leakt keine fremden Karten', () => {
  const { r, ids } = room();
  r.deckFactory = () => deckWith(HAND_WEDDING);
  r.start(ids[0]);
  const o = botObservation(r, ids[2]);
  r.hands[ids[0]].reverse(); r.hands[ids[1]].reverse(); r.hands[ids[3]].reverse();
  assert.deepEqual(botObservation(r, ids[2]), o);
  for (const level of ['easy', 'medium', 'hard']) assert.deepEqual(chooseBotAction(o, level, { rng: seededRandom(3) }).action, chooseBotAction(botObservation(r, ids[2]), level, { rng: seededRandom(3) }).action);
  applyBotAction(r, ids[0], chooseBotAction(botObservation(r, ids[0]), 'hard', { budgetMs: 0 }).action);
});

function botSeries(levels, seed, settings = {}) {
  const rng = seededRandom(seed), integer = (n) => Math.floor(rng() * n);
  const r = new Room('BOTS', { turnTime: 0, ...settings }, () => {});
  r.game = 'doppelkopf';
  const host = r.addPlayer('Host', null); host.connected = true;
  const bots = levels.map((l) => addBot(r, host.id, l));
  r.deckFactory = (nines) => shuffle(dkDeck(nines), integer);
  r.start(host.id);
  let n = 0;
  while (r.phase === 'playing' && n++ < 30000) {
    if (r.stage === 'deal-over') { r.nextDeal(host.id); continue; }
    const id = nextBot(r); assert.ok(id, 'ein Bot muss dran sein');
    stepBot(r, id, { rng });
  }
  return { r, bots };
}

test('Doppelkopf: kompletter Bot-Durchlauf mit allen Stufen, Neunen und Schweinchen', () => {
  for (const settings of [{ deals: 8 }, { deals: 8, nines: false, schweine: true }]) {
    const { r, bots } = botSeries(['easy', 'medium', 'hard', 'hard'], 5, settings);
    assert.equal(r.phase, 'over'); assert.equal(r.stage, 'match-over'); assert.equal(r.dealNo, 8);
    assert.equal(Object.values(r.totals).reduce((a, b) => a + b, 0), 0);
    for (const b of bots) assert.equal(r.scores[b.id], r.totals[b.id]);
  }
});

test('Doppelkopf: schwere Bots schlagen leichte Bots über viele Serien', () => {
  let hard = 0, easy = 0;
  for (let i = 0; i < 20; i++) {
    const levels = i % 2 ? ['easy', 'hard', 'easy', 'hard'] : ['hard', 'easy', 'hard', 'easy'];
    const { r, bots } = botSeries(levels, 900 + i, { deals: 12 });
    for (const b of bots) if (b.botDifficulty === 'hard') hard += r.scores[b.id]; else easy += r.scores[b.id];
  }
  assert.ok(hard > easy, `${hard} vs ${easy}`);
});

test('Doppelkopf: Zeitüberschreitung entscheidet legal, Aussteigen bricht ab', () => {
  const { r, ids } = room({ turnTime: 5 });
  r.start(ids[0]);
  const before = r.revision;
  r.onTimeout(r.currentId);
  assert.ok(r.revision > before);
  const action = decide(r.gameView(ids[1]), ids[1], 'hard', () => 0.5);
  assert.ok(['reserve', 'announce', 'play'].includes(action.method));
  r.stand(ids[3]);
  assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, []);
});
