# Einzelspieler

Stand: 31.10.2026. **49 bestehende Raum-/Partyspiele plus drei neue lokale Einzelspieler = 52 spielbare Spiele.**

| Paket | Spiel | Einstieg | Umfang |
| --- | --- | --- | --- |
| SOLO-001 | Sudoku | `/#solo/sudoku` | Vier Stufen, eindeutiger Generator, Notizen/Kandidaten, Undo/Redo, Fehleranzeige, Hilfe, Uhr, Pause und Save |
| SOLO-002 | 2048 | `/#solo/2048` | Tastatur, Touch, Richtungstasten, Punkte, Undo, 2048-Sieg/Weiterspielen, Niederlage, lokaler Highscore und Save |
| SOLO-003 | Wellenwacht | `/#solo/wellenwacht` | Zwei eigene Karten, vier Türme mit je zwei Upgrades, vier Gegnertypen, zwölf Wellen, drei Schwierigkeiten, Economy, Wegfindung und Save |

Die Kategorie **Einzelspieler** ist über die Kategorie-Navigation der bestehenden Spielebibliothek erreichbar, auch mobil. Lokale Spiele lassen sich favorisieren, suchen und erneut auswählen. Sie haben einen eigenen Spielknopf. Der Mehrspieler-Hostdialog enthält weiterhin ausschließlich Raumspiele. Ein direkter Solo-Einstieg benötigt keinen Profilnamen und keinen Discord-Account; der vorhandene Seitenschutz bleibt bestehen.

## Architektur und Datenschutz

`games/index.js` hält `GAMES` mit 49 serverseitigen Spielen unverändert. `SINGLEPLAYER_GAMES` enthält ausschließlich die drei lokalen Metadaten. `PLAYABLE_GAMES` ist das vollständige Inventar für Dokumentation und Roadmap. `/me` liefert `singleplayerGames` getrennt von `games`. Raum-Erstellung, Bots, Abendprogramme, Präsenz und öffentliche Rankings verwenden weiterhin ausschließlich die serverseitigen Spiele.

`public/singleplayer.js` verbindet den bestehenden Hub mit dem nachgeladenen ESM-Runtime-Modul. Die drei reinen, unter Node testbaren Spielkerne liegen in `public/singleplayer/`. Die Oberfläche nutzt gemeinsame Typografie, Navigation, Sprachwahl und Anzeigeeinstellungen. Die bisherigen Wettbewerbe unter `games/solo-room.js` und `public/games/solo/` bleiben eigenständige Mehrspielerfunktionen und werden nicht ersetzt.

Browser-Saves heißen `poker:singleplayer:<spiel-id>` und enthalten `{ version: 1, id, updatedAt, state }`. Grenze: 250.000 Zeichen. Beim Laden werden Felder, Größen, Wertebereiche und die spielabhängigen Invarianten geprüft. Unbekannte Versionen und beschädigte Daten führen zur Startansicht mit Meldung; der gespeicherte Text wird erst beim bewussten Start eines neuen Spiels ersetzt. Gesperrter oder voller Speicher verhindert das Spielen nicht und wird sichtbar gemeldet. Jede Wiederherstellung beginnt pausiert. History-Einträge werden auf bekannte Felder reduziert.

Die Daten bleiben im aktuellen Browserprofil und werden nicht an den Server übermittelt. Es gibt keine öffentliche Solo-Rangliste und keine behauptete Vertrauenswürdigkeit der lokalen Ergebnisse. 2048 führt einen lokalen Bestwert unter `poker:singleplayer:2048:stats`; Undo senkt ihn nicht. Das Löschen der Browserdaten entfernt auch diese Spielstände. Kein geräteübergreifender Sync und kein Cross-Tab-Konfliktabgleich; bei parallelem Öffnen desselben Spiels gilt der zuletzt geschriebene Stand.

Beim Verlassen, Tab-Wechsel und `pagehide` wird pausiert und gespeichert. Event-Listener, Sudoku-Uhr, ResizeObserver und Animationsframe werden beim Entfernen der Ansicht abgebaut. Wellenwacht animiert nur eine sichtbare, laufende und nicht pausierte Welle. Die Simulation arbeitet unabhängig von der Bildschirmfrequenz.

## Gestaltung und Bedienung

Sudoku verwendet eine ruhige helle Logiktafel mit festen 3×3-Grenzen und einen getrennten Ziffernblock. 2048 verwendet bernsteinfarbene Typografie-Kacheln, kurze Bewegungen und sichtbare Richtungsaktionen. Wellenwacht zeichnet eigene Landschaften, Turmsilhouetten, Gegnerformen, Reichweiten, Wege und Treffer lokal mit Canvas 2D; das DOM darüber erlaubt Tastaturwahl und zugängliche Feldnamen. Die vier Turmarten unterscheiden sich zusätzlich zur Farbe durch Form und Funktion.

DE/EN wird für neue Spielansichten und Roadmap-Metadaten unterstützt. Gemeinsame Einstellungen und Betriebssystempräferenz reduzieren Bewegung. Aktionen haben mindestens 44 Pixel Höhe. Die Rasterzellen werden auf kleinen Displays kompakter; Wellenwacht bietet zusätzlich eine intern verschiebbare Ansicht mit 44-Pixel-Feldern und eine getrennte Baubestätigung. Neue Spiele verwenden keine eigenen Tondateien.

## Tests und Nachweise

- Spielkerne: `node --test test/singleplayer.test.js`.
- Gesamter Node-Bestand: `npm test`.
- Solo-Browserabnahme: `npx playwright test test/ui/singleplayer.spec.js --workers=2`.
- Bestehende Hub-/Sprach-/Raumregressionen werden zusätzlich geprüft; endgültige Ergebnisse und Commitbezug stehen im [Abnahmeprotokoll](ACCEPTANCE.md).
- Dauerhafte Desktop-/Mobile-Aufnahmen: [screenshots](screenshots/). Startansichten, laufende Spiele, Siege, Niederlagen und beide Wellenwacht-Karten sind enthalten; Hashmanifest: [screenshots.json](screenshots.json).

Gewöhnliche UI-Testläufe schreiben Bilder nach `artifacts/solo-screenshots` und verändern die dauerhaften Nachweise nicht. Nur ein bewusster Aufnahmelauf mit `SOLO_CAPTURE_EVIDENCE=1` aktualisiert `docs/solo-games/screenshots`; anschließend muss das Hashmanifest erneut erstellt und geprüft werden. Die Node-Designprüfung prüft auch die gespeicherten Solo-Bildhashes.

Die Sudoku-Tests prüfen 96 Seeds über alle vier Stufen auf genau eine Lösung. Die TD-Prüfungen decken Wegänderungen, vollständige Blockierung, Gegnerreservierungen, Kosten, Treffer, Upgrades, Verkauf, Wellen, Sieg/Niederlage, Pause, 2×-Tempo, unterschiedliche Frameintervalle und Saves ab. Browsertests prüfen reale Passwortanmeldung, lokale Fortsetzung, Sprachwechsel, Touch-/Tastatureingaben und Seitenwechsel.

## Grenzen und Planung

Sudoku-Stufen werden anhand der Zielanzahl Vorgaben erzeugt; keine Bewertung menschlicher Lösungstechniken. Einzigartigkeit hat Vorrang vor dem exakten Vorgabenziel. Kein tägliches Rätsel und keine serverseitigen Statistiken. Wellenwacht ist ein eigenständiges Grundspiel mit Hitscan-Schaden und visuellen Geschossen, ohne 3D, Audio, Fluggegner oder komplexe Spezialfähigkeiten. Die drei Schwierigkeitsgrade ändern Startgeld, Leben und Gegnergesundheit; Langzeit-Balancing kann später verfeinert werden.

[Neun weitere Spiele](SOLO_GAMES_ROADMAP.md) bleiben **planned** und besitzen eigene GitHub-Issues #5–#13. Sie wurden nicht implementiert. Minenlauf, Puzzle-Panik und Monsterwürfel bleiben erhalten. Die visuelle Inventur umfasst VIS-096 bis VIS-107 zusätzlich zu den unveränderten bisherigen IDs; tatsächliche Abschlussnachweise werden nach der Prüfung eingetragen.

Weitere Details: [Sudoku](SUDOKU_DESIGN.md), [Tower Defense](TOWER_DEFENSE_DESIGN.md). Kein Produktivdeployment wurde beauftragt; der vorhandene Main-Workflow testet und veröffentlicht lediglich das GHCR-Image.
