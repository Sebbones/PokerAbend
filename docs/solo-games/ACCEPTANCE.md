# Solo-Spiele – Abnahme vom 31.10.2026

Ausdrücklich beauftragter Umfang: drei echte lokale Einzelspieler, bestehender Hub, neun individuelle Planungen und GitHub-Arbeitspakete. Keine anderen Spiele begonnen. Branch `main`; kein Produktivdeployment. Ausgangsstand: `490345f668fac84d8522a327a5f6abcee10bf472`.

## Tatsächliche Umsetzung

Sudoku, 2048 und Wellenwacht sind spielbar. Der Serverkatalog behält seine 49 Raumspiele; das vollständige Inventar umfasst jetzt 52 spielbare Spiele. Die Solo-Bibliothek zeigt drei Start-/Fortsetzungsaktionen, passende Beschreibungen und eigene Motive. Öffentliche Tische, Bots, Abendprogramme und öffentliche Rankings erhalten keine lokalen Spiele oder lokalen Ergebnisse.

Spielkerne, UI, Speicherung, DE/EN, gemeinsame Anzeigeeinstellungen, Pause, Fortsetzung und Endzustände sind implementiert. Wellenwacht besitzt zwei Karten, vier Turm- und vier Gegnertypen, zwei Upgrades pro Turm und zwölf Wellen. Reverse BFS liefert kürzeste Wege; Probeplatzierungen dürfen keinen Eingang oder aktiven Gegner von der Basis abschneiden. Die feste 50-ms-Simulation ist von der Framefrequenz getrennt.

Die neun Zukunftsspiele sind ausschließlich `planned` und im vorhandenen Backlog und der öffentlichen Roadmap enthalten: [SOLO-004 bis SOLO-012](SOLO_GAMES_ROADMAP.md), GitHub-Issues [#5](https://github.com/TTLPSCWA/PokerAbend/issues/5), [#6](https://github.com/TTLPSCWA/PokerAbend/issues/6), [#7](https://github.com/TTLPSCWA/PokerAbend/issues/7), [#8](https://github.com/TTLPSCWA/PokerAbend/issues/8), [#9](https://github.com/TTLPSCWA/PokerAbend/issues/9), [#10](https://github.com/TTLPSCWA/PokerAbend/issues/10), [#11](https://github.com/TTLPSCWA/PokerAbend/issues/11), [#12](https://github.com/TTLPSCWA/PokerAbend/issues/12), [#13](https://github.com/TTLPSCWA/PokerAbend/issues/13). Vor Anlage wurden mögliche bestehende Issues gesucht. Minenlauf, Puzzle-Panik und Monsterwürfel sind unverändert erhalten.

## Testergebnisse

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| Vollständiges `npm test` | **907 bestanden**, 0 fehlgeschlagen, 59,7 Sekunden |
| Neue reine Solo-Prüfungen | **15 bestanden**, enthalten im vollständigen Node-Lauf |
| Design-/Bildintegrität nach Aufnahme | **6 bestanden**, einschließlich Hashprüfung der 44 Solo-PNGs |
| Breite Browserregression: Solo, Sprache, Home, Hub, Lobby, Roadmap, Verlassen, Abendprogramme | 101 bestanden, 3 fehlgeschlagen, 2 übersprungen; die drei Fehler betrafen die alte Vier-Kategorien-Erwartung auf beiden Geräten sowie eine zu frühe Auswertung im Reconnect-Test |
| Korrigierte betroffene Browserdateien: Solo, Home, Abendprogramme, Roadmap, Design-Roadmap, Lobby | **45 bestanden**, 0 fehlgeschlagen, 1 übersprungen, 1,3 Minuten |
| Abschließende Solo-Browserabnahme mit Game-Over-Undo und mobiler Zoom-/Scrollregression | **21 bestanden**, 0 fehlgeschlagen, 1 übersprungen, 41,9 Sekunden |

Übersprungen werden nur doppelte Viewport-Matrizen im Mobile-Projekt: Die Matrix läuft bereits im Desktop-Projekt mit ausdrücklich gesetzten Mobilmaßen. Tests verwenden reale Passwortanmeldung und pro Test isolierte temporäre Serverdaten. Keine Produktivdaten.

Die breite Prüfung hat alle 49 bestehenden Spiele tatsächlich geöffnet, ihre Aktionen/Panels/Regeln und ihr Tischende geprüft, außerdem ihre englischen Oberflächen. Die gezielte Wiederholung prüfte die korrigierten Erwartungen und den Reconnect vollständig grün. Die nachfolgenden funktionalen Änderungen waren auf die neuen lokalen Spielansichten begrenzt.

Sudoku: 96 Seeds, vier Schwierigkeiten, genau eine Lösung, reproduzierbarer Generator, Kandidaten, feste Vorgaben, Undo/Redo, Hilfen, Sieg und korrupte Saves. 2048: Einmalfusion, alle vier Richtungen, kein Spawn/RNG-Fortschritt bei ungültigem Zug, Score, Undo, Sieg/Weiterspielen, Game Over, Wiederherstellung und lokale Speicherprobleme. Wellenwacht: Baukosten, Fehlplatzierung, vollständige Wegsperre, Gegnerreservierung, Umweg, Treffer/Fläche/Kette/Frost, Upgrade, Verkauf, Wellen, Pause, 2×, 10-Hz-/60-Hz-Äquivalenz, Save, Sieg und Niederlage. Zusätzlich sind beide Karten in allen drei Schwierigkeiten mit regulärem Startgeld und regulären Belohnungen durchspielbar; kein Geldzugriff im Produktsystem wurde dafür ergänzt.

## Behobene Befunde und Sichtprüfung

- Beschädigte JSON-Daten werden von gesperrtem Browserspeicher unterschieden. Unbekannte History-Felder werden beim Laden verworfen; der Sudoku-Solver begrenzt seine Suche auch für fremde Daten.
- Nach geladenem Game Over lässt sich 2048 rückgängig machen; ein ausdrückliches Weiterspielen hebt die Endzustands-Pause auf.
- Sprache erhält eine offene neue Spielkonfiguration, Turmauswahl und Zoomzustand.
- Mobile Wellenwacht-Zoomfelder verbreitern ausschließlich den internen Scrollbereich. Ein ausgewähltes Feld oder ein HUD-Update setzt die Scrollposition nicht zurück.
- Alte Spielerzahlfilter blenden die Solo-Spiele beim Kategorienwechsel nicht mehr versehentlich aus. Lokale Kacheln zeigen ihre Kurzbeschreibung auch auf dem Handy.
- Bestehende Tests wurden an die fünfte Kategorie angepasst; der Test mit absichtlich angehaltenem Reconnect wartet sicher auf die noch ladende globale Kontoinformation.

44 dauerhafte PNGs mit SHA-256 und Abmessungen: [Manifest](screenshots.json), [Bildordner](screenshots/). Die Matrix umfasst 1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450. Zusätzlich gibt es Startansichten, laufende Zustände, beide Karten sowie Siege/Niederlagen auf Desktop und Mobile. Full-Page-PNGs sind höher als der jeweilige Viewport; eine fixierte mobile Navigation kann deshalb im langen Gesamtbild auf Höhe des Aufnahme-Viewports erscheinen. Das ist kein doppelt gerenderter Spielinhalt.

Manuell visuell geprüft wurden unter anderem die Solo-Bibliothek mobil, Sudoku-Start/Desktop, Sudoku-Spiel/mobil und Querformat, 2048-Spiel/Desktop und Sieg/mobil, Wellenwacht-Spiel/Desktop/Mobile, 360-Pixel-Ansicht und Zwillingsdelta/Desktop. Lesbare Werte, getrennte Aktionen und unabhängige Spielidentitäten sind sichtbar. Vorher-Aufnahmen existieren für diese drei neuen Spiele nicht, da sie vorher keine Oberflächen hatten. Endzustandsbilder nutzen validierte deterministische Test-Spielstände; vollständige Wellen-Siege sind zusätzlich im reinen Spielkern geprüft.

## Einschränkungen und Veröffentlichung

Lokale Daten sind nicht manipulationssicher, nicht geräteübergreifend synchronisiert und ohne gleichzeitigen Cross-Tab-Konfliktabgleich. Keine öffentliche Solo-Rangliste. Sudoku-Stufen orientieren sich an Vorgabenzahlen statt menschlichen Lösungstechniken. Wellenwacht ist ein originales Grundsystem ohne Audio, 3D, Karteneditor oder Flugeinheiten; Langzeit-Balancing bleibt eine mögliche Folgeaufgabe. Weitere neun Spiele wurden nicht begonnen.

Die vorhandene GitHub-Action führt `npm test` aus und baut/veröffentlicht `ghcr.io/ttlpscwa/pokerabend:latest`. Weder Workflow noch Compose-Dateien enthalten einen automatischen Austausch produktiver Container. Kein Server wurde aktualisiert und keine `.env` oder Produktionsdaten wurden geändert.

Der tatsächliche Implementierungscommit und der anschließende Dokumentationsabschluss werden nach dem Commit unten ergänzt.
