# Weitere Spiele – Umsetzung in Spiele-Päckchen

Stand: 31.10.2026. Ausgangsstand `2dd1d4b12a9b9c03991272ca654b60f614c919ab`. Nutzerauftrag: die vorhandene Roadmap-Rubrik **„Weitere Spiele – 0 von 41 erledigt“** umsetzen. Ausdrücklich gewählte Reihenfolge: **zuerst Risiko-Würfeln, Story-Chaos und Zahlenreihe**. Fortschritt und tatsächliche Implementierungscommits: [plan.json](plan.json). Das ist ein Ausführungsprotokoll der bestehenden 41 IDs, keine zweite Quelle für neue Spielideen; Beschreibungen des verbleibenden Backlogs stehen weiterhin in `games/planned.js`.

**Aktueller Fortschritt am 01.11.2026: 9 von 41 implementiert, 32 offen.** 58 Raumspiele plus drei lokale Einzelspieler ergeben 61 spielbare Spiele. Der aktuelle Auftrag umfasst ausschließlich BACKLOG-03; danach stoppen. Keine V2-Pakete.

## BACKLOG-03 – Backgammon, Hearts und Five Card Draw

Alle drei sind reguläre Räume mit optionalen Bots, Host-Pause, Wiederverbindung, Zuschauern und deutschen/englischen Beschriftungen. Ihre eigenen Spielwelten wurden auf Desktop und Touch sowie in sechs Bildschirmgrößen geprüft. Neue Dateien liegen ausschließlich unter ihren eigenen `games/<id>/`- und `public/games/<id>/`-Ordnern; `server/`, `scripts/`, `.github/` und die Admin-Seite wurden nicht bearbeitet.

| Spiel | Regeln und Umsetzung | Bilder mit SHA-256 |
| --- | --- | --- |
| Backgammon | [Holzbrett, legale Zugfolge, Bar, Abtragen, Verdopplung und Match](../../games/backgammon/README.md) | [12 Originalaufnahmen](../../games/backgammon/evidence.json) |
| Hearts / Herzjagd | [Tausch, Stichregeln, Mond und genehmigte 3/5-Spieler-Hausregeln](../../games/hearts/README.md) | [16 Originalaufnahmen](../../games/hearts/evidence.json) |
| Five Card Draw | [Ante/Blinds, Tausch, geerbte Poker-Pots und Showdown](../../games/five-card-draw/README.md) | [30 Originalaufnahmen einschließlich Poker-/Omaha-Vergleich](../../games/five-card-draw/evidence.json) |

Backgammon verlangt die maximal nutzbare Würfelfolge und gegebenenfalls den höheren Würfel. Rückgängig bleibt bis zur ausdrücklichen Zugbestätigung möglich, auch beim letzten abgetragenen Stein. Der Verdopplungswürfel ist standardmäßig aktiv; Matches gehen über 3/5/7 Punkte einschließlich Gammon, Backgammon und Crawford-Partie. Auf Handy ist das große Brett intern verschiebbar; erlaubte Ziele bleiben zusätzlich als große Knöpfe erreichbar.

Hearts verwendet standardmäßig vier Spieler mit 13 Karten. Die ausdrücklich genehmigte Hausregel entfernt bei drei Spielern Karo 2 (17 Karten), bei fünf Spielern Karo 2 und Pik 2 (10 Karten). Kreuz 2 und alle Wertungskarten bleiben enthalten. Bei ungerader Spielerzahl ersetzt eine weitere Runde ohne Weitergeben das Weitergeben gegenüber. Karo-Bube −10 ist optional. Fremde Hände und noch geheime Tauschentscheidungen fehlen auch im übertragenen JSON.

Draw erbt die tatsächliche Poker-Setz-, Pot-, Side-Pot- und Auszahlungslogik sowie die Handauswertung. Ein kleiner Board-Abschluss-Haken erhält Hold’em/Omaha und lässt Draw ohne Gemeinschaftskarten auszahlen. Auch All-in-Spieler tauschen einmal. Die Ass-Hausregel erlaubt vier Tauschkarten nur bei einem behaltenen Ass. Chipanimationen und ihre Styles sind gemeinsam ausgelagert; Vergleichstests verwenden denselben echten Poker-/Omaha-Tisch vor/nach der Auslagerung. Der erste frische Zustand nach einem Websocket-Reconnect zeichnet die zuvor gesperrten Backlog-Knöpfe jetzt erneut; ein Regressionstest und alle drei neuen Spiele sichern das ab.

Regeltests enthalten **50 vollständige Backgammon-Bot-Matches, 60 Hearts-Partien und 300 Draw-Hände**. Sie prüfen Karten-/Steinerhaltung, Punkte bzw. Chips, private Roh-JSON-Ansichten, veraltete Aktionen, Pause, Abbruch und die wesentlichen Regelgrenzen. Die 16 neuen Browserfälle umfassen vollständige Mehrspieler-Partien, Zuschauer, Reconnect, sechs Größen, Side Pots, Ante-All-ins und vier Poker-/Omaha-Regressionen. Normale Läufe schreiben Screenshots nur nach `_artifacts/`; `CLASSIC_CAPTURE_EVIDENCE=1` erneuert bewusst die permanenten Bilder. Die lokalen Rohprotokolle sind ignorierte Arbeitsartefakte, keine auf GitHub verfügbaren Log-Downloads.

Die neuen Regel- und Browserfälle sind über bestehende Testdateien in `npm test` und `npm run test:ui` eingebunden. Die drei neuen individuellen Spielwelten schließen **VIS-065, VIS-067 und VIS-068** ab. Die älteren sechs Backlog-Spiele erhalten damit keine nachträgliche visuelle Freigabe. Alle 107 VIS-IDs bleiben erhalten. Reale Implementierungscommits und abschließende Laufzahlen stehen im folgenden Abschlussnachweis sowie in [plan.json](plan.json).

### Abschlussnachweis BACKLOG-03

| Prüfung | Tatsächliches Ergebnis | Lokales Rohprotokoll |
| --- | --- | --- |
| Vollständiger Node-Bestand einschließlich Bild-/Quellhash-Nachweis | **1029 bestanden, 0 fehlgeschlagen, 3 bestehende Umgebungsprüfungen ausgelassen**, 1032 insgesamt; 45,83 s | `games/five-card-draw/_artifacts/full-node-proof-release.log` |
| Neue und bestehende Regeln, CUX- und VIS-Inventur sowie Abschlussnachweise | **78 bestanden, 0 fehlgeschlagen** | `games/five-card-draw/_artifacts/final-proof-tests.log` |
| Regulärer Mehrspieler-UI-Lauf: 16 neue und 6 bestehende Fälle | **22 bestanden, 0 fehlgeschlagen**, Desktop und Touch; 5,0 min | `games/five-card-draw/_artifacts/standard-ui-release.log` |
| Erneuter Poker-/Omaha-Vergleich mit hashgeprüften Original-Testdateien | **4 bestanden, 0 fehlgeschlagen**, 20,1 s | `games/five-card-draw/_artifacts/poker-fixture-release.log` |

Der erste gemeinsame Browserlauf bestand 20 von 22 Fällen; die zu schnelle Backgammon-Testautomatik traf den unveränderten produktiven Socket-Limiter. Der Test sendet jetzt mit mindestens 140 ms Abstand und besteht auf Desktop und Touch. Die abschließenden 22 und die gesonderten vier Vergleichsfälle sind vollständig grün. Die bestehenden drei lokalen Node-Auslassungen sind im Rohprotokoll begründet; sie wurden für diesen Auftrag nicht neu eingeführt.

Ein Implementierungscommit pro Spiel: **Backgammon [`9f05117`](https://github.com/TTLPSCWA/PokerAbend/commit/9f0511779efc0ca03e759cb92b5b00605611fdaf)**, **Hearts [`a79bcf4`](https://github.com/TTLPSCWA/PokerAbend/commit/a79bcf41033d83c13925cabe274aa538244ef51f)**, **Five Card Draw [`d29b2e0`](https://github.com/TTLPSCWA/PokerAbend/commit/d29b2e0acf244438c9638aaebce6266970149aea)**. Der abschließende Nachweis-Commit ergänzt ausschließlich Dokumentation, Status, Bildmanifest-Hashes und deren Prüfung. Kein Produktivdeployment; der autorisierte Push kann den vorhandenen GHCR-Workflow auslösen. BACKLOG-03 ist fertig; hier endet der Auftrag.

## BACKLOG-01 – Die ersten drei kleinen Spiele

**Stand nach BACKLOG-01: drei Spiele implementiert und geprüft, 3 von 41 erledigt, 38 offen.** Sie haben eigene Servermodule und Browseroberflächen und sind regulär im bestehenden Hub hostbar. Der Katalog umfasste danach **52 Raumspiele plus drei lokale Einzelspieler, insgesamt 55 spielbare Spiele**. Neue Branches, PRs oder Produktivdeployments wurden nicht angelegt.

### Risiko-Würfeln

Ein eigener Würfeltisch für 2–8 Spieler. Ein serverseitiger W6 liefert bei 2–6 entsprechend viele ungesicherte Zugpunkte; 1 verliert nur diesen Zuggewinn. Sichern schreibt die Punkte an und beendet den Zug. Das eingestellte Ziel wird nur durch Sichern erreicht; der erste Spieler am Ziel gewinnt sofort. Standard: 100 Punkte, 45 Sekunden pro Entscheidung; beides kann der Host ändern. Bei Zeitablauf werden vorhandene Zugpunkte gesichert, ansonsten wird gewürfelt. Der Bot wägt Sichern und Weiterwürfeln anhand des offenen Zuggewinns und des Ziels ab.

Die Oberfläche trennt Zuggewinn und gesicherte Punkte, zeigt den aktiven Spieler und den Ziel-Fortschritt und bietet zwei ausdrückliche Aktionen. Gegner, Zuschauer und pausierte Spieler dürfen keinen Wurf übernehmen; Würfelwerte kommen ausschließlich vom Server.

### Story-Chaos

Eine gemeinsame Geschichte für 3–12 Spieler. Pro Mitspieler sind standardmäßig zwei Sätze vorgesehen, jeweils bis 240 Zeichen. Nur der aktive Spieler erhält den unmittelbar vorherigen Satz. Eigene frühere Beiträge bleiben lesbar; fremde Beiträge, frühere fremde Sätze und die Gesamtgeschichte bleiben bis zum Ende verborgen – auch für Host und Zuschauer. Öffentliche Protokolle und Aktionsblasen enthalten keine geheimen Sätze.

Es gibt keine künstliche Einzelwertung. Nach der letzten Eingabe lesen alle die vollständige Geschichte mit Autorzuordnung. Abgelaufene Schreibzeit fügt eine sichtbare Auslassung ein. Beim Aussteigen werden die offenen Beitragsquoten angepasst und fertige Autoren übersprungen. Mit weniger als zwei verbleibenden Spielern endet die Geschichte ohne erfundenen Einzelsieg. Reconnect behält die serverseitigen Beiträge; ein laufender Browser-Entwurf bleibt bei passenden Render- und Sprachupdates erhalten. Die bisherige Plattform-Snapshotstrategie bei Serverneustarts wird nicht verändert.

Rundenkennung und Schreibschritt binden jede Eingabe an genau ihre Aufgabe. Die Rundenkennung wird auch nach Abbruch und sofortigem Neustart neu erzeugt; alte Formularinhalte dürfen nicht in die neue Geschichte geraten. Text bleibt Text: HTML wird beim Anzeigen escaped. Bots liefern eigene harmlose Beispielsätze und lesen keine verdeckten Geschichten aus.

### Zahlenreihe

Ein gleichzeitiges Rätselspiel für 2–10 Spieler mit acht Reihen als Standard. Additionsfolgen beginnen die Partie; danach kommen Multiplikation, wachsende Abstände, abwechselnde Abstände und Fibonacci-artige Folgen hinzu. Optional fehlen zwei statt einer ganzen Zahl. Die beabsichtigte Regel wird nach jeder Runde aufgelöst; endliche Zahlenfolgen werden nicht als mathematisch eindeutig behauptet.

Jeder gibt genau eine verbindliche Antwort ab. Bis zur Auflösung kennt man nur seine eigene Eingabe. Richtige Antworten bringen 100 Punkte; optional erhalten die am Server gleichzeitig schnellsten richtigen Antworten 50 Extrapunkte. Die gemeinsame Spieluhr rechnet Pausen aus der Antwortzeit heraus. Zuschauer können auf Wunsch zum Spaß mitraten, erhalten aber weder Punkte noch Zeitbonus. Lösungen, künftige Aufgaben und fremde Antworten werden vorher nicht übertragen. Alte Fragen-/Rundenkennungen, wiederholte Eingaben, ungültige Zahlen und fremde Zugriffe werden abgelehnt.

Der Bot leitet seine Antwort aus der öffentlichen Folge ab; er liest die geheime Lösung nicht aus. Er antwortet absichtlich nicht immer richtig. Eingabe, Gruppenfortschritt und Auflösung verwenden den vorhandenen `PartyRoom`-/`partyGame`-Ablauf.

## BACKLOG-02 – Würfeljagd, Monsterwürfel und Würfel-Auktion

Alle drei Spiele sind regulär im vorhandenen Hub verfügbar, mit Host-Einstellungen, optionalen Bots, Reconnect, gemeinsamer Host-Pause und deutschen/englischen Beschriftungen. Würfelwerte erzeugt ausschließlich der Server. Eingaben werden auf Teilnahme, Phase, Pause und aktuelle Aufgabenkennung geprüft. Die Würfelspiele verwenden die bestehenden Raum- und UI-Grundlagen; vorhandene Spielregeln wurden nicht ersetzt.

### Würfeljagd

2–8 Spieler jagen gleichzeitig dieselbe offene Kombination aus drei Würfeln. Die Reihenfolge spielt keine Rolle, Häufigkeiten dagegen schon. Jeder darf passende Würfel antippen und behalten. Standard: fünf Kombinationen, sechs Würfe pro Kombination, 25 Sekunden gemeinsame Zeit. Zwischen eigenen Würfen müssen mindestens 500 Millisekunden Spielzeit liegen; Pausen verbrauchen weder diese Wartezeit noch Rundenzeit. Zieltreffer bringen einmalig 100 Punkte. Erfolg oder verbrauchte Würfe schließen die eigene Aufgabe ab. Fremde Würfel werden erst bei der Auflösung sichtbar. Alle haben dieselbe Versuchsgrenze und dasselbe Zeitfenster. Bots behalten passende Würfel anhand des öffentlichen Ziels. Bei mehreren Bots verteilt der Runner die Würfe gleichmäßig nach der bisherigen Versuchszahl.

Die eigene Würfelansicht und ihr Tastaturfokus bleiben bei fremden Würfen erhalten. Rundenkennung, Zielnummer und eigene Revision verhindern doppelte oder veraltete Aktionen. Der Rollknopf wird nach Ablauf der kurzen Wartezeit automatisch wieder verfügbar. Der Browser-Test fand einen Zugriff auf fehlende Lobby-Daten; die Abfrage berücksichtigt jetzt auch diesen regulären Zustand. Ein weiterer Testfehler wartete auf ein nicht vorhandenes Ansichts-Feld; er prüft jetzt den tatsächlich übertragenen öffentlichen Zug.

### Monsterwürfel

Kooperativ für 1–6 Spieler gegen eine einstellbare Folge von Monstern. Pro Zug gibt es bis zu drei Würfe mit drei Würfeln. Angetippte Würfel bleiben liegen; „Zug auswerten“ übernimmt ausdrücklich das Ergebnis. 1/2 sind Angriff (ein Angriff verursacht 1 Schaden, ab zwei Angriffen je 2); 3/4 geben je 1 Schutz; 5/6 heilen je 2 Gruppenleben bis zum Maximum. Ein überlebendes Monster schlägt mit seinem Angriff minus Schutz zurück. Besiegte Monster schlagen nicht mehr zurück. Null Gruppenleben verlieren gemeinsam; nach dem letzten Monster erhalten alle verbliebenen Spieler den gemeinsamen Sieg und je 100 Punkte. Schaden pro Spieler ist eine offene Beitragsanzeige, keine zusätzliche Siegbedingung. Bots wählen bei wenig Gruppenleben Heilung, ansonsten Angriff. Solo-Spiel, Aussteigen und automatische Entscheidungen sind abgedeckt.

### Würfel-Auktion

3–8 Spieler starten standardmäßig mit je 20 Chips und bieten gleichzeitig auf sechs Pakete mit je 2–5 Würfeln. Ein Gebot ist eine verbindliche ganze Zahl von 0 bis zum verbleibenden Budget. Fremde Gebote bleiben bis zur Auflösung geheim; 0 ist ein gültiger Verzicht. Nur ein eindeutiger positiver Höchstbieter kauft das Paket, bezahlt sein Gebot und erhält die tatsächlich vom Server gewürfelte Augensumme als Punkte. Bei gleichen Höchstgeboten oder ausschließlich Nullen wird nichts verkauft oder berechnet. Verlierer behalten ihre Chips. Nach allen Paketen gewinnt die höchste Punktzahl. Bots kalkulieren mit eigenem Budget, offenen Paketgrößen und verbleibenden Runden; sie lesen keine fremden Gebote. Nicht implementierte Hausregel-Ideen aus dem alten Backlog werden nicht als auswählbar angeboten.

### Prüfungen und Bilder

| Prüfung | Ergebnis | Protokoll |
| --- | --- | --- |
| Abschließender gesamter Node-Bestand einschließlich Bot-Reihenfolge und Bildhashes | **957 bestanden, 0 fehlgeschlagen**, 65,45 s | `artifacts/backlog-dice-release-node.log` |
| Neue Regeln, erstes Päckchen und konsistente visuelle Inventur | **30 bestanden**; neue Würfeltests enthalten 60 abgeschlossene Bot-Partien | `artifacts/backlog-dice-proof-release.log` |
| Bestehende Sprache, Bots, Programme und Start/Panels aller 55 Raumspiele auf Desktop/Touch | **67 bestanden, 0 fehlgeschlagen, 1 bewusst ausgelassen**, 8,1 min | `artifacts/backlog-dice-regression.log` |
| Solo-Katalog weiterhin getrennt, aktueller Raumspielbestand statt historischer 49er-Zahl | **2 bestanden, 0 fehlgeschlagen**, 8,2 s | `artifacts/backlog-dice-solo-catalog.log` |
| Echte Mehrspieler-Partien auf Desktop/Touch plus sechs Viewports | **7 bestanden, 0 fehlgeschlagen, 1 bewusst ausgelassen**, 40,2 s | `artifacts/backlog-dice-browser-release.log` |

Der ausgelassene Touch-Fall vermeidet nur eine zweite Ausführung derselben vollständigen Größenmatrix. 28 originale PNGs mit SHA-256 und Herkunft: [Bildmanifest BACKLOG-02](dice-screenshots.json). Ausgewählte Aufnahmen wurden visuell geprüft. Alle Aufnahmen stammen aus isolierten lokalen Testräumen.

| Spiel | Desktop | Handy |
| --- | --- | --- |
| Monsterwürfel | [Kooperative Würfel](screenshots/dice/desktop/monster-cooperative.png) | [Kooperative Würfel](screenshots/dice/mobil/monster-cooperative.png) |
| Würfeljagd | [Eigene Würfel](screenshots/dice/desktop/hunt-playing.png) · [Auflösung](screenshots/dice/desktop/hunt-reveal.png) | [Eigene Würfel](screenshots/dice/mobil/hunt-playing.png) |
| Würfel-Auktion | [Geheime Gebote](screenshots/dice/desktop/auction-private.png) · [Auflösung](screenshots/dice/desktop/auction-reveal.png) | [Auflösung](screenshots/dice/mobil/auction-reveal.png) |

## Gemeinsame Anbindung der ersten beiden Päckchen (historischer Stand)

Die Spiele verwenden die vorhandenen Räume, Anmeldung, Spieler-IDs, Socket.IO-Ereignisse, Host-Einstellungen, Zuschauer, Bots, Abendprogramme, Pause und Wiederverbindung. `turnGame`, `TurnRoom` und `PartyRoom` bleiben die Grundlage. Der bestehende Katalog und seine bisherigen Spielregeln bleiben erhalten; die sechs fertig implementierten Einträge verlassen `games/planned.js`. Ihre erledigten Roadmap-Punkte bleiben im ursprünglichen 41er-Abschnitt, damit der Nenner nicht schrumpft.

`BacklogKit` verwendet die bereits geprüfte Anfrage-Sperre aus `CardInteraction`, ohne einen Kartenauswahlmodus zu aktivieren. Anfragen warten auf den Server, doppelte ausstehende Eingaben werden blockiert, Offline-Eingaben werden nicht aufgestaut, und eine unbekannte Bestätigung verlangt bewusstes Neuladen des Spielstands. Entwürfe bleiben bei abgelehnten, weiterhin passenden Formularen erhalten. `pkForm` erhält dafür lediglich eine optionale `disabled`-Eigenschaft; bestehende Partyspiele verwenden ihren bisherigen Standard.

Die sechs neuen Spiele haben DE/EN-Beschriftungen und eigene Regeln. Technische IDs bleiben unverändert. Bestehende gemeinsame Altmeldungen können weiterhin unter „English (Beta)“ deutsch sein. Die neuen Oberflächen nutzen das bestehende Szenensystem und lokale SVG-Motive; es gibt keine neue Demo-Seite, zusätzliche Fotohintergründe oder 3D-Funktionen.

Die visuellen Pakete **VIS-055, VIS-056, VIS-057, VIS-059, VIS-084 und VIS-085 bleiben `planned`**. Sie sind als spielbar inventarisiert, aber ihr separates individuelles Redesign wird durch eine erste funktionierende Oberfläche nicht als erledigt ausgegeben. Nach BACKLOG-02 waren sieben visuelle Pakete erledigt und 100 geplant; nach BACKLOG-03 sind es zehn bzw. 97. Alle 107 VIS-IDs bleiben stabil. Keine V2-Funktionen wurden freigegeben oder umgesetzt.

## Tatsächliche Prüfungen

| Prüfung | Ergebnis | Protokoll |
| --- | --- | --- |
| Gesamter Node-Bestand nach Registrierung und Katalogpflege | **934 bestanden, 0 fehlgeschlagen**, 59,87 s | `artifacts/backlog-small-final-node.log` |
| Abschließender Gesamt-Node-Lauf nach den Aussteiger-/Abbruch-Sicherungen | **934 bestanden, 0 fehlgeschlagen**, 50,95 s | `artifacts/backlog-small-release-node.log` |
| Neue Spielregeln, Rechte, Geheimhaltung, Eingabegrenzen, veraltete Aufgaben, Pausenzeit, Gleichstand und Bot-Partien | **10 bestanden**; darin 90 vollständige Bot-Partien und 200 generierte Folgen-/Lücken-Prüfungen | `artifacts/backlog-small-node.log` |
| Neue Spiele plus Design-/Inventurprüfungen | **18 bestanden** | `artifacts/backlog-small-proof.log` |
| Echte neue Browser-Partien auf Desktop und Touch, inklusive aller drei Spiele in sechs Größen | **7 bestanden, 0 fehlgeschlagen, 1 bewusst ausgelassen**, 29,0 s | `artifacts/backlog-small-final-ui.log` |
| Story-Chaos nach der letzten Aussteiger-Sicherung, Desktop und Touch | **2 bestanden, 0 fehlgeschlagen**, 17,1 s | `artifacts/backlog-small-story-release.log` |
| Bestehende Sprach-, Katalog-, Bot-, Programm- und UI-Regressionen einschließlich Start/Panels aller 52 Raumspiele | **67 bestanden, 0 fehlgeschlagen, 1 bewusst ausgelassen**, 5,8 min | `artifacts/backlog-small-regression.log` |

Die ausgelassenen Fälle wiederholen dieselbe vollständige Viewport-Matrix nicht noch einmal im Touch-Projekt. Geprüfte Größen: 1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450. Die normale Playwright-Konfiguration bleibt unverändert. Jeder Browser-Test startet einen isolierten lokalen Server mit freien Ports und temporären Daten; private Ansichten werden mit getrennten Browserkontexten und echten menschlichen Testteilnehmern geprüft.

Der erste Node-Lauf meldete sechs veraltete Katalog-Sollwerte. Die erwarteten ID-/Namenslisten, Spieleranzahlen und Backlog-Pakete wurden um genau diese drei neuen Spiele fortgeschrieben; Regeln und Sicherheitsassertionen wurden nicht abgeschwächt. Im ersten Browserlauf bestand die gesamte Spielbedienung; die Größenmatrix hatte noch einen falschen Test-Cleanup-Aufruf. Der Test schließt jetzt seinen tatsächlichen Raum über `closeTable`, nutzt die bestehende Anmeldung korrekt weiter und besteht danach vollständig. Nach dem Gesamt-Node-Lauf wurden die Abbruch-/Aussteiger-Randfälle zusätzlich mit den zehn gezielten Regeltests nachgeprüft.

## Dauerhafte Bildnachweise

26 originale PNGs aus den echten lokalen Partien und der Viewport-Matrix: [Manifest mit SHA-256 und Herkunft](screenshots.json). Die Textprobe mit sichtbaren HTML-Zeichen ist absichtlich eine Sicherheitsprüfung; diese Zeichen werden nicht als HTML ausgeführt.

| Spiel | Desktop | Handy |
| --- | --- | --- |
| Risiko-Würfeln | [Würfeltisch](screenshots/desktop/risk-playing.png) | [Würfeltisch](screenshots/mobil/risk-playing.png) |
| Story-Chaos | [Private Ansicht](screenshots/desktop/story-private.png) · [Auflösung](screenshots/desktop/story-final.png) | [Private Ansicht](screenshots/mobil/story-private.png) · [Auflösung](screenshots/mobil/story-final.png) |
| Zahlenreihe | [Auflösung](screenshots/desktop/sequence-reveal.png) | [Auflösung](screenshots/mobil/sequence-reveal.png) |

Zusätzlich sind alle 18 Größenaufnahmen im Manifest enthalten. Bilder von Handy, Querformat und Auflösung wurden visuell angesehen. Es sind keine Produktivräume oder echten privaten Geschichten enthalten.

Implementierungscommit für BACKLOG-02: **[`8751c0baa542083eb0a9b7fb5bb35e55b6edc815`](https://github.com/TTLPSCWA/PokerAbend/commit/8751c0baa542083eb0a9b7fb5bb35e55b6edc815)**. Quellhashes beziehen sich auf dieses vorhandene Git-Objekt; der folgende Nachweis-Commit verändert keine Spielregeln.

## Weiterer Umfang

Implementierungscommit für BACKLOG-01: **[`69b46d6c98aaf5b9cc402a41782110f5386129c7`](https://github.com/TTLPSCWA/PokerAbend/commit/69b46d6c98aaf5b9cc402a41782110f5386129c7)**. Der folgende Nachweis-Commit verknüpft genau dieses bestehende Git-Objekt mit den tatsächlichen Quellhashes, 26 PNGs und Testergebnissen. Beide werden direkt auf `main` geführt.

Die verbleibenden **32 Spiele** stehen unverändert mit ihren bestehenden IDs und Regeln im Backlog. `plan.json` hält den Gesamtbestand als `in_progress` fest; der aktuelle Auftrag endet nach BACKLOG-03. Weitere Spiele benötigen einen neuen Auftrag. Die neun separat geplanten lokalen Solo-Spiele, die großen Projekte und die V2-Pakete gehören nicht zu dieser 41er-Rubrik.

Pushes auf `main` starten den bestehenden Test-/GHCR-Workflow. Eine Image-Veröffentlichung ist kein Produktivdeployment. Auf dem Produktivserver werden in diesem Auftrag keine Befehle ausgeführt und keine Daten geändert.
