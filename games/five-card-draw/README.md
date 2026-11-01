# Five Card Draw

Freigegeben am 01.11.2026: 2–6 Spieler, Bots und individuelle Spielwelt. Kein V2-Paket.

Fünf verdeckte Karten pro Spieler. Der Host wählt Blinds oder Ante. Nach der ersten No-Limit-Setzrunde tauscht jeder verbleibende Spieler genau einmal 0–3 Karten. Die Hausregel erlaubt 4, wenn die behaltene Karte ein Ass ist. Auch All-in-Spieler bekommen ihre Tauschentscheidung. Danach folgt genau eine zweite Setzrunde und der Showdown. Es gibt weder Gemeinschaftskarten noch Burn Cards. Die grundlegende Abfolge entspricht [PokerStars Five Card Draw](https://www.pokerstars.com/poker/games/draw/); die ausdrücklich festgelegte Tauschgrenze und die Ante-/Ass-Optionen sind die hier implementierte Fassung.

## Bestehende Poker-Bausteine

`DrawTable` erweitert die vorhandene Poker-`Table`. **Setzen, Raise-Wiedereröffnung, Rückgabe nicht gecallter Einsätze, Pots, Side Pots, Auszahlungen und Restchips** sind die geerbten Methoden. Die vorhandene Fünf-Karten-Handauswertung wird direkt verwendet. Ein kleiner `completeBoard()`-Haken erhält das bisherige Hold’em-/Omaha-Verhalten und lässt Draw ohne Gemeinschaftskarten auszahlen. Die neue Klasse legt nur Kartenanzahl, Ante-Vorbereitung und den Wechsel Setzrunde → Tausch → Setzrunde fest.

Die existierenden Funktionen für Chipklassen, Chipstapel und Chipflug wurden in `public/games/five-card-draw/poker-chips.js` ausgelagert. Hold’em, Omaha und Draw benutzen denselben Helfer. Die Chip-/Stapel-/Flug-Styles liegen ebenfalls einmal gemeinsam. Der alte Poker-Controller erhält keine neue Hand- oder Setzlogik. Vorher-/Nachher-Prüfungen verwenden die ursprünglichen Poker-Assets aus Commit `5667b850e76cc8ccc1f064f0b21650d463beb592` und denselben echten pausierten Tisch mit demselben Spieler. Chipmaße, Farben und Stapel stimmen überein. Bewegungsprüfungen beachten sowohl „Animationen aus“ als auch `prefers-reduced-motion`.

Chipstände bleiben zwischen Händen und in den bestehenden Zwischenrunden-Snapshots erhalten. Der Dealer wandert weiter; ein Abbruch wiederholt die richtige Dealerposition. Ein Host-Abbruch gibt alle Beiträge zurück. Bei null Chips kann der betroffene Spieler außerhalb einer Hand ausdrücklich neu einkaufen. Diese zusätzlichen Spielchips werden separat als Einkauf verbucht; sie werden nicht als konservierter alter Pot ausgegeben. Runde/Abend zählen den Netto-Chipgewinn, dessen Summe pro Hand null ist.

Alle Handkarten, nicht gezogenen Karten und Abwürfe bleiben auf dem Server. Persönliche Zustände enthalten nur die eigene Hand; Zuschauer bekommen `hand: null`. Beim Showdown werden nur die noch aktiven Hände öffentlich. Bei einem kampflosen Sieg bleiben auch die Siegerkarten verborgen. Meldungen über einen Tausch enthalten nur die Anzahl. Jeder Zug ist an eine Handkennung und Revision gebunden. Der Bot verwendet eigene Karten und offene Einsätze; er liest keine fremden Karten oder Deckreihenfolgen.

## Spielwelt und Bedienung

Eigener grüner Saloon-Tisch mit Messing-/Holzrand, sichtbaren Einsätzen und Side Pots, Dealerknopf und eigenem Showdown-Blatt. Auswahl markiert ausdrücklich **die abzuwerfenden Karten**; erst Bestätigen tauscht sie. Keine Auswahl bedeutet bewusstes Behalten aller fünf Karten. Eingaben und Auswahl bleiben bei passenden Zustandsmeldungen, Pause und Websocket-Reconnect erhalten. Private Karten haben auch auf kleinen Geräten große Tippflächen; Setzknöpfe bleiben im Dock erreichbar. Keine externen Bilder oder neue 3D-Funktionen.

Bei der Reconnect-Prüfung wurde ein Fehler im vorhandenen Backlog-Helfer sichtbar: Der erste frische Zustand setzte intern die Verbindung frei, zeichnete die gesperrten Knöpfe aber noch nicht neu. Der Helfer rendert jetzt genau in diesem Fall erneut. Ein eigener Regressionstest sichert das ab; auch Backgammon und Hearts sind mit echtem Disconnect/Connect erneut geprüft. Bei der abschließenden Bildkontrolle wurde die historische All-in-Markierung nach Auszahlung entfernt, damit der neue Chipstand eindeutig ist.

## Tatsächliche Prüfungen

- **16 Regel-/Helfertests**, darin **300 vollständige Bot-Hände** mit 2–6 Spielern, Ante/Blinds und Ass-Hausregel. Nach jedem Schritt bleiben alle 52 Karten eindeutig und alle eingesetzten Chips erhalten. Separate Tests prüfen drei unterschiedlich große All-ins, getrennte Haupt-/Side-Pot-Sieger, Split Pots und unteilbare Restchips, Tausch trotz All-in, Abbruch, Einkauf, Dealerwechsel, Snapshots, veraltete Anfragen, Pause und geheime JSON-Ansichten.
- **10 Browserfälle bestanden**: sechs Draw-Partien/Varianten und vier Hold’em-/Omaha-Regressionen auf Desktop/Touch. Echte private Hände, Erhöhen/Mitgehen, bewusster Tausch, Reconnect, sechs Bildschirmgrößen, reale Side Pots und Ante-All-ins mit 3/6 Teilnehmern sind abgedeckt.
- Der erste Draw-Browserlauf fand die beschriebene Reconnect-Sperre. Die abschließenden sechs Spielprüfungen bestehen danach. Der Vorher-/Nachher-Test schließt den alten Vergleichstab vor der Übernahme seiner Testsitzung; dadurch laufen dessen alte Intervalle nicht gegen eine entfernte Oberfläche. Flugbewegungen werden bei ausreichend breitem Tisch geprüft; die Handy-Geometrie wird separat vor/nach der Auslagerung verglichen.
- Der gesamte Node-Bestand und die endgültigen Quell-/Bildnachweise werden im bestehenden Backlog-Protokoll dokumentiert. Die Bilder im lokalen `evidence.json` sind Originale aus isolierten Testräumen, einschließlich acht Vorher-/Nachher-Aufnahmen der gemeinsamen Poker-Chips.

Tests und Browserkonfiguration liegen bewusst im eigenen Spielordner. `test/new-games.test.js` bindet die Regeltests in `npm test` ein; `test/ui/new-games.spec.js` bindet alle neuen Browserfälle in den bestehenden UI-Lauf ein. Normale Browserläufe speichern Bilder im ignorierten `_artifacts/screenshots`-Ordner. Nur `CLASSIC_CAPTURE_EVIDENCE=1` aktualisiert absichtlich die permanenten PNGs; anschließend muss deren Manifest erneuert werden.

Neue Quell-, Test- und Bilddateien dieses Auftrags liegen nur in den drei freigegebenen Spielordnern unter `games/` und `public/games/`. Die parallel betreuten Bereiche `server/`, `scripts/`, `.github/` und die Admin-Seite wurden nicht bearbeitet. Kein Produktivdeployment.

Die Dateien `fixtures/poker-baseline.js` und `.css` sind unveraenderte Testkopien der repository-eigenen Poker-Assets aus dem oben genannten Basiscommit. Ihre SHA-256-Werte sind im Vergleichstest festgehalten (LF-normalisiert). So funktioniert der echte Vorher-/Nachher-Test auch in einem flachen CI-Checkout ohne alte Git-Objekte. Die Fixtures werden nicht als Spieloberflaeche ausgeliefert.

Implementierungscommit: `d29b2e0acf244438c9638aaebce6266970149aea`. Abschluss: **1029 Node-Tests bestanden, 0 fehlgeschlagen, 3 bestehende Auslassungen**; **22 reguläre Mehrspieler-Browserfälle bestanden** und **vier zusätzliche Fixture-Vergleiche bestanden**. Dauerhafte Bilder: [Manifest](evidence.json). Einzelheiten und vollständiger Paketabschluss: [Backlog-Protokoll](../../docs/backlog/WEITERE_SPIELE.md).
