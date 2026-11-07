# Solo-Paket B – Block Puzzle, Solitaire, Mahjong Solitaire, Match-3

Umgesetzt nach ausdrücklicher Freigabe (SOLO-009 bis SOLO-012). Gleiche Regeln wie Paket A: rein lokal (kein Raum, keine Socket-Ereignisse, keine öffentliche Rangliste), Spielstand und Bestwerte nur in diesem Browser, Pause beim Verlassen oder im Hintergrund, defekte oder unbekannte Speicherstände werden erkannt und nie überschrieben, bis bewusst ein neues Spiel startet. Deutsch und Englisch, Regeln im Spiel.

Dateien: Logik `public/singleplayer/{blockpuzzle,solitaire,mahjong,match3}-logic.js` (rein, in Node testbar), Oberfläche `puzzles-runtime.js` + `puzzles.css`, eigene Zeichnungen `puzzle-art.js`, Katalog `games/singleplayer/collection.js`.

## Block Puzzle
Drei Formen aus einer eigenen Liste (24 Formen, ohne Drehung – Entscheidung zur Drehregel) auf ein Raster setzen; volle Reihen und Spalten verschwinden gleichzeitig. Punkte: gesetzte Felder + 10 × Linien² + 5 × Serie. Ende erst, wenn keine der angebotenen Formen mehr passt. Rückgängig (30 Schritte), Tipp, Highscore je Stufe (leicht 10×10 kleine Formen, mittel 10×10, schwer 8×8 mit großen Formen). Maus: Vorschau folgt dem Zeiger; Touch: erst antippen (Vorschau), dasselbe Feld nochmals zum Setzen; Tastatur 1–3, Pfeile, Enter, Z, H, P.

## Solitaire (Klondike)
Leicht: eine Karte ziehen; mittel: drei Karten; schwer: drei Karten, drei Durchgänge durch den Vorrat. Folgen bewegen, König auf leere Reihe, Fundamente je Farbe. Rückgängig (80 Schritte), Tipp (nennt nur erlaubte Züge), Doppelklick/Doppeltipp legt auf das Fundament, am Ende (alles aufgedeckt, Vorrat leer) wird automatisch abgelegt. Bestzeit und wenigste Züge je Stufe. Karten über die vorhandene Kartenwelt (`deckCard`, französisch oder deutsch). Nicht jede Austeilung ist gewinnbar (wie beim echten Klondike).

## Mahjong Solitaire
18 eigene Steinmotive (SVG, nur an der Form unterscheidbar), drei eigene Anordnungen (Pyramide 36, Brücke 62, Turm 96 Steine). **Alle Anordnungen sind beim Start lösbar:** Die Belegung entsteht rückwärts (immer zwei gerade freie Plätze bekommen ein Paar, und es muss danach noch mindestens zwei freie Steine geben); der Test spielt die Erzeugungsreihenfolge bis zum Sieg. Frei = nichts liegt darauf und links oder rechts fehlt ein Stein. Tipp (zählt für den Bestzeit-Eintrag), Rückgängig, Mischen. Bei einer Sackgasse wird automatisch neu gemischt (Belegung der Reststeine wieder rückwärts erzeugt, also weiter lösbar); lässt sich die Form nicht mehr abbauen, endet das Spiel und Rückgängig hilft.

## Match-3
Eigener Pflanzensatz (Blatt, Blüte, Eichel, Beere, Pilz, Spross; unterscheidbar an der Silhouette), 8×8, neun eigene Level (je drei pro Stufe) mit Zugvorrat und Zielpunkten. Tausch per Tippen, Wischen oder Tastatur; ein Tausch ohne Reihe wird zurückgenommen und kostet keinen Zug. Kaskaden werden bis zum ruhigen Brett aufgelöst (Obergrenze 40 Schritte), Punkte wachsen mit der Kette. Gibt es keinen Zug mehr, wird das Brett neu gemischt. Tipp, Bestpunkte je Level, Level-Abschluss.

## Eigenständigkeit
Keine Namen, Logos, Figuren oder Bilder bekannter Spiele; alle Formen, Level, Layouts und Zeichnungen sind eigen. Die geplanten Pakete SOLO-009 bis SOLO-012 sind damit abgeschlossen; es bleibt kein geplanter Solo-Eintrag.
