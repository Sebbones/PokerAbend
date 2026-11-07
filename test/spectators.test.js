// C5 Zuschauen: Zuschauer sehen keine verdeckten Karten oder Würfel und können zur nächsten Runde einsteigen.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../games/index.js';
import { randomFleet } from '../games/schiffe/room.js';

// Alles Geheime eines Spielers als Text (Karten, Würfel), damit man es im JSON der Zuschauer-Ansicht suchen kann
const SECRETS = {
  maumau: (r, id) => r.hands[id],
  farbenchaos: (r, id) => r.hands[id],
  zehnetappen: (r, id) => r.hands[id].map((c) => `"id":${c.id},`),
  stapelrennen: (r, id) => (r.hand[id].length ? [`"hand":[${r.hand[id].join(',')}]`] : []),
  maexchen: (r, id) => (r.cup && r.currentId === id ? [`"cup":[${r.cup.join(',')}]`] : []),
  schwimmen: (r, id) => (r.lastDeal ? [] : r.hands[id]), // gleich beim Geben 31: dann wurde zu Recht aufgedeckt (Karten des alten Durchgangs)
  mogeln: (r, id) => r.hands[id],
  werwolf: (r, id) => (id === r.order[0] ? ['"roles":{', '"nightLog":['] : []), // Rollen und Nachtgeschehen sehen nur Tote
  praesident: (r, id) => r.hands[id],
  durak: (r, id) => r.hands[id],
  schiffe: (r, id) => r.ships[id].map((s) => JSON.stringify(s.cells)), // Schiffspositionen
};

for (const g of Object.values(GAMES)) {
  if (g.id === 'poker' || g.id === 'omaha') continue; // Poker: test/server.test.js und room.test.js
  test(`Zuschauen bei ${g.name}: nichts Verdecktes, Einstieg zur nächsten Runde`, () => {
    const r = g.create('ZUSCH', {}, () => {});
    const [a, b] = ['Anna', 'Ben'].map((n) => { const p = r.addPlayer(n, null); r.sit(p.id); return p.id; });
    for (let k = r.seats.length; k < Math.max(r.opts.minPlayers, 2); k++) { const p = r.addPlayer('Mit' + k, null); r.sit(p.id); } // Spiele ab drei (Werwolf: sechs) Spielern
    const z = r.addPlayer('Zoe', null).id; // schaut nur zu
    r.start(a);
    if (g.id === 'maexchen') r.throwDice(r.currentId); // ein verdeckter Wurf liegt unter dem Becher
    if (g.id === 'schiffe') for (const id of [a, b]) r.place(id, randomFleet(r.fleet(), false)); // Flotten stehen, es wird geschossen
    if (g.id === 'blackjack') { r.bet(a, 10); r.bet(b, 10); } // Karten liegen, die zweite Dealerkarte ist verdeckt
    const v = r.view(z);
    assert.equal(v.you.playing, false);
    assert.equal(v.you.inRound, false);
    if (v.g && 'hand' in v.g) assert.equal(v.g.hand, null, 'keine eigene Hand');
    const json = JSON.stringify(v);
    for (const id of [a, b]) {
      for (const secret of SECRETS[g.id]?.(r, id) || []) {
        // Bei Mau-Mau/UNO kann dieselbe Karte als offene Ablage liegen – die ist nicht geheim
        if (typeof secret === 'string' && secret.length === 2 && (v.g.top === secret || v.g.middle?.includes(secret))) continue;
        if (typeof secret === 'string' && secret.length === 2) assert.ok(!json.includes(`"${secret}"`), `${g.id}: ${secret} sichtbar`);
        else assert.ok(!json.includes(secret), `${g.id}: ${secret} sichtbar`);
      }
    }
    if (g.id === 'maexchen') assert.equal(v.g.cup, null);
    if (g.id === 'blackjack' && r.phase === 'playing') assert.equal(v.g.dealer.cards[1], null, 'verdeckte Dealerkarte sichtbar');
    // Mitten in der Runde einsteigen: erst ab der nächsten Runde (bei Spielen für genau zwei erst, wenn ein Platz frei wird)
    if (r.seats.length >= r.opts.maxPlayers) { // Spiele für genau zwei, drei oder vier: erst wenn ein Platz frei wird
      assert.throws(() => r.sit(z), /Mehr als [0-9]/);
      r.stand(b);
    }
    const midRound = r.phase === 'playing'; // eine Runde kann schon beim Geben enden (z. B. 31 bei Schwimmen)
    r.sit(z);
    assert.ok(r.seats.includes(z));
    assert.ok(!r.order.includes(z));
    if (r.opts.maxPlayers > 2) assert.ok(r.log.some((l) => l.text === (midRound ? 'Zoe spielt ab der nächsten Runde mit' : 'Zoe spielt mit')));
    r.phase = 'over'; // Runde vorbei (für den Test abgekürzt)
    r.start(a);
    assert.ok(r.order.includes(z), 'in der nächsten Runde dabei');
    r.dispose();
  });
}
