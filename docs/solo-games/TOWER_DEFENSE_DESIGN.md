# Wellenwacht – SOLO-003

Eigenständiges 2D-Spiel im Genre Tower Defense; keine Karten, Namen, Figuren oder Assets von Fieldrunners übernommen. Technische ID `wellenwacht`, Einstieg `/#solo/wellenwacht`.

## Spielfeld und Wegfindung

**Kupferwiesen** hat einen westlichen Eingang; **Zwillingsdelta** hat zwei Eingänge. Beide eigenen Karten bestehen aus 14×9 Feldern mit frei bebaubarem Gelände, festen Felsinseln und einer Basis im Osten.

Reverse Breadth-First Search läuft von der Basis über vier orthogonale Nachbarn und berechnet die Entfernung jedes freien Feldes zur Basis. Auf diesem Raster haben alle Kanten dieselben Kosten; BFS liefert deshalb ebenso wie korrekt parametrisiertes A* einen kürzesten Weg. Ein einzelnes Entfernungsfeld kann von allen Gegnern genutzt werden. Aufwand pro Neubewertung: O(Felder + Nachbarschaften), hier maximal 126 Felder. Für die kleine Karte wird das Feld während aktiver Simulation erneut berechnet; kein pro Gegner gestarteter Suchlauf.

Ein Bau wird erst nach vollständiger Prüfung verrechnet. Nicht bebaubar sind Felsen, Basis, Eingänge, bestehende Türme, das aktuelle Gegnerfeld und sein bereits reserviertes nächstes Feld. Eine Probe-BFS mit dem zusätzlichen Turm muss alle Eingänge und alle aktuellen/reservierten Gegnerpositionen erreichen. Andernfalls bleiben Geld und Türme unverändert. Verkauf öffnet Wege erneut.

Ein Gegner beendet zunächst die bereits begonnene Kante. Am nächsten Zellzentrum wählt er anhand des neuen Entfernungsfeldes einen Nachbarn mit genau einer kleineren Distanz. Dadurch läuft er weder durch einen neuen Turm noch springt er zwischen Wegen. Bei unverändertem Gelände fällt die Distanz streng; zusätzlich begrenzt die Bewegungsschleife ihre Iterationen. Kollision bedeutet hier Rasterbelegung und Reservierung, keine physikalischen Körper. Gegner dürfen dieselbe Route gemeinsam verwenden.

## Türme und Gegner

| Turm | Kosten | Grundreichweite | Wirkung |
| --- | --- | --- | --- |
| Nadelwerk | 45 | 3,0 | Schnell, 10 Einzelschaden je 0,6 s |
| Glutkessel | 80 | 3,2 | 28 Flächenschaden im Radius 1,2 je 1,35 s |
| Raureif | 65 | 2,8 | 5 Schaden, 50 % Verlangsamung für 1,6 s |
| Funkenmast | 100 | 3,1 | 19 Schaden, bis zu drei Kettenziele mit 70 % Folgeschaden |

Jeder Turm hat drei Stufen, also zwei kaufbare Upgrades. Sie erhöhen Reichweite und Schaden und verkürzen die Schussintervalle. Upgrades kosten 80 % und 120 % des Grundpreises; Verkauf gibt abgerundet 65 % des insgesamt investierten Geldes zurück. Visuelle Basen, Rohre, Froststern/Funkenform und Stufenstriche sind eigene Canvas-Zeichnungen.

Kriecher sind ausgeglichen, Flitzer schnell und schwach, Panzerlinge langsam und robust, Schwärmer klein und leicht. Formen, Farben und Lebensbalken unterscheiden sie. Leben wachsen pro Welle; die Schwierigkeit verändert Gegnerleben sowie Startgeld und Basisleben. Getroffene Ziele werden zuerst nach verbleibendem Weg zur Basis und dann stabil nach ID gewählt. Treffer wirken direkt im Simulationstakt; Projektile/Blitze sind kurzlebige visuelle Effekte. Türme feuern nicht durch eine zusätzliche Sichtlinienmechanik; ihre angegebene Reichweite ist entscheidend.

## Ablauf, Zeit und Lebenszyklus

Zwölf manuell gestartete Wellen mit bis zu 30 Gegnern. Abschüsse und überstandene Wellen geben Geld. Zwischen den Wellen kann ohne Zeitdruck umgebaut werden. Null Basisleben bedeutet Niederlage; die vollständig überstandene zwölfte Welle bedeutet Sieg. Drei Schwierigkeiten und 1×/2×-Geschwindigkeit sind verfügbar. Neustart wählt Karte und Schwierigkeit neu; der alte Stand bleibt bis zur Bestätigung erhalten.

Der reine Spielkern läuft in festen 50-ms-Schritten mit Restzeitakkumulator. 2× multipliziert die Spielzeit. Browserframes sind lediglich Zeitlieferant und Darstellung; ein Frame-Stall wird auf 250 ms begrenzt. Versteckte Tabs pausieren, statt mehrere Minuten nachzusimulieren. Die RAF-Schleife existiert ausschließlich während einer sichtbaren aktiven Welle. Bei Pause, Seitenwechsel oder Ende werden Frames beendet; Listener und ResizeObserver werden bei Entladen der Ansicht entfernt.

Saves enthalten ausschließlich bounded game state, keine Renderressourcen. Wiederherstellung prüft Türme, Koordinaten, Karten, Ziele, Geld, Gegnerwerte, IDs, Reservierungen, Wellenqueue und Erreichbarkeit. Wiederhergestellte Partien starten immer pausiert. Die gespeicherten Projektil-Effekte werden nicht wieder aufgenommen; das hat keinen Einfluss auf Treffer.

## Bedienung, Abnahme und Grenzen

Feld auswählen, Turmart wählen und Bau bestätigen. Verbesserungen und Verkauf sind getrennte Aktionen. Tastatur und zugängliche DOM-Feldnamen liegen über dem Canvas. Mobil sind Karte und Shop untereinander; eine optionale Zoomansicht macht Rasterzellen 44 Pixel groß und scrollt nur innerhalb der Spielfläche. Reduzierte Bewegung unterdrückt die kurzen Treffer-/Blitzeffekte; Gegnerbewegung bleibt als notwendige Spielinformation sichtbar.

Automatisierte Tests prüfen Kauf, Fehlplatzierung, Blockierung des letzten Wegs, Gegnerreservierung, Wegänderung, Schaden, Frost, Flächen-/Ketteneffekte, Upgrade, Verkauf, Wellenstart/-ende, Sieg, Niederlage, Pause, 2×, 10-Hz-/60-Hz-Äquivalenz, Neustart und Save. Playwright ergänzt Desktop/Touch, beide Karten, echte Aktionen, Fortsetzung und Screenshots. Abschlusszahlen stehen im Abnahmeprotokoll.

Bewusst begrenzter Umfang: keine 3D-Engine, keine Originalassets, kein Audio, kein Karteneditor, keine fliegenden Gegner, kein synchroner Mehrspieler, keine öffentliche Rangliste. Weitere Karten, statistische Balanceanalyse und Spezialfähigkeiten benötigen einen Folgeauftrag.
