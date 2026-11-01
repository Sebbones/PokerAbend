# Hearts · Herzjagd

Freigegeben am 01.11.2026, einschließlich eigener Spielwelt und Bots. Kein V2-Paket.

Vier Teilnehmer spielen mit 52 Karten und je 13 Handkarten. Die automatisch durch die Sitzanzahl aktivierte Hausregel für drei Teilnehmer entfernt Karo 2 (je 17 Karten), für fünf Karo 2 und Pik 2 (je 10 Karten). Kreuz 2 und sämtliche Wertungskarten bleiben enthalten. Weitergeben: drei verbindlich ausgewählte Karten nach links, rechts, gegenüber, dann kein Tausch. Bei ungeraden Teilnehmerzahlen ersetzt ein weiterer Durchgang ohne Tausch das Gegenüber. Alle geben gleichzeitig verdeckt ab; erst nach der letzten Abgabe werden die Hände verändert.

Kreuz 2 eröffnet. Farbe bedienen ist Pflicht. Im ersten Stich dürfen Herzen und Pik-Dame nur abgeworfen werden, wenn sonst keine Karte möglich ist. Nur eine tatsächlich ausgespielte Herz-Karte bricht Herzen. Herzen führen ist vorher nur mit einer reinen Herz-Hand erlaubt. Die höchste Karte der angespielten Farbe gewinnt. Herz = 1 Strafpunkt, Pik-Dame = 13. Alle 26 Strafpunkte eines Blattes ergeben einen Mond: der Sammler bekommt 0, jeder andere 26. Optional zählt Karo-Bube −10 unabhängig davon, auch beim Mond. Sobald nach einem vollständig abgerechneten Blatt jemand mindestens 100 hat, gewinnt die niedrigste Gesamtsumme; Gleichstände teilen den Sieg.

Die Regelgrundlage ist [Bicycle Hearts](https://bicyclecards.com/how-to-play/hearts). Die ausdrücklich beschriebenen 3/5-Spieler-Regeln, das Beibehalten von Kreuz 2 und das Brechen ausschließlich durch Herzen legen die hier angebotene Fassung fest. Nicht implementierte Varianten aus dem alten Backlog werden nicht als spielbar ausgegeben.

Die private Ansicht enthält nur die eigene Hand und die selbst erhaltenen Tauschkarten. Fremde aktuelle Handkarten, Tauschauswahlen und Decks fehlen auch im JSON. Protokolle enthalten beim Tausch nur die Zahl, beim Ausspielen die ohnehin offene Karte. Der Bot entscheidet ausschließlich aus eigener Hand, legalen Karten und öffentlichem Stich. Er gibt riskante Karten ab, bedient Farbe und versucht, unter der höchsten Stichkarte zu bleiben. Aussteigen bricht die unvollständige Partie ohne künstliche Wertung ab. Host-Abbruch entfernt alle Hände und Tauschauswahlen.

## Spielwelt und Prüfungen

Eigener bordeauxfarbener Filztisch mit offenem Stich in der Mitte und einer hellen Punktekarte pro Spieler. Handkarten werden einzeln ausgewählt und ausdrücklich bestätigt; keine versehentlichen Ein-Klick-Abgaben. Eigene Auswahl und Tastaturfokus bleiben bei fremden Abgaben erhalten. Die Hand hat auf kleinen Geräten eine eigene Scrollfläche, die Bestätigung bleibt erreichbar. Gestaltung ist eigenes CSS mit bestehenden französischen Karten, ohne externe Bilder oder 3D.

`node --test games/hearts/rules.test.js`: **12 bestanden**, darunter **60 vollständige Bot-Partien** über alle Teilnehmerzahlen mit/ohne Karo-Buben. Geprüft werden Kartenerhaltung, Strafpunktsummen, Mond, Bedienen, erste Stichregel, Eröffnung, geheime JSON-Ansichten, veraltete Anfragen, Pause und Abbruch. Originale Browseraufnahmen und abschließende Ergebnisse werden nach echter Abnahme im lokalen `evidence.json` sowie im vorhandenen Backlog-Protokoll ergänzt.

Browser-Abnahme: **4 bestanden** (zwei vollständige reale Partien bis zum Ende und zwei Hausregel-/Live-Bot-Prüfungen). Sechs Bildschirmgrößen, Zuschauer, eigene Auswahl, Pause und Reload sind abgedeckt. 16 originale PNGs: [Manifest](evidence.json).

Abschließender Gesamt-Node-Lauf: **1009 bestanden, 0 fehlgeschlagen, 3 bestehende Betriebs-/Umgebungsprüfungen ausgelassen** (1012 Tests insgesamt). Der vorherige Lauf fand eine Abweichung von der bestehenden Zuschauer-Konvention: fehlende eigene Hände werden jetzt als `null` ausgegeben. Die Sicherheitsprüfung wurde beibehalten und besteht danach. Bei der Bildkontrolle wurde die Stichanzeige nach Blattende auf die tatsächliche Blattgröße begrenzt; die abschließenden Bilder und Browserläufe enthalten die Korrektur.
