import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {expeditionEvents} from '../expedition-room.js';
export const CONTENT={
  "id": "fallenbauer",
  "name": "Fallenbauer",
  "en": "Trap Builder",
  "kind": "traps",
  "bauart": "C",
  "maxPlayers": 8,
  "description": "Baue reihum Fallen und meistere danach mit allen gleichzeitig den gemeinsamen Parcours.",
  "enDescription": "Take turns placing traps, then tackle the shared course simultaneously.",
  "bg": "#273e4c",
  "accent": "#e2c28a",
  "tag": "02 / PARCOURSWERK",
  "hint": [
    "Im Bauzug ein Feld auswählen und bestätigen. Danach zum grünen Ziel laufen, rote Fallen meiden.",
    "On your build turn, select a cell and confirm. Then move to the green goal and avoid red traps."
  ],
  "art": "<path d=\"M25 110h190M35 35h170v80H35z\" fill=\"#3b5666\" stroke=\"#adc4c1\" stroke-width=\"3\"/><path d=\"M70 35v80m35-80v80m35-80v80m35-80v80M35 75h170\" stroke=\"#adc4c177\" stroke-width=\"2\"/><path d=\"m111 46 22 21m0-21-22 21\" stroke=\"#e78c71\" stroke-width=\"6\"/><path d=\"m180 87 20 10-20 10\" fill=\"#a8d9ad\"/>",
  "rules": [
    [
      "Zuerst setzt jede Person reihum eine sichtbare Falle auf den gemeinsamen 11×9-Parcours. Start- und Zielspalte bleiben frei; der Server erlaubt nur Platzierungen mit einem sicheren Weg zum Ziel.",
      "First each player takes a turn placing one visible trap on the shared 11×9 course. Start and goal columns stay free; the server allows only placements leaving a safe route to the goal."
    ],
    [
      "Ein gestrichelter Rahmen ist nur dein Entwurf. Mit „Falle setzen“ bestätigen; alternativ Bauplatz im Auswahlfeld wählen. Bei Zeitablauf wählt der Server einen erlaubten Platz.",
      "A dashed outline is only your draft. Confirm with Place trap; alternatively choose a build site from the selector. On timeout the server chooses a legal site."
    ],
    [
      "Nach dem Bauen laufen alle gleichzeitig. Bewege dich waagerecht/senkrecht, mit Pfeiltasten/WASD, Richtungsknöpfen oder durch Antippen eines Nachbarfelds.",
      "After building, everyone runs simultaneously. Move horizontally/vertically using arrows/WASD, direction buttons or by tapping an adjacent cell."
    ],
    [
      "Ein rotes Fallenfeld trifft dich und beendet deinen Lauf für diesen Durchgang. Wer ohne Treffer das grüne Ziel rechts erreicht, bekommt 100 Punkte. Figuren dürfen sich ein Feld teilen.",
      "A red trap hits you and ends your run for this course. Reaching the green goal on the right without a hit scores 100 points. Players may share a cell."
    ],
    [
      "Nach allen Zieleinläufen oder der Laufzeit folgt der nächste Durchgang. Die Bau-Reihenfolge rotiert; Fallen werden neu gebaut. Nach 1–5 eingestellten Durchgängen gewinnt die Gesamtsumme; Gleichstand teilt den Sieg.",
      "After everyone finishes or running time expires, the next course follows. Build order rotates; traps are rebuilt. After 1–5 configured courses, the highest total wins; ties share victory."
    ],
    [
      "Server prüft Bauzug, Treffer, Bewegung und Punkte. Pause hält alle Phasen an. Neuladen erhält Bauphase und Laufposition; alte Durchgangsbefehle werden verworfen.",
      "The server checks build turns, hits, movement and points. Pause stops every phase. Reload preserves build phase and running position; old course commands are rejected."
    ]
  ]
};
const {id,name,description,bauart,maxPlayers}=CONTENT;
export default turnGame(Room,{id,name,description,bauart,category:'party',minPlayers:2,maxPlayers,players:'2–'+maxPlayers+' Spieler',duration:4,art:'<svg class="game-art" viewBox="0 0 240 150" aria-hidden="true">'+CONTENT.art+'</svg>',rules:CONTENT.rules.map(r=>r[0]),createFields:[],events:expeditionEvents});
