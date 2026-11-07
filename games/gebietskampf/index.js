import { Room } from './room.js';
import { turnGame } from '../../server/turn-game.js';
import { territory } from '../art-kit.js';
import { BOTS } from '../bots.js';

// Der Bot-Zug läuft über botStep des Raums (Stufen: games/gebietskampf/bot.js).
BOTS['gebietskampf'] = (room, id, rng) => room.botStep(id, rng);

export const RULES = [
  'Meridia ist eine erfundene Karte: sechs Landmassen mit je sieben Gebieten (die kleine Karte hat vier Landmassen). Die Gebiete werden zufällig verteilt und mit Truppen besetzt.',
  'Verstärkung: Zu Beginn deines Zuges bekommst du Truppen nach der Zahl deiner Gebiete (ein Drittel, mindestens drei) plus den Bonus jeder Landmasse, die dir ganz gehört. Setze sie frei auf eigene Gebiete.',
  'Karten: Wer in einem Zug erobert hat, zieht eine Karte. Drei gleiche Symbole, drei verschiedene oder ein Satz mit Joker lassen sich gegen Truppen tauschen (steigend oder fest). Das eigene Gebiet auf einer Karte gibt +2 Truppen. Ab fünf Karten ist Tauschen Pflicht.',
  'Angriff: Von einem Gebiet mit mindestens zwei Truppen auf ein angrenzendes gegnerisches Gebiet. Der Angreifer würfelt mit bis zu drei Würfeln, der Verteidiger mit bis zu zwei. Die höchsten Würfel werden verglichen, Gleichstand gewinnt die Verteidigung. Die Würfel fallen auf dem Server.',
  'Wer das letzte Gebiet eines Gegners erobert, scheidet ihn aus und übernimmt seine Karten. Nach der Eroberung ziehst du Truppen nach.',
  'Verschieben: Am Ende des Zuges darfst du einmal Truppen zwischen zwei verbundenen eigenen Gebieten bewegen.',
  'Sieg: Weltherrschaft – alle Gebiete gehören dir. Variante „Geheime Missionen“: Jeder hat ein geheimes Ziel; wer es als Erster erfüllt, gewinnt.',
];
export default turnGame(Room, {
  id: 'gebietskampf', name: 'Gebietskampf (Risiko-inspiriert)', category: 'brett', minPlayers: 2, maxPlayers: 6, players: '2–6 Spieler', duration: 90, rules: RULES,
  description: 'Verstärke, würfle und erobere die erfundene Weltkarte Meridia – bis dir alles gehört oder deine geheime Mission erfüllt ist.',
  art: territory(),
  createFields: [],
  events: {
    gkPlace: (r, p, d) => r.gkPlace(p.id, d),
    gkTrade: (r, p, d) => r.gkTrade(p.id, d),
    gkNext: (r, p) => r.gkNext(p.id),
    gkAttack: (r, p, d) => r.gkAttack(p.id, d),
    gkOccupy: (r, p, d) => r.gkOccupy(p.id, d),
    gkFortify: (r, p, d) => r.gkFortify(p.id, d),
    gkEnd: (r, p) => r.gkEnd(p.id),
  },
});
