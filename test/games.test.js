// Regeln der weiteren Spiele – direkt am Raum, mit festgelegten Karten und Würfeln.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room as MauMau } from '../games/maumau/room.js';
import { Room as UNO } from '../games/farbenchaos/room.js';
import { Room as Maexchen, valueOf, rank, MAEXCHEN, VALUES } from '../games/maexchen/room.js';
import { Room as Schocken, judge, DECKEL } from '../games/schocken/room.js';
import { Room as Huetchen } from '../games/huetchen/room.js';
import { Room as Etappen, validGroup, partition, PHASES, phaseText } from '../games/zehnetappen/room.js';
import { Room as Stapel, JOKER } from '../games/stapelrennen/room.js';
import { TurnRoom } from '../server/turn-room.js';
import { GAMES } from '../games/index.js';

// Raum mit Spielern, die alle mitspielen; die Runde läuft
function setup(Room, names = ['Anna', 'Ben', 'Carla'], settings = {}) {
  const r = new Room('TESTX', settings, () => {});
  const ids = names.map((n) => { const p = r.addPlayer(n, null); r.sit(p.id); return p.id; });
  r.start(ids[0]);
  return { r, ids };
}
const seq = (...vals) => () => { if (!vals.length) throw new Error('Würfel aufgebraucht'); return vals.shift(); };

test('Alle Spiele: Module, Grundlage und Spielarten', () => {
  assert.deepEqual(Object.keys(GAMES), ['poker', 'maumau', 'farbenchaos', 'maexchen', 'schocken', 'huetchen', 'zehnetappen', 'stapelrennen', 'schwimmen', 'blackjack', 'kniffel', 'schiffe', 'viergewinnt', 'shutthebox', 'zehntausend', 'muehle', 'schaetzmeister', 'schlagfertig', 'werhatdasgesagt', 'mogeln', 'praesident', 'durak', 'omaha', 'wuerfelpoker', 'luegenwuerfel', 'chicago', 'reversi', 'dame', 'domino', 'zahlenzoo', 'gedaechtnis-kueche', 'pfeilfieber', 'sortierstation', 'tickendes-paket', 'werwolf', 'wer-bin-ich', 'kritzelpost', 'bildunterschrift', 'malen-raten', 'broeckelboden', 'kronenjagd', 'laser-huepfer', 'sechs-nimmt', 'monopoly-deal', 'monopoly', 'spiel-des-lebens', 'scotland-yard', 'hex', 'wuerfelduell', 'risiko-wuerfeln', 'story-chaos', 'zahlenreihe', 'wuerfeljagd', 'monsterwuerfel', 'wuerfel-auktion']);
  for (const g of Object.values(GAMES)) {
    assert.ok(g.name && g.description && g.players, g.id);
    const r = g.create('ABCDE', {}, () => {});
    if (g.id !== 'poker' && g.id !== 'omaha') {
      assert.ok(r instanceof TurnRoom, g.id);
      const player = r.addPlayer('Anna', null);
      g.events.sit(r, player);
      assert.deepEqual(r.seats, [player.id], g.id);
      const restored = g.restore(JSON.parse(JSON.stringify(r.snapshot())), () => {});
      try {
        assert.equal(restored.constructor, r.constructor, g.id);
        assert.deepEqual(restored.settings, r.settings, g.id);
        assert.deepEqual(restored.seats, [player.id], g.id);
        assert.equal(restored.byToken(player.token).name, 'Anna', g.id);
        g.events.stand(restored, restored.byToken(player.token));
        assert.deepEqual(restored.seats, [], g.id);
      } finally {
        restored.dispose();
      }
    }
    r.dispose();
  }
  // Mitspielen, Zuschauen, Mindestzahl
  const r = new MauMau('X', {}, () => {});
  const a = r.addPlayer('Anna', null); r.sit(a.id);
  assert.throws(() => r.start(a.id), /mindestens 2/);
  const b = r.addPlayer('Ben', null);
  assert.throws(() => r.start(b.id), /Nur der Host/);
  r.sit(b.id);
  r.start(a.id);
  assert.equal(r.phase, 'playing');
  assert.throws(() => r.updateSettings(a.id, { handSize: 7 }), /zwischen den Runden/);
});

// ---------- Mau-Mau ----------
test('Mau-Mau: was passt – Farbe, Wert, Bube (nicht auf Bube)', () => {
  const { r } = setup(MauMau);
  r.discard = ['9h'];
  assert.ok(r.canPlay('9c') && r.canPlay('Kh') && r.canPlay('Jc'));
  assert.ok(!r.canPlay('Kc'));
  r.discard = ['Jh'];
  assert.ok(!r.canPlay('Js'), 'Bube auf Bube nicht');
});

test('Mau-Mau: Bube wünscht, 8 setzt aus, 7en stapeln', () => {
  const { r, ids: [a, b, c] } = setup(MauMau);
  r.discard = ['9h'];
  r.hands[a] = ['Jc', '8s', '7s', 'Ad']; r.hands[b] = ['9s', '9h', '7d', 'Kd']; r.hands[c] = ['Qs', 'Ks', 'Kh'];
  assert.throws(() => r.play(a, 'Jc'), /Farbe wünschen/);
  r.play(a, 'Jc', 's');
  assert.equal(r.wish, 's');
  assert.throws(() => r.play(b, '9h'), /passt nicht/, 'Wunsch gilt');
  r.play(b, '9s');
  assert.equal(r.wish, null);
  assert.equal(r.currentId, c);
  r.play(c, 'Qs');
  r.discard.push('8h');
  r.hands[a] = ['8s', '7s', 'Ad'];
  r.play(a, '8s');
  assert.equal(r.currentId, c, 'Ben setzt aus');
  // 7 auf 7
  r.discard.push('7c'); r.pending = 2;
  r.hands[c] = ['7h', 'Kh'];
  assert.throws(() => r.play(c, 'Kh'), /passt nicht/, 'gegen eine 7 nur eine 7');
  r.play(c, '7h');
  assert.equal(r.pending, 4);
  const before = r.hands[a].length;
  r.draw(a);
  assert.equal(r.hands[a].length, before + 4);
  assert.equal(r.pending, 0);
  assert.equal(r.currentId, b);
});

test('Mau-Mau: ziehen, nur die gezogene Karte spielen, sonst weiter', () => {
  const { r, ids: [a, b] } = setup(MauMau);
  r.discard = ['9h'];
  r.hands[a] = ['Kc', 'Ad'];
  assert.throws(() => r.pass(a), /Erst ziehen/);
  r.deck.push('Th');
  r.draw(a);
  assert.equal(r.drawn, 'Th');
  assert.throws(() => r.draw(a), /schon gezogen/);
  assert.deepEqual(r.view(a).g.playable, ['Th']);
  assert.throws(() => r.play(a, 'Kc'), /gezogene Karte/);
  r.play(a, 'Th');
  assert.equal(r.currentId, b);
  r.hands[b] = ['Kc', '8d'];
  r.deck.push('Qs');
  r.draw(b);
  r.pass(b);
  assert.notEqual(r.currentId, b);
});

test('Mau-Mau: letzte Karte, Wertung über den Abend, nichts Fremdes in der Ansicht', () => {
  const { r, ids: [a, b, c] } = setup(MauMau);
  r.discard = ['9h'];
  r.hands[a] = ['Kh', 'Qh']; r.hands[b] = ['7c', 'Ad', 'Js']; r.hands[c] = ['Tc'];
  const v = r.view(b);
  assert.deepEqual(v.g.hand, ['7c', 'Ad', 'Js']);
  assert.ok(!JSON.stringify(v).includes('"Kh"'), 'fremde Karten bleiben geheim');
  assert.equal(v.players.find((p) => p.id === a).cards, 2);
  r.play(a, 'Kh');
  assert.ok(r.log.some((l) => l.text === 'Anna: Mau!'));
  assert.ok(r.view(c).players.find((p) => p.id === a).last);
  r.turn = 0; // Anna nochmal (Test)
  r.play(a, 'Qh');
  assert.equal(r.phase, 'over');
  assert.deepEqual(r.scores, { [a]: 0, [b]: 7 + 11 + 2, [c]: 10 });
  assert.deepEqual(r.standingsList().map((p) => p.name), ['Anna', 'Carla', 'Ben'], 'wenig Punkte vorne');
  r.start(a);
  assert.equal(r.order[0], b, 'nächste Runde fängt der Nächste an');
});

// ---------- UNO ----------
test('UNO: 108 Karten, Startkarte ist eine Zahl, Farbwahl passt immer', () => {
  const { r } = setup(UNO);
  assert.equal(r.buildDeck().length, 108);
  assert.match(r.discard[0][0], /\d/);
  r.discard = ['5r'];
  assert.ok(r.canPlay('9r') && r.canPlay('5g') && r.canPlay('Ww') && r.canPlay('Fw'));
  assert.ok(!r.canPlay('9g'));
  r.discard = ['Ww']; r.wish = 'b';
  assert.ok(r.canPlay('3b') && !r.canPlay('3r'));
});

test('UNO: Aussetzen, Richtungswechsel, +2, +4 und Wertung', () => {
  const { r, ids: [a, b, c] } = setup(UNO);
  r.discard = ['5r'];
  r.hands[a] = ['Sr', 'Rr', '1g']; r.hands[b] = ['2r', '3r', 'Dr']; r.hands[c] = ['Fw', '4r', '9b'];
  r.play(a, 'Sr');
  assert.equal(r.currentId, c, 'Ben setzt aus');
  r.play(c, '4r');
  assert.equal(r.currentId, a);
  r.play(a, 'Rr');
  assert.equal(r.dir, -1);
  assert.equal(r.currentId, c, 'andersherum');
  r.discard.push('9r');
  const bBefore = r.hands[b].length;
  r.play(c, 'Fw', 'g');
  assert.equal(r.hands[b].length, bBefore + 4, 'Ben zieht 4');
  assert.equal(r.currentId, a, 'und setzt aus');
  r.play(a, '1g');
  assert.equal(r.phase, 'over');
  const total = [b, c].reduce((s, p) => s + r.hands[p].reduce((x, k) => x + r.cardPoints(k), 0), 0);
  assert.deepEqual(r.scores, { [a]: total });
  assert.equal(r.cardPoints('Dr'), 20); assert.equal(r.cardPoints('Fw'), 50); assert.equal(r.cardPoints('7b'), 7);
});

test('UNO zu zweit: Richtungswechsel wirkt wie Aussetzen', () => {
  const { r, ids: [a] } = setup(UNO, ['Anna', 'Ben']);
  r.discard = ['5r']; r.hands[a] = ['Rr', '2g'];
  r.play(a, 'Rr');
  assert.equal(r.currentId, a);
});

// ---------- Mäxchen ----------
test('Mäxchen: Werte und Reihenfolge', () => {
  assert.equal(valueOf([1, 2]), MAEXCHEN);
  assert.equal(valueOf([3, 5]), 53);
  assert.equal(valueOf([4, 4]), 44);
  assert.ok(rank(65) < rank(11) && rank(66) < rank(MAEXCHEN) && rank(31) === 0);
  assert.equal(VALUES.length, 21);
});

test('Mäxchen: würfeln, höher ansagen, anzweifeln – der Wurf bleibt geheim', () => {
  const { r, ids: [a, b, c] } = setup(Maexchen);
  r.roll = seq(5, 3, 4, 1, 6, 6);
  assert.throws(() => r.announce(a, 53), /Erst würfeln/);
  r.throwDice(a);
  assert.deepEqual(r.view(a).g.cup, [5, 3]);
  assert.equal(r.view(b).g.cup, null, 'nur der Werfer sieht den Wurf');
  r.announce(a, 53);
  assert.equal(r.view(c).g.last.value, 53);
  assert.ok(!('actual' in r.view(c).g.last), 'der echte Wurf bleibt geheim');
  // Ben glaubt, würfelt 41 und blufft 62
  r.throwDice(b);
  assert.throws(() => r.announce(b, 52), /höher sein/);
  r.announce(b, 62);
  // Carla zweifelt: gelogen → Ben verliert
  r.doubt(c);
  assert.equal(r.lives[b], 2);
  assert.deepEqual(r.reveal, { by: b, value: 62, actual: 41, loser: b });
  assert.equal(r.currentId, b, 'Verlierer fängt neu an');
  // Ben würfelt Pasch 6, sagt ehrlich an, Carla zweifelt → Carla verliert
  r.throwDice(b); r.announce(b, 66);
  r.doubt(c);
  assert.equal(r.lives[c], 2);
});

test('Mäxchen: zwei Leben bei Mäxchen, Geltenlassen, wer raus ist, und der Sieger', () => {
  const { r, ids: [a, b] } = setup(Maexchen, ['Anna', 'Ben'], { lives: 2 });
  r.roll = seq(2, 1);
  r.throwDice(a); r.announce(a, MAEXCHEN);
  assert.throws(() => r.throwDice(b), /Anzweifeln oder Geltenlassen/);
  r.doubt(b); // stimmt → Ben verliert 2 und ist raus
  assert.equal(r.phase, 'over');
  assert.deepEqual(r.result.winners, [a]);
  assert.equal(r.scores[a], 1);
  // Neue Runde: Geltenlassen kostet eins
  r.start(a);
  r.roll = seq(3, 1);
  const first = r.currentId, second = r.order.find((x) => x !== first);
  r.throwDice(first); r.announce(first, MAEXCHEN);
  r.accept(second);
  assert.equal(r.lives[second], 1);
});

// ---------- Schocken ----------
test('Schocken: Wertung der Würfe', () => {
  assert.equal(judge([1, 1, 1]).name, 'Schock aus');
  assert.deepEqual([judge([1, 6, 1]).name, judge([1, 6, 1]).deckel], ['Schock 6', 6]);
  assert.deepEqual([judge([4, 4, 4]).name, judge([4, 4, 4]).deckel], ['General 4', 3]);
  assert.deepEqual([judge([3, 5, 4]).name, judge([3, 5, 4]).deckel], ['Straße 3-4-5', 2]);
  assert.deepEqual([judge([6, 3, 5]).name, judge([6, 3, 5]).deckel], ['6-5-3', 1]);
  const order = [[2, 3, 5], [6, 5, 3], [1, 2, 3], [2, 3, 4], [2, 2, 2], [6, 6, 6], [1, 1, 2], [1, 1, 6], [1, 1, 1]].map((d) => judge(d));
  for (let i = 1; i < order.length; i++) assert.ok(order[i].cat > order[i - 1].cat || (order[i].cat === order[i - 1].cat && order[i].val > order[i - 1].val), order[i].name);
});

test('Schocken: Würfe festlegen, liegen lassen, Deckel vom Stapel', () => {
  const { r, ids: [a, b, c] } = setup(Schocken);
  // Anna: 6-5-3, lässt 6 und 5 liegen, wirft 1 → 6-5-1, hört nach 2 Würfen auf → alle dürfen nur 2
  r.roll = seq(6, 5, 3, 1);
  r.throwDice(a);
  r.throwDice(a, [0, 1]);
  assert.deepEqual(r.dice[a], [6, 5, 1]);
  r.stop(a);
  assert.equal(r.maxThrows, 2);
  // Ben: General 4 im ersten Wurf, stoppt
  r.roll = seq(4, 4, 4);
  r.throwDice(b); r.stop(b);
  // Carla: zwei Würfe, dann automatisch fertig: 2-3-5
  r.roll = seq(2, 2, 3, 3, 5, 6);
  r.throwDice(c);
  r.throwDice(c, [1]); // zweiter Wurf = Maximum → automatisch fertig, Durchgang wird ausgewertet
  // Carla 5-3-2 ist die Schlechteste, Ben (General) bestimmt 3 Deckel
  assert.equal(r.lastPass.worst, c);
  assert.equal(r.held[c], 3);
  assert.equal(r.stack, DECKEL - 3);
  assert.equal(r.currentId, r.lastPass.worst, 'Verlierer fängt an');
});

test('Schocken: Gleichstand – weniger Würfe gewinnt; Schock aus beendet die Halbzeit', () => {
  const { r, ids: [a, b] } = setup(Schocken, ['Anna', 'Ben']);
  r.roll = seq(6, 5, 2, 1, 6, 5, 1, 2);
  r.throwDice(a); r.throwDice(a, [0, 1]); r.stop(a); // 6-5-1 in 2 Würfen
  r.throwDice(b); r.throwDice(b, [0, 1]);              // 6-5-2 in 2 Würfen (fertig)
  assert.equal(r.lastPass.worst, a, '6-5-1 ist schlechter als 6-5-2');
  r.roll = seq(1, 1, 1, 2, 3, 3);
  const first = r.currentId, other = r.order.find((x) => x !== first);
  r.throwDice(first); r.stop(first);
  r.throwDice(other);
  assert.equal(r.phase, 'over');
  assert.equal(r.scores[other], 1, 'gegen Schock aus verliert man die Halbzeit');
});

test('Schocken: Stapel leer → Deckel wandern, wer alle hat, verliert', () => {
  const { r, ids: [a, b] } = setup(Schocken, ['Anna', 'Ben']);
  r.stack = 0; r.held = { [a]: 12, [b]: 1 };
  r.roll = seq(2, 3, 5, 4, 4, 4); // Anna 5-3-2, Ben General
  r.throwDice(a); r.stop(a);
  r.throwDice(b); // Anna hat nach einem Wurf aufgehört → auch Ben nur einer
  assert.equal(r.phase, 'over');
  assert.equal(r.scores[a], 1);
  assert.match(r.result.text, /Anna verliert die Halbzeit/);
});

// ---------- Mensch ärgere Dich nicht ----------
test('Mensch ärgere Dich nicht: drei Versuche, mit 6 raus, nach 6 nochmal', () => {
  const { r, ids: [a, b] } = setup(Huetchen, ['Anna', 'Ben']);
  r.roll = seq(2, 3, 4);
  r.throwDice(a); r.throwDice(a); r.throwDice(a);
  assert.equal(r.currentId, b, 'nach drei Versuchen ist der Nächste dran');
  r.roll = seq(6, 5);
  r.throwDice(b);
  assert.deepEqual(r.options, [0], 'mit einer 6 muss man raus');
  r.move(b, 0);
  assert.equal(r.pieces[b][0], 0);
  assert.equal(r.currentId, b, 'nach einer 6 nochmal');
  r.throwDice(b);
  assert.deepEqual(r.options, [0], 'Startfeld räumen');
  r.move(b, 0);
  assert.equal(r.pieces[b][0], 5);
  assert.equal(r.currentId, a);
});

test('Mensch ärgere Dich nicht: schlagen, Ziel nur passend, nicht überspringen, Sieg', () => {
  const { r, ids: [a, b] } = setup(Huetchen, ['Anna', 'Ben']);
  // Ben (Startfeld 10) steht auf Feld 13 = Annas Fortschritt 13
  r.pieces[a] = [10, -1, -1, -1]; r.pieces[b] = [3, -1, -1, -1];
  r.roll = seq(3);
  r.throwDice(a);
  r.move(a, 0);
  assert.equal(r.pieces[b][0], -1, 'geschlagen');
  // Ziel: Fortschritt 38 mit einer 6 → 44 gibt es nicht
  r.turn = 0; r.pieces[a] = [38, 40, 41, 42]; r.rolled = null;
  r.roll = seq(6);
  r.throwDice(a);
  assert.deepEqual(r.options, [], 'kein Zug: zu weit');
  r.turn = 0; r.pieces[a] = [38, 40, 41, 42]; r.rolled = null;
  r.roll = seq(5);
  r.throwDice(a);
  assert.deepEqual(r.options, [], 'eigene Hütchen im Ziel nicht überspringen');
  r.turn = 0; r.pieces[a] = [38, 41, 42, 43]; r.rolled = null;
  r.roll = seq(2);
  r.throwDice(a);
  assert.deepEqual(r.options, [0]);
  r.move(a, 0);
  assert.equal(r.phase, 'over');
  assert.deepEqual(r.result.winners, [a]);
});

// ---------- Phase 10 ----------
const card = (c, n, id = Math.random()) => ({ id, c, n });
test('Phase 10: Gruppen mit Jokern und Aufteilen in die Phase', () => {
  assert.ok(validGroup('set', [card('r', 7), card('b', 7), card('j', 0)]));
  assert.ok(!validGroup('set', [card('r', 7), card('b', 8)]));
  assert.ok(validGroup('run', [card('r', 3), card('b', 5), card('j', 0), card('g', 6)]));
  assert.ok(!validGroup('run', [card('r', 3), card('b', 3), card('j', 0), card('g', 4)]));
  assert.ok(!validGroup('run', [card('r', 1), card('b', 9), card('j', 0)]));
  assert.ok(validGroup('color', [card('g', 1), card('g', 9), card('j', 0)]));
  assert.ok(!validGroup('set', [card('s', 0), card('r', 1)]), 'Aussetzen nie in Gruppen');
  const cards = [card('r', 4), card('g', 4), card('b', 9), card('y', 9), card('j', 0), card('r', 9)];
  const p = partition(cards, PHASES[1]);
  assert.ok(p && p.length === 2);
  assert.equal(partition(cards.slice(0, 5), PHASES[1]), null, 'zu wenige Karten');
  assert.equal(phaseText(1), '2 Drillinge');
  assert.equal(phaseText(2), 'Drilling + 4er-Folge');
  assert.equal(phaseText(8), '7 einer Farbe');
});

test('Phase 10: ziehen, auslegen, anlegen, Aussetzen, Runde und Fortschritt', () => {
  const { r, ids: [a, b, c] } = setup(Etappen);
  let k = 1000;
  const C = (col, n) => ({ id: k++, c: col, n });
  r.hands[a] = [C('r', 4), C('g', 4), C('b', 4), C('r', 9), C('g', 9), C('j', 0), C('s', 0)];
  r.hands[b] = [C('y', 4), C('r', 1), C('r', 2)];
  r.discard = [C('s', 0)];
  assert.throws(() => r.layPhase(a, []), /Erst eine Karte ziehen/);
  assert.throws(() => r.drawCard(a, 'discard'), /Aussetzen/);
  r.deck.push(C('y', 2));
  r.drawCard(a, 'deck');
  assert.throws(() => r.drawCard(a, 'deck'), /schon gezogen/);
  const set = r.hands[a].filter((x) => x.n === 4 || x.n === 9 || x.c === 'j').map((x) => x.id);
  r.layPhase(a, set);
  assert.ok(r.done.has(a));
  assert.equal(r.laid[a].length, 2);
  // Anlegen: die gelbe 2 passt nirgends
  const two = r.hands[a].find((x) => x.n === 2).id;
  assert.throws(() => r.hit(a, two, a, 0), /passt nicht/);
  // Aussetzen abwerfen: Ben setzt aus → Carla ist dran
  const skip = r.hands[a].find((x) => x.c === 's').id;
  r.throwAway(a, skip, b);
  assert.equal(r.currentId, c);
  // Carla zieht, wirft ab, dann ist Anna dran (Ben übersprungen)
  r.hands[c] = [C('b', 1), C('b', 2)];
  r.drawCard(c, 'deck');
  r.throwAway(c, r.hands[c][0].id);
  assert.equal(r.currentId, a);
  assert.ok(r.log.some((l) => l.text === 'Ben setzt aus'));
  // Anna zieht eine 4 und legt sie an, wirft die letzte Karte ab → Runde vorbei
  r.deck.push(C('y', 4));
  r.drawCard(a, 'deck');
  r.hit(a, r.hands[a].find((x) => x.n === 4).id, a, r.laid[a].findIndex((g) => g.cards.some((x) => x.n === 4)));
  r.throwAway(a, r.hands[a][0].id);
  assert.equal(r.phase, 'over');
  assert.equal(r.progress[a], 2, 'Anna ist eine Phase weiter');
  assert.equal(r.phaseOf(b), 1);
  assert.ok(r.penalty[b] > 0);
  // Neue Runde: Anna hat Phase 2
  r.start(a);
  assert.equal(r.view(a).g.myPhase, 2);
});

test('Phase 10: wer Phase 10 schafft, gewinnt das Spiel', () => {
  const { r, ids: [a, b] } = setup(Etappen, ['Anna', 'Ben']);
  let k = 2000;
  const C = (col, n) => ({ id: k++, c: col, n });
  r.progress[a] = 10;
  r.hands[a] = [C('r', 7), C('g', 7), C('b', 7), C('y', 7), C('j', 0), C('r', 3), C('g', 3)];
  r.deck.push(C('b', 3));
  r.drawCard(a, 'deck');
  r.layPhase(a, r.hands[a].filter((x) => x.n === 7 || x.c === 'j' || x.n === 3).slice(0, 8).map((x) => x.id));
  assert.equal(r.phase, 'over');
  assert.deepEqual(r.result.winners, [a]);
  assert.equal(r.scores[a], 1);
  r.start(a);
  assert.equal(r.phaseOf(a), 1, 'neues Spiel beginnt bei Phase 1');
  assert.equal(r.phaseOf(b), 1);
});

// ---------- Skip-Bo ----------
test('Skip-Bo: Reihen bauen, Joker, volle Reihe, Hand auffüllen, Ablage', () => {
  const { r, ids: [a, b] } = setup(Stapel, ['Anna', 'Ben'], { stockSize: 5 });
  assert.equal(r.hand[a].length, 5, 'Hand aufgefüllt');
  r.hand[a] = [1, 2, JOKER, 9, 9];
  r.stock[a] = [7, 4];
  assert.throws(() => r.play(a, { kind: 'hand', index: 1 }, 0), /eine 1/);
  r.play(a, { kind: 'hand', index: 0 }, 0);
  r.play(a, { kind: 'hand', index: 0 }, 0); // die 2
  r.play(a, { kind: 'hand', index: 0 }, 0); // Joker als 3
  r.play(a, { kind: 'stock', index: 0 }, 0); // 4 vom Stapel
  assert.equal(r.build[0].length, 4);
  assert.equal(r.stock[a].length, 1);
  r.throwAway(a, 0, 2);
  assert.deepEqual(r.piles[a][2], [9]);
  assert.equal(r.currentId, b);
  // Volle Reihe kommt weg; leere Hand → 5 neue
  r.build[1] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  r.hand[b] = [12];
  r.play(b, { kind: 'hand', index: 0 }, 1);
  assert.equal(r.build[1].length, 0);
  assert.equal(r.hand[b].length, 5);
  // Von der Ablage
  r.piles[b][0] = [3, 1];
  r.build[2] = [];
  r.play(b, { kind: 'pile', index: 0 }, 2);
  assert.deepEqual(r.piles[b][0], [3]);
});

test('Skip-Bo: Stapel leer gewinnt – 25 plus 5 je Restkarte der anderen', () => {
  const { r, ids: [a, b] } = setup(Stapel, ['Anna', 'Ben'], { stockSize: 5 });
  r.stock[a] = [1]; r.stock[b] = [5, 6, 7];
  r.play(a, { kind: 'stock' }, 3);
  assert.equal(r.phase, 'over');
  assert.equal(r.scores[a], 25 + 15);
  assert.equal(r.view(b).players.find((p) => p.id === a).stock, 0);
  assert.equal(r.view(b).g.hand.length, r.hand[b].length, 'eigene Hand ja');
  assert.ok(!('hand' in r.view(b).players.find((p) => p.id === a)), 'fremde Hand nein');
});

test('Rundenspiele: Aussteigen mitten in der Runde, Neues Spiel, Speichern', () => {
  const { r, ids: [a, b, c] } = setup(MauMau);
  r.stand(b);
  assert.ok(!r.order.includes(b));
  assert.equal(r.phase, 'playing');
  r.remove(c);
  assert.equal(r.phase, 'over', 'nur noch einer übrig');
  assert.deepEqual(r.result.winners, [a]);
  const copy = MauMau.restore(JSON.parse(JSON.stringify(r.snapshot())), () => {});
  assert.deepEqual(copy.seats, [a]);
  assert.equal(copy.phase, 'lobby');
  r.newGame(a);
  assert.deepEqual(r.scores, {});
  assert.ok(r.log.some((l) => l.kind === 'summary'));
});

test('Anzeigenamen geändert, interne IDs gleich – alte gespeicherte Tische laden weiter', () => {
  const names = Object.fromEntries(Object.values(GAMES).map((g) => [g.id, g.name]));
  assert.deepEqual(names, {
    'risiko-wuerfeln':'Risiko-Würfeln','story-chaos':'Story-Chaos',zahlenreihe:'Zahlenreihe',wuerfeljagd:'Würfeljagd',monsterwuerfel:'Monsterwürfel','wuerfel-auktion':'Würfel-Auktion',
    poker: "Texas Hold'em", maumau: 'Mau-Mau', farbenchaos: 'UNO', maexchen: 'Mäxchen',
    schocken: 'Schocken', huetchen: 'Mensch ärgere Dich nicht', zehnetappen: 'Phase 10', stapelrennen: 'Skip-Bo', schwimmen: 'Schwimmen', blackjack: 'Blackjack', kniffel: 'Kniffel', schiffe: 'Schiffe versenken', viergewinnt: 'Vier gewinnt', shutthebox: 'Shut the Box', zehntausend: 'Zehntausend', muehle: 'Mühle', schaetzmeister: 'Schätzmeister', schlagfertig: 'Schlagfertig', werhatdasgesagt: 'Wer hat das gesagt?', mogeln: 'Mogeln', praesident: 'Präsident', durak: 'Durak', omaha: 'Omaha', wuerfelpoker: 'Würfelpoker', luegenwuerfel: 'Lügenwürfel', chicago: 'Chicago', reversi: 'Reversi', dame: 'Dame', domino: 'Domino', zahlenzoo: 'Zahlenzoo', 'gedaechtnis-kueche': 'Gedächtnisküche', pfeilfieber: 'Pfeilfieber', sortierstation: 'Sortierstation', 'tickendes-paket': 'Tickendes Paket', werwolf: 'Werwolf', 'wer-bin-ich': 'Wer bin ich?', kritzelpost: 'Kritzelpost', bildunterschrift: 'Bildunterschrift', 'malen-raten': 'Malen & Raten', broeckelboden: 'Bröckelboden', kronenjagd: 'Kronenjagd', 'laser-huepfer': 'Laser-Hüpfer', 'sechs-nimmt': '6 nimmt!', 'monopoly-deal': 'Monopoly Deal', monopoly: 'Monopoly', 'spiel-des-lebens': 'Spiel des Lebens', 'scotland-yard': 'Scotland Yard', hex: 'Hex', wuerfelduell: 'Würfelduell',
  });
  // Spielstand wie in data/rooms.json: Spielart steht unter der alten ID
  for (const id of ['farbenchaos', 'huetchen', 'zehnetappen', 'stapelrennen']) {
    const room = GAMES[id].create('ALT' + id.slice(0, 2).toUpperCase(), {}, () => {});
    const a = room.addPlayer('Anna', null); room.sit(a.id);
    const b = room.addPlayer('Ben', null); room.sit(b.id);
    room.scores[a.id] = 7;
    const saved = JSON.parse(JSON.stringify({ ...room.snapshot(), game: id, code: room.code }));
    const back = GAMES[saved.game].restore(saved, () => {});
    assert.deepEqual(back.seats, [a.id, b.id], id);
    assert.equal(back.scores[a.id], 7, id);
    assert.equal(back.byToken(a.token).name, 'Anna', id);
    back.start(a.id);
    assert.equal(back.phase, 'playing', id);
    back.dispose(); room.dispose();
  }
});

test('Siegtexte und Rufe mit den neuen Namen', () => {
  const { r, ids: [a] } = setup(UNO, ['Anna', 'Ben']);
  assert.equal(r.lastCardCall(), 'UNO!');
  assert.equal(r.winText('Anna'), 'Anna gewinnt – UNO!');
  r.discard = ['5r']; r.hands[a] = ['6r', '7r'];
  r.play(a, '6r');
  assert.ok(r.log.some((l) => l.text === 'Anna: UNO!'));
  assert.equal(phaseText(4), '7er-Folge');
});

test('Lobby: jedes Spiel bringt nur seine eigenen Einstellungen mit', () => {
  const fields = Object.fromEntries(Object.values(GAMES).map((g) => [g.id, g.createFields.map((f) => f.key)]));
  assert.deepEqual(fields, {
    'risiko-wuerfeln':[],'story-chaos':[],zahlenreihe:[],wuerfeljagd:[],monsterwuerfel:[],'wuerfel-auktion':[],
    'scotland-yard': ['rounds'], hex: [], wuerfelduell: [],
    poker: ['startStack', 'smallBlind', 'bigBlind'], maumau: ['handSize'], farbenchaos: ['handSize'], maexchen: ['lives'],
    schocken: [], huetchen: [], zehnetappen: [], stapelrennen: ['stockSize'], schwimmen: ['lives'], blackjack: ['startStack', 'minBet', 'maxBet'], kniffel: [], schiffe: ['turnTime'], viergewinnt: ['turnTime'], shutthebox: ['rounds'], zehntausend: ['target'], muehle: ['turnTime'], schaetzmeister: ['rounds'], schlagfertig: ['rounds'], werhatdasgesagt: ['rounds'], mogeln: ['maxCards'], praesident: [], durak: [], omaha: ['startStack', 'smallBlind', 'bigBlind'], wuerfelpoker: ['strikes'], luegenwuerfel: ['dice'], chicago: [], reversi: ['turnTime'], dame: ['turnTime'], domino: [], zahlenzoo: ['rounds'], 'gedaechtnis-kueche': ['rounds'], pfeilfieber: ['rounds'], sortierstation: ['rounds'], 'tickendes-paket': ['rounds'], werwolf: [], 'wer-bin-ich': [], kritzelpost: ['rounds'], bildunterschrift: ['rounds'], 'malen-raten': ['rounds'], broeckelboden: ['playSecs'], kronenjagd: ['playSecs'], 'laser-huepfer': ['playSecs'], 'sechs-nimmt': [], 'monopoly-deal': [], monopoly: [], 'spiel-des-lebens': [],
  });
  // Was die Lobby anbietet, versteht das Spiel auch (unbekannte Felder würden still ignoriert)
  for (const g of Object.values(GAMES)) {
    if (g.id === 'poker' || g.id === 'omaha') continue;
    const r = g.create('X', Object.fromEntries(g.createFields.map((f) => [f.key, f.value])), () => {});
    for (const f of g.createFields) assert.equal(r.settings[f.key], f.value, `${g.id}.${f.key}`);
    r.dispose();
  }
});
