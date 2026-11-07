'use strict';expeditionGame({
  "id": "scheinwerfer-flucht",
  "kind": "spotlight",
  "de": "Scheinwerfer-Flucht",
  "en": "Spotlight Escape",
  "bg": "#15252f",
  "accent": "#EAD18D",
  "tag": "NACHTAUSGANG / NIGHT EXIT",
  "brief": [
    "Bleib im Dunkeln kühl, sammle Schlüssel im Licht und entkomme zuerst.",
    "Stay cool in darkness, collect keys in light and escape first."
  ],
  "rules": [
    [
      "Ein wandernder Scheinwerfer beleuchtet die Arena. Alle bewegen sich gleichzeitig mit Pfeiltasten/WASD oder gehaltenen Richtungsknöpfen.",
      "A moving spotlight scans the arena. Everyone moves simultaneously with arrow keys/WASD or held direction buttons."
    ],
    [
      "Im Licht steigt deine Hitze um 55 je Sekunde, im Dunkeln fällt sie um 35. Bei 100 scheidest du aus.",
      "Heat rises by 55 per second in light and cools by 35 per second in darkness. At 100 you are eliminated."
    ],
    [
      "Acht Schlüsselstellen liegen auf dem Lichtweg. Ein Schlüssel lässt sich nur einsammeln, solange er beleuchtet ist. Jede Person kann jede Stelle einmal einsammeln; fremde Funde nehmen dir nichts weg.",
      "Eight key sites lie on the light path. Collect a key only while it is lit. Each person can collect each site once; other players cannot take your keys."
    ],
    [
      "Mit genügend Schlüsseln zum Ausgang rechts laufen. Wer zuerst entkommt, gewinnt; bei exakt gleichzeitiger Ankunft teilen sich die Personen den Sieg. Ohne Flucht bis Zeitablauf gibt es keinen Gewinner.",
      "Reach the exit on the right with enough keys. The first escape wins; arrivals in the same server step share victory. No escape before timeout means no winner."
    ],
    [
      "Standard: zwei Schlüssel. Spielzeit, benötigte Schlüssel, zwei Lichter und schneller werdendes Licht sind einstellbar. Der Server berechnet alles; Pause/Neuladen erhalten die Runde. Aussteigen bricht ohne Wertung ab.",
      "Default: two keys. Time, required keys, two lights and accelerating light are configurable. The server computes everything; pause/reload preserve the round. Leaving aborts without scoring."
    ]
  ]
});
