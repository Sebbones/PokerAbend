# Sudoku – SOLO-001

Spiel-ID `sudoku`, eigener lokaler Pfad `/#solo/sudoku`. Keine Socket.IO-Ergebnisse oder Mehrspieler-Räume.

## Generator

Ein Seed bestimmt eine gültige vollständige 9×9-Tafel über zufällig permutierte Ziffern, Bänder, Zeilen, Stapel und Spalten. Anschließend werden zufällig Vorgaben entfernt. Nach jeder Entfernung zählt ein MRV-Backtracking-Solver Lösungen bis maximal zwei; nur genau eine Lösung erlaubt die Entfernung. Damit gibt es keine mehrdeutigen Aufgaben. Der Solver arbeitet auf Kopien und prüft Zeilen-, Spalten- und Blockmasken. Ein Knotenlimit begrenzt auch die Prüfung fremder/beschädigter Saves; ein abgebrochener Suchlauf gilt niemals als Eindeutigkeitsnachweis.

Die Stufen streben 42, 35, 29 beziehungsweise 25 Vorgaben an. Falls keine weitere eindeutigkeitserhaltende Entfernung gefunden wird, bleiben mehr Vorgaben bestehen. Diese Stufen sind eine einfache Vorgabenheuristik, keine garantierte Einstufung nach menschlichen Lösungstechniken. Ein tägliches Sudoku ist optionaler Zukunftsumfang und wurde nicht implementiert.

## Spielzustand und Interaktion

Vorgaben sind unveränderlich. Eingaben dürfen zwischenzeitlich falsch sein; die optionale Fehleranzeige vergleicht mit der eindeutigen Lösung und markiert Fehler zusätzlich mit einer Wellenlinie. Kandidatennotizen sind neun Bitpositionen pro Feld. Einzelne Notizen und automatisch berechnete Kandidaten stehen zur Verfügung. Ein Hint füllt ein noch falsches/leeres Feld aus und erhöht den sichtbaren Hilfezähler.

Undo/Redo speichern Werte und Notizen, jeweils höchstens 100 Schritte. Eine neue Eingabe verwirft die Redo-Zukunft. Hinweise werden beim Undo nicht aus dem Hilfezähler entfernt. Das verhindert eine irreführende Behauptung, ohne Hilfe gespielt zu haben. Uhr, Schwierigkeitsstufe, Auswahl, Notizmodus, Fehleranzeige und History werden lokal gespeichert. Verstrichene Zeit zählt nur bei sichtbarer, laufender und nicht pausierter Partie. Die Uhr arbeitet mit monotonen Zeitdifferenzen; längere Browser-Stalls werden begrenzt und nicht als versteckte Spielzeit nachgeholt.

Pfeiltasten bewegen den sichtbaren Fokus, 1–9 trägt ein, Rücktaste/Entfernen löscht. Auf Touchgeräten stehen ein großer Ziffernblock und getrennte Hilfsaktionen zur Verfügung. Vorgegebene Werte, Eingaben, Kandidaten, Auswahl und Fehler haben unterschiedliche Darstellungen. Bei Lösung wird die Uhr angehalten und ein klarer Endzustand mit Zeit und Hilfen angezeigt.

## Persistenz und Tests

Versionierte Daten werden mit `storage.js` gespeichert. Beim Laden werden 81er-Arrays, Wertebereiche, Notizmasken, Vorgabenkonsistenz, vollständige korrekte Lösung, Eindeutigkeit und History geprüft. Unbekannte History-Felder werden verworfen. Jeder geladene Spielstand beginnt pausiert.

`test/singleplayer.test.js` prüft 24 Seeds pro Stufe, Reproduzierbarkeit, Lösung, Kandidaten, feste Vorgaben, Notizen, Undo/Redo, Hilfen, Pause und beschädigte Saves. `test/ui/singleplayer.spec.js` prüft reale Eingaben, Wiederherstellung, Sieg und Sprachwechsel auf Desktop und 390×844. Weitere Endgeräte sind im Abnahmeprotokoll dokumentiert. Es gibt keine öffentliche Rangliste und keinen manipulationssicheren Leistungsnachweis aus dem Browser.
