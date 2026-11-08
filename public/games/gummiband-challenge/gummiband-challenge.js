'use strict';
challengeGame({
  "id": "gummiband-challenge",
  "name": "Gummiband-Challenge",
  "en": "Rubber Band Challenge",
  "kind": "band",
  "bauart": "B",
  "bg": "#203e39",
  "accent": "#efcb85",
  "tag": "04 / SPANNWERK",
  "description": "Halte die Spannung im wandernden Zielbereich, ohne dein Band zu zerreißen.",
  "enDescription": "Keep tension inside the moving target zone without snapping your band.",
  "hint": [
    "Dehnen halten oder Leertaste drücken; loslassen entspannt das Band.",
    "Hold Stretch or Space; release to relax the band."
  ],
  "art": "<rect x=\"34\" y=\"42\" width=\"172\" height=\"46\" rx=\"8\" fill=\"#315e4f\"/><rect x=\"96\" y=\"42\" width=\"49\" height=\"46\" fill=\"#89b48a\"/><path d=\"m34 119 88-53 84 53\" stroke=\"#f1cc83\" stroke-width=\"7\" fill=\"none\"/><circle cx=\"122\" cy=\"66\" r=\"10\" fill=\"#f2dfb4\"/>",
  "rules": [
    [
      "Alle spielen gleichzeitig mit einem eigenen Band. Die Zielzone bewegt sich nach derselben zufälligen Kurve für alle.",
      "Everyone plays simultaneously with their own band. The target zone follows the same random curve for everyone."
    ],
    [
      "Dehnen halten oder Leertaste drücken erhöht die Spannung; Loslassen senkt sie. Die Skala geht von 0 bis 100.",
      "Holding Stretch or Space increases tension; releasing decreases it. The scale runs from 0 to 100."
    ],
    [
      "Nur innerhalb der grün markierten Zielzone zählt Zeit. Ab 96 reißt das Band und dein Durchgang endet; gesammelte Zeit bleibt erhalten.",
      "Time counts only inside the green target zone. At 96 the band snaps and your run ends; earned time is retained."
    ],
    [
      "Nach Ablauf der Spielzeit oder wenn alle Bänder gerissen sind, gewinnt die meiste Zielzonenzeit. Gleiche Zeit teilt den Sieg, null ist ein Remis. Die Punkte sind Millisekunden.",
      "When time expires or all bands have snapped, most time in the target zone wins. Equal times share victory; zero is a draw. Points are milliseconds."
    ],
    [
      "Server berechnet Spannung, Zone und Punkte in festen 50-ms-Schritten. Fehlende Eingaben nach 350 ms entspannen; Pause hält alle an. Option: Zielzone wird kleiner.",
      "The server calculates tension, zone and score in fixed 50 ms steps. Missing input after 350 ms relaxes tension; pause stops everyone. Option: shrinking target zone."
    ]
  ]
});
