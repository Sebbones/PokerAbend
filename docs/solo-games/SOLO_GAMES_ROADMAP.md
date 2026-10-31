# Einzelspieler – individuelle Arbeitspakete

Stand: 31.10.2026. Zentrale Laufzeitplanung: `games/planned.js`, eingebunden aus `games/singleplayer/planned.js`. Die öffentliche Roadmap verwendet dieselben Einträge. Kein paralleles Backlog.

SOLO-001 Sudoku, SOLO-002 2048 und SOLO-003 Wellenwacht werden im aktuellen Auftrag implementiert. Die folgenden neun Pakete bleiben **planned**; ihre Issues sind keine Implementierungsfreigabe.

Aufwand: S ca. 1–2, M ca. 3–5, L ca. 6–10 Entwicklungstage einschließlich Logik, UI und Tests; vor Freigabe neu schätzen. Das ist getrennt vom reinen VIS-Frontendaufwand.

Alle künftigen Pakete benötigen DE/EN, Desktop/Touch, Tastatur soweit sinnvoll, Pause, lokalen versionierten Spielstand, Regeln, reduzierte Bewegung und passende Tests. Keine öffentlichen Rankings oder Räume aus lokalen Daten.

## SOLO-004 – Snake

ID: `snake` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/5) · Aufwand: **M**.

Lenke eine Schlange, sammle Nahrung und vermeide Kollisionen.

Spielprinzip: Steuerung auf einem Raster, Wachstum und zunehmendes Tempo.

Geplante Funktionen:

- Tastatur und Wischgesten
- Pause, lokaler Highscore, drei Tempostufen

Designrichtung: Klare Leuchtspuren auf dunklem Raster.

Abhängigkeiten: Fester Simulationstakt; Lokale Spielstände.

Akzeptanzkriterien:

- [ ] Keine rückwärtige 180°-Wende
- [ ] Kollisionen und reproduzierbare Nahrung getestet
- [ ] Desktop und Touch geprüft

## SOLO-005 – Memory

ID: `memory` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/6) · Aufwand: **S**.

Finde passende Kartenpaare in deinem eigenen Tempo.

Spielprinzip: Zwei Karten aufdecken; passende Paare bleiben offen.

Geplante Funktionen:

- Drei Rastergrößen
- Zugzähler und optionale Uhr
- Lokale Bestleistungen

Designrichtung: Ruhige illustrierte Symbolkarten mit starken Kontrasten.

Abhängigkeiten: Kartenraster; Versionierte Saves.

Akzeptanzkriterien:

- [ ] Jedes Motiv genau zweimal
- [ ] Keine dritte Karte während der Aufdeckung
- [ ] Eigenständiges Solo-Spiel; keine gemeinsame Aufgabe wie Gedächtnisküche

## SOLO-006 – Minesweeper

ID: `minesweeper` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/7) · Aufwand: **M**.

Entschärfe ein Minenfeld mit Logik und Markierungen.

Spielprinzip: Nachbarzahlen verraten versteckte Minen.

Geplante Funktionen:

- Sicherer erster Klick
- Flaggen und Aufdecken
- Drei Feldgrößen

Designrichtung: Lesbare nummerierte Felder, eigenständige Werkstattoptik.

Abhängigkeiten: Seed-RNG; Raster-Flood-Fill; Touch-Markiermodus.

Akzeptanzkriterien:

- [ ] Erster Klick ist sicher
- [ ] Flood-Fill ohne Rekursionsüberlauf
- [ ] Separat von Minenlauf: private Einzelrunde statt Party-Wettlauf

## SOLO-007 – Nonogramm

ID: `nonogramm` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/8) · Aufwand: **L**.

Entschlüssle ein Pixelmotiv anhand von Zahlen am Rand.

Spielprinzip: Zahlenfolgen geben zusammenhängende Blöcke in Zeilen und Spalten an.

Geplante Funktionen:

- 5×5 bis 15×15
- Markierung leerer Felder
- Undo und Hilfen

Designrichtung: Papierartige Logiktafel mit farbigen fertigen Motiven.

Abhängigkeiten: Eindeutigkeitsprüfung; Raster-Eingabe.

Akzeptanzkriterien:

- [ ] Zahlenhinweise korrekt erzeugt
- [ ] Jedes veröffentlichte Rätsel eindeutig
- [ ] Keine Server-Rangliste aus lokalen Saves

## SOLO-008 – Sokoban

ID: `sokoban` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/9) · Aufwand: **M**.

Schiebe Kisten auf Zielmarkierungen und plane jeden Schritt.

Spielprinzip: Kisten lassen sich schieben, aber nicht ziehen.

Geplante Funktionen:

- Handgebaute eigene Level
- Undo und Neustart
- Lokaler Level-Fortschritt

Designrichtung: Eigene kleine Lagerhäuser aus lesbaren 2D-Kacheln.

Abhängigkeiten: Levelvalidator; Bewegungslogik.

Akzeptanzkriterien:

- [ ] Keine Bewegung durch Wände oder zwei Kisten
- [ ] Alle Level mit Lösung nachgewiesen
- [ ] Undo stellt jeden Schritt exakt wieder her

## SOLO-009 – Block Puzzle

ID: `block-puzzle` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/10) · Aufwand: **M**.

Setze Formen ein und räume vollständige Reihen ab.

Spielprinzip: Drei angebotene Formen auf ein Raster setzen; volle Linien verschwinden.

Geplante Funktionen:

- Drehregeln festlegen
- Touch-Vorschau
- Highscore und Undo

Designrichtung: Materialhafte flache Formen mit Muster zusätzlich zur Farbe.

Abhängigkeiten: Formenkatalog; Platzierungsvorschau.

Akzeptanzkriterien:

- [ ] Zeilen und Spalten gleichzeitig korrekt löschen
- [ ] Game Over erst wenn keine angebotene Form passt
- [ ] Puzzle-Panik bleibt eigenständiges geplantes Partyspiel

## SOLO-010 – Solitaire

ID: `solitaire` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/11) · Aufwand: **L**.

Ordne ein Kartendeck im klassischen Klondike-Solospiel.

Spielprinzip: Abwechselnde Farben absteigend, Fundamente aufsteigend.

Geplante Funktionen:

- Ein- und Dreikarten-Zug
- Undo und Hinweis
- Lokale Statistik

Designrichtung: Ruhiger eigener Kartentisch, vorhandene zugängliche Kartenwerte.

Abhängigkeiten: Vorhandene Kartenbausteine; Klondike-Regelmodell.

Akzeptanzkriterien:

- [ ] Alle Karten genau einmal im Deck
- [ ] Nur erlaubte Teilstapel bewegen
- [ ] Stock/Waste und Gewinnzustand getestet

## SOLO-011 – Mahjong Solitaire

ID: `mahjong-solitaire` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/12) · Aufwand: **L**.

Entferne freie gleiche Steinpaare in eigenen Anordnungen.

Spielprinzip: Nur oben und mindestens auf einer Seite freie Steine sind wählbar.

Geplante Funktionen:

- Eigene Steinmotive
- Mehrere Layouts
- Undo, Hilfe und lokale Bestzeit

Designrichtung: Deutliche flache Steinlagen mit lesbaren Symbolen.

Abhängigkeiten: Schicht-/Freiheitsmodell; Lösbare Layoutgenerierung.

Akzeptanzkriterien:

- [ ] Überdeckte und beidseitig gesperrte Steine nicht wählbar
- [ ] Lösbarkeit der Startaufstellung nachgewiesen
- [ ] Kein traditionelles Mehrspieler-Mahjong impliziert

## SOLO-012 – Match-3

ID: `match-3` · Status: **planned** · [GitHub-Issue](https://github.com/TTLPSCWA/PokerAbend/issues/13) · Aufwand: **L**.

Tausche benachbarte Symbole und bilde Dreierreihen.

Spielprinzip: Gültige Tausche lösen Reihen, Nachrutschen und Kaskaden aus.

Geplante Funktionen:

- Zugbasierte Ziele
- Eigene Level
- Hilfen und lokaler Fortschritt

Designrichtung: Eigenes botanisches Symbolset ohne Farbzwang.

Abhängigkeiten: Raster-RNG; Kaskaden-Zustandsmaschine.

Akzeptanzkriterien:

- [ ] Ungültiger Tausch wird zurückgesetzt
- [ ] Keine Endlosschleifen bei Kaskaden
- [ ] Mindestens ein gültiger Zug oder geregeltes Mischen

## Abgrenzung zum Bestand

- **Minenlauf** bleibt das vorhandene geplante Partyspiel. Minesweeper ist ein privates, allein spielbares Minenfeld ohne gemeinsamen Wettlauf.
- **Puzzle-Panik** bleibt das geplante Partyspiel; Block Puzzle ist eine eigenständige lokale Platzierungsaufgabe. Nonogramm und Sokoban haben ebenfalls eigene Regeln und IDs.
- **Monsterwürfel** bleibt im bisherigen Backlog; keine Umwidmung oder doppelte Registrierung.
- **Gedächtnisküche** bleibt der vorhandene Mehrspieler-Wettbewerb mit gemeinsamer Aufgabe. Memory verwendet private Paarsuche ohne gemeinsamen Seed oder Ergebnisvergleich.

Die neun Konzepte erscheinen ausschließlich in der Roadmap. Die spielbare Bibliothek erhält keine Platzhalter-Startknöpfe.
