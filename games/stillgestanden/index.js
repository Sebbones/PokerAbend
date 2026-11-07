import { Room } from './room.js';
import { arcadeEvents } from '../arcade-room.js';
import { turnGame } from '../../server/turn-game.js';

export const RULES = [
  'Alle starten an derselben Linie und laufen in Echtzeit zum Ziel. Laufen: ↑, W oder Leertaste halten, am Handy den Laufknopf halten.',
  'Bei Grün darfst du laufen. Gelb kündigt Rot an, bei Rot musst du stillstehen – die Signale kommen zufällig.',
  'Wer sich bei Rot bewegt, geht zurück zum Start (oder steht ohne Rückkehr zwei Sekunden still). Nach dem Wechsel auf Rot gibt es eine kurze, an deine Verbindung angepasste Gnadenfrist.',
  'Optional gibt es ein Fake-Signal: ein kurzes Rot ohne Strafe.',
  'Wer zuerst das Ziel erreicht, gewinnt; läuft die Zeit ab, gewinnt der weiteste Lauf. Der Server entscheidet über Signale, Bewegung und Strafen.',
];
export const ART = '<svg class="game-art" viewBox="0 0 64 64"><rect x="3" y="3" width="58" height="58" rx="13" fill="#2b2a2a"/><rect x="40" y="9" width="14" height="38" rx="7" fill="#151515"/><circle cx="47" cy="18" r="4" fill="#d6453d"/><circle cx="47" cy="28" r="4" fill="#4a4328"/><circle cx="47" cy="38" r="4" fill="#4a8a58"/><circle cx="22" cy="22" r="6" fill="#e8c68b"/><path d="M22 28v14m-8-8 8-3 8 3m-8 8-6 10m6-10 6 10" stroke="#e8c68b" stroke-width="4" fill="none"/></svg>';
export default turnGame(Room, {
  id: 'stillgestanden', name: 'Stillgestanden!', description: 'Bei Grün laufen, bei Rot stillstehen – wer sich bewegt, muss zurück.',
  category: 'party', bauart: 'C', minPlayers: 2, maxPlayers: 8, duration: 5, players: '2–8 Spieler', art: ART, rules: RULES,
  createFields: [
    { key: 'playSecs', label: 'Spielzeit in Sekunden', type: 'number', min: 20, max: 180, value: 90 },
  ],
  createHint: 'Rückkehr zum Start und Fake-Signal stellst du am Tisch unter „Host“ ein. Laufen mit ↑, W oder Leertaste halten; am Handy den Laufknopf halten. Optionale Bots für Testrunden.',
  events: arcadeEvents,
});
