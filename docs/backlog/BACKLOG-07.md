# BACKLOG-07 – Vier PartyRoom-Spiele

Umgesetzt auf `main` am 07.11.2026: `2eb4b136683f8c8d363540e02269108a71aa936d`. Freigegeben sind ausschließlich **Jäger & Schatten, Infektionsjagd, Letzter Schutzplatz und Regelwahnsinn**. Keine V2-Pakete. Danach stoppen. Die historische Rubrik enthält weiter 41 Spiele: **23 verifiziert, 18 offen**. Insgesamt sind 77 Raumspiele und zwölf lokale Einzelspieler registriert.

Der Nachlauf `9c09e88980fe6cde8674e3fb691026af839259b1` ergänzt die vier IDs in der vorhandenen Szenenregistrierung und übersetzt die laufenden Arena-Beschriftungen (Status, Punkte, Ausscheiden und eigene Figur).

`630805a922620574828991de86c1c44d11a820d1` begrenzt das laufende Punkte-Update auf die tatsächliche Punktezeile. Bot-Abzeichen innerhalb des Spielernamens werden dadurch nicht überschrieben; der Browsertest prüft „Bot · Medium“ nach tatsächlicher Bewegung.

## Regeln und Entscheidungen

- **Jäger & Schatten (2–8):** Zufällig `max(1, floor(Spielerzahl / 3))` Jäger, übrige Schatten. Gleichzeitige Bewegung; Berührung entdeckt einen Schatten, der anschließend zuschaut. Alle entdeckt: Jäger gewinnen. Zeit abgelaufen: nur entkommene Schatten gewinnen.
- **Infektionsjagd (3–12):** Genau eine zufällige Startinfektion. Berührung steckt an; die neu infizierte Person kann ab dem nächsten Serverschritt anstecken. Vollständige Infektion: infiziertes Team gewinnt. Sonst gewinnen bei Zeitablauf die Überlebenden.
- **Letzter Schutzplatz (2–12):** Sichtbare sichere Kreise, zunächst Spielerzahl minus eins. Bei Fristablauf scheiden Figuren mit Mittelpunkt außerhalb aller Kreise aus. Danach ein Kreis weniger, mindestens einer, mit neuer Auswahl. Der Eintrag begrenzt die Belegung nicht: Mehrere Personen dürfen einen Schutzplatz teilen. Eine verbleibende Person gewinnt sofort; am Gesamtzeitlimit wird nochmals die Gefahr geprüft, sichere Überlebende teilen den Sieg. Niemand übrig: unentschieden.
- **Regelwahnsinn (3–12):** Offene Grundzahl mit Punkten, Farbe und Form. In Runde eins keine Zusatzregel, anschließend je eine weitere sichtbare Regel; alle bisherigen bleiben aktiv. Zuerst alle Rechenregeln in angezeigter Reihenfolge, danach angeforderte Wörter in Regelreihenfolge. Deutsche und englische Antworten sind gleichwertig. Richtig: 100 Punkte; falsch oder fehlend: null. Höchste Summe gewinnt, Gleichstände teilen den Sieg. Acht eigene Regeln ermöglichen 1–9 Runden.

Echtzeit: Gesamtzeit 10–180 Sekunden, Standard 60; Schutzplatz-Frist 3–15 Sekunden, Standard acht. Regelwahnsinn: Antwortzeit 10–120, Auflösung 3–30 Sekunden. Einstellungen werden über die bestehenden serverseitigen Host-/Optionsprüfungen gesetzt. Bewegungen sind bei allen gleich schnell; keine Sprünge oder clientseitigen Würfel.

## Architektur und Datenschutz

Alle vier Räume erben von **PartyRoom**. Die drei Arenen teilen nur ihre neue zeitbasierte Bewegung und Kontaktauflösung. Vorhandene Raum-Spieler-IDs, RoomClock, Hostpause, Reconnect, Botsteuerung, Ergebnisablage und Bestenlisten-Ausschlüsse für Bots bleiben erhalten. Jäger/Infektion sind wegen ihrer eigenen gegnerischen Geheimteams vom Team-Duell ausgeschlossen; Playlists/Mix/Turnier bleiben möglich.

Rollenverteilung und Infektionswechsel liegen ausschließlich auf dem Server. Jede persönliche Ansicht und jeder laufende Arena-Frame enthält genau die eigene Rolle; Zuschauer bekommen `null`. Öffentliche Körper enthalten Position, Zustand und Punkte, niemals fremde Rolle oder Team. Figurenfarben identifizieren nur Spieler. Andere Arenen behalten ihre bisherige gemeinsame öffentliche Frame-Verteilung. Bots verwenden dieselbe eigene Rolle und dieselben sichtbaren Positionen wie Menschen. Regelwahnsinn veröffentlicht fremde Antworten und Lösungen erst zur Auflösung.

Rundenschlüssel, Sequenznummern, erlaubte Richtungen und Teilnehmerstatus werden serverseitig geprüft. Alte Eingaben, Zuschauerbewegungen, Sprünge und manipulierte Positionen/Rollen werden abgewiesen oder ignoriert. Fehlende Bewegungsnachrichten lassen die Figur nach kurzer Frist stehen. Eine gemeinsame Pause friert Uhren und Eingaben ein. Aussteigen bricht eine Echtzeitrunde ohne erfundenen Teamsieg ab.

**Reconnect bedeutet hier Browser-Reload innerhalb derselben laufenden Serverpartie:** Rolle, Position, Aufgabe und bereits bestätigte eigene Antwort bleiben erhalten. Ein Serverneustart verwendet die bestehende Wiederherstellung zwischen Runden; eine laufende Arena wird nicht als fortsetzbarer Server-Snapshot behauptet.

Alle vier Spiele haben optionale Testrunden-Bots mit **einer** ehrlichen Standardstufe, entsprechend „Nur eine Stufe verfügbar“. Kein neuer Schwierigkeitsgrad-Auftrag und keine behaupteten Gewinnquoten.

## Oberfläche und Nachweise

Eigene inline gezeichnete SVG-Lobbys und Canvas-/CSS-Szenen: Nachtwache, Quarantänefeld, Sturmwarnung und Papier-Regelpult. Keine fremden Bilder, Logos, 3D-Funktionen oder neue Buildpipeline. Regeln und eigene Spieltexte sind DE/EN, Bewegung über Pfeiltasten/WASD oder gehaltene Touchknöpfe, Antworten über Tastatur/Touchformular.

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| Neue Regeln und bestehender Programm-Kern | 19 bestanden, davon 14 neue Regeltests; 300 vollständige Arena-Botrunden und 100 vollständige Regelwahnsinn-Botpartien |
| Neue Browserfälle Desktop + Handy | 8 bestanden; drei getrennte Kontexte, private Rollen/Antworten und Zuschauer, Pause/Reload, legale Bewegung, englische Regeln, reguläre Ergebnisse |
| Finaler Nachlauf mit englischen Live-Anzeigen und Bot-Abzeichen | 8 bestanden, 0 fehlgeschlagen/übersprungen, 189,457 s; `artifacts/backlog07-ui-verified-report.json` |
| Breite Browserregression | 66 bestanden, 0 fehlgeschlagen/übersprungen, 484,843 s: neue Spiele, bestehende Echtzeitspiele, Bots, Abendprogramme und englische Oberflächen des gesamten Raumspielkatalogs; `artifacts/backlog07-ui-final-report.json` |
| Abschließende Regel-/Nachweisprüfung einschließlich BACKLOG-03/04 | 116 bestanden, 0 fehlgeschlagen/übersprungen, 24,112 s; `node --test test/backlog07.test.js test/backlog07-proof.test.js test/game-visual-roadmap.test.js test/new-games.test.js` |
| Vollständiger finaler Node-Lauf | 1481 Fälle: **1478 bestanden, 0 fehlgeschlagen, 3 übersprungen**, 270,700 s; `node --test --test-concurrency=2 test/*.test.js`, `artifacts/backlog07-final-node.log` |

Die Desktopfälle prüfen zusätzlich 1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450 ohne horizontales Seitenüberlaufen. Mobile Bewegung erfolgt über echte Touchereignisse. Jeder Manifest-Eintrag enthält den SHA-256 der aufgenommenen Originaldatei und LF-normalisierte Quellhashes:

- [Jäger & Schatten](../../games/jaeger-schatten/evidence.json)
- [Infektionsjagd](../../games/infektionsjagd/evidence.json)
- [Letzter Schutzplatz](../../games/letzter-schutzplatz/evidence.json)
- [Regelwahnsinn](../../games/regelwahnsinn/evidence.json)

Der vollständige Node-Lauf verwendet eine isolierte Kopie des tatsächlich committeten `main` bei `630805a` mit ausschließlich den zusätzlichen Nachweisen dieses Päckchens. Die parallelen V2-06-Rücknahmen und laufenden fremden Spielweltänderungen wurden nicht hineinkopiert und bleiben im gemeinsamen Arbeitsverzeichnis erhalten. Die Testkonkurrenz ist auf zwei Dateien begrenzt, die Suite vollständig; drei vorhandene `restore-test.sh`-Fälle werden unter Windows ohne Bash übersprungen. Die Browserprüfung umfasst die ausdrücklich genannten Specs, keinen behaupteten vollständigen Playwright-Gesamtlauf.

Die ersten Browserläufe deckten einen falschen Hilfe-Selektor im Test und einen tatsächlichen Nullzugriff in der Regelwahnsinn-Lobby auf. Beides ist korrigiert; fehlgeschlagene Vorläufe werden nicht als bestanden ausgewiesen. Ein heller Text auf der Papierkarte wurde für bessere Lesbarkeit abgedunkelt.

Der erste vollständige Node-Lauf auf der isolierten Release-Kopie hatte 1481 Fälle: 1475 bestanden, drei fehlgeschlagen, drei bestehende Fälle übersprungen (306,353 s, `artifacts/backlog07-full-node.log`). Fehler: fehlende neue Szenen-IDs sowie veraltete Bildhashes nach dem erneuten Screenshotlauf und der historische gemeinsame Bot-Quellhash von BACKLOG-04. Die Szenen sind registriert; die Nachweise werden aus den tatsächlichen Dateien erneuert, der vorherige BACKLOG-04-Quellnachweis bleibt archiviert. Die drei übersprungenen Fälle prüfen restore-test.sh und sind unter Windows mangels bash nicht ausführbar.

Im abschließenden Beschriftungsnachlauf bestand ein mobiler Infektionsjagd-Fall seine 7-Sekunden-Startfrist unter gleichzeitigem Node-Lastlauf nicht (letzter Frame 900 statt erwarteter 1000 ms). Die Startfrist des Tests beträgt jetzt zwölf Sekunden; Spielzeit und Regeln bleiben unverändert. Dieser Zwischenlauf wird separat ausgewiesen und nicht zum grünen breiten Lauf umgedeutet.

Der Zwischenlauf hatte 15 bestandene und einen fehlgeschlagenen Fall; alle acht darin enthaltenen bisherigen Echtzeitfälle bestanden. Nach der zusätzlichen Badge-Korrektur wurde ein noch laufender Zwischenstand verworfen und der vollständige neue Acht-Fälle-Lauf erneut ausgeführt. Dieser endgültige Lauf ist grün. Die 80 Originalbilder stammen aus dem endgültigen Lauf; kein Screenshot wurde nachbearbeitet.

Parallele V2-06-Rücknahmen bleiben auf ausdrückliche Nutzerantwort getrennt. Sie gehören weder zum Spiel-Commit noch zu den freigegebenen Backlog-Statusänderungen. Ein Push kann die bestehende Test-/GHCR-Automatik starten; kein Produktivserver wird aktualisiert.
