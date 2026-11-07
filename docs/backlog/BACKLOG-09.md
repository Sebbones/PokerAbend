# BACKLOG-09 – Schubsarena, Scheinwerfer-Flucht, Minenlauf und Labyrinth-Chaos

Umgesetzt am 07.11.2026 direkt auf `main`. Spielcode: `0051919ff99023bb0f4869e4e9d25f02b5574b9c`; geprüfter Protokoll-/Darstellungsnachlauf: `768abf69903dda45e372fb8b042abaf719963155`. Die gemeinsame Registrierung war im parallelen B08-Commit `da5befa00c4fd5d80ac0f7d25e9a3ca98963a873` bereits enthalten; die eigentlichen vier Spielmodule stehen im eigenen Feature-Commit. Keine V2-Pakete. Nach diesem Auftrag stoppen.

Fortschritt der historischen Rubrik: **31 von 41 verifiziert, 10 offen**. Gesamtbestand: 85 Raumspiele und 12 lokale Einzelspieler. Die stabilen IDs VIS-077 bis VIS-080 bleiben erhalten. Andere parallele Spielweltänderungen und die ausdrücklich getrennten V2-06-Rücknahmen wurden nicht in die eigenen Commits übernommen.

## Regeln und Entscheidungen

**Schubsarena (2–8):** Kreisplattform, gleichzeitige Bewegung, nach vorne gerichteter Stoß mit 84 Einheiten Reichweite und 1,1 Sekunden Aufladung. Der Server berechnet Richtung, normalisierte Geschwindigkeit, symmetrische Körperkontakte, Impuls und das Schrumpfen von Radius 260 bis 65. Mittelpunkt außerhalb der Plattform: ausgeschieden. Nur die allein letzte Person gewinnt (100 Punkte); gleichzeitiges letztes Fallen oder mehrere Überlebende bei Zeitablauf ergeben ein Remis ohne Gewinner. Optionen: 10–180 Sekunden, Eis und zunehmende Stoß-Kraft.

**Scheinwerfer-Flucht (2–8):** Wanderndes Licht, Hitze +55/s im Licht und −35/s im Dunkeln, Ausscheiden bei 100. Acht Schlüsselstellen auf dem Lichtweg; nur aktuell beleuchtete Stellen sind sammelbar. Jede Person sammelt jede Stelle einmal, andere können ihr keine Stelle wegnehmen. Standard zwei Schlüssel, wählbar eins bis drei. Erster Ausgang rechts mit genügend Schlüsseln gewinnt, Ankünfte im selben Serverschritt teilen den Sieg. Ohne Flucht kein Gewinner; 100 je Schlüssel, 1000 Fluchtbonus. Optionen: Spielzeit, zwei Lichter und Beschleunigung.

**Minenlauf (2–8):** Identisches verborgenes 11×7-Feld auf dem Server, eigener Fortschritt pro Person. Alle starten links in der Mitte. Waagerechte/senkrechte Nachbarschritte; sichere Felder zählen die Minen in acht Nachbarfeldern. Jede linke Startposition hat einen sicheren Weg nach rechts. Eine Mine lässt die Figur stehen und addiert einmalig 1–10 Strafsekunden (Standard drei) zur Zielzeit; keine zusätzliche Strafpause derselben Länge. Bekannte Minen können nicht erneut Fehler erzeugen. Bis alle fertig sind oder die Uhr endet wird weitergespielt: niedrigste Zielzeit plus Strafen, dann geringste Fehlerzahl gewinnt. Nicht Angekommene gewinnen nicht. Platzierungspunkte ab Spielerzahl × 100, je Rang 100 weniger; gleiche Zeit und Fehler teilen einen Rang. Optional Flaggen und mehr Minen. Die Garantie betrifft einen begehbaren sicheren Weg; sie behauptet keine vollständig ohne Raten deduzierbare Minesweeper-Aufgabe.

**Labyrinth-Chaos (2–8):** Gemeinsames zufälliges Labyrinth, oben links nach unten rechts, orthogonale Nachbarschritte. Ein zufällig erzeugter Spannbaum bleibt vollständig offen; nur zusätzliche Verbindungen wechseln. Damit bleiben alle Zellen in jeder möglichen Schaltkonfiguration verbunden, und eine Wand kann niemanden einschließen. 2–5 Durchgänge (Standard drei), beginnend 11×7, jeweils zwei Zeilen/Spalten mehr. Platzierungspunkte ab Spielerzahl × 100, danach je Rang 100 weniger, simultane Ankünfte teilen den Rang; nicht Angekommene null. Zwei Sekunden gemeinsamer Übergang, Gesamtpunkte entscheiden. Einstellbare Durchgangszeit und Wandwechsel. Die ursprünglichen Vorschläge „Nebel“ und „Schlüssel einsammeln“ bleiben dokumentierte optionale Hausregelideen und gehören nicht zu den Standardregeln.

## Integration, Eingaben und Datenschutz

Die gemeinsame `ExpeditionRoom` erbt von **RealtimeRoom**. Wiederverwendet werden RoomClock, feste 50-ms-Serverschritte, 100-ms-Frames, Input-TTL, Sequenzen, Raum-Spieler-IDs, Hostrechte, Pause, Reconnect, Ergebnisablage und Bot-Ausschlüsse für Bestenliste/Erfolge/Presence. Es entstehen keine eigene Identität, kein Buildsystem und keine Demo-Seite.

Clientkoordinaten, Zeitbehauptungen, Kräfte, Fehlerzahlen oder angebliche Schlüssel werden nicht als Spielzustand übernommen. Erlaubt sind Richtungsabsichten und geprüfte Einzelaktionen mit Rundenschlüssel und eigener Sequenz. Wände und benachbarte Felder prüft der Server; alte Runden, Wiederholungen, Zuschaueraktionen, Sprünge und unzulässige Werte werden abgewiesen. Die Aktionsbestätigung nennt den tatsächlichen Server-Tick, damit ein Client neue Frames von vor der Aktion entstandenen Frames unterscheiden kann.

Minen, Zufallszustand und vollständige Zahlenkarte bleiben auf dem Server. Persönliche Frames enthalten nur eigene aufgedeckte Zahlen und Flaggen. Zuschauer bekommen keine Zahlenkarte. Andere Personen sehen öffentliche Positionen/Fehler, nicht fremde Entdeckungen oder Flaggen. Der Test verändert unbekannte Minen und prüft identische Botentscheidungen; Bots verwenden ausschließlich sichtbare Hinweise, aktuelle Wände, Licht und eigene Werte.

Alle vier Spiele haben optionale Testrunden-Bots mit einer ehrlichen Standardstufe („Nur eine Stufe verfügbar“). Es werden keine neuen V2-16-Stufen oder Gewinnquoten behauptet. Ein aktiver Ausstieg bricht ohne erfundene Wertung ab. Ein Browser-Reload erhält im laufenden Server dieselbe Figur, Uhr, Hinweise und Durchgang. Ein echter Verbindungsabbruch stoppt gehaltene Richtungen; nach dem Wiederverbinden ist eine neue Eingabe nötig. Serverneustarts verwenden die vorhandene Wiederherstellung zwischen Runden, keinen behaupteten Live-Snapshot dieser Arenen.

## Spielwelten und Bedienung

Eigene zweisprachige SVG-/Canvas-/CSS-Welten: Kupferring, Nachtausgang, Zahlenfurt und Wandwerk. Die bestehenden selbst gezeichneten Bibliotheksglyphen bleiben die Icons. Keine fremden Bilder, Logos oder 3D-Funktionen.

Tastatur: Pfeile/WASD, Stoß über Leertaste. Freie Arenen: virtueller Touch-Stick und Stoßknopf. Raster: benachbarte Zelle antippen oder Richtung halten, optional Flaggenmodus. Zoom vergrößert die Darstellung intern; der Seitenrahmen bleibt ohne horizontalen Überlauf. Zahlen stehen oberhalb kleiner Marker und werden nicht von Spielfiguren verdeckt. Zoom- und Flaggenzustände sind sichtbar und über `aria-pressed` bezeichnet.

## Tatsächliche Prüfungen

- **65 gezielte Node-Tests bestanden**, davon 17 neue Regel-/Protokolltests. 2.000 normale/dichte Minenfelder mit sicheren Wegen ab jeder linken Startzelle; 400 wachsende Labyrinthe in acht Schaltphasen, vollständige Erreichbarkeit aller Zellen; unabhängige Referenzgeometrie. 200 vollständige Botpartien über alle Spielerzahlen. Sieg/Remis, Punkte, Hitze/Schlüssel, Stoßrichtung/Aufladung, Fehlzeit, Wandwechsel, Privatansichten und Replay-/Pausenschutz sind geprüft.
- **10 vollständige Desktop-/Mobilfälle bestanden:** drei Kontexte, eigene Lobby und Szene, DE/EN-Regeln, tatsächliche Tasten-/Stick-/Tippaktionen, private Mine-/Flaggensicht, Pause/Reload, zwei wachsende Labyrinth-Durchgänge, reguläre Ergebnisse sowie echter Socket-Abbruch bei gehaltenem Stick/gedrückter Taste.
- **4 weitere Desktop-/Mobilfälle bestanden:** Zoom/Flaggenzustände, sichtbare Hinweis-/Markertrennung und sechs Bildschirmgrößen.
- **16 bestehende Arena-/PartyRoom-Browserfälle bestanden** im gemischten 24er-Lauf. Dieser Lauf hatte zusätzlich zwei fehlgeschlagene neue Minenlauf-Testtreiber; er wird nicht als vollständig grün ausgegeben.

Vollständiger isolierter Node-Lauf: **1555 bestanden, 0 fehlgeschlagen, 3 übersprungen**, 230.597 s. Die drei bestehenden Restore-Shelltests benötigen Bash und werden unter Windows ausgelassen. Protokoll: `artifacts/backlog09-full-node.log`.

Bildschirmgrößen: 1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450. 86 ausgewählte unveränderte Originalbilder mit SHA-256 liegen dauerhaft unter `docs/backlog/screenshots/backlog09/`. Normale Spielabläufe und die gesonderte Kontrollprüfung können unterschiedliche zufällige Testrunden zeigen. Die frühen Zoom-Aufnahmen mit falscher Buttonanzeige wurden nicht ausgewählt. Quellhashes verwenden UTF-8 mit LF-Zeilenenden.

Manifeste: [Schubsarena](../../games/schubsarena/evidence.json), [Scheinwerfer-Flucht](../../games/scheinwerfer-flucht/evidence.json), [Minenlauf](../../games/minenlauf/evidence.json), [Labyrinth-Chaos](../../games/labyrinth-chaos/evidence.json). Maschinenlesbarer Fortschritt: [plan.json](plan.json).

### Fehler und Nachläufe

Der erste Browserlauf bestand sechs Fälle; zwei Desktop-Zoomfälle scheiterten, weil ein breites Feld noch nicht relativ vergrößert wurde. Danach bestanden im gemischten Lauf 22 von 24 Fällen; beide Minenlauf-Testtreiber schickten auf Grundlage veralteter Frames einen nicht mehr benachbarten Schritt. Der Server wies dies korrekt ab. Die Synchronisierung wartet jetzt auf die bestätigte Server-Ticknummer. Ein weiterer 10er-Lauf bestand neun Fälle; die kurze mobile Schubsrunde war vor der Pause regulär zu Ende. Die Pause-/Reloadprüfung erfolgt nun vor einer kurz gehaltenen Bewegung zur Plattformmitte. Der endgültige 10er-Lauf und die vier Kontrollfälle sind grün.

Die Sichtprüfung fand außerdem von großen Figuren verdeckte Minenhinweise; kleinere Marker und getrennte Zahlenpositionen beheben das. Zoom-/Flaggenschalter aktualisieren ihren sichtbaren und zugänglichen Zustand unmittelbar. Frühere und fehlgeschlagene Läufe bleiben im Paketverlauf getrennt dokumentiert. Kein vollständiger Playwright-Gesamtlauf wird behauptet.

Der erste vollständige Node-Lauf hatte 1.558 Fälle: 1.554 bestanden, einen Fehler und drei übersprungene Bash-Fälle (218,116 s). Der alte Solo-Katalogtest erwartete Minenlauf noch als geplantes Spiel. Er prüft jetzt ausdrücklich den vorhandenen Server-Raum und die Trennung vom lokalen Minesweeper. Protokoll: `artifacts/backlog09-full-node-first.log`. Der vollständige Nachlauf prüft die unveränderte Spielimplementierung bei `768abf6` einschließlich dieser Katalogtestkorrektur und der eigenen Nachweise. Die tatsächlichen Endzahlen stehen oben.

Es wurden keine Secrets, Produktionsdaten oder Serverkonfigurationen geändert. Ein Push kann die vorhandene Test-/GHCR-Automatik starten; ein Produktivserver wurde nicht aktualisiert. Nach BACKLOG-09 endet dieser Auftrag.
