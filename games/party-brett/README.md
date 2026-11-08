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

Testergebnisse, endgültiger Implementierungscommit und Bildnachweise werden nach den echten Läufen in `evidence.json` ergänzt. Fremde Änderungen im Arbeitsverzeichnis werden nicht übernommen.
