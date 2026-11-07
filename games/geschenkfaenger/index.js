import { Room } from './room.js';
import { arcadeEvents } from '../arcade-room.js';
import { turnGame } from '../../server/turn-game.js';

export const RULES = [
  'Alle sehen denselben Fall von Geschenken und Bomben (gleicher Seed); jede Person fängt mit dem eigenen Korb.',
  'Den Korb bewegst du nach links und rechts: Pfeiltasten, A/D oder die gehaltenen Knöpfe am Handy.',
  'Kleine Geschenke geben 10, große 20 Punkte; optional gibt es goldene Geschenke mit 50. Eine Bombe nimmt 30 Punkte weg (nie unter null).',
  'Optional wird der Korb mit jeder Bombe kleiner.',
  'Der Server berechnet Korb, Fall und Treffer; nach Ablauf der Spielzeit gewinnt die höchste Punktzahl, Gleichstand teilt den Sieg.',
];
export const ART = '<svg class="game-art" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="13" fill="#3b1f2b"/><rect x="18" y="20" width="28" height="22" rx="3" fill="#b8433f"/><path d="M32 20v22M18 30h28" stroke="#f1d78a" stroke-width="4"/><path d="M32 20c-8-9-14-1-6 0m6 0c8-9 14-1 6 0" fill="none" stroke="#f1d78a" stroke-width="3"/><path d="M12 50h40l-5 8H17z" fill="#c99a45"/></svg>';
export default turnGame(Room, {
  id: 'geschenkfaenger', name: 'Geschenkfänger', description: 'Geschenke mit dem Korb fangen und Bomben ausweichen – der Server zählt jeden Treffer.',
  category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, players: '2–8 Spieler', art: ART, rules: RULES,
  createFields: [
    { key: 'playSecs', label: 'Spielzeit in Sekunden', type: 'number', min: 10, max: 180, value: 30 },
  ],
  createHint: 'Goldene Geschenke und schrumpfenden Korb stellst du am Tisch unter „Host“ ein. Korb mit Pfeiltasten oder A/D bewegen, am Handy die Knöpfe halten. Optionale Bots für Testrunden.',
  events: arcadeEvents,
});
