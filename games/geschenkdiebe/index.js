import {Room} from './room.js';
import {turnGame} from '../../server/turn-game.js';
import {expeditionEvents} from '../expedition-room.js';
export const CONTENT={
  "id": "geschenkdiebe",
  "name": "Geschenkdiebe",
  "en": "Gift Thieves",
  "kind": "gifts",
  "bauart": "C",
  "maxPlayers": 8,
  "description": "Sammle Geschenke und stibitze sie deinen Mitspielern in einer gemeinsamen Hofarena.",
  "enDescription": "Collect gifts and swipe them from other players in a shared courtyard arena.",
  "bg": "#3b2e46",
  "accent": "#e8b88d",
  "tag": "03 / PAKETHOF",
  "hint": [
    "Mit Pfeiltasten/WASD oder Stick bewegen. In Blickrichtung nah heran und Stehlen oder Space drücken.",
    "Move with arrows/WASD or the stick. Get close facing a rival, then press Steal or Space."
  ],
  "art": "<g fill=\"#d6ae72\" stroke=\"#f3d2a1\" stroke-width=\"3\"><rect x=\"44\" y=\"54\" width=\"64\" height=\"58\" rx=\"5\"/><rect x=\"132\" y=\"35\" width=\"60\" height=\"60\" rx=\"5\"/></g><path d=\"M76 54v58m-32-37h64m54-40v60m-30-38h60\" stroke=\"#ae6881\" stroke-width=\"8\"/><path d=\"m112 121 39-15m-9-3 9 3-4 10\" stroke=\"#f3d2a1\" stroke-width=\"4\" fill=\"none\"/>",
  "rules": [
    [
      "Alle bewegen sich gleichzeitig in derselben Arena. Lose Pakete werden bei höchstens 28 Einheiten Abstand eingesammelt. Bei gleichzeitigem Kontakt entscheidet erst der Abstand, dann Serverzufall.",
      "Everyone moves simultaneously in the same arena. Loose gifts are collected within 28 units. Simultaneous contact is decided first by distance, then server randomness."
    ],
    [
      "Starte mit 18 losen Geschenken; alle zwei Sekunden kommt eines hinzu, solange weniger als 24 lose Pakete liegen. Namen und mitgeführte Anzahlen sind öffentlich.",
      "Start with 18 loose gifts; one is added every two seconds while fewer than 24 loose gifts remain. Names and carried counts are public."
    ],
    [
      "Stehlen oder Space nimmt dem nächsten Gegner in deiner Blickrichtung bei höchstens 65 Einheiten Abstand genau ein Geschenk ab. Der Gegner muss mindestens eines tragen.",
      "Steal or Space takes exactly one gift from the nearest opponent you face within 65 units. The opponent must carry at least one."
    ],
    [
      "Jeder Versuch lädt 1,1 Sekunden nach. Nach einem Diebstahl ist das Opfer 1,4 Sekunden vor weiteren Diebstählen geschützt; der helle Ring zeigt diesen Schutz.",
      "Every attempt has a 1.1-second cooldown. A theft victim is protected from further theft for 1.4 seconds; the pale ring shows this protection."
    ],
    [
      "Nach Ablauf der Zeit gewinnt, wer die meisten Geschenke behalten hat. Jedes Geschenk ist ein Punkt; gleiche Anzahlen teilen den Sieg. Ohne Geschenke ist es unentschieden.",
      "When time expires, whoever kept the most gifts wins. Each gift is one point; ties share victory. No gifts is a draw."
    ],
    [
      "Bewegung per Pfeiltasten/WASD, Richtungsknöpfen oder virtuellem Stick. Fehlende Eingaben stoppen nach 350 ms. Der Server entscheidet Position, Begegnung und Besitz; Hostpause und Neuladen bleiben erhalten.",
      "Move using arrows/WASD, direction buttons or the virtual stick. Missing input stops after 350 ms. The server decides position, encounters and ownership; host pause and reload are preserved."
    ]
  ]
};
const {id,name,description,bauart,maxPlayers}=CONTENT;
export default turnGame(Room,{id,name,description,bauart,category:'party',minPlayers:2,maxPlayers,players:'2–'+maxPlayers+' Spieler',duration:3,art:'<svg class="game-art" viewBox="0 0 240 150" aria-hidden="true">'+CONTENT.art+'</svg>',rules:CONTENT.rules.map(r=>r[0]),createFields:[],events:expeditionEvents});
