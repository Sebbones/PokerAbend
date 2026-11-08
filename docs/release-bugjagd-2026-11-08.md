# Release-Bugjagd – 8. November 2026

Alle **107 registrierten Spiele (95 Raumspiele, 12 lokale Solo-Spiele)** wurden auf Desktop (1440×900) und Handy (390×844, Touch-Kontext) bis zu einem regulären Runden- oder Spielende geprüft. Gefundene Speicher-, Bedienungs-, Layout- und Übersetzungsfehler wurden korrigiert. **Eine uneingeschränkte Freigabe „Englisch vollständig“ wird wegen E1 ausdrücklich nicht erteilt.**

Arbeitsbasis: `main`, Commit `74f8524`. Änderungen betreffen Spieloberflächen, notwendige Tests und diesen Bericht. `public/singleplayer/` wurde nach zusätzlicher ausdrücklicher Freigabe einbezogen. Keine Änderungen an `server/`, Konto-Seiten, Workflows, Spielregeln, RNG, Identitäten oder Planungsstatus; kein Produktivdeployment.

## Tatsächliche Korrekturen

| ID | Fehler und Korrektur | Nachweis |
|---|---|---|
| B1 | UNO/Farbenchaos: 6 und 9 besitzen jetzt auch in beiden gedrehten Ecken die Unterstreichung. | `test/release-uno.test.js`: vorher 0 statt 2 unterstrichene Ecken; anschließend grün. |
| B2 | Beim Wechsel DE→EN blieben viele klassische Regelseiten deutsch. Die Spieloberfläche lädt geprüfte englische Gegenstücke und verwendet sie abhängig von der aktuellen Sprache; Varianten behalten ihre eigenen Regeln. | Vollständige Regeltexte im tatsächlichen Regeln-Tab der Browserdurchläufe geprüft. Regel- und Bot-Tests bleiben erhalten. |
| B3 | Deutsche Werte in sonst englischen Oberflächen: Punkteblätter, Farbnamen, Kartenwahl, Einsatzstatus, Würfelhinweise, Kartenanzahlen, Rollenbeschreibungen, Pokerhände, Zahlenzoo-Fragen und Ergebnisüberschriften korrigiert. Namen und eigene Inhalte bleiben unverändert. | `test/release-language.test.js`, gezielte Browser-Regressionsprüfungen und erneute Partien; alle Pokerkategorien und Rangnamen zusätzlich geprüft. |
| B4 | Navigation, einzelne Karten/Würfel, Mühle-Punkte, Dame/Reversi, Monopoly, Labyrinth-Pfeile und Schatzinsel hatten mobile Ziele unter 44 px. Vergrößert; große Bretter bleiben innerhalb ihres verschiebbaren Spielbereichs. | Messung sichtbarer, aktivierter Steuerelemente; kein horizontaler Seitenüberlauf. |
| B5 | Der Hinweis „nicht gewertet“ überlagerte auf schmalen Bildschirmen den UNO-/Kartenwelt-Kopf. Abstand korrigiert. | Browser-Test prüft die tatsächlichen Begrenzungsrechtecke. |
| B6 | Die Pausenfläche der lokalen Puzzle-Spiele konnte Regeln und andere Bedienelemente verdecken. Sie nimmt jetzt eigenen Platz im Spielinhalt ein. | Pointer-Test für Block Puzzle, Solitär, Mahjong-Solitär und Match-3 auf beiden Größen. |
| B7 | Solo-Brettzellen waren teils kleiner als 44 px; beim erneuten Zeichnen konnte eine horizontale Verschiebung verloren gehen. Zellgrößen, begrenzte Scrollbereiche und Erhalt der Scrollposition beim Auswählen/Eingeben korrigiert. | Mobile Messungen sowie echte Auswahl/Eingabe am rechten Rand von Sudoku und Block Puzzle. |
| B8 | Wellenwacht speicherte Sieg, Niederlage oder Wellenende nicht zuverlässig, wenn die Animation vor dem nächsten Sekunden-Autosave stoppte. Diese Zustandsübergänge werden sofort gespeichert. | Drei Runtime-Regressionstests waren vorher rot und sind anschließend grün; frische Desktop-/Handy-Partien enden regulär. |
| B9 | Ein beim Sprachwechsel absichtlich erhaltener Zeichenbereich behielt die deutsche Zählanzeige. Die Anzeige wird jetzt aktualisiert, ohne Eingabehandler doppelt zu binden oder Striche zurückzusetzen. | Runtime-Test und erneute Mehr-Kontext-Durchläufe der Zeichenspiele. |

Historische Card-UX-Nachweise wurden nicht umgeschrieben: `test/fixtures/release-2026-11-08/source-audit.json` hält ursprüngliche und korrigierte Quellen getrennt fest. Der bestehende Nachweistest prüft beide Versionen. Alte Screenshots werden damit nicht als Bilder des neuen Stands ausgegeben.

## Prüfmethode und Grenzen

- **214 Spiel-/Gerätekombinationen:** echte isolierte Express-/Socket.IO-Server mit temporären Datenverzeichnissen, echte Regeln, echte Uhren und RNG. Keine eingelegten End-Spielstände, erzwungenen Gewinner, verkürzten Testuhren oder künstlichen Spielabbrüche.
- Raumspiele laufen mit vorhandenen Bot-Strategien. Ein Testtreiber führt auch den Host-Platz über dieselben regulären Entscheidungen und meldet echte Zustandsänderungen an den Browser; er beschleunigt Entscheidungsabstände. Er ersetzt keine Spiellogik. Er zählt nicht als Prüfung jedes einzelnen Eingabeknopfs und nicht als Nachweis des normalen 800-ms-Bot-Takts.
- Wer bin ich?, Kritzelpost, Bildunterschrift und Malen & Raten verwenden getrennte Browser-Kontexte und reguläre Spielereingaben. Beim eigenen Begriff wird zusätzlich die fehlende Sichtbarkeit geprüft.
- Hearts, Skat und Doppelkopf: vollständiges Blatt; Backgammon: vollständiges Einzelspiel; Poker/Omaha: vollständige Hand. Die übrigen Raumspiele erreichen ihr reguläres Spielende. Das entspricht der Vorgabe „Spielende oder Rundenende“, nicht einer vollständigen langen Serie.
- Solo-Spiele starten frisch. Der Treiber verwendet normale Eingaben und für lösungsbasierte Prüfungen den lokalen Stand bzw. die vorhandenen Logikfunktionen. Auch eine reguläre Niederlage zählt als Spielende. Solitär darf mehrere echte neue Deals benötigen; es werden keine vorbereiteten Gewinnstände geladen.
- Pause wird vor dem Fortsetzen geprüft; ein Reload behält den Raum-Spieler bzw. den lokalen Stand und den Pausenzustand. Sichtbare Regeln, englische Ansicht, Ergebnisse, Konsolen-/Seitenfehler, Größen und horizontaler Seitenüberlauf werden erfasst. Ergänzende Tests prüfen direkte Pointer-Bedienung und Sprachwechsel.
- Die Tabelle belegt die geprüften Standardabläufe und gewählten legalen Einstellungen. Sie ist kein Beweis für jede Hausregel, jede Rollenverteilung, alle Sololevel, jede Browsermarke oder jede Bildschirmgröße. Ein Regeln-Tab wurde mit der implementierten Regelbeschreibung abgeglichen; eine externe Regelzertifizierung ist damit nicht gemeint.
- Große Bretter dürfen innerhalb ihres begrenzten Bereichs verschoben werden. „Kein Überlauf“ bedeutet kein seitliches Überlaufen der gesamten Seite; es bedeutet nicht, dass ein großes Brett vollständig ohne Verschieben auf ein Handy passt. Überlappende Karten/Steine können kleinere freiliegende Streifen als ihre gemessene Gesamtfläche besitzen.

## Testergebnisse

| Prüfung | Tatsächliches Ergebnis |
|---|---|
| Letzter Bericht je Raumspiel/Gerät | 190/190 reguläre Enden; Pause, Reload, Regeln und Ergebnis sichtbar; keine erfassten Konsolenfehler oder Seitenüberläufe |
| Letzter Bericht je Solo-Spiel/Gerät | 24/24 natürliche Enden; mobile Messungen ohne Ziele unter 44 px |
| Gezielter Korrekturdurchlauf | 44/44 bestanden |
| Sprach-Nachprüfung | 58/58 bestanden |
| Letzte Beschriftungs-/Rundenende-/UI-Nachprüfung | 34/34 bestanden |
| Zeichnen/6 nimmt! nach letzter Sprachkorrektur | 8/8 bestanden |
| Poker/Omaha nach Handnamen-Korrektur | 4/4 bestanden |
| Node-Gesamtlauf | 1921 bestanden, 6 übersprungen, 0 Fehler (1927 insgesamt; 10 min 41 s) |

Der erste große Raumspiel-Lauf hatte 185/190 bestanden; fünf vorhandene Blatt-/Einzelspielwertungen wurden vom damaligen Ergebnis-Selektor nicht erkannt. Die gezielten Wiederholungen sind grün. Beim ersten Solo-Korrekturlauf waren 30/32 grün; Block-Puzzle-Scrollposition und Mahjong-Zellhöhe wurden danach korrigiert. Der erste Node-Gesamtlauf hatte 1908 bestanden, 6 übersprungen und 5 Fehler: zwei überholte Quell-Prüfsummen sowie drei zeitabhängige Fälle unter paralleler Last. Die Nachweise wurden getrennt historisch/aktuell erhalten; der abschließende Node-Gesamtlauf wurde sequenziell grün ausgeführt. Danach wurden die letzten Kniffel-Sprachhinweise noch einmal gezielt geprüft: 25/25 Node-Tests, 10/10 UI-Regressionen und 2/2 vollständige Kniffel-Enddurchläufe grün. Einzelne frühere Diagnose-Läufe hatten zudem noch unvollständige Testtreiber; sie werden nicht als Produktfehler oder erfolgreiche Enddurchläufe gezählt.

Die langen Release-Partien sind bewusst **opt-in**, damit sie die normale CI nicht um einen kompletten zusätzlichen Abend verlängern. Gezielte UI-Regressionstests und Node-Regressionstests laufen regulär mit. Wiederholung unter PowerShell:

```powershell
$env:RELEASE_AUDIT = '1'
Remove-Item Env:RELEASE_GAMES -ErrorAction SilentlyContinue
npx playwright test test/ui/release-games.spec.js test/ui/release-solo.spec.js --workers=2
npx playwright test test/ui/release-regressions.spec.js
node --test --test-force-exit --test-concurrency=1 "test/*.test.js"
```

`RELEASE_GAMES` kann eine kommagetrennte ID-Liste für gezielte Nachprüfungen enthalten. `--test-force-exit` beendet nach Abschluss der Node-Tests verbliebene Test-Worker; es erzwingt keine Spielausgänge. Die sonstige komplette Playwright-Suite wurde in diesem Auftrag nicht erneut vollständig durchlaufen; der Spiel-Audit und die genannten gezielten Prüfungen wurden ausgeführt.

## Offener Punkt E1 – Englisch bei freien Servertexten

**Offen, mittlere Priorität:** Einige Verlaufszeilen, Sprechblasen, Fehlermeldungen oder freie Detailtexte bleiben deutsch, beispielsweise „zieht neue Karten“ oder „findet einen Schatz auf Annas Insel“. Die geprüften Regeln und zahlreiche Bedienungstexte sind korrigiert; vollständiges Englisch über alle Ansichten ist dennoch nicht erreicht.

Diese Texte enthalten teils Namen oder selbst geschriebene Inhalte und liegen als fertige Sätze vor. Eine pauschale DOM-/Textübersetzung wäre unzuverlässig und könnte Nutzerinhalte verändern. Eine saubere durchgängige Lösung benötigt lokalisierbare Nachrichtenschlüssel bzw. den gemeinsamen Plattform-Formatter; diese Plattformstellen wurden entsprechend der Bereichsgrenze nicht verändert. Die englische Ergebnisüberschrift nutzt strukturierte Gewinner, übersetzt aber keine beliebigen freien Ergebnisbegründungen. **E1 gilt als gemeinsame Einschränkung für Raumspiele und bleibt vor einer vollständig englischen Release-Freigabe zu schließen.**

## Tabelle pro Spiel

`D/M` = Desktop/Handy. `✓/✓` bedeutet zwei tatsächlich dokumentierte Enddurchläufe. „Behoben / E1 offen“ trennt bestandene Spiel-/UI-Prüfungen von der verbleibenden Sprachlücke; es ist kein vollständiges Release-OK. Konsole enthält erfasste Seitenfehler und `console.error`. Die maschinenlesbare Zusammenfassung samt Quell- und Screenshot-Prüfsummen steht unter [release-bugjagd-2026-11-08/evidence.json](release-bugjagd-2026-11-08/evidence.json).

| Spiel (ID) | Ende D/M | Pause/Reload D/M | Regeln D/M | Handy: ≥44 px / kein Seitenüberlauf | Konsole D/M | Englisch | Status |
|---|---|---|---|---|---|---|---|
| 2048 (`2048`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | ok |
| 6 nimmt! (`sechs-nimmt`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Backgammon (`backgammon`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B4) |
| Bildunterschrift (`bildunterschrift`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4, B9) |
| Blackjack (`blackjack`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Block Puzzle (`block-puzzle`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B6, B7) |
| Bomben-Duell (`bomben-duell`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Bröckelboden (`broeckelboden`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Brückenroulette (`brueckenroulette`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Chicago (`chicago`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Dame (`dame`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Domino (`domino`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Doppelagent (`doppelagent`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Doppelkopf (`doppelkopf`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B4) |
| Durak (`durak`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Exploding-Deck (`exploding-deck`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Fallenbauer (`fallenbauer`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Five Card Draw (`five-card-draw`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Gebietskampf (Risiko-inspiriert) (`gebietskampf`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Gedächtnisküche (`gedaechtnis-kueche`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Geschenkdiebe (`geschenkdiebe`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Geschenkfänger (`geschenkfaenger`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Gummiband-Challenge (`gummiband-challenge`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Hearts (`hearts`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B4) |
| Hex (`hex`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Infektionsjagd (`infektionsjagd`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Jäger & Schatten (`jaeger-schatten`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Kistenchaos (`kistenchaos`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Kniffel (`kniffel`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Kritzelpost (`kritzelpost`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4, B9) |
| Kronenjagd (`kronenjagd`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Labyrinth-Brett (`labyrinth-brett`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Labyrinth-Chaos (`labyrinth-chaos`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Laser-Hüpfer (`laser-huepfer`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Letzter Schutzplatz (`letzter-schutzplatz`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Lügenbaron (`luegenbaron`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Lügenwürfel (`luegenwuerfel`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Mahjong Solitaire (`mahjong-solitaire`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B6, B7) |
| Malen & Raten (`malen-raten`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4, B9) |
| Match-3 (`match-3`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B6, B7) |
| Mau-Mau (`maumau`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Mäxchen (`maexchen`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Memory (`memory`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | ok |
| Mensch ärgere Dich nicht (`huetchen`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Minenlauf (`minenlauf`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Minesweeper (`minesweeper`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B7) |
| Mogeln (`mogeln`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Monopoly (`monopoly`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Monopoly Deal (`monopoly-deal`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Monsterwürfel (`monsterwuerfel`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Mühle (`muehle`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Nonogramm (`nonogramm`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B7) |
| Omaha (`omaha`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Omaha Hi/Lo (`omaha-hi-lo`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Pfeilfieber (`pfeilfieber`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Phase 10 (`zehnetappen`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4, B5) |
| Präsident (`praesident`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Puzzle-Panik (`puzzle-panik`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Reaktor-Notfall (`reaktor-notfall`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Regelwahnsinn (`regelwahnsinn`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Reversi (`reversi`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Rhythmus-Rausch (`rhythmus-rausch`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Risiko-Würfeln (`risiko-wuerfeln`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Schach (`schach`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Schatzgräber (`schatzgraeber`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Schatzinsel (`schatzinsel`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Schätzmeister (`schaetzmeister`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Scheinwerfer-Flucht (`scheinwerfer-flucht`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Schiffe versenken (`schiffe`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Schlagfertig (`schlagfertig`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Schocken (`schocken`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Schubsarena (`schubsarena`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Schwimmen (`schwimmen`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Scotland Yard (`scotland-yard`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Scrabble (`scrabble`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Seven Card Stud (`seven-card-stud`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Short Deck Poker (`short-deck`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Shut the Box (`shutthebox`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Skat (`skat`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B4) |
| Skip-Bo (`stapelrennen`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4, B5) |
| Snake (`snake`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | ok |
| Sokoban (`sokoban`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B7) |
| Solitaire (`solitaire`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B6, B7) |
| Sortierstation (`sortierstation`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Spiel des Lebens (`spiel-des-lebens`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Städtehandel (`staedtehandel`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Stichmeister (`stichmeister`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Stillgestanden! (`stillgestanden`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Story-Chaos (`story-chaos`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Sudoku (`sudoku`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B7) |
| Texas Hold'em (`poker`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Tickendes Paket (`tickendes-paket`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Turmbauer (`turmbauer`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| UNO (`farbenchaos`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4, B1, B5) |
| Vier gewinnt (`viergewinnt`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Wellenwacht (`wellenwacht`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | ✓ | behoben (B7, B8) |
| Wer bin ich? (`wer-bin-ich`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Wer hat das gesagt? (`werhatdasgesagt`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Werwolf (`werwolf`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Wortjagd (`wortjagd`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Würfel-Auktion (`wuerfel-auktion`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Würfelduell (`wuerfelduell`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Würfeljagd (`wuerfeljagd`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Würfelpoker (`wuerfelpoker`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Zahlenreihe (`zahlenreihe`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B3, B4) |
| Zahlenzoo (`zahlenzoo`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |
| Zehntausend (`zehntausend`) | ✓/✓ | ✓/✓ | ✓/✓ | ✓ / ✓ | 0/0 | UI/Regeln geprüft; E1 | behoben / E1 offen (B2, B3, B4) |

## Ausgewählte dauerhafte Screenshots

| Screenshot | Zeigt | Größe |
|---|---|---|
| [farbenchaos-mobil-playing.png](release-bugjagd-2026-11-08/farbenchaos-mobil-playing.png) | UNO: mobile Kartenwelt ohne überlagerten Titel | 390×844 |
| [poker-desktop-result.png](release-bugjagd-2026-11-08/poker-desktop-result.png) | Poker: reguläres Handende | 1440×900 |
| [backgammon-mobil-result.png](release-bugjagd-2026-11-08/backgammon-mobil-result.png) | Backgammon: Wertung des Einzelspiels | 390×844 |
| [hearts-desktop-result.png](release-bugjagd-2026-11-08/hearts-desktop-result.png) | Hearts: abgerechnetes Blatt | 1440×900 |
| [labyrinth-brett-mobil-playing.png](release-bugjagd-2026-11-08/labyrinth-brett-mobil-playing.png) | Labyrinth: eigene Aufgabe und größere Pfeile | 390×844 |
| [wellenwacht-mobil-result.png](release-bugjagd-2026-11-08/wellenwacht-mobil-result.png) | Wellenwacht: echtes Spielende | 390×1934 |
| [block-puzzle-mobil-playing.png](release-bugjagd-2026-11-08/block-puzzle-mobil-playing.png) | Block Puzzle: große Felder und begrenzter Scrollbereich | 390×1366 |
| [mahjong-solitaire-mobil-playing.png](release-bugjagd-2026-11-08/mahjong-solitaire-mobil-playing.png) | Mahjong: größere Steine | 390×1062 |
| [zahlenzoo-mobil-playing.png](release-bugjagd-2026-11-08/zahlenzoo-mobil-playing.png) | Zahlenzoo: englische Frage | 390×844 |
| [bildunterschrift-mobil-playing.png](release-bugjagd-2026-11-08/bildunterschrift-mobil-playing.png) | Zeichnen: englische Zählanzeige | 390×844 |

Die vollständigen lokalen Detailberichte und weiteren Bilder befinden sich unter `artifacts/release-2026-11-08/<desktop|mobil>/<id>/`. Die ausgewählten Nachweise und die kompakte Zusammenfassung werden mit diesem Bericht versioniert.

## Abschluss

Es wurden keine weiteren Arbeitspakete begonnen oder als erledigt markiert. Ein Produktivdeployment wurde nicht durchgeführt. Vor einer uneingeschränkten englischen Release-Freigabe bleibt E1 offen; die vorliegenden Testgrenzen sind bei der Bewertung zu berücksichtigen.
