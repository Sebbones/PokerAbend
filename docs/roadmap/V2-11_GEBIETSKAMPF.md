
# V2-11: Gebietskampf (Risiko-inspiriert)

Ausdrückliche Freigabe vom 2026-11-07 für den bestehenden Backlog-Eintrag `gebietskampf`. Es wurde kein zweites Risiko-Spiel registriert; `risiko-wuerfeln` bleibt unverändert.

## Eigenständigkeit

- **Karte „Meridia“:** erfundene Welt mit sechs Landmassen (Nordmark, Silberland, Sonnenreich, Perlküste, Eisenland, Inselmeer) und 42 Gebieten mit eigenen Namen. Die kleine Karte hat vier Landmassen und 28 Gebiete. Gebiete, Grenzen und Seewege sind in `games/gebietskampf/map.js` selbst entworfen; ein Test schließt bekannte Vorlagen-Namen aus.
- **Optik:** eigene SVG-Seekarte (keine Bilddateien): Landmassen als weiche Flächen, Gebiete als Spielsteine mit Besitzerfarbe, Symbol (●▲■◆★✚) und Truppenzahl. Keine Original-Karte, keine Logos, keine Originaltexte; Kartensymbole sind Fahne, Schild und Fackel.

## Regeln

- **Verstärkung:** Gebiete ÷ 3 (mindestens 3) plus Landmassen-Bonus (Nordmark 4, Silberland 3, Sonnenreich 4, Perlküste 4, Eisenland 3, Inselmeer 4).
- **Angriff:** bis zu 3 Angriffs- gegen bis zu 2 Abwehrwürfel, höchste Würfel zuerst, Gleichstand gewinnt die Verteidigung. Alle Würfe fallen serverseitig (`rules.attack`), der Client schickt nur Gebiete und Würfelzahl; „Blitz“ wiederholt den Angriff auf dem Server.
- **Eroberung:** mindestens so viele Truppen wie Würfel ziehen nach, danach wahlweise weitere; wer ein Gebiet erobert hat, zieht am Zugende eine Karte. Wer ausscheidet, gibt seine Karten ab.
- **Karten:** 42 Gebietskarten (Symbol je Gebiet) plus 2 Joker. Satz = dreimal gleich, dreimal verschieden oder mit Joker. Tauschwert steigend (4, 6, 8, 10, 12, 15, dann +5) oder fest (6); eigenes Gebiet auf einer Karte gibt +2 Truppen. Ab fünf Karten ist Tauschen Pflicht.
- **Verschieben:** einmal am Zugende, nur über zusammenhängende eigene Gebiete, eine Truppe bleibt zurück.
- **Sieg:** Weltherrschaft; Variante „Geheime Missionen“ (zwei Landmassen, 24/16 Gebiete, 16/11 Gebiete mit mindestens zwei Truppen, oder einen bestimmten Gegner besiegen – wird er von jemand anderem besiegt, wird das Ziel zu „Gebiete besitzen“). Missionen stehen nur in der eigenen Ansicht.
- **Aufbau:** 2–6 Spieler; Truppen je Spieler 40/35/30/25/20 (kleine Karte 28/24/20/17/14), zufällig auf die eigenen Gebiete verteilt.

## Plattform

- **Bots:** Stufen leicht, mittel und schwer über den bestehenden Worker-Bot-Dienst (`games/gebietskampf/bot.js`); der Bot sieht nur die Ansicht eines Spielers (keine fremden Karten oder Missionen). Alle werden mit der Zeit mutiger, damit keine Partie ewig stehen bleibt.
- **Reconnect und Neustart:** Der Zustand ist reines JSON. Der Raum meldet `persistMidGame`, deshalb speichert `server/index.js` ihn auch mitten im Spiel in `rooms.json`; nach einem Neustart läuft das Spiel mit Zug, Verstärkung, Karten und Missionen weiter. Reconnect mitten im Zug zeigt denselben Stand.
- **Zug-Timer:** Standard 180 s; bei Ablauf wird die Verstärkung sicher gesetzt und der Zug ohne Angriff beendet.
- **Aussteiger:** Wer geht, hinterlässt neutrale Gebiete, die Truppen bleiben stehen.
- **Bedienung:** Gebiet antippen statt ziehen (auch per Tastatur: Tab, Enter), Zoom-Knöpfe und Scrollen auf dem Handy, 44-px-Ziele, Besitzer zusätzlich durch Symbol und Zahl.

## Nachweise

Siehe `plan.json` (V2-11): Node-Tests `test/gebietskampf.test.js` (Karte, Aufbau, Verstärkung, Kampf, Eroberung, Kartentausch, Verschieben, Missionen, Bots, Speicherstand, Bot-Partien bis zum Ende), Playwright `test/ui/gebietskampf.spec.js` (Desktop und Mobil) und Screenshots unter `docs/design/screenshots/gebietskampf/`.

Nicht Teil dieses Pakets: Produktivdeployment, Online-Test mit Safari-Geräten über Playwright hinaus, eine visuelle Ausarbeitung über die funktionale Seekarte hinaus (VIS-090 bleibt `planned`).
