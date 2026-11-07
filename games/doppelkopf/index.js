import { Room } from './room.js';
import { turnGame } from '../../server/turn-game.js';
import { fan } from '../art-kit.js';
import { BOTS } from '../bots.js';

// Der Bot-Zug läuft über botStep des Raums (Stufen: games/doppelkopf/bot.js).
BOTS['doppelkopf'] = (room, id, rng) => room.botStep(id, rng);

const CARD = { fill: '#F7F3E8' };
export const RULES = [
  'Gespielt wird mit dem doppelten Skatblatt (48 Karten, wahlweise ohne Neunen: 40), jeder bekommt zwölf bzw. zehn Karten.',
  'Trumpf sind Herz-Zehn (Dulle), alle Damen und Buben und Karo; die beiden Kreuz-Damen bestimmen die Partei Re, alle anderen sind Kontra.',
  'Wer beide Kreuz-Damen hat, kann eine Hochzeit ansagen: Der erste Mitspieler, der in den ersten drei Stichen sticht, wird sein Partner.',
  'Vor dem Spiel kann jeder ein Solo anmelden: Damen-, Buben-, Fleischlos- oder Farbsolo. Der Solist spielt allein gegen drei.',
  'Farbzwang bei Fehl-Karten und Trumpf, die höchste Karte gewinnt den Stich. Re braucht 121 von 240 Augen, Kontra 120.',
  'Ansagen: Re/Kontra, keine 90, keine 60, keine 30, schwarz – jede steigert den Spielwert. Zusatzpunkte gibt es für Fuchs (gefangenes Karo-Ass), Doppelkopf (40 Augen im Stich) und Karlchen (Kreuz-Bube im letzten Stich).',
  'Varianten: mit oder ohne Neunen sowie Schweinchen (zwei Karo-Asse sind der höchste Trumpf).',
];
export default turnGame(Room, {
  id: 'doppelkopf', name: 'Doppelkopf', category: 'karten', minPlayers: 4, maxPlayers: 4, players: '4 Spieler', duration: 60, rules: RULES,
  description: 'Vier Spieler, zwei Parteien: Re gegen Kontra um 121 von 240 Augen – mit Hochzeit, Solos und Ansagen.',
  art: fan([{ ...CARD, kind: 'dot', color: '#1A1A1A' }, { ...CARD, kind: 'diamond' }, { ...CARD, kind: 'bars', color: '#C99A45' }, { ...CARD, kind: 'heart' }]),
  createFields: [],
  events: {
    reserve: (r, p, d) => r.reserve(p.id, d),
    announce: (r, p, d) => r.announce(p.id, d),
    play: (r, p, d) => r.play(p.id, d),
    nextDeal: (r, p) => r.nextDeal(p.id),
  },
});
