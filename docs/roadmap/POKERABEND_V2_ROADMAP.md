# PokerAbend V2 – Roadmap (nur Planung)
> **Nicht implementieren**, bis der Nutzer ausdrücklich die Arbeit an einer benannten ID freigibt.
> Stand: 30. Oktober 2026 · konsolidierte Baseline: `main` `aa25517` · 46 registrierte Spiele.
> Maschinenlesbarer Status: [plan.json](./plan.json). Vollständiger Ursprung: [MASTERPROMPT_V2_SOURCE.md](./MASTERPROMPT_V2_SOURCE.md).

## Ziel
Ein dauerhaftes, optionales Discord-Accountsystem mit verifizierter Identität für Rankings und Erfolge, echte temporäre Gäste, unveränderte Computerbots, öffentliche zufällige Game-IDs, personalisierbare Ansichten und das reduzierte Liquid-Glass-Design. Optional später eine sichere eigene Browser-Tischkamera (nicht Discord-Videocall) – **keine Freundesliste, kein 3D**.

## Arbeitspakete
| ID | Priorität | Inhalt | Voraussetzung | Status |
|---|---|---|---|---|
| V2-00 | critical | Bestandsaufnahme, Sicherheitsmodell und Daten-Sicherung | – | Umgesetzt (01.11.2026) |
| V2-01 | critical | Plattformidentität: Accounts, Gäste, Bots und persistente IDs | V2-00 | Umgesetzt (01.11.2026) |
| V2-02 | critical | Discord OAuth2 und Sitzungssicherheit | V2-01 | Umgesetzt (01.11.2026) |
| V2-03 | critical | Ranked-Ergebnisse und historische Bestenlisten | V2-01, V2-02 | Geplant |
| V2-04 | high | Spielerprofile, Erfolge und Game-ID | V2-03 | Geplant |
| V2-05 | high | Personalisierung und Datenschutz-Einstellungen | V2-01, V2-02 | Geplant |
| V2-06 | high | Vorhandenes Liquid Glass in die V2-Kontooberflächen integrieren | V2-02, V2-04, V2-05 | Geplant |
| V2-07 | high | Bestehende Tickets, Planungen, Rückblicke und Presence sicher integrieren | V2-01, V2-02, V2-05 | Geplant |
| V2-08 | later | Optionale sichere Tischkamera per WebRTC | V2-01, V2-02 | Geplant |
| V2-09 | critical | Regressionstests, Sicherheit und Datenschutz | V2-03, V2-04, V2-05, V2-06, V2-07, V2-08 | Geplant |
| V2-10 | high | Deployment-Plan, Feature-Flags und Übergabe | V2-09 | Geplant |

## Erweiterung vom 30. Oktober 2026 – weitere Wünsche (7 neue Arbeitspakete)

**Alle Ergänzungen sind nur geplant.** Einzelheiten und Akzeptanzkriterien siehe [plan.json](./plan.json) und [V2_ADDENDUM_2026-10-30.md](./V2_ADDENDUM_2026-10-30.md).

| ID | Priorität | Inhalt | Voraussetzung | Status |
|---|---|---|---|---|
| V2-11 | later | Strategiebrettspiel Risiko (eigenständige Umsetzung) | V2-00 | Geplant |
| V2-12 | later | Siedler von Catan-inspiriertes Hexfeld-Aufbauspiel | V2-00 | Geplant |
| V2-13 | medium | Erfolge & Errungenschaften deutlich ausbauen | V2-03, V2-04 | Geplant |
| V2-14 | high | Gerade-online-Status und Presence verbessern | V2-01, V2-05, V2-07 | Geplant |
| V2-15 | high | Mehr Benutzer-Einstellungen: Anzeige, Filter und Bedienung | V2-05 | Geplant |
| V2-16 | medium | Bots mit wählbarem Schwierigkeitsgrad | V2-01 | Geplant |
| V2-17 | high | Admin-Zentrale: Rückblicke, Bestenlisten und Daten moderieren | V2-02, V2-03, V2-07 | Geplant |

**Wichtig:** `Risiko-Würfeln` in `games/planned.js` ist nicht das neue Strategiebrettspiel Risiko. Die Strategie- und Hexfeldspiele erfordern eigenständige Grafik/Namen und eine Prüfung von Marken-/Designrechten. Der vorhandene Ticket-Admin ist nicht automatisch Plattform-Admin; die neue Admin-Zentrale soll mit nachweisbaren Berechtigungen und Audit arbeiten.

Die bestehenden Backlog-IDs `gebietskampf` und `staedtehandel` sind verbindlich; weder ein zweites Risiko-/Catan-Spiel noch alternative Implementierungsverzeichnisse dafür anlegen. Das vorhandene Liquid-Glass-Redesign bleibt erhalten. V2-06 ist die noch nicht umgesetzte Konto-/Profilintegration; bereits vorhandene Gestaltung ist kein Nachweis für ihren Abschluss. Alle 18 Pakete bleiben `planned`.

## Umsetzungsgrenzen
- Namen dürfen weder zur Accountidentifizierung noch zur Bot-Filterung oder Rechtezuordnung dienen.
- Alte namensbasierte Bestenlisten historisch getrennt und unverändert archivieren, nicht namensgleich einem Discord-Konto zuschreiben.
- `SITE_PASSWORD`, `TICKET_ADMIN_PASSWORD`, Cookies, Räume, Reconnect und bestehende Datenweiterverarbeitung kompatibel halten.
- Gastspieler dürfen alle normalen Lobbys benutzen, erhalten aber keine öffentlichen Ranked-Einträge.
- Der Server entscheidet Ranked-Berechtigung vor Rundenbeginn; nur echte, voneinander verschiedene registrierte Menschen, keine Bots/Gäste.
- Benutzerpräferenzen dürfen Kategorien und Errungenschaften ausblenden; Privacy-Einstellungen müssen getrennt abgesichert sein.
- Video ist standardmäßig AUS, keine Mikrofonnutzung, keine Aufnahme, keine direkte Discord-Videoübernahme; HTTPS und abgesicherter TURN-Betrieb als Pflicht zur Freischaltung.
- UI: atmosphärischer **einziger** Hintergrund, ruhige transparente Flächen, minimalistische Karten/Kategorien mit kleinen Icons; keine Foto-Duplikate.
- Öffentliche Roadmap-Daten nur nach ausdrücklichem Datenpflegeauftrag synchronisieren; keine Spielregeln oder V2-Funktionen aus einer Planung ableiten.

## Nächste konkrete Agent-Anweisung
`Lies AGENTS.md (Codex) bzw. CLAUDE.md (Claude Code) und docs/roadmap/plan.json sowie die archivierte Quelle. Zeige den Planungsstand. Implementiere nichts, solange ich nicht ausdrücklich ein Paket freigebe.`

## Nach Freigabe eines Arbeitspakets
1. Aktuellen Repository-Stand und Abhängigkeiten gegen `plan.json` prüfen.
2. Nur das benannte Paket direkt auf `main` implementieren; keine neuen Branches/PRs, Remote vor jedem Schreibvorgang prüfen, kein Force-Push. Bei technischer Schreibsperre Grund melden und auf die Nutzerentscheidung warten.
3. Risiken und Akzeptanzkriterien dieses Pakets testen, ohne vorhandene Funktionen zu verlieren.
4. Ergebnisse/Blockaden konkret dokumentieren, `plan.json` erst nach belegtem Abschluss aktualisieren.
5. Kein Produktivdeploy ohne ausdrückliche Zustimmung.
