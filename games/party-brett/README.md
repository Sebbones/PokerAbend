# Party-Extras / VIS-108

Freigabe: `party-brett`, `modifikatoren`, `chaos-modus`, `survival-abend`, einschließlich der ausdrücklich nachgefragten Integrationsstellen. Keine zusätzlichen Spiele oder V2-Pakete. Implementierung direkt auf `main`; kein Produktivdeployment.

## Bedienung und tatsächliche Regeln

Host → **Abendprogramm planen** → **Party-Brett** oder **Survival-Abend**. Bestehende Räume, Raumcodes, Spieler-IDs, Tokens und Minispiel-Oberflächen werden weiterverwendet. In beiden neuen Formaten spielen 2–12 Personen; die Auswahl muss zu allen Startteilnehmern passen. Bots werden durch die vorhandene Unterstützung des ausgewählten Minispiels geprüft.

**Party-Brett / Laternenpfad:** Der Host wählt einen Pool von 1–12 Partyspielen und 2–12 maximale Brett-Runden. Ein serverseitiger Würfel bewegt einen gemeinsamen Aufgaben-Marker 1–6 Felder; dessen Feld wählt zyklisch aus dem Pool ein echtes Minispiel. Nach dessen Abschluss erhalten die Teilnehmenden die vorhandenen Platzierungspunkte (N bis 1, Gleichstände gleicher Platz). Diese bewegen ihre eigenen Figuren Richtung Feld 24. Alle starten mit einem Schild-Item. Jedes dritte Feld ist ein Bonusfeld (+2 Gesamtpunkte), jedes vierte ein Itemfeld (nur leere Taschen auffüllen), jedes sechste ein Sturmfeld (−2 Felder); Sturm hat Vorrang. Feld 24 ist ausschließlich das Ziel, kein Sturmfeld. Ohne gewertetes Ergebnis werden keine Felder ausgelöst.

Items werden ausschließlich zwischen Minispielen eingesetzt: Schub +2 Bewegung beim nächsten gewerteten Ergebnis; Schild schützt vor genau einer Falle oder einem Sturm; Stolperfalle setzt einen anderen Spieler um 2 Felder zurück. Benutzung wird serverseitig gegen Besitz, Identität, Ziel, Phase und Pause geprüft. Verbrauchte Items sind nicht erneut einsetzbar. Alle Items und aktiven Schilde sind offen. Das Erreichen von Feld 24 oder der Rundengrenze beendet das Brett. Weiteste Figur gewinnt, bei Gleichstand entscheiden Gesamtpunkte; verbleibende Gleichstände teilen den Sieg.

**Survival / Nachtwache:** Abend-Modus mit allen kompatiblen Spielkategorien, 1–5 Leben pro Person (Standard 3). Die Stationen laufen zyklisch. Nur Spiele/Varianten, die auch zu zweit funktionieren, sind erlaubt. Nach einer gewerteten Partie verliert der letzte Platz ein Leben; mehrere Letzte verlieren je ein Leben. Ein vollständiger Gleichstand oder ein leeres Ergebnis kostet niemanden ein Leben. Wer 0 Leben hat, wird ab der nächsten Station als Zuschauer geführt. Auch ein ausgeschiedener Host behält seine Hostrechte. Verbindungsabbruch allein eliminiert nicht; ausdrückliches Verlassen des Raumes schon. Wer nur vom Platz aufsteht, muss vor der nächsten Station zurückkehren und kann nicht übersprungen werden. Ein letzter Überlebender gewinnt. Die vor dem Start sichtbare Sicherheitsgrenze ist 60 Partien: dort entscheiden verbleibende Leben, bei Gleichstand gemeinsam.

## Speichern und Privatsphäre

Wenn eine Programmstation Zusatzregeln verwendet, lädt der erste Start die echte Spiel-Lobby mit der angekündigten Regel. Erst ein zweiter Host-Start beginnt die Partie. So sehen alle die Zufallsregel vor Spielbeginn, auch nach einem Serverneustart. Wiederholung nach Abbruch behält dieselbe Ankündigung.

Programm, Würfelwurf, Feldpositionen, Items, Leben und schon gewertete Ergebnisse werden in der vorhandenen Raumablage gespeichert. Wiederverbindung verwendet die bestehenden Tokens. Nach einem Serverneustart wird bei Spielen ohne laufende Zustandsspeicherung nur die ungewertete Station wiederholt, ohne neuen Brettwurf oder erneuten Lebensabzug. Spiele mit eigener laufender Speicherung nutzen weiter ihre vorhandene Wiederherstellung. Ergebnisse werden je Stationsindex höchstens einmal verbucht. Die Browser erhalten keine gespeicherten eigenen Fragen, Antworten oder internen Spielstände über die Programmansicht.

Die neuen Formate benutzen ihre eigene persistente Brett-/Lebenswertung am Tisch. Sie erzeugen **keinen separaten Abend-Rückblick** im bisherigen Archiv: dessen Platzierungsschema bildet Brettpositionen und Leben nicht ab. Daher wird kein ins Leere führender Rückblick-Knopf angezeigt. Die bisherigen Programm-Modi und deren Archivierung bleiben erhalten.

## Gestaltung

VIS-108 ist ein **Feature-Paket**, getrennt von den unveränderten 107 Spiel-VIS-Paketen. Laternenpfad: eigene SVG-Inseln, Messingpfad und helle nummerierte Brettfelder. Nachtwache: eigener Leuchtturm und gut lesbare Lebenslichter. Zusatzregeln: eigene Regelwerkstatt. Sämtliche SVGs und CSS sind für dieses Projekt selbst erstellt, ohne Fremdbilder, Markenzeichen oder externe Downloads. DE/EN, vorhandene Regeln-Seitenleiste plus eigene aufklappbare Regeln, Tastaturbedienung, mindestens 44-Pixel-Aktionen, reduzierte Bewegung und sechs Größen werden geprüft.

## Abschluss und Nachweise

Implementierungscommit: `78baf50d9c97506c89adcd1580ebe9fde749afb0` (`main`). Maschinenlesbare Nachweise: [evidence.json](evidence.json), aktuelle Quellcode-Hashes und unveränderte historische Integrationen: [source-audit.json](source-audit.json). **PARTY-EXTRAS-01 ist verified, VIS-108 ist done.** Die 41 bestehenden Backlog-Spiele und 107 Spiel-VIS-Pakete bleiben unverändert gezählt; dieses Paket enthält vier Funktionen, keine zusätzlichen Spielregistrierungen.

| Prüfung | Tatsächliches Ergebnis |
| --- | --- |
| Vollständige unveränderte Baseline `7bb4395` | 1.749 Tests: 1.743 bestanden, 0 fehlgeschlagen, 6 übersprungen |
| Vollständiger Vergleich mit dem Feature-Code, isoliert von paralleler Arbeit | 1.778 Tests: 1.772 bestanden, 0 fehlgeschlagen, 6 übersprungen |
| Abschließende EN-Roadmap-Texte und betroffene Quellcode-Nachweise | 31 Node-Prüfungen bestanden |
| Browser-Regression: neue Funktionen, bisherige Playlists, Teams und Abend-Modus | 16 Desktop-/Mobil-Prüfungen bestanden |
| Browser-Wiederholung nach Lebenszyklus-/Reconnect-Prüfung | 8 Desktop-/Mobil-Prüfungen bestanden |
| Abschließende DE/EN-Roadmap und keine eigenen Spielknöpfe für Funktionen | 2 Desktop-/Mobil-Prüfungen bestanden |
| Abschlussnachweise, unveränderte Bilder, Quellcode-Hashes, Planung und bestehende Nachweise | 21 Node-Prüfungen bestanden |

Der vollständige Vergleichslauf fand **vor** der abschließenden EN-Textpflege der neuen Roadmap-Punkte statt; danach liefen die 31 passenden Node- und zwei Browserprüfungen. Er wird nicht als ein weiterer vollständiger Lauf nach dieser Textänderung ausgegeben. Die Windows-Gesamtläufe verwendeten Node 24.22.0 mit `--test --test-force-exit --test-concurrency=2`; die sechs übersprungenen Bestandsprüfungen wurden als übersprungen beibehalten. Keine Assertion wurde durch `skip` deaktiviert. Der vollständige Lauf enthält die vorherigen Spielsimulationen; zusätzlich endeten 180 Partien der bestehenden Bots mit allen neuen Regeltypen ohne Absturz.

Die ersten Vergleichsläufe waren nicht grün: Die Zwischenanzeige des Bretts fehlte, das Ziel war zunächst versehentlich ein Sturmfeld, alte Tests erwarteten noch die vier geplanten Funktionen und die alte Optionsliste. Ein neuer Mehrbrowser-Test prüfte den zweiten Socket vor dessen Zustellung. Diese Punkte sind korrigiert und nachgeprüft. Historische Screenshot-Hashes bleiben unverändert: Nur betroffene Tests lesen die fünf archivierten Integrationsquellen der echten Baseline und prüfen **zusätzlich** die heutigen Integrationsdateien gegen deren eigene Hashes. Das betrifft auch die Server-Einbindung in den bisherigen V2-13/V2-14-Nachweisen; die V2-Aufgaben und deren Implementierungen wurden nicht geändert.

Die Bestandsläufe fanden in einer archivierten Kopie des tatsächlichen `main` plus ausschließlich den eigenen geänderten Dateien statt. Parallele Änderungen an Abdeckung, CI, Paketdateien, allgemeiner README und anderen Tests wurden weder mitgetestet noch committed. Keine `.env` wurde gelesen oder übernommen; kein Produktivserver wurde aktualisiert.

48 unveränderte permanente Bilder liegen unter [test/fixtures/party-features/screenshots](../../test/fixtures/party-features/screenshots/): Lobby, Ergebnis, Wiederverbindung, DE/EN-Regeln, Chaos-Vorschau und sechs Layoutgrößen für Brett und Survival, jeweils Desktop und Mobil. Die Bilder wurden tatsächlich betrachtet; Brettfelder, Lebensanzeigen und die Regelwerkstatt bleiben bei 360 Pixeln Breite erreichbar und ohne horizontales Überlaufen. Die Funktionen hatten vorher keine eigene Oberfläche; deshalb werden keine erfundenen Vorher-/Nachher-Paare behauptet. Vollständige erfolgreiche Laufprotokolle: [verification](verification/).

Beispiele: [Brett auf 360 × 800](../../test/fixtures/party-features/screenshots/mobil/board-layout-360x800.png), [Survival auf 390 × 844](../../test/fixtures/party-features/screenshots/mobil/survival-layout-390x844.png), [englische Chaos-Regeln](../../test/fixtures/party-features/screenshots/mobil/chaos-english-rules.png).

Keine weiteren Implementierungspakete begonnen. Bewusste Grenzen bleiben die oben aufgeführten drei unterstützten Modifier-Spiele, die offen angekündigte Survival-Sicherheitsgrenze und die fehlende separate Archivansicht für Brett-/Lebensstände. Der Auftrag ist damit abgeschlossen; weitere Spiele und V2-Pakete benötigen eine neue Freigabe.
