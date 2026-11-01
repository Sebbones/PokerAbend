# Omaha Hi/Lo – High & Low am grünen Tisch

BACKLOG-04, ausdrücklich freigegeben am 01.11.2026. 2–9 Spieler, Pot Limit, optionale Bots. Vier private Karten, für jede High-/Low-Auswertung genau zwei davon plus genau drei Boardkarten. High und Low dürfen unterschiedliche Kombinationen nutzen. Regelgrundlage: [PokerStars Omaha Hi/Lo](https://www.pokerstars.com/poker/games/omaha/high-low/).

Low benötigt fünf verschiedene Ränge bis einschließlich acht. Ass zählt als eins; Straßen und Flushes schaden Low nicht. Verglichen wird von der höchsten Low-Karte abwärts. Ohne qualifiziertes Low bekommt High den ganzen Pot. Sonst erhält High die aufgerundete Hälfte und Low die abgerundete Hälfte. Gleichstände teilen den jeweiligen Anteil; weitere Restchips gehen in Sitzreihenfolge links vom Dealer. Ein Spieler kann beide Seiten gewinnen (Scoop) oder drei Viertel bekommen. Haupt- und Side Pots werden **einzeln mit ihren jeweils berechtigten Spielern** ausgewertet.

## Tatsächliche Wiederverwendung

`HiLoTable` erbt die vorhandene Poker-`Table`: Setzregeln, Pot-Limit-Grenzen, nicht gecallte Einsätze, Side Pots, Gleichstandsauszahlung und Abbruch sind keine Kopien. Die Engine bekommt einen kleinen `splitPot()`-Haken; ihre bestehende Auszahlungsroutine verteilt die so erzeugten High-/Low-Anteile. `createDeck()` ist ein weiterer Standardhaken für die folgende Short-Deck-Variante. Die bestehende Omaha-High-Auswertung und ihr Kombinationsgenerator werden direkt verwendet.

`PokerVariantRoom` erbt den vorhandenen Draw-Chipraum: Sitzplätze, Chipkonten, Nachkauf, Dealerwechsel, Netto-Handergebnis, Abbruch-Rückzahlung und Zwischenrunden-Snapshots bleiben dieselben Methoden. Draw erhält dafür einen Table-Fabrik- und Ergebnistexthaken sowie eine optionale Abfrage seiner Tauschmarkierungen; sein Spielablauf bleibt erhalten. Der Raum verwendet ausschließlich vorhandene Raum-Spieler-IDs. Keine eigenen Konto-, Cookie-, Namen- oder Identitätsannahmen.

Bots schätzen Anteile über 16 kleine Stichproben aus unbekannten Karten. Sie sehen nur eigene Karten und offen freigegebene Karten; das wirkliche Deck und fremde Hände werden nicht gelesen. Die eigentliche Setzentscheidung ist die aus dem vorhandenen Poker-Bot ausgelagerte gemeinsame `pokerWagerDecision()`, ohne Änderung ihrer bisherigen Hold’em-/Omaha-Regeln. Die folgenden Varianten können eigene Evaluatoren und öffentliche Karten in denselben Sampler einbringen.

## Spielwelt und Nachweise

Eigener petrolgrüner Tisch mit hellem Messing-/Salbeirand, High-/Low-Ergebniszetteln, offener Boardmitte und privater großer Hand im Dock. Der opt-in Renderer und seine begrenzten CSS-Grundlagen liegen im eigenen Ordner und werden später von Short Deck/Stud mit eigenen Materialien verwendet. Alte Poker-/Omaha-/Draw-Controller werden nicht durch ihn ersetzt. Chipstapel und Fluganimationen sind der bereits vorhandene gemeinsame `PokerChips`-Helfer; ruhige Bewegungseinstellungen bleiben erhalten. Ausschließlich eigenes CSS, keine externen Bilder oder 3D-Funktionen.

Sechs Regeltests enthalten Low-Qualifikation, exakte 2+3-Auswahl, Scoop, fehlendes Low, geviertelte Pots, unteilbare Restchips, getrennte Side-Pot-Berechtigung, private Roh-JSON-Ansichten, Pause, veraltete Züge, Abbruch und Snapshots. **60 vollständige Bot-Hände** mit 2–9 Spielern prüfen nach jeder Aktion Chipsumme und eindeutige Karten, am Ende außerdem Netto-Gewinnsumme null. Tests prüfen auch die tatsächliche Methodenidentität der geerbten Poker-Bausteine.

Vier echte Browserfälle bestehen auf Desktop/Handy: getrennte menschliche Kontexte und Zuschauer, Setzen, Pause, Entwurfserhalt bei Websocket-Reconnect, sechs Bildschirmgrößen, Showdown und Live-Bots. Während der ganzen Hand wird das Zuschauer-JSON gegen alle noch privaten Karten durchsucht. Eine Ansicht zeigt nur eigene Karten; fremde Kartenrücken sind gleich und enthalten keine verborgenen Werte. Laufende Einsätze werden noch nicht als fertige Side Pots beschriftet.

Originale Bildnachweise: [evidence.json](evidence.json). Normale Tests schreiben nur nach `_artifacts/screenshots`; `CLASSIC_CAPTURE_EVIDENCE=1` aktualisiert gezielt die permanenten PNGs mit anschließendem Manifest-Update. Dies ist die Erstimplementierung eines bislang geplanten Spiels. Vollständige Paket-Nachweise werden nach den vier tatsächlichen Spiel-Commits im Backlog-Protokoll verknüpft.
