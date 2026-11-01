# V2-16 – Bots mit wählbarer Schwierigkeit

Stand: 01.11.2026. Umsetzung und lokale Prüfungen abgeschlossen auf `main`. Keine Freigabe oder Umsetzung eines weiteren V2-Pakets durch diesen Auftrag.

## Bedienung und Umfang

Im Host-Menü unter **Mit Bots spielen (optional)** beim Hinzufügen **Leicht / Mittel / Schwer** auswählen. Die Auswahl neben jedem vorhandenen Bot ändert dessen Stufe. Nur der Host darf hinzufügen, entfernen oder ändern, ausschließlich zwischen abgeschlossenen Runden (Poker: zwischen Händen). Eine gemeinsame Pause öffnet diese Sperre nicht. Abendprogramme behalten ihre feste Gruppe. Bots zeigen am Platz **Bot · Leicht/Mittel/Schwer**.

Standard ist **Mittel**, mit dem bisherigen Aufruf aus `games/bots.js` und demselben Zufallszahlengenerator. Die bestehenden Strategien wurden nicht ersetzt. Scrabbles gemeinsame Wortsuche erhielt optionale Abbruch- und Fortschrittsfunktionen; ohne diese Optionen ist ihr Suchraum und Ergebnis unverändert.

Elf Pilot-IDs unterstützen alle drei Stufen: `poker`, `omaha`, `farbenchaos`, `kniffel`, `viergewinnt`, `reversi`, `monopoly`, `backgammon`, `sechs-nimmt`, `hearts`, `scrabble`. Unterstützt ist jeweils die klassische Variante, bei Monopoly das Standardbrett. Andere Spiele und Varianten zeigen **Nur eine Stufe verfügbar** und spielen mit Mittel. Gespeicherte Präferenzen bleiben beim Wechsel erhalten; eine nicht unterstützte Präferenz wird dabei ausschließlich als Mittel wirksam. Schach ist nicht im vorhandenen Katalog; Backgammon ist der entsprechende Pilot. Dame und Mühle bleiben ausdrücklich bei einer Stufe.

| Pilot | Leicht | Schwer |
| --- | --- | --- |
| Poker / Omaha | Lockere Calls, gelegentliche übergroße Erhöhungen | Simulation unbekannter Karten aus einem eigenen hypothetischen Deck; Hand-/Pot-Odds, seltene Bluffs; vorhandene Handauswertung und Wettstrategie |
| UNO klassisch | Zufällige erlaubte Karte/Farbwahl | Farbmehrheit, Reserve für Wild Cards, Aktionskarten gegen fast leere Gegnerhände |
| Kniffel | Einfache Haltegruppe, gelegentlich schwache Feldwahl | Gewichtete Erwartungswerte der möglichen nächsten Würfe und freien Felder |
| Vier gewinnt | Zufällige erlaubte Spalte | Iterative Alpha-Beta-Suche bis Tiefe 8, Siegdrohungen und Fensterbewertung |
| Reversi | Zufälliges erlaubtes Feld | Suche bis Tiefe 6, Ecken, Mobilität und Risiken neben freien Ecken |
| Backgammon | Zufälliger erlaubter Zug | Pip-/Positionswert, Schlagrisiko, Fortsetzung des Würfelzuges und Verdopplungsantwort |
| Monopoly klassisch | Häufiger Kaufverzicht, niedrige Auktionswerte, zurückhaltender Ausbau | Gruppenwert, Liquiditätsreserve, Ausbau nach Mietertrag, Ablösen und gruppenvervollständigender Handel |
| 6 nimmt! | Zufällige erlaubte Karte/Reihe | Reihenlänge, Abstand und Hornochsen; minimale Strafreihe |
| Hearts | Zufälliges erlaubtes Weitergeben/Ausspielen | Risikokarten abgeben, bedienen/ducken, Strafkarten gezielt loswerden |
| Scrabble | Suche nach kurzen Wörtern (bis drei Buchstaben) | Beste gefundene Wort-/Prämienwertung aus der vorhandenen eigenen Wortliste |

## Informationen und Rechenzeit

`server/bot-observation.js` erstellt eine explizite Projektion aus eigener Hand und öffentlichen Feldern. Poker übergibt ausschließlich eigene Hole Cards, Board, öffentliche Pot-/Gegnerzahlen und erlaubte Aktionen; fremde Hole Cards und das echte Deck werden nicht gelesen. UNO kennt nur fremde Kartenanzahlen. Hearts und 6 nimmt! geben keine verdeckten Entscheidungen weiter. Scrabble übergibt nur die eigene Bank und die Beutelanzahl. Monopoly nutzt öffentliches Geld, Besitz und Freikartenanzahl, keine Ereignisstapel. Rollen, Konten, Cookies und Tokens gelangen nicht an den Worker.

Easy/Hard laufen in höchstens zwei Worker-Threads. Pro Entscheidung gelten **35 ms kooperatives Suchbudget**, maximal 40.000 Suchschritte sowie **250 ms äußere Frist einschließlich Warteschlange/Workerstart**. Abbruch liefert die beste bisher gemeldete regelkonforme Aktion, andernfalls einen billigen legalen Ersatz. Suchschritte können eine einzelne Regelbewertung noch abschließen; spätestens die äußere Frist beendet den Worker. Alle Stufen behalten denselben vorhandenen 800-ms-Spieltakt. Mittel verwendet unverändert den bisherigen Bot-Treiber.

Pause, Raumwechsel und veraltete Antworten werden abgefangen. Vor dem Anwenden werden die aktuellen öffentlichen Daten einschließlich Runden-/Handgeneration erneut verglichen. Neustart/Snapshot und Reconnect erhalten die Stufe. Bots behalten ihre vorhandene Raum-Spieler-ID und das `bot`-Flag, bekommen kein Konto und zählen weiterhin weder in öffentlicher Bestenliste noch Erfolgen oder Presence.

## Tatsächliche Strategiemessung

Je Pilot **200 Vergleiche**, insgesamt **2.200**; Plätze/Stufen wechseln. Aus `npm.cmd test` am 01.11.2026. Maschinendaten: [v2-16-strength-results.json](v2-16-strength-results.json). Das sind feste Testszenarien und keine Behauptung einer allgemeinen oder statistisch bewiesenen Spielstärke gegen Menschen. Zeitgrenzen können auf anderen Rechnern zu leicht anderen Entscheidungen führen.

| Spiel | Schwer / Leicht / Remis (Siege) | Aussagekräftige Wertung |
| --- | --- | --- |
| Vier gewinnt | 199 / 1 / 0 | Standardstart, vollständige Partien |
| Reversi | 200 / 0 / 0 | Standardstart, vollständige Partien |
| Backgammon | 151 / 49 / 0 | Vollständige Einzelspiele ab legalen, gewürfelten Heimfeld-Rennstellungen; kein Nachweis für komplette Kontaktpartien oder Matches |
| Poker | 79 / 119 / 2 | **+4,34 / −4,34 Nettochips je Hand**; weniger gewonnene Hände bei besserem Chipergebnis |
| Omaha | 102 / 95 / 3 | **+10,005 / −10,005 Nettochips je Hand** |
| UNO | 125 / 75 / 0 | 62,5 % gegenüber 37,5 % Rundensiege |
| Hearts | 184 / 13 / 3 | **1,9375 / 11,8425 Strafpunkte** je Blatt, vier Spieler mit je zwei Bots pro Stufe |
| 6 nimmt! | 165 / 33 / 2 | **6,005 / 14,755 Hornochsen** je vollständigem Zehn-Karten-Blatt |
| Kniffel | 198 / 2 / 0 | **232,575 / 112,25 Punkte** je vollständiger Partie mit 13 Feldern |
| Monopoly | 177 / 23 / 0 | **9.718,915 / 2.396,84 Endvermögen**; vorhandene Ein-Minuten-Zeitpartien mit virtueller Testuhr (50 ms/Aktion, maximal 1.200 Aktionen) |
| Scrabble | 149 / 51 / 0 | **53,545 / 26,515 Endpunkte**; kompletter 102-Steine-Beutel, reguläres Ende inklusive sechsmal Passen |

Zufall wird für Startverteilungen und Botentscheidungen gesetzt; UNO kann beim späteren Neumischen weiterhin den vorhandenen Spiel-RNG benutzen. Poker-Chipsumme, Monopoly-Geld inklusive Bank/Parktopf und Hearts-Rohpunkte werden zusätzlich geprüft. Die Vergleichssuche nutzt das gleiche 35-ms-Zeitbudget und bewusst kleine Knotengrenzen (Vier gewinnt/Backgammon 600, Reversi 120, Kniffel/Scrabble 12.000); der Server darf innerhalb seiner 35 ms bis 40.000 Schritte suchen.

Der erste Monopoly-Kurzvergleich mit nur 240 Aktionen war mit 106:94 zu schwach für die festgelegte Siegschwelle. Der endgültige Test spielt bis zu 1.200 Aktionen und prüft auch das Endvermögen. Die Schwelle wurde nicht abgesenkt. Poker wird wegen Folds anhand der Chips bewertet.

## Prüfungen und Nachweise

- `npm.cmd test`: **1.140 bestanden, 0 fehlgeschlagen, 3 übersprungen** (1.143 Tests; bestehende Bash-Restore-Tests unter Windows), 74,38 Sekunden. Enthält alle elf Vergleichssimulationen.
- `node --test test/bot-difficulty.test.js`: **12 bestanden**. Host-/Phasen-/Levelprüfung, alle Piloten mit unverändertem Mittel-Aufruf, Snapshot, nicht unterstützte Varianten, Statistik/Presence, Budget, echte und absichtlich blockierte Worker, Pause und veraltete Rundenantworten.
- `node --test test/bot-difficulty-privacy.test.js`: **11 bestanden**. Fremde Hand-/Beutelinhalte werden durch Sentinelwerte ersetzt; eigene Beobachtung und Easy/Hard-Entscheidung bleiben gleich. Bei Poker werfen Getter auf echte fremde Hände/Decks sofort einen Fehler.
- Gezielte Playwright-Prüfung `test/ui/bot-difficulty.spec.js`: **4 bestanden**, Desktop und Handy, einschließlich live ausgeführtem Worker-Zug.
- Bestehende Bot-UI plus neue Auswahltests: zuvor **10 bestanden** auf Desktop und Handy.
- Bisher roter Backgammon-Test `Roadmap: Navigation, Filter, Spielregeln und gemerkte abgeschlossene Etappen`: **2 bestanden**. Ursache war fehlende öffentliche Regelmetadaten nach der Implementierung des Spiels. `games/backgammon/rule-summary.js` liefert nun neun echte Regelpunkte; keine Regeländerung und keine gelockerte Assertion.
- `npm.cmd run test:fast`: **1.019 bestanden, 0 fehlgeschlagen**, 45,20 Sekunden. Die 2.200 Vergleichssimulationen sind als Langläufer im vollständigen Node-Lauf enthalten.
- Nach dem abschließenden Roadmap-Status erneut **1.019 schnelle Tests bestanden, 0 fehlgeschlagen** (24,50 Sekunden) und die komplette `roadmap-presence.spec.js` auf Desktop/Handy **8 bestanden** (45,5 Sekunden), einschließlich des Backgammon-Regeldialogs.
- Vollständige Playwright-Suite: **542 erfasst, 491 bestanden, 33 fehlgeschlagen, 18 vorgesehene Skips**, 36,0 Minuten (`playwright test --workers=2`, keine Filter). Dies war kein grüner Gesamtlauf.
- Anschließend 70 ausgewählte Nachprüfungen: **68 bestanden, 2 fehlgeschlagen**, 14,0 Minuten. Letzte gezielte Prüfung nach deren Korrektur plus UNO-/Bot-/Backgammon-Regressionen: **12 bestanden, 0 fehlgeschlagen**, 57,6 Sekunden. **Alle 524 ausgeführten Fälle haben damit einen grünen letzten Prüflauf; kein offener fehlgeschlagener Fall.** Es wurde kein zweiter sauberer Komplettlauf behauptet. Fallzuordnung, Befehle und Prüfsummen der lokalen Protokolle: [v2-16-browser-results.json](v2-16-browser-results.json).

Die 33 Ausfälle des Komplettlaufs hatten folgende Ursachen: 28 ältere Mehrspieler-Fixtures verwendeten weitere Sockets mit demselben Host-Cookie (26 Katalog-/Sprachgruppen, zwei Team-Kartenfälle); sie benutzen jetzt getrennte HTTP-Cookie-Jars und regulär vom Server ausgestellte Identitäten. Ein Katalogtest ließ mehr als 50 Tische offen und schließt nun jeden geprüften Tisch. Ein Dialogtest brauchte für den gewachsenen Katalog mehr als 30 Sekunden. Zwei Fälle verloren Trace-Dateien, weil ein zusätzlicher Testlauf versehentlich denselben Artefaktordner nutzte; Nachläufe haben eigene Ausgabeordner. Ein UNO-Anzeigetest wartete nach Reload auf den Spielzustand, aber noch nicht auf das geladene Modul.

Im 70er-Nachlauf kamen zwei reine Test-Races hinzu: Ein Skip-Bo-Knopf konnte zwischen Sichtbarkeits- und Aktivitätsprüfung verschwinden; seine Abfrage wartet jetzt begrenzt und prüft den aktuellen Zustand. Ein später Browser-Request traf auf den bereits beendeten Testserver; die Page-Fixture schließt den Browser nun vor dem Server. Assertions, Zugregeln und Produktions-Identitätscode wurden dafür nicht gelockert oder verändert. Beide Fälle und UNO No Mercy bestehen die abschließende Desktop-/Handyprüfung.

Bedienungsnachweise: [Desktop: Stufenwahl](screenshots/v2-16/desktop-host-levels.png), [Handy: Stufenwahl](screenshots/v2-16/mobil-host-levels.png), [Desktop: Fallback](screenshots/v2-16/desktop-single-level.png), [Handy: Fallback](screenshots/v2-16/mobil-single-level.png). Erzeugt mit `BOT_LEVEL_CAPTURE=1`; reguläre Testläufe schreiben nur ignorierte Testartefakte.

## Implementierungs-Commits

- `3e3cd3f`: Infrastruktur, begrenzte Worker, Host-UI, Snapshot und Brettspielpiloten; Backgammon-Regelmetadaten.
- `6969ede`: Kartenstrategien Poker/Omaha, UNO, Hearts, 6 nimmt! und Informationsgrenzen.
- `6fde83a`: Kniffel-Erwartungswerte.
- `4127b5a`: Monopoly und Scrabble; optionale gemeinsame Suchabbruchpunkte, Testzeit-/Wortumfang.
- `e7766ef`: abschließende Sicherheits-/UI-Nachweise, Screenshots und gezielte Browser-Fixture-Korrekturen; keine weitere Spiellogik geändert.

Bestehende CUX-/Backlog-Quellprüfsummen wurden nur für die ausdrücklich betroffenen Dateien nachgezogen; vorherige Audits bleiben als `pre_v2_16_*` erhalten. Historische Umsetzungs-Commits, Screenshots, Spielstatus und andere Arbeitspakete bleiben erhalten. Die parallel bearbeiteten Login-, Identitäts-, Sicherheits-, Profil- und Admin-Dateien wurden nicht geändert. Der freigegebene Push startet die vorhandenen CI-/GHCR-Prüfungen; kein Produktivdeployment.
