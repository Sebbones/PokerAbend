'use strict';
challengeGame({
  "id": "kistenchaos",
  "name": "Kistenchaos",
  "en": "Crate Chaos",
  "kind": "crates",
  "bauart": "C",
  "bg": "#34434b",
  "accent": "#e1b475",
  "tag": "03 / FRACHTHOF",
  "description": "Schiebe Kisten in der gemeinsamen Arena auf die nummerierten Ziele deiner Farbe.",
  "enDescription": "Push crates around the shared arena onto the numbered goals of your colour.",
  "hint": [
    "Richtung halten oder Nachbarfeld antippen. Kisten und passende Ziele tragen dieselbe Nummer.",
    "Hold a direction or tap an adjacent cell. Matching crates and goals carry the same number."
  ],
  "art": "<path d=\"M25 115h190M35 85h170\" stroke=\"#b99870\" stroke-width=\"3\"/><g fill=\"#745239\" stroke=\"#e3bc79\" stroke-width=\"3\"><rect x=\"45\" y=\"35\" width=\"65\" height=\"60\" rx=\"4\"/><path d=\"m45 35 65 60m0-60L45 95\"/><rect x=\"123\" y=\"67\" width=\"55\" height=\"47\" rx=\"4\"/></g><path d=\"M147 21h55v38h-55z\" fill=\"none\" stroke=\"#85bcce\" stroke-width=\"4\"/><text x=\"174\" y=\"48\" font-size=\"24\" fill=\"#cbe6e9\">2</text>",
  "rules": [
    [
      "Alle bewegen sich gleichzeitig in einer gemeinsamen zufälligen Kistenarena. Jede Person hat zwei Kisten und passende nummerierte Ziele. Die Anfangsaufgabe ist immer lösbar.",
      "Everyone moves simultaneously in a shared random crate arena. Each player has two crates and matching numbered goals. The initial task is always solvable."
    ],
    [
      "Bewegung ist waagerecht oder senkrecht. Eine Kiste wird geschoben, wenn dahinter Platz ist; Ziehen und Kistenketten sind nicht erlaubt. Alle dürfen alle freien Kisten schieben und dadurch Wege versperren.",
      "Movement is horizontal or vertical. Push a crate if there is space behind it; pulling and pushing crate chains are forbidden. Everyone may push any free crate and block paths."
    ],
    [
      "Kisten auf passenden Zielen werden gesichert und geben ihrem Besitzer je 100 Punkte. Nach der festen Spielzeit gewinnen die meisten richtig platzierten Kisten; Gleichstand teilt den Sieg.",
      "Crates on matching goals are secured and give their owner 100 points each. Most correctly placed crates after the fixed time wins; ties share victory."
    ],
    [
      "Eigene noch freie Kisten können auf ihre Startplätze zurückgesetzt werden, sofern diese leer sind. Gesicherte Kisten bleiben stehen. Spielfiguren dürfen ein Feld teilen, blockieren aber das Ziel einer geschobenen Kiste.",
      "You may reset your own unsecured crates to their starting cells if empty. Secured crates stay put. Players may share a cell but block a crate being pushed into that cell."
    ],
    [
      "Server entscheidet Bewegung, Kollision und Wertung. Pfeiltasten/WASD, Richtungsknöpfe oder Antippen; Zoom vergrößert das intern verschiebbare Feld.",
      "The server decides movement, collisions and scoring. Use arrows/WASD, direction buttons or tapping; Zoom enlarges the internally scrollable board."
    ]
  ]
});
