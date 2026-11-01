# Backgammon

Freigegeben am 01.11.2026: Gameplay, Bots und eigene Spielwelt. Kein V2-Paket.

Standardaufstellung mit je 15 Steinen; Hell zieht 24 → 1, Dunkel 1 → 24. Der höhere Eröffnungswürfel beginnt mit beiden unterschiedlichen Werten. Pasch gibt vier Teilzüge. Die erlaubten Ziele werden aus vollständigen Fortsetzungen ermittelt: beide Würfel sind Pflicht, wenn möglich; bei nur einem nutzbaren Würfel der höhere. Bar-Steine haben Vorrang. Einzelne Gegner werden geschlagen; besetzte Punkte mit mindestens zwei Gegnern sind gesperrt. Abtragen beginnt erst ohne Bar und mit allen eigenen Steinen im Heimfeld. Überwürfeln geht nur vom entferntesten besetzten Punkt.

Teilzüge sind ausdrücklich vorläufig. **Zug bestätigen** schließt den Zug ab; davor stellt **Rückgängig** Brett, Bar, abgetragene Steine und verfügbare Würfel wieder her. Erst Bestätigen wertet den letzten Stein aus. Gammon zählt doppelt, Backgammon dreifach; ein bereits abgetragener gegnerischer Stein verhindert beides.

Matches bis 3/5/7 Punkte. Verdopplungswürfel standardmäßig an, abschaltbar. Nur vor dem eigenen Wurf und nur vom Besitzer oder vom zentrierten Würfel aus; Annehmen verdoppelt und überträgt den Besitz, Ablehnen verliert den bisherigen Würfelwert ohne Gammon-Multiplikator. Obergrenze 64. Crawford sperrt die Verdopplung für genau das erste Spiel, in dem jemand einen Punkt vom Matchsieg entfernt ist. Kein Jacoby, Beaver oder automatisches Verdoppeln bei Eröffnungspasch. Die Regeln orientieren sich an der [USBGF-Grundlage](https://usbgf.org/backgammon-basics-how-to-play/) und den [Matchregeln](https://usbgf.org/tournament-rules/rules-for-in-person-play/); die genannten Host-Optionen sind die tatsächlich angebotene Umsetzung.

Die Bot-Heuristik bewertet ausschließlich das offene Brett: Restwege, Treffer, Abtragen, gesicherte Punkte und offene Einzelsteine. Bot- und menschliche Züge durchlaufen dieselbe vollständige Legalitätsprüfung. Aussteigen beendet das Match als Aufgabe; ein Host-Abbruch vergibt keine Matchwertung.

## Spielwelt und Bedienung

Eigenes CSS-Holzbrett, kontrastierende Dreiecke, helle/dunkle Spielsteine, Würfel und sichtbarer Verdopplungswürfel. Keine fremden Assets, Fotohintergründe, 3D-Funktionen oder Änderungen fremder Spieloberflächen. Auf kleinen Geräten bleibt das Brett intern horizontal verschiebbar, mit mindestens 44 Pixel breiten Zungen; alle erlaubten Teilzüge sind zusätzlich über große Zielknöpfe erreichbar. Fokus und ausgewählte Quelle sind sichtbar; Pausen- und Offline-Sperren verwenden die bestehende Plattform. Personenbezogene Texte werden escaped.

## Tatsächliche Prüfungen

- `node --test games/backgammon/rules.test.js`: **13 bestanden**, darunter **50 vollständige Bot-Matches** mit unverändert insgesamt 30 Steinen.
- `playwright test --config games/backgammon/playwright.config.js`: **2 bestanden**, Desktop und Touch, bis zum Matchende; legale Vorschau, Rückgängig, Verdopplung, Zuschauer, Pause, Reload und sechs Bildschirmgrößen.
- Sichtprüfung: unter anderem Handy-Brett und Matchende. Originalaufnahmen liegen unter `public/games/backgammon/evidence/`; das abschließende Manifest enthält SHA-256 und den tatsächlichen Implementierungscommit.
- Der erste Gesamt-Node-Lauf fand den zunächst fehlenden englischen Katalogeintrag. Er ist ergänzt; der gezielte Regel-/Sprachlauf besteht mit **26 Tests**. Ein früher Browser-Autoplay-Test verwendete beim Spielerwechsel noch die vorherige persönliche Ansicht; er wartet jetzt auf die korrekte eigene Serveransicht. Der abschließende Browserlauf besteht vollständig.

Auch der reguläre UI-Lauf prüft jetzt echten Websocket-Disconnect/Connect. Sein Autoplay wartet mindestens 140 ms je Zugaktion und respektiert damit die vorhandene Begrenzung auf acht Socket-Ereignisse pro Sekunde. Ein zu schneller erster Gesamtlauf scheiterte an dieser Begrenzung; nach der Taktanpassung bestehen alle 22 Fälle des gemeinsamen Mehrspieler-Laufs. Der Server-Limiter blieb unverändert.

Normale Browserläufe schreiben Bilder nach `_artifacts/screenshots`. `CLASSIC_CAPTURE_EVIDENCE=1` erneuert gezielt die permanenten Aufnahmen; danach deren Hashmanifest aktualisieren. Keine Produktivdaten oder produktiven Räume wurden benutzt. Tatsächlicher Implementierungscommit: `9f0511779efc0ca03e759cb92b5b00605611fdaf`; abschließende Gesamtprüfungen stehen im [Backlog-Protokoll](../../docs/backlog/WEITERE_SPIELE.md).
