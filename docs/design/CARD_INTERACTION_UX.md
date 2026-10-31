# Kartenbedienung – Card Interaction UX Overhaul V1

Stand: 31.10.2026. Explizit beauftragt: gemeinsame Interaktionsgrundlagen sowie **UNO mit fünf Varianten, Skip-Bo mit drei Varianten und Phase 10 mit drei Varianten**. Ausgangsstand `18451f45110be4773565466db8b4715779d5cfe1`. Direkte Arbeit auf `main`, keine Branches/PRs, kein Produktivdeployment.

Die übrigen zehn registrierten Kartenspiele wurden einzeln im Quellcode untersucht und ausschließlich geplant: [Karten-UX-Roadmap](CARD_INTERACTION_UX_ROADMAP.md), [JSON](card-interaction-roadmap.json). Diese CUX-Planung ist unabhängig von visuellen VIS-Paketen und V2-Aufträgen.

## Echte Vorher-Analyse

Vor den Produktänderungen wurden auf Desktop (1440×900) und Touch (390×844) echte lokale Räume mit **Anna und Sebastian in getrennten Browserkontexten** gespielt. Passwortanmeldung, Beitreten, Sitzen, Start, unterschiedliche private Hände, Pause und Wiederverbindung liefen über den vorhandenen Server. Sechs Vorher-Prüfungen bestanden. Die Aufnahme-Artefakte heißen `artifacts/card-ux/before/<desktop|mobil>/<spiel>/` und enthalten Ausgangsbild, Gegnersicht, Bild nach dem ersten Kartentipp und ein JSON-Beobachtungsprotokoll.

| Spiel | Schritte vorher | Erkennbarer Auswahlzustand | Konkreter Befund |
| --- | --- | --- | --- |
| UNO | Desktop: 1 Klick spielt normale Karte; volle mobile Hand: 1. Tipp Vorschau, 2. Tipp spielt | `.can`, Farbwahl über `.sel`, mobile `.peek`; kein allgemeines `aria-pressed` | Dieselbe Bewegung hatte je nach Gerät andere Folgen. Im Desktop-Vorherlauf fiel die Hand nach einem Klick von 7 auf 6 Karten. Im Touchlauf blieb sie zunächst bei 7. |
| Skip-Bo | Quelle wählen → Baureihe oder eigene Ablage wählen | `.sel`, keine gedrückte Semantik | Eine gewählte 8 beziehungsweise 10 aktivierte alle vier Baureihen, selbst wenn sie 1 brauchten. Die Ablage war zugbeendend, aber source/index und Pending waren nicht sauber getrennt. |
| Phase 10 | Ziehen → Karten lokalen Gruppen zuordnen → Auslegen bestätigen beziehungsweise Abwurfmodus wählen | stabile IDs, `aria-pressed`, Gruppen-Badges und Gründe bereits vorhanden | Diese Grundlage war sinnvoll. Gruppen- und Auswahlreihenfolge konnten klarer werden; Render-Updates ersetzten die Hand, einige Aktionen löschten Auswahl vor Ack. Joker-Enden verwendeten kollidierendes `data-end`. |

Zusätzliche Quellbefunde: Beim alten DnD wurden zunächst sämtliche `data-drop`-Ziele markiert, ohne die jeweilige Karte zu prüfen. Skip-Bo-Drops übernahmen den Partner-Eigentümer nicht. Phase-10-Joker-Drops überließen bei zwei möglichen Enden dem Server die Standardrichtung. Wiederholtes vollständiges Ersetzen von Main/Dock entfernte fokussierte Kartenknoten.

Der Vorher-Skip-Bo-Screenshot zeigt die gleichzeitig umrandeten unpassenden Baureihen. Die mobile UNO-Analyse zeigte zudem den Gerätewechsel zwischen Vorschau und direktem Spiel; das wurde nicht nur aus CSS abgeleitet. Andere Kartenspiele besitzen in dieser Arbeit ausdrücklich einen Quellcode-Audit, keine behauptete manuelle Vorher-Abnahme.

## Gemeinsames Konzept

**Karte auswählen → erlaubte Aktionen/Ziele erkennen → ausdrücklich ausführen.** Ein erneuter Tipp hebt die Auswahl auf. Ein anderer Einzelkarten-Tipp ersetzt sie. Phase 10 behält seine notwendige Mehrfachauswahl und Gruppenzuordnung als lokalen Entwurf. Keine Spielaktion wird optimistisch in Hand, Kartenanzahl oder Ablage vorgetäuscht.

`public/games/card-interaction.js` enthält die wiederverwendbaren Grundlagen: Handreferenzen, relevanter Zustandskontext, Anfrage-Sperre, Auswahlzusammenfassung und einen kleinen DOM-Abgleich. Der Rahmen `kitGame` aktiviert sie nur mit `cardUX: true`. Das setzen ausschließlich die drei beauftragten Spiele. `public/games/card-shedding.js` ist der sichere UNO-Adapter; Mau-Mau verwendet weiterhin seinen bisherigen `kitShedding`-Pfad. Die neue CSS-Datei wird über die bereits nur von diesen drei Spielen genutzte `card-worlds.css` importiert und ist zusätzlich mit `.cix-game` begrenzt.

Ausgewählte Karten besitzen einen deutlich stärkeren durchgezogenen Rand, Anhebung, gedrückte Semantik und je nach Karte ein Häkchen oder nummerierte Gruppenmarken. Bloß spielbare UNO-Karten haben einen schwächeren gestrichelten Rand. Eine eigene Auswahlzeile nennt Karte beziehungsweise Quelle und beschreibt die nächste Handlung; sie zeigt nur die eigene aktive Kartenfläche. Es gibt keinen standardmäßig aktivierten Schnellspielmodus.

## Identität und Zustandswechsel

Flip, No Mercy und All Wild liefern bereits physische Tokens wie `7r@42`. Diese werden unverändert verwendet. Phase 10 behält die serverseitigen numerischen Karten-IDs. Classic/Spuknacht liefern identische Wertstrings für gleichartige Karten; diese Exemplare erhalten unterschiedliche lokale Schlüssel innerhalb einer Hand-Epoche. Jede Änderung der autoritativen Hand oder des Raum-/Rundenscopes macht diese Epochenschlüssel ungültig. Es werden keine zusätzlichen geheimen Kartenseiten oder neuen Server-IDs eingeführt.

Skip-Bo trennt Hand, Spielstapel, Ablage und Partner-Eigentümer. Ein Handverweis hält einen Epochenschlüssel und wird erst beim Ausführen auf den aktuellen unveränderten Serverindex aufgelöst. Der gewählte Quellwert und relevante Hand-, Stapel-, Partner- und Bauzustände müssen weiterhin zum Auswahlkontext passen. Eine fremde Hand ist keine zulässige Quelle. Sortierung ordnet nur Referenzen für die Anzeige; `lastState.g.hand` und die an den Server gebundenen Indizes werden nicht umsortiert.

Bei Handverlust, Quell-/Zieländerung, Zug-/Rundenwechsel und Verbindungsausfall werden betroffene Einzelkartenauswahlen verworfen. Phase-10-Gruppenentwürfe bleiben bei passenden Updates über vorhandene stabile IDs erhalten; fehlende Karten werden entfernt, ein neuer Raum/eine neue Runde/eine neue Phase setzt die Gruppen zurück. Die bestehende Vorbereitung während eines gegnerischen Zugs bleibt eine lokale Planungsmöglichkeit, keine fremde Zugberechtigung.

## Serverbestätigung und Fehler

Alle neuen Spielaktionen verwenden `kit.command`. Während einer ausstehenden Anfrage werden weitere Kartenaktionen und die Sortierung gesperrt; der Status nennt die ausstehende Bestätigung. Nur eine erfolgreiche Antwort beziehungsweise ein neuer autoritativer Zustand verwirft die entsprechende Auswahl. Eine Ablehnung zeigt einen verständlichen Fehler und erhält die noch gültige Karte samt Farb-/Zielschritt. Schnell wiederholte Knopf- oder Tastaturereignisse senden keine zweite Anfrage.

Wenn nach zwölf Sekunden keine Bestätigung eingetroffen ist, wird kein Erfolg oder Misserfolg erfunden. Die Sperre bleibt bis zum bewussten **Spielstand neu laden** bestehen. Dieser Weg erneuert die Verbindung und lädt den vorhandenen Raumzustand; die ursprüngliche Aktion wird nicht automatisch wiederholt. Ein Verbindungsabbruch verwirft unbestätigte lokale Auswahl und ignoriert verspätete Bestätigungen aus der alten Verbindung. Offline-Eingaben werden nicht in die Socket-Warteschlange gestellt.

Die Server-Spielregeln, Kartensätze, RNG, Bots, Räume, Protokollereignisse und Persistenz wurden nicht ersetzt. Die bestehenden serverseitigen Berechtigungen und Prüfungen bleiben entscheidend. Die neuen Layout-/Hilfsprüfungen sind ausschließlich Bedienungshilfen.

## UNO

Eine normale Karte benötigt jetzt auf allen Geräten zwei ausdrückliche Schritte: auswählen und **Ausspielen** beziehungsweise die markierte Ablage wählen. Ein erneuter Kartentipp wählt ab. Farb- und Zielkarten öffnen nach der Bestätigung ihre passenden Auswahlknöpfe; erst die tatsächliche Farb-/Zielentscheidung sendet den Zug. Sonderentscheidungen des Servers – Flip-Farbe, Roulette und Anfechtung – behalten ihre eigenen, nun ebenfalls gesperrten und bestätigten Aktionswege.

Gezogene Karten, Weitergeben, notwendige Ziehstrafen, UNO-Ansage, verspätete Ansage und Erwischen bleiben verfügbar. No Mercy bietet bei vorhandener Pflicht-Spielkarte kein unerlaubtes freies Nachziehen an. Ein vorhandenes UNO-Ansagefenster wird nicht automatisch genutzt. Gegner zeigen ihre öffentliche Kartenzahl; eine letzte Karte ist mit **1 Karte · UNO!** und zusätzlicher Umrandung hervorgehoben. Ausgeschiedene Spieler werden eigens markiert.

Alle fünf Designwelten, Original-SVGs, Materialien und Variantenregeln bleiben erhalten. Flip zeigt weiterhin ausschließlich die vom vorhandenen Server freigegebenen öffentlichen inaktiven Gegnerseiten und die eigene aktive Hand. Eigene geheime Rückseiten oder aktive gegnerische Handwerte werden weder erzeugt noch in die Auswahlvorschau übernommen.

## Skip-Bo

Die Auswahl nennt Quelle, Eigentümer und Wert. Nur Baureihen mit passender nächster Zahl oder mit einem gewählten Joker werden aktiviert/markiert. Die benötigte Zahl bleibt pro Reihe sichtbar. Eine gewählte Handkarte erlaubt zusätzlich die eigenen Ablagen; der Hinweis erklärt ausdrücklich, dass dieser zweite Schritt den Zug beendet. Ein weiterer unnötiger Bestätigungsdialog wird nicht vorgeschaltet.

Hand, Spielstapel und Ablagen werden separat identifiziert. Teamquellen übergeben den Partner-Eigentümer bei Tipp und DnD unverändert. Handkartenanzahl und Spielstapelanzahl stehen getrennt an den Spielern; öffentliche Ablagen bleiben auf dem Tisch. Die hinzugefügte Anzeige-Sortierung verändert niemals den serverseitigen Handindex. Unpassende Drops senden keine Spielaktion.

## Phase 10

Die vorhandene Schrittführung **Ziehen → Auslegen/Anlegen → Abwerfen** bleibt erhalten. Gruppen bekommen weiterhin ihre eigene Nummer; zusätzlich zeigt jede zugeordnete Handkarte ihre Position innerhalb der Gruppe. Die bestehenden Gründe für fehlende, doppelte, farblich/rangmäßig unpassende oder zu viele Karten bleiben sichtbar. Phase auslegen wird erst bei vollständiger gültiger Vorbereitung aktiviert. Es gibt keine automatische Kartenwahl oder automatische Auslage.

Anlegen und Abwerfen verwenden dieselbe Bestätigungssperre. Joker mit zwei möglichen Enden zeigen ausdrücklich **unten/oben**. Ein Drop auf eine solche Folge wählt kein Ende automatisch. Die Endknöpfe verwenden nun `data-side` und kollidieren nicht mehr mit dem allgemeinen Beenden-Attribut. Aussetzen fordert weiterhin die ausdrückliche Wahl eines Zielspielers, ohne die Hand vorher zu ändern. Öffentliche Gegnerinformationen trennen Restkarten, aktuelle Phase und bereits ausgelegte Phase.

## Rendering, Touch und Zugänglichkeit

Der opt-in DOM-Abgleich erhält unveränderte Kartenknoten statt die Hand bei jeder Auswahl komplett zu ersetzen. Dadurch bleiben passende Tastaturfoki, Scrollposition und der native Drag-Ursprung erhalten. Sortieren bewegt bestehende eindeutig bezeichnete Kartenknoten; Karteninhalte und Serverzustand werden nicht vertauscht. Render-Updates lösen keine zusätzlichen Zugtöne aus.

Handkarten überlappen in den Piloten nicht mehr in unerreichbare Streifen. Die Hand scrollt horizontal, jede Karte bleibt mindestens 44 Pixel breit. Tap/Enter/Leertaste wählt, ein erneuter Tipp wählt ab; Pfeiltasten/Home/End bewegen den Handfokus, Escape hebt lokale Auswahl auf. Ein Touch-Scroll erzeugt keinen Zug. Drag-and-drop ist nur eine zusätzliche Desktop-Bedienung mit denselben zulässigen Zielen und denselben serverbestätigten Aktionen.

Der prominente Status bleibt oben im Aktionsdock beim Betrachten/Scrollen der Hand erreichbar. Er unterscheidet eigenen Zug, Gegner, Mitspieler-Warten, Auswahl-/Farb-/Zielschritt, Pause, Rundenende, Zuschauer und Wiederverbindung. Vorhandene Zugfristen werden mit der bereits angeglichenen Server-Spielzeit angezeigt; der Timer selbst ist keine sekündlich neu vorgelesene Live-Meldung. Kein Dauerblinken und kein zusätzlicher wiederholter Ton. Reduzierte Bewegung unterdrückt die neuen Übergänge. Neue Bedienungsbeschriftungen sind DE/EN.

## Reproduzierbare Prüfung

`node --test test/card-interaction.test.js` prüft doppelte Werte, physische Tokens, Phase-IDs, Hand-Epochen, Kontextwechsel, unveränderte Rohdaten, ausstehende/abgelehnte Anfragen und unbekannte Bestätigungen. `npm test` prüft zusätzlich den bestehenden Gesamtbestand.

Browserabnahme: `npx playwright test --config=playwright.card-ux.config.js --workers=2`. Die eigene opt-in Konfiguration nutzt Chrome Desktop, Chrome Touch und WebKit mit iPhone-13-Profil. Native Desktop-Drops werden dort einmal geprüft; auf Touchgeräten läuft der gleichwertige Tippweg. Die sechs Viewportgrößen laufen einmal ausdrücklich als Matrix und werden in den anderen Projekten nicht doppelt ausgeführt. Die bisherige projektweite Playwright-Konfiguration bleibt unverändert.

`test/ui/card-ux-room-fixture.js` stellt seltene Situationen über IPC ausschließlich im isolierten Testprozess her. Es gibt keine Produkt-HTTP- oder Socket-Testendpunkte. Die Fixtures verteilen vorhandene echte Kartenobjekte/-werte neu und verwenden danach reale Browser-Spieler und die echten autoritativen Ereignisse. Normale Vorherpartien, tatsächliche Züge, Gast-/Zuschauersichten und Serverablehnungen werden getrennt erfasst. Die vorhandenen visuellen UNO-/Kartenwelt- und Phase-10-Tests bleiben erhalten und nutzen für UNO jetzt den ausdrücklich bestätigten Bedienweg.

## Tatsächliche Testergebnisse

| Prüfung | Ergebnis | Lokales Protokoll |
| --- | --- | --- |
| Vorher-Partien, Desktop und Touch, jeweils drei Spiele mit zwei Browser-Spielern | **6 bestanden** | `artifacts/card-ux-before.log` |
| Gemeinsame Referenzen, Kontext, ausstehende/abgelehnte/unbekannte Bestätigung und Scope-Inventur | **8 bestanden** | `artifacts/card-ux-primitives-final.log` |
| Gesamter Node-Bestand vor dem letzten Sprach-/CI-Testharness-Schritt | **914 bestanden, 1 bestehender Mau-Mau-Fehler**, 915 Fälle, 71,05 s | `artifacts/card-ux-final-node.log` |
| Abschließender Gesamt-Node-Lauf nach der CI-Testharness-Korrektur | **915 bestanden, 0 fehlgeschlagen**, 55,55 s | `artifacts/card-ux-ci-final-node.log` |
| Renderer-, Karten-UX- und VIS-Prüfungen nach der Korrektur | **38 bestanden, 0 fehlgeschlagen** | `artifacts/card-ux-ci-renderers.log` |
| Pilot-/Material-/bestehende Phase-10-Suite, drei Browserprofile | 126 bestanden, 2 Fehler im neuen Testaufbau, 25 bewusst ausgelassen, 13,9 min | `artifacts/card-ux-final-browser.log` |
| Abschließende Nachprüfung nach deren Korrektur und den letzten Interaktions-/Sprachkorrekturen | **43 bestanden, 0 fehlgeschlagen**, 8 Desktop-DnD-Auslassungen auf Touch, 5,2 min | `artifacts/card-ux-final-acceptance.log` |
| Letzte Sortier-/Farbbegriffe: Flip, Skip-Bo Classic und Phase 10 Team, jeweils alle drei Profile | **9 bestanden, 0 fehlgeschlagen** | `artifacts/card-ux-final-language.log` |
| Bestehende Hub-, Sprach-, Pause-, Verlassen-, Abendprogramm- und Solo-Regressionen, einschließlich Starts/Panels aller 49 Raumspiele | 91 bestanden, 1 verweigerter lokaler Bildabruf, 2 bewusst ausgelassen; **betroffener Fall danach bestanden** | `artifacts/card-ux-isolation.log`, `artifacts/card-ux-isolation-recheck.log` |
| Karten-UX-Inventur plus VIS-/Screenshot-Integrität | **14 bestanden** | `artifacts/card-ux-metadata.log` |

Die zwei Fehler im Pilot-Sammellauf waren ein unquotierter numerischer CSS-Attributselektor im neuen Drag-Test und eine zufällige Phase-10-Testhand, die vor dem Reservieren der gewünschten öffentlichen Auslage beide Exemplare der benötigten Karte bekommen konnte. Selektor und Testverteilung sind korrigiert. Die anschließenden 43 Prüfungen enthalten ausdrücklich beide Fälle. Die letzten neun Prüfungen bestätigen zusätzlich die anschließend korrigierten englischen Sortier-/Farbtexte. Die Produkt-Engine wurde dafür nicht geändert. Beim allgemeinen Sprachtest betraf der einzelne Netzwerkfehler `/assets/games-lounge.webp`; der identische Einzeltest bestand beim erneuten Lauf. Die Protokolle werden deshalb mit ihren tatsächlichen Einzelresultaten aufgeführt, nicht als nachträglich vollständig grüner Sammellauf ausgegeben.

Der erste [GitHub-Lauf für `1b381ab`](https://github.com/TTLPSCWA/PokerAbend/actions/runs/41223130283) meldete zusätzlich **891/915 bestanden, 24 fehlgeschlagen**. 13 Fehler kamen aus zwei bisherigen VM-Renderer-Testumgebungen: Sie luden nach dem letzten Sprachschritt den neuen `CardInteraction`-Helfer nicht mit. `test/cards-visual.test.js` und `test/uno-ultimate.test.js` laden nun den echten Helfer vor den Spielskripten, wie der Browser; die Schutz-/Materialprüfungen bleiben unverändert. Elf weitere Fälle scheiterten am gemeinsamen Hub-Start-Hook. `hub.test.js` und `abort.test.js` verwendeten denselben zufälligen Portbereich 4350–4399. Der Hub-Test einschließlich seines Neustartservers nutzt jetzt `PORT=0`, übernimmt den tatsächlich belegten Port und meldet Startfehler mit begrenzter Wartezeit. Das entfernt diese vorhandene Überschneidung ausschließlich in der Testinfrastruktur. Im anschließenden vollständigen lokalen Lauf bestanden **alle 915 Tests**, einschließlich dieser 24 Fälle. Keine Produkt-Spielregeln oder Prüfassertionen wurden dafür abgeschwächt. Das erste GHCR-Build wurde wegen des roten Testschritts korrekt ausgelassen; der Korrektur-Push erhält einen neuen regulären Workflowlauf.

Alle **128 aktiven Fälle** der Pilot-Suite bestanden damit mindestens einmal einschließlich der korrigierten Fälle. Das ersetzt nicht die offene Mau-Mau-Feststellung des Gesamt-Node-Laufs. Die 25 Auslassungen des großen Browserlaufs sind neun ausschließlich für den gesonderten Vorherlauf gedachte Aufnahmen, sechs doppelte Viewport-Matrizen auf Touch sowie zehn Desktop-spezifische Drag-/Bestätigungsfälle auf Touch. Auf den Touchprofilen werden die gleichwertigen Tippwege geprüft.

Die Nachprüfung verwendet die opt-in Konfiguration mit folgendem Filter: `UNO Flip retains|UNO No Mercy confirms|Card UX UNO classic|Card UX Skip-Bo|Card UX Phase 10|desktop partner drag|desktop Joker drop|UNO desktop drag|Desktop drag|readonly clocks|Anlegen: passende|Auswahl mit zwei Gruppen|Joker endpoints`. Die letzten neun Fälle verwenden `UNO Flip retains|Card UX Phase 10 team|Card UX Skip-Bo classic`.

Die sechs ausdrücklich geprüften Größen sind **1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450**. Echte Browseraktionen prüfen doppelte physische Tokens, Sortierung ohne Rohdatenänderung, gültige/ungültige Drops, Partner-Eigentümer, beide Joker-Enden, Farb-/Zielentscheidungen, UNO-Ansage, No-Mercy-Ausscheiden, serverseitige Ablehnung, Mehrfachklick, ausbleibende Bestätigung ohne Wiederholung, Runde beendet, Pause, Reconnect und Zuschauer. 24-Karten-Hände, echte Chrome-Touch-Wischereignisse, WebKit-Tipps, Tastatur und reduzierte Bewegung sind abgedeckt. WebKit läuft unter Windows mit iPhone-Profil; ein Test auf **echter iPhone-Hardware** bleibt ausstehend. Bestehende Detailregeln und serverseitige Phasenbeschreibungen können weiterhin unter „English (Beta)“ deutsche Texte enthalten.

## Dauerhafte Vorher-/Nachher-Nachweise

**79 unveränderte PNG-Aufnahmen: 18 vorher, 61 nachher**, dazu sechs originale Vorher-Beobachtungsprotokolle. [Manifest mit Herkunft, Browserprofil, CSS-Viewport und SHA-256](card-interaction-screenshots.json). Die Node-Prüfung kontrolliert alle 85 Dateihashes: PNGs anhand ihrer Originalbytes, JSON-Textprotokolle mit LF-normalisierten Zeilenenden für identische Ergebnisse bei Windows-/Linux-Checkouts. Ausgewählte Bilder wurden zusätzlich visuell angesehen: Auswahl gegen bloße Spielbarkeit, mobile Ziele, Querformat, WebKit und englische Farb-/Gruppenwahl. Keine Aufnahme stammt aus einem Produktivraum.

| Spiel | Vorher: erster Kartentipp | Nachher: sichere Auswahl / erlaubte Ziele |
| --- | --- | --- |
| UNO | [Desktop](screenshots/card-ux/before/desktop/farbenchaos/after-first-card-tap.png) · [Touch](screenshots/card-ux/before/mobil/farbenchaos/after-first-card-tap.png) | [Desktop](screenshots/card-ux/after/desktop/uno-classic-selected.png) · [Touch](screenshots/card-ux/after/mobil/uno-classic-selected.png) · [WebKit](screenshots/card-ux/after/webkit-iphone/uno-classic-selected.png) |
| Skip-Bo | [Desktop](screenshots/card-ux/before/desktop/stapelrennen/after-first-card-tap.png) · [Touch](screenshots/card-ux/before/mobil/stapelrennen/after-first-card-tap.png) | [Desktop](screenshots/card-ux/after/desktop/skip-classic-targets.png) · [Touch](screenshots/card-ux/after/mobil/skip-classic-targets.png) · [WebKit-Team](screenshots/card-ux/after/webkit-iphone/skip-team-targets.png) |
| Phase 10 | [Desktop](screenshots/card-ux/before/desktop/zehnetappen/after-first-card-tap.png) · [Touch](screenshots/card-ux/before/mobil/zehnetappen/after-first-card-tap.png) | [Desktop](screenshots/card-ux/after/desktop/phase-classic-groups.png) · [Touch](screenshots/card-ux/after/mobil/phase-classic-groups.png) · [WebKit](screenshots/card-ux/after/webkit-iphone/phase-classic-groups.png) |

Sondernachweise: [Flip-Farbwahl Englisch](screenshots/card-ux/after/desktop/uno-colour-choice-english.png), [Phase-Gruppen Englisch](screenshots/card-ux/after/mobil/phase-groups-english.png), [No-Mercy-Ausscheiden](screenshots/card-ux/after/mobil/uno-no-mercy-eliminated.png), [All-Wild-Zielwahl](screenshots/card-ux/after/desktop/uno-all-wild-target.png), [Spuknacht-Auswahl](screenshots/card-ux/after/mobil/uno-halloween-ghosthunt-selected.png), [Joker-Endwahl](screenshots/card-ux/after/desktop/phase-joker-end-choice.png), [24 Karten](screenshots/card-ux/after/mobil/uno-long-hand.png), [fehlende Bestätigung](screenshots/card-ux/after/desktop/uno-unconfirmed.png), [Querformat](screenshots/card-ux/after/desktop/zehnetappen-900x450.png). Alle drei Spiele in allen sechs Größen und sämtliche Varianten-Auswahlen stehen im Manifest.

## Bestehender Befund außerhalb der Piloten

Zwei Gesamt-Node-Läufe prüften jeweils 915 Fälle: 914 bestanden, **ein unveränderter Mau-Mau-Massentest scheiterte** an `maumau: Bot0 kommt nicht weiter`. Protokolle: `artifacts/card-ux-node.log`, `artifacts/card-ux-final-node.log`. Ein isolierter Wiederholungslauf derselben 24 Simulationstests bestand vollständig (`artifacts/card-ux-simulation-recheck.log`, 61,18 s). Das Mischen verwendet in diesem bestehenden Test bewusst echten Zufall; die Austeilungen variieren trotz des festen Bot-Zufalls.

Eine getrennte Diagnose mit ausschließlich bestehenden Engine-/Bot-Importen reproduzierte den Zyklus (`artifacts/card-ux-maumau-diagnostic.jsonl`): 7 Spieler, 9 Karten, `seven/sevenStack/eight/jackWish/ace/mauCall/firstCardEffect=true`, `jackOnJack=false`. Bei leerem Nachziehstapel und `Ad` oben zieht und legt Bot0 dieselbe `Ad` erneut. Seine Hand wechselt zwischen 8 und 9 Karten; durch die Ass-Regel bleibt er am Zug. Nach 600 Schritten löst die bestehende Fortschrittsprüfung aus. Das ist ein eigener Bot-/Regelrandfall, keine fehlende UI-Bestätigung. Der [dauerhafte Diagnoseauszug](card-interaction-known-issue.json) enthält die tatsächliche Options-/Hand-/Verlaufsmomentaufnahme sowie die fünf gegen die Ausgangsbasis geprüften unveränderten Quellhashes.

Die Dateien `games/maumau/room.js`, `games/bots.js`, `server/random.js`, `test/simulation.test.js` und `test/sim-helpers.js` sind gegenüber der Ausgangsbasis unverändert. Auch die anderen Server-/Spielmodule wurden in diesem Auftrag nicht verändert. Der Befund bleibt ausdrücklich offen unter [Mau-Mau / CUX-004](CARD_INTERACTION_UX_ROADMAP.md#cux-004--mau-mau); Regeln und Bot-Verhalten dieses weiteren Spiels werden ohne eigene Freigabe nicht geändert und Tests nicht abgeschwächt. Ein zufällig grüner späterer CI-Lauf würde den reproduzierten Befund nicht widerlegen.

## Implementierungs- und Abschlussstand

Implementierungscommit auf `main`: **[`95b2327ce4b234ddd8678c5b4c2d7f3aa2769901`](https://github.com/TTLPSCWA/PokerAbend/commit/95b2327ce4b234ddd8678c5b4c2d7f3aa2769901)**. Der folgende Nachweis-Commit verknüpft die tatsächlichen Produktquellhashes, die 79 PNGs, sechs Beobachtungsprotokolle und die Testergebnisse mit genau diesem bestehenden Git-Objekt.

`CUX-001`, `CUX-002` und `CUX-003` sind abgeschlossen. Die zehn weiteren Karten-UX-Pakete bleiben `planned`, ihre Implementierungsfelder leer. Die 104 anderen VIS-Paketeinträge stimmen unverändert mit der Ausgangsbasis überein; 7 visuelle Pakete bleiben erledigt, 100 geplant. Die historischen Grafik-Implementierungscommits der drei Piloten bleiben erhalten; der Bedienungsauftrag ist dort separat unter `interaction_ux` verknüpft. Keine V2-Freigaben, anderen Spieloberflächen, Serverregeln oder Produktionsdaten verändert.

Vor Commit/Push wurde `origin/main` erneut abgeglichen. Der bestehende Push-Workflow führt Node-Tests aus und baut bei Erfolg das GHCR-Image. Das ist kein Produktivdeployment. Auf dem Produktivserver wurde nichts veröffentlicht. Weitere Spiele werden in diesem Auftrag nicht umgesetzt. Offen bleiben die reale iPhone-Hardware-Abnahme und der separat dokumentierte bestehende Mau-Mau-Bot-Zyklus.

Der abschließende [Korrekturlauf für `2dd1d4b`](https://github.com/TTLPSCWA/PokerAbend/actions/runs/41223705226) ist **erfolgreich**: 915 Node-Tests bestanden, anschließend wurde das GHCR-Image erfolgreich gebaut und veröffentlicht. Der Arbeitsbereich war danach sauber und mit `origin/main` synchron. Der anschließend separat beauftragte Ausbau von „Weitere Spiele“ steht in [der Backlog-Paket-Dokumentation](../backlog/WEITERE_SPIELE.md); er gehört nicht zum hier abgeschlossenen Karten-UX-Auftrag.
