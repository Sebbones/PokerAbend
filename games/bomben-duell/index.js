import { Room } from './room.js';
import { arcadeEvents } from '../arcade-room.js';
import { turnGame } from '../../server/turn-game.js';

export const RULES = [
  'Alle bewegen sich gleichzeitig Feld für Feld auf einem Raster mit festen Pfeilern und zerstörbaren Kisten (Pfeiltasten/WASD oder Richtungsknöpfe).',
  'Mit Leertaste oder Bombenknopf legst du eine Bombe (eine gleichzeitig). Ihre Zündschnur ist sichtbar und läuft etwa zwei Sekunden.',
  'Die Explosion reicht zwei Felder in vier Richtungen, wird von Pfeilern gestoppt, sprengt die erste Kiste und zündet andere Bomben. Wer in den Flammen steht, scheidet aus.',
  'Pro Runde gibt es so viele Punkte, wie vor dir ausgeschieden sind; Überlebende erhalten die Zahl aller Ausgeschiedenen. Nach den eingestellten Runden gewinnt die höchste Summe.',
  'Der Server berechnet Bewegung, Zündschnur, Explosion und Punkte; Eingaben vom Client sind nur Richtungen und das Legen.',
];
export const ART = '<svg class="game-art" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="13" fill="#33261f"/><circle cx="30" cy="38" r="16" fill="#1b1b1f" stroke="#f1d78a" stroke-width="3"/><path d="M40 26l8-8" stroke="#c99a45" stroke-width="4"/><path d="M50 10l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ff8a3d"/><path d="M12 54h8v-8" stroke="#8b6b4a" stroke-width="4" fill="none"/></svg>';
export default turnGame(Room, {
  id: 'bomben-duell', name: 'Bomben-Duell', description: 'In einer eigenen Spielarena Sprengladungen setzen und rechtzeitig in Deckung gehen.',
  category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, players: '2–8 Spieler', art: ART, rules: RULES,
  createFields: [
    { key: 'playSecs', label: 'Sekunden pro Runde', type: 'number', min: 20, max: 180, value: 75 },
    { key: 'rounds', label: 'Anzahl Runden', type: 'number', min: 1, max: 5, value: 3 },
  ],
  createHint: 'Bewegen mit Pfeiltasten/WASD, Bombe mit Leertaste; am Handy Richtungsknöpfe und Bombenknopf. Optionale Bots für Testrunden.',
  events: arcadeEvents,
});
