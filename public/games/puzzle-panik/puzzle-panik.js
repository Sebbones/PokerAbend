'use strict';
challengeGame({
  "id": "puzzle-panik",
  "name": "Puzzle-Panik",
  "en": "Puzzle Panic",
  "kind": "puzzle",
  "bauart": "B",
  "bg": "#21364e",
  "accent": "#e3c48a",
  "tag": "01 / MOSAIK",
  "description": "Dasselbe Schiebepuzzle für alle: verschiebe die Teile und sei zuerst fertig.",
  "enDescription": "The same sliding puzzle for everyone: shift the tiles and finish first.",
  "hint": [
    "Tippe ein Teil neben der Lücke oder verschiebe die Lücke mit Pfeiltasten/WASD.",
    "Tap a tile beside the blank or move the blank with arrows/WASD."
  ],
  "art": "<g fill=\"#e6cc9a\" stroke=\"#21364e\" stroke-width=\"4\"><rect x=\"48\" y=\"22\" width=\"48\" height=\"48\" rx=\"7\"/><rect x=\"98\" y=\"22\" width=\"48\" height=\"48\" rx=\"7\"/><rect x=\"148\" y=\"22\" width=\"48\" height=\"48\" rx=\"7\"/><rect x=\"48\" y=\"73\" width=\"48\" height=\"48\" rx=\"7\"/><rect x=\"98\" y=\"73\" width=\"48\" height=\"48\" rx=\"7\"/></g><text x=\"71\" y=\"56\" font-size=\"26\" fill=\"#21364e\">1</text><path d=\"m163 96 24 0m-8-8 8 8-8 8\" fill=\"none\" stroke=\"#e6cc9a\" stroke-width=\"4\"/>",
  "rules": [
    [
      "Alle bekommen dasselbe zufällige, lösbare Schiebepuzzle. Standard: 3 × 3, optional 4 × 4.",
      "Everyone gets the same random, solvable sliding puzzle. Default: 3 × 3; optional: 4 × 4."
    ],
    [
      "Nur ein waagerecht oder senkrecht an die Lücke grenzendes Teil lässt sich verschieben. Ziel: Zahlen aufsteigend, Lücke unten rechts.",
      "Only a tile horizontally or vertically beside the blank can move. Goal: ascending numbers, blank at bottom right."
    ],
    [
      "Wer zuerst fertig ist, gewinnt sofort. Nicht Fertige bekommen 100 Punkte je richtig platziertem Zahlenteil; gelöst gibt 10.000 Zusatzpunkte.",
      "The first solver wins immediately. Unfinished players get 100 points per correctly placed numbered tile; solving adds 10,000 points."
    ],
    [
      "Löst bis zum Zeitende niemand, entscheidet dieser Fortschritt. Gleiche Punkte teilen den Sieg; null Punkte ergeben ein Remis.",
      "If nobody solves before time expires, this progress decides. Equal points share victory; zero points is a draw."
    ],
    [
      "Server prüft jeden Zug und die Uhr. Pause und Neuladen bewahren dein eigenes Brett. Zuschauer sehen keine fremden Bretter.",
      "The server checks every move and the clock. Pause and reload preserve your own board. Spectators cannot see other boards."
    ]
  ]
});
