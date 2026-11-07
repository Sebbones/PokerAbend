import { Room } from './room.js';
import { arcadeEvents } from '../arcade-room.js';
import { turnGame } from '../../server/turn-game.js';

export const RULES = [
  'Alle bekommen dieselbe Notenfolge (gleicher Seed); die Noten laufen in vier Bahnen auf die Trefferlinie zu.',
  'Tippe die Bahn genau dann, wenn die Note die Linie erreicht: Tasten D F J K oder ← ↓ ↑ →, am Handy die vier Felder.',
  'Perfekt (±60 ms) gibt 100, gut (±130 ms) 60 und knapp (±200 ms) 25 Punkte. Serien aus perfekten und guten Treffern geben bis zu 50 Bonuspunkte pro Note.',
  'Verpasste Noten und Fehltipps unterbrechen die Serie; ein Fehltipp kostet 10 Punkte.',
  'Der Server wertet jeden Tipp mit seiner Zeit; nur die selbst gemessene Verzögerung deiner Verbindung (höchstens 200 ms) wird ausgeglichen. Die höchste Punktzahl gewinnt.',
];
export const ART = '<svg class="game-art" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="13" fill="#2a2150"/><path d="M14 10v44M26 10v44M38 10v44M50 10v44" stroke="#5a468f" stroke-width="3"/><rect x="10" y="14" width="8" height="8" rx="2" fill="#f1d78a"/><rect x="34" y="26" width="8" height="8" rx="2" fill="#7ad7c1"/><rect x="22" y="38" width="8" height="8" rx="2" fill="#ef8196"/><path d="M8 50h48" stroke="#fff" stroke-width="3"/></svg>';
export default turnGame(Room, {
  id: 'rhythmus-rausch', name: 'Rhythmus-Rausch', description: 'Im Takt tippen: Je genauer, desto mehr Punkte – der Server wertet jeden Tipp.',
  category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, players: '2–8 Spieler', art: ART, rules: RULES,
  createFields: [
    { key: 'playSecs', label: 'Spielzeit in Sekunden', type: 'number', min: 10, max: 180, value: 45 },
  ],
  createHint: 'Eine Bahn und schnelleres Tempo stellst du am Tisch unter „Host“ ein. Tasten D F J K oder Pfeiltasten, am Handy die vier Felder tippen. Optionale Bots für Testrunden.',
  events: arcadeEvents,
});
