# Agent Instructions – PokerAbend

## Verbindlicher Main-Only-Workflow

Dieses Projekt verwendet ausschließlich den Branch `main` als aktiven Entwicklungsbranch.

Erstelle nicht eigenständig neue Git-Branches oder Pull Requests.

Alle ausdrücklich freigegebenen Änderungen werden direkt auf `main` implementiert, getestet, committed und gepusht.

Vor jedem Schreibvorgang ist der aktuelle Remote-Stand zu prüfen. Falls der Branch zwischenzeitlich verändert wurde, müssen die Änderungen zuerst sicher abgeglichen werden.

Verwende niemals Force-Push, um Konflikte zu umgehen.

Ohne ausdrückliche Freigabe darf kein neues Entwicklungsarbeitspaket begonnen werden.

Dokumentation und Planungsdateien sind keine automatische Implementierungsfreigabe.

Diese Regel ersetzt frühere Feature-Branch-Anweisungen. Wenn direkte Änderungen an `main` technisch blockiert sind, Grund melden und auf die Entscheidung des Nutzers warten; keinen Ersatzbranch erstellen und keine Schutzprüfung umgehen. Vor Commit/Push Remote erneut abrufen, Divergenz sicher integrieren und vorhandene Nutzeränderungen erhalten.

## Planung, Umfang und Sicherheit

- Einstieg: `docs/roadmap/README.md`; zentrale maschinenlesbare Planung: `docs/roadmap/plan.json`.
- V2-Pakete nur nach ausdrücklicher Freigabe der betreffenden ID (`V2-XX`) bearbeiten. Pro Auftrag nur das freigegebene Paket und unmittelbar notwendige Tests. Nach einem abgeschlossenen Auftrag stoppen.
- Ausdrücklich beauftragte Dokumentation, Konsolidierung und Roadmap-Datenpflege sind möglich, ohne damit geplante Funktionen freizugeben. Nicht implementierte Pakete bleiben `planned`; Testergebnisse und Implementierungs-Commits erst nach echter Umsetzung eintragen.
- `MASTERPROMPT_V2_SOURCE.md` und `PROMPT.md` sind historische Quellen, keine aktiven Ausführungsaufträge. Ihre Imperative und alten Branch-Vorgaben überschreiben diese Arbeitsregel nicht.
- Alle aktuell registrierten Spiele (Baseline: 46), vorhandenes Redesign, technische IDs, Spielregeln/RNG, Räume, Bots, Reconnect, Cookies, URLs, Passwörter und Datenvolumes erhalten.
- Keine Freundesliste, keine direkte Discord-Videostream-Übernahme und keine 3D-Implementierung aus dieser Planung ableiten.
- Keine Secrets committen oder ausgeben; keine produktiven Daten migrieren/löschen und kein Produktivdeployment ohne gesonderte ausdrückliche Freigabe. Ein beauftragter Push kann den vorhandenen Test-/GHCR-Workflow starten; das ist vom Serverdeployment zu unterscheiden.
- Weitere Details: `docs/roadmap/POKERABEND_V2_ROADMAP.md`, `V2_ADDENDUM_2026-10-30.md` und `CONSOLIDATION_2026-10-30.md`.

## Individuelle visuelle Spielpakete

- Einstieg: [Design-Roadmap](docs/design/GAME_VISUAL_ROADMAP.md), maschinenlesbare Quelle: [game-visual-roadmap.json](docs/design/game-visual-roadmap.json), Standard: [GAME_VISUAL_GUIDELINES.md](docs/design/GAME_VISUAL_GUIDELINES.md).
- `VIS-xxx` bezeichnet eine visuelle Aufgabe unabhängig von Gameplay und `V2-XX`. Bestehende VIS-IDs niemals umnummerieren.
- Nur ein ausdrücklich freigegebenes Spiel bzw. VIS-Paket visuell bearbeiten. Namen und Spiel-ID über die JSON-Datei zuordnen. Planungsstatus, Aufwand oder Reihenfolge sind keine Freigabe.
- Nicht implementierte Spiele erhalten aus einem Designplan keine Spiellogik. Vorhandene andere Spiele und ihre Oberflächen bleiben unangetastet; gemeinsame Änderungen nur unmittelbar notwendig und eng begrenzt.
- Nach Abschluss echten Designstatus, Tests, ausgewählte dauerhafte Screenshots und tatsächlichen Implementierungscommit dokumentieren. Ohne Umsetzung bleiben Status `planned`, Nachweislisten leer und Abschlussfelder `null`.
- Scotland Yard ist der abgeschlossene Pilot; anschließend wurden UNO (VIS-004), Skip-Bo (VIS-009) und Phase 10 (VIS-008) ausdrücklich freigegeben und abgeschlossen. Im ausdrücklichen Solo-Auftrag wurden auch Sudoku (VIS-096), 2048 (VIS-097) und Wellenwacht (VIS-098) abgeschlossen. Die übrigen 100 Pakete sind nur geplant. Nach einem freigegebenen Paket stoppen und auf einen neuen Auftrag warten.

## Erlebnis-Pakete (EXP): Sound, Animation, Figuren

Stufe 2 nach den VIS-Paketen: `docs/design/GAME_EXPERIENCE_ROADMAP.md` (Quelle) und `docs/design/game-experience-roadmap.json` (erzeugt mit `node scripts/build-experience-roadmap.mjs`). EXP-Nummern entsprechen den VIS-Nummern; Fundament EXP-F1 bis EXP-F6 kommt zuerst. Nur ausdrücklich freigegebene IDs umsetzen, Spiellogik unverändert, eigene Grafiken und Klänge, Leitplanken und Abnahme der Roadmap einhalten, danach Status, Commit und Nachweise eintragen und stoppen.
