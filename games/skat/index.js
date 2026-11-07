import { Room } from './room.js';
import { turnGame } from '../../server/turn-game.js';
import { fan } from '../art-kit.js';
import { BOTS } from '../bots.js';

// Der Bot-Zug läuft über botStep des Raums (Stufen: games/skat/bot.js).
BOTS['skat'] = (room, id, rng) => room.botStep(id, rng);

const CARD = { fill: '#F7F3E8' };
export const RULES = [
  '32 Karten (Sieben bis Ass), drei Spieler bekommen je zehn Karten, zwei liegen als Skat verdeckt.',
  'Beim Reizen (18, 20, 22, 23, 24 …) wird der Höchstbietende Alleinspieler gegen die beiden anderen.',
  'Er darf den Skat aufnehmen und zwei Karten drücken oder Hand spielen und sagt Farbspiel, Grand oder Null an (Hand, Ouvert, Schneider/Schwarz angesagt).',
  'Im Farbspiel sind die vier Buben und die Trumpffarbe Trumpf, im Grand nur die Buben; Karte zugeben ist Pflicht.',
  'Augen: Ass 11, Zehn 10, König 4, Dame 3, Bube 2. Der Alleinspieler braucht 61 von 120, für Schneider 90.',
  'Spielwert = Grundwert × (Spitzen + Spielstufen). Gewonnen: Wert + 50, verloren: −2 × Wert − 50, jeder Gegner bekommt dann 30.',
  'Varianten: Ramsch, wenn alle passen, und Bockrunden mit doppelten Punkten.',
];
export default turnGame(Room, {
  id: 'skat', name: 'Skat', category: 'karten', minPlayers: 3, maxPlayers: 3, players: '3 Spieler', duration: 45, rules: RULES,
  description: 'Das deutsche Kartenspiel: reizen, ansagen und 61 Augen holen – mit Ramsch und Bockrunden.',
  art: fan([{ ...CARD, kind: 'dot', color: '#1A1A1A' }, { ...CARD, kind: 'heart' }, { ...CARD, kind: 'diamond' }]),
  createFields: [],
  events: {
    bid: (r, p, d) => r.bid(p.id, d),
    ramschChoice: (r, p, d) => r.ramschChoice(p.id, d),
    pickup: (r, p, d) => r.pickup(p.id, d),
    discard: (r, p, d) => r.discard(p.id, d),
    declare: (r, p, d) => r.declare(p.id, d),
    play: (r, p, d) => r.play(p.id, d),
    nextDeal: (r, p) => r.nextDeal(p.id),
  },
});
