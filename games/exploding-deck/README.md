# Exploding-Deck · BACKLOG-05

Eigene Bastelwerkstatt, eigene SVG-Karten und Kartentexte. Zwei bis fünf Personen; doppeltes Deck bis zehn. Jeder erhält **sieben Karten insgesamt**, davon eine garantierte Sicherung. Sechs Sicherungen pro Deck, Bomben = Spieler minus eins. Ausgeschiedene Hände werden offen abgelegt.

Angriff überträgt verbleibende Angriffszüge plus zwei; Überspringen verbraucht einen Zug. Einspruchketten wechseln die Wirkung und erneuern das serverseitige Reaktionsfenster (Standard fünf Sekunden). Alle können vorzeitig passen. Bomben und Sicherungen sind nicht anfechtbar. Gefallen lässt den Besitzer seine Karte wählen; Paare stehlen zufällig, Drillinge verlangen einen Typ.

Eigene Hände, eigene Prüflampe und geheime Einfügepositionen verlassen die jeweilige Spieleransicht nicht. Worker erhalten ausschließlich eine explizite Projektion dieser Ansicht. Kein Zugriff auf fremde Hände oder den Stapel. Drei Stufen unterscheiden Informationsnutzung, Kartenerhalt und Bombenplatzierung; auch Mittel läuft hier im vorhandenen Worker. Host-Pause hält die vorhandene Raum-Uhr an. Snapshot sichert wie bei den anderen Rundenspielen Einstellungen, Plätze und Bot-Stufen, keine laufende verdeckte Partie.

Nachweise: `rules.test.js` (Regeln, Privatsphäre, Worker, 80 komplette Botpartien über alle Spielerzahlen und Stufen), `ui.spec.js` (Desktop/Handy, echte Bots, Zuschauer, Pause, Reconnect und Englisch). Tatsächliche Laufzahlen und Code-Commit werden nach dem Testlauf im Paketnachweis eingetragen.
