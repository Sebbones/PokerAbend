# UNO, Skip-Bo und Phase 10 – individuelle Kartenwelten

Stand: 31.10.2026. Ausdrücklich beauftragter Folgeauftrag für **VIS-004 / `farbenchaos`**, **VIS-009 / `stapelrennen`** und **VIS-008 / `zehnetappen`**. Vorher-Basis: `c4bb90e25245d6a46d64e5b7378d32d7f86b5f5a`. Implementierungscommit: `84cccbc5795ac9b0a28c5a6723526d8d7affc2e6`; Status und Nachweise stehen in der [zentralen Planung](game-visual-roadmap.json).

## Tatsächliche Änderungen

| Spiel | Vorher | Neue Oberfläche |
| --- | --- | --- |
| UNO | Standardlobby, generischer Tisch, sehr kleine zentrale Karten | Eigene grafische Farbarena mit dunklem ruhigem Rahmen, Kartenfächer in der Lobby, deutlich größerer Ablage, Farb-/Richtungsleiste und aktiver Flip-Seite |
| Skip-Bo | Ähnliche Stapel ohne starke räumliche Zuordnung | Helle gemeinsame Baustelle mit vier nummerierten Reihen, nächster Zahl und Fortschritt; eigener Bereich mit vier Ablagen und separatem Zielstapel; eigener Partnerbereich |
| Phase 10 | Gruppenauswahl im Dock beanspruchte auf dem Handy fast die gesamte Höhe | Phasenziel, Zugschritte, Gruppierung und öffentliche Auslagen auf der Arbeitsfläche; Hand und Bestätigungen im Dock; zwei Gruppen auf dem Handy untereinander |

Alle drei Spiele erhalten ein eigenes Briefing mit Varianteninformationen, belegten Plätzen und drei kurzen Bedienhinweisen. Die bisherigen Kartenmotive, Werte, Farbsymbole und lokalen SVG-Zeichen bleiben erhalten und bekommen einen ruhigeren Materialrahmen. Ergebnisdialoge ergänzen die bestätigte Serverwertung, ohne aus einem Aufgeben fälschlich einen vollständig geleerten Stapel abzuleiten.

Lange UNO-Hände bleiben durch horizontales Verschieben mit vollen Kartenflächen erreichbar. Die bisherige Kartenvorschau und Lupe bleiben vorhanden. Farbwahlknöpfe haben feste runde Flächen; auch die dunklen Flip-Farben bleiben beim Hover erhalten. Interaktive Handkarten und Gruppenkarten haben im normalen Größenmodus mindestens 44 Pixel Breite. Kleine öffentliche Karten sind reine Anzeige und über die bestehende Lupe vergrößerbar. Auf kleinen Bildschirmen scrollt die Arbeitsfläche vertikal; bei sehr großen Phase-10-Händen darf zusätzlich das begrenzte Dock scrollen. Es wird kein vollständiger Tisch durch unlesbar kleine Karten erzwungen.

## Architektur und Grenzen

- `public/games/card-worlds.css` wird nur von den drei beauftragten Spielstyles importiert. Rahmenregeln sind auf ihre Spiel-Roots begrenzt; jedes Spiel hat eigene Palette, Komposition und Spielmaterialbereiche.
- `kitShedding` reicht die bereits vorhandenen optionalen Präsentationshaken `lobby`, `ring` und `resultExtra` durch und bietet einen optionalen `tableIntro`-Bereich. Ohne Haken bleiben bisherige Darstellungen erhalten. Mau-Mau und andere Spiele erhalten keine neue Farbwelt.
- Bei Phase 10 ist ausschließlich der bestehende Renderer der Gruppenauswahl aus dem Dock in eine Hilfsfunktion für die Hauptfläche verschoben. Gruppenprüfung, Jokerwerte, Karten-IDs, Socket-Ereignisse und Aktionshandler bleiben erhalten.
- Server, Engines, Bots, RNG, Kartensätze, Variantenregeln, Pause/Reconnect und persistierte Daten wurden nicht verändert. Unter `games/` ändert sich nur die öffentliche Roadmap. Kein V2-Paket oder neues Spiel wurde implementiert.
- Lobbygrafiken sind statische eigene CSS-Kompositionen aus vorhandenen Karten, keine Darstellung geheimer Hände. Aktuelle Angaben kommen aus der persönlichen Serveransicht. Namen werden escaped. Keine neuen externen Bilder, Original-Logos, Buildpipeline oder 3D-Funktionen.
- Neue Beschriftungen sind auf Deutsch und Englisch verfasst. Bestehende Auswahl und Farbwahl bleiben bei Sprachwechsel erhalten.

Die vorhandene Kennzeichnung „English (Beta)“ bleibt zutreffend: Einzelne bestehende serverseitige Phasenbeschreibungen und Detailhinweise verwenden weiterhin den deutschen Fallback. Dieser Designauftrag schließt die vorhandene Übersetzungsabdeckung nicht vollständig ab.

## Varianten und Zustandsprüfung

| Spiel | Varianten | Zusätzliche Prüfungen |
| --- | --- | --- |
| UNO | Classic, Flip, No Mercy, All Wild | Helle/dunkle Flip-Seite und erlaubte inaktive Rückseiten, dunkle Farbwahl, Ziehstrafe/Anfechten, Zielwahl für Handtausch, 24-Karten-Hand mit Scroll und Tastaturfokus |
| Skip-Bo | Classic, kurze Partie, Team | Quellenwahl, Spielstapel und Baureihen, Abwerfen als Zugende, ausschließlich offene Partnerquellen mit korrekter Besitzer-ID |
| Phase 10 | Classic, kurze Partie, Team | Zwei Gruppen, gültige/ungültige Sechserfolge, feste Jokerwerte, Anlegeziele mit beiden Enden und separater Abwurfmodus |

Für alle zehn Varianten: echte isolierte Räume mit Host, Gast und Zuschauer; bei Teams vier Mitspieler. Lobby mit fehlenden Spielern, bereite Lobby, eigener Zug, Warten, Zuschauer, Hostpause, Englisch, Wiederverbindung mit identischer eigener Hand und echtes Ergebnis nach Ausstieg wurden aufgenommen. Die drei klassischen Spiele führen zusätzlich echte Kartenaktionen über die vorhandenen Buttons aus.

Die Standardansichten laufen auf **1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450**. Varianten zusätzlich auf Desktop und Handy. Kein horizontaler Seitenüberlauf, erreichbarer Dockrahmen, reduzierte Bewegung und Browserfehler werden geprüft. Geheimhaltungsprüfungen verändern verdeckte Karten bei gleichbleibendem öffentlichen Zustand und vergleichen die erzeugten Arbeitsflächen anderer Spieler/Zuschauer. Bei Flip bleiben die absichtlich öffentlichen inaktiven Kartenseiten ausgenommen.

Besonders dichte Sonderzustände werden als ausdrücklich markierte **reine Client-Anzeigefiktionen** erzeugt (`fixture-*`). Sie ändern keine Räume, Kartenverteilung oder Regeln. Vor echten Aktionen wird immer neu geladen und der tatsächliche Serverzustand wiederhergestellt. Zufällig ausgeteilte Hände und Raumcodes unterscheiden sich zwischen Vorher/Nachher; die Bilder sind Zustands-/Layoutvergleiche, keine pixelidentischen Zufallsverteilungen.

## Prüfprotokoll

- Vorher-Aufnahmen: **20 Browserfälle bestanden**, `artifacts/cards-before.log`.
- Neue Geheimhaltungs-/Darstellungsprüfungen: **12 bestanden**. Der erste Lauf hatte eine falsche Annahme über die zufällig aktive Flip-Seite; der Test setzt nun die darzustellende Seite ausdrücklich.
- Vollständiger Node-Lauf: **879 bestanden, 0 fehlgeschlagen**, 48,4 Sekunden; `artifacts/cards-full-node.log`. Nach der abschließenden Planungs-/Nachweispflege erneut **879 bestanden**, 46,2 Sekunden; `artifacts/cards-final-node.log`. Zusätzlich **6 Planungstests erfolgreich**, einschließlich der Bildprüfsummen und der tatsächlichen Abschlussdaten. Die anderen 92 Paketeinträge wurden unverändert gegen die Vorher-Basis verglichen.
- Erster gezielter Browserlauf einschließlich gemeinsamer Spielmotive: **43 bestanden, 1 fehlgeschlagen**. Der neue mobile UNO-Test hatte die bestehende Vorschau beim ersten Tipp übergangen. Die Prüfung berücksichtigt jetzt den zweiten Tipp.
- Abschließender gezielter Lauf für alle zehn Varianten, Phase-10-Gruppen und öffentliche DE/EN-Roadmap: **26 bestanden**, `artifacts/cards-final-focus.log`.
- UNO mit langen Händen: **8 bestanden**, `artifacts/cards-long.log`; zusätzliche Sonderansichten für Flip/No Mercy/All Wild: **8 bestanden**, `artifacts/cards-variants.log`.
- Vollständige Browser-Suite: **347 bestanden, 0 fehlgeschlagen, 1 bestehender Skip**, 17,2 Minuten; `artifacts/cards-full-ui.log`. Der Skip betrifft eine mobile Wiederholung der bereits auf sechs Größen laufenden Hub-Prüfung.
- Nach den letzten ausschließlich auf diese Spiele begrenzten CSS-Nachbesserungen: **26 gezielte Browserfälle bestanden**, 1,4 Minuten; `artifacts/cards-release-focus.log`. Dieser abschließende Lauf prüft erneut alle zehn Varianten, Gruppenbedienung, Roadmap, runde Flip-Farbwahl mit unveränderter Hoverfarbe sowie sichtbare Skip-Bo-Baureihen und Zielstapel im Querformat. Screenshots wurden danach erneut archiviert.

## Dauerhafte Bildvergleiche

Das [Bildmanifest](card-worlds-screenshots.json) enthält die SHA-256-Prüfsummen der **25 dauerhaft versionierten PNGs** sowie eine getrennte Liste lokaler Aufnahme-Artefakte einschließlich Zwischenständen. Nur die Dateien unter `docs/design/screenshots/` sind dauerhafte Repository-Nachweise.

| Spiel / Ansicht | Vorher | Nachher |
| --- | --- | --- |
| UNO Lobby, Desktop | [Bild](screenshots/farbenchaos/before-lobby-desktop.png) | [Bild](screenshots/farbenchaos/after-lobby-desktop.png) |
| UNO Tisch, Desktop | [Bild](screenshots/farbenchaos/before-table-desktop.png) | [Bild](screenshots/farbenchaos/after-table-desktop.png) |
| UNO Tisch, Handy | [Bild](screenshots/farbenchaos/before-table-mobile.png) | [Bild](screenshots/farbenchaos/after-table-mobile.png) |
| Skip-Bo Lobby, Desktop | [Bild](screenshots/stapelrennen/before-lobby-desktop.png) | [Bild](screenshots/stapelrennen/after-lobby-desktop.png) |
| Skip-Bo Tisch, Desktop | [Bild](screenshots/stapelrennen/before-table-desktop.png) | [Bild](screenshots/stapelrennen/after-table-desktop.png) |
| Skip-Bo Tisch, Handy | [Bild](screenshots/stapelrennen/before-table-mobile.png) | [Bild](screenshots/stapelrennen/after-table-mobile.png) |
| Skip-Bo Spielstapel-Auswahl, Handy | [Bild](screenshots/stapelrennen/before-stock-mobile.png) | [Bild](screenshots/stapelrennen/after-stock-mobile.png) |
| Skip-Bo im Querformat | [Bild](screenshots/stapelrennen/before-landscape.png) | [Bild](screenshots/stapelrennen/after-landscape.png) |
| Phase 10 Lobby, Desktop | [Bild](screenshots/zehnetappen/before-lobby-desktop.png) | [Bild](screenshots/zehnetappen/after-lobby-desktop.png) |
| Phase 10 Tisch, Desktop | [Bild](screenshots/zehnetappen/before-table-desktop.png) | [Bild](screenshots/zehnetappen/after-table-desktop.png) |
| Phase 10 Tisch, Handy | [Bild](screenshots/zehnetappen/before-table-mobile.png) | [Bild](screenshots/zehnetappen/after-table-mobile.png) |
| Phase 10 zwei Gruppen, Handy | [Bild](screenshots/zehnetappen/before-groups-mobile.png) | [Bild](screenshots/zehnetappen/after-groups-mobile.png) |

Zusätzlich: [UNO mit 24 Karten auf dem Handy](screenshots/farbenchaos/after-long-hand-mobile.png). Lobby, Tisch, Sonderaktionen sowie die kritischen kleinen Bildschirmgrößen wurden manuell angesehen. Die überfüllte frühere Phase-10-Auswahl, zu kleine Touch-Flächen, überlappender Hilfeknopf und die Flip-Hoverfarbe wurden dabei nachgebessert.

## Veröffentlichung und verbleibender Umfang

Die drei VIS-Pakete sind nach den tatsächlichen Prüfungen samt Implementierungscommit als `done` dokumentiert. Die übrigen **91 VIS-Pakete** bleiben geplant: 45 weitere spielbare Spiele und 46 Backlog-Konzepte. Die öffentliche Roadmap bündelt diese drei Kartenwelten in einem erledigten Punkt; die noch ausstehenden allgemeinen Verbesserungen bleiben offen. V2-Statusangaben bleiben unverändert.

Der bekannte Workflow `.github/workflows/docker.yml` führt bei einem Push auf `main` Tests mit Node 22 aus und baut/veröffentlicht das GHCR-Image. Die geprüften Compose-/Workflowdateien enthalten keinen automatischen Produktivdeploy. Es ist keine zusätzliche externe Deploymentautomatik bekannt. Kein manueller Produktivdeploy und keine Änderung von Produktivdaten.

## Späterer UNO-Folgeauftrag

Dieser Bericht und seine Bilder dokumentieren den historischen Kartenwelten-Stand `84cccbc`. UNO wurde anschließend ausdrücklich allein mit fünf Themen und der Spuknacht-Variante weiterentwickelt: [UNO Ultimate / Spuknacht](UNO_ULTIMATE_REDESIGN.md). Die hier dokumentierten Skip-Bo- und Phase-10-Oberflächen wurden dabei nicht verändert.

Der spätere Auftrag [Karten-Interaktion UX V1](CARD_INTERACTION_UX.md) überarbeitet die Bedienung aller drei Piloten einschließlich ihrer Varianten. Die ursprünglichen Designs und historischen Bildnachweise bleiben erhalten; sichere Auswahl, bestätigte Aktionen, Status und neue Vorher-/Nachher-Abnahme sind separat dokumentiert.
