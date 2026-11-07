'use strict';expeditionGame({
  "id": "schubsarena",
  "kind": "push",
  "de": "Schubsarena",
  "en": "Shove Arena",
  "bg": "#36231e",
  "accent": "#E9C38D",
  "tag": "DER SCHUBSRING / THE SHOVE RING",
  "brief": [
    "Schubse deine Gegner von der schrumpfenden Plattform – und halte selbst das Gleichgewicht.",
    "Push opponents off the shrinking platform and keep your own balance."
  ],
  "rules": [
    [
      "Alle bewegen sich gleichzeitig auf einer runden, schrumpfenden Plattform. Pfeiltasten/WASD oder gehaltene Richtungsknöpfe steuern die Figur.",
      "Everyone moves simultaneously on a round, shrinking platform. Use arrow keys/WASD or hold the direction buttons."
    ],
    [
      "Ein Stoß trifft nahe Gegner vor deiner Blickrichtung. Danach lädt der Stoß 1,1 Sekunden. Leertaste oder Stoß-Knopf auslösen.",
      "Push hits nearby opponents in front of your facing direction. It recharges for 1.1 seconds. Use Space or the Push button."
    ],
    [
      "Wer mit seinem Mittelpunkt außerhalb der Plattform landet, scheidet aus. Bewegung, Berührung, Rückstoß und Plattformgröße berechnet nur der Server.",
      "If your centre leaves the platform, you are eliminated. Only the server computes movement, contact, knockback and shrinking."
    ],
    [
      "Die letzte allein verbliebene Person gewinnt. Fallen die letzten gleichzeitig oder bleiben bei Zeitablauf mehrere übrig, ist die Runde unentschieden.",
      "The sole last survivor wins. If the last players fall simultaneously or several remain at timeout, the round is a draw."
    ],
    [
      "Spielzeit, rutschiges Eis und wachsende Stoß-Kraft sind einstellbar. Gemeinsame Pause und Neuladen erhalten die laufende Runde. Aussteigen bricht ohne Wertung ab.",
      "Time, slippery ice and growing push strength are configurable. Shared pause and reload preserve the round. Leaving aborts without scoring."
    ]
  ]
});
