'use strict';expeditionGame({
  "id": "labyrinth-chaos",
  "kind": "maze",
  "de": "Labyrinth-Chaos",
  "en": "Maze Chaos",
  "bg": "#172f38",
  "accent": "#B9DDDC",
  "tag": "DAS WANDWERK / THE WALLWORKS",
  "brief": [
    "Wechselnde Wände, wachsende Irrgärten – erreiche den Ausgang vor den anderen.",
    "Changing walls and growing mazes: race to the exit across several courses."
  ],
  "rules": [
    [
      "Alle laufen gleichzeitig durch dasselbe zufällige Labyrinth. Start oben links, Ausgang unten rechts. Antippen benachbarter Felder oder Pfeiltasten/WASD bzw. Richtungsknöpfe halten.",
      "Everyone races through the same random maze. Start at the top left; exit at the bottom right. Tap adjacent cells or hold arrow keys/WASD or the direction buttons."
    ],
    [
      "In regelmäßigen Abständen öffnen und schließen einzelne Wände. Ein durchgehender Grundweg bleibt immer offen: Jeder Zustand ist lösbar, niemand wird von einer Wand eingeschlossen.",
      "Individual walls open and close regularly. A connected base route always stays open: every state is solvable and a changing wall cannot trap a player."
    ],
    [
      "Wer zuerst herauskommt, bekommt am meisten Punkte: Spielerzahl × 100, danach je 100 weniger. Exakt gleichzeitige Ankünfte teilen denselben Rang; nicht Angekommene bekommen null.",
      "First escape scores the most: player count × 100, then 100 fewer per rank. Exact simultaneous arrivals share a rank; unfinished players score zero."
    ],
    [
      "Es gibt 2–5 Durchgänge, Standard drei. Das erste Feld ist 11×7, jedes weitere wird um zwei Zeilen und Spalten größer. Zwischen Durchgängen liegt eine kurze gemeinsame Pause.",
      "There are 2–5 courses, default three. The first maze is 11×7; each next course adds two rows and columns. A short shared break separates courses."
    ],
    [
      "Durchgangszeit und Wandwechsel sind einstellbar. Nach allen Durchgängen gewinnt die höchste Gesamtpunktzahl; Gleichstände teilen den Sieg.",
      "Course duration and wall-change time are configurable. Highest total after all courses wins; ties share victory."
    ],
    [
      "Der Server prüft jeden Wegschritt und jede Wand. Zoom vergrößert nur die Darstellung. Pause/Neuladen erhalten den laufenden Durchgang; Aussteigen bricht ohne Wertung ab.",
      "The server checks every step and wall. Zoom affects only display. Pause/reload preserve the current course; leaving aborts without scoring."
    ]
  ]
});
