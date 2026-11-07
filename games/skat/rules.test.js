import test from 'node:test';
import assert from 'node:assert/strict';
import './index.js'; // registriert den Bot-Zug
import { Room } from './room.js';
import { decide } from './bot.js';
import {
  BIDS, skatDeck, sumPoints, legalCards, trickWinner, normalizeGame, evaluateGame, scoreGame, scoreRamsch, triggersBock, spitzen, minimumValue,
} from './rules.js';
import { botObservation, applyBotAction } from '../../server/bot-observation.js';
import { chooseBotAction, seededRandom } from '../bot-strategies/index.js';
import { stepBot } from '../../server/bot-play.js';
import { addBot, nextBot } from '../../server/bots.js';
import { shuffle } from '../poker/engine/cards.js';

const club = { type: 'suit', suit: 'c', hand: false, ouvert: false, schneider: false, schwarz: false };

test('Skat: Reizwerte entsprechen der Reizreihe nach Skatordnung', () => {
  assert.deepEqual(BIDS.slice(0, 22), [18, 20, 22, 23, 24, 27, 30, 33, 35, 36, 40, 44, 45, 46, 48, 50, 54, 55, 59, 60, 63, 66]);
  assert.equal(BIDS.at(-1) <= 264, true);
  assert.equal(new Set(BIDS).size, BIDS.length);
});

test('Skat: Blatt hat 32 Karten, Augen summieren sich auf 120', () => {
  const deck = skatDeck();
  assert.equal(deck.length, 32); assert.equal(new Set(deck).size, 32);
  assert.equal(sumPoints(deck), 120);
});

test('Skat: Spitzen mit/ohne, auch durch die Trumpffarbe', () => {
  assert.deepEqual(spitzen(['Jc', 'Js', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', 'Ah', '7d', 'Th', 'Kd'], club), { count: 2, mit: true });
  assert.deepEqual(spitzen(['Jh', 'Jd', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', 'Ah', '7d', 'Th', 'Kd'], club), { count: 2, mit: false });
  assert.deepEqual(spitzen(['Jc', 'Js', 'Jh', 'Jd', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', '7c', 'Ah'], club), { count: 11, mit: true });
  assert.deepEqual(spitzen(['Jc', 'Js', 'Jh', 'Jd', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', '7c', 'Ah'], { type: 'grand' }), { count: 4, mit: true });
  assert.deepEqual(spitzen(['Jc', 'Jh', 'Ac', 'Kd', 'Ad', 'Ah', 'Ts', '7s', '8h', '9h'], { type: 'grand' }), { count: 1, mit: true });
  assert.deepEqual(spitzen(['Js', 'Jh', 'Ac', 'Kd', 'Ad', 'Ah', 'Ts', '7s', '8h', '9h'], { type: 'grand' }), { count: 1, mit: false });
});

test('Skat: Spielwert Farbspiel – Mit 2 Hand Kreuz gewonnen = 12 × 4 = 48', () => {
  const g = normalizeGame({ type: 'suit', suit: 'c' }, { hand: true });
  const cards = ['Jc', 'Js', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', 'Ah', '7d'];
  const e = evaluateGame(g, { cards, points: 75, tricks: 6, bid: 36 });
  assert.equal(e.won, true); assert.equal(e.levels, 4); assert.equal(e.value, 48);
  assert.deepEqual(scoreGame(['a', 'b', 'c'], 'a', e), { a: 98, b: 0, c: 0 });
});

test('Skat: Schneider und Schwarz erhöhen den Wert, verlorener Schneider auch', () => {
  const cards = ['Jh', 'Jd', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', 'Ah', '7d'];
  const hearts = { ...club, suit: 'h' };
  // Ohne 1 (Kreuz-Bube fehlt): Spiel 1 + ohne 2... Jc,Js fehlen -> ohne 2
  assert.equal(spitzen(cards, hearts).count, 2);
  const normal = evaluateGame(hearts, { cards, points: 70, tricks: 6, bid: 18 });
  assert.equal(normal.value, 10 * 3);
  const schneider = evaluateGame(hearts, { cards, points: 91, tricks: 8, bid: 18 });
  assert.equal(schneider.value, 10 * 4); assert.equal(schneider.schneider, true);
  const schwarz = evaluateGame(hearts, { cards, points: 120, tricks: 10, bid: 18 });
  assert.equal(schwarz.value, 10 * 5);
  const lostSchneider = evaluateGame(hearts, { cards, points: 25, tricks: 2, bid: 18 });
  assert.equal(lostSchneider.won, false); assert.equal(lostSchneider.value, 10 * 4);
  const lostSchwarz = evaluateGame(hearts, { cards, points: 12, tricks: 0, bid: 18 });
  assert.equal(lostSchwarz.value, 10 * 5);
});

test('Skat: Handspiel mit angesagtem Schneider verliert bei 80 Augen', () => {
  const cards = ['Jc', 'Js', 'Jh', 'Jd', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c'];
  const g = normalizeGame({ type: 'grand', schneider: true }, { hand: true });
  const miss = evaluateGame(g, { cards, points: 80, tricks: 7, bid: 18 });
  assert.equal(miss.won, false); // 61 reicht nicht, wenn Schneider angesagt war
  const ok = evaluateGame(g, { cards, points: 95, tricks: 8, bid: 18 });
  assert.equal(ok.won, true);
  assert.equal(ok.levels, 1 + 4 + 1 + 1 + 1); // Spiel + mit 4 + Hand + Schneider angesagt + Schneider
  assert.equal(ok.value, 24 * 8);
});

test('Skat: Ouvert gilt als Schwarz angesagt und braucht alle Stiche', () => {
  const cards = ['Jc', 'Js', 'Jh', 'Jd', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c'];
  const g = normalizeGame({ type: 'grand', ouvert: true }, { hand: true });
  assert.equal(g.schneider && g.schwarz, true);
  const lost = evaluateGame(g, { cards, points: 110, tricks: 9, bid: 18 });
  assert.equal(lost.won, false);
  const won = evaluateGame(g, { cards, points: 120, tricks: 10, bid: 18 });
  assert.equal(won.won, true);
  assert.equal(won.levels, 1 + 4 + 1 + 1 + 1 + 1 + 1 + 1); // Spiel, Spitzen, Hand, Ouvert, Schneider+Schwarz angesagt, Schneider+Schwarz gespielt
  assert.throws(() => normalizeGame({ type: 'grand', ouvert: true }, { hand: false }), /Handspiel/);
  assert.throws(() => normalizeGame({ type: 'suit', suit: 'c', schneider: true }, { hand: false }), /Handspiel/);
  assert.throws(() => normalizeGame({ type: 'suit', suit: 'x' }, { hand: true }));
  assert.throws(() => normalizeGame({ type: 'wild' }, { hand: true }));
});

test('Skat: Verlustspiel zieht doppelten Wert und 50 ab, Gegner erhalten je 30', () => {
  const cards = ['Jc', 'Js', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', 'Ah', '7d'];
  const e = evaluateGame(club, { cards, points: 55, tricks: 5, bid: 18 });
  assert.equal(e.won, false); assert.equal(e.value, 12 * 3);
  assert.deepEqual(scoreGame(['a', 'b', 'c'], 'a', e), { a: -(72 + 50), b: 30, c: 30 });
  assert.deepEqual(scoreGame(['a', 'b', 'c'], 'a', e, true), { a: -(72 + 50) * 2, b: 60, c: 60 });
});

test('Skat: Überreizen verliert und rechnet mit dem nächsten Vielfachen', () => {
  const cards = ['Jh', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', 'Ah', '7d', 'Kd'];
  const hearts = { ...club, suit: 'h' };
  const e = evaluateGame(hearts, { cards, points: 100, tricks: 8, bid: 60 });
  assert.equal(e.overbid, true); assert.equal(e.won, false); assert.equal(e.value, 60);
});

test('Skat: Nullspiele 23 / 35 / 46 / 59 und Verlust bei einem Stich', () => {
  const kinds = [[{ type: 'null' }, false, 23], [{ type: 'null' }, true, 35], [{ type: 'null', ouvert: true }, false, 46], [{ type: 'null', ouvert: true }, true, 59]];
  for (const [input, hand, value] of kinds) {
    const g = normalizeGame(input, { hand });
    assert.equal(evaluateGame(g, { cards: [], points: 0, tricks: 0, bid: 18 }).value, value);
    assert.equal(minimumValue(g, []), value);
    const lost = evaluateGame(g, { cards: [], points: 0, tricks: 1, bid: 18 });
    assert.equal(lost.won, false);
    assert.deepEqual(scoreGame(['a', 'b', 'c'], 'a', lost), { a: -(2 * value + 50), b: 30, c: 30 });
  }
  assert.equal(evaluateGame(normalizeGame({ type: 'null' }, { hand: false }), { cards: [], points: 0, tricks: 0, bid: 24 }).overbid, true);
});

test('Skat: Stichregeln – Buben sind Trumpf, Null hat eigene Reihenfolge', () => {
  const hearts = { ...club, suit: 'h' };
  // Herz-Bube ist Trumpf und darf bei Kreuz nicht als Kreuz bedient werden
  assert.deepEqual(legalCards(['Jh', '7c', 'As'], [{ id: 'a', card: 'Ac' }], hearts), ['7c']);
  assert.deepEqual(legalCards(['Jh', '7h', 'As'], [{ id: 'a', card: 'Jc' }], hearts), ['Jh', '7h']);
  assert.equal(trickWinner([{ id: 'a', card: 'Ac' }, { id: 'b', card: '7h' }, { id: 'c', card: 'Tc' }], hearts), 'b');
  assert.equal(trickWinner([{ id: 'a', card: 'Jd' }, { id: 'b', card: 'Ah' }, { id: 'c', card: 'Js' }], hearts), 'c');
  const grand = { type: 'grand' };
  assert.equal(trickWinner([{ id: 'a', card: 'Ah' }, { id: 'b', card: 'Jd' }, { id: 'c', card: 'Th' }], grand), 'b');
  assert.equal(trickWinner([{ id: 'a', card: 'Th' }, { id: 'b', card: 'Kh' }, { id: 'c', card: 'Ah' }], grand), 'c'); // Zehn liegt unter König
  assert.equal(trickWinner([{ id: 'a', card: 'Th' }, { id: 'b', card: 'Kh' }, { id: 'c', card: 'Qh' }], grand), 'a');
  const nul = { type: 'null' };
  assert.equal(trickWinner([{ id: 'a', card: 'Th' }, { id: 'b', card: 'Jh' }, { id: 'c', card: 'Qh' }], nul), 'c'); // Null: A K D B 10
  assert.equal(trickWinner([{ id: 'a', card: 'Th' }, { id: 'b', card: 'Jh' }, { id: 'c', card: '9h' }], nul), 'b');
});

test('Skat: Ramsch – Verlierer zählt Minus, Skat zum letzten Stich, Durchmarsch +120, Gleichstand beide', () => {
  const ids = ['a', 'b', 'c'];
  const taken = { a: ['Ah', 'Th', 'Kh'], b: ['Qh', 'Jh'], c: ['9h'] }; // 25, 5, 0
  const r = scoreRamsch(ids, taken, { a: 3, b: 2, c: 1 }, ['Ac', 'Tc'], 'c');
  assert.deepEqual(r.points, { a: -25, b: 0, c: 0 }); // Skat 21 gehört c: c hat 21, a 25
  assert.deepEqual(r.losers, ['a']);
  const tie = scoreRamsch(ids, { a: ['Ah', 'Kh'], b: ['Ad', 'Kd'], c: ['9h'] }, { a: 2, b: 2, c: 1 }, ['7c', '8c'], 'c');
  assert.deepEqual(tie.losers.sort(), ['a', 'b']);
  const march = scoreRamsch(ids, { a: skatDeck().slice(0, 30), b: [], c: [] }, { a: 10, b: 0, c: 0 }, ['7c', '8c'], 'a');
  assert.equal(march.points.a, 120); assert.equal(march.march, 'a');
  assert.equal(scoreRamsch(ids, taken, { a: 3, b: 2, c: 1 }, ['Ac', 'Tc'], 'c', true).points.a, -50);
});

test('Skat: Bockrunde wird durch verlorenes Spiel oder 60:60 ausgelöst', () => {
  assert.equal(triggersBock(club, { won: false }, 40), true);
  assert.equal(triggersBock(club, { won: true }, 60), true);
  assert.equal(triggersBock(club, { won: true }, 75), false);
  assert.equal(triggersBock({ type: 'ramsch' }, { won: false }, 0), false);
});

// ---------- Raum ----------
function room(settings = {}, count = 3) {
  const r = new Room('SKAT1', { turnTime: 0, ...settings }, () => {});
  r.game = 'skat';
  const ids = Array.from({ length: count }, (_, i) => { const p = r.addPlayer('P' + i, null); r.sit(p.id); return p.id; });
  return { r, ids };
}
const hands = (v, m, h, skat) => [...v, ...m, ...h, ...skat];
const V = ['Jc', 'Js', 'Ac', 'Tc', 'Kc', 'Qc', '9c', '8c', '7c', 'Ah'];
const M = ['Jh', 'Jd', 'As', 'Ts', 'Ks', 'Qs', '9s', '8s', '7s', 'Th'];
const H = ['Ad', 'Td', 'Kd', 'Qd', '9d', '8d', '7d', 'Kh', 'Qh', '9h'];
const SKAT = ['8h', '7h'];
const fixed = hands(V, M, H, SKAT);
const d = (r) => ({ key: r.dealKey, revision: r.revision });

test('Skat: Raum – Reizen reihum, Alleinspieler nimmt Skat, drückt, sagt an und spielt', () => {
  const { r, ids } = room();
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  assert.deepEqual(r.pos, ids); assert.equal(r.currentId, ids[1]);
  assert.throws(() => r.bid(ids[0], { ...d(r), action: 'bid', value: 18 }), /nicht dran/);
  assert.throws(() => r.bid(ids[1], { ...d(r), action: 'bid', value: 19 }), /Gebot/);
  assert.throws(() => r.bid(ids[1], { key: r.dealKey, revision: r.revision - 1, action: 'bid', value: 18 }), /aktuell/);
  r.bid(ids[1], { ...d(r), action: 'bid', value: 18 });
  assert.equal(r.currentId, ids[0]);
  assert.throws(() => r.bid(ids[0], { ...d(r), action: 'bid', value: 20 }), /Halte/);
  r.bid(ids[0], { ...d(r), action: 'hold' });
  r.bid(ids[1], { ...d(r), action: 'bid', value: 20 });
  r.bid(ids[0], { ...d(r), action: 'pass' }); // Mittelhand gewinnt mit 20 gegen Vorhand
  assert.equal(r.bd.round, 2); assert.equal(r.currentId, ids[2]);
  r.bid(ids[2], { ...d(r), action: 'bid', value: 22 });
  assert.equal(r.currentId, ids[1]);
  r.bid(ids[1], { ...d(r), action: 'pass' });
  assert.equal(r.declarer, ids[2]); assert.equal(r.bidValue, 22); assert.equal(r.stage, 'pickup');
  r.pickup(ids[2], { ...d(r), take: true });
  assert.equal(r.hands[ids[2]].length, 12);
  assert.throws(() => r.discard(ids[2], { ...d(r), cards: ['Ad', 'Ad'] }));
  assert.throws(() => r.discard(ids[2], { ...d(r), cards: ['Ad', 'Jc'] }), /eigene/);
  r.discard(ids[2], { ...d(r), cards: ['8h', '7h'] });
  assert.equal(r.hands[ids[2]].length, 10);
  assert.throws(() => r.declare(ids[2], { ...d(r), game: { type: 'suit', suit: 'd', ouvert: true } }), /Handspiel/);
  r.declare(ids[2], { ...d(r), game: { type: 'suit', suit: 'd' } });
  assert.equal(r.stage, 'play'); assert.equal(r.currentId, ids[0]);
  assert.throws(() => r.play(ids[0], { ...d(r), card: 'Kh' }), /erlaubt|Karte/);
  // Gesamtes Spiel zu Ende spielen: immer die erste erlaubte Karte
  let n = 0;
  while (r.stage === 'play' && n++ < 40) { const id = r.currentId; r.play(id, { ...d(r), card: r.allowed(id)[0] }); }
  assert.equal(r.stage, 'deal-over');
  const dealt = r.lastDeal, sum = Object.values(r.taken).flat().length + 2;
  assert.equal(sum, 32);
  const augen = dealt.augen;
  assert.equal(augen, sumPoints(r.taken[ids[2]]) + sumPoints(['8h', '7h']));
  assert.equal(r.totals[ids[2]], dealt.points[ids[2]]);
  assert.equal(Object.values(dealt.points).reduce((a, b) => a + b, 0) === dealt.points[ids[2]] + (dealt.eval.won ? 0 : 60), true);
});

test('Skat: Raum – alle passen: Einwerfen ohne Ramsch, Ramsch mit Ramsch', () => {
  for (const ramsch of [false, true]) {
    const { r, ids } = room({ ramsch });
    r.deckFactory = () => [...fixed];
    r.start(ids[0]);
    r.bid(ids[1], { ...d(r), action: 'pass' });
    r.bid(ids[2], { ...d(r), action: 'pass' });
    assert.equal(r.stage, 'ramschChoice'); assert.equal(r.currentId, ids[0]);
    r.ramschChoice(ids[0], { ...d(r), play: false });
    if (ramsch) {
      assert.equal(r.stage, 'play'); assert.equal(r.contract.type, 'ramsch');
      let n = 0;
      while (r.stage === 'play' && n++ < 40) { const id = r.currentId; r.play(id, { ...d(r), card: r.allowed(id)[0] }); }
      assert.equal(r.lastDeal.ramsch, true);
      assert.equal(Object.values(r.lastDeal.augen).reduce((a, b) => a + b, 0), 120);
    } else {
      assert.equal(r.stage, 'deal-over'); assert.equal(r.lastDeal.thrownIn, true);
      assert.deepEqual(r.totals, Object.fromEntries(ids.map((id) => [id, 0])));
    }
  }
});

test('Skat: Raum – Vorhand kann nach allgemeinem Passen selbst spielen', () => {
  const { r, ids } = room();
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  r.bid(ids[1], { ...d(r), action: 'pass' }); r.bid(ids[2], { ...d(r), action: 'pass' });
  r.ramschChoice(ids[0], { ...d(r), play: true });
  assert.equal(r.declarer, ids[0]); assert.equal(r.bidValue, 18); assert.equal(r.stage, 'pickup');
  r.pickup(ids[0], { ...d(r), take: false });
  assert.equal(r.stage, 'declare'); assert.equal(r.isHand, true);
  r.declare(ids[0], { ...d(r), game: { type: 'grand', schneider: true } });
  assert.equal(r.contract.hand && r.contract.schneider, true);
});

test('Skat: Null endet sofort, wenn der Alleinspieler einen Stich macht', () => {
  const { r, ids } = room();
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  r.bid(ids[1], { ...d(r), action: 'pass' }); r.bid(ids[2], { ...d(r), action: 'pass' });
  r.ramschChoice(ids[0], { ...d(r), play: true }); r.pickup(ids[0], { ...d(r), take: false });
  r.declare(ids[0], { ...d(r), game: { type: 'null', ouvert: true } });
  assert.equal(r.contract.ouvert, true);
  assert.deepEqual(r.gameView(ids[1]).open, r.hands[ids[0]]); // Ouvert: alle sehen die Karten des Alleinspielers
  r.play(ids[0], { ...d(r), card: 'Ac' });
  r.play(ids[1], { ...d(r), card: r.allowed(ids[1])[0] });
  r.play(ids[2], { ...d(r), card: r.allowed(ids[2])[0] });
  assert.equal(r.stage, 'deal-over'); assert.equal(r.lastDeal.eval.won, false);
  assert.equal(r.lastDeal.points[ids[0]], -(2 * 59 + 50)); // Null Ouvert Hand
});

test('Skat: Bockrunden – nach verlorenem Spiel zählen die nächsten drei doppelt, danach wieder normal', () => {
  const { r, ids } = room({ bock: true, deals: 6 });
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  const finish = (loser) => {
    r.bid(ids[1], { ...d(r), action: 'pass' }); r.bid(ids[2], { ...d(r), action: 'pass' });
    r.ramschChoice(ids[0], { ...d(r), play: true }); r.pickup(ids[0], { ...d(r), take: false });
    r.declare(ids[0], { ...d(r), game: { type: 'null' } });
    let n = 0; while (r.stage === 'play' && n++ < 40) { const id = r.currentId; r.play(id, { ...d(r), card: r.allowed(id)[0] }); }
  };
  finish();
  assert.equal(r.lastDeal.eval.won, false); // Vorhand hat Ass etc. – Null geht schief
  assert.equal(r.bockLeft, 3);
  r.nextDeal(ids[0]); assert.equal(r.bockNow, true); assert.equal(r.bockLeft, 2);
  assert.match(r.log.at(-1).text, /Bock/);
});

test('Skat: Serie endet nach der eingestellten Spielzahl und bucht Punkte auf den Abend', () => {
  const { r, ids } = room({ deals: 3 });
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  for (let i = 0; i < 3; i++) {
    r.bid(r.pos[1], { ...d(r), action: 'pass' }); r.bid(r.pos[2], { ...d(r), action: 'pass' });
    r.ramschChoice(r.pos[0], { ...d(r), play: false });
    if (i < 2) r.nextDeal(ids[0]);
  }
  assert.equal(r.phase, 'over'); assert.equal(r.stage, 'match-over'); assert.ok(r.result);
  assert.deepEqual(r.scores, Object.fromEntries(ids.map((id) => [id, 0])));
  assert.deepEqual(r.pos.length, 3);
});

test('Skat: Zuschauer und Gegner sehen weder fremde Hände noch den Skat', () => {
  const { r, ids } = room();
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  const spectator = r.addPlayer('Zuschauer', null);
  const mine = JSON.stringify(r.view(ids[0])), other = JSON.stringify(r.view(ids[1])), watch = JSON.stringify(r.view(spectator.id));
  for (const card of M) assert.ok(!mine.includes(`"${card}"`) && !watch.includes(`"${card}"`));
  for (const card of [...V, ...SKAT]) assert.ok(!other.includes(`"${card}"`) || M.includes(card));
  for (const card of SKAT) assert.ok(!mine.includes(`"${card}"`) && !other.includes(`"${card}"`) && !watch.includes(`"${card}"`));
  assert.equal(r.view(spectator.id).g.hand, null);
});

test('Skat: Bot-Beobachtung enthält keine fremden Karten, Entscheidung bleibt bei Änderung verdeckter Karten gleich', () => {
  const { r, ids } = room();
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  const o = botObservation(r, ids[1]);
  r.hands[ids[0]].reverse(); r.hands[ids[2]].reverse(); r.skat.reverse();
  assert.deepEqual(botObservation(r, ids[1]), o);
  for (const level of ['easy', 'medium', 'hard']) {
    const a = chooseBotAction(o, level, { rng: seededRandom(4) }).action, b = chooseBotAction(botObservation(r, ids[1]), level, { rng: seededRandom(4) }).action;
    assert.deepEqual(a, b);
  }
  const zero = chooseBotAction(o, 'hard', { budgetMs: 0 }).action;
  applyBotAction(r, ids[1], zero);
  assert.ok(r.revision > o.g.revision);
});

function botSeries(levels, seed, settings = {}) {
  const rng = seededRandom(seed), integer = (n) => Math.floor(rng() * n);
  const r = new Room('BOTS', { turnTime: 0, ...settings }, () => {});
  r.game = 'skat';
  const host = r.addPlayer('Host', null); host.connected = true;
  const bots = levels.map((l) => addBot(r, host.id, l));
  r.deckFactory = () => shuffle(skatDeck(), integer);
  r.start(host.id);
  let n = 0;
  while (r.phase === 'playing' && n++ < 20000) {
    if (r.stage === 'deal-over') { r.nextDeal(host.id); continue; }
    const id = nextBot(r); assert.ok(id, 'ein Bot muss dran sein');
    stepBot(r, id, { rng });
  }
  return { r, bots };
}

test('Skat: kompletter Bot-Durchlauf einer Serie mit Ramsch und Bock für leicht, mittel und schwer', () => {
  const { r, bots } = botSeries(['easy', 'medium', 'hard'], 21, { deals: 12, ramsch: true, bock: true });
  assert.equal(r.phase, 'over'); assert.equal(r.stage, 'match-over'); assert.equal(r.dealNo, 12);
  for (const b of bots) assert.equal(r.scores[b.id], r.totals[b.id]);
  assert.ok(r.result.winners.length >= 1);
});

test('Skat: schwere Bots schlagen leichte Bots über viele Serien', () => {
  let hard = 0, easy = 0;
  for (let i = 0; i < 24; i++) {
    const levels = i % 2 ? ['easy', 'hard', 'easy'] : ['hard', 'easy', 'hard'];
    const { r, bots } = botSeries(levels, 700 + i, { deals: 12 });
    const h = bots.filter((b) => b.botDifficulty === 'hard'), e = bots.filter((b) => b.botDifficulty === 'easy');
    hard += h.reduce((n, b) => n + r.scores[b.id], 0) / h.length; easy += e.reduce((n, b) => n + r.scores[b.id], 0) / e.length;
  }
  assert.ok(hard > easy, `${hard} vs ${easy}`);
});

test('Skat: Zeitüberschreitung entscheidet mit der mittleren Strategie legal', () => {
  const { r, ids } = room({ turnTime: 5 });
  r.deckFactory = () => [...fixed];
  r.start(ids[0]);
  const before = r.revision;
  r.onTimeout(r.currentId);
  assert.ok(r.revision > before);
  const action = decide(r.gameView(r.currentId), r.currentId, 'hard', () => 0.5);
  assert.ok(['bid', 'ramschChoice', 'pickup', 'discard', 'declare', 'play'].includes(action.method));
});

test('Skat: Aussteigen bricht die Serie ohne Wertung ab', () => {
  const { r, ids } = room();
  r.start(ids[0]);
  r.stand(ids[2]);
  assert.equal(r.phase, 'over'); assert.deepEqual(r.result.winners, []);
});
