# PokerAbend V2 – Gemeinsame Entwicklungsplanung
**Status:** Nur geplant. Noch keine Implementierung freigegeben. Stand: 30.10.2026. **18 Arbeitspakete (V2-00 bis V2-17).**
**GitHub-Repository:** TTLPSCWA/PokerAbend
**Verwendbar durch:** Codex, Claude Code und andere Coding-Agenten.

## Wichtige Dateien

- **Separate visuelle Planung:** [Design-Roadmap für alle Spiele](../design/GAME_VISUAL_ROADMAP.md), [JSON-Pakete](../design/game-visual-roadmap.json) und [Designstandard](../design/GAME_VISUAL_GUIDELINES.md). Nach dem ausdrücklich beauftragten BACKLOG-04 sind vierzehn VIS-Pakete abgeschlossen. Die weiteren 93 VIS-Pakete (51 spielbare Spiele und 42 Konzepte; Stand 01.11.2026) benötigen eigene Freigaben und ändern keine V2-Statusangaben.
- `docs/roadmap/V2_ADDENDUM_2026-10-30.md`: Sieben ergänzte Vorhaben zu Risiko, Catan-artigem Spiel, mehr Erfolgen, Presence, Einstellungen, Bot-Schwierigkeit und Adminverwaltung. Teil der verbindlichen Planung.
- `docs/roadmap/plan.json`: Maschinenlesbare Master-Roadmap mit stabilen Arbeitspaket-IDs, Abhängigkeiten, Sicherheit, Akzeptanz und Status.
- `docs/roadmap/POKERABEND_V2_ROADMAP.md`: Menschenlesbare Zusammenfassung, Prioritäten und Arbeitsanweisung.
- `docs/roadmap/MASTERPROMPT_V2_SOURCE.md`: Archivierte vollständige fachliche Ausgangsspezifikation (nicht direkt ausführen).
- `docs/roadmap/DESIGN_GUIDE.md`: Designbeschreibung, damit auch ohne externes Referenzbild die gewählte Richtung erhalten bleibt.
- `AGENTS.md` und `CLAUDE.md`: Einstiegspunkte für Codex bzw. Claude Code.

## Wichtig für KI-Agenten
1. Roadmap und Quelle lesen, **aber NICHT automatisch implementieren**.
2. Ohne eindeutige Umsetzungsfreigabe (`Implementiere V2-XX auf main`) keine V2-Funktion implementieren. Ausdrücklich beauftragte Dokumentation und öffentliche Roadmap-Datenpflege bleiben davon getrennt.
3. Pro Umsetzungssitzung nur das vom Nutzer freigegebene Paket, einschließlich der direkt dazu notwendigen Tests.
4. Nach jeder freigegebenen Arbeit `plan.json` (Status, Nachweise, Commit) und Roadmap aktualisieren.
5. `games/roadmap.js` und `games/planned.js` sind **Live-Anwendungsdateien**, NICHT mit dieser Entwicklungsplanung verwechseln.

**Main-Only:** Ausschließlich direkt auf `main` arbeiten; keine eigenständig erstellten Branches oder Pull Requests und kein Force-Push. Vor jedem Schreibvorgang Remote-Stand prüfen und zwischenzeitliche Änderungen sicher abgleichen. Technische Schreibsperren melden und auf die Nutzerentscheidung warten. Die vollständige dauerhafte Arbeitsregel steht in `AGENTS.md`, `CLAUDE.md` und der Projekt-README.

**CI-Hinweis:** Der vorhandene Workflow führt bei einem Push auf `main` Tests aus und veröffentlicht ein GHCR-Image. Er enthält kein Produktivdeployment. Ein Image-Build ist keine Freigabe zur Aktualisierung des Servers oder seiner Daten. Prüfprotokoll und Herkunft: [CONSOLIDATION_2026-10-30.md](./CONSOLIDATION_2026-10-30.md).

**Historische Konsolidierungsbasis (30.10.2026):** `main` bei `aa25517`, damals 46 registrierte Spiele und bereits vorhandenes Liquid-Glass-Redesign (siehe `docs/ui-redesign.md`). Die V2-Konto-/Profilintegration dieses Designs bleibt ausdrücklich geplant. Die 18 Pakete werden durch die Konsolidierung nicht als implementiert markiert.

**Aktuelle Spielesammlung (01.11.2026):** 62 registrierte Raumspiele plus drei lokale Einzelspieler. Der Ausbau um Scotland Yard, Hex und Würfelduell steht in [Umsetzung und Prüfungen](../scotland-yard-und-kleine-spiele.md). Die ersten beiden [Backlog-Päckchen](../backlog/WEITERE_SPIELE.md) ergänzen sechs kleine Spiele; BACKLOG-03 ergänzt Backgammon, Hearts und Five Card Draw mit Bots und individuellen Spielwelten. BACKLOG-04 ergänzt Scrabble, Omaha Hi/Lo, Short Deck Poker und Seven Card Stud. In „Weitere Spiele“ sind damit 13 von 41 Einträgen erledigt. Nach diesem ausdrücklich begrenzten Auftrag stoppen. `plan.json.baseline` bleibt die unveränderte historische Konsolidierungsbasis; dieser Spiele-Ausbau implementiert kein V2-Paket.

**Schema:** `goal` enthält die Aufgabenbeschreibung. Jedes Paket führt ID, Titel, Priorität, Abhängigkeiten, betroffene Dateien, Sicherheitsanforderungen, Akzeptanzkriterien, `status`, `test_results`, `commits`, `implementation_commit` und `completed_at`. Ohne Implementierung bleiben Ergebnis-/Commitlisten leer und Abschlussfelder `null`. `public_roadmap_ids` verknüpft jedes Paket mit vorhandenen Besucher-Einträgen; Roadmap-Tests prüfen diese Zuordnung und die Abhängigkeiten. `consolidation.json` ist ein Herkunfts-/Altbranch-Inventar, keine zweite aktive Entwicklungsplanung.

**Design:** Ein dezenter atmosphärischer Hintergrund, ruhige Liquid-Glass-Flächen, minimalistische Kacheln ohne wiederholte Fotohintergründe. Keine Freundesliste, kein 3D.

**Kamera:** Discord OAuth überträgt keinen Discord-Videocall. Optionale eigene Browserkamera nur mit explizitem Opt-in, HTTPS, TURN und geprüfter Berechtigung; standardmäßig aus.
