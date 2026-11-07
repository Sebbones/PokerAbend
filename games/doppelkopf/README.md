# Doppelkopf

Spielbares Kartenspiel für genau vier Personen (Server ist Geber und Schiedsrichter).

- Karten, Trumpfreihenfolgen, Ansagen, Abrechnung und Sonderpunkte: `rules.js`.
- Raum und Ablauf: `room.js` (Vorbehalt → Stichspiel mit Hochzeit-Partnersuche → Abrechnung; Serie mit 4–24 Spielen).
- Spielarten: Normalspiel, Hochzeit, Solos (Damen, Buben, Fleischlos, Kreuz/Pik/Herz/Karo). Ansagen Re/Kontra, keine 90/60/30, schwarz mit Fristen nach Kartenzahl. Sonderpunkte Fuchs, Doppelkopf, Karlchen.
- Varianten (Host-Menü): mit/ohne Neunen, Schweinchen (an/aus).
- Bots in drei Stufen: `bot.js`; sie kennen nur die eigene Hand, die gespielten Karten und öffentlich bekannte Parteien.
- Tests: `rules.test.js` (Node), `ui.spec.js` (Playwright, Desktop und Mobil). Oberfläche: `public/games/doppelkopf/`.

Nicht umgesetzt: Pflichtsolo, Armut, Schmeißen, weitere Turnier-Sonderregeln.
