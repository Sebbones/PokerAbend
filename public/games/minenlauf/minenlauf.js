'use strict';expeditionGame({
  "id": "minenlauf",
  "kind": "mine",
  "de": "Minenlauf",
  "en": "Mine Run",
  "bg": "#26372d",
  "accent": "#C7CFAB",
  "tag": "DIE ZAHLENFURT / THE NUMBER CROSSING",
  "brief": [
    "Finde mit Zahlenhinweisen einen sicheren Weg durchs gemeinsame Minenfeld.",
    "Use number clues to cross the shared hidden minefield safely."
  ],
  "rules": [
    [
      "Alle erhalten dasselbe zufällige 11×7-Feld. Die Minen bleiben auf dem Server. Nur deine aufgedeckten Felder und optionalen Flaggen werden dir angezeigt.",
      "Everyone gets the same random 11×7 field. Mines stay on the server. Only your revealed numbers and optional flags are sent to your browser."
    ],
    [
      "Du startest links und bewegst dich waagerecht oder senkrecht auf benachbarte Felder. Tippe ein Nachbarfeld an oder halte Pfeiltasten/WASD bzw. die Richtungsknöpfe.",
      "Start on the left and move to orthogonally adjacent cells. Tap an adjacent cell or hold arrow keys/WASD or the direction buttons."
    ],
    [
      "Ein sicheres aufgedecktes Feld zeigt die Anzahl der Minen in seinen acht Nachbarfeldern. Ein sicherer Weg von jedem Start links nach rechts ist garantiert; Raten kann nötig sein.",
      "Each safe revealed cell counts mines in its eight neighbours. A safe route from every left-edge start to the right is guaranteed; guessing may be necessary."
    ],
    [
      "Eine Mine lässt dich auf dem vorherigen Feld stehen und zählt einen Fehler. Pro Fehler werden einmalig die eingestellten Strafsekunden zur Zielzeit addiert. Bereits bekannte Minen werden nicht erneut betreten oder bestraft.",
      "A mine keeps you on the previous cell and adds one error. Add the configured penalty seconds once per error to your finish time. Known mines cannot be entered or penalised again."
    ],
    [
      "Bis alle angekommen sind oder die Zeit abläuft, wird weitergespielt. Die niedrigste Zielzeit plus Strafzeit gewinnt, bei gleicher Zeit die geringste Fehlerzahl. Wer nicht ankommt, kann nicht gewinnen.",
      "Play continues until everyone finishes or time expires. Lowest finish time plus penalties wins; equal times favour fewer errors. A player who does not finish cannot win."
    ],
    [
      "Mit Flaggen und mehr Minen sind optionale Hausregeln. Startfeld, Eingaben, Zeit und Ergebnis prüft nur der Server. Pause/Neuladen erhalten Position und private Hinweise. Aussteigen bricht ohne Wertung ab.",
      "Flags and more mines are optional house rules. The server validates starts, inputs, time and results. Pause/reload preserve your position and private clues. Leaving aborts without scoring."
    ]
  ]
});
