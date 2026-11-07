# UI-Redesign – Arbeits- und Abnahmeprotokoll

## V2-06 – Konto-Seiten im Liquid-Glass-Design (2026-11-07)

Ausdrücklich freigegebenes Paket ohne Logikänderung: Profil-Dialog, Einstellungen, Bestenliste, Erfolge und Admin-Seite folgen jetzt denselben Tokens wie der Hub.

| Bereich | Vorher | Nachher |
| --- | --- | --- |
| Profil-Dialog | Avatar vom Hub-Kopfzeilen-Stil verformt (winzig, ohne Kreis); Rand und Flächen mit `currentColor`; abgeblendeter Text (`opacity`) | Avatar 56 px im Kreis; Fläche `--glass`, Rand `--glass-edge`, Kacheln `--panel-2` mit `--line`; Text in `--text-2` statt Deckkraft; deckend bei „Glaseffekt reduzieren“ und `prefers-reduced-transparency` |
| Einstellungen, Bestenliste, Erfolge | Hinweise per `opacity`; Gruppenränder in `currentColor` | Hinweise in `--text-2`; Ränder `--line`; goldener Fokusring (2 px) auf allen bedienbaren Elementen |
| Admin | eigene Palette (#16241f, Messing), `system-ui`, 12 px Rundung, Messing-Buttons | Bricolage Grotesque, Georgia-Überschrift, `--panel`/`--edge`, 16 px Rundung, smaragdgrüne Hauptaktionen, umrandete Gefahr-Aktionen, 44-px-Ziele, Fokusring, `prefers-reduced-motion`, `forced-colors` |

Der Hub kennt kein helles Farbschema (`color-scheme: dark`); geprüft sind die Tischthemen klassisch und Nacht sowie die reduzierten Varianten. Textkontrast wird in `test/ui/v2-06-account-glass.spec.js` gegen den tatsächlich dahinterliegenden Hintergrund gemessen (halbtransparente Flächen übereinandergelegt, Hub-Foto als dunkler Grundton angenommen) – bereits vorher ohne Verstöße, nachher weiterhin. Screenshots: `docs/design/screenshots/v2-06/before` und `after` (desktop und mobil, JPEG).

## Aktuelle Referenzkorrektur vom 30. Oktober 2026

Dieser Abschnitt beschreibt den aktuellen Auftrag auf Basis von `main` bei `7c8b96c459feed1750dd7ee2caddf23b5686a66e`. Die weiter unten erhaltenen Abschnitte sind das historische Protokoll des ersten Redesigns; ihre Aussagen über optionale Fotos, frühere Branches und damals noch nicht erfolgte Pushes sind zeitgebunden. Für diese Korrektur wurde ausschließlich auf `main` gearbeitet. Die Originalreferenz wurde vor der Umsetzung und den visuellen Korrekturrunden tatsächlich geöffnet. Es wurden weder neue Spiele noch V2-Pakete implementiert.

### Befund anhand echter Vorher-Screenshots

Der unveränderte Ausgangsstand wurde auf einem isolierten temporären Server mit `POKER_NO_DOTENV=1` bei 1920×1080, 1440×900, 768×1024, 390×844 und 360×800 aufgenommen: jeweils Startseite und Bibliothek, insgesamt zehn Bilder. Die Baseline verwendete ein frisches Testprofil; Favoriten, offene Tische und fremde Online-Spieler wurden nicht erfunden.

| Merkmal | Konkrete Abweichung vorher | Tatsächliche Korrektur |
| --- | --- | --- |
| Hintergrund | Abstrakte dunkelgrüne Verläufe; kein erkennbarer Raum | Eigenständige neue Spielelounge mit warmen Lampen, Bücherregalen, Pflanzen, Ledersessel und Kamin; zusammenhängende lokale Bildfläche, leicht unscharf |
| Sidebar | 228 px breit, nur 18 px Außenabstand, große Rundungen und ein dichter Block aus Navigation und Kategorien | Referenznahe Außenabstände, 194–230 px Breite auf Desktop, 16-px-Rundungen, Pikzeichen und goldene Serif-Marke; alle bisherigen Ziele erhalten, die vier Spielarten in einem nativen Untermenü |
| Hierarchie | Zweizeilige Begrüßung dominierte; Tabellenblock kam vor der Spieleauswahl | Große Bibliotheksüberschrift, kurze persönliche Begrüßung, echte Kopfzeilensuche, vier Kategorie-Kacheln und anschließend die hervorgehobene Spieleauswahl |
| Karten | Auf Home bei 1920 px etwa 519×184 px mit 50-px-Motiven und zwei breiten Funktionskarten pro Reihe | Vier gleich hohe Karten pro Desktop-Reihe, etwa 223×247 px bei 1920 px, eigene 88-px-SVG-Motive; ruhige Serif-Spielnamen, kleine Spieler-/Zeit-Metadaten und weiter sichtbare Host-Aktionen |
| Spalten | Rechte Spalte ungefähr 30 % des Inhalts; wirkte angehängt | Haupt-/Informationsspalte im Verhältnis 1,72:1, an der Referenz orientiert; gemeinsame Ausrichtung der oberen Panels, feinere warme Konturen |
| Transparenz und Farben | Sehr deckende, gleichmäßig grüne Flächen | Gedämpfte anthrazit-/olivfarbene Glasflächen über dem warmen Raum, sparsame Goldkonturen und smaragdgrüne Aktionen; Blur nur auf großen Flächen |
| Mobil/Tablet | Zusammengedrückte Desktop-Hierarchie, sehr kleine Spielmotive | Suche unter der mobilen Kopfzeile, Kategorien als 2×2-Raster, zwei einheitliche Spielkarten pro Reihe, gestapelte Informationen; Safe Areas und bestehendes mobiles Bereichsmenü erhalten |

Bei 1440 px sind die Karten wegen längerer echter deutscher Spielnamen höher als im Referenz-Mockup. Diese Abweichung wird nicht als Pixelgleichheit ausgegeben. Die letzte Sichtkorrektur hat die anfänglich zu hohen Karten von rund 311 px auf rund 247 px bei 1920 px verkleinert, ohne Host-Aktionen oder Favoriten zu verstecken.

### Architektur, wirksame Styles und erhaltene Funktionen

Die wirksame Ladereihenfolge bleibt `style.css` → `hub.css` → weitere bestehende Seiten-/Spielstyles → `ui-theme.css` → `game-pause.css`. Dynamisch geladene Spielstyles bleiben an ihren bisherigen Stellen. Die Hub-Gestaltung wurde in `ui-theme.css` überarbeitet; vorhandene Basisregeln und DOM-Verträge aus `hub.css` werden weiter genutzt. Die Szenenfläche ist auf `.hub::before` beschränkt, nicht auf einzelnen Kacheln. Gemeinsame Spielmaterial-Tokens wurden nicht ersetzt. `-webkit-backdrop-filter`, eine deckende Grundfläche ohne Filterunterstützung sowie der gespeicherte und systemweite Transparenz-Fallback sind berücksichtigt.

`public/hub.js` bezieht Spiele, Kategorien und Metadaten weiterhin aus `account.games` beziehungsweise `/me`. Der Einstieg zeigt ohne bisherige Auswahl vier kuratierte registrierte Spiele; vorhandene Favoriten und zuletzt geöffnete Spiele behalten ihre Priorität. Die Kopfzeilensuche führt in den vorhandenen Katalog. Suche, Filter, Listenansicht, Spielauswahl, Hosten, Varianten und Code-Beitritt verwenden weiterhin die bestehenden Funktionen. Die rechte Favoritenspalte aktualisiert sich auch direkt beim Stern-Klick in der Bibliothek. Profilnamen werden im neuen Kopfbereich weiterhin als escaped Text ausgegeben; technische Profil-/Session-Schlüssel, Cookies und der App-Titel „Spieleabend“ bleiben erhalten.

Die rechte Spalte zeigt echte lokale Favoriten, die vorhandene Presence und das Code-Feld. Zuletzt geöffnete Spiele stehen im Hauptbereich und werden nur angezeigt, wenn solche Browserdaten vorhanden sind. Es wurden keine Bewertungen, Freundeslisten, fiktiven Personen, Spielerzahlen oder scheinbaren Benachrichtigungen hinzugefügt. Navigation zu Tickets/Admin, Bestenliste, Erfolgen, Roadmap, Planung und Rückblick bleibt vollständig vorhanden.

### Lokale Assets

Der eingebaute `image_gen`-Modus erzeugte einen eigenständigen Hintergrund; es wurde kein vollständiger Referenz-Screenshot als Website-Asset eingesetzt. Die fertigen Projektdateien sind [games-lounge.webp](../public/assets/games-lounge.webp) mit 1672×941 px / 135766 Bytes und [games-lounge-mobile.webp](../public/assets/games-lounge-mobile.webp) mit 768×432 px / 49618 Bytes. Mobil wird die kleinere Datei gewählt. Herkunft, vollständiger Generierungsprompt und SHA-256 stehen in [games-lounge-asset.md](../design/games-lounge-asset.md). Die bestehenden eigenen SVG-Spielmotive aus `games/art-kit.js` wurden wiederverwendet; keine neue Schrift-, Bild- oder UI-Abhängigkeit wurde installiert.

### Screenshot-Abnahme und Reproduktion

`node scripts/capture-home-reference.mjs before|iteration|after` erzeugt die Bilder und Geometriemessungen mit frischem Profil und temporärem Datenverzeichnis. `REFERENCE_BROWSER=webkit` wählt den installierten WebKit-Port und zusätzlich echte Bedienprüfungen für Suche, Favoriten, Host-Dialog, mobile Navigation und Transparenzpräferenz. Es handelt sich um WebKit auf Windows und emulierte Touch-Größen, nicht um eine Prüfung auf einem physischen iPhone.

| Größe | Start vorher / nachher | Bibliothek vorher / nachher |
| --- | --- | --- |
| 1920×1080 | [vorher](../artifacts/home-reference/before/start-1920x1080.png) / [nachher](../artifacts/home-reference/after/start-1920x1080.png) | [vorher](../artifacts/home-reference/before/spiele-1920x1080.png) / [nachher](../artifacts/home-reference/after/spiele-1920x1080.png) |
| 1440×900 | [vorher](../artifacts/home-reference/before/start-1440x900.png) / [nachher](../artifacts/home-reference/after/start-1440x900.png) | [vorher](../artifacts/home-reference/before/spiele-1440x900.png) / [nachher](../artifacts/home-reference/after/spiele-1440x900.png) |
| 768×1024 | [vorher](../artifacts/home-reference/before/start-768x1024.png) / [nachher](../artifacts/home-reference/after/start-768x1024.png) | [vorher](../artifacts/home-reference/before/spiele-768x1024.png) / [nachher](../artifacts/home-reference/after/spiele-768x1024.png) |
| 390×844 | [vorher](../artifacts/home-reference/before/start-390x844.png) / [nachher](../artifacts/home-reference/after/start-390x844.png) | [vorher](../artifacts/home-reference/before/spiele-390x844.png) / [nachher](../artifacts/home-reference/after/spiele-390x844.png) |
| 360×800 | [vorher](../artifacts/home-reference/before/start-360x800.png) / [nachher](../artifacts/home-reference/after/start-360x800.png) | [vorher](../artifacts/home-reference/before/spiele-360x800.png) / [nachher](../artifacts/home-reference/after/spiele-360x800.png) |

Die gleichen zehn Nachher-Ansichten für WebKit liegen unter `artifacts/home-reference/after-webkit/`. Beide Engines melden in allen zehn Aufnahmen keinen horizontalen Überlauf und keine JavaScript-Fehler. Zusätzlich stehen [Kontaktbogen mit Originalreferenz und Vorher/Nachher](../artifacts/home-reference/vergleich.png) und [absolute RGB-Differenz zwischen Vorher und Nachher](../artifacts/home-reference/differenz-vorher-nachher.png) bereit. Reproduktion: `node scripts/compare-home-reference.mjs`. Das Differenzbild zeigt tatsächliche Änderungen; es misst keine Übereinstimmungsquote mit der inhaltlich anderen Referenz. PNGs, Traces und Logs bleiben lokale, ignorierte Prüfartefakte.

### Tests, gefundene Fehler und Grenzen

- `npm.cmd test`: **810/810 bestanden**, Exitcode 0, keine übersprungenen Tests, 43,4 Sekunden (`artifacts/home-reference-unit.log`).
- Die vier neuen Prüfungen in `test/ui/home-reference.spec.js` bestanden auf Desktop und Mobil: **8/8**. Sie prüfen reale Kategorien, SVG-Größen, gleich hohe Karten, funktionsfähige Suche, Favoriten und den deckenden Fallback.
- Erster vollständiger Lauf `npm.cmd run test:ui -- --workers=2`: **273 bestanden, 2 fehlgeschlagen, 1 planmäßig übersprungen**, 12,1 Minuten (`artifacts/home-reference-all-ui.log`). Die erste Fehlerausgabe und Traces sind unter `artifacts/home-reference-initial-failures/` gesichert.
- Ein mobiler Poker-Abendprogramm-Test fand einen tatsächlichen Layoutfehler: Die Tischgröße verwendete eine feste 110-px-Annahme für Kopfzeile und Innenabstände. Mit der bereits auf main vorhandenen zweizeiligen Pausen-Kopfzeile konnte der Tisch das Dock überragen. Eine unveränderte, isolierte Kopie von `7c8b96c` reproduzierte denselben Fehler an derselben Assertion (`artifacts/home-reference-true-baseline.log`). Die CSS-Zeile nutzt jetzt die tatsächliche `--topbar`-Höhe plus 52 px Innenabstand. Keine Spielregeländerung.
- Der vorhandene private Planungstest fragte Socket-Zustand, Datenschutzflag und neuen Raum unmittelbar nach asynchronen Aktionen ab. Im Gesamtlauf beziehungsweise den Wiederholungen wurden ein noch leeres `lastState`, ein noch ausstehendes Privat-Update und ein laufender Dokumentwechsel sichtbar. Der Kontrolllauf auf dem alten Stand bestand diesen Fall einmal; ein dauerhaft geänderter Datenschutzablauf wurde nicht festgestellt. Der Test wartet jetzt gezielt auf bestätigten Raumcode/Privatstatus und wiederholt die Prüfung über den tatsächlichen Dokumentwechsel hinweg. Die Anwendung und ihre Datenschutz-API wurden dafür nicht verändert.
- Nach diesen Korrekturen bestanden Planung, Abendprogramm und die neuen Home-Prüfungen gemeinsam mit je zwei Wiederholungen auf Desktop/Mobil: **32/32**, Exitcode 0, 1,2 Minuten (`artifacts/home-reference-final-recheck.log`).
- Zweiter vollständiger Lauf `npm.cmd run test:ui -- --workers=2`: **274 bestanden, 1 fehlgeschlagen, 1 planmäßig übersprungen**, Exitcode 1, 13,0 Minuten (`artifacts/home-reference-final-all-ui.log`). Beide zuvor aufgefallenen Fälle bestanden jetzt auf Desktop und Mobil. Der verbliebene Fehler war ein Lebenszyklusproblem im vorhandenen Test für verzögertes Laden von `tickets.js`: Nach Erscheinen der Ticket-Überschrift wurde der temporäre Server bereits beendet, obwohl die Ticket-Abfrage noch lief (`ERR_CONNECTION_REFUSED`). Der Test wartet nun zusätzlich auf die geladene `.ticket-count`-Ansicht. Keine Änderung an der Ticket-Anwendung, keine unterdrückten Console-Fehler. Ursprünglicher Trace: `artifacts/home-reference-ticket-initial/`.
- Nachprüfung genau dieses Ticket-Falls: **6/6 bestanden**, Exitcode 0, 11,6 Sekunden, je drei Wiederholungen Desktop/Mobil (`artifacts/home-reference-ticket-recheck.log`). Damit sind alle **275 tatsächlich ausgeführten unterschiedlichen UI-Fälle** über vollständigen Lauf und Nachprüfung erfolgreich validiert. Der vollständige 13-Minuten-Lauf wurde nach dieser reinen Test-Wartekorrektur nicht ein drittes Mal wiederholt. Der eine übersprungene Fall ist die doppelte mobile Ausführung der bereits vollständig im Desktop-Projekt durchlaufenen Sechs-Größen-Matrix.
- Abschließende WebKit-Abnahme: zehn Ansichten bei allen fünf Größen sowie Bedienung von Suche, Favoriten, Host-Dialogen, mobiler Navigation und reduziertem Glas, ohne JavaScript-Fehler oder Überlauf (`artifacts/home-reference-webkit-final.log`).

Aufbau, Raumwirkung, Kategorie-Proportionen und die links/rechts angeordneten Glasflächen sind der Vorlage deutlich angenähert. Unterschiede bleiben bewusst sichtbar: eigenständig generierte Raumszene, vier echte Kategorien, echte Spiele und Emoji-Profile statt Mockup-Fotos, eigene flache SVG-Motive, zusätzliche eindeutige Host-Aktionen und tatsächlich leere Datenbereiche bei einem frischen Profil. Eine pixelgenaue Übereinstimmung wurde nicht nachgewiesen und wird nicht behauptet. Physische iOS-/Android-Geräte und eine vollständige WCAG-Zertifizierung sind nicht Bestandteil dieser lokalen Abnahme.

Es wurden keine Server-, Authentifizierungs-, Spielregel-, Datenbank-, Docker- oder V2-Planungsdateien verändert. `.env` und produktive Spielstände wurden nicht gelesen oder geändert. Der vorhandene Main-Workflow prüft Node-Tests und veröffentlicht ein GHCR-Image; ein Produktivdeployment ist dort nicht definiert und wird nicht manuell durchgeführt. `git diff --check` und die Syntaxprüfungen für Hub und Abnahmeskripte sind ohne Fehler.

Implementierungscommit: **`cd29f57f6d40169d0f0ed171f67d7364b6915269`** (`fix: align home library with original lounge reference`). Dieser Abnahmenachtrag folgt als eigener Dokumentationscommit. Ziel der beauftragten Veröffentlichung ist ausschließlich [`origin/main`](https://github.com/TTLPSCWA/PokerAbend/tree/main), ohne neuen Branch, Pull Request oder Force-Push. Das konkrete CI-Ergebnis und der abschließende Main-Tip werden im Abschlussbericht verlinkt.

## Historisches Protokoll des ersten Redesigns

## Ausgangspunkt und Auftrag

- Ausgangs-Commit: `9b60e30`, 46 registrierte Spiele; das gelieferte Paket beschreibt den älteren Stand `55abf04` mit 45 Spielen.
- Umsetzung auf `feat/liquid-glass-game-library`; anschließend auf ausdrücklichen Wunsch lokal in `main` übernommen (siehe Merge-Nachtrag). Kein Push, keine Veröffentlichung nach GHCR oder auf dem Produktivserver.
- `PROMPT.md` vollständig aus dem gelieferten ZIP übernommen. `design/referenz-game-library.png` dient ausschließlich dem visuellen Vergleich und wird nicht in der Oberfläche verwendet.
- Architektur: Express/Socket.IO, Vanilla JavaScript, bestehende Shared Kits. Regeln, RNG, Zugrechte, Authentifizierung, Speicher und Deployment bleiben erhalten.

## Audit und Verträge

| Bereich | Bestehende Zuständigkeit / erhaltene Verträge |
| --- | --- |
| Katalog | `games/index.js` → `/me` → `account.games`; vier reale Kategorien, aktuell 46 Spiele |
| Hub | `public/hub.js`, `public/hub.css`, `#hub`, `#hub-main`, `#side-nav`, `#hub-tabbar`, Hash-Routen |
| Auswahl | `#games-body`, `[data-id]`, `[data-host]`, `[data-fav]`, Suche, Filter, Liste/Kacheln, gespeicherte Sortierung |
| Hosten | `openHost(id)`, `#host-dlg`, `#host-form`, Varianten und bestehende Einstellungen |
| Lokale Daten | `poker:favs`, `poker:recent`, Profil und Präferenzen; kein serverseitiges Konto |
| Räume | Lobby und `peek` mit vorhandenem Token; Weiterspielen ausschließlich für bestätigte Räume |
| Präsenz | Echte Lobby-/Presence-Ereignisse, private Sichtbarkeit, keine Freundesliste |
| Spielrahmen | `kitGame`, darauf Party-, Solo-, Zeichen- und Echtzeit-Kits; `#kg-main`, `#kg-dock`, Panels |
| Poker/Omaha | Eigener Frame in `public/games/poker/`, bestehende Filz-/Nacht-Themes und Handkarten |
| Darstellung | `GameDesign.scene/apply/watch/fit/cue`, Kartengrößen und reduzierte Bewegung |
| Weitere Seiten | Tickets/Admin, Planung, Rückblick, Bestenliste, Erfolge, Roadmap; bestehende APIs und Selektoren |
| PWA | Bestehendes Manifest, Icons und Service Worker ohne Offline-Cache |

## Gestaltungsrichtung und Assets

Die Referenz gibt Sidebar, großzügige Typografie, dunkle transluzente Flächen, eine ruhige Bibliothek und kleine einzelne Spielillustrationen vor. Die Umsetzung verwendet echte Inhalte und die vorhandenen eigenen SVGs aus `games/art-kit.js`. Beispielspiele, Profile, Ranglisten und Benachrichtigungen aus dem Bild werden nicht übernommen.

Es liegt **kein separates freigegebenes Spielezimmer-Foto** bei. Deshalb entsteht die gemeinsame Hintergrundatmosphäre aus CSS-Verläufen. Kein Hotlink, keine Bildtapete pro Spiel und keine Nutzung des Referenzbilds als Hintergrund. Eine spätere separat lizenzierte Aufnahme bleibt optional.

## Etappen

- [x] 0: Auftrag, Referenz und aktuellen Stand prüfen; Feature-Branch anlegen.
- [x] 0: Baseline-Tests und Vorher-Screenshots abschließen.
- [x] 1: Tokens, App-Rahmen, Navigation, Profil, Login und Dialoge.
- [x] 2: Spielebibliothek und Startseite mit echten Daten.
- [x] 3: Übrige Hub-Seiten und Formulare harmonisieren.
- [x] 4: Gemeinsame Spielrahmen harmonisieren und alle 46 Spiele prüfen.
- [x] 5: Vollständige Abnahme, Screenshots und Abschlussbericht.

## Testprotokoll

- `npm.cmd ci --no-audit --no-fund --fetch-retries=0 --cache artifacts/npm-cache`: erfolgreich. Der erste eingeschränkte Netzwerkversuch wurde beendet und mit freigegebenem Netzwerkzugriff wiederholt; keine Lockfile-Änderung.
- `npm.cmd test`: Baseline 730/731. Im vorhandenen Tempowürfel-Test war Ziel 17 ein Gemeinschaftsfeld, dessen zufällige Karte die Position ändern konnte. Der Test startet nun auf 8 und landet ausschließlich auf Grundstücken. Keine Änderung an der Spiellogik. Gezielte Suite danach: 13/13. Vollständige Wiederholung nach dem UI-Umbau: **731/731**.
- Repräsentative bestehende Playwright-Suites (Katalog, Navigation, Tickets/Admin und Spielrahmen): Baseline **46/46**, nach Etappen 1–3 ebenfalls **46/46**.
- `node node_modules/@playwright/test/cli.js test test/ui/ui-redesign.spec.js --project=desktop`: **13/13** vor dem abschließenden Feinschliff, einschließlich aller 46 Spielstarts und der sechs Bildschirmgrößen.
- `npm.cmd run test:ui`: Gesamtabnahme mit **256 Fällen**, davon **254 bestanden, 1 fehlgeschlagen, 1 planmäßig übersprungen**, Laufzeit 17,2 Minuten. Der Fehler lag im vorhandenen P10-Variantentest: `expect.poll(() => lastState.variant)` konnte direkt nach Reload bei noch leerem Socket-Zustand werfen. Mit `lastState?.variant` wartet der Test auf die reale Zustandsantwort, statt vorher abzubrechen. Keine Änderung am Spiel oder Wiederverbinden.
- `node node_modules/@playwright/test/cli.js test test/ui/paeckchen10.spec.js --grep "P10 Variantenwechsel" --repeat-each=3`: danach **6/6 bestanden** (je drei Wiederholungen Desktop/Mobil, 25,1 Sekunden). Insgesamt sind damit **alle 255 ausgeführten unterschiedlichen UI-Prüffälle erfolgreich validiert**. Der komplette 17-Minuten-Lauf wurde nach dieser reinen Wartebedingungs-Korrektur nicht erneut wiederholt; sein ursprüngliches Ergebnis bleibt hier ausdrücklich ausgewiesen.
- Abschließender einfacher Nachlauf desselben Variantenfalls: **2/2 bestanden, Prozess-Exitcode 0** (`artifacts/redesign-variant-exitcheck.log`, `redesign-variant-exitcode.txt`).
- Der eine übersprungene Fall ist die doppelte mobile Ausführung der Bildschirmgrößen-Matrix. Derselbe Test prüft bereits im Desktop-Projekt alle sechs Größen einschließlich 390 und 360 Pixel; die übrigen mobilen Prüfungen einschließlich aller 46 Spielstarts liefen vollständig.
- Die abschließend ergänzte Kurzregeln-/Pokerhände-Prüfung für Poker und Omaha wurde über `node node_modules/@playwright/test/cli.js test test/ui/ui-redesign.spec.js --grep "Teil (1|5):"` auf beiden Geräten nachgeprüft: **4/4 Gruppen bestanden** (59,1 Sekunden). Diese Gruppen erfassen zusammen zehn Spiele, jeweils auf Desktop und Mobil.
- `node scripts/capture-ui-redesign.mjs before`: **12 Vorher-Bilder**; abschließend `node scripts/capture-ui-redesign.mjs after`: **13 Nachher-Bilder**, jeweils keine Browserfehler. Zusätzlich **18** Hub-Bilder für die Größenmatrix und **152** aktive Spielansichten (46 Desktop, 46 Mobil, 60 weitere Größenvarianten).
- `git diff --check`: ohne Fehler. Prüfung lokal mit Node **v24.22.0**, npm **11.19.1** und installiertem Chrome. Der unveränderte Docker-Workflow verwendet Node 22; hier wurde kein Image veröffentlicht und kein Produktionslauf durchgeführt.

Die Testlogs liegen lokal unter `artifacts/redesign-*.log`, insbesondere `redesign-stage4-unit.log`, `redesign-final-ui-r2.log`, `redesign-variant-recheck.log` und `redesign-final-capture.log`. Temporäre Testserver verwenden `POKER_NO_DOTENV=1` und eigene temporäre Datenverzeichnisse; `.env` und produktive Daten wurden nicht gelesen oder verändert.

## Umgesetzte Komponenten und Tokens

| Datei | Tatsächliche Änderung |
| --- | --- |
| `public/style.css` | Gemeinsame Farbvariablen, CSS-Hintergrund, smaragdgrüne Hauptaktionen, Login ohne Holzrahmen; vorhandene Karten-/Filzvariablen erhalten |
| `public/ui-theme.css` | Gemeinsame Theme-Schicht für Hub, Navigation, Katalog, echte Tabellen/Karten, Formulare, Dialoge und Spielrahmen; keine kopierten Spieloberflächen |
| `public/ui-theme.js`, `public/core.js` | Wiederverwendbare lokale Darstellungseinstellungen, sofortige Anwendung nach `savePrefs`, Systempräferenzen für Transparenz/Bewegung |
| `public/index.html`, `public/hub.js` | Desktop-Header, Bibliotheksnavigation, vollständiges mobiles Bereichsmenü, konkreter Spiele-Picker vor dem bestehenden `openHost`, Profil-Einstellungen |
| `public/hub.js` | Startseite mit maximal zwei hervorgehobenen echten Tischen, vier Katalogspielen (mobil zwei), drei lokalen Favoriten/zuletzt geöffneten Spielen; Links zu vollständigen Ansichten; Präsenz und Einladungs-Code |
| `public/hub.js` | Kacheln als Standard für neue Browser, gespeicherte Listenansicht bleibt erhalten; echte Kategorie-Chips und zugängliche Spieltitel-Buttons |
| `public/games/kit.js`, `public/games/poker/poker.js` | Ausschließlich zusätzlicher Darstellungs-Schalter im bestehenden Ich-Panel |
| `public/games/poker/poker.css` | Im niedrigen Querformat Tischgröße aus der tatsächlich freien Containerhöhe; eigene Karten und Chips bleiben im Dock, kein abgeschnittener eigener Sitz darunter |
| `public/games/kniffel/kniffel.css` | Dunklere mögliche Punkte/Nullen und lesbarer Zusatz im hellen Tabellenkopf; Würfeltablett und Punkteblatt bleiben erhalten |
| `test/monopoly-variants.test.js` | Bereits vor dem Umbau gefundene zufällige Testabhängigkeit beseitigt, keine Regeländerung |
| `test/ui/paeckchen10.spec.js` | Bestehender Poll wartet nach Reload auch bei zunächst leerem Zustand auf die tatsächliche Variante |
| `test/ui/ui-redesign.spec.js` | Zusätzliche funktionale und responsive Abnahme, echte Spielstarts mit zusätzlichen Testverbindungen |
| `scripts/capture-ui-redesign.mjs` | Reproduzierbare lokale Vorher-/Nachher-Aufnahmen mit eigener temporärer Datenbasis |

Wichtige Tokens: `--bg: #101815`, `--panel: #1A2521`, `--panel-2: #24332D`, `--line: #FFFFFF1C`, `--text: #F2F0E9`, `--text-2: #B3BDB5`, `--accent: #32765B`, `--accent-hover: #3D896A`, `--gold-text: #E0BC74`. Die vorhandene Klasse `btn-brass` bleibt als DOM-Vertrag erhalten und verwendet jetzt die gemeinsame Primärfarbe. Status-/Gefahrenfarben und Spielmaterialien behalten ihre Bedeutung.

`--glass` und `--glass-blur` begrenzen Glas auf große Hub-Flächen und Dialoge: maximal 12 px, mobil 6 px, keine Filter auf jeder Spielkachel. Die Basis ist deckend und bleibt ohne `backdrop-filter` lesbar. „Glaseffekt reduzieren“ setzt deckende Flächen und entfernt den Filter. Die Systempräferenzen werden ebenfalls berücksichtigt. Bricolage bleibt lokal; Georgia verwendet die Systemschrift für Überschriften. Keine neue Abhängigkeit, kein externer Font, keine 3D-Bibliothek.

Die Präferenzen bleiben unter `poker:prefs`; Favoriten, lokale zuletzt geöffnete Spiele und die Ansichts-/Sidebarwahl verwenden ihre bestehenden Schlüssel. Der lokale Verlauf ist ausdrücklich **keine** Liste laufender Tische. Weiterspielen verwendet weiterhin nur mit Token bestätigte Serverräume. Private Räume, Authentifizierung, Ticket-Admin, Socket-Ereignisse, Spiele/RNG und Datenformate wurden nicht geändert.

Der zusätzliche Einstellungszugang im Hub hat einen vorhandenen Randfall sichtbar gemacht: Nach `leaveGame()` konnte `savePrefs()` noch das alte Poker-Modul mit leerem Zustand rendern. Es ruft dessen Darstellungs-Hook jetzt nur mit aktiver Session auf; Speicherung und gemeinsames Theme werden auch im Hub angewendet. Die Start-/Tischende-Abnahme prüft diesen Übergang wiederholt. Beim Gesamttest wurde außerdem die bisherige Aktionsbeschriftung „Nächsten Abend planen“ wiederhergestellt, damit bestehende Nutzungs-/Testverträge erhalten bleiben.

## Kompatibilitätsumfang

Die folgenden IDs wurden nicht neu implementiert. Sie nutzen den angepassten gemeinsamen Rahmen. Die automatisierte Abnahme öffnet den echten registrierten Katalog, lädt die Lobby, setzt die benötigten verbundenen Testspieler, startet über die bestehenden Socket-Ereignisse und prüft Spielfeld, Dock, Verlauf, Stand, Ich-/Host-Panel, Kurzregeln, Abbruch und Tischende. Bei den Shared-Kit-Spielen öffnet sie außerdem die Vollregeln; bei Poker/Omaha deren vorhandene Pokerhände-Ansicht. Die Testspieler existieren ausschließlich auf isolierten temporären Testservern. Natürliche komplette Spielverläufe und Wertung sind durch die vorhandenen Simulations-/Spieltests sowie die bestehenden spezifischen UI-Suites abgedeckt; der neue Smoke-Test spielt nicht jede der 46 Partien bis zum regulären Sieg.

| Bestehender Rahmen / Motivfamilie | Tatsächlich erfasste IDs |
| --- | --- |
| Karten (13) | `poker`, `omaha`, `maumau`, `farbenchaos`, `zehnetappen`, `stapelrennen`, `schwimmen`, `blackjack`, `mogeln`, `praesident`, `durak`, `sechs-nimmt`, `monopoly-deal` |
| Würfel (8) | `maexchen`, `schocken`, `kniffel`, `shutthebox`, `zehntausend`, `wuerfelpoker`, `luegenwuerfel`, `chicago` |
| Brett (9) | `huetchen`, `schiffe`, `viergewinnt`, `muehle`, `reversi`, `dame`, `domino`, `monopoly`, `spiel-des-lebens` |
| Party (6) | `schaetzmeister`, `schlagfertig`, `werhatdasgesagt`, `tickendes-paket`, `werwolf`, `wer-bin-ich` |
| Solo-Party (4) | `zahlenzoo`, `gedaechtnis-kueche`, `pfeilfieber`, `sortierstation` |
| Zeichnen (3) | `kritzelpost`, `bildunterschrift`, `malen-raten` |
| Echtzeit (3) | `broeckelboden`, `kronenjagd`, `laser-huepfer` |

Die Spielefamilien dienen hier der technischen Abnahme. In der Bibliothek bleiben die vier echten Katalogkategorien maßgeblich; keine zweite manuelle Spieleliste wurde in die Anwendung eingebaut. Individuelle Spieloberflächen wurden nur bei Poker/Omaha (Querformat) und Kniffel (Kontrast) gezielt verändert. Die übrigen Spielmodule wurden auf Kompatibilität mit dem gemeinsamen Theme geprüft.

Die zehn Hub-Routen werden bei **1440×900, 1920×1080, 768×1024, 390×844, 360×800 und 900×450** geprüft. Alle aktiven Spiele werden auf Desktop/Mobil geprüft; 15 repräsentative aktive Spiele erhalten zusätzlich die vier anderen Größen (Poker, Omaha, Kniffel, Mensch ärgere Dich nicht, Schiffe, Reversi, Dame, Mühle, Vier gewinnt, Phase 10, Monopoly, Monopoly Deal, Spiel des Lebens, Malen & Raten, Bröckelboden). Bestehende Brett-Fit-Prüfungen kontrollieren darüber hinaus die vollständigen Brettgrenzen.

Kontrast-Stichprobe anhand der sRGB-Luminanz der tatsächlich verwendeten Farben: Haupttext/Panel **13,84:1**, Sekundärtext/Panel **8,16:1**, weißer Text/Primäraktion **5,42:1**, Kniffel-Punktevorschlag/weiß **6,96:1**, Nullvorschlag/weiß **5,49:1**, Zusatztext/heller Tabellenkopf **5,35:1**. Dies ist keine vollständige WCAG-Zertifizierung. Tastaturfokus, native Dialoge, Kategorien/Filterzustände, Tablet-Sidebar und das mobile Bereichsmenü werden funktional geprüft. Keine Daueranimation, keine Filter pro Spielkachel und keine zusätzlichen Bilddownloads.

## Screenshot-Abnahme

Die Bilder liegen absichtlich unter dem bereits ignorierten Verzeichnis `artifacts/`; sie enthalten ausschließlich temporäre Testdaten. Reproduktion: `node scripts/capture-ui-redesign.mjs after`.

| Ansicht | Vorher | Nachher |
| --- | --- | --- |
| Home Desktop | [Bild](../artifacts/ui-redesign/before/desktop-home.png) | [Bild](../artifacts/ui-redesign/after/desktop-home.png) |
| Bibliothek Desktop | [Bild](../artifacts/ui-redesign/before/desktop-library.png) | [Bild](../artifacts/ui-redesign/after/desktop-library.png) |
| Spiel Desktop | [Kniffel](../artifacts/ui-redesign/before/desktop-kniffel.png) | [Kniffel](../artifacts/ui-redesign/after/desktop-kniffel.png) |
| Tickets Desktop | [Bild](../artifacts/ui-redesign/before/desktop-tickets.png) | [Bild](../artifacts/ui-redesign/after/desktop-tickets.png) |
| Home Mobil | [Bild](../artifacts/ui-redesign/before/mobil-home.png) | [Bild](../artifacts/ui-redesign/after/mobil-home.png) |
| Bibliothek Mobil | [Bild](../artifacts/ui-redesign/before/mobil-library.png) | [Bild](../artifacts/ui-redesign/after/mobil-library.png) |
| Spiel Mobil | [Kniffel](../artifacts/ui-redesign/before/mobil-kniffel.png) | [Kniffel](../artifacts/ui-redesign/after/mobil-kniffel.png) |
| Tickets Mobil | [Bild](../artifacts/ui-redesign/before/mobil-tickets.png) | [Bild](../artifacts/ui-redesign/after/mobil-tickets.png) |

Zusätzlich: Login und Ticket-Details auf Desktop/Mobil; responsive Ansichten unter `artifacts/ui-redesign/responsive/`, echte aktive Spielansichten unter `artifacts/ui-redesign/games/`. Die Referenz wurde visuell verglichen: Sidebar, großzügige Serif-Überschriften, dunkle ruhige Flächen, kleine einzelne Spielillustrationen und warme Akzente wurden aufgegriffen. Das nicht separat gelieferte Spielezimmerfoto und erfundene Inhalte des Mockups wurden nicht übernommen.

## Verbleibende Punkte und Grenzen der Abnahme

Es sind keine bekannten funktionalen Fehler aus dieser Abnahme offen. Optional fehlt weiterhin ein separat lizenziertes Spielezimmerfoto; der freigegebene CSS-Fallback ist fertig und braucht kein Bild. Die Referenzdatei wird ausschließlich als Dokumentation geführt und vom Frontend nicht geladen.

Die Geräteprüfung erfolgte mit Chrome und emulierten Viewports/Touch-Kontexten, nicht auf physischer iOS-/Android-Hardware. Die Kontrast-Stichprobe ersetzt kein vollständiges Accessibility-Audit. PNGs und Logs sind lokale, bewusst nicht versionierte Prüfartefakte; Skript, neue Tests und dieses Protokoll wurden mit dem Redesign übernommen. Keine Änderungen an `.env`, Produktionsdaten, Manifest oder Service-Worker-Caching. Kein Push, keine Veröffentlichung nach GHCR oder auf den Server.

## Nachtrag: Übernahme in main

Auf ausdrücklichen Wunsch wurde nach einem erfolgreichen `git fetch origin main` der lokale `main` von `9b60e30` per `git merge --ff-only feat/liquid-glass-game-library` auf `fd4dd93` vorgezogen. `main` und `origin/main` hatten vor der Übernahme denselben Stand; es gab keine konkurrierenden Änderungen und keine Merge-Konflikte. Alle vier Feature-Commits sind enthalten. Der Feature-Branch bleibt erhalten.

Prüfung nach der Übernahme:

- `npm.cmd test`: **731/731 bestanden**, Exitcode 0 (65,2 Sekunden). Log: `artifacts/merge-main-unit.log`.
- `npm.cmd run test:ui`: **254 bestanden, 1 fehlgeschlagen, 1 planmäßig übersprungen**, 18,6 Minuten. Alle 46 Spielstarts, Panels, Regeln und Tischende wurden auf Desktop/Mobil geprüft. Der zuvor korrigierte P10-Variantentest bestand diesmal in beiden Projekten innerhalb des Gesamtlaufs. Log: `artifacts/merge-main-ui.log`.
- Einziger neuer Befund: Im Erfolgstest waren alle fachlichen Prüfungen bereits bestanden, während beim Testende die verzögerte Namenssuche noch ausstand. Der temporäre Server wurde beendet, bevor `/api/achievements/players` antworten konnte; die Console-Prüfung meldete `ERR_CONNECTION_REFUSED`. Der Test in `test/ui/achievements.spec.js` wartet nun gezielt auf diese tatsächliche Antwort. Keine Anwendungskorrektur, kein Unterdrücken von Browserfehlern und keine Änderung an Spielregeln oder APIs. Der ursprüngliche Trace ist unter `artifacts/merge-main-achievements-initial/` gesichert.
- Nachprüfung: `node node_modules/@playwright/test/cli.js test test/ui/achievements.spec.js --grep "Erfolge: Abbruch" --repeat-each=3 --output=artifacts/merge-main-achievements-recheck`: **6/6 bestanden**, Exitcode 0 (29,9 Sekunden), je drei Durchläufe Desktop/Mobil. Das separate Ausgabeverzeichnis vermeidet Überschneidungen mit dem noch laufenden Gesamttest. Der korrigierte mobile Fall bestand auch im Gesamtlauf. Log: `artifacts/merge-main-achievements-recheck.log`.
- Damit sind alle 255 tatsächlich ausgeführten unterschiedlichen Browser-Prüffälle über Gesamtlauf und Nachprüfung erfolgreich validiert; die doppelte Größenmatrix bleibt wie beschrieben übersprungen. Der vollständige Lauf wurde nach der reinen Test-Wartekorrektur nicht erneut wiederholt. `git diff --check` ohne Fehler.

Es sind keine offenen Merge-Konflikte oder bekannten funktionalen Integrationsprobleme vorhanden. Die Testkorrektur und dieser Nachtrag werden als zusätzlicher lokaler Commit auf `main` gesichert. Es wurde nichts gepusht und kein Docker-/Produktiv-Workflow ausgelöst.

Als nächster Release-Schritt stehen reale Handyprüfungen und anschließend ein ausdrücklich freigegebener Push mit bestehender CI-/GHCR-Pipeline an. Der nächste fachliche Roadmap-Punkt ist **Benachrichtigungen / Push-Mitteilungen** (`games/roadmap.js`, Status `jetzt`): „Du bist dran“ und „Tisch wartet“. Bisher gibt es die gewöhnliche Browser-Benachrichtigung im Poker-/Omaha-Modul; der Service Worker hat noch keine Push-Verarbeitung. Das neue Funktionspaket ist hier nur als nächster Schritt benannt, nicht implementiert.

## Veröffentlichung: ausschließlich spätere Anleitung

Die lokale Übernahme in `main` ist im Nachtrag dokumentiert. Es wurde nichts gepusht, kein Workflow ausgelöst und kein Produktivserver kontaktiert. Bei einem später freigegebenen Push von `main` prüft der bestehende Workflow `.github/workflows/docker.yml` die Node-Tests und veröffentlicht `ghcr.io/ttlpscwa/pokerabend:latest`. Erst nach einem grünen Build auf dem Server ausführen:

```sh
cd /opt/poker
# Vorher reguläres Backup des vorhandenen poker-data-Volumes erstellen.
# IMAGE muss auf das freigegebene GHCR-Image zeigen, bestehende Server-.env erhalten.
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull poker
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-build poker
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 poker
```

Das vorhandene externe Traefik-Netz `proxy` und `poker-data` bleiben erhalten; kein `down -v`. Für eine gezielte Rücknahme ein zuvor geprüftes Image per `IMAGE` auswählen und denselben `up -d --no-build`-Schritt verwenden. Diese Befehle wurden hier **nicht ausgeführt**.
