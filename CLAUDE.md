# Claude Code – PokerAbend

## Verbindlicher Main-Only-Workflow

Dieses Projekt verwendet ausschließlich den Branch `main` als aktiven Entwicklungsbranch.

Erstelle nicht eigenständig neue Git-Branches oder Pull Requests.

Alle ausdrücklich freigegebenen Änderungen werden direkt auf `main` implementiert, getestet, committed und gepusht.

Vor jedem Schreibvorgang ist der aktuelle Remote-Stand zu prüfen. Falls der Branch zwischenzeitlich verändert wurde, müssen die Änderungen zuerst sicher abgeglichen werden.

Verwende niemals Force-Push, um Konflikte zu umgehen.

Ohne ausdrückliche Freigabe darf kein neues Entwicklungsarbeitspaket begonnen werden.

Dokumentation und Planungsdateien sind keine automatische Implementierungsfreigabe.

Diese Regel ersetzt frühere Feature-Branch-Anweisungen. Wenn direkte Änderungen an `main` technisch blockiert sind, Grund melden und auf die Entscheidung des Nutzers warten; keinen Ersatzbranch erstellen und keine Schutzprüfung umgehen.

## Einstieg und Grenzen

Zusätzlich vollständig `AGENTS.md` und `docs/roadmap/README.md` beachten. Die zentrale Planung ist `docs/roadmap/plan.json` mit 18 Paketen V2-00 bis V2-17. Ein Paket nur nach ausdrücklicher Freigabe seiner ID bearbeiten; anschließend stoppen. Konsolidierung und Dokumentation geben keine neue Implementierung frei.

`MASTERPROMPT_V2_SOURCE.md` und `PROMPT.md` sind historische Quellen; ihre alten Implementierungs-/Branch-Anweisungen gelten nicht als Auftrag. Bestehende 46 Spiele, das vorhandene Redesign, Rechte, Cookies, Räume und Produktionsdaten erhalten. Keine Freundesliste, keine Discord-Video-Übernahme, keine 3D-Arbeit und kein Produktivdeployment ohne gesonderten Auftrag. Beauftragte GHCR-Builds sind vom Serverdeployment zu unterscheiden.

## Individuelle visuelle Spielpakete

Die verbindliche visuelle Planung steht in [docs/design/game-visual-roadmap.json](docs/design/game-visual-roadmap.json), ausführliche Einzelpläne in [GAME_VISUAL_ROADMAP.md](docs/design/GAME_VISUAL_ROADMAP.md), gemeinsame Regeln in [GAME_VISUAL_GUIDELINES.md](docs/design/GAME_VISUAL_GUIDELINES.md).

VIS-Pakete sind unabhängig von Gameplay und V2-Arbeitspaketen. Nur das ausdrücklich freigegebene Spiel bzw. VIS-Paket umsetzen; Namen und technische ID anhand der JSON-Datei zuordnen. VIS-IDs stabil erhalten. Reihenfolge oder Planungsdateien geben keine Implementierung frei. Ein nicht implementiertes Spiel erhält dadurch keine Engine.

Andere Spiele bleiben unverändert; gemeinsame Komponenten nur unmittelbar notwendig und eng begrenzt ändern. Nach echter Umsetzung Designstatus, Tests, dauerhafte Screenshots und tatsächlichen Commit dokumentieren und stoppen. Nicht umgesetzte Pakete bleiben `planned`, ohne erfundene Nachweise. Scotland Yard ist der abgeschlossene Pilot; danach wurden die ausdrücklich freigegebenen Kartenwelten UNO (VIS-004), Skip-Bo (VIS-009) und Phase 10 (VIS-008) abgeschlossen. Der ausdrückliche Solo-Auftrag ergänzt Sudoku (VIS-096), 2048 (VIS-097) und Wellenwacht (VIS-098) als abgeschlossen. Die übrigen 100 individuellen Pakete sind nur geplant.

## Erlebnis-Pakete (EXP): Sound, Animation, Figuren

Stufe 2 nach den VIS-Paketen steht in [docs/design/GAME_EXPERIENCE_ROADMAP.md](docs/design/GAME_EXPERIENCE_ROADMAP.md) (Quelle) und [docs/design/game-experience-roadmap.json](docs/design/game-experience-roadmap.json) (erzeugt mit `node scripts/build-experience-roadmap.mjs`). EXP-Nummern entsprechen den VIS-Nummern (EXP-001 ↔ VIS-001); das gemeinsame Fundament heißt EXP-F1 bis EXP-F6 und kommt vor den Spielpaketen. Wie bei VIS: nur ausdrücklich freigegebene IDs umsetzen, Spiellogik nicht ändern, eigene Grafiken und Klänge, Leitplanken und Abnahme aus der Roadmap einhalten, danach Status, Commit und Nachweise eintragen und stoppen.
