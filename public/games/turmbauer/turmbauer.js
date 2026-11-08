'use strict';
workshopGame({
  "id": "turmbauer",
  "name": "Turmbauer",
  "en": "Tower Builder",
  "kind": "tower",
  "bauart": "B",
  "maxPlayers": 10,
  "description": "Stoppe bewegte Blöcke auf deinem eigenen Turm und halte die Auflagefläche zusammen.",
  "enDescription": "Stop moving blocks on your own tower and preserve their overlap.",
  "bg": "#3e3638",
  "accent": "#e8bf82",
  "tag": "01 / STAPELATELIER",
  "hint": [
    "Tippe auf den Turm, drücke den Knopf oder Space. Nur die Überlappung bleibt stehen.",
    "Tap the tower, press the button or Space. Only the overlap stays."
  ],
  "art": "<g fill=\"#b77c52\" stroke=\"#efcf9b\" stroke-width=\"3\"><path d=\"M48 116h144V94H48zM63 92h129V70H63zM77 68h115V46H77z\"/><path d=\"M36 22h115v21H36z\" fill=\"#ead3a2\"/></g><path d=\"m166 30 34 0m-9-8 9 8-9 8\" fill=\"none\" stroke=\"#ead3a2\" stroke-width=\"4\"/>",
  "rules": [
    [
      "Alle bekommen dieselbe zufällige Folge bewegter Blöcke auf einem eigenen Turm. Es spielen 2–10 Personen gleichzeitig.",
      "Everyone gets the same random sequence of moving blocks on their own tower. 2–10 people play simultaneously."
    ],
    [
      "Ein Tipp oder Space setzt den aktuellen Block an seiner Serverposition ab. Nur die waagerechte Überlappung mit dem obersten Block bleibt als nächste Auflagefläche.",
      "A tap or Space places the current block at its server position. Only horizontal overlap with the top block remains as the next supporting surface."
    ],
    [
      "Weniger als acht Einheiten Überlappung beendet deinen Turm; die bereits erreichte Höhe bleibt. Zwischen Blöcken gibt es 250 ms Pause.",
      "Less than eight units of overlap ends your tower; its height is retained. There is a 250 ms pause between blocks."
    ],
    [
      "Nach der eingestellten Zeit gewinnt der höchste gültige Turm. Jede erfolgreiche Lage zählt einen Punkt. Gleichstand teilt den Sieg; ohne Lage ist es unentschieden. Maximal 60 Lagen.",
      "When the configured time expires, the tallest valid tower wins. Each successful layer scores one point. Ties share victory; no layers is a draw. Maximum 60 layers."
    ],
    [
      "Die anderen sehen nur deine Höhe, nie deinen Turm oder künftige Blöcke. Zeit, Position und Überlappung prüft der Server. Hostpause und Neuladen bewahren deinen Stand.",
      "Others see only your height, never your tower or future blocks. The server checks time, position and overlap. Host pause and reload preserve your state."
    ]
  ]
});
