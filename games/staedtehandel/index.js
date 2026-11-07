import { Room } from './room.js';
import { turnGame } from '../../server/turn-game.js';
import { hexBoard } from '../art-kit.js';
import { BOTS } from '../bots.js';

// Der Bot-Zug läuft über botStep des Raums (Stufen: games/staedtehandel/bot.js).
BOTS['staedtehandel'] = (room, id, rng) => room.botStep(id, rng);

export const RULES = [
  'Aurelia ist eine erfundene Insel aus Sechsecken: Wald (Holz), Tongrube (Ton), Weide (Wolle), Acker (Korn), Gebirge (Kupfer) und eine Düne ohne Ertrag. Auf jedem Feld liegt eine Zahl von 2 bis 12.',
  'Aufbau: Reihum setzt jeder eine Siedlung mit einer anschließenden Straße, dann geht es rückwärts noch einmal. Für die zweite Siedlung gibt es sofort je einen Rohstoff der angrenzenden Felder.',
  'Ertrag: Wer dran ist, würfelt mit zwei Würfeln. Jede Siedlung an einem Feld mit dieser Zahl bringt 1 Rohstoff, jede Stadt 2. Die Würfel fallen auf dem Server.',
  'Bauen: Straße = Holz + Ton. Siedlung = Holz + Ton + Wolle + Korn, mindestens zwei Straßenabschnitte von der nächsten Siedlung entfernt und an eine eigene Straße angeschlossen. Stadt = 2 Korn + 3 Kupfer auf einer eigenen Siedlung. Entwicklungskarte = Wolle + Korn + Kupfer.',
  'Die Sieben: Wer mehr als 7 Karten hat, wirft die Hälfte ab. Der Würfler versetzt den Räuber auf ein anderes Feld (das bringt dann nichts mehr) und stiehlt eine zufällige Karte von jemandem, der dort baut.',
  'Handel: Auf deinem Zug bietest du anderen einen Tausch an – wer zustimmt, den wählst du aus. Mit der Bank tauschst du 4:1, mit einem 3:1-Hafen 3:1, mit einem Spezialhafen 2:1 für dessen Rohstoff.',
  'Entwicklungskarten: Ritter (Räuber versetzen, drei gespielte Ritter und mehr als alle anderen = größte Rittermacht, 2 Punkte), Bauwerk (1 geheimer Punkt), Straßenbau (zwei Straßen gratis), Erfindung (zwei beliebige Rohstoffe von der Bank), Handelsmonopol (alle Karten eines Rohstoffs von allen anderen). Eine Karte pro Zug, nicht am Kaufzug.',
  'Längste Handelsstraße: zusammenhängend mindestens 5 Straßenabschnitte und mehr als alle anderen = 2 Punkte. Fremde Siedlungen unterbrechen eine Straße.',
  'Sieg: Siedlung = 1 Punkt, Stadt = 2, dazu Auszeichnungen und Bauwerke. Wer in seinem Zug 10 Punkte hat, gewinnt.',
];
export default turnGame(Room, {
  id: 'staedtehandel', name: 'Städtehandel', category: 'brett', minPlayers: 3, maxPlayers: 6, players: '3–4 Spieler (5–6 mit großem Brett)', duration: 75, rules: RULES,
  description: 'Rohstoffe erwürfeln, handeln und auf der Insel Aurelia Straßen, Siedlungen und Städte bauen – wer zuerst 10 Punkte hat, gewinnt.',
  art: hexBoard(['#7FD39A', '#C99A45', '#E3C08A', '#9DB7E8', '#D33B35', '#F7F3E8', '#1C7A43']),
  createFields: [],
  events: {
    ssRoll: (r, p) => r.ssRoll(p.id),
    ssDiscard: (r, p, d) => r.ssDiscard(p.id, d),
    ssRobber: (r, p, d) => r.ssRobber(p.id, d),
    ssSteal: (r, p, d) => r.ssSteal(p.id, d),
    ssBuild: (r, p, d) => r.ssBuild(p.id, d),
    ssBuyDev: (r, p) => r.ssBuyDev(p.id),
    ssPlay: (r, p, d) => r.ssPlay(p.id, d),
    ssEndRoads: (r, p) => r.ssEndRoads(p.id),
    ssBank: (r, p, d) => r.ssBank(p.id, d),
    ssOffer: (r, p, d) => r.ssOffer(p.id, d),
    ssRespond: (r, p, d) => r.ssRespond(p.id, d),
    ssConfirm: (r, p, d) => r.ssConfirm(p.id, d),
    ssCancel: (r, p) => r.ssCancel(p.id),
    ssEnd: (r, p) => r.ssEnd(p.id),
  },
});
