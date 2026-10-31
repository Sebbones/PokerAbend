# Individuelle Spielwelten – Design-Roadmap

Stand: 31.10.2026. Quelle: [games/index.js](../../games/index.js) und [games/planned.js](../../games/planned.js). Ursprüngliche Inventur gegen Commit `ef6511d76f78689fc525a63f6e3637c3f14f1252`; die spätere Einzelspieler-Erweiterung und ihre Nachweise stehen in [docs/solo-games](../solo-games/README.md). Die zentrale maschinenlesbare Quelle ist [game-visual-roadmap.json](game-visual-roadmap.json).

**52 spielbare Spiele, 55 noch nicht implementierte Spiele, 107 eigene VIS-Pakete: 7 done, 100 planned.** Scotland Yard, UNO, Skip-Bo, Phase 10 sowie die ausdrücklich beauftragten neuen Solo-Spiele Sudoku, 2048 und Wellenwacht sind abgeschlossen. Die Solo-Implementierung steht in Commit `904cd0751fd3c89d9ea2169de09edbb3197e58ad`; Tests und permanente Bilder sind in der Solo-Abnahme dokumentiert. Die weiteren 45 bestehenden Spieloberflächen und 55 Backlog-Konzepte bleiben geplant. Vorhandene Material-/Brettarbeit anderer Spiele wird erhalten.

Der anschließende Auftrag [Karten-Interaktion UX V1](CARD_INTERACTION_UX.md) ergänzt ausschließlich UNO, Skip-Bo und Phase 10 um sichere Kartenbedienung. Die [eigene Karten-UX-Roadmap](CARD_INTERACTION_UX_ROADMAP.md) inventarisiert alle 13 registrierten Kartenspiele; zehn Folgepakete bleiben geplant. Dieser Bedienungsauftrag ändert keine VIS-IDs oder V2-Freigaben.

## Verbindliche Arbeitsweise

Nur ein ausdrücklich freigegebenes Spiel bzw. VIS-Paket umsetzen. Ein Designpaket ist keine Gameplay-Freigabe und kein V2-Paket. Ausschließlich main; keine Branches/PRs, kein Force-Push, kein eigenständiges Produktivdeployment. Nach Umsetzung Status, echte Tests, ausgewählte dauerhafte Screenshots und Implementierungscommit ergänzen und stoppen. Details: [Designstandard](GAME_VISUAL_GUIDELINES.md).

Ein späterer Auftrag wie „Implementiere das visuelle Redesign für Schiffe versenken“ wird über game_name bzw. game_id eindeutig zugeordnet. Bei geplanter Spiellogik zuerst Gameplay-Voraussetzung prüfen und keine Engine aus diesem Plan ableiten. VIS-IDs niemals umnummerieren.

## Inventur und Beurteilung

Die vorhandenen Frontend-Dateien und ihre Komponenten wurden individuell aus dem Quellcode analysiert. Manuelle visuelle Abnahme und echte Vorher-/Nachher-Vergleiche wurden für Scotland Yard, UNO, Skip-Bo und Phase 10 durchgeführt. Optische Schwächen anderer Spiele sind begründete Quellcode-/Designbefunde; sie ersetzen keine spätere Sichtprüfung. Nicht implementierte Spiele besitzen kein behauptetes bestehendes Frontend.

## Reihenfolge

Die folgenden ersten Aufgaben sind kleine Verbesserungen mit überschaubarem Zustandsraum. Abhängigkeiten werden berücksichtigt; komplexe Bretter und Rollenwelten folgen später. Stunden sind grobe Design-/Frontend-Schätzungen einschließlich Responsive- und Testarbeit, ohne Gameplay-Entwicklung. Kein Eintrag ist automatisch freigegeben.

| Reihenfolge | Paket | Spiel | Aufwand | Priorität |
| --- | --- | --- | --- | --- |
| 1 | [VIS-027](#vis-027) | Chicago | 3–5 h | P1 |
| 2 | [VIS-035](#vis-035) | Tickendes Paket | 3–5 h | P1 |
| 3 | [VIS-049](#vis-049) | Würfelduell | 3–5 h | P1 |
| 4 | [VIS-025](#vis-025) | Würfelpoker | 3–5 h | P1 |
| 5 | [VIS-021](#vis-021) | Mogeln | 4–6 h | P1 |
| 6 | [VIS-033](#vis-033) | Pfeilfieber | 4–6 h | P1 |
| 7 | [VIS-018](#vis-018) | Schätzmeister | 4–6 h | P1 |
| 8 | [VIS-015](#vis-015) | Shut the Box | 4–6 h | P1 |
| 9 | [VIS-032](#vis-032) | Gedächtnisküche | 5–8 h | P1 |
| 10 | [VIS-003](#vis-003) | Mau-Mau | 5–8 h | P1 |
| 11 | [VIS-020](#vis-020) | Wer hat das gesagt? | 5–8 h | P1 |
| 12 | [VIS-030](#vis-030) | Domino | 6–9 h | P2 |
| 13 | [VIS-026](#vis-026) | Lügenwürfel | 6–9 h | P2 |
| 14 | [VIS-005](#vis-005) | Mäxchen | 6–9 h | P2 |
| 15 | [VIS-022](#vis-022) | Präsident | 6–9 h | P2 |
| 16 | [VIS-019](#vis-019) | Schlagfertig | 6–9 h | P2 |
| 17 | [VIS-010](#vis-010) | Schwimmen | 6–9 h | P2 |
| 18 | [VIS-034](#vis-034) | Sortierstation | 6–9 h | P2 |
| 19 | [VIS-014](#vis-014) | Vier gewinnt | 6–9 h | P2 |
| 20 | [VIS-031](#vis-031) | Zahlenzoo | 6–9 h | P2 |
| 21 | [VIS-028](#vis-028) | Reversi | 7–11 h | P2 |
| 22 | [VIS-006](#vis-006) | Schocken | 7–11 h | P2 |
| 23 | [VIS-016](#vis-016) | Zehntausend | 7–11 h | P2 |
| 24 | [VIS-029](#vis-029) | Dame | 8–12 h | P2 |
| 25 | [VIS-048](#vis-048) | Hex | 8–12 h | P2 |
| 26 | [VIS-012](#vis-012) | Kniffel | 8–12 h | P2 |
| 27 | [VIS-038](#vis-038) | Kritzelpost | 8–12 h | P2 |
| 28 | [VIS-039](#vis-039) | Bildunterschrift | 6–9 h | P2 |
| 29 | [VIS-040](#vis-040) | Malen & Raten | 7–11 h | P2 |
| 30 | [VIS-042](#vis-042) | Kronenjagd | 8–12 h | P2 |
| 31 | [VIS-044](#vis-044) | 6 nimmt! | 8–12 h | P2 |
| 32 | [VIS-023](#vis-023) | Durak | 9–14 h | P2 |
| 33 | [VIS-043](#vis-043) | Laser-Hüpfer | 9–14 h | P2 |
| 34 | [VIS-017](#vis-017) | Mühle | 9–14 h | P2 |
| 35 | [VIS-037](#vis-037) | Wer bin ich? | 9–14 h | P2 |
| 36 | [VIS-041](#vis-041) | Bröckelboden | 10–15 h | P2 |
| 37 | [VIS-045](#vis-045) | Monopoly Deal | 12–18 h | P3 |
| 38 | [VIS-011](#vis-011) | Blackjack | 13–20 h | P3 |
| 39 | [VIS-007](#vis-007) | Mensch ärgere Dich nicht | 13–20 h | P3 |
| 40 | [VIS-013](#vis-013) | Schiffe versenken | 14–21 h | P3 |
| 41 | [VIS-036](#vis-036) | Werwolf | 14–21 h | P3 |
| 42 | [VIS-002](#vis-002) | Texas Hold'em | 16–24 h | P3 |
| 43 | [VIS-024](#vis-024) | Omaha | 7–11 h | P2 |
| 44 | [VIS-047](#vis-047) | Spiel des Lebens | 18–27 h | P3 |
| 45 | [VIS-046](#vis-046) | Monopoly | 20–30 h | P3 |

Die JSON-Datei enthält eine reine Aufwandssortierung aller 95 Pakete sowie eine getrennte Reihenfolge für offene spielbare Spiele. Vorhandene individuelle Bretter behalten ihre Materialarbeit; spätere Pakete polieren sie nach eigener Freigabe.

## Bedingte Konzepte noch nicht implementierter Spiele

Diese Reihenfolge gilt erst nach separater Gameplay-Freigabe und tatsächlicher Implementierung des jeweiligen Spiels. Sie ist keine Liste jetzt auszuführender Arbeiten.

| Konzept | Spiel | Designaufwand nach Gameplay |
| --- | --- | --- |
| VIS-055 | Risiko-Würfeln | 4–6 h |
| VIS-059 | Story-Chaos | 5–8 h |
| VIS-056 | Würfeljagd | 6–9 h |
| VIS-085 | Zahlenreihe | 6–9 h |
| VIS-083 | Brückenroulette | 7–11 h |
| VIS-082 | Lügenbaron | 7–11 h |
| VIS-073 | Puzzle-Panik | 7–11 h |
| VIS-070 | Gummiband-Challenge | 8–12 h |
| VIS-060 | Regelwahnsinn | 8–12 h |
| VIS-081 | Doppelagent | 9–14 h |
| VIS-071 | Geschenkfänger | 9–14 h |
| VIS-052 | Short Deck Poker | 9–14 h |
| VIS-074 | Wortjagd | 9–14 h |
| VIS-084 | Würfel-Auktion | 9–14 h |
| VIS-057 | Monsterwürfel | 10–15 h |
| VIS-053 | Stichmeister | 10–15 h |
| VIS-075 | Stillgestanden! | 10–15 h |
| VIS-091 | Turmbauer | 10–15 h |
| VIS-054 | Exploding-Deck | 11–17 h |
| VIS-067 | Hearts | 11–17 h |
| VIS-068 | Five Card Draw | 12–18 h |
| VIS-062 | Infektionsjagd | 12–18 h |
| VIS-063 | Letzter Schutzplatz | 12–18 h |
| VIS-077 | Minenlauf | 12–18 h |
| VIS-050 | Omaha Hi/Lo | 12–18 h |
| VIS-094 | Reaktor-Notfall | 12–18 h |
| VIS-092 | Geschenkdiebe | 13–20 h |
| VIS-072 | Rhythmus-Rausch | 14–21 h |
| VIS-076 | Schatzgräber | 14–21 h |
| VIS-069 | Schatzinsel | 14–21 h |
| VIS-051 | Seven Card Stud | 14–21 h |
| VIS-064 | Kistenchaos | 15–23 h |
| VIS-079 | Schubsarena | 15–23 h |
| VIS-061 | Jäger & Schatten | 16–24 h |
| VIS-078 | Labyrinth-Chaos | 16–24 h |
| VIS-080 | Scheinwerfer-Flucht | 16–24 h |
| VIS-065 | Backgammon | 18–27 h |
| VIS-095 | Bomben-Duell | 18–27 h |
| VIS-093 | Fallenbauer | 18–27 h |
| VIS-058 | Labyrinth-Brett | 18–27 h |
| VIS-088 | Schach | 20–30 h |
| VIS-066 | Scrabble | 20–30 h |
| VIS-086 | Skat | 22–33 h |
| VIS-087 | Doppelkopf | 24–36 h |
| VIS-090 | Gebietskampf (Risiko-inspiriert) | 28–42 h |
| VIS-089 | Städtehandel (Catan-inspiriert) | 28–42 h |

## Alle individuellen Pakete

<a id="vis-001"></a>
### VIS-001 – Scotland Yard

- **Spiel-ID/Kategorie:** `scotland-yard` / Brettspiele.
- **Implementierung / Design:** playable / **done**.
- **Priorität / Aufwand:** P0; 0–0 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/scotland-yard/city-board.svg](../../public/games/scotland-yard/city-board.svg), [public/games/scotland-yard/scotland-yard.css](../../public/games/scotland-yard/scotland-yard.css), [public/games/scotland-yard/scotland-yard.js](../../public/games/scotland-yard/scotland-yard.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Geprüfter Pilot mit eigener Stadt Aure, Ermittlungsakte, persönlichen Markern und Fahrkarten.
- **Optische Verbesserungsziele:** Die frühere Rasterkarte und leere Lobby wurden im Pilotauftrag ersetzt; Karte bleibt für lesbare Ziele bewusst verschiebbar.
- **Stil:** Ermittlungszentrale in Nachtblau, Papier, Braun und Messing.
- **Hintergrund:** Originale statische Stadtgrafik mit Vierteln, Fluss und Landmarken.
- **Spielfeld:** 49 Originalstationen und unveränderte Server-Kanten in organischer Darstellungsgeometrie.
- **Figuren/Karten/Objekte:** Nummerierte Ermittlerfarben, Mr.-X-Silhouette, letzte Sichtung und eigene Fahrkarten.
- **Status und Aktionen:** Öffentliche Spur, persönlicher Vorrat, Reiseprotokoll und Zielstationen räumlich getrennt.
- **Mobil:** Öffentliche Spur vor Karte, native Kartenverschiebung und alternative 44-Pixel-Ziele.
- **Technische Grenzen:** Geheimhaltung ausschließlich nach persönlicher Serveransicht; Backendkarte und Regeln unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** Keine offenen visuellen Voraussetzungen..

**Individuelle Akzeptanz:**

- 861 Node-Tests und 18 gezielte Browserprüfungen bestanden.
- 12 abschließende Screenshotprüfungen auf sechs Größen bestanden.
- Alternative geheime Positionen erzeugen identisches öffentliches HTML.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Implementierungscommit `ef6511d76f78689fc525a63f6e3637c3f14f1252`, [Pilot-Abnahme](SCOTLAND_YARD_REDESIGN.md), [Bildmanifest](scotland-yard-screenshots.json).

<a id="vis-002"></a>
### VIS-002 – Texas Hold'em

- **Spiel-ID/Kategorie:** `poker` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 16–24 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/poker/poker.css](../../public/games/poker/poker.css), [public/games/poker/poker.js](../../public/games/poker/poker.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css)
- **Aktueller Stand:** Eigener ovaler Filztisch mit Rail, Chips, Side-Pots, Sitzen und umfangreichem Dock.
- **Optische Verbesserungsziele:** Tisch und Informationsfülle sind bereits ausgebaut; eine neue Briefing-/Wartekomposition und konsistente visuelle Hierarchie fehlen noch.
- **Stil:** Diskreter privater Casino-Salon in Tannengrün, Messing und dunklem Holz.
- **Hintergrund:** Eigenes flaches Salon-SVG; Tischfläche bleibt ruhig und frei von Fotos.
- **Spielfeld:** Bestehendes Tischoval, Board und Side-Pots präzise aufeinander ausrichten; Pokergeometrie erhalten.
- **Figuren/Karten/Objekte:** Lesbare Kartenindizes, unterscheidbare Chipwerte, Dealer-/Blindmarker; französisches und deutsches Blatt bewahren.
- **Status und Aktionen:** Setzbetrag, eigener Einsatz, Pot, Call/Raise und All-in klar gewichten; Vorabaktionen und Geschenkdialoge erhalten.
- **Mobil:** Board und eigene Karten zuerst; Betragssteuerung einhändig, größere Karten und Side-Pots ohne Abschneiden.
- **Technische Grenzen:** Keine gegnerischen Hände, Restkarten oder versteckten Wahrscheinlichkeiten darstellen; Geldbeträge und Pot-Limit nicht aus UI ableiten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Preflop bis Showdown einschließlich Side-Pots und All-in zeigen.
- Eigene Hand bleibt bei vier Bildschirmbreiten und jeder Kartengröße bedienbar.
- Kein Kartenwert erscheint früher als in der persönlichen Ansicht.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-003"></a>
### VIS-003 – Mau-Mau

- **Spiel-ID/Kategorie:** `maumau` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 5–8 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/maumau/maumau.css](../../public/games/maumau/maumau.css), [public/games/maumau/maumau.js](../../public/games/maumau/maumau.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** kitShedding mit gemeinsamem Kartenblatt und kleinem eigenem Farbwunschzeichen.
- **Optische Verbesserungsziele:** Das Farbwunschzeichen ist eigenständig, die Welt um die Ablage bleibt weitgehend die gemeinsame Kartenrunde.
- **Stil:** Einladender moderner Hausspieltisch, Salbeigrün und warmes Elfenbein.
- **Hintergrund:** Dezente textile Tischfläche mit einem schmalen Holzrand.
- **Spielfeld:** Zieh- und Ablagestapel als eindeutiges Paar mit klar sichtbarem gültigem Wunsch.
- **Figuren/Karten/Objekte:** Beide vorhandenen Kartenblätter bewahren; Bube/Unter, Strafziehen und letzte Karte visuell kennzeichnen.
- **Status und Aktionen:** Ziehen, Weiter und Mau-Ansage klar von passiven Karten trennen.
- **Mobil:** Überlappende Hand, Lupe und Ziehen per Touch erhalten; Farbwunsch oberhalb der Hand sichtbar.
- **Technische Grenzen:** Karten-IDs, deutsches Blatt und Mau-Pflicht unverändert; fremde Hände bleiben verborgen. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- 7er-Strafe, Aussetzen und Bubenwunsch eindeutig darstellen.
- Französisches/deutsches Blatt und große Handkarten prüfen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-004"></a>
### VIS-004 – UNO

- **Spiel-ID/Kategorie:** `farbenchaos` / Kartenspiele.
- **Implementierung / Design:** playable / **done**.
- **Priorität / Aufwand:** P3; 12–18 h; kompakte bis mittlere Spieloberfläche. Historische Schätzung; freigegebener Umfang abgeschlossen.
- **Frontend:** [public/games/farbenchaos/farbenchaos.css](../../public/games/farbenchaos/farbenchaos.css), [public/games/farbenchaos/farbenchaos.js](../../public/games/farbenchaos/farbenchaos.js), [public/games/farbenchaos/haunted-manor.svg](../../public/games/farbenchaos/haunted-manor.svg), [public/games/farbenchaos/investigation-tools.svg](../../public/games/farbenchaos/investigation-tools.svg)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Zusätzliche gemeinsame Präsentation:** [card-worlds.css](../../public/games/card-worlds.css), ausschließlich von diesen drei Spielstyles importiert.
- **Aktueller Stand:** Geprüftes gemeinsames Kartensystem mit fünf eigenen Themen: Modern Card Table, Dual World, Extreme Edition, Wild Card Universe und Haunted Investigation; echte Spuknacht-Variante mit unveränderter Classic-Engine.
- **Abnahme / Darstellungsgrenzen:** Lange Hände und öffentliche Flip-Rückseiten bleiben bewusst intern verschiebbar. Kleine Zusatzbeschriftungen ergänzen die großen Werte/Symbole; die vorhandene English-Beta-Abdeckung bleibt bestehen.
- **Stil:** Fünf individuelle UNO-Welten von modernem Grün über helle/dunkle Dualität und dunkles Spektrum bis zur paranormalen Ermittlungsnacht.
- **Hintergrund:** Ruhige lokale Themenflächen; Spuknacht mit eigenem statischem Anwesen und selbst gezeichneten Ermittlungsutensilien am Rand.
- **Spielfeld:** Große Zieh-/Ablagestapel mit thematischen Rücken, öffentlicher Flip-Seite, Strafkette und getrennten Varianteninformationen.
- **Figuren/Karten/Objekte:** Ein skalierbarer Renderer für sämtliche vorhandenen Werte/Aktionszeichen; Spuknacht gestaltet alle Classic-Kartentypen als eigene Ermittlungs-/Geisterkarten.
- **Status und Aktionen:** Öffentlicher Zug, Richtung, Farbwahl und Ziehschuld; No-Mercy-Ausscheiden und Spuknacht-Ermittlungsstatus mit kurzen steuerbaren Effekten.
- **Mobil:** Alle fünf Varianten auf sechs Größen mit lesbaren scrollbaren Händen, runder Farbwahl, nativer/visueller Hostwahl und erreichbaren Dialogen.
- **Technische Grenzen:** Alle vier bisherigen Varianten unverändert spielbar halten; Spuknacht verwendet unmittelbar die bestehende Classic-Room-Klasse samt sämtlichen Hausregeln. Keine Engine duplizieren. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, flip, no-mercy, all-wild, halloween-ghosthunt
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Alle fünf Varianten regulär im Host-Menü erstellen, starten, wiederverbinden und auswerten; Spuknacht führt Classic-Regeln aus.
- Vorder-/Rückseiten und sämtliche tatsächlich vorhandenen Aktionsarten bleiben ohne bloße Farbe unterscheidbar; Flip animiert ausschließlich neu freigegebene Ansichten.
- Kurze Effekte respektieren reduzierte Bewegung, persönliche Ruhe und gemeinsame Pause; sechs Größen und getrennte Variantenwertung geprüft.
- Zusätzlich gelten G01–G10.

**Nachweise:** Implementierungscommit `dc2079a5862ba549cdcc9359c4a67157436ff1d9`; [UNO Ultimate / Spuknacht](UNO_ULTIMATE_REDESIGN.md), [42 dauerhafte Bilder und Manifest](uno-ultimate-screenshots.json). 892 Node-Tests, 189 relevante Browserregressionen und 10 abschließende Variantenfälle erfolgreich. Historischer Vier-Varianten-Stand: `84cccbc`.

<a id="vis-005"></a>
### VIS-005 – Mäxchen

- **Spiel-ID/Kategorie:** `maexchen` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/maexchen/maexchen.css](../../public/games/maexchen/maexchen.css), [public/games/maexchen/maexchen.js](../../public/games/maexchen/maexchen.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigenes Becher-SVG, Würfel, Lebensmarker und animierte Aufdeckung.
- **Optische Verbesserungsziele:** Der Becher ist bereits vorhanden; Ansage, Blick unter den Becher und Urteil brauchen eine stärkere gemeinsame Hierarchie.
- **Stil:** Atmosphärischer Kneipen-Blufftisch mit dunklem Leder und Bernstein.
- **Hintergrund:** Gedämpfter Tresenrand; keine Bilder hinter verdeckten Würfeln.
- **Spielfeld:** Zentraler Becherplatz mit getrennten Bereichen für öffentliche Ansage und persönliche Einsicht.
- **Figuren/Karten/Objekte:** Vorhandenen Becher und Würfel verfeinern; Leben als beständige Spielchips.
- **Status und Aktionen:** Öffentliche Behauptung, eigenes Wissen und Anzweifeln deutlich unterscheiden.
- **Mobil:** Becher, Behauptung und große Ansageknöpfe in einer Spalte; Lebensübersicht kompakt.
- **Technische Grenzen:** Würfel unter dem Becher niemals als fremdes DOM, Tooltip oder animierte Vorstufe ausgeben. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Geschlossener Becher, eigene Einsicht und Aufdeckung getrennt zeigen.
- Mäxchen, Pasch und verlorenes Leben verständlich markieren.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-006"></a>
### VIS-006 – Schocken

- **Spiel-ID/Kategorie:** `schocken` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 7–11 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/schocken/schocken.css](../../public/games/schocken/schocken.css), [public/games/schocken/schocken.js](../../public/games/schocken/schocken.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigene Würfelschale und Deckelstapel, Halbzeit-/Finaleanzeige und Deckelflug.
- **Optische Verbesserungsziele:** Deckelverteilung und Phasen sind vorhanden, aber Materialwirkung und Raumbezug uneinheitlich.
- **Stil:** Ruhiger Kneipentisch mit patiniertem Holz und dunkler Würfelmatte.
- **Hintergrund:** Eigenes Holz-/Filzmuster als CSS oder lokales SVG.
- **Spielfeld:** Deckelvorrat, aktive Schale und Halbzeitwertung klar voneinander absetzen.
- **Figuren/Karten/Objekte:** 13 Deckel als konsistente physische Chips; behaltene Würfel ohne reine Farbabhängigkeit.
- **Status und Aktionen:** Wurfzahl, Schock-Rang und schlechtester bisheriger Wurf gleichzeitig erfassbar.
- **Mobil:** Deckelstapel in kompakter Spielerzeile; Würfel und Behalten-Schalter mindestens 44 Pixel.
- **Technische Grenzen:** Halbzeiten, Finale, Rangfolge und Deckelübertragung unverändert lassen. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Deckeltransfer und beide Halbzeiten/Finale darstellen.
- Gehaltene Würfel und letzter erlaubter Wurf bleiben eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-007"></a>
### VIS-007 – Mensch ärgere Dich nicht

- **Spiel-ID/Kategorie:** `huetchen` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 13–20 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/huetchen/huetchen.css](../../public/games/huetchen/huetchen.css), [public/games/huetchen/huetchen.js](../../public/games/huetchen/huetchen.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigenes klassisches Raster und SVG-Sechseck mit farbigen Figuren und Würfel.
- **Optische Verbesserungsziele:** Mehrere Brettgeometrien benötigen ein gemeinsames Materialkonzept und klarere Ziel-/Heimzonen.
- **Stil:** Wertiges klassisches Holzbrett mit lackierten farbigen Spielfiguren.
- **Hintergrund:** Ruhiger Spieltisch; Brett und Figuren bleiben scharf und kontrastreich.
- **Spielfeld:** Viererbrett und 60-Felder-Sechseck separat gestalten; tatsächliche Feldindizes und Laufwege erhalten.
- **Figuren/Karten/Objekte:** Identifizierbare Figurenformen/Farbnummern, klar umrandete eigene Heim- und Zielfelder.
- **Status und Aktionen:** Würfel, erlaubte Figur, Schlagzwang und Teampartner sichtbar unterscheiden.
- **Mobil:** Ganzes Brett proportional einpassen, alternative Figurenaktionen zugänglich lassen.
- **Technische Grenzen:** Vier-/Sechs-Spieler- und Teamvarianten sowie Figur-IDs und Schlagpflicht erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, six, team
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Alle Brettgrößen sowie Team-Ziele visuell prüfen.
- Start, Heimzone, Laufbahn und Ziel sind ohne Raten unterscheidbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-008"></a>
### VIS-008 – Phase 10

- **Spiel-ID/Kategorie:** `zehnetappen` / Kartenspiele.
- **Implementierung / Design:** playable / **done**.
- **Priorität / Aufwand:** P2; 10–15 h; kompakte bis mittlere Spieloberfläche. Historische Schätzung; freigegebener Umfang abgeschlossen.
- **Frontend:** [public/games/zehnetappen/zehnetappen.css](../../public/games/zehnetappen/zehnetappen.css), [public/games/zehnetappen/zehnetappen.js](../../public/games/zehnetappen/zehnetappen.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Zusätzliche gemeinsame Präsentation:** [card-worlds.css](../../public/games/card-worlds.css), ausschließlich von diesen drei Spielstyles importiert.
- **Aktueller Stand:** Geprüfter Arbeitsplatz in Petrol, Creme und Koralle mit Phasenziel, Zugschritten und Gruppenauswahl im Hauptbereich; Hand und Bestätigung bleiben im Dock.
- **Abnahme / Darstellungsgrenzen:** Die früher das Handy ausfüllende Gruppenauswahl wurde aus dem Dock entfernt. Sehr dichte Auslagen bleiben vertikal verschiebbar; sehr große Hände können zusätzlich im begrenzten Dock scrollen.
- **Stil:** Präziser Kartenspiel-Arbeitsplatz in Petrol, Creme und Koralle.
- **Hintergrund:** Textiler Hintergrund ohne Ornament hinter den Gruppen.
- **Spielfeld:** Phasenziel, aktuelle Gruppierung und fremde Auslagen mit festen Lesebereichen.
- **Figuren/Karten/Objekte:** Wert-/Farb-/Jokerkarten und Aussetzen eigenständig, Kartenindizes bleiben identisch.
- **Status und Aktionen:** Auslegen, Anlegen und Abwerfen als unterschiedliche Modi sichtbar halten.
- **Mobil:** Zwei Gruppen auf dem Handy untereinander; Vorschau und Bestätigung bleiben erreichbar.
- **Technische Grenzen:** Phasenprüfung, Jokerbelegung, Team- und Kurzvariante sowie verdeckte Hände erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, short, team
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Zwei Gruppen und sechs Karten lange Folge ohne Abschneiden darstellen.
- Gültige/ungültige Gruppe und eigener Abwurfmodus sind sofort erkennbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Implementierungscommit `84cccbc5795ac9b0a28c5a6723526d8d7affc2e6`, [Kartenwelten-Abnahme](CARD_WORLDS_REDESIGN.md), [dauerhafte Bildvergleiche](card-worlds-screenshots.json). 8 versionierte Screenshots; 879 Node-Tests und 26 abschließende gezielte Browserfälle erfolgreich. Vollständige Browserergebnisse einschließlich Nachprüfungen stehen im Abnahmebericht.

<a id="vis-009"></a>
### VIS-009 – Skip-Bo

- **Spiel-ID/Kategorie:** `stapelrennen` / Kartenspiele.
- **Implementierung / Design:** playable / **done**.
- **Priorität / Aufwand:** P2; 9–14 h; kompakte bis mittlere Spieloberfläche. Historische Schätzung; freigegebener Umfang abgeschlossen.
- **Frontend:** [public/games/stapelrennen/stapelrennen.css](../../public/games/stapelrennen/stapelrennen.css), [public/games/stapelrennen/stapelrennen.js](../../public/games/stapelrennen/stapelrennen.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Zusätzliche gemeinsame Präsentation:** [card-worlds.css](../../public/games/card-worlds.css), ausschließlich von diesen drei Spielstyles importiert.
- **Aktueller Stand:** Geprüfter eigener Stapeltisch: helle nummerierte Baureihen, nächster Wert und Fortschritt; getrennte eigene Ablagen, Zielstapel und offene Partnerquellen.
- **Abnahme / Darstellungsgrenzen:** Früher gleichartige Stapel wurden räumlich getrennt. Kleine Bildschirme behalten lesbare Karten und vertikales Scrollen; im 900×450-Querformat stehen eigene Stapel und gemeinsame Reihen nebeneinander.
- **Stil:** Heller strukturierter Kartentisch mit kräftigen nummerierten Stapelreitern.
- **Hintergrund:** Ruhiges graublaues Tuch mit dezenten Stapelrahmen.
- **Spielfeld:** Persönlicher Spielstapel, vier Ablagen und gemeinsame Baureihen geometrisch trennen.
- **Figuren/Karten/Objekte:** Zahlen/Joker klar lesen; Stapelhöhe als Text erhalten statt nur Kartenrücken.
- **Status und Aktionen:** Erlaubte Quellen/Ziele und Zugende visuell unterscheiden.
- **Mobil:** Gemeinsame Reihen und eigener Spielstapel sichtbar halten; Ausweichaktionen für Drag-and-drop.
- **Technische Grenzen:** Team- und Kurzpartie, Ablagegrenzen und verborgene Handkarten nicht verändern. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, short, team
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Zugbeginn, Spielstapelzug und Zugende mit voller Hand zeigen.
- Partnerstapel ist in Teams eindeutig und ausschließlich regelkonform bedienbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Implementierungscommit `84cccbc5795ac9b0a28c5a6723526d8d7affc2e6`, [Kartenwelten-Abnahme](CARD_WORLDS_REDESIGN.md), [dauerhafte Bildvergleiche](card-worlds-screenshots.json). 10 versionierte Screenshots; 879 Node-Tests und 26 abschließende gezielte Browserfälle erfolgreich. Vollständige Browserergebnisse einschließlich Nachprüfungen stehen im Abnahmebericht.

<a id="vis-010"></a>
### VIS-010 – Schwimmen

- **Spiel-ID/Kategorie:** `schwimmen` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/schwimmen/schwimmen.css](../../public/games/schwimmen/schwimmen.css), [public/games/schwimmen/schwimmen.js](../../public/games/schwimmen/schwimmen.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Drei mittlere Karten, Lebensmarker und Hinweise auf Klopfen/letzte Runde.
- **Optische Verbesserungsziele:** Tauschauswahl und letzte Chance sind vorhanden, könnten aber als eigene Bistroszene schneller erfassbar sein.
- **Stil:** Eleganter kleiner Bistrotisch mit drei zentralen Auslageplätzen.
- **Hintergrund:** Gedämpftes dunkles Holz, cremefarbene Kartenfläche.
- **Spielfeld:** Genau drei Auslageplätze mit erkennbaren gewählten Tauschpartnern.
- **Figuren/Karten/Objekte:** Kartenhand, 31-Abzeichen und Leben als unterschiedliche Materialien.
- **Status und Aktionen:** Eine/alle tauschen, Schieben und Klopfen sichtbar getrennt.
- **Mobil:** Dreierhand und Mittelkarten nicht überlappen; letzte Runde kompakt anzeigen.
- **Technische Grenzen:** Wertberechnung, verdeckte Hände und Ende nach dem Klopfen erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- 31, Klopfen und letzte Chance darstellen.
- Gewählter einzelner Tausch ist auf Handy und Tastatur klar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-011"></a>
### VIS-011 – Blackjack

- **Spiel-ID/Kategorie:** `blackjack` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 13–20 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/blackjack/blackjack.css](../../public/games/blackjack/blackjack.css), [public/games/blackjack/blackjack.js](../../public/games/blackjack/blackjack.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigener grüner Casinotisch mit Dealerzone, mehreren Sitzen und geteilten Händen.
- **Optische Verbesserungsziele:** Bereits individueller Tisch; Split-Hände, Versicherungs- und Einsatzzustände brauchen feinere gemeinsame Hierarchie.
- **Stil:** Zeitloser Blackjack-Tisch mit klarer Dealerachse, burgunderfarbenen Akzenten und Messing.
- **Hintergrund:** Unaufdringlicher Casinoraum jenseits der aktiven Tischfläche.
- **Spielfeld:** Dealer und Spielersitze, Split-Hand und Einsatzzonen ordnen ohne Sitzplätze zu verlagern.
- **Figuren/Karten/Objekte:** Karten und Chipstapel, weiche/hart gerechnete Summe und Natur-Blackjack konsistent markieren.
- **Status und Aktionen:** Setzen, Ziehen, Stehen, Verdoppeln und Teilen nur in ihrem gültigen Zustand hervorheben.
- **Mobil:** Aktive Split-Hand zuerst; Dealerkarte und Einsätze ohne breite Gesamttabelle.
- **Technische Grenzen:** Verdeckte Dealerkarte nicht vorzeitig darstellen; Auszahlung, Versicherung und Split unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Verdeckte Dealerkarte und späteres Aufdecken separat prüfen.
- Mehrere Split-Hände und deren jeweilige Einsätze bleiben unterscheidbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-012"></a>
### VIS-012 – Kniffel

- **Spiel-ID/Kategorie:** `kniffel` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 8–12 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/kniffel/kniffel.css](../../public/games/kniffel/kniffel.css), [public/games/kniffel/kniffel.js](../../public/games/kniffel/kniffel.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Würfeltablett und Punkteblatt, gehaltene Würfel sowie Drei-Spalten-Variante.
- **Optische Verbesserungsziele:** Funktionales Punkteblatt dominiert; Tablett und Auswahlvorschau können materiell und hierarchisch zusammengeführt werden.
- **Stil:** Hochwertiges Würfeltablett neben einem klaren Papier-Punkteblatt.
- **Hintergrund:** Dunkles Holz außerhalb des Tabletts; ruhiges Leinen unter dem Blatt.
- **Spielfeld:** Fünf Würfel und 13 Zeilen mit sauberer Zeilenführung; Dreifachblatt behält getrennte Faktoren.
- **Figuren/Karten/Objekte:** Taktil gezeichnete Würfel, Behalten-Marker und eindeutig ausgewählte Wertungszeile.
- **Status und Aktionen:** Würfe übrig, Vorschau, Streichen und bestätigter Eintrag gut unterscheiden.
- **Mobil:** Punkteblatt scrollbar; aktive Würfel und bestätigbare Zeile bleiben erreichbar.
- **Technische Grenzen:** Wertungsformeln, Boni, Dreifachfaktoren und echte Würfelergebnisse unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, triple
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Alle 13 Zeilen und Dreifach-Kniffel zeigen.
- Vorschau, Null-Eintrag und bereits belegtes Feld unterscheiden.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-013"></a>
### VIS-013 – Schiffe versenken

- **Spiel-ID/Kategorie:** `schiffe` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 14–21 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/schiffe/schiffe.css](../../public/games/schiffe/schiffe.css), [public/games/schiffe/schiffe.js](../../public/games/schiffe/schiffe.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigenes Platzierungsbrett und zwei Meeresraster mit Schiffen, Treffern und Salvo.
- **Optische Verbesserungsziele:** Die Raster sind klar, aber Raum, Flotteninventar und Seezustände wirken noch als funktionale Webflächen.
- **Stil:** Maritimer taktischer Kartentisch in Marineblau, Elfenbein und Messing.
- **Hintergrund:** Lokales nautisches Kartenmaterial mit sehr dezentem Küstenrand.
- **Spielfeld:** Eigenes Meer und Zielmeer als getrennte Seekarten; Koordinaten exakt erhalten.
- **Figuren/Karten/Objekte:** Eigene Schiffssilhouetten, unterscheidbare Wasser-/Treffer-/Versenkt-Symbole.
- **Status und Aktionen:** Platzierung, bereit und Salvenbestätigung als klar getrennte Phasen.
- **Mobil:** Beim Platzieren nur die eigene Karte priorisieren; im Gefecht Zielkarte zuerst, beide zugänglich.
- **Technische Grenzen:** Keine gegnerische Flotte oder ungefeuerten Schiffe in Grafik, Hover oder DOM. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, salvo
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Aufstellen, Warten, Schießen und Salvo zeigen.
- Identische Gegneransicht für unterschiedliche verdeckte Flotten nachweisen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-014"></a>
### VIS-014 – Vier gewinnt

- **Spiel-ID/Kategorie:** `viergewinnt` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/viergewinnt/viergewinnt.css](../../public/games/viergewinnt/viergewinnt.css), [public/games/viergewinnt/viergewinnt.js](../../public/games/viergewinnt/viergewinnt.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigener blauer Rahmen, Scheiben, Zielvorschau und gewinnende Reihe.
- **Optische Verbesserungsziele:** Brett bereits funktional gestaltet; Material, Standfuß und Variantenhinweise noch nicht als vollständiger Spielrahmen.
- **Stil:** Wertiger physischer Spielrahmen mit ruhiger roter/gelber Spielsteinpalette.
- **Hintergrund:** Schlichter matter Spieltisch, Rahmen steht deutlich im Vordergrund.
- **Spielfeld:** Bestehende Spaltengeometrie und 9×6-Variante bewahren; Standfuß nur dekorativ.
- **Figuren/Karten/Objekte:** Scheiben mit Ring-/Punktmarkierung zusätzlich zur Farbe.
- **Status und Aktionen:** Einwurfspalte, Vorschau und Pop-Out-Unterkante eindeutig unterscheiden.
- **Mobil:** Ganzes Brett einpassen; mindestens 44 Pixel breite Spaltenaktionen und Pop-Out-Steuerung.
- **Technische Grenzen:** Falllogik, Pop-Out und Fünferreihen nicht aus Animationen neu berechnen. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, pop-out, five
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Classic, Pop Out und Fünf-in-einer-Reihe zeigen.
- Gewinnlinie auch mit reduzierter Bewegung klar markieren.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-015"></a>
### VIS-015 – Shut the Box

- **Spiel-ID/Kategorie:** `shutthebox` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 4–6 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/shutthebox/shutthebox.css](../../public/games/shutthebox/shutthebox.css), [public/games/shutthebox/shutthebox.js](../../public/games/shutthebox/shutthebox.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Holzbox mit Klappen, Summenwahl und eigener Miniwertung.
- **Optische Verbesserungsziele:** Eigenes Holzmaterial vorhanden; Scharnierdarstellung und Auswahlbestätigung könnten konsistenter sein.
- **Stil:** Kompakte hochwertige Klappbox mit dunkler Filzmulde.
- **Hintergrund:** Ruhiger Gaststättentisch mit warmem Seitenlicht aus CSS.
- **Spielfeld:** 9-/12-Klappen-Box sauber ausrichten; tatsächliche Klappennummern erhalten.
- **Figuren/Karten/Objekte:** Klappen mit sichtbarer offener/geschlossener Lage; Würfel und Summe klar lesen.
- **Status und Aktionen:** Gewählte Summe, gültig/ungültig und Bestätigung absetzen.
- **Mobil:** Klappen auf zwei lesbare Reihen umbrechen, Würfel und Bestätigung nicht verdrängen.
- **Technische Grenzen:** Nur serverseitig erlaubte Klappensummen anbieten; Neun-/Zwölferregeln behalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Offen, ausgewählt und geschlossen ohne Farbraten unterscheiden.
- 9 und 12 Klappen auf schmalem Handy bedienen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-016"></a>
### VIS-016 – Zehntausend

- **Spiel-ID/Kategorie:** `zehntausend` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 7–11 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/zehntausend/zehntausend.css](../../public/games/zehntausend/zehntausend.css), [public/games/zehntausend/zehntausend.js](../../public/games/zehntausend/zehntausend.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Würfelauswahl, bereits herausgelegte Gruppen und Fortschrittsbalken bis zum Ziel.
- **Optische Verbesserungsziele:** Risiko, Zugpunkte und gesicherte Punkte teilen sich die Fläche ohne eigene Tischgeschichte.
- **Stil:** Würfelarena mit klarer Trennung von Risiko und gesicherter Wertung.
- **Hintergrund:** Ruhige moosgrüne Spielmatte, warmer Holztischrand.
- **Spielfeld:** Aktuelle sechs Würfel, herausgelegte Gruppen und Ergebnisstrecke separat führen.
- **Figuren/Karten/Objekte:** Würfelgruppen als zusammengehörige Sets mit gut lesbarer Wertsumme.
- **Status und Aktionen:** Weiterwürfeln und Anschreiben deutlich absetzen; Niete und Einstieg sichtbar.
- **Mobil:** Aktuelle Würfel/Entscheidung zuerst, Rangliste als kompakte nachrangige Liste.
- **Technische Grenzen:** Gruppenwertung, Einstiegshürde, heiße Würfel und letzte Runde unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Niete, Wiedereinstieg mit sechs Würfeln und letzte Runde zeigen.
- Zugpunkte sind nicht mit gesicherten Punkten verwechselbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-017"></a>
### VIS-017 – Mühle

- **Spiel-ID/Kategorie:** `muehle` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 9–14 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/muehle/muehle.css](../../public/games/muehle/muehle.css), [public/games/muehle/muehle.js](../../public/games/muehle/muehle.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigenes Linienbrett mit Punkten, Steinen und hervorgehobenen Mühlen.
- **Optische Verbesserungsziele:** Das geometrische Brett ist klar; Material, Reservesteine und Wechsel der Phasen könnten zusammenhängender sein.
- **Stil:** Edles dunkles Holz- oder Steinbrett mit Elfenbein-/Anthrazitsteinen.
- **Hintergrund:** Schlichte Turnierfläche ohne Textur in den Linien.
- **Spielfeld:** Drei Quadrate, Mittellinien und 24 Punkte exakt erhalten; Reserven neben dem Brett.
- **Figuren/Karten/Objekte:** Steine mit Rand/Material zusätzlich zur Farbe; ausgewählte und schlagbare Steine unterscheiden.
- **Status und Aktionen:** Setzen, Ziehen, Springen und Schlagen als eindeutige Zustände.
- **Mobil:** Brett vollständig einpassen; Alternativliste für Ziele bei kleinen Feldabständen erwägen.
- **Technische Grenzen:** Nachbarschaften, Mühlen und Schlagregeln nicht visuell neu interpretieren. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Alle vier Aktionszustände und neue Mühle zeigen.
- Kein dekorativer Knoten wird zu einem scheinbaren Spielfeld.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-018"></a>
### VIS-018 – Schätzmeister

- **Spiel-ID/Kategorie:** `schaetzmeister` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 4–6 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/schaetzmeister/schaetzmeister.css](../../public/games/schaetzmeister/schaetzmeister.css), [public/games/schaetzmeister/schaetzmeister.js](../../public/games/schaetzmeister/schaetzmeister.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/party-kit.js](../../public/games/party-kit.js), [public/games/party-kit.css](../../public/games/party-kit.css)
- **Aktueller Stand:** Gemeinsame Frage, Zahleneingabe und Zahlenstrahl mit Avataren und Rangliste.
- **Optische Verbesserungsziele:** Die Auflösung ist bereits spezialisiert; Fragephase und Eingabe wirken noch wie Standardformulare.
- **Stil:** Redaktioneller Wissenssalon mit großen Fragen und vermessungsähnlicher Grafik.
- **Hintergrund:** Warme Papierflächen und dezente Maßstriche außerhalb des Textes.
- **Spielfeld:** Frage als Hauptkarte; Ergebnisstrahl mit klarer richtiger Antwort und Abstand.
- **Figuren/Karten/Objekte:** Avatar-Nadeln, eigene Schätzung und Einheiten als konsistente Infografik.
- **Status und Aktionen:** Eigener Entwurf, abgegeben und aufgelöst müssen deutlich verschieden aussehen.
- **Mobil:** Lange Fragen umbrechen; Zahlenstrahl mit überlappenden Antworten und Eingabe im Dock.
- **Technische Grenzen:** Keine richtige Zahl oder fremden Schätzungen vor der Auflösung; DE/EN-Zahlenbedeutung erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Schreiben, Warten und Zahlenstrahl mit Extremwerten zeigen.
- Sprachwechsel erhält den numerischen Entwurfwert.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-019"></a>
### VIS-019 – Schlagfertig

- **Spiel-ID/Kategorie:** `schlagfertig` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/schlagfertig/schlagfertig.css](../../public/games/schlagfertig/schlagfertig.css), [public/games/schlagfertig/schlagfertig.js](../../public/games/schlagfertig/schlagfertig.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/party-kit.js](../../public/games/party-kit.js), [public/games/party-kit.css](../../public/games/party-kit.css)
- **Aktueller Stand:** Aufgabenkarten, verdeckte Texteingabe, Antwortduelle und Ergebnispaare.
- **Optische Verbesserungsziele:** Antwortduelle haben Struktur, aber Schreibphase, Wahl und Pointe noch keine eigenständige Bühnenwirkung.
- **Stil:** Kleine Comedy-Bühne mit Papierkarten und warmem Spotlicht.
- **Hintergrund:** Dunkler Vorhang als subtile SVG/CSS-Kulisse ohne Bewegung hinter Text.
- **Spielfeld:** Aufgabe und zwei Antworten als klarer Duellraum statt Formularstapel.
- **Figuren/Karten/Objekte:** Antwortkarten typografisch gleichberechtigt, eigene Karte ohne vorzeitige Autorzuordnung.
- **Status und Aktionen:** Schreiben, abgegeben, Abstimmung und finale Wertung klar kennzeichnen.
- **Mobil:** Duelle auf schmalen Geräten untereinander; lange Pointen vollständig lesbar.
- **Technische Grenzen:** Autoren, verdeckte Antworten, eigene Abstimmungsverbote und Stimmen geheim halten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Leere/lange Antworten und Gleichstand zeigen.
- Keine Autorinfo vor ihrer erlaubten Auflösung.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-020"></a>
### VIS-020 – Wer hat das gesagt?

- **Spiel-ID/Kategorie:** `werhatdasgesagt` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 5–8 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/werhatdasgesagt/werhatdasgesagt.css](../../public/games/werhatdasgesagt/werhatdasgesagt.css), [public/games/werhatdasgesagt/werhatdasgesagt.js](../../public/games/werhatdasgesagt/werhatdasgesagt.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/party-kit.js](../../public/games/party-kit.js), [public/games/party-kit.css](../../public/games/party-kit.css)
- **Aktueller Stand:** Anonyme Antwortkarte und Zuordnung über Spielerknöpfe mit späterer Autorenauflösung.
- **Optische Verbesserungsziele:** Raten und Aufdecken sind vorhanden; die Frage-/Antwortkarte könnte stärker als Ermittlungsrunde gestaltet sein.
- **Stil:** Gemütlicher Gesprächskreis mit anonymen Papiernotizen.
- **Hintergrund:** Warmer Tisch und dunkle gemütliche Wandflächen.
- **Spielfeld:** Eine Antwort im Fokus, Spielerzuordnung als ruhiger Kreis bzw. kompaktes Raster.
- **Figuren/Karten/Objekte:** Notizzettel mit gleicher Handschrift-/Typografiewirkung ohne verräterische Varianten.
- **Status und Aktionen:** Abgegeben, noch raten und aufgelöst eindeutig trennen.
- **Mobil:** Lange persönliche Texte und bis zu zehn Zuordnungen ohne horizontales Überlaufen.
- **Technische Grenzen:** Anonyme Antworten und Autor-IDs bleiben bis zur vorgesehenen Auflösung verborgen. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Eigenen Autor-Ausschluss und Zuschauerwertung darstellen.
- Gleiche verdeckte Darstellung für alle Autoren nachweisen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-021"></a>
### VIS-021 – Mogeln

- **Spiel-ID/Kategorie:** `mogeln` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 4–6 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/mogeln/mogeln.css](../../public/games/mogeln/mogeln.css), [public/games/mogeln/mogeln.js](../../public/games/mogeln/mogeln.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Verdeckter Stapel, öffentliche Rangansage und Kartenaufdeckung bei Anzweifeln.
- **Optische Verbesserungsziele:** Der Bluff ist funktional erkennbar, der Tisch und Spannungszustand bleiben visuell schlicht.
- **Stil:** Geheimer Kartentisch in Bordeaux und Creme.
- **Hintergrund:** Dunkles Tuch mit schmaler Messingkante.
- **Spielfeld:** Verdeckter Stapel und öffentliche Behauptung als zwei klar getrennte Informationsquellen.
- **Figuren/Karten/Objekte:** Einheitliche Kartenrücken; aufgedeckte Beweiskarten erst nach Challenge.
- **Status und Aktionen:** Legen, Ansagen und Anzweifeln mit eigenem Rückmeldungsbereich.
- **Mobil:** Mehrfachauswahl von Handkarten mit gut sichtbarer Auswahlanzahl.
- **Technische Grenzen:** Keine verdeckten Stapelkarten oder Lügnerhinweise vor der Challenge. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Wahre/falsche Ansage und Stapelübernahme zeigen.
- Verdeckte Kartenrücken sind unabhängig von ihrem Wert identisch.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-022"></a>
### VIS-022 – Präsident

- **Spiel-ID/Kategorie:** `praesident` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/praesident/praesident.css](../../public/games/praesident/praesident.css), [public/games/praesident/praesident.js](../../public/games/praesident/praesident.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Zentrale Kartenkombination, Rangstatus und ausspielbare eigene Karten.
- **Optische Verbesserungsziele:** Die Kombination ist lesbar; Hierarchie der Plätze und Passrunde fehlt als eigene visuelle Identität.
- **Stil:** Zurückhaltender Clubtisch mit Rangkarten statt überladener Prunkkulisse.
- **Hintergrund:** Dunkles blaugrünes Filz mit ruhigen Rangplaketten.
- **Spielfeld:** Aktuelle Kombination, Rundenfreigabe und verbleibende Plätze trennen.
- **Figuren/Karten/Objekte:** Kartenbündel sichtbar gruppieren; Präsident-/Nachfolgerstatus als lesbare Plaketten.
- **Status und Aktionen:** Passen, neue freie Runde und Kartenabgabe verständlich ankündigen.
- **Mobil:** Mehrfachauswahl in langen Händen erhalten; Ränge kompakt neben Namen.
- **Technische Grenzen:** Kartentausch, Rangfolge und verdeckte Hände unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Passrunde, freie Ausspielrunde und finale Rangliste zeigen.
- Getauschte Karten nur ihren Empfängern anzeigen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-023"></a>
### VIS-023 – Durak

- **Spiel-ID/Kategorie:** `durak` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/durak/durak.css](../../public/games/durak/durak.css), [public/games/durak/durak.js](../../public/games/durak/durak.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Angriffs-/Abwehrpaare, Trumpfkarte und Nachziehvorrat als eigene Bereiche.
- **Optische Verbesserungsziele:** Die Paare sind spezialisiert, aber Reihenfolge und Angriff/Abwehr können durch gleichartige Kartenflächen untergehen.
- **Stil:** Präziser taktischer Kartentisch mit rotblauen Bereichsakzenten.
- **Hintergrund:** Ruhiges graugrünes Tuch mit getrennten Paarplätzen.
- **Spielfeld:** Angriff und zugehörige Abwehr deckungsgleich ordnen, Trumpf/Vorrat daneben.
- **Figuren/Karten/Objekte:** Paarnummern und Trumpfzeichen zusätzlich zu Kartenfarben.
- **Status und Aktionen:** Angreifen, Dazulegen, Nehmen und Abgeschlossen klar unterscheiden.
- **Mobil:** Paare vertikal stapeln, eigene Hand und Nachlegen-Steuerung weiter erreichbar.
- **Technische Grenzen:** Angreifer/Verteidiger, Trumpfregeln und verborgene Handkarten nicht verändern. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Mehrere Angriffspaare und vollständige/unvollständige Abwehr zeigen.
- Trumpffarbe und aktive Rolle sind sofort sichtbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-024"></a>
### VIS-024 – Omaha

- **Spiel-ID/Kategorie:** `omaha` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 7–11 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/poker/poker.css](../../public/games/poker/poker.css), [public/games/poker/poker.js](../../public/games/poker/poker.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css)
- **Aktueller Stand:** Nutzt exakt das Poker-Frontend mit vier eigenen Karten und Pot-Limit-Vorgaben.
- **Optische Verbesserungsziele:** Gemeinsame Casinooberfläche braucht eine eindeutige Vier-Karten-/Zwei-zählen-Hierarchie ohne Hold’em-Verwechslung.
- **Stil:** Derselbe hochwertige Casino-Salon wie Poker, mit dezenter eigener Omaha-Kennzeichnung.
- **Hintergrund:** Poker-Salon wiederverwenden, eigener graphischer Variantenakzent.
- **Spielfeld:** Tisch- und Potgeometrie von Poker bewahren; vier eigene Karten größer gewichten.
- **Figuren/Karten/Objekte:** Vier Karten gleichberechtigt zeigen; Hinweis auf genau zwei gewertete Karten als Regeltext.
- **Status und Aktionen:** Pot-Limit-Grenzen und Vier-Karten-Variante im Dock verständlich halten.
- **Mobil:** Vier eigene Karten bei allen Kartengrößen ohne Verlust der Aktionstasten.
- **Technische Grenzen:** Geteilte Pokerdateien nicht ungefragt für andere Spiele umgestalten; exakt-zwei-Regel und Pot-Limit erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-002.

**Individuelle Akzeptanz:**

- Vier eigene Karten und Pot-Limit-Einsatzgrenzen prüfen.
- Omaha bleibt optisch erkennbar, ohne Hold’em-Ansicht mitzuredesignen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-025"></a>
### VIS-025 – Würfelpoker

- **Spiel-ID/Kategorie:** `wuerfelpoker` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 3–5 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/wuerfelpoker/wuerfelpoker.css](../../public/games/wuerfelpoker/wuerfelpoker.css), [public/games/wuerfelpoker/wuerfelpoker.js](../../public/games/wuerfelpoker/wuerfelpoker.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Fünf Würfel mit Behalten-Markern, aktuelle Kategorie und Ergebnisliste.
- **Optische Verbesserungsziele:** Die Wurfkategorie ist vorhanden; Tablett und Vergleich der Gegner wirken noch wenig als eigenständiges Spiel.
- **Stil:** Kompakter Poker-Würfeltisch in Nachtblau und warmem Gold.
- **Hintergrund:** Dunkle Würfelmatte mit ruhigem Rand.
- **Spielfeld:** Fünf Würfel mittig, Kategorie unmittelbar darunter, Rundenergebnisse daneben.
- **Figuren/Karten/Objekte:** Taktil konsistente Würfel und deutlich markierte gehaltene Würfel.
- **Status und Aktionen:** Würfe übrig, Kategorie und Abschließen klar führen.
- **Mobil:** Fünferreihe darf zweizeilig werden; Ergebnisliste bleibt separat scrollbar.
- **Technische Grenzen:** Kategorien, Gleichstände und echte Würfelergebnisse unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Pasch, Straße und gehaltene Würfel zeigen.
- Aktueller Wurf und bereits abgeschlossenes Ergebnis unterscheiden.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-026"></a>
### VIS-026 – Lügenwürfel

- **Spiel-ID/Kategorie:** `luegenwuerfel` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/luegenwuerfel/luegenwuerfel.css](../../public/games/luegenwuerfel/luegenwuerfel.css), [public/games/luegenwuerfel/luegenwuerfel.js](../../public/games/luegenwuerfel/luegenwuerfel.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Privater Würfelbecher, öffentliche Gebotsanzeige und gemeinsame spätere Aufdeckung.
- **Optische Verbesserungsziele:** Privates Wissen und öffentliches Gebot liegen nahe beieinander; Bechermaterial und Beweisphase können prägnanter sein.
- **Stil:** Geheimer Würfelclub mit dunklem Leder und kupferfarbenen Gebotsplaketten.
- **Hintergrund:** Ruhiger Clubtisch, Becherbereich ohne verräterische Bilddetails.
- **Spielfeld:** Öffentliches Gebot zentral; eigener Becher klar als persönliche Informationszone.
- **Figuren/Karten/Objekte:** Geschlossene fremde Becher identisch; eigene Würfel erst im persönlichen Bereich.
- **Status und Aktionen:** Anzahl und Augenzahl getrennt wählen; Raise und Anzweifeln klar unterscheiden.
- **Mobil:** Eigene Würfel und zweistufige Gebotswahl untereinander, fremde Würfelzahlen kompakt.
- **Technische Grenzen:** Keine fremden Becherwerte oder Summen vor der Aufdeckung. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Höheres Gebot, Anzweifeln und Würfelverlust zeigen.
- Private Becherwerte verändern keine fremde Darstellung.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-027"></a>
### VIS-027 – Chicago

- **Spiel-ID/Kategorie:** `chicago` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 3–5 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/chicago/chicago.css](../../public/games/chicago/chicago.css), [public/games/chicago/chicago.js](../../public/games/chicago/chicago.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Zielzahl, Spielerliste, Würfelpaar und Rundenhistorie.
- **Optische Verbesserungsziele:** Zielzahl und Ergebnis sind klar, aber es fehlt eine eigenständige Würfelbrett-Komposition.
- **Stil:** Kleiner klassischer Würfelzähler mit elf gut lesbaren Rundenmarken.
- **Hintergrund:** Dunkle matte Spielunterlage mit kleinem Messing-Zählrand.
- **Spielfeld:** Aktuelle Rundenzahl prominent über dem Würfelpaar; Historie als kurzer Streifen.
- **Figuren/Karten/Objekte:** Zwei hochwertige Würfel, Treffer als Symbol plus Text.
- **Status und Aktionen:** Treffer, Punktestand und Stechrunde getrennt darstellen.
- **Mobil:** Zwei Würfel und aktuelles Ziel im ersten Bildschirm; Liste statt breiter Wertungstabelle.
- **Technische Grenzen:** Elf Runden, Zielwert und Stechregeln unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Zieltreffer, Fehlschlag und Stechrunde unterscheiden.
- Historie und laufender Wurf sind nicht verwechselbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-028"></a>
### VIS-028 – Reversi

- **Spiel-ID/Kategorie:** `reversi` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 7–11 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/reversi/reversi.css](../../public/games/reversi/reversi.css), [public/games/reversi/reversi.js](../../public/games/reversi/reversi.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigenes zweifarbiges Brett mit legalen Zielen und Umdrehanimation.
- **Optische Verbesserungsziele:** Brett ist bereits gestaltet; Raum, Randbeschriftung und Steinmaterial können ruhiger und einheitlicher werden.
- **Stil:** Reduziertes strategisches Turnierbrett in tiefem Grün.
- **Hintergrund:** Schlichte Turniertischfläche, kein bewegter Hintergrund.
- **Spielfeld:** 8×8-Feld und vorhandene Zielpunkte exakt erhalten; klarer Brettabschluss.
- **Figuren/Karten/Objekte:** Elfenbein-/Anthrazitscheiben mit kontrastreichem Rand und optionalen Mustern.
- **Status und Aktionen:** Steinzählung, erlaubter Zug und Aussetzen gut unterscheiden.
- **Mobil:** Ganzes Brett auf Hoch-/Querformat einpassen; Zählung bleibt außerhalb des Rasters.
- **Technische Grenzen:** Umdrehlogik, automatische Pässe und Gewinnerprüfung unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Mehrfaches Umdrehen und Aussetzen zeigen.
- Beide Farben und letzte Änderung auch ohne Animation erkennbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-029"></a>
### VIS-029 – Dame

- **Spiel-ID/Kategorie:** `dame` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 8–12 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/dame/dame.css](../../public/games/dame/dame.css), [public/games/dame/dame.js](../../public/games/dame/dame.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** 8×8-Brett mit erlaubten Zielen, ausgewählter Figur und Damenkrone.
- **Optische Verbesserungsziele:** Figuren sind klar, aber Schlagefolgen und Aufstieg brauchen stärker erkennbare visuelle Zustände.
- **Stil:** Klassisches Turnierbrett aus dunklem Nussbaum und heller Einlage.
- **Hintergrund:** Ruhiger warmer Tisch ohne Bildmotiv in Spielfeldern.
- **Spielfeld:** Dunkle Spielquadrate und Koordinaten bewahren; Wege nur für tatsächlich legale Ziele.
- **Figuren/Karten/Objekte:** Gestapelte Damensteine bzw. eindeutige Krone zusätzlich zur Farbe.
- **Status und Aktionen:** Schlagpflicht, Mehrfachsprung und abgeschlossener Zug deutlich kennzeichnen.
- **Mobil:** Brett als Ganzes skalieren; ausgewählte Figur darf nicht hinter dem Dock verschwinden.
- **Technische Grenzen:** Schlagzwang, Mehrfachschlag und Beförderung nicht ändern. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Mehrfachschlag und Aufstieg zur Dame prüfen.
- Ausgewählte Figur, erlaubtes Ziel und geschlagener Stein unterscheiden.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-030"></a>
### VIS-030 – Domino

- **Spiel-ID/Kategorie:** `domino` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/domino/domino.css](../../public/games/domino/domino.css), [public/games/domino/domino.js](../../public/games/domino/domino.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Steinkette mit Doppelsteinen, Augendarstellung und eigener Steinauswahl.
- **Optische Verbesserungsziele:** Lange Ketten sind funktional scrollbar, aber ohne gestaltete räumliche Führung.
- **Stil:** Hochwertiger Elfenbein-Dominotisch auf dunklem Textil.
- **Hintergrund:** Ruhige textile Unterlage mit Platz für wachsende Ketten.
- **Spielfeld:** Kette mit klaren offenen Enden, Doppelsteine quer und Vorrat separat.
- **Figuren/Karten/Objekte:** Steine mit gut lesbaren Augen, Auswahlrand und identischem Maßstab.
- **Status und Aktionen:** Passendes Ende, Ziehen und Passen eindeutig anzeigen.
- **Mobil:** Kette innerhalb eines eigenen horizontalen Bereichs; Hand davon getrennt.
- **Technische Grenzen:** Endwerte und Legeausrichtung ausschließlich aus Serverzustand übernehmen. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Lange Kette mit mehreren Doppelsteinen darstellen.
- Linkes/rechtes Ende bleiben zugänglich und korrekt beschriftet.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-031"></a>
### VIS-031 – Zahlenzoo

- **Spiel-ID/Kategorie:** `zahlenzoo` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/zahlenzoo/logic.js](../../public/games/zahlenzoo/logic.js), [public/games/zahlenzoo/zahlenzoo.css](../../public/games/zahlenzoo/zahlenzoo.css), [public/games/zahlenzoo/zahlenzoo.js](../../public/games/zahlenzoo/zahlenzoo.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/solo/solo-kit.js](../../public/games/solo/solo-kit.js), [public/games/solo/solo-kit.css](../../public/games/solo/solo-kit.css), [public/games/party-kit.js](../../public/games/party-kit.js), [public/games/party-kit.css](../../public/games/party-kit.css)
- **Aktueller Stand:** Solo-Aufgabe mit Tier-Icons in Reihen, laufender Aufgabe und Ergebnisanzeige.
- **Optische Verbesserungsziele:** Tier-Icons sind vorhanden; die Szene bleibt ein kompaktes Symbolfeld ohne eigene Zoowelt.
- **Stil:** Freundlicher illustrativer Tierpark mit ruhigen Rechenhinweisen.
- **Hintergrund:** Eigenes flaches Park-/Gehege-SVG ohne ablenkende Bewegung hinter Aufgaben.
- **Spielfeld:** Tiergruppen und Rechenfrage klar trennen; Anordnung bleibt an die Aufgabe gebunden.
- **Figuren/Karten/Objekte:** Einheitliche lokale Tiersymbole mit unterscheidbaren Silhouetten.
- **Status und Aktionen:** Aufgabenphase, Antwort und Auswertung eindeutig kennzeichnen.
- **Mobil:** Tiergruppen umbrechen, Antwortknöpfe groß; Text nicht über bewegten Tieren.
- **Technische Grenzen:** Seed, Zeitstempel und richtige Antworten nicht aus der Dekoration ableiten oder vorzeitig zeigen. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Zählen und Rechnen mit vielen Tieren lesbar darstellen.
- Sprachwechsel/Pause setzt lokalen Fortschritt nicht zurück.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-032"></a>
### VIS-032 – Gedächtnisküche

- **Spiel-ID/Kategorie:** `gedaechtnis-kueche` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 5–8 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/gedaechtnis-kueche/gedaechtnis-kueche.css](../../public/games/gedaechtnis-kueche/gedaechtnis-kueche.css), [public/games/gedaechtnis-kueche/gedaechtnis-kueche.js](../../public/games/gedaechtnis-kueche/gedaechtnis-kueche.js), [public/games/gedaechtnis-kueche/logic.js](../../public/games/gedaechtnis-kueche/logic.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/solo/solo-kit.js](../../public/games/solo/solo-kit.js), [public/games/solo/solo-kit.css](../../public/games/solo/solo-kit.css), [public/games/party-kit.js](../../public/games/party-kit.js), [public/games/party-kit.css](../../public/games/party-kit.css)
- **Aktueller Stand:** Rezeptanzeige, Zutatenreihe und angetippte Wiederholungsfolge.
- **Optische Verbesserungsziele:** Klare Funktion, aber Küchenmaterial und Trennung von Merken/Wiedergeben noch schlicht.
- **Stil:** Warme Rezeptküche mit Papierkarte und ruhigem Arbeitsbrett.
- **Hintergrund:** Dezenter lokaler Küchenrand, freie Fläche unter den Zutaten.
- **Spielfeld:** Rezeptkarte während Merken; danach klar umgedrehte Karte und eigene Eingabefolge.
- **Figuren/Karten/Objekte:** Konsistente Zutaten-SVGs, Reihenfolgemarken und neutrale leere Plätze.
- **Status und Aktionen:** Merken, Wiedergeben und fertig unmissverständlich anzeigen.
- **Mobil:** Zutaten als große Kacheln; längere Folge scrollbar statt kleiner werdender Symbole.
- **Technische Grenzen:** Nach der Merkzeit keine erwartete Reihenfolge im DOM belassen; lokales Replay und Seed erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Merkphase und verdeckte Eingabe separat prüfen.
- Pause und Sprachwechsel behalten die bereits eingegebene Folge.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-033"></a>
### VIS-033 – Pfeilfieber

- **Spiel-ID/Kategorie:** `pfeilfieber` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 4–6 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/pfeilfieber/logic.js](../../public/games/pfeilfieber/logic.js), [public/games/pfeilfieber/pfeilfieber.css](../../public/games/pfeilfieber/pfeilfieber.css), [public/games/pfeilfieber/pfeilfieber.js](../../public/games/pfeilfieber/pfeilfieber.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/solo/solo-kit.js](../../public/games/solo/solo-kit.js), [public/games/solo/solo-kit.css](../../public/games/solo/solo-kit.css), [public/games/party-kit.js](../../public/games/party-kit.js), [public/games/party-kit.css](../../public/games/party-kit.css)
- **Aktueller Stand:** Pfeilfolge mit Fortschrittsmarkierung, Sperrphase und Eingabepad.
- **Optische Verbesserungsziele:** Funktionale Pfeile stehen auf gemeinsamer Solo-Fläche ohne eigenständige Rhythmuswirkung.
- **Stil:** Präzise grafische Signalstation in Blau, Creme und warmem Orange.
- **Hintergrund:** Statische Linien-/Signaltafel, keine blinkenden oder strobenden Flächen.
- **Spielfeld:** Aktueller Pfeil, bearbeitete Folge und nächster Schritt räumlich klar ordnen.
- **Figuren/Karten/Objekte:** Pfeile als klare Kontursymbole, erledigt zusätzlich mit Markierung.
- **Status und Aktionen:** Fortschritt, Fehler-Sperre und nächste Folge sauber gewichten.
- **Mobil:** Daumenfreundliches Kreuzpad und Tastaturhinweise; Wischen weiterhin möglich.
- **Technische Grenzen:** Zeitstempel, serverseitige Plausibilitätsprüfung und Rückwärts-Modus unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Fehler, kurze Sperre und vollständige Folge zeigen.
- Keine Animation verändert Eingabezeitpunkt oder lokalen Fortschritt.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-034"></a>
### VIS-034 – Sortierstation

- **Spiel-ID/Kategorie:** `sortierstation` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/sortierstation/logic.js](../../public/games/sortierstation/logic.js), [public/games/sortierstation/sortierstation.css](../../public/games/sortierstation/sortierstation.css), [public/games/sortierstation/sortierstation.js](../../public/games/sortierstation/sortierstation.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/solo/solo-kit.js](../../public/games/solo/solo-kit.js), [public/games/solo/solo-kit.css](../../public/games/solo/solo-kit.css), [public/games/party-kit.js](../../public/games/party-kit.js), [public/games/party-kit.css](../../public/games/party-kit.css)
- **Aktueller Stand:** Laufband mit Gegenständen, Regelhinweis und kategorisierten Kisten.
- **Optische Verbesserungsziele:** Objekte und Kisten sind funktional, die Sortierwelt und Regeln könnten typografisch klarer sein.
- **Stil:** Illustrative kleine Versandstation mit klarer Werkbank.
- **Hintergrund:** Eigener flacher Lagerraumrand außerhalb des laufenden Bandes.
- **Spielfeld:** Band und drei Zielkisten getrennt; aktive Sortierregel immer am gleichen Ort.
- **Figuren/Karten/Objekte:** Objektformen und Kistensymbole zusätzlich zu Farben.
- **Status und Aktionen:** Regelwechsel, aktuelles Objekt und Fehlwurf sichtbar unterscheiden.
- **Mobil:** Große Zielkisten am unteren Rand; Bandhöhe nicht von langen Hinweisen verdrängen.
- **Technische Grenzen:** Deterministische Objektfolge, Geschwindigkeiten und Zeitstempel erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Regelwechsel und mehrere Objektarten zeigen.
- Handybedienung verdeckt weder Band noch Zielkisten.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-035"></a>
### VIS-035 – Tickendes Paket

- **Spiel-ID/Kategorie:** `tickendes-paket` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 3–5 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/tickendes-paket/tickendes-paket.css](../../public/games/tickendes-paket/tickendes-paket.css), [public/games/tickendes-paket/tickendes-paket.js](../../public/games/tickendes-paket/tickendes-paket.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Paketgrafik, Aufgabenprompt, Buchstaben und optional sichtbarer Zünder.
- **Optische Verbesserungsziele:** Einzelnes Paket ist erkennbar, aber Halter, Aufgabe und erlaubte Zeitinformation brauchen eine eigenständige Spannungsbühne.
- **Stil:** Spannungsvolle Versandakte mit dunklem Papier und bernsteinfarbenem Licht.
- **Hintergrund:** Statische gedämpfte Paketablage; kein künstlicher Countdown.
- **Spielfeld:** Paket im Zentrum, aktueller Halter und Aufgabe klar daneben.
- **Figuren/Karten/Objekte:** Eigene Paketillustration mit unaufdringlicher Sicherungsplombe, ohne realistische Explosionsgewalt.
- **Status und Aktionen:** Weitergeben, eigene Texteingabe und Explosionsergebnis trennen.
- **Mobil:** Prompt und Eingabe zuerst; großes Weitergeben ohne übergroße Illustration.
- **Technische Grenzen:** Unsichtbaren Zünder niemals aus geschätzter Animation, Balken oder CSS-Timer verraten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Mit sichtbarem und verborgenem Zünder prüfen.
- Bei Pause frieren Zeit und Eingabezustand konsistent ein.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-036"></a>
### VIS-036 – Werwolf

- **Spiel-ID/Kategorie:** `werwolf` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 14–21 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/werwolf/werwolf.css](../../public/games/werwolf/werwolf.css), [public/games/werwolf/werwolf.js](../../public/games/werwolf/werwolf.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigene Rollenkarten, Tages-/Nachtanzeigen, Zielwahl, Todesliste und private Hinweise.
- **Optische Verbesserungsziele:** Viele Rollen und Phasen sind vorhanden, aber Dorfatmosphäre und visuelle Priorität sind noch fragmentiert.
- **Stil:** Mysteriöses nächtliches Dorf mit Kerzenlicht und klaren persönlichen Akten.
- **Hintergrund:** Originale Dorfsilhouette; Tag/Nacht nur nach öffentlicher Phase wechseln.
- **Spielfeld:** Öffentliche Dorfmitte und persönlicher Rollenbereich strikt räumlich trennen.
- **Figuren/Karten/Objekte:** Eigene Symbolkarten für Rollen; verstorbene Figuren respektvoll und deutlich markieren.
- **Status und Aktionen:** Nachtaktion, Diskussion, Abstimmung und Ergebnis mit klaren Phasenfarben/-titeln.
- **Mobil:** Private Aktion oben, Dorf und lange Rollenliste darunter; sichere Zielbestätigung.
- **Technische Grenzen:** Keine geheimen Rollen, Rudel-, Seher- oder Hexeninformationen an unberechtigte Ansichten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Tag, Nacht, private Aktion, Tod und Endaufdeckung zeigen.
- Alternative geheime Rollen ergeben gleiche öffentliche Darstellung.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-037"></a>
### VIS-037 – Wer bin ich?

- **Spiel-ID/Kategorie:** `wer-bin-ich` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/wer-bin-ich/wer-bin-ich.css](../../public/games/wer-bin-ich/wer-bin-ich.css), [public/games/wer-bin-ich/wer-bin-ich.js](../../public/games/wer-bin-ich/wer-bin-ich.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Bis zu zehn Stirnkarten, Frage-/Antwortstatus, Tipps und lokale Notizen.
- **Optische Verbesserungsziele:** Karten sind spezialisiert; eigener verdeckter Begriff und viele Gegnernotizen brauchen klarere räumliche Ordnung.
- **Stil:** Gemütlicher Ratesalon mit gleichartigen beschrifteten Stirnzetteln.
- **Hintergrund:** Ruhige warme Tischkulisse ohne Textmuster hinter Begriffen.
- **Spielfeld:** Eigener verdeckter Platz getrennt von sichtbaren Fremdkarten; aktive Frage im Fokus.
- **Figuren/Karten/Objekte:** Papiernotizen mit lesbaren langen Begriffen und konsistenter Spielerzuordnung.
- **Status und Aktionen:** Ja/Nein/Unklar, gelöst und weitere Frage eindeutig unterscheiden.
- **Mobil:** Kartenraster in zwei Spalten, lange Begriffe umbrechen; eigene Notizen erhalten.
- **Technische Grenzen:** Eigenen Begriff nie in DOM, Tooltip oder Illustration einfügen; Entwürfe beim Sprachwechsel erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Zehn lange Begriffe und eigene verdeckte Karte zeigen.
- Frage-/Antwortwechsel und eigene Notizen bleiben verständlich.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-038"></a>
### VIS-038 – Kritzelpost

- **Spiel-ID/Kategorie:** `kritzelpost` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 8–12 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/kritzelpost/kritzelpost.css](../../public/games/kritzelpost/kritzelpost.css), [public/games/kritzelpost/kritzelpost.js](../../public/games/kritzelpost/kritzelpost.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/drawing-kit.js](../../public/games/drawing-kit.js), [public/games/drawing.css](../../public/games/drawing.css)
- **Aktueller Stand:** Gemeinsamer Zeicheneditor, Textphasen und aufklappbare aufgelöste Ketten.
- **Optische Verbesserungsziele:** Gemeinsame Zeichenwerkzeuge sind gut bedienbar; die Brief-/Kettenerzählung ist visuell noch generisch.
- **Stil:** Kreativer Postatelier-Tisch mit Papierumschlägen und klarer Zeichenfläche.
- **Hintergrund:** Helles Papier auf dunkler Atelierfläche, Texturen außerhalb des Canvas.
- **Spielfeld:** Nur aktueller Beitrag im Fokus; spätere Kette als geordnete Poststrecke.
- **Figuren/Karten/Objekte:** Farbpalette und Strichstärke als Werkzeuge; Papierkarten für Bild-/Textbeiträge.
- **Status und Aktionen:** Zeichnen, Beschreiben, abgeschickt und gemeinsames Aufdecken trennen.
- **Mobil:** Canvas groß halten; Werkzeuge umbrechen, Touch-Zeichnung nicht mit Seitenscrollen verwechseln.
- **Technische Grenzen:** Nur vorherigen Beitrag zeigen; Canvas-Inhalt und lokale Entwürfe bei Pause/Sprachwechsel erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Mehrfacher Zeichen-/Textwechsel und lange Ketten prüfen.
- Keine spätere Kettenstufe wird vor Auflösung sichtbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-039"></a>
### VIS-039 – Bildunterschrift

- **Spiel-ID/Kategorie:** `bildunterschrift` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/bildunterschrift/bildunterschrift.css](../../public/games/bildunterschrift/bildunterschrift.css), [public/games/bildunterschrift/bildunterschrift.js](../../public/games/bildunterschrift/bildunterschrift.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/drawing-kit.js](../../public/games/drawing-kit.js), [public/games/drawing.css](../../public/games/drawing.css)
- **Aktueller Stand:** Nutzt denselben Editor, ergänzt anonyme Beschriftungen und Abstimmung.
- **Optische Verbesserungsziele:** Der gemeinsame Editor erklärt die Bildkarte gut, die Galerie-/Abstimmungsphase besitzt noch keine eigene visuelle Identität.
- **Stil:** Kleine Ausstellung mit großem Originalbild und typografischen Bildunterschriften.
- **Hintergrund:** Ruhige Atelier-/Galeriewand mit dunklem Rahmen.
- **Spielfeld:** Aktuelles Bild und gleichwertige Antwortkarten; Autoren erst zur vorgesehenen Auflösung.
- **Figuren/Karten/Objekte:** Gerahmte Zeichnung und gleich gestaltete anonyme Beschriftungszettel.
- **Status und Aktionen:** Beschriften, Abstimmen und Gewinnerunterschrift getrennt führen.
- **Mobil:** Bild oben, Beschriftungen darunter; lange Texte ohne schmale Spalten.
- **Technische Grenzen:** Anonymität, Eigenwahlverbote und unveränderte Zeichnungen schützen. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-038.

**Individuelle Akzeptanz:**

- Bild, lange Beschriftungen, Abstimmung und Auflösung zeigen.
- Keine Antwortgestaltung verrät Autor oder bisherige Stimmen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-040"></a>
### VIS-040 – Malen & Raten

- **Spiel-ID/Kategorie:** `malen-raten` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 7–11 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/malen-raten/malen-raten.css](../../public/games/malen-raten/malen-raten.css), [public/games/malen-raten/malen-raten.js](../../public/games/malen-raten/malen-raten.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/drawing-kit.js](../../public/games/drawing-kit.js), [public/games/drawing.css](../../public/games/drawing.css)
- **Aktueller Stand:** Gemeinsamer Canvas, Zeichenwerkzeuge und Rate-/Chatbereich.
- **Optische Verbesserungsziele:** Werkzeuge sind geteilt; Zeichenrolle und Zuschauerraten könnten stärker als eigene Spielshow gegliedert werden.
- **Stil:** Lebendige Zeichenbühne mit ruhiger weißer Leinwand.
- **Hintergrund:** Zurückhaltender Staffeleirand; keine Illustration im Canvas selbst.
- **Spielfeld:** Zeichenfläche groß; Rateverlauf als getrennte, stabile Fläche.
- **Figuren/Karten/Objekte:** Klares Werkzeugset und lesbare Rateblasen, eigene Figur als Rollenmarker.
- **Status und Aktionen:** Zeichner, Ratende, richtig geraten und neuer Begriff klar benennen.
- **Mobil:** Canvas bleibt nutzbar, wenn Bildschirmtastatur den Ratebereich öffnet.
- **Technische Grenzen:** Geheimen Begriff nur dem Zeichner zeigen; Live-Striche und Replay unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-038.

**Individuelle Akzeptanz:**

- Zeichner- und Rateansicht sowie richtige Antwort prüfen.
- Begriff fehlt vollständig in unberechtigtem DOM.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-041"></a>
### VIS-041 – Bröckelboden

- **Spiel-ID/Kategorie:** `broeckelboden` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 10–15 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/broeckelboden/broeckelboden.css](../../public/games/broeckelboden/broeckelboden.css), [public/games/broeckelboden/broeckelboden.js](../../public/games/broeckelboden/broeckelboden.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/realtime-kit.js](../../public/games/realtime-kit.js), [public/games/realtime.css](../../public/games/realtime.css)
- **Aktueller Stand:** Gemeinsamer Canvas mit zerfallenden Kacheln, Spielfiguren und Statusliste.
- **Optische Verbesserungsziele:** Gefahrzustände sind implementiert; beschädigte Kacheln und sichere Flächen brauchen robustere visuelle Lesbarkeit.
- **Stil:** Eigenständige schwebende Steinplattform mit kontrollierter Materialtiefe.
- **Hintergrund:** Statischer dunkler Abgrund außerhalb der Arena.
- **Spielfeld:** Tatsächliche Kacheln und Kollisionsflächen exakt beibehalten, Bruchzustände nur aus Frames.
- **Figuren/Karten/Objekte:** Kontrastreiche Figuren mit Nummer/Kontur; Risse zeigen Vorwarnung zusätzlich zur Farbe.
- **Status und Aktionen:** Countdown, springend, ausgeschieden und letzter Überlebender klar trennen.
- **Mobil:** Arena und Touch-Pad einpassen; Gefahren nicht durch große Namen verdecken.
- **Technische Grenzen:** Keine Kollisions-/Bewegungsänderung, keine neuen Partikel mit Gameplaybedeutung; Frame-Protokoll erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-042.

**Individuelle Akzeptanz:**

- Unbeschädigt, brüchig und gefallen unterscheiden.
- Schatten/Material täuschen keine zusätzliche begehbare Fläche vor.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-042"></a>
### VIS-042 – Kronenjagd

- **Spiel-ID/Kategorie:** `kronenjagd` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 8–12 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/kronenjagd/kronenjagd.css](../../public/games/kronenjagd/kronenjagd.css), [public/games/kronenjagd/kronenjagd.js](../../public/games/kronenjagd/kronenjagd.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/realtime-kit.js](../../public/games/realtime-kit.js), [public/games/realtime.css](../../public/games/realtime.css)
- **Aktueller Stand:** Gemeinsamer Canvas mit einer Krone, Figuren, Namenslabels und Haltepunktwertung.
- **Optische Verbesserungsziele:** Gemeinsame Arena ist klar, aber Kronenbesitz und Bewegung könnten in einer eigenen Welt schneller erfassbar sein.
- **Stil:** Grafische königliche Hofarena mit ruhigem dunklem Boden.
- **Hintergrund:** Zurückhaltender Palasthofrand ohne Kollisionsillusion.
- **Spielfeld:** Serverarena maßstabstreu; freie Krone und Träger deutlich voneinander unterscheiden.
- **Figuren/Karten/Objekte:** Eigenständige Krone und Figuren, eigener Rand und Nummern bleiben erkennbar.
- **Status und Aktionen:** Besitzwechsel, Schutzsekunde und Punkte nur nach bestätigtem Frame darstellen.
- **Mobil:** Große Touch-Richtungstasten; Punkte nicht über Krone oder Figuren legen.
- **Technische Grenzen:** Geschwindigkeit, Schutzzeit und Besitzwechsel bleiben serverautoritär. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Freie/getragene Krone und Schutzsekunde zeigen.
- Darstellung bleibt bei Pause und Wiederverbindung konsistent.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-043"></a>
### VIS-043 – Laser-Hüpfer

- **Spiel-ID/Kategorie:** `laser-huepfer` / Party Spiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/laser-huepfer/laser-huepfer.css](../../public/games/laser-huepfer/laser-huepfer.css), [public/games/laser-huepfer/laser-huepfer.js](../../public/games/laser-huepfer/laser-huepfer.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js), [public/games/realtime-kit.js](../../public/games/realtime-kit.js), [public/games/realtime.css](../../public/games/realtime.css)
- **Aktueller Stand:** Gemeinsame Arena mit gelber Vorwarnung, roten Lasern, Sprungzustand und Leben.
- **Optische Verbesserungsziele:** Vorwarnung ist vorhanden; arenaeigene Identität und nichtfarbliche Gefahrenmuster könnten stärker werden.
- **Stil:** Präzise futuristische Trainingsarena ohne grelles Flackern.
- **Hintergrund:** Statischer dunkler Technikraumrand, freie Gefahrenfläche.
- **Spielfeld:** Warn- und aktive Laser exakt an den gelieferten Frame-Geometrien zeichnen.
- **Figuren/Karten/Objekte:** Laser mit Muster/Strichstärke, Spielfiguren mit klarer Sprunghöhe.
- **Status und Aktionen:** Vorwarnung, aktiver Laser, Treffer und Leben klar gegeneinander absetzen.
- **Mobil:** Sprungtaste nahe Richtungspad; Warnungen bleiben neben Fingern sichtbar.
- **Technische Grenzen:** Keine neuen Warnzeiten oder Trefferzonen; Servergeometrie und Sprungdauer erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-042.

**Individuelle Akzeptanz:**

- Warnung, Laser und Sprung bei reduzierter Bewegung prüfen.
- Kein Blend-/Stroboskopeffekt und keine suggerierte sichere Zone.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-044"></a>
### VIS-044 – 6 nimmt!

- **Spiel-ID/Kategorie:** `sechs-nimmt` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 8–12 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/sechs-nimmt/sechs-nimmt.css](../../public/games/sechs-nimmt/sechs-nimmt.css), [public/games/sechs-nimmt/sechs-nimmt.js](../../public/games/sechs-nimmt/sechs-nimmt.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Vier Kartenreihen, verdeckte Auswahl und anschließende sortierte Queue.
- **Optische Verbesserungsziele:** Reihen und sechster Platz sind funktional, Hornochsenwertung und Gefahr der Aufnahme können klarer gegliedert sein.
- **Stil:** Präzise vierbahnige Kartenwerkbank mit eigenen Hornochsen-Symbolen.
- **Hintergrund:** Ruhiges dunkles Brett mit vier beschrifteten Bahnen.
- **Spielfeld:** Vier echte Reihen mit maximal fünf Karten und separat markiertem Aufnahmeplatz.
- **Figuren/Karten/Objekte:** Zahlenkarten und Hornochsen deutlich lesen; keine offiziellen Kartenmotive kopieren.
- **Status und Aktionen:** Verdeckte Wahl, Aufdecken, automatische Einordnung und Reihenwahl trennen.
- **Mobil:** Reihen horizontal innerhalb ihrer Fläche scrollen; Hand und Aufnahmewahl groß halten.
- **Technische Grenzen:** Gegnerwahl nicht vor dem Aufdecken und Einordnungsreihenfolge unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Vier volle Reihen und freiwillige Reihenaufnahme zeigen.
- Verdeckte Auswahl enthält keine fremde Kartenzahl im DOM.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-045"></a>
### VIS-045 – Monopoly Deal

- **Spiel-ID/Kategorie:** `monopoly-deal` / Kartenspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 12–18 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/monopoly-deal/cards.js](../../public/games/monopoly-deal/cards.js), [public/games/monopoly-deal/monopoly-deal.css](../../public/games/monopoly-deal/monopoly-deal.css), [public/games/monopoly-deal/monopoly-deal.js](../../public/games/monopoly-deal/monopoly-deal.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Auslagen pro Spieler mit Bank, Farbsets sowie Aktions-/Zahlungsdialogen.
- **Optische Verbesserungsziele:** Viele Besitzkarten und Zahlungswerte sind eng; die Farbsets brauchen eine klarere visuelle Priorität.
- **Stil:** Kompakter Immobilien-Kartentisch mit geordneten Besitzmappen.
- **Hintergrund:** Ruhige dunkle Schreibtischfläche, helle Grundstückskarten.
- **Spielfeld:** Bank, vollständige Sets und unvollständige Gruppen getrennt führen.
- **Figuren/Karten/Objekte:** Eigenständige Besitz-/Geld-/Aktionskarten, Werte und Setgröße klar lesen.
- **Status und Aktionen:** Miete, Gegenaktion und tatsächliche Zahlungswahl in getrennten Dialogabschnitten.
- **Mobil:** Auslagen untereinander; Zahlungssumme und Bestätigung stets im sichtbaren Dialog.
- **Technische Grenzen:** Verdeckte Hände, Just-Say-No-Kette, keine Wechselgeldregel und Quick-Variante erhalten. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, quick
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Gegenaktionskette und Zahlung ohne Wechselgeld zeigen.
- Zwei-/Drei-Set-Sieg und ausgewählte Zahlungswerte sind eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-046"></a>
### VIS-046 – Monopoly

- **Spiel-ID/Kategorie:** `monopoly` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 20–30 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/monopoly/data.js](../../public/games/monopoly/data.js), [public/games/monopoly/monopoly.css](../../public/games/monopoly/monopoly.css), [public/games/monopoly/monopoly.js](../../public/games/monopoly/monopoly.js), [public/games/monopoly/tokens.js](../../public/games/monopoly/tokens.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Bereits eigenes cremefarbenes Brett, acht SVG-Figuren, Besitzkarten, Geldscheine und Zoom.
- **Optische Verbesserungsziele:** Vorhandenes Spezialdesign ist ein guter Ausgangspunkt; Besitz, Dialoge und drei Brettvarianten sind visuell anspruchsvoll.
- **Stil:** Individuelle Stadt als hochwertiges klassisches Immobilienbrett.
- **Hintergrund:** Ruhige städtische Tischumgebung, kein Austausch der vorhandenen Stadtdateien.
- **Spielfeld:** 40-Felder-Brett und Junior-24-Felder separat verfeinern; existierenden Zoom bewahren.
- **Figuren/Karten/Objekte:** Vorhandene eigene Figuren, Scheine, Häuser und Besitzkarten konsistent schärfen.
- **Status und Aktionen:** Miete, Kauf, Auktion, Handel und Liquidation als unterschiedliche Vorgänge gestalten.
- **Mobil:** Brettverschiebung erhalten; Pflichtdialoge und Liquidation ohne horizontale Überläufe.
- **Technische Grenzen:** Feld-IDs, Grundstücke, eigene Bretter, Speed-Die und Junior-Regeln unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, speed, junior
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Classic, Tempowürfel, Junior und eigenes Brett zeigen.
- Auktions-/Zahlungsdialoge funktionieren unabhängig vom Kartenausschnitt.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-047"></a>
### VIS-047 – Spiel des Lebens

- **Spiel-ID/Kategorie:** `spiel-des-lebens` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P3; 18–27 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/spiel-des-lebens/data.js](../../public/games/spiel-des-lebens/data.js), [public/games/spiel-des-lebens/spiel-des-lebens.css](../../public/games/spiel-des-lebens/spiel-des-lebens.css), [public/games/spiel-des-lebens/spiel-des-lebens.js](../../public/games/spiel-des-lebens/spiel-des-lebens.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigene verzweigte Landschaftskarte, Autos, Drehrad und Ereignisdialoge.
- **Optische Verbesserungsziele:** Karte, Abzweige und persönliche Bilanz konkurrieren auf kleinen Displays; Material und Lebensphasen können klarer sein.
- **Stil:** Illustrierte Lebensreise als hochwertiges eigenes Panoramabrett.
- **Hintergrund:** Lokale ruhige Landschaft mit Stadt-, Familien- und Ruhestandsvierteln.
- **Spielfeld:** Vorhandene Wege/Abzweige erhalten; eigenes Auto und Stopps deutlich verorten.
- **Figuren/Karten/Objekte:** Eigene Autos, Familienplätze, Beruf-/Hauskarten und ruhiges Drehrad.
- **Status und Aktionen:** Beruf, Familie, Ereignis, Kredite und Endbilanz übersichtlich gruppieren.
- **Mobil:** Verschiebbarer Weg, eigener Standort und erforderlicher Entscheidungsdialog zuerst.
- **Technische Grenzen:** Verdeckte Lebensmomente, Drehradwerte, Schulden und Kurzvariante nicht ändern. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** classic, short
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Studien-/Berufsabzweig, Familie, Hauskauf und Ruhestand zeigen.
- Geheime Lebensmomente bleiben bis zur Wertung geheim.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-048"></a>
### VIS-048 – Hex

- **Spiel-ID/Kategorie:** `hex` / Brettspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P2; 8–12 h; individuell aufwendiges Spielfeld.
- **Frontend:** [public/games/hex/hex.css](../../public/games/hex/hex.css), [public/games/hex/hex.js](../../public/games/hex/hex.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Eigenes verschiebbares 9×9-/11×11-Sechseckbrett mit Randzielen und Gewinnpfad.
- **Optische Verbesserungsziele:** Geometrie ist bereits verbessert; Randziele, Material und Seitenwechsel können als Turnierbrett präziser werden.
- **Stil:** Reduziertes hochwertiges geometrisches Strategiespiel in Blau/Rot und Stein.
- **Hintergrund:** Ruhiger matter Turniertisch ohne Linien hinter dem Brett.
- **Spielfeld:** Tatsächliche sechseckige Nachbarschaft und beide Zielränder sichtbar erhalten.
- **Figuren/Karten/Objekte:** Kontrastreiche Steine mit Richtungssymbolen und eindeutiger Gewinnkette.
- **Status und Aktionen:** Eigene Zielrichtung und einzig mögliche Tauschentscheidung prominent zeigen.
- **Mobil:** Native Brettverschiebung erhalten; Randziele bleiben im sichtbaren Schlüssel.
- **Technische Grenzen:** 9/11-Größe, Pie-Regel, Farben und Gewinnverbindung unverändert. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Beide Größen sowie Seitenwechsel nach erstem Stein zeigen.
- Brettform und Zielfarben bleiben nach Tausch konsistent.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-049"></a>
### VIS-049 – Würfelduell

- **Spiel-ID/Kategorie:** `wuerfelduell` / Würfelspiele.
- **Implementierung / Design:** playable / **planned**.
- **Priorität / Aufwand:** P1; 3–5 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** [public/games/wuerfelduell/wuerfelduell.css](../../public/games/wuerfelduell/wuerfelduell.css), [public/games/wuerfelduell/wuerfelduell.js](../../public/games/wuerfelduell/wuerfelduell.js)
- **Gemeinsame Komponenten:** [public/core.js](../../public/core.js), [public/game-design.js](../../public/game-design.js), [public/game-design.css](../../public/game-design.css), [public/ui-theme.css](../../public/ui-theme.css), [public/style.css](../../public/style.css), [public/games/kit.js](../../public/games/kit.js)
- **Aktueller Stand:** Lebensleisten, zwei Würfelgruppen, Schadenswert und Gegnerknöpfe.
- **Optische Verbesserungsziele:** Sehr kompakte Funktionsdarstellung; Angriff/Abwehr und Druckbonus brauchen einen eigenständigen Duellplatz.
- **Stil:** Klarer kleiner Würfelduell-Tisch mit gegensätzlichen Angriffs-/Schildbereichen.
- **Hintergrund:** Ruhige dunkle Kampfarena als Tischgrafik, ohne Gewaltillustration.
- **Spielfeld:** Angreifer links, Verteidiger rechts; Schaden als bestätigtes gemeinsames Ergebnis.
- **Figuren/Karten/Objekte:** Trefferwürfel und Schildwürfel mit Symbolen, Lebensmarker und ausgeschiedene Figuren.
- **Status und Aktionen:** Aktiver Spieler, Zielwahl und Druckbonus deutlich markieren.
- **Mobil:** Würfelgruppen untereinander, große Gegnerknöpfe; Lebensleisten ohne Abschneiden.
- **Technische Grenzen:** Serverwürfel, Lebenspunkte, Druckbonus und Ausscheiden nicht verändern. Keine Spiellogik, RNG oder persistierten Daten ändern. Bestehende Varianten und Bedienwege erhalten. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001.

**Individuelle Akzeptanz:**

- Treffer, voller Block, Druckbonus und Ausscheiden darstellen.
- Alle vier Spieler und identische öffentliche Würfe bleiben lesbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-050"></a>
### VIS-050 – Omaha Hi/Lo

- **Spiel-ID/Kategorie:** `omaha-hi-lo` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 12–18 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Casino-Salon mit klar getrennter High-/Low-Wertung.
- **Hintergrund:** Ruhiger gemeinsamer Pokerraum mit eigenem Hi/Lo-Akzent.
- **Spielfeld:** Community-Board und zwei Wertungsbereiche; keine neue Tischgeometrie vor Gameplayfreigabe.
- **Figuren/Karten/Objekte:** Vier Handkarten und getrennte High-/Low-Potmarkierungen.
- **Status und Aktionen:** High, qualifiziertes Low und geteilte Pots verständlich anzeigen.
- **Mobil:** Vier Karten und zwei Wertungen vertikal lesbar.
- **Technische Grenzen:** Low-Qualifikation erst nach freigegebener Regelimplementierung spezifizieren; keine fremden Hände zeigen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-002, VIS-024; zuerst separate Gameplay-Freigabe und Implementierung von omaha-hi-lo.

**Individuelle Akzeptanz:**

- High-/Low-Aufteilung und fehlendes qualifiziertes Low unterscheidbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-051"></a>
### VIS-051 – Seven Card Stud

- **Spiel-ID/Kategorie:** `seven-card-stud` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 14–21 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eleganter privater Kartenclub für offene und verdeckte persönliche Karten.
- **Hintergrund:** Dunkles Leder und ruhiger Filz.
- **Spielfeld:** Sitzplätze mit ausreichend Raum für sieben Karten je Spieler.
- **Figuren/Karten/Objekte:** Offene Karten anders behandeln als verdeckte Rücken, ohne Werte zu verraten.
- **Status und Aktionen:** Setzrunden und sichtbare persönliche Kartenreihen klar markieren.
- **Mobil:** Persönliche Kartenreihen scrollbar, eigene Karten priorisieren.
- **Technische Grenzen:** Öffentliche/verdeckte Stud-Karten strikt nach künftigem Serverzustand trennen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-002; zuerst separate Gameplay-Freigabe und Implementierung von seven-card-stud.

**Individuelle Akzeptanz:**

- Jede offene und verdeckte Kartenphase separat erfassbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-052"></a>
### VIS-052 – Short Deck Poker

- **Spiel-ID/Kategorie:** `short-deck` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Kompakter Casino-Tisch mit eigener 36-Karten-Kennzeichnung.
- **Hintergrund:** Pokerraum mit dezentem eigenem Variantenakzent.
- **Spielfeld:** Bestehende Poker-Tischsprache erst nach implementierter Variante übernehmen.
- **Figuren/Karten/Objekte:** Reduzierter Kartensatz, klare Ränge und gleichartige verdeckte Rücken.
- **Status und Aktionen:** Variantenregeln und aktive Wertung sichtbar, ohne Regelhinweise als Ergebnis auszugeben.
- **Mobil:** Eigene Hand, Board und Setzaktion bleiben gleichzeitig bedienbar.
- **Technische Grenzen:** Sonderrangfolge und Kartensatz nicht als bloße CSS-Variante implementieren. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-002; zuerst separate Gameplay-Freigabe und Implementierung von short-deck.

**Individuelle Akzeptanz:**

- 36-Karten-Variante und besondere Wertungsfolge klar ausgewiesen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-053"></a>
### VIS-053 – Stichmeister

- **Spiel-ID/Kategorie:** `stichmeister` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 10–15 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Klassischer Ansage-Kartentisch mit Papierwertungsbogen.
- **Hintergrund:** Gedämpftes Kartentuch und schmale Messingkante.
- **Spielfeld:** Aktueller Stich im Zentrum; Ansagen und erreichte Stiche neben Spielern.
- **Figuren/Karten/Objekte:** Eigene Karten, Trumpfzeichen und Stichmarker.
- **Status und Aktionen:** Ansagephase, Bedienen und Rundenauswertung unterscheiden.
- **Mobil:** Stich und eigene Hand zuerst, Wertungsliste darunter.
- **Technische Grenzen:** Bedienpflicht und verdeckte Hände erst nach freigegebenem Gameplay integrieren. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von stichmeister.

**Individuelle Akzeptanz:**

- Ansage und tatsächlich geholte Stiche sind deutlich getrennt.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-054"></a>
### VIS-054 – Exploding-Deck

- **Spiel-ID/Kategorie:** `exploding-deck` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 11–17 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Spannungsvolles eigenes Kartenlabor mit klaren Gefahrensymbolen.
- **Hintergrund:** Dunkler Arbeitstisch mit gedämpftem Warnakzent.
- **Spielfeld:** Ziehstapel, Ablage und persönliche Schutzkarten räumlich ordnen.
- **Figuren/Karten/Objekte:** Eigene Gefahren-/Entschärfungsmotive, keine fremden Kartenillustrationen.
- **Status und Aktionen:** Ziehen, Schutzaktion und Ausscheiden klar voneinander absetzen.
- **Mobil:** Große Aktionskarten und bestätigte Entscheidungen bei wenig Platz.
- **Technische Grenzen:** Keine Information über die nächste verdeckte Karte vor der erlaubten Aufdeckung. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von exploding-deck.

**Individuelle Akzeptanz:**

- Gefahr, gültige Schutzaktion und Ausscheiden eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-055"></a>
### VIS-055 – Risiko-Würfeln

- **Spiel-ID/Kategorie:** `risiko-wuerfeln` / Würfelspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 4–6 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Ruhiger Zock-Würfeltisch mit klarer Risiko-/Sicherungsseite.
- **Hintergrund:** Dunkelgrünes Würfeltuch mit Holzrand.
- **Spielfeld:** Aktueller Wurf und gesicherte Punkte getrennt.
- **Figuren/Karten/Objekte:** Gut lesbare Würfel, Zugchips und Ergebnisplaketten.
- **Status und Aktionen:** Weiterwürfeln oder sichern als zwei gleich klare Entscheidungen.
- **Mobil:** Würfel und Entscheidung oben, Rangliste nachgeordnet.
- **Technische Grenzen:** Keine zusätzlichen Nieten-/Wertungsregeln im Design erfinden. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von risiko-wuerfeln.

**Individuelle Akzeptanz:**

- Ungesicherte und gesicherte Punkte unverwechselbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-056"></a>
### VIS-056 – Würfeljagd

- **Spiel-ID/Kategorie:** `wuerfeljagd` / Würfelspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Grafische Würfel-Challenge mit klarer Zielkombination.
- **Hintergrund:** Statische konzentrierte Spielfläche ohne flackernde Kulisse.
- **Spielfeld:** Ziel und geworfene Kombination nebeneinander.
- **Figuren/Karten/Objekte:** Würfel und Ziel-Symbole mit hoher Formunterscheidung.
- **Status und Aktionen:** Zeit, Zielwechsel und Erfolg nur gemäß implementiertem Zustand.
- **Mobil:** Ziel sichtbar halten, große Tippflächen.
- **Technische Grenzen:** Zeitfenster und Zielgenerator erst nach Gameplayfreigabe festlegen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von wuerfeljagd.

**Individuelle Akzeptanz:**

- Zielkombination bleibt während der Eingabe lesbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-057"></a>
### VIS-057 – Monsterwürfel

- **Spiel-ID/Kategorie:** `monsterwuerfel` / Würfelspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 10–15 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigenes kooperatives Monster-Abenteuer mit ruhigem Würfellager.
- **Hintergrund:** Illustriertes eigenes Lager außerhalb der Würfelfläche.
- **Spielfeld:** Gegnerkarte, Gruppenstatus und Würfelzone trennen.
- **Figuren/Karten/Objekte:** Eigene freundliche Monstersilhouetten und Symbolwürfel.
- **Status und Aktionen:** Gemeinsames Ziel, gültige Kombination und Fortschritt klar darstellen.
- **Mobil:** Gegner und aktuelle Entscheidung in einer Spalte.
- **Technische Grenzen:** Keine Fähigkeiten, Trefferchancen oder Rollen als neue Mechanik erfinden. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von monsterwuerfel.

**Individuelle Akzeptanz:**

- Kooperationsziel und individuelles Handeln gut unterscheidbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-058"></a>
### VIS-058 – Labyrinth-Brett

- **Spiel-ID/Kategorie:** `labyrinth-brett` / Brettspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 18–27 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Hochwertiges verschiebbares Labyrinth aus Stein-/Holzkacheln.
- **Hintergrund:** Ruhiger Tisch ohne scheinbar begehbare Dekoration.
- **Spielfeld:** Tatsächliche Gänge und einschiebbare Linien geometrisch exakt.
- **Figuren/Karten/Objekte:** Figuren, Schätze und Schiebepfeile klar erkennen.
- **Status und Aktionen:** Schieben und anschließendes Laufen getrennte Phasen.
- **Mobil:** Brettverschiebung mit zugänglichen alternativen Linienaktionen.
- **Technische Grenzen:** Keine zusätzliche Verbindung oder verschiebbare Reihe dekorativ suggerieren. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von labyrinth-brett.

**Individuelle Akzeptanz:**

- Schiebeeffekt und erreichbarer Weg entsprechen der freigegebenen Karte.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-059"></a>
### VIS-059 – Story-Chaos

- **Spiel-ID/Kategorie:** `story-chaos` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 5–8 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Papieratelier für eine gemeinsam wachsende Geschichte.
- **Hintergrund:** Ruhige Schreibwerkbank und lokale Papierstruktur.
- **Spielfeld:** Nur freigegebener letzter Satz und eigener Entwurf im Fokus.
- **Figuren/Karten/Objekte:** Einheitliche Textstreifen und spätere geordnete Geschichtsrollen.
- **Status und Aktionen:** Schreiben, abgegeben und gemeinsame Lesung trennen.
- **Mobil:** Lange Sätze umbrechen, Eingabetastatur und Entwurf erhalten.
- **Technische Grenzen:** Frühere verdeckte Textstufen nicht vorzeitig im DOM ablegen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von story-chaos.

**Individuelle Akzeptanz:**

- Schreibansicht verrät keine spätere oder verborgene Geschichte.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-060"></a>
### VIS-060 – Regelwahnsinn

- **Spiel-ID/Kategorie:** `regelwahnsinn` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 8–12 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Grafische Regelbühne mit auffälliger aktueller Regelkarte.
- **Hintergrund:** Statische dunkle Bühne, keine Ablenkung hinter Regelfeldern.
- **Spielfeld:** Aktive Regel, Aufgabe und sichtbare Regelhistorie getrennt.
- **Figuren/Karten/Objekte:** Eigene Symbolkarten mit gleichbleibender Regeltypografie.
- **Status und Aktionen:** Regelwechsel und korrekte aktuelle Handlung klar hervorheben.
- **Mobil:** Aktuelle Regel bleibt vor dem Aktionsbereich sichtbar.
- **Technische Grenzen:** Design darf keine zusätzlichen Regeln oder unerlaubten Vorabhinweise erzeugen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von regelwahnsinn.

**Individuelle Akzeptanz:**

- Aktuelle und abgelaufene Regeln nicht verwechselbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-061"></a>
### VIS-061 – Jäger & Schatten

- **Spiel-ID/Kategorie:** `jaeger-schatten` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 16–24 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene grafische Verfolgungsarena mit klaren Sicht-/Schattengrenzen.
- **Hintergrund:** Statische dunkle Stadt-/Hofkulisse außerhalb der Arena.
- **Spielfeld:** Tatsächliche Arena und erlaubte Sicht nur aus Serverframes.
- **Figuren/Karten/Objekte:** Unterscheidbare Jäger-/Schattenfiguren gemäß Rollenfreigabe.
- **Status und Aktionen:** Öffentliche Jagdphase, eigene Rolle und zulässiger Status.
- **Mobil:** Touch-Richtungspad ohne verdeckte Gefahrenzonen.
- **Technische Grenzen:** Keine verborgene Position über Schatten, Partikel oder Kamera verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von jaeger-schatten.

**Individuelle Akzeptanz:**

- Verborgene Spieler erzeugen keine verräterischen Effekte.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-062"></a>
### VIS-062 – Infektionsjagd

- **Spiel-ID/Kategorie:** `infektionsjagd` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 12–18 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Abstrakte farb- und symbolcodierte Fangarena.
- **Hintergrund:** Ruhiger dunkler Hintergrund ohne realistische Krankheitsdarstellung.
- **Spielfeld:** Kollisionsarena unverändert, Statuszonen nur nach Gameplaykonzept.
- **Figuren/Karten/Objekte:** Figuren mit zusätzlichem Infektionssymbol statt nur Farbwechsel.
- **Status und Aktionen:** Übertragung, aktive Phase und verbleibende Spieler klar führen.
- **Mobil:** Figurenumrisse bleiben neben Touch-Tasten erkennbar.
- **Technische Grenzen:** Übertragungen und Zeitpunkte ausschließlich aus künftigem Serverzustand. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von infektionsjagd.

**Individuelle Akzeptanz:**

- Statuswechsel bleibt auch ohne Farbwahrnehmung verständlich.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-063"></a>
### VIS-063 – Letzter Schutzplatz

- **Spiel-ID/Kategorie:** `letzter-schutzplatz` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 12–18 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Übersichtliche Rettungsarena mit deutlich markierten Schutzinseln.
- **Hintergrund:** Statische dunkle Umgebungsfläche.
- **Spielfeld:** Sichere Plätze und Gefahr nur in ihrer echten Geometrie.
- **Figuren/Karten/Objekte:** Spieler und Schutzplätze mit eindeutigen Symbolen.
- **Status und Aktionen:** Warnung, Schutzphase und Ergebnis ohne irreführenden Countdown.
- **Mobil:** Schutzplätze nicht mit großen Namenslabels überdecken.
- **Technische Grenzen:** Keine visuellen Zusatzplätze oder verlängerten Schutzzeiten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von letzter-schutzplatz.

**Individuelle Akzeptanz:**

- Schutzbereich und Gefahrenphase sind ohne Animation erkennbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-064"></a>
### VIS-064 – Kistenchaos

- **Spiel-ID/Kategorie:** `kistenchaos` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 15–23 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigener grafischer Lagerhof mit beweglichen Kisten.
- **Hintergrund:** Ruhige Werkhalle außerhalb des Kollisionsfelds.
- **Spielfeld:** Gitter, Wände und Zielzonen exakt aus dem Spielzustand.
- **Figuren/Karten/Objekte:** Kisten, Zielmarken und Figuren durch Form und Rand unterscheiden.
- **Status und Aktionen:** Eigene Zielrichtung und gültige Interaktion klar anzeigen.
- **Mobil:** Touch-Pad außerhalb wichtiger Schiebeflächen.
- **Technische Grenzen:** Dekoration darf keine kollidierende Kiste oder erreichbares Ziel imitieren. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von kistenchaos.

**Individuelle Akzeptanz:**

- Schiebekiste, feste Wand und Zielzone sofort unterscheidbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-065"></a>
### VIS-065 – Backgammon

- **Spiel-ID/Kategorie:** `backgammon` / Brettspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 18–27 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Edles klappbares Turnierbrett aus Holz und Leder.
- **Hintergrund:** Schlichte Spieltischfläche.
- **Spielfeld:** 24 Spitzen, Bar und Abtragbereich exakt nach späterer Engine.
- **Figuren/Karten/Objekte:** Steine mit Stapelzähler, zwei Würfel und eindeutige Zugmarkierung.
- **Status und Aktionen:** Würfeln, Einsetzen und Abtragen klar trennen.
- **Mobil:** Brett proportional, Stapel nicht zu winzigen Einzelsteinen verkleinern.
- **Technische Grenzen:** Zugpflichten und Regelvarianten nicht aus bekannten Fremdversionen ableiten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von backgammon.

**Individuelle Akzeptanz:**

- Bar, Stapel und Abtragen auf Handy verständlich.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-066"></a>
### VIS-066 – Scrabble

- **Spiel-ID/Kategorie:** `scrabble` / Brettspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 20–30 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene hochwertige Wortspiel-Werkbank.
- **Hintergrund:** Ruhiger Holz-/Filztisch ohne Wörter im Hintergrund.
- **Spielfeld:** 15×15-Brett mit beschrifteten Prämienfeldern nach freigegebenen Daten.
- **Figuren/Karten/Objekte:** Eigene Buchstabensteine und Wertindizes, keine Originalgrafik.
- **Status und Aktionen:** Entwurf, bestätigtes Wort und Punktvorschau klar trennen.
- **Mobil:** Verschiebbares Brett und große Buchstabenablage.
- **Technische Grenzen:** Keine Wörterbuch-/Wertungslogik in Dekoration oder Client neu erfinden. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von scrabble.

**Individuelle Akzeptanz:**

- Prämienfelder und unbestätigte Wortentwürfe eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-067"></a>
### VIS-067 – Hearts

- **Spiel-ID/Kategorie:** `hearts` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 11–17 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Klassischer Stichspiel-Salon mit ruhiger Strafpunktwertung.
- **Hintergrund:** Dunkles Kartentuch mit dezentem Herzakzent.
- **Spielfeld:** Aktueller Stich und Strafpunktleiste getrennt.
- **Figuren/Karten/Objekte:** Karten, Herz-/Pik-Dame-Hinweise und Ergebniszettel.
- **Status und Aktionen:** Kartentausch, Stichspiel und Rundenauswertung unterschiedlich zeigen.
- **Mobil:** Eigene Hand groß; Strafpunkte als kompakte Liste.
- **Technische Grenzen:** Verdeckte Hände und Tauschentscheidungen nicht vorzeitig zeigen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von hearts.

**Individuelle Akzeptanz:**

- Strafkarten und gewöhnlicher Stich klar auseinanderhalten.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-068"></a>
### VIS-068 – Five Card Draw

- **Spiel-ID/Kategorie:** `five-card-draw` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 12–18 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Privater Fünf-Karten-Pokertisch im gemeinsamen Casino-Stil.
- **Hintergrund:** Ruhiger bestehender Pokerraum mit eigener Variantenplakette.
- **Spielfeld:** Persönliche Fünferhand und Austauschzone statt Community-Board.
- **Figuren/Karten/Objekte:** Ausgewählte Tauschkarten markieren, fremde Kartenrücken gleich halten.
- **Status und Aktionen:** Setzen und einmaliger Kartentausch klar getrennte Zustände.
- **Mobil:** Fünf Handkarten lesbar mit Mehrfachauswahl.
- **Technische Grenzen:** Keine Austausch-/Deckinformationen an andere Spieler vorab ausgeben. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001, VIS-002; zuerst separate Gameplay-Freigabe und Implementierung von five-card-draw.

**Individuelle Akzeptanz:**

- Fünf Karten, Tauschwahl und Showdown ohne Community-Verwechslung.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-069"></a>
### VIS-069 – Schatzinsel

- **Spiel-ID/Kategorie:** `schatzinsel` / Brettspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 14–21 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene maritime Schatzkarte mit getrennten Inselbereichen.
- **Hintergrund:** Statische Pergamentseekarte mit eigenem Küstenentwurf.
- **Spielfeld:** Eigene Verstecke und fremde Grabungsfelder klar unterscheiden.
- **Figuren/Karten/Objekte:** Schatz-/Spaten-/Fundmarker gemäß freigegebener Information.
- **Status und Aktionen:** Verstecken, Graben und Fundauswertung als getrennte Phasen.
- **Mobil:** Inselraster verschiebbar, alternative Koordinatenwahl.
- **Technische Grenzen:** Keine gegnerischen Schätze in Texturen oder Markern vorzeitig verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von schatzinsel.

**Individuelle Akzeptanz:**

- Verdeckte Verstecke hinterlassen keine grafische Spur.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-070"></a>
### VIS-070 – Gummiband-Challenge

- **Spiel-ID/Kategorie:** `gummiband-challenge` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 8–12 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Präzise grafische Spannungsanzeige mit ruhiger Zielzone.
- **Hintergrund:** Statische Werkbank ohne schwingende Hintergrundelemente.
- **Spielfeld:** Band und Zielbereich klar von Dekoration abheben.
- **Figuren/Karten/Objekte:** Band mit lesbaren Endpunkten und zusätzlicher Zielmarkierung.
- **Status und Aktionen:** Eigene Eingabe, Zielstatus und Ergebnis sichtbar trennen.
- **Mobil:** Große Haltefläche, wichtige Anzeige nicht unter dem Finger.
- **Technische Grenzen:** Physik und Zeitmessung erst nach Gameplayfreigabe spezifizieren. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von gummiband-challenge.

**Individuelle Akzeptanz:**

- Zielzone und tatsächliche Bandlage jederzeit erkennbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-071"></a>
### VIS-071 – Geschenkfänger

- **Spiel-ID/Kategorie:** `geschenkfaenger` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Freundliche eigene Geschenkfang-Szene.
- **Hintergrund:** Ruhiger festlicher Hintergrund ohne fallende Dekoration.
- **Spielfeld:** Echte Fangfläche und Korbgrenzen unverfälscht zeigen.
- **Figuren/Karten/Objekte:** Geschenke und Gefahren mit unterschiedlichen Silhouetten.
- **Status und Aktionen:** Punkte, Fehlfang und Ende verständlich rückmelden.
- **Mobil:** Korbsteuerung im unteren Bereich, Gegenstände darüber lesbar.
- **Technische Grenzen:** Keine dekorativen Objekte wie echte Fangobjekte aussehen lassen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von geschenkfaenger.

**Individuelle Akzeptanz:**

- Geschenk und Gefahr sind ohne Farbe unterscheidbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-072"></a>
### VIS-072 – Rhythmus-Rausch

- **Spiel-ID/Kategorie:** `rhythmus-rausch` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 14–21 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Saubere grafische Taktbühne ohne Stroboskop.
- **Hintergrund:** Statischer dunkler Bühnenrand.
- **Spielfeld:** Echte Taktnoten und Trefferfenster exakt an Audiotiming koppeln.
- **Figuren/Karten/Objekte:** Klare Notensymbole und rückgemeldete Trefferqualität.
- **Status und Aktionen:** Vorbereitung, laufender Takt und Wertung getrennt.
- **Mobil:** Große Tippflächen und gut sichtbare nächste Takte.
- **Technische Grenzen:** Timingfenster, Audiofreigabe und Eingabemessung nicht durch Effekte verändern. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von rhythmus-rausch.

**Individuelle Akzeptanz:**

- Reduzierte Bewegung beeinträchtigt die Taktlesbarkeit nicht.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-073"></a>
### VIS-073 – Puzzle-Panik

- **Spiel-ID/Kategorie:** `puzzle-panik` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 7–11 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Hochwertiges eigenes Schiebepuzzle auf ruhiger Werkfläche.
- **Hintergrund:** Schlichter Puzzletisch ohne konkurrierende Kästchen.
- **Spielfeld:** Tatsächliches Schieberaster mit erkennbarer freier Zelle.
- **Figuren/Karten/Objekte:** Nummerierte Kacheln mit eindeutiger Orientierung.
- **Status und Aktionen:** Züge, Zeit und fertiges Bild voneinander trennen.
- **Mobil:** Kacheln groß halten, Raster ohne Seitenüberlauf.
- **Technische Grenzen:** Lösbarkeit, Startseed und erlaubte Schiebeschritte nicht verändern. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von puzzle-panik.

**Individuelle Akzeptanz:**

- Freies Feld und erlaubter Zug sind eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-074"></a>
### VIS-074 – Wortjagd

- **Spiel-ID/Kategorie:** `wortjagd` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Redaktionelles Buchstabenatelier mit klaren Wortpfaden.
- **Hintergrund:** Ruhiges Papier-/Filzmaterial ohne lesbare Dekowörter.
- **Spielfeld:** Echtes Buchstabenfeld und gefundene Wörter getrennt.
- **Figuren/Karten/Objekte:** Buchstabensteine mit gut sichtbarer Auswahlverbindung.
- **Status und Aktionen:** Wortentwurf, gültige Einreichung und Punktliste unterscheiden.
- **Mobil:** Große Felder und Eingabeweg für Touch sowie Tastatur.
- **Technische Grenzen:** Keine Lösungen oder Wörterbuchantworten als Deko verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von wortjagd.

**Individuelle Akzeptanz:**

- Lange Wortpfade und Wortliste auf Handy lesbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-075"></a>
### VIS-075 – Stillgestanden!

- **Spiel-ID/Kategorie:** `stillgestanden` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 10–15 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Grafische Laufbahn mit sehr eindeutiger Signalampel.
- **Hintergrund:** Statische Spielfeldkulisse ohne bewegliche Hintergrundfiguren.
- **Spielfeld:** Start, Ziel und echte Positionen maßstabstreu.
- **Figuren/Karten/Objekte:** Figuren mit klarer Stillstands-/Bewegungskontur.
- **Status und Aktionen:** Grün/Rot zusätzlich mit Symbol und Text; Strafe klar rückmelden.
- **Mobil:** Halte-/Lauftaste groß, Signal bleibt unter keinem Finger.
- **Technische Grenzen:** Öffentliche Signalwechsel nur nach Serverzustand, keine vorauseilende Animation. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von stillgestanden.

**Individuelle Akzeptanz:**

- Signal ist ohne Farbe und ohne Animation verständlich.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-076"></a>
### VIS-076 – Schatzgräber

- **Spiel-ID/Kategorie:** `schatzgraeber` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 14–21 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene freundliche Ausgrabungsarena.
- **Hintergrund:** Statische Erd-/Fundstellenkulisse außerhalb echter Grabungszellen.
- **Spielfeld:** Tatsächliche Grabungsfelder und freigegebene Funde.
- **Figuren/Karten/Objekte:** Spaten, Fund und Gefahr als unterschiedliche Symbole.
- **Status und Aktionen:** Graben, Fund, Stehlen und Ergebnis nur nach Gameplayfreigabe.
- **Mobil:** Große Zielzellen, wichtigste Gegenstände nicht unter Touch-Pad.
- **Technische Grenzen:** Verdeckte Schätze/Gefahren dürfen keine Bodentexturunterschiede auslösen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von schatzgraeber.

**Individuelle Akzeptanz:**

- Verdeckter Schatz und leeres Feld sehen vorher identisch aus.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-077"></a>
### VIS-077 – Minenlauf

- **Spiel-ID/Kategorie:** `minenlauf` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 12–18 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Klarer taktischer Zahlenpfad auf eigener Minenkarte.
- **Hintergrund:** Statisches dunkles Kartenmaterial ohne falsche Hinweiszahlen.
- **Spielfeld:** Echte aufgedeckte Zahlen, Flaggen und Weg zum Ziel exakt darstellen.
- **Figuren/Karten/Objekte:** Zahl, Flagge, Mine und Ziel durch Form unterscheiden.
- **Status und Aktionen:** Strafzeit, Wegfortschritt und Ende klar gliedern.
- **Mobil:** Raster scrollbar mit großen Auswahlzellen.
- **Technische Grenzen:** Kein Layoutmerkmal darf verdeckte Minenpositionen verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von minenlauf.

**Individuelle Akzeptanz:**

- Alternative verdeckte Minenfelder erzeugen identische öffentliche Darstellung.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-078"></a>
### VIS-078 – Labyrinth-Chaos

- **Spiel-ID/Kategorie:** `labyrinth-chaos` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 16–24 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Dynamische eigene Irrgartenarena mit sehr klaren Wandzuständen.
- **Hintergrund:** Ruhige Außenkulisse ohne scheinbare Wände.
- **Spielfeld:** Aktuelle Wände und erlaubte Öffnungen nur aus gültigem Zustand.
- **Figuren/Karten/Objekte:** Figuren und Ausgang mit stabilen Symbolen.
- **Status und Aktionen:** Wandwechsel und Wegziel zeigen, ohne nächste geheime Änderung vorwegzunehmen.
- **Mobil:** Labyrinth und Touch-Steuerung getrennt halten.
- **Technische Grenzen:** Keine Kollision, Nebelregel oder kommende Öffnung visuell erfinden. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von labyrinth-chaos.

**Individuelle Akzeptanz:**

- Wand, offene Passage und Ausgang eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-079"></a>
### VIS-079 – Schubsarena

- **Spiel-ID/Kategorie:** `schubsarena` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 15–23 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Abstrakte schrumpfende Plattform mit klarer Kante.
- **Hintergrund:** Statischer dunkler Freiraum außerhalb der Arena.
- **Spielfeld:** Tatsächliche Plattformgrenze maßstabstreu, keine zusätzliche Standfläche.
- **Figuren/Karten/Objekte:** Kontrastreiche Figuren und bestätigte Stoßrückmeldung.
- **Status und Aktionen:** Stoßbereitschaft, ausgeschieden und Finale getrennt.
- **Mobil:** Große Stoßtaste, Finger verdecken keine Plattformkante.
- **Technische Grenzen:** Keine neue Stoßreichweite, Kraft oder Abklingzeit durch Effekte suggerieren. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von schubsarena.

**Individuelle Akzeptanz:**

- Plattformkante und echte Stoßbereitschaft bleiben lesbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-080"></a>
### VIS-080 – Scheinwerfer-Flucht

- **Spiel-ID/Kategorie:** `scheinwerfer-flucht` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 16–24 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene Fluchtarena mit klaren Licht-/Dunkelzonen.
- **Hintergrund:** Dunkle ruhige Umgebung, keine blendenden Scheinwerfereffekte.
- **Spielfeld:** Freigegebener Lichtkegel und echte Fluchtwege präzise zeichnen.
- **Figuren/Karten/Objekte:** Figuren, Schlüssel und Ausgang als klar unterschiedliche Objekte.
- **Status und Aktionen:** Öffentliche Hitze, Schlüsselstatus und Ziel nur nach Spielzustand.
- **Mobil:** Kegel und Fluchtweg bleiben neben Touch-Tasten sichtbar.
- **Technische Grenzen:** Keine versteckten Spieler über Schatten/Kameraposition verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von scheinwerfer-flucht.

**Individuelle Akzeptanz:**

- Lichtgrenze ist auch ohne grelle Helligkeitswechsel erkennbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-081"></a>
### VIS-081 – Doppelagent

- **Spiel-ID/Kategorie:** `doppelagent` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Geheimer Gesprächssalon mit persönlicher Ortsakte.
- **Hintergrund:** Ruhige elegante Raumkulisse ohne Hinweise auf den geheimen Ort.
- **Spielfeld:** Persönliche Akte und öffentliche Abstimmung getrennt.
- **Figuren/Karten/Objekte:** Einheitliche Orts-/Agentenkarten, ohne verräterische Rückseiten.
- **Status und Aktionen:** Fragenrunde, Abstimmung und erlaubter letzter Rateversuch unterscheiden.
- **Mobil:** Gesprächsstatus und Ziele groß, private Akte diskret.
- **Technische Grenzen:** Geheimer Ort darf nicht in Hintergrund, Netzwerkdeko oder Alttext an den Agenten gelangen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von doppelagent.

**Individuelle Akzeptanz:**

- Agentenansicht enthält keinerlei Ortsinformation.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-082"></a>
### VIS-082 – Lügenbaron

- **Spiel-ID/Kategorie:** `luegenbaron` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 7–11 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Erzählsalon mit typografischer Geschichtenkarte.
- **Hintergrund:** Warme Papier-/Bibliothekskulisse ohne inhaltliche Hinweise.
- **Spielfeld:** Aktuelle Geschichte im Mittelpunkt, öffentliche Abstimmung darunter.
- **Figuren/Karten/Objekte:** Gleichartige Wahr-/Erfunden-Karten und späterer Beleg.
- **Status und Aktionen:** Schreiben, Lesen, Abstimmen und Aufdecken trennen.
- **Mobil:** Lange Geschichte vollständig lesbar, Abstimmung bleibt zugänglich.
- **Technische Grenzen:** Wahrheitsentscheidung und Autorwissen nicht vor der Auflösung zeigen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von luegenbaron.

**Individuelle Akzeptanz:**

- Wahre und erfundene Geschichte sehen vor der Auflösung gleich aus.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-083"></a>
### VIS-083 – Brückenroulette

- **Spiel-ID/Kategorie:** `brueckenroulette` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 7–11 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene grafische Brücke mit eindeutig getrennten Planken.
- **Hintergrund:** Ruhiger Fluss-/Abgrundrand ohne zusätzliche scheinbare Wege.
- **Spielfeld:** Drei beziehungsweise freigegebene vier Planken unverfälscht.
- **Figuren/Karten/Objekte:** Gleichartige Wahlplättchen, später klare Bruchmarkierung.
- **Status und Aktionen:** Verdeckte Wahl, gemeinsame Aufdeckung und Punktverlust trennen.
- **Mobil:** Große Plankenwahl unter oder neben einer kompakten Brücke.
- **Technische Grenzen:** Keine Besetzungsanzahl oder Zufallsentscheidung vor Auflösung verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von brueckenroulette.

**Individuelle Akzeptanz:**

- Geheime Wahlen und gleichzeitige Bruchauflösung unterscheiden.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-084"></a>
### VIS-084 – Würfel-Auktion

- **Spiel-ID/Kategorie:** `wuerfel-auktion` / Würfelspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 9–14 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Hochwertiger kleiner Auktionstisch mit Würfelpaketen.
- **Hintergrund:** Dunkler Clubraum mit ruhiger Bieterfläche.
- **Spielfeld:** Aktuelles Paket, eigenes Gebot und spätere Zuschlagskarte.
- **Figuren/Karten/Objekte:** Zwei bis fünf sichtbare Würfel und eigene Bietchips.
- **Status und Aktionen:** Bieten, Zuschlag/Gleichstand und Auswürfeln getrennt.
- **Mobil:** Gebotseingabe und Budget groß, Paket bleibt sichtbar.
- **Technische Grenzen:** Fremde Gebote nicht vor der gleichzeitigen Auflösung anzeigen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von wuerfel-auktion.

**Individuelle Akzeptanz:**

- Budget und echtes Gebot sind nicht mit vorläufiger Auswahl verwechselbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-085"></a>
### VIS-085 – Zahlenreihe

- **Spiel-ID/Kategorie:** `zahlenreihe` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 6–9 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Redaktionelles Zahlenrätsel mit ruhigen Sequenzkarten.
- **Hintergrund:** Schlichte Papierfläche ohne dekorative Zahlenfolgen.
- **Spielfeld:** Aktuelle Folge und freie Stelle klar ausrichten.
- **Figuren/Karten/Objekte:** Gleich große Zahlkarten und neutrale Antwortfläche.
- **Status und Aktionen:** Entwurf, abgegeben und richtige Fortsetzung zeitlich trennen.
- **Mobil:** Lange Zahlenfolgen umbrechen oder intern scrollen, Eingabe groß.
- **Technische Grenzen:** Keine Regel oder richtige nächste Zahl im Hintergrund/DOM vorab zeigen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von zahlenreihe.

**Individuelle Akzeptanz:**

- Zwei Lücken und lange Zahlwerte bleiben lesbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-086"></a>
### VIS-086 – Skat

- **Spiel-ID/Kategorie:** `skat` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 22–33 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Klassischer gehobener Dreierspieltisch mit Reiznotiz.
- **Hintergrund:** Dunkles Kartentuch, dezente Papierwertung.
- **Spielfeld:** Drei Plätze und aktueller Stich klar, Skat als separater verdeckter Stapel.
- **Figuren/Karten/Objekte:** 32-Karten-Blatt, eindeutiger Trumpf-/Spieltyp-Hinweis.
- **Status und Aktionen:** Reizen, Drücken, Ansagen und Stichspiel getrennt.
- **Mobil:** Eigene Hand und Stich groß, Reizverlauf kompakt.
- **Technische Grenzen:** Spielarten, Farbzwang und verdeckten Skat ausschließlich nach freigegebener Engine. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von skat.

**Individuelle Akzeptanz:**

- Reizphase und Farb-/Grand-/Null-Spielzustand eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-087"></a>
### VIS-087 – Doppelkopf

- **Spiel-ID/Kategorie:** `doppelkopf` / Kartenspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 24–36 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Vierersalon für partnerschaftliches Stichspiel.
- **Hintergrund:** Ruhige dunkelgrüne Tischfläche.
- **Spielfeld:** Vier Spielplätze, Stich und öffentliche Ansagen getrennt.
- **Figuren/Karten/Objekte:** Doppelte Karten identifizierbar für Engine, grafisch gleich; Trumpfhinweis.
- **Status und Aktionen:** Öffentliche Re/Kontra-Ansage von geheimem Parteienwissen trennen.
- **Mobil:** Zwölf eigene Karten mit stabiler Lupe/Überlappung.
- **Technische Grenzen:** Parteien, Hochzeit und Soli nicht vor ihrer regelkonformen Offenlegung verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von doppelkopf.

**Individuelle Akzeptanz:**

- Verdeckte Parteizugehörigkeit bleibt in der Gegneransicht verborgen.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-088"></a>
### VIS-088 – Schach

- **Spiel-ID/Kategorie:** `schach` / Brettspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 20–30 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Reduziertes Turnierbrett mit eigenen hochwertigen 2D-Figuren.
- **Hintergrund:** Ruhige matte Turnierfläche ohne 3D.
- **Spielfeld:** 8×8-Koordinaten, echte legale Ziele und Stellung unverändert.
- **Figuren/Karten/Objekte:** Eigene helle/dunkle Silhouetten, Umwandlungsauswahl mit Namen.
- **Status und Aktionen:** Am Zug, Schach, Matt und Remis klar unterscheiden.
- **Mobil:** Ganzes Brett einpassen; Umwandlung und Uhr nicht hinter Dock.
- **Technische Grenzen:** Keine Zug-/Schachprüfung aus Grafik ableiten; Schachuhr erst nach Gameplayfreigabe. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von schach.

**Individuelle Akzeptanz:**

- Rochade, Umwandlung und Spielende korrekt beschriftet.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-089"></a>
### VIS-089 – Städtehandel (Catan-inspiriert)

- **Spiel-ID/Kategorie:** `staedtehandel` / Brettspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 28–42 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigener Rohstoff- und Städtebauplan mit klaren Landschaften.
- **Hintergrund:** Eigenes Küsten-/Landkartenmaterial ohne Original-Catan-Grafiken.
- **Spielfeld:** Freigegebene Hex-, Kanten- und Kreuzungsgeometrie exakt übernehmen.
- **Figuren/Karten/Objekte:** Eigene Siedlungs-/Stadt-/Straßenfiguren und Rohstoffsymbole.
- **Status und Aktionen:** Würfelertrag, Handel, Bauen und öffentliche Wertung getrennt.
- **Mobil:** Karte verschiebbar; Bauziele zusätzlich als zugängliche Liste.
- **Technische Grenzen:** Verdeckte Handressourcen, Entwicklungskarten und künftiges V2-Gameplay getrennt behandeln. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von staedtehandel.

**Individuelle Akzeptanz:**

- Keine dekorative Kreuzung erscheint als legaler Bauplatz.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-090"></a>
### VIS-090 – Gebietskampf (Risiko-inspiriert)

- **Spiel-ID/Kategorie:** `gebietskampf` / Brettspiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 28–42 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene strategische Weltkarte als militärfreie abstrakte Gebietskarte.
- **Hintergrund:** Ruhiges geographisches Papiermaterial ohne fremde Originalkarte.
- **Spielfeld:** Tatsächliche Gebiete und Nachbarschaften klar markieren.
- **Figuren/Karten/Objekte:** Truppenzähler und Besitzer zusätzlich durch Muster/Nummern.
- **Status und Aktionen:** Verstärken, Angreifen, Würfelergebnis und Verschieben getrennt.
- **Mobil:** Verschiebbare Karte und alternative Gebietsliste.
- **Technische Grenzen:** Geheime Missionen nicht im DOM/Highlight verraten; V2-Spielregeln nicht vorwegimplementieren. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von gebietskampf.

**Individuelle Akzeptanz:**

- Gebietsgrenzen und echte Nachbarschaft sind eindeutig.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-091"></a>
### VIS-091 – Turmbauer

- **Spiel-ID/Kategorie:** `turmbauer` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 10–15 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Präzises eigenes Stapelatelier mit klarer Silhouette.
- **Hintergrund:** Statischer Werkstatthintergrund ohne scheinbare Baublöcke.
- **Spielfeld:** Tatsächlicher Turm, bewegter Block und gültige Auflagefläche.
- **Figuren/Karten/Objekte:** Blöcke mit klaren Außenkanten und Höhenmarken.
- **Status und Aktionen:** Tippen, gültige Landung und Endhöhe unterscheiden.
- **Mobil:** Große einzelne Eingabefläche, Turmhöhe folgt lesbar.
- **Technische Grenzen:** Bewegung/Physik und Zeitmessung nur nach freigegebener Implementierung. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von turmbauer.

**Individuelle Akzeptanz:**

- Dekoration verändert keine wahrgenommene Auflagefläche.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-092"></a>
### VIS-092 – Geschenkdiebe

- **Spiel-ID/Kategorie:** `geschenkdiebe` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 13–20 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Freundliche eigene Geschenke-Hofarena.
- **Hintergrund:** Ruhiger festlicher Außenrand ohne echte Geschenkobjekte zu imitieren.
- **Spielfeld:** Arena und freigegebene Sammel-/Diebstahlbereiche maßstabstreu.
- **Figuren/Karten/Objekte:** Eigene Geschenke, Träger und bestätigte Übergabemarker.
- **Status und Aktionen:** Besitz, Punkte und Diebstahl erst nach bestätigtem Zustand.
- **Mobil:** Touch-Steuerung außerhalb zentraler Sammelobjekte.
- **Technische Grenzen:** Keine zusätzliche Reichweite, Beute oder Begegnung durch Effekte vortäuschen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von geschenkdiebe.

**Individuelle Akzeptanz:**

- Besitzwechsel und lose Geschenke bleiben unterscheidbar.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-093"></a>
### VIS-093 – Fallenbauer

- **Spiel-ID/Kategorie:** `fallenbauer` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 18–27 h; individuell aufwendiges Spielfeld.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigenes Bau-/Parcoursatelier mit klaren Hindernissen.
- **Hintergrund:** Statische Werkstattkulisse außerhalb des Parcours.
- **Spielfeld:** Bauplätze und fertiger tatsächlicher Laufweg getrennt.
- **Figuren/Karten/Objekte:** Eigene Fallen-/Hindernissymbole mit eindeutigen Wirkflächen.
- **Status und Aktionen:** Bauen, Bereit und Durchlauf klar als Phasen markieren.
- **Mobil:** Große Auswahlpalette, alternative Positionseingabe.
- **Technische Grenzen:** Keine Falle oder Kollisionsfläche als bloß dekoratives Detail hinzufügen. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von fallenbauer.

**Individuelle Akzeptanz:**

- Bauentwurf ist von bestätigtem Hindernis erkennbar verschieden.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-094"></a>
### VIS-094 – Reaktor-Notfall

- **Spiel-ID/Kategorie:** `reaktor-notfall` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 12–18 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigener kooperativer Kontrollraum ohne reale Gefahrenanleitung.
- **Hintergrund:** Ruhige abstrakte Technikpaneele.
- **Spielfeld:** Aktuelles Rätsel und gemeinsame öffentliche Stabilität im Fokus.
- **Figuren/Karten/Objekte:** Eigene Hinweis-/Schaltkarten, Symbole zusätzlich zu Warnfarben.
- **Status und Aktionen:** Hinweis, Entscheidung und bestätigter gemeinsamer Fortschritt trennen.
- **Mobil:** Aufgaben nacheinander statt winziger Kontrollpanelmatrix.
- **Technische Grenzen:** Keine neue Rätsellösung oder geheime Hinweise in Dekoration verraten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von reaktor-notfall.

**Individuelle Akzeptanz:**

- Gruppenfortschritt und private Hinweise nur gemäß Spielzustand.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

<a id="vis-095"></a>
### VIS-095 – Bomben-Duell

- **Spiel-ID/Kategorie:** `bomben-duell` / Party Spiele.
- **Implementierung / Design:** not_implemented / **planned**.
- **Priorität / Aufwand:** after_gameplay; 18–27 h; kompakte bis mittlere Spieloberfläche.
- **Frontend:** Kein vorhandenes Spiel-Frontend; ausdrücklich keine Dateien implementiert.
- **Gemeinsame Komponenten:** Erst nach Gameplay-Implementierung auswählen.
- **Aktueller Stand:** Noch kein registriertes Spiel und kein vorhandenes Spiel-Frontend. Beschreibung und Regeln stammen ausschließlich aus games/planned.js.
- **Optische Verbesserungsziele:** Keine existierende Darstellung prüfbar. Das Konzept muss nach einer gesonderten Gameplay-Implementierung mit den tatsächlichen Zuständen abgeglichen werden.
- **Stil:** Eigene abstrakte taktische Spielarena.
- **Hintergrund:** Statischer dunkler Arenarand ohne realistische Gewalt.
- **Spielfeld:** Freigegebenes Raster, Hindernisse und echte Warn-/Wirkflächen.
- **Figuren/Karten/Objekte:** Eigene Spielfiguren, Ladungen und klare Warnsymbole.
- **Status und Aktionen:** Warnphase, Auslösung und Ausscheiden klar, ohne Flackern.
- **Mobil:** Große Bewegung-/Platzieraktionen getrennt von Arena.
- **Technische Grenzen:** Keine zusätzlichen Wirkweiten, versteckten Gegner oder veränderten Vorwarnzeiten. Erst nach ausdrücklich freigegebener und tatsächlich abgeschlossener Gameplay-Implementierung visuell umsetzen; dieses Paket implementiert kein Spiel. Weitere gemeinsame Grenzen: GAME_VISUAL_GUIDELINES.md, G01–G10.
- **Varianten:** Keine zusätzlichen registrierten Varianten.
- **Abhängigkeiten:** VIS-001; zuerst separate Gameplay-Freigabe und Implementierung von bomben-duell.

**Individuelle Akzeptanz:**

- Warnzone und bestätigte Wirkung stimmen mit Servergeometrie überein.
- Zusätzlich gelten G01–G10 aus dem Designstandard und die erforderlichen Zustands-/Größenprüfungen.

**Nachweise:** Noch keine Implementierungscommits, Testergebnisse oder Screenshots für dieses neue Paket. Erst nach tatsächlicher Umsetzung ergänzen.

## Abschluss dieses Auftrags

Der Pilot ist in [SCOTLAND_YARD_REDESIGN.md](SCOTLAND_YARD_REDESIGN.md) dokumentiert. Dieser historische zweiphasige Pilotauftrag ließ die weiteren 94 VIS-Pakete zunächst geplant. Im anschließenden ausdrücklich freigegebenen [Kartenwelten-Auftrag](CARD_WORLDS_REDESIGN.md) wurden VIS-004, VIS-009 und VIS-008 umgesetzt; aktuell bleiben 91 Pakete geplant. Kein anderes Spiel wurde in Phase 2 neu gestaltet oder implementiert. Die öffentliche Roadmap bündelt die Ankündigung, die vollständigen Einzelanforderungen bleiben hier.

### Historische Nachweise der ursprünglichen zweiphasigen Arbeit

- Scotland-Yard-Implementierungscommit: `ef6511d76f78689fc525a63f6e3637c3f14f1252`.
- Inventur: **49 spielbare Spiele + 46 nicht implementierte Spiele = 95 eindeutige VIS-Pakete**. Davon **1 done, 94 planned**; die 94 Planungen bestehen aus 48 weiteren spielbaren Spielen und 46 bedingten Backlog-Konzepten. 20 Einträge sind als individuell aufwendiges Spielfeld gekennzeichnet.
- Endgültiger Node-Gesamtlauf: **867 bestanden, 0 fehlgeschlagen**, 53,1 Sekunden. Nach letzter Ergänzung der Aufwandssortierung zusätzlich **6 Planungstests bestanden**.
- Pilotprüfung: **18 gezielte Browserfälle**, **12 abschließende Größen-/Screenshotfälle** und **27 Engine-/Geheimhaltungsfälle** erfolgreich. Sechs Vorher-/Nachher-PNGs dauerhaft im Repository; das [Manifest](scotland-yard-screenshots.json) dokumentiert 190 lokale Aufnahme-Dateien einschließlich Zwischenständen und separater Desktop-/Mobil-Nachprüfungen.
- Vollständige Browserrunde: **322 bestanden, 3 fehlgeschlagen, 1 bestehender Skip**. Die drei Fehler waren zwei veraltete generische Lobbygrafik-Erwartungen und ein zu früher Variablenzugriff im Test für langsame Skriptladung. Diese Prüfungen wurden gezielt korrigiert und danach samt neuer öffentlicher DE/EN-Roadmap auf Desktop/Handy geprüft: **6 bestanden, 0 fehlgeschlagen**. Details im [Pilotbericht](SCOTLAND_YARD_REDESIGN.md). Der ursprüngliche Gesamtlauf wird nicht als vollständig grün dargestellt.
- Keine Gameplaydatei, keine Oberfläche eines anderen Spiels und kein V2-Paket verändert. Gemeinsame Frontendänderung ausschließlich der optionale Lobby-Haken im Pilotcommit; Phase 2 ergänzt öffentliche Designmetadaten und deren Englischtexte.
- `AGENTS.md` und `CLAUDE.md` verweisen auf die JSON-Datei und verlangen die einzelne Freigabe, echte Nachweise und anschließendes Stoppen.
- Der bekannte GitHub-Workflow führt Tests und GHCR-Veröffentlichung aus. Die geprüften Repository-/Compose-Dateien weisen keinen automatischen Produktivdeploy auf; es ist keine externe Automatik bekannt. Kein manueller Produktivdeploy.

Die nächsten kleinen Kandidaten sind **VIS-027 Chicago**, **VIS-035 Tickendes Paket**, **VIS-049 Würfelduell** und **VIS-025 Würfelpoker**, jeweils grob 3–5 Stunden reine Design-/Frontendarbeit. Auch diese Pakete sind noch nicht freigegeben. Dieser Auftrag endet hier.

## Abgeschlossener Folgeauftrag: UNO, Skip-Bo und Phase 10

VIS-004, VIS-009 und VIS-008 wurden anschließend ausdrücklich gemeinsam freigegeben. Implementierungscommit: `84cccbc5795ac9b0a28c5a6723526d8d7affc2e6`. Aktueller Gesamtstand: **4 done, 91 planned** (45 weitere spielbare Spiele, 46 bedingte Konzepte). [Änderungen, tatsächliche Testergebnisse und Vorher-/Nachher-Bilder](CARD_WORLDS_REDESIGN.md). Die übrigen Pakete bleiben unverändert geplant; aus der Reihenfolge folgt keine Freigabe.

## UNO Ultimate und Spuknacht als weiterer UNO-Folgeauftrag

VIS-004 wurde anschließend allein für UNO und seine fünf Varianten überarbeitet. Spuknacht ist dauerhaft verfügbar und verwendet die Classic-Engine; Spiel-ID und Gesamtinventur bleiben unverändert. Commit: `dc2079a5862ba549cdcc9359c4a67157436ff1d9`. [Konzept, Tests, betroffene Dateien und Bilder](UNO_ULTIMATE_REDESIGN.md). Die übrigen 94 Paketeinträge sind unverändert; weiterhin 4 done und 91 planned.

## Einzelspieler-Erweiterung vom 31.10.2026

Der Gesamtbestand umfasst jetzt 52 spielbare Spiele (49 Raumspiele + 3 lokale Einzelspieler), 55 unimplementierte Spiele und 107 stabile VIS-Pakete. Einzelheiten, Abnahme und tatsächliche Abschlussstände: [Solo-Dokumentation](../solo-games/README.md) und die zentrale JSON-Datei. Die bisherigen VIS-001 bis VIS-095 werden nicht umnummeriert.

### VIS-096 – Sudoku

Spiel-ID: `sudoku` · playable · Designstatus siehe JSON.

Ruhige elfenbeinfarbene Logiktafel auf salbeigrünem Grund.

- Spielfeld: 9×9-Feld mit kräftigen 3×3-Grenzen, Peer-Markierung und ausgewählter Zelle.
- Material: Feste dunkle Vorgaben, blaue Eingaben und neun lesbare Kandidatenplätze.
- Mobil: Zahlenfeld in voller Breite, große Zifferntasten und getrennte Hilfen.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten.
- Aufwand (nur Frontend): 8–14 Stunden.
- Abnahme: Start, Spielzug, Pause, Fortsetzung und Endzustände tatsächlich auf Desktop und Smartphone prüfen. Sprache DE/EN und lokale, versionierte Spielstände ohne öffentliche Tabellen verifizieren.

### VIS-097 – 2048

Spiel-ID: `2048` · playable · Designstatus siehe JSON.

Warme bernsteinfarbene Zahlentafel mit zurückhaltenden Bewegungen.

- Spielfeld: 4×4-Brett mit festen Positionen und klarer Ein-Zug-Zusammenführung.
- Material: Wertabhängige Kacheltöne und große typografische Zahlen statt Bildtexturen.
- Mobil: Wischfläche, sichtbare Richtungstasten und getrennte Undo-/Siegaktionen.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten.
- Aufwand (nur Frontend): 6–10 Stunden.
- Abnahme: Start, Spielzug, Pause, Fortsetzung und Endzustände tatsächlich auf Desktop und Smartphone prüfen. Sprache DE/EN und lokale, versionierte Spielstände ohne öffentliche Tabellen verifizieren.

### VIS-098 – Wellenwacht

Spiel-ID: `wellenwacht` · playable · Designstatus siehe JSON.

Eigenständige grün-kupferne Landschaft aus originaler Canvas-Zeichnung.

- Spielfeld: Zwei 14×9-Karten mit lesbaren Eingängen, Basis, Felsen und aktuellen BFS-Wegen.
- Material: Vier unterschiedliche Turmsilhouetten, drei sichtbare Stufen und vier Gegnerformen.
- Mobil: Spielfeld zuerst, Bau als separate Bestätigung, optional 44-Pixel-Zoom mit internem Scrollen.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten.
- Aufwand (nur Frontend): 18–28 Stunden.
- Abnahme: Start, Spielzug, Pause, Fortsetzung und Endzustände tatsächlich auf Desktop und Smartphone prüfen. Sprache DE/EN und lokale, versionierte Spielstände ohne öffentliche Tabellen verifizieren.

### VIS-099 – Snake

Spiel-ID: `snake` · not_implemented · Designstatus siehe JSON.

Klare Leuchtspuren auf dunklem Raster.

- Spielfeld: Snake: Steuerung auf einem Raster, Wachstum und zunehmendes Tempo.
- Material: Snake: Tastatur und Wischgesten; Pause, lokaler Highscore, drei Tempostufen.
- Mobil: Snake: Touch-Steuerung passend zu steuerung auf einem raster, wachstum und zunehmendes tempo.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 6–10 Stunden.
- Abnahme: Keine rückwärtige 180°-Wende Kollisionen und reproduzierbare Nahrung getestet Desktop und Touch geprüft

### VIS-100 – Memory

Spiel-ID: `memory` · not_implemented · Designstatus siehe JSON.

Ruhige illustrierte Symbolkarten mit starken Kontrasten.

- Spielfeld: Memory: Zwei Karten aufdecken; passende Paare bleiben offen.
- Material: Memory: Drei Rastergrößen; Zugzähler und optionale Uhr; Lokale Bestleistungen.
- Mobil: Memory: Touch-Steuerung passend zu zwei karten aufdecken; passende paare bleiben offen.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 3–5 Stunden.
- Abnahme: Jedes Motiv genau zweimal Keine dritte Karte während der Aufdeckung Eigenständiges Solo-Spiel; keine gemeinsame Aufgabe wie Gedächtnisküche

### VIS-101 – Minesweeper

Spiel-ID: `minesweeper` · not_implemented · Designstatus siehe JSON.

Lesbare nummerierte Felder, eigenständige Werkstattoptik.

- Spielfeld: Minesweeper: Nachbarzahlen verraten versteckte Minen.
- Material: Minesweeper: Sicherer erster Klick; Flaggen und Aufdecken; Drei Feldgrößen.
- Mobil: Minesweeper: Touch-Steuerung passend zu nachbarzahlen verraten versteckte minen.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 6–10 Stunden.
- Abnahme: Erster Klick ist sicher Flood-Fill ohne Rekursionsüberlauf Separat von Minenlauf: private Einzelrunde statt Party-Wettlauf

### VIS-102 – Nonogramm

Spiel-ID: `nonogramm` · not_implemented · Designstatus siehe JSON.

Papierartige Logiktafel mit farbigen fertigen Motiven.

- Spielfeld: Nonogramm: Zahlenfolgen geben zusammenhängende Blöcke in Zeilen und Spalten an.
- Material: Nonogramm: 5×5 bis 15×15; Markierung leerer Felder; Undo und Hilfen.
- Mobil: Nonogramm: Touch-Steuerung passend zu zahlenfolgen geben zusammenhängende blöcke in zeilen und spalten an.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 12–20 Stunden.
- Abnahme: Zahlenhinweise korrekt erzeugt Jedes veröffentlichte Rätsel eindeutig Keine Server-Rangliste aus lokalen Saves

### VIS-103 – Sokoban

Spiel-ID: `sokoban` · not_implemented · Designstatus siehe JSON.

Eigene kleine Lagerhäuser aus lesbaren 2D-Kacheln.

- Spielfeld: Sokoban: Kisten lassen sich schieben, aber nicht ziehen.
- Material: Sokoban: Handgebaute eigene Level; Undo und Neustart; Lokaler Level-Fortschritt.
- Mobil: Sokoban: Touch-Steuerung passend zu kisten lassen sich schieben, aber nicht ziehen.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 6–10 Stunden.
- Abnahme: Keine Bewegung durch Wände oder zwei Kisten Alle Level mit Lösung nachgewiesen Undo stellt jeden Schritt exakt wieder her

### VIS-104 – Block Puzzle

Spiel-ID: `block-puzzle` · not_implemented · Designstatus siehe JSON.

Materialhafte flache Formen mit Muster zusätzlich zur Farbe.

- Spielfeld: Block Puzzle: Drei angebotene Formen auf ein Raster setzen; volle Linien verschwinden.
- Material: Block Puzzle: Drehregeln festlegen; Touch-Vorschau; Highscore und Undo.
- Mobil: Block Puzzle: Touch-Steuerung passend zu drei angebotene formen auf ein raster setzen; volle linien verschwinden.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 6–10 Stunden.
- Abnahme: Zeilen und Spalten gleichzeitig korrekt löschen Game Over erst wenn keine angebotene Form passt Puzzle-Panik bleibt eigenständiges geplantes Partyspiel

### VIS-105 – Solitaire

Spiel-ID: `solitaire` · not_implemented · Designstatus siehe JSON.

Ruhiger eigener Kartentisch, vorhandene zugängliche Kartenwerte.

- Spielfeld: Solitaire: Abwechselnde Farben absteigend, Fundamente aufsteigend.
- Material: Solitaire: Ein- und Dreikarten-Zug; Undo und Hinweis; Lokale Statistik.
- Mobil: Solitaire: Touch-Steuerung passend zu abwechselnde farben absteigend, fundamente aufsteigend.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 12–20 Stunden.
- Abnahme: Alle Karten genau einmal im Deck Nur erlaubte Teilstapel bewegen Stock/Waste und Gewinnzustand getestet

### VIS-106 – Mahjong Solitaire

Spiel-ID: `mahjong-solitaire` · not_implemented · Designstatus siehe JSON.

Deutliche flache Steinlagen mit lesbaren Symbolen.

- Spielfeld: Mahjong Solitaire: Nur oben und mindestens auf einer Seite freie Steine sind wählbar.
- Material: Mahjong Solitaire: Eigene Steinmotive; Mehrere Layouts; Undo, Hilfe und lokale Bestzeit.
- Mobil: Mahjong Solitaire: Touch-Steuerung passend zu nur oben und mindestens auf einer seite freie steine sind wählbar.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 12–20 Stunden.
- Abnahme: Überdeckte und beidseitig gesperrte Steine nicht wählbar Lösbarkeit der Startaufstellung nachgewiesen Kein traditionelles Mehrspieler-Mahjong impliziert

### VIS-107 – Match-3

Spiel-ID: `match-3` · not_implemented · Designstatus siehe JSON.

Eigenes botanisches Symbolset ohne Farbzwang.

- Spielfeld: Match-3: Gültige Tausche lösen Reihen, Nachrutschen und Kaskaden aus.
- Material: Match-3: Zugbasierte Ziele; Eigene Level; Hilfen und lokaler Fortschritt.
- Mobil: Match-3: Touch-Steuerung passend zu gültige tausche lösen reihen, nachrutschen und kaskaden aus.
- Grenzen: Lokaler Einzelspieler-Pfad ohne Socket.IO-Raum oder öffentliche Ergebnisübermittlung. Bestehende 49 Multiplayer-Spiele und ihre Persistenz bleiben erhalten. Implementierung nur nach ausdrücklicher eigener Freigabe.
- Aufwand (nur Frontend): 12–20 Stunden.
- Abnahme: Ungültiger Tausch wird zurückgesetzt Keine Endlosschleifen bei Kaskaden Mindestens ein gültiger Zug oder geregeltes Mischen
