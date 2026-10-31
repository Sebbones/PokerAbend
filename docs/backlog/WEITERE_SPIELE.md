# Weitere Spiele – Umsetzung in Spiele-Päckchen

Stand: 31.10.2026. Ausgangsstand `2dd1d4b12a9b9c03991272ca654b60f614c919ab`. Nutzerauftrag: die vorhandene Roadmap-Rubrik **„Weitere Spiele – 0 von 41 erledigt“** umsetzen. Ausdrücklich gewählte Reihenfolge: **zuerst Risiko-Würfeln, Story-Chaos und Zahlenreihe**. Fortschritt und tatsächliche Implementierungscommits: [plan.json](plan.json). Das ist ein Ausführungsprotokoll der bestehenden 41 IDs, keine zweite Quelle für neue Spielideen; Beschreibungen des verbleibenden Backlogs stehen weiterhin in `games/planned.js`.

## BACKLOG-01 – Die ersten drei kleinen Spiele

**Drei Spiele sind implementiert und geprüft. Öffentliche Roadmap: 3 von 41 erledigt, 38 offen.** Sie haben eigene Servermodule und Browseroberflächen und sind regulär im bestehenden Hub hostbar. Der Katalog umfasst jetzt **52 Raumspiele plus drei lokale Einzelspieler, insgesamt 55 spielbare Spiele**. Neue Branches, PRs oder Produktivdeployments wurden nicht angelegt.

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

## Gemeinsame Anbindung

Die Spiele verwenden die vorhandenen Räume, Anmeldung, Spieler-IDs, Socket.IO-Ereignisse, Host-Einstellungen, Zuschauer, Bots, Abendprogramme, Pause und Wiederverbindung. `turnGame`, `TurnRoom` und `PartyRoom` bleiben die Grundlage. Der bestehende Katalog und seine bisherigen Spielregeln bleiben erhalten; nur die drei fertigen Einträge verlassen `games/planned.js`. Ihre erledigten Roadmap-Punkte bleiben im ursprünglichen 41er-Abschnitt, damit der Nenner nicht schrumpft.

`BacklogKit` verwendet die bereits geprüfte Anfrage-Sperre aus `CardInteraction`, ohne einen Kartenauswahlmodus zu aktivieren. Anfragen warten auf den Server, doppelte ausstehende Eingaben werden blockiert, Offline-Eingaben werden nicht aufgestaut, und eine unbekannte Bestätigung verlangt bewusstes Neuladen des Spielstands. Entwürfe bleiben bei abgelehnten, weiterhin passenden Formularen erhalten. `pkForm` erhält dafür lediglich eine optionale `disabled`-Eigenschaft; bestehende Partyspiele verwenden ihren bisherigen Standard.

Die drei neuen Spiele haben DE/EN-Beschriftungen und eigene Regeln. Technische IDs bleiben unverändert. Bestehende gemeinsame Altmeldungen können weiterhin unter „English (Beta)“ deutsch sein. Die neuen Oberflächen nutzen das bestehende Szenensystem und lokale SVG-Motive; es gibt keine neue Demo-Seite, zusätzliche Fotohintergründe oder 3D-Funktionen.

Die visuellen Pakete **VIS-055, VIS-059 und VIS-085 bleiben `planned`**. Sie sind jetzt als spielbar inventarisiert, aber ihr separates individuelles Redesign wird durch eine erste funktionierende Oberfläche nicht als erledigt ausgegeben. Alle 107 VIS-IDs bleiben stabil; sieben visuelle Pakete sind erledigt, 100 geplant. Keine V2-Funktionen wurden freigegeben oder umgesetzt.

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

## Weiterer Umfang

Die verbleibenden **38 Spiele** stehen unverändert mit ihren bestehenden IDs und Regeln im Backlog. `plan.json` hält den Gesamtauftrag als `in_progress` fest; weitere Spiele werden erst nach ihrer tatsächlichen Implementierung und Prüfung als fertig vermerkt. Die neun separat geplanten lokalen Solo-Spiele, die großen Projekte und die V2-Pakete gehören nicht zu dieser 41er-Rubrik.

Pushes auf `main` starten den bestehenden Test-/GHCR-Workflow. Eine Image-Veröffentlichung ist kein Produktivdeployment. Auf dem Produktivserver werden in diesem Auftrag keine Befehle ausgeführt und keine Daten geändert.
