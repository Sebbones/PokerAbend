# Skat

Spielbares Kartenspiel für genau drei Personen (Server ist Geber und Schiedsrichter).

- Regeln, Reizen, Spielwert und Abrechnung: `rules.js` (Skatordnung: gewonnen Wert + 50, verloren −2 × Wert − 50, Gegner je +30, Überreizen verliert).
- Raum und Ablauf: `room.js` (Reizen → Skat/Hand → Drücken → Ansage → Stichspiel → Abrechnung; Serie mit 3–36 Spielen).
- Varianten (Host-Menü): Ramsch bei allen Passen (an/aus; sonst Einwerfen oder Vorhand spielt), Bockrunden (an/aus; Auslöser: verlorenes Spiel oder 60:60, drei Bockspiele doppelt).
- Bots in drei Stufen: `bot.js` (leicht: zufällig; mittel: Handbewertung; schwer: Handbewertung und Kartenzählen).
- Tests: `rules.test.js` (Node), `ui.spec.js` (Playwright, Desktop und Mobil). Oberfläche: `public/games/skat/`.

Nicht umgesetzt: Kontra/Re, Seeger-Fabian-Wertung, Schieben beim Ramsch.
