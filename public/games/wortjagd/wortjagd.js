'use strict';
challengeGame({
  "id": "wortjagd",
  "name": "Wortjagd",
  "en": "Word Hunt",
  "kind": "words",
  "bauart": "B",
  "bg": "#294238",
  "accent": "#d4ba7d",
  "tag": "02 / WORTGARTEN",
  "description": "Finde Wörter im gemeinsamen Buchstabenfeld; doppelte Funde zählen für niemanden.",
  "enDescription": "Find words in the shared letter field; words found by multiple players score for nobody.",
  "hint": [
    "Tippe benachbarte Buchstaben oder gib ein Wort ein. Die gewählte Wortsprache gilt für alle.",
    "Tap adjacent letters or type a word. The chosen dictionary language applies to everyone."
  ],
  "art": "<g fill=\"#e7d9b9\" stroke=\"#294238\" stroke-width=\"4\"><rect x=\"39\" y=\"25\" width=\"52\" height=\"48\" rx=\"5\"/><rect x=\"94\" y=\"25\" width=\"52\" height=\"48\" rx=\"5\"/><rect x=\"149\" y=\"25\" width=\"52\" height=\"48\" rx=\"5\"/><rect x=\"67\" y=\"78\" width=\"52\" height=\"48\" rx=\"5\"/><rect x=\"122\" y=\"78\" width=\"52\" height=\"48\" rx=\"5\"/></g><g fill=\"#294238\" font-size=\"29\" text-anchor=\"middle\"><text x=\"65\" y=\"59\">W</text><text x=\"120\" y=\"59\">O</text><text x=\"175\" y=\"59\">R</text><text x=\"93\" y=\"111\">T</text><text x=\"148\" y=\"111\">?</text></g>",
  "rules": [
    [
      "Alle sehen dasselbe 4 × 4-Buchstabenfeld und haben genau 60 Sekunden. Der Host wählt vorab Deutsch oder Englisch als Wörterbuch. Die Oberflächensprache ändert das Wörterbuch nicht.",
      "Everyone sees the same 4 × 4 letter field and has exactly 60 seconds. The host first chooses German or English as dictionary. Interface language does not change the dictionary."
    ],
    [
      "Wörter verbinden waagerecht, senkrecht oder diagonal benachbarte Felder. Kein Feld darf im selben Wort zweimal vorkommen. Mindestens drei Buchstaben.",
      "Words connect horizontally, vertically or diagonally adjacent cells. No cell may be reused within one word. Minimum three letters."
    ],
    [
      "Länge 3–4: 1 Punkt, 5: 2, 6: 3, 7: 5, ab 8: 11. Wörter, die mehrere Spieler gefunden haben, zählen für niemanden. Eigene Wiederholungen zählen nie erneut.",
      "Length 3–4: 1 point, 5: 2, 6: 3, 7: 5, 8 or more: 11. Words found by multiple players score for nobody. Your own repeats never count again."
    ],
    [
      "Server prüft jedes Wort mit freien lokalen Wortlisten und sucht seinen Feldpfad. Groß-/Kleinschreibung ist egal, ß wird SS. Ä, Ö und Ü sind eigene Buchstaben. Nicht jedes sprachlich denkbare Wort ist enthalten.",
      "The server checks each word against free local word lists and finds its board path. Case is ignored; ß becomes SS. Ä, Ö and Ü are separate letters. Not every conceivable word is included."
    ],
    [
      "Funde bleiben bis zum Ende privat; die Schlussliste zeigt gestrichene Doppelwörter. Optionen: Doppelwörter zählen, 5 × 5, Mindestlänge vier. Bis zu 128 Wörter pro Spieler.",
      "Finds remain private until the end; the final list shows crossed-out duplicates. Options: count duplicates, 5 × 5, minimum length four. Up to 128 words per player."
    ]
  ]
});
