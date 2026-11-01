# Code-Review und Aufräumen vom 1. November 2026

Freigabe: Review und Aufräumen des gesamten Projekts auf `main`. Kein V2- und kein VIS-Paket, keine neuen Funktionen. Ausgangspunkt: `5667b85`. Behoben wurde nur, was sich ohne Änderung von Regeln, IDs, URLs, Cookies, Datenformaten oder Design beheben ließ. Jeder Fix hat einen Regressionstest, der vor der Korrektur fehlschlug.

**Ehrlicher Rahmen:** Es wurde gelesen, gemessen und gezielt mit Fehleingaben beschossen. Es gab keinen Dauerlauf, keinen Lasttest und keine Messung von Ladezeiten im Browser. Wo etwas nur stichprobenartig geprüft wurde, steht das dabei.

**Parallele Arbeit:** Während der Review arbeitete jemand anderes im selben Arbeitsverzeichnis (neue, noch nicht committete Dateien: `games/backgammon/`, `public/games/backgammon/`, `server/admin.js`, `server/admin/`, `server/maintenance.js`, `server/ops.js`; geänderte `games/index.js`, `games/bots.js`, `public/game-design.js`, `server/index.js`). Damit nichts davon in meine Commits gerät und meine Testläufe nicht von Halbfertigem abhängen, lief die gesamte Review in einem abgetrennten Worktree auf dem Stand von `origin/main` (ohne Branch, nur Push auf `main`). Diese fremden Änderungen wurden weder geprüft noch committet. Meine Änderungen an `server/index.js` stehen in Commit `323454c`/`8b2ce10`; wer an dieser Datei weiterarbeitet, sollte vor dem eigenen Commit `git pull --rebase` ausführen (die Änderungen sind klein und liegen in getrennten Abschnitten).

## 1. Funde

Schweregrad: hoch = Datenverlust oder ausnutzbar mit Folgen für andere; mittel = echter Fehler mit begrenzter Wirkung; niedrig = Härtung, falsche Meldung oder Wartung. „behoben“ verweist auf Commit und Test.

| # | Schwere | Datei | Problem | Behoben | Commit / Test |
|---|---|---|---|---|---|
| 1 | mittel | `server/leaderboard.js` | Eine unlesbare oder falsch aufgebaute `leaderboard.json` wurde beim Start durch eine leere Bestenliste ersetzt und von der nächsten Speicherung überschrieben. Ein einziger kaputter Schreibvorgang (z. B. Datenträger voll, Kopierfehler) hätte die gesamte Bestenliste und damit alle Erfolge gelöscht. Tickets, Pläne, Rückblicke und Bretter lehnen so eine Datei dagegen ab und lassen sie liegen. | ja | `323454c`; `test/code-review-2026-11.test.js` (2 Tests: Sicherung als `leaderboard.json.unlesbar-<Zeit>`, intakte/fehlende Dateien bleiben unberührt) |
| 2 | niedrig–mittel | `server/index.js` | Spiel-IDs wurden mit `GAMES[id]` nachgeschlagen. `__proto__`, `constructor` oder `toString` galten als vorhandenes Spiel; `switchGame` und `create` gaben die interne Meldung „game.create is not a function“ an den Browser, `/api/leaderboard?game=__proto__` antwortete mit einem erfundenen Spiel. | ja | `323454c`; Test „Objekt-Eigenschaftsnamen sind keine Spiele“ (echter Server) |
| 3 | niedrig | `server/index.js` | `create` mit `settings` als Text/Zahl: Poker antwortete „Cannot use 'in' operator …“. Jetzt zählen Nicht-Objekte als „keine Einstellungen“. | ja | `323454c`; Test „Einstellungen und Namen vom falschen Typ“ |
| 4 | niedrig | `server/base-room.js` | `name` als Objekt/Zahl wurde zu „[object Object]“ bzw. „12“. Jetzt muss ein Name Text sein. | ja | `323454c`; Test „Namen müssen Text sein“ |
| 5 | niedrig–mittel | `server/presence.js` | „Zuletzt online“ und die Liste versteckter Namen wuchsen je neuem Namen bis zu 24 Stunden ohne Obergrenze. Ein angemeldeter Browser, der laufend neue Namen meldet (bis 8 Ereignisse/s erlaubt), konnte den Speicher füllen. Jetzt höchstens 200 Einträge je Liste, älteste fallen zuerst weg. Normale Gruppen liegen weit darunter. | ja | `323454c`; Test „zuletzt online ist begrenzt“ |
| 6 | niedrig | `games/drawing-room.js` | Der Befehl `vote` in „Malen & Raten“ (und `answer`/`drawing` in Räumen ohne diese Methoden) endete mit „room.vote is not a function“. Jetzt „Das gibt es in diesem Spiel nicht“. | ja | `323454c`; Test „Abstimm-Befehl nur dort wirksam, wo es ihn gibt“ |
| 7 | niedrig | `server/index.js` | Der 30-Sekunden-Timer zur Host-Übergabe hielt Raum und Prozess bis zu 30 s länger am Leben (kein `unref`). | ja | `8b2ce10` (kein eigener Test: nicht sinnvoll prüfbar) |
| 8 | niedrig | `package.json`, `package-lock.json` | Beschreibung „acht Multiplayer-Spiele“, Version 1.0.0. Jetzt aktuelle Beschreibung und 2.0.0 (die neue Betriebsseite `server/ops.js` liest die Version aus `package.json` und zeigt jetzt 2.0.0). | ja | `8b2ce10` |
| 9 | niedrig | `test/*.test.js` (8 Dateien) | Serverports wurden zufällig aus 50er-Bereichen gewählt. Zwei parallele Testläufe (hier real eingetreten: zweite Person im selben Verzeichnis) oder ein laufender Entwicklungsserver können kollidieren. Jetzt fragt ein Hilfsmodul `test/free-port.js` das Betriebssystem. | ja | `b9b415d`; Gesamtlauf grün |
| 10 | mittel (Testfehler) | `test/ui/paeckchen10.spec.js` | Die Browserprüfung „UNO … mit Bots anspielen“ wählte nur eine Karte aus und spielte sie nie aus (seit der Kartenbedienung mit „Ausspielen“). Sie bestand nur, wenn zufällig ein Bot begann: auf `5667b85` scheiterten 5 von 6 Wiederholungen, im Gesamtlauf 7 von 8 Varianten. Jetzt wird zusätzlich `play-selected` gedrückt; danach 8/8 Läufe grün. | ja | `958c5dd` |
| 11 | niedrig | `docs/roadmap/README.md` | „Die weiteren 91 VIS-Pakete“ stimmt nicht mit `game-visual-roadmap.json` überein (107 Pakete, 7 `done`, also 100 geplant: 51 spielbare Spiele, 49 Konzepte). | ja | `3838227` |

### Geprüft ohne Befund

Soweit geprüft, fand sich nichts; die Tiefe steht jeweils dabei.

- **Zugriff und Eingaben (Plattform):** Alle Routen außer Login-Seite, Gesundheitsabfrage, Manifest, Icons, Schrift und Sprachdateien liegen hinter der Anmeldung; die Socket-Verbindung verlangt Cookie und gleiche Herkunft (`allowRequest`), `maxHttpBufferSize` 16 KB, Token-Bucket 8 Ereignisse/s je Verbindung, Verbindungslimit je IP. Die Plattform-Ereignisse (Kick, Host wechseln, Tisch schließen, Pause, Programm …) prüfen `requireHost`; die Host-Prüfungen innerhalb der einzelnen Spiel-Ereignisse wurden nicht einzeln durchgesehen. Tickets, Pläne und Verwaltungs-Login verlangen JSON, Herkunft und Anfrage-Header, haben eigene Limits und signierte, `HttpOnly`/`SameSite=Strict`-Cookies mit Pfad. Mit einem echten Server wurden 16 HTTP-Abfragen (Typ-Verwechslungen, `__proto__`, Pfadtricks, `/data/secret.key`, `/rooms.json`) und 34 Socket-Aufrufe mit falschen Typen abgeschickt: keine Abstürze, keine Daten, keine Stacktraces. Pfade mit `..` und `%2e%2e` liefern 404.
- **Alle Spiel-Ereignisse:** Für jedes der 55 Spiele wurden alle Ereignisse mit 13 feindlichen Nutzdaten (null, Zahlen wie 1e308/NaN, 5000 Zeichen, Objekte mit `__proto__`, verschachtelte Objekte) und für jedes Zahlenfeld der Raumeinstellungen mit Extremwerten aufgerufen (mehrere Tausend Kombinationen): nur Fund 6 und Fund 3, keine Abstürze, keine Endlosschleifen (kein Aufruf über 300 ms).
- **Geheime Informationen:** (a) In keiner `view()` taucht ein Spieler-Token auf (alle 55 Spiele). (b) Differenzprobe: Der Inhalt aller Felder mit Hand-/Rollen-/Wort-/Becher-Namen zweier Sitze wurde vertauscht und die Ansicht eines dritten Sitzes verglichen; alle Unterschiede ließen sich als öffentliche Information erklären (Handgrößen, Zeitstempel, offene Stapelkarte, Blackjack-Hände). Der vermeintliche Treffer bei Schwimmen ist der öffentliche Zugverlauf („tauscht alle drei“ mit den offenen Mittekarten). Mr. X (Position/Tickets), UNO-Flip-Rückseiten und Monopoly-Deal-Hände wurden dabei nicht gezielt, sondern nur über diese allgemeine Probe und die bestehenden Tests (`spectators`, `security`, `uno-ultimate`, `monopoly-deal`, `scotland-visual`, `werbinich`) geprüft. Die Probe gilt für die Zustände direkt nach dem Start und nach bis zu 4 Bot-Zügen, nicht für beliebige Spielverläufe. Ein dauerhafter Test daraus wurde nicht angelegt (zu viele Scheintreffer).
- **XSS:** Von 100 Stellen mit `innerHTML` und eingesetzten Werten wurden die 43 mit Platzhaltern durchgesehen, die Namen, Texte, Titel oder Nachrichten enthalten. Nutzertext läuft jeweils durch `esc()`, `uiText()` oder `textContent` (Toast), Dialogtitel werden in `core.js` zusätzlich escaped. Ein unescapter Spielername wurde nicht gefunden. Bestehende Tests mit Script-Texten: Tickets, Pläne, Rückblicke, Erfolge, Party-Spiele. Ein neuer Browsertest über alle 55 Spiele wurde nicht geschrieben. Die CSP ist für Skripte streng (`script-src 'self'`); `style-src` enthält `'unsafe-inline'`, weil Inline-`style`-Attribute weit verbreitet sind (Empfehlung E6).
- **Dateien in `DATA_DIR`:** Dateinamen entstehen nur aus Raumcodes (`A–Z`, `2–9`, 5 Zeichen) oder festen Namen, nie aus Nutzereingaben. Größen: Tickets ≤ 1 000 (Texte ≤ 4 000 Zeichen), Pläne ≤ 300, Rückblicke ≤ 500, Bretter ≤ 20, Verlauf je Raum ≤ 40 000 Einträge und 500 Runden, Räume ≤ 50. Geschrieben wird überall in eine `.tmp`-Datei und dann umbenannt (kein `fsync`). Nicht begrenzt: Anzahl Spielernamen in der Bestenliste (E3).
- **Zeichnen:** `cleanDrawing` begrenzt auf 60 Striche, 800 Punkte, 7 Farben, 4 Stärken, Koordinaten 0–1 000; zusätzlich 16 KB je Socket-Paket. Es gibt keinen Bild-Upload, nur Vektoren.
- **Aufräumen:** Beim Schließen eines Raums werden Uhr-Timer, Bots, Verlauf und Code freigegeben, Presence-Verbindungen beim Trennen, Limiter-Tabellen per Intervall. Ein Dauerlauf zur Speichermessung wurde nicht gemacht.
- **Speichern:** Verzögert (300 ms Entprellung), nicht während einer laufenden Runde, beim Beenden (`SIGINT`/`SIGTERM`) synchron. Bei hartem Abbruch gehen höchstens die letzten 300 ms und der Stand der laufenden Runde verloren (Absicht: Räume kehren auf den letzten Ruhestand zurück).
- **Echtzeit:** Schritt wird vom Raum getaktet, ein Bild geht an alle bei jedem zweiten Schritt, nur mit verbundenem Menschen.
- **Service Worker:** `public/sw.js` speichert nichts (leerer `fetch`-Handler). Ein alter Stand kann dadurch nicht hängen bleiben; statische Dateien kommen mit `max-age=0` und ETag.
- **Hub-Skripte:** Die Startseite lädt 34 Skript-/Stildateien; die Skripte der einzelnen Spiele werden erst beim Betreten per `loadGame` nachgeladen.
- **Planung:** siehe Abschnitt 4.

## 2. Messwerte vorher / nachher

| Messwert | Vorher (`5667b85`) | Nachher (`3838227`) |
|---|---|---|
| `npm test` | 957 Tests, 957 bestanden, 50,2 s | 964 Tests, 964 bestanden, 46,5 s (+7 Regressionstests); nach dem Zusammenführen mit den inzwischen eingegangenen Commits (Backgammon, Betrieb/Wartung): 997 Tests, 997 bestanden, 56,2 s |
| Browser-Auswahl (Hub, Lobby, UNO, Phase 10, Päckchen 10 mit Monopoly, Echtzeit; Desktop + Handy) | erster Lauf auf dem Endstand der Fixes: 114 grün, 10 rot, 6 übersprungen (12,4 min); 7 der 10 Fehler waren Fund 10 (auf `5667b85` ebenfalls rot), die 3 übrigen (Kronenjagd, Bröckelboden, UNO all-wild; Handy) liefen einzeln auf `5667b85` und auf dem Endstand grün und waren unter paralleler Last wackelig | Endstand: 94 grün, 0 rot, 6 absichtlich übersprungen (7,6 min), Auswahl siehe Abschnitt 3 |
| Größe der Startseiten-Dateien (34 Dateien) | 522 659 Byte, gzip 172 194 Byte (Server liefert unkomprimiert, E1) | unverändert |
| Größe `view()` je Spieler, direkt nach dem Start, 3 Mitspieler (55 Spiele) | kleinstes 1,6 KB (Schiffe), die meisten 2–3 KB, Poker/Omaha/Werwolf ca. 4,0–4,1 KB, Monopoly 5,0 KB, Scotland Yard 8,3 KB, Spiel des Lebens 13,3 KB | unverändert |
| Größe `view()` nach bis zu 300 Bot-Zügen | Monopoly 12,1 KB, Scotland Yard 11,5 KB, Spiel des Lebens 20,4 KB, Monopoly Deal 7,5 KB, Mau-Mau 6,5 KB, Risiko-Würfeln 8,1 KB | unverändert |
| Rechenzeit `view()` | 0,04–0,16 ms je Aufruf; Poker 2,9 ms (Berechnung der Gewinnchancen) | unverändert |
| Ladezeit der Startseite im Browser | nicht gemessen | nicht gemessen |

Langsamste Node-Tests (Gesamtlauf läuft parallel pro Datei): Massentest Poker-Chipsumme 23,5 s, Phase-10-Teams 18,6 s, Massentest Malen & Raten 13,6 s, Abbrechen Vier gewinnt 13,4 s; alle weiteren unter 5 s.

## 3. Abschlussprüfung

- **`npm test`** (Node, Worktree auf dem Stand nach den Fixes, Commit `8b2ce10`): 964 Tests, 964 bestanden, 0 fehlgeschlagen, 46,5 s. Danach wurden nur eine Browserprüfung und die Dokumentation geändert; die vier Roadmap-/Planungs-Testdateien liefen nach der README-Änderung erneut grün (20 Tests).
- **Browser-Auswahl** (Endstand `3838227`, Desktop und Handy): `home-reference` (Startseite), `lobby-menu`, `card-ux` (UNO, Skip-Bo, Phase 10 als Kartenspiele mit Auswählen und Ausspielen), `uno-ultimate` (alle Varianten), `phase10`, `paeckchen10` (Varianten von UNO, Monopoly, Spiel des Lebens, Kniffel, Hütchen, Vier gewinnt, Schiffe, Skip-Bo, Zehn Etappen, Monopoly Deal) sowie `realtime` (Kronenjagd, Bröckelboden, Laser-Hüpfer, Abendprogramm): **94 bestanden, 0 fehlgeschlagen, 6 übersprungen** in 7,6 min. Die 6 Skips sind die absichtlich übersprungenen „Before card interaction audit“-Prüfungen in `card-ux.spec.js`. Die vollständige Suite von ca. 310 Browserprüfungen wurde **nicht** erneut ausgeführt.

## 4. Planung und Dokumentation: Widersprüche und Vorschlag

Fünf Planungsorte: `games/planned.js` (53 Einträge, Anzeige „Geplant“), `games/roadmap.js` (Anzeige „Roadmap“, 15 offene Etappen), `docs/roadmap/plan.json` (V2, 18 Pakete, alle `planned`), `docs/backlog/plan.json` (41 Spiele, 6 `done`, 35 `planned`), `docs/design/game-visual-roadmap.json` (107 VIS-Pakete: 7 `done`, 100 `planned`).

Gefundene Widersprüche und Auffälligkeiten:

1. **Behoben:** README der Roadmap nannte 91 statt 100 offene VIS-Pakete (Fund 11).
2. **Kein Fehler, aber missverständlich:** `roadmap.js` führt „Deutsch & Englisch“ unter „später“, obwohl die Sprachwahl fertig ist. Der Eintrag ist inzwischen korrekt als Teilstand formuliert (2 von 3 Punkten erledigt, offen bleibt die vollständige englische Oberfläche); der Status `spaeter` stimmt also. Nichts geändert.
3. **Nicht geändert (Test sichert es ab):** Die Etappe „Weitere Spiele“ in `roadmap.js` steht auf `spaeter`, obwohl alle 6 Punkte `erledigt` sind; sie zeigt die 6 bereits gebauten Backlog-Spiele neben den 35 offenen im Backlog-Plan.
4. **V2-Pakete und tatsächlicher Stand:** Mehrere V2-Pakete sind laut `plan.json` `planned`, obwohl Teile davon schon laufen: Presence (V2-14), Erfolge (V2-13, 17 Abzeichen), Tickets/Pläne/Rückblicke (V2-07, V2-17), persönliche Einstellungen/Sprache (V2-15). Das ist formal korrekt, weil dort jeweils eine *Erweiterung* geplant ist, aber aus `plan.json` allein ist der Ausgangsstand nicht ablesbar. Nicht geändert, weil `AGENTS.md` Nachweise erst nach echter Umsetzung vorsieht.
5. **Zahlen in älteren Dokumenten** („46 Spiele“ in `docs/game-pause.md`, `docs/languages.md`, `docs/ui-redesign.md`, `CLAUDE.md`/`AGENTS.md` als Untergrenze): Sie beschreiben den damaligen Stand. Aktuell sind es 55 Raumspiele und 3 Einzelspieler. Nicht geändert.

Vorschlag zur Vereinfachung (nichts davon umgesetzt):

- Eine einzige Quelle für „Spiel X: Status“ (bei Spielen `games/index.js` plus `planned.js`), aus der `roadmap.js`, `backlog/plan.json` und `game-visual-roadmap.json` die Zahlen ableiten. Heute müssen `completed_count`, `implementation_status`, `roadmap.js` und die Tests von Hand synchron gehalten werden.
- V2-Pakete im `plan.json` um ein Feld „Ausgangsstand“ ergänzen statt Status umzudeuten.
- Planungs-Zahlen nicht in Fließtexten wiederholen, sondern auf die JSON-Dateien verweisen; die Prüfung per Test (`planned.test.js`, `roadmap.test.js`) um den Abgleich der Anzahl VIS-Pakete mit dem README erweitern.

## 5. Repository-Größe (Vorschlag, nichts gelöscht)

- `docs/` wiegt 63 MB im Arbeitsverzeichnis (`docs/design` 41 MB, `docs/backlog` 12 MB, `docs/solo-games` 11 MB), enthalten sind 250 Bilddateien. Die Git-Daten umfassen laut `git count-objects` 69,7 MiB lose Objekte plus ein Pack von 3,6 MiB; PNG-Dateien lassen sich nicht weiter verlustfrei packen, jede Screenshot-Runde vergrößert also Klon und Verlauf dauerhaft.
- `artifacts/` (1,2 GB) steht in `.gitignore`, ist also nicht im Repository.
- Vorschlag: pro Spiel nur 1 Desktop- und 1 Handy-Aufnahme dauerhaft behalten, die übrigen Aufnahmen aus den Prüfläufen entfernen oder als WebP/mit verlustbehafteter PNG-Quantisierung (z. B. `oxipng`/`pngquant`) auf etwa ein Viertel verkleinern. `docs/design/game-visual-roadmap.json` und die Einzelpläne verweisen auf die Dateien; vor dem Löschen müssen diese Verweise und `screenshots.json` mitgepflegt werden. Aufwand: 0,5 Tag, Risiko niedrig, aber Entscheidung beim Eigentümer.

## 6. Offene Empfehlungen

Aufwand: S = unter 1 Stunde, M = bis 1 Tag, L = mehrere Tage.

| # | Empfehlung | Warum | Aufwand |
|---|---|---|---|
| E1 | HTTP-Kompression (Reverse-Proxy oder `compression`) für `.js`/`.css`/`.json` | Startseite 523 KB → 172 KB gzip; spürbar auf dem Handy. Eine neue Abhängigkeit bzw. Proxy-Konfiguration, daher nicht ohne Freigabe | S |
| E2 | Monopoly-Bretter: Obergrenze 20 gilt für alle, es gibt kein Löschen. Jeder Host kann alle Plätze belegen. Löschen durch Ersteller/Verwaltung oder Limit je Browser | Verhaltensänderung, daher nur dokumentiert | M |
| E3 | Bestenliste: Zahl der Spielernamen begrenzen oder alte Namen nach Frist bereinigen (Verwaltung) | wächst unbegrenzt mit jedem neuen Namen (nur angemeldete Nutzer) | M |
| E4 | Poker `view()` 2,9 ms je Spieler und Aufruf (Gewinnchancen): pro Zustand einmal berechnen und für alle Sitze wiederverwenden | bei 8 Spielern ca. 23 ms CPU je Aktion | M |
| E5 | `rooms.json` ebenfalls vor dem Überschreiben sichern, wenn sie unlesbar ist (wie Fund 1); Verlaufsdateien ohne zugehörigen Raum beim Start löschen | geringer Schaden (Räume sind kurzlebig), aber gleiche Falle | S |
| E6 | `style-src 'unsafe-inline'` abbauen (Inline-`style`-Attribute auf Klassen umstellen) | würde die CSP vollständig streng machen; viele Stellen in den Spiel-Oberflächen | L |
| E7 | Doppelter Code: Dialogaufbau (`ask`, `dialog`-Gerüst in `core.js`, `monopoly.js`, `monopoly-deal.js`), Bots in `games/bots.js` (29 KB), `kit.js` (59 KB) und lange Zeilen (565 Zeilen über 300 Zeichen in `.js`, größte Konzentration: `monopoly.js`, `hub.js`, `evening-plans.js`, `singleplayer/runtime.js` und mehrere Browserprüfungen) | Wartbarkeit; Umbau berührt viele Spiele gleichzeitig und kollidierte hier mit paralleler Arbeit, daher bewusst nicht angefasst | L |
| E8 | Tests aufteilen: bei jedem Push `npm test` (46 s) plus ein kleiner Browser-Rauchtest (Hub, ein Kartenspiel, Monopoly, ein Echtzeitspiel; Desktop + Handy); nachts die ganze Playwright-Suite (311 Prüfungen, ca. 18 min laut Fehlerprüfung vom 31.10.) und die Simulationen mit `SIM_SCALE=5`. Die vier langsamsten Node-Tests (13–24 s) können in den Nachtlauf | kürzere Rückmeldung; Zusammenstellung des Rauchtests noch festzulegen | M |
| E9 | Browserprüfungen mit Wartezeiten bei Last härter machen: 3 Prüfungen (Kronenjagd/Bröckelboden/UNO all-wild auf dem Handy) fielen unter paralleler Rechnerlast einmal durch und liefen einzeln grün | wackelige Tests | M |
| E10 | Fehlende Dauerprüfungen: Speicherverlauf über Stunden mit 50 Räumen, Größe von `rooms.json`, Ladezeit der Startseite im Browser | in dieser Review nicht gemessen | M |

Nicht gefunden bzw. nicht untersucht: tote Dateien (eine einfache Namenssuche ist wegen des dynamischen Ladens der Spiel-Skripte nicht aussagekräftig; es wurde nichts entfernt), alte Kommentare außer der Beschreibung in `package.json` (Suche nach „acht Spiele“ u. ä. in `server/`, `games/`, `public/`, `README.md` ohne weiteren Treffer).
