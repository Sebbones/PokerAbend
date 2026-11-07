# V2-12: Städtehandel (Hexfeld-Aufbauspiel)

Ausdrückliche Freigabe vom 2026-11-07 für den bestehenden Backlog-Eintrag `staedtehandel`. Der Eintrag wurde aus `games/planned.js` entfernt und durch das spielbare Spiel `games/staedtehandel/` ersetzt; es wurde kein zweites Siedler-Spiel registriert. Die technische ID `staedtehandel` ist unverändert, der endgültige Produktname lautet **Städtehandel** (ohne Fremdmarke im Namen).

## Eigenständigkeit

- **Insel „Aurelia“:** erfundene Insel aus 19 Sechsecken (große Variante: 30). Landschaften mit eigenen Namen und Rohstoffen: Wald → Holz, Tongrube → Ton, Weide → Wolle, Acker → Korn, Gebirge → Kupfer, dazu eine Düne ohne Ertrag. Entwicklungskarten: Ritter, Bauwerk, Straßenbau, Erfindung, Handelsmonopol. Auszeichnungen: „längste Handelsstraße“ und „größte Rittermacht“.
- **Optik:** vollständig eigene SVG-Zeichnung (keine Bilddateien): Sechsecke mit Landschaftssymbol und Zahlenchip samt Wahrscheinlichkeitspunkten, Häfen als Zahlenmarke an der Küste, Räuber als dunkle Figur, Straßen, Siedlungen und Städte in Spielerfarbe mit zusätzlichem Symbol (●▲■◆★✚). Keine Original-Grafiken, -Namen, -Logos oder -Texte; die Regeltexte sind selbst formuliert. Spielmechanik ist nicht urheberrechtlich geschützt; vor einer öffentlichen Vermarktung bleibt eine rechtliche Namens- und Markenprüfung wie bei jedem Produkt ratsam.

## Regeln

- **Aufbau:** reihum eine Siedlung mit Straße, dann rückwärts noch einmal; die zweite Siedlung bringt je einen Rohstoff der angrenzenden Felder. Abstandsregel (keine Siedlung neben einer Siedlung), die Straße muss an die neue Siedlung anschließen.
- **Feld:** zufällig (rote Zahlen 6 und 8 grenzen nie aneinander) oder festes Einsteigerfeld (nur 3–4 Spieler). Häfen liegen gleichmäßig verteilt an der Küste (4 × 3:1 und fünf Spezialhäfen 2:1; große Variante 6 + 5).
- **Ertrag:** zwei Würfel auf dem Server; Siedlung 1, Stadt 2 Rohstoffe. Der Räuber blockiert sein Feld. Reicht der Vorrat der Bank nicht, bekommt ein einzelner Empfänger den Rest, mehrere Empfänger gehen leer aus.
- **Bauen:** Straße (Holz, Ton), Siedlung (Holz, Ton, Wolle, Korn), Stadt (2 Korn, 3 Kupfer, nur auf eigener Siedlung), Entwicklungskarte (Wolle, Korn, Kupfer). Bauteile begrenzt (15 Straßen, 5 Siedlungen, 4 Städte); Straßen schließen nur an eigene Straßen oder Gebäude an, fremde Gebäude unterbrechen sie.
- **Die Sieben:** Wer mehr als 7 Karten hält, wirft die Hälfte ab (jeder gleichzeitig, auch außerhalb des eigenen Zuges); der Würfler setzt den Räuber um und stiehlt eine zufällige Karte von einem angrenzenden Mitspieler.
- **Handel:** Spielerhandel als Angebot an alle mit Annahme/Ablehnung durch die anderen; der Anbieter wählt den Partner und bestätigt. Bank 4:1, allgemeiner Hafen 3:1, Spezialhafen 2:1. Höchstens 8 Angebote pro Zug.
- **Entwicklungskarten:** eine Karte pro Zug, nie am Kaufzug; Ritter dürfen auch vor dem Würfeln gespielt werden. Bauwerke zählen verdeckt.
- **Auszeichnungen:** längste Handelsstraße ab 5 zusammenhängenden Abschnitten (längster einfacher Weg, Verzweigungen und Kreise korrekt, Gleichstand behält der Halter), größte Rittermacht ab 3 gespielten Rittern; je 2 Punkte.
- **Sieg:** Siedlung 1, Stadt 2 Punkte plus Auszeichnungen und verdeckte Bauwerke; wer im eigenen Zug das Ziel (Standard 10, einstellbar 6–14) erreicht, gewinnt – auch zu Beginn des Zuges, wenn die Punkte im fremden Zug entstanden sind.
- **Spieler:** 3–4 Spieler auf dem Standardbrett, 5–6 Spieler als Variante „Groß-Aurelia“ (30 Felder, größerer Vorrat, mehr Entwicklungskarten). Die falsche Spielerzahl für das gewählte Brett wird beim Start abgelehnt.

## Plattform

- **Bots:** drei Stufen (leicht, mittel, schwer) über den vorhandenen Worker-Bot-Dienst (`games/staedtehandel/bot.js`). Der Bot sieht nur die Ansicht eines Spielers. Er setzt, würfelt, baut, handelt mit Bank und Häfen, macht und beantwortet Spielerangebote und wirft bei einer Sieben ab (auch außerhalb seines Zuges, über `botDue()`). Ein Bot-Angebot verfällt nach 25 s, damit niemand ewig wartet.
- **Neustart-fest:** Der Spielstand ist reines JSON; der Raum meldet `persistMidGame` und wird mitten im Spiel in `rooms.json` gespeichert. Der Server-Test startet einen echten Server neu und spielt danach weiter. `server/index.js` speichert dazu auch beim geordneten Beenden (`saveNow`) mitten im Spiel; die Änderung am Quell-Hash im V2-13/V2-14-Nachweis ist dort vermerkt (`v2_12_update`).
- **Reconnect:** Die Ansicht enthält alles, was ein Spieler sehen darf (Brett, eigene Hand, offenes Angebot, Pflicht zum Abwerfen); Neuladen mitten im Zug zeigt denselben Stand.
- **Zug-Timer:** Standard 180 s pro Schritt (0 = aus). Bei Ablauf entscheidet ein sicherer Ersatzzug (Aufbau: ein Platz, sonst Zug zu Ende); beim Abwerfen wird automatisch abgeworfen.
- **Aussteiger:** Wer geht, gibt seine Karten an die Bank; Gebäude und Straßen bleiben als Hindernisse stehen, der Rest spielt weiter.

## Sicherheit und Geheimhaltung

- Würfe, Kosten, Baurechte, Handelsprüfung, Ziehen vom Stapel und Stehlen laufen ausschließlich im Server (`games/staedtehandel/rules.js`). Der Client schickt nur Plätze und Mengen.
- Rohstoffe, Entwicklungskarten und der Kartenstapel verlassen den Server nie: Mitspieler sehen nur Kartenzahlen, Zuschauer weder Hand noch Bauplätze; verdeckte Bauwerke zählen erst am Rundenende offen. Was gestohlen wurde, sehen nur Dieb und Opfer.
- Angebote tragen eine laufende Nummer; Annahme und Bestätigung prüfen Nummer, Beteiligte und die Rohstoffe zum Zeitpunkt der Bestätigung. Nur der Anbieter bestätigt, ein Angebot lässt sich nicht wiederholen, Zuschauer und Fremde sind wirkungslos. Eingaben werden streng bereinigt (nur bekannte Rohstoffe, ganze Zahlen).
- Bots dürfen ausschließlich die in `server/bot-observation.js` freigegebenen Methoden aufrufen.

## Nachweise

Siehe `plan.json` (V2-12): Node-Tests `test/staedtehandel.test.js` (Brett, Aufbau, Ertrag, Bauregeln, längste Straße, Räuber und Abwurf, Handel inklusive Betrugsversuchen, Entwicklungskarten, Sieg, Geheimhaltung, Bots, Bot-Partien bis zum Sieg, Speicherstand) und `test/staedtehandel-server.test.js` (echter Serverneustart mitten im Spiel), Playwright `test/ui/staedtehandel.spec.js` (Desktop und Mobil: Aufbau per Antippen, Würfeln, Handelsangebot, Zuschauer, Pause, Reconnect, Zoom, sechs Größen, Antippziele ≥ 44 px, großes Brett, Englisch) und Screenshots unter `docs/design/screenshots/staedtehandel/`.

## Grenzen

- Keine Seefahrer-, Städte-&-Ritter- oder Handelsrouten-Erweiterungen; keine Gegenangebote und keine Angebote an einzelne Spieler (offen an alle).
- Die Insel hat eine funktionale, aber noch keine individuell ausgearbeitete Optik: **VIS-089 bleibt `planned`** (jetzt spielbar, visuell ausstehend). Keine Würfel- oder Ertragsanimation.
- Verlaufs- und Logtexte sind deutsch (wie bei den anderen Spielen); Oberfläche und Regeln sind zweisprachig.
- Computergegner gelten wie bei den anderen Spielen als „nicht gewertet“. Kein Produktivdeployment, keine Datenmigration.
