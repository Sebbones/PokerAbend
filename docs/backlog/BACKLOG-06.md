# BACKLOG-06 – Stichmeister, Labyrinth-Brett und Schatzinsel

Umgesetzt auf `main` am 07.11.2026. Spielcode: `187d9f937673e79b80b86df3c6ca7fce8b7b7f05`. Ausschließlich diese drei freigegebenen Spiele; keine V2-Pakete. Die ursprüngliche Rubrik „Weitere Spiele“ enthält weiter 41 Spiele: 19 verifiziert, 22 offen. Gesamtbestand: 71 Raumspiele und zwölf lokale Einzelspieler.

## Regeln und Entscheidungen

**Stichmeister (3–6):** Ein eigenes 52-Karten-Blatt, Farbe bedienen, höchste Karte der angespielten Farbe oder Trumpf gewinnt. Vor jedem Blatt sagen alle ihre Stichzahl an. Ein Punkt je Stich und zehn Bonuspunkte für eine genaue Ansage, auch bei null. Der Backlog ließ die genaue Bonuszahl offen; sie ist hier und in den DE/EN-Regeln ausdrücklich beschrieben. Einstellbar: 1–20 Blätter, maximale Handgröße 1–8, aufgedeckter Trumpf oder ohne Trumpf. Gleiche Handgrößen steigen von eins bis zum Maximum und beginnen erneut bei eins. Der Host startet zwischen den Blättern weiter; die gesamte Partie zählt erst am Ende.

**Labyrinth-Brett (2–4):** Eigenes 7×7-Gangbrett, freies drehbares Plättchen, Einschieben an den ungeraden Reihen/Spalten. Figuren am herausgeschobenen Rand kommen auf dem eingeschobenen Plättchen wieder herein. Erst schieben, dann beliebig weit über beidseitig verbundene Gänge ziehen oder stehen bleiben. 1–6 private Aufträge pro Person, Standard drei; nur der eigene aktuelle Auftrag ist sichtbar. Öffentliche Schätze sind nummeriert und zweisprachig benannt. Wer alle eigenen Aufträge erfüllt und zum eigenen Start zurückkehrt, gewinnt. Der Backlog verbietet das direkte Zurückschieben nicht; deshalb ist es erlaubt. Große Felder lassen sich innerhalb des Brettes verschieben, ohne die Seite horizontal zu verbreitern.

**Schatzinsel (2–4):** Gemäß ausdrücklicher Nutzerklärung ein Ausgrabungsspiel ohne Würfel oder Figurenbewegung. Jede Person versteckt drei Schätze auf ihrer privaten 8×8-Insel; optional vier oder fünf. Ein Treffer gibt einen Punkt und einen weiteren Zug, ein Fehlversuch beendet den Zug. Hinweise verwenden den Manhattan-Abstand zum nächsten noch nicht gefundenen Schatz: heiß = 1, warm = 2–3, kalt = mindestens 4. Hinweise lassen sich abschalten. Eine leere Insel scheidet aus. Sobald nur eine Insel übrig ist, gewinnt die höchste Zahl gefundener Schätze; auch ein bereits ausgeschiedener Spieler kann damit gewinnen. Bei Zeitlimit werden fehlende Verstecke serverseitig zufällig gesetzt. Ohne Zeitlimit wartet die Vorbereitung auf die Bestätigung aller Teilnehmer.

## Integration, Bots und Geheimhaltung

Bestehende Raum-Spieler-IDs, TurnRoom, RoomClock, Hostrechte, Pause, Reconnect, Sprachwahl, Ergebnisansicht und Worker-Dienst werden weiterverwendet. Raum-Snapshots behalten die vorhandene Plattformregel: Wiederherstellung zwischen Runden; ein Browser-Reload innerhalb derselben laufenden Serverpartie erhält die persönliche Ansicht.

Alle drei Spiele haben Leicht/Mittel/Schwer mit strategischen Unterschieden: zufälligere Ansagen/Karten gegenüber Stichbedarf und letzter Position; zufällige Gänge gegenüber Zielbewertung und begrenztem Vorausplanen; zufällige Grabungen gegenüber öffentlichen Wärmehinweisen und Ausschluss unmöglicher Felder. Schwere Suche läuft im bestehenden Worker mit Zeit-/Knotenbudget und bester bisheriger Lösung; Server-Timeouts haben eine einfache legale Ersatzaktion. Dies erweitert keine historischen V2-16-Pilotnachweise und behauptet keine gemessene Gewinnquote.

Fremde Hände, nächste fremde Aufträge, Schatzverstecke und Vorräte bleiben serverseitig. Bots bekommen ausschließlich die persönliche öffentliche Spielansicht. Die Tests verändern fremde Geheimnisse und prüfen identische Ansichten/Entscheidungen. Aussteigen bricht ohne erfundene Punkte ab. Alte Rundenschlüssel und veraltete Aktionen werden abgewiesen.

Gemeinsame Änderungen beschränken sich auf Registrierung, Bot-Fähigkeiten/Worker-Aufrufe und die drei erlaubten Bot-Aktionen, Scene-Zuordnung, DE/EN-Metadaten sowie Roadmap/Backlog. Bestehende Spiele behalten ihre Reihenfolge. Parallel bearbeitete fremde Spieloberflächen werden nicht in dieses Päckchen übernommen.

## Tests und Bildnachweise

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| Neue Regeltests | 17 bestanden (einschließlich Worker-Startregression); 80 Stichmeister-Partien, 18 Labyrinth-Partien, 80 Schatzinsel-Partien; Karten-/Plättchen-/Schatz- und Punktinvarianten |
| Regeln plus Katalog/Planung | 47 bestanden, 0 fehlgeschlagen; `artifacts/backlog06-focused-node.log` |
| Finales Playwright Desktop + Handy | 10 bestanden, 0 fehlgeschlagen, 125,526 s; `artifacts/backlog06-real-worker-ui-report.json` |
| Gemeinsame Bot-Browserregression | 10 bestanden, 0 fehlgeschlagen, 63,172 s; `artifacts/backlog06-shared-ui-report.json` |

Browserabdeckung: eigene Lobby/SVG-Szene, drei echte Worker-Stufen, getrennte Zuschaueransicht, Host-only-Pause, Reload/Fortsetzen, reguläre Spielaktionen und englische Regeln. Desktop prüft zusätzlich 1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450 ohne horizontales Seitenüberlaufen. Die mobilen Nachprüfungen führen echte `tap()`-Aktionen aus.

Ein erster Browserlauf scheiterte nach erfolgreichem Stichmeister-Ende am noch offenen Ergebnisdialog, der den Regeln-Knopf überlagerte. Der Test schließt jetzt den Dialog wie ein Nutzer. Der vollständige gezielte Nachlauf ist grün; kein fehlgeschlagener Lauf wird als bestanden ausgewiesen.

Dauerhafte Originalbilder und Quellhashes: [Stichmeister](../../games/stichmeister/evidence.json), [Labyrinth-Brett](../../games/labyrinth-brett/evidence.json), [Schatzinsel](../../games/schatzinsel/evidence.json). Grafiken sind selbst geschriebene SVGs und CSS, ohne fremde Bilder oder Original-Logos. Dies sind Erstimplementierungen; es gab keine spielbaren Vorher-Oberflächen. Ausgewählte Desktop-/Handybilder wurden visuell geprüft.

Die zusätzlichen normalen Endpartien bestehen für Labyrinth-Brett und Schatzinsel auf Desktop und Handy. Insgesamt sind **60 Original-PNGs** dauerhaft abgelegt.

Die Endpartien deckten einen vorhandenen Worker-Startfehler auf: Der Browser-Testserver startet per Modul-Eval, dessen `--input-type=module` an Dateipfad-Worker vererbt wurde. Dadurch liefen Ersatzaktionen statt der Strategien. Commit `3c145f833dba1be85f7d0a901f7e73da36a051cf` filtert ausschließlich diese Eingabemodus-Flags; ohne sie bleibt Nodes Standardvererbung erhalten. Eine echte Unterprozess-Regressionsprüfung verlangt eine strategische Ansage von eins, während die Ersatzaktion null liefern würde. Alle zehn Spiel-Browserfälle wurden anschließend mit echten Strategien neu ausgeführt und bestanden.

Der erste Gesamtlauf im gemeinsamen Arbeitsbaum hatte vier Fehler: drei veraltete Katalog-/SVG-Annahmen und einen Hash durch parallele fremde Mogeln-Änderungen. Die neuen Katalogeinträge und beliebige positive SVG-Viewbox-Größen sind jetzt geprüft; SVG-Sicherheitsprüfungen bleiben erhalten. Fremde Oberflächen bleiben unangetastet. Die vollständige Node-Suite wird deshalb zusätzlich aus einer Kopie des vorgesehenen Main-Quellstands ausgeführt. Keine Branches, kein Zurücksetzen fremder Dateien. Der erste isolierte Lauf bestand alle funktionalen Fälle; nur der Bildnachweis war veraltet, weil der laufende Browser noch neue Aufnahmen schrieb. Nach Abschluss aller Aufnahmen wurden die Bildhashes neu erzeugt und der Gesamttest wiederholt.

Kein Produktivdeployment. Nach diesem Auftrag stoppen.

## Abschlussergebnis

Vollständige Node-Suite des freigegebenen Main-Quellstands: **1.365 bestanden, 0 fehlgeschlagen, 3 übersprungen**, 86,860 s (`artifacts/backlog06-final-full-node.log`). Abschließende Regel-/Katalog-/Quell-/Bildnachweise: **102 bestanden**, 0 fehlgeschlagen (`artifacts/backlog06-final-proof.log`). Alle **20 Browserfälle** sind grün. Die komplette projektweite Playwright-Suite wurde für dieses begrenzte Päckchen nicht erneut ausgeführt.

Backlog-Status: alle drei Spiele **verified**, echte Spielcode- und Worker-Folgecommits dokumentiert; aus games/planned.js entfernt und in games/roadmap.js als erledigt enthalten. VIS-053, VIS-058 und VIS-069 sind abgeschlossen; alle anderen Paketobjekte blieben unverändert. V2-Planung unverändert. Keine offenen Aufgaben innerhalb dieses Päckchens.
