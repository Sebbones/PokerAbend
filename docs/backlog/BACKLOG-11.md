# BACKLOG-11 – Turmbauer, Fallenbauer und Geschenkdiebe

Abgeschlossen am 08.11.2026 auf `main`. Spiel-Implementierung: `ecef056e5397a71ea5fd1c76bec00b34a2970828`. Mobiler CSS-Nachlauf: `b5e0035d4f0a37ef4ee28dfa6ffba6848b67582d`. **Die vom Nutzer erlaubte Aufteilung wurde gewählt: ausschließlich die ersten drei Spiele.** Schatzgräber, Brückenroulette und Reaktor-Notfall bleiben mit leeren Nachweisen `planned`; ihre Umsetzung benötigt einen neuen Prompt. Danach stoppen. Backlog: **38 von 41 verifiziert**, drei offen. Bestand: 92 Raumspiele plus zwölf lokale Solo-Spiele = 104 spielbare Spiele. Keine V2-Implementierung.

## Tatsächliche Regeln und Spielwelten

| Spiel | Umsetzung |
| --- | --- |
| Turmbauer / VIS-091 | 2–10 spielen gleichzeitig mit derselben serverseitigen Folge bewegter Blöcke. Ein Tipp oder Space setzt den Block an der aktuellen Serverposition ab; nur die Überlappung bleibt. Unter acht logischen Einheiten ist der Turm beendet, Höhe bleibt. Eine Lage = ein Punkt, höchste Höhe gewinnt, Gleichstand teilt Sieg; null = Remis. 250 ms zwischen Blöcken, Obergrenze 60 Lagen. Eigener ruhiger Stapeltisch mit Holzflächen und Maßlinien. |
| Fallenbauer / VIS-093 | 2–8 bauen reihum je eine sichtbare Falle auf dem 11×9-Parcours. Eigener gestrichelter Entwurf und Bestätigung; Tastatur-Auswahl alternativ zum Antippen. Start-/Zielspalte frei und nach jeder Platzierung mindestens ein sicherer Weg. Timeout setzt eine erlaubte Falle. Danach laufen alle gleichzeitig orthogonal; ein Treffer beendet nur diesen Durchgang, ein unbeschadetes Ziel bringt 100 Punkte. Einstellbar 1–5 Durchgänge, Bau-/Laufzeiten, rotierende Bau-Reihenfolge. Eigenes Parcoursatelier mit sichtbaren Fallen, Start und grünem Ziel. |
| Geschenkdiebe / VIS-092 | 2–8 in gemeinsamer Arena, 18 lose Geschenke, danach alle zwei Sekunden eines bis maximal 24 lose. Pickup ≤28 Einheiten, bei gleichem Abstand Serverzufall. Stehlen per Knopf/Space: nächster Gegner in Blickrichtung ≤65, genau ein Geschenk, 1,1 s Versuchspause, 1,4 s Opferschutz. Höchster verbleibender Besitz gewinnt, Gleichstand geteilt, null = Remis. Eigener Pakethof, unterscheidbare lose/mitgeführte Pakete, Blickrichtung und Schutzring. |

Die kurzen Backlog-Regeln wurden durch diese sichtbaren Online-Details vollständig spielbar gemacht; keine Regeln anderer Spiele ersetzt. `WorkshopRoom` ergänzt nur den vorhandenen `ExpeditionRoom`-/`RealtimeRoom`-Lebenszyklus. Der Server entscheidet alle Positionen, Überlappungen, Treffer, Zufälle, Besitzwechsel und Punkte. Client-Koordinaten, Zeiten oder Punkte werden nicht übernommen. Zeitgrenzen verwenden die vorhandene pausierbare Raum-Uhr. Bewegung ist normiert und endet bei fehlender Eingabe nach 350 ms; Offline-Spieler bewegen sich nicht weiter.

Nonce, Raum-Runde, Sequenzen und Fallenbauer-Durchgang werden geprüft. Ein neuer Parcours erhält eine neue Nonce und verwirft alte Richtungs-/Baubefehle. Hostpause stoppt Bauphase, Lauf und Blöcke. Neuladen/Reconnect an einem weiterlaufenden Server erhält den persönlichen Stand. Ein kompletter Serverneustart verwendet weiterhin das bestehende Zwischenrunden-Restore in die Lobby; keine neue mitten-in-der-Runde-Persistenz wird behauptet. Aussteigen bricht ohne erfundene Siege/Punkte ab.

Alle neuen Texte/Regeln sind selbst verfasst auf Deutsch und Englisch. Szenen, Lobby-SVGs und Canvasmaterial sind eigen, ohne fremde Bildassets, Logos, neue Demo oder 3D. Tastatur, Tippen, 44-Pixel-Aktionen, Parcourszoom und Geschenk-Stick sind vorhanden. Bauentwürfe bleiben bei normaler Aktualisierung und Sprachwechsel erhalten. Ergebnistitel und Wiederholen-Aktion sind ebenfalls lokalisiert.

## Private Sichten und Bots

Turmbauer sendet nur den eigenen Turm und den aktuell sichtbaren Block; die öffentliche Spielerleiste kennt lediglich die Höhen. Zuschauer erhalten `tower: null`. Weder fremde Turmblöcke noch künftige Bewegungsprofile oder Seed werden übertragen. Fallen und Geschenkbesitz sind absichtlich öffentlich; nur die gerade berechtigte bauende Person bekommt auswählbare Bauplätze. Entwürfe bleiben lokal. Serverzustände, Frames und JSON-Daten sind in den Tests geprüft.

Optionale Bots spielen regelkonform auf der ehrlich als einzige verfügbare Stufe ausgewiesenen Mittel-Stufe. Turmbots nutzen nur den eigenen aktuell sichtbaren Block, Fallenbots den sichtbaren Parcours, Geschenkebots sichtbare Pakete und Besitzstände. Es gibt keine eigenen Konto-/Identitätsannahmen; alle Spieler werden über die bestehende Raum-Spieler-ID angesprochen. Botpartien bleiben im vorhandenen System ungewertet; Bots werden nicht als Personen für Presence oder Erfolge gezählt.

## Tatsächliche Tests

| Befehl / Umfang | Bestanden | Fehler | Übersprungen |
| --- | ---: | ---: | ---: |
| node --test --test-concurrency=2 test/backlog11.test.js test/games.test.js test/planned.test.js test/security.test.js test/game-design.test.js | 64 | 0 | 0 |
| node --test test/backlog11-client.test.js | 2 | 0 | 0 |
| playwright test test/ui/backlog11.spec.js --workers=1 (desktop + mobil) | 6 | 0 | 0 |
| playwright test test/ui/backlog11-controls.spec.js --workers=1 (desktop + mobil) | 6 | 0 | 0 |
| playwright test test/ui/backlog11.spec.js test/ui/backlog11-controls.spec.js (isolated committed main, desktop + mobil) | 12 | 0 | 0 |
| playwright test test/ui/backlog11-controls.spec.js (isolated CSS follow-up, desktop + mobil) | 6 | 0 | 0 |
| node --test --test-force-exit --test-concurrency=2 test/*.test.js (isolated committed main + this packet evidence) | 1609 | 0 | 3 |

16 neue Regel-/Simulationstests prüfen unter anderem 1.000 zufällige vollständige Bauphasen für 2–8 Spieler mit ausgeführtem sicherem Weg, 150 vollständige Botpartien mit bis zu zehn Spielern, exaktes Kürzen von Blöcken, Fehlwürfe, Grenze/Kühlzeit, Reichweite/Blickrichtung/Opferschutz und Geschenkerhaltung nach jedem Tick. Dazu kommen private Ansichten, gefälschte und veraltete Eingaben, Hostrechte, Pause, Reconnect, Zeitgrenzen und Abbruch. Zwei Client-Fälle prüfen Phasenanzeige/Entwurfserhalt sowie DE/EN-Ergebnisaktionen.

Sechs vollständige Playwright-Fälle verwenden Desktop und echtes emuliertes Touch-Handy mit je drei Browser-Kontexten: Lobby, Regeln DE/EN, eigene Aktionen, fremde/Zuschaueransicht, Hostpause, Reload, reguläre Ergebnisse. Fallenbauer führt tatsächlich zwei vollständige Bau-/Laufdurchgänge aus. Sechs Zusatzfälle prüfen zehn Turmspieler, acht Parcours-Spieler, sechs Layoutgrößen, Bauentwurf bei Sprachwechsel, Kontrast ≥4,5:1, tatsächlichen Geschenkdiebstahl zwischen zwei Menschen und Loslassen des Sticks bei Netzwerk-Reconnect. Kein vollständiger Playwright-Gesamtlauf wird behauptet.

82 ausgewählte unveränderte Original-PNGs liegen dauerhaft unter `docs/backlog/screenshots/backlog11/`. Größen: 1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450. Kontrollbilder können separate echte Zufallspartien zeigen. Manifeste mit SHA-256 der Originalbilder und LF-normalisierten Quellbytes: [Turmbauer](../../games/turmbauer/evidence.json), [Fallenbauer](../../games/fallenbauer/evidence.json), [Geschenkdiebe](../../games/geschenkdiebe/evidence.json). Es gab vorher keine spielbaren Oberflächen dieser drei Spiele; dies sind Erstimplementierungen.

## Nachprüfungen und Abgrenzung

Der erste Regeltestlauf bestand 15/15, der erste fokussierte Nachlauf 63/63. Ein zusätzlicher Schutz prüft Rolle/Pause/Nonce vor dem Abgleich der aktiven Zeit; abgewiesene pausierte Befehle dürfen auch die private Blockposition nicht vorziehen. Der entsprechende zusätzliche Fall ist im grünen 64er-Lauf enthalten.

Bei Fallenbauer warteten frühe Browser-Treiber auf eine Bauauswahl, obwohl bereits die Laufphase bestätigt war. Die Diagnose zeigte einen älteren Arena-Frame bei gleichzeitig neuerem vollständigem Serverzustand. Der Testtreiber wählt jetzt den neueren Zustand, wartet auf die Bestätigung jeder Platzierung und pollt Hintergrundtabs unabhängig vom Animationszyklus. Die Bauanzeige gleicht sich zusätzlich mit den aktuellen persönlichen Frames ab. Bei Geschenkdiebe lief der erste Transfer-Test am Opfer vorbei; der Treiber hält jetzt in Reichweite vor dem Opfer und benutzt für die Reconnect-Prüfung echte Maus-/Touch-Ereignisse. Der vollständige erste Kontrolllauf bestand 4/6, der Nachlauf 6/6. Ein Client-Testmock fehlte anfangs die normale Spielerliste; nach Ergänzung sind beide Fälle grün. Fehlgeschlagene und abgebrochene Läufe bleiben getrennt und werden nicht als grüne Gesamtprüfung ausgegeben.

Registrierungsänderungen sind auf die drei IDs begrenzt. Historische Shared-Audit-Einträge in BACKLOG-04/07/09/10 und der globale Motiv-Eintrag in den BACKLOG-10-Manifesten werden mit archiviertem Vorgänger auf den aktuellen Registrierungsstand nachgezogen; alte Spielregeln, Bildnachweise und Implementierungscommits bleiben erhalten. Der alte BACKLOG-10-Nachweistest prüft nun die konsistente aktuelle Gesamtsumme statt für immer 35/41 zu verlangen.

Die isolierte Browserprüfung wiederholt alle zwölf Fälle am tatsächlich committeden Spielstand; ihre Originalbilder ersetzen die vorläufigen Aufnahmen. Parallel bearbeitete Server-/Security- und Datenschutzdateien sowie V2-06-Rücknahmen bleiben getrennt und uncommitted. Die vollständige Node-Prüfung verwendet ebenfalls diesen isolierten Stand, damit diese Fremdänderungen nicht das Ergebnis verfälschen.

Die letzte mobile Sichtprüfung fand eine Überlappung des kleinen Szenenetiketts mit dem Statistikhinweis. Nur in den drei neuen Spielwelten erhöht ein mobiler CSS-Nachlauf den Kopfabstand von 20 auf 36 Pixel. Alle sechs Desktop-/Handy-Kontrollfälle wurden danach erneut isoliert ausgeführt; die Kontrollbilder zeigen diesen finalen Abstand. Spiellogik und der vollständige grüne Node-Lauf gehören weiterhin zum unveränderten Implementierungscommit; der CSS-Nachlauf hat seine eigene Commitreferenz und Browserprüfung.

Ein erster normaler Windows-Gesamtlauf hing beim Prozessabschluss zweier bestehender Testdateien (`ops` und `werhatdasgesagt`). Beide bestanden im gezielten Nachlauf unverändert: 14/14 und 11/11 (`artifacts/backlog11-diagnostic-ops.log`, `artifacts/backlog11-diagnostic-werhatdasgesagt.log`). Der erneute Gesamtlauf benutzt Nodes `--test-force-exit`, das nach Abschluss aller Tests offene Windows-Prozess-Handles beendet. Keine Testassertionen wurden dafür geändert. Der unvollständige frühere Lauf bleibt unter `artifacts/backlog11-full-node-stalled.log` getrennt erhalten.

Keine Secrets, Produktionsdaten oder Serverkonfigurationen geändert, kein Produktivdeployment. Ein freigegebener Push kann den vorhandenen Test-/GHCR-Workflow starten. **Nach diesen drei Spielen endet der Auftrag; die übrigen drei benötigen einen neuen Prompt.**

Endzahlen des vollständigen isolierten Node-Laufs auf der Spielimplementierung: 1.612 Fälle, **1.609 bestanden, 0 Fehler, 3 übersprungen**, 202,859 s. Die drei bestehenden Restore-Shell-Fälle benötigen Bash und werden unter Windows übersprungen. Die abschließende gezielte Nachweis-/Design-/Clientprüfung einschließlich der finalen CSS- und Originalbildhashes bestand alle 22 Fälle (`artifacts/backlog11-final-proof.log`).
