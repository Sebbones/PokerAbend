# UNO Ultimate und Spuknacht

Stand: 31.10.2026. Expliziter UNO-Folgeauftrag; Spiel-ID **`farbenchaos`**, bestehendes Designpaket **VIS-004**. Vorher-Basis: `cb1e3a460b2303a760862b87ea1c10699d695673`. Implementierungscommit: `dc2079a5862ba549cdcc9359c4a67157436ff1d9`. Aktuelle Status- und Nachweisdaten stehen in [VIS-004](game-visual-roadmap.json).

## Fünf dauerhaft auswählbare Varianten

| Variante / stabile ID | Karten und Rückseiten | Tisch und eigene Komponenten |
| --- | --- | --- |
| Classic / `classic` | Kräftige Farben, große Zahlen und Aktionszeichen, eigener gerahmter Rücken mit öffentlicher Restanzahl; dunkle Schrift auf gelben/grünen Karten | Dunkler moderner Kartentisch in Grün, gerahmte Zieh-/Ablagestapel und klare spielbare Karten |
| Flip / `flip` | Helle cremefarbene Vorderseiten mit kontrastreichen Werten; dunkle Seiten in Pink, Türkis, Orange und Violett | Heller bzw. dunkler Tisch, aktive Seite als Text; der Nachziehstapel zeigt ausschließlich die bereits vom Server freigegebene inaktive Seite |
| No Mercy / `no-mercy` | Dunkle kantige Karten, farbige Konturen und kontrastreiche Strafbereiche; +10 wird passend verkleinert | Dunkler intensiver Tisch, eigene Anzeige für Strafsumme und letzte Ziehkarte; öffentliche Liste ausgeschiedener Spieler |
| All Wild / `all-wild` | Dunkles Spektrum mit eigenen Zeichen für Richtung, Aussetzen, zweimal/alle Aussetzen, Ziehen, gezieltes Ziehen und Handtausch | Ruhige violett-/türkisfarbene Arena; unterschiedliche Aktionsformen erhalten ihre Bedeutung auch ohne Farbe |
| UNO: Spuknacht / `halloween-ghosthunt` | Ermittlungs-/Geisterkarten für sämtliche tatsächlich vorhandenen Classic-Kartentypen: Zahlen, Aussetzen, Richtung, +2, Farbwahl, +4. Eigener Rücken „Spukakte“, Ritual- und Geistermotive, klare Ziffern und Symbole | Dunkler Holztisch, eigene Nachtansicht eines Anwesens, Messgerät, Ermittlungsnotizen und UV-Lampe als statische Randdekoration. Eigenes Briefing, Status und Ergebnisgestaltung |

Spuknacht ist **dauerhaft verfügbar**, ohne Oktober- oder Datumsbeschränkung. Es ist eine richtige Variante des bestehenden UNO-Spiels, kein eigener Katalogeintrag. Angezeigter Titel: „UNO: Spuknacht“; Untertitel: „Halloween Special – Die Geisterjagd beginnt“.

## Regeln, Integration und Daten

Spuknacht verwendet unmittelbar dieselbe `Room`-Klasse wie Classic. Kein eigener Deckalgorithmus und keine kopierte Engine: 108 Classic-Karten und sämtliche vorhandenen konfigurierbaren Hausregeln bleiben erhalten. Dazu gehören Handgröße, Stapeln, 7–0, Ziehen bis passend, UNO-Ansage, +4-Beschränkung, Startkarteneffekt und Erwischen. Die eigentlichen Engine-Dateien `games/farbenchaos/room.js` und `games/farbenchaos/variants.js` bleiben unverändert, ebenso die Bot-Algorithmen.

Die neue ID wird in `games/variants.js` registriert und über `implementedVariants` der bestehenden Classic-Engine zugeordnet. Der reguläre Create-/Wechsel-/Restore-Pfad legt den Tisch an. Die fünf Vorschaukarten im Host-Menü ergänzen die vorhandene native Auswahl. Beide Bedienwege wählen dieselbe Variante. Während einer laufenden Partie ist die Auswahl wie bisher gesperrt.

Die normale Variantenwertung erhält für Spuknacht den eigenen Schlüssel **`farbenchaos~halloween-ghosthunt`** und den Namen „UNO: Spuknacht“. Classic-Daten werden nicht umgewidmet. Browser-Reconnect bleibt eine Wiederverbindung zum laufenden Raum; Server-Snapshots stellen wie bisher Spieler, Einstellungen, Variante, Punkte und Siege zwischen Runden wieder her. Es wird kein neues Speicherformat für laufende Kartenverteilungen eingeführt.

Die fehlenden Hint-/Sortierzuordnungen für dunkle Flip-Farben und weitere Sonderkarten wurden ergänzt. Keine Karten-IDs, Spielregeln, RNG oder Wertungsformeln geändert. Andere Spiele erhalten keine neue Gestaltung und kein V2-Paket wird implementiert.

## Gemeinsames Materialsystem und Geheimhaltung

Ein Frontend-Renderer zeichnet alle fünf Themen anhand der persönlichen Serveransicht. `kitShedding` reicht den aktuellen Zustand an den Kartenrenderer durch und unterstützt eine optionale Rückseite sowie optionale Zustands-/Darstellungshaken. Mau-Mau behält die bestehenden Fallbacks. Neue CSS-Regeln sind auf UNO bzw. die neuen UNO-Klassen begrenzt; `card-worlds.css`, Skip-Bo und Phase 10 wurden nicht geändert.

Verdeckte aktive Gegnerkarten und nicht freigegebene Kartenseiten werden nicht erzeugt, zwischengespeichert oder für Übergänge benutzt. Bei Flip bestehen die DOM-Ansichten ausschließlich aus der eigenen aktiven Seite sowie den ausdrücklich öffentlichen inaktiven Gegner-/Stapelansichten. Rücken von Classic, No Mercy, All Wild und Spuknacht hängen nur von Thema und öffentlicher Restanzahl ab. Namen bleiben escaped.

Alle Symbole sind eigene Inline-Vektoren. Die beiden neuen lokalen Dateien `haunted-manor.svg` und `investigation-tools.svg` sind eigens gezeichnete statische Hintergrund-/Randmotive. Die Host-Vorschauen stammen aus `games/farbenchaos/art.js`. Keine fremden Phasmophobia-Grafiken, Logos, Sounds, Modelle, Hotlinks oder neuen Rasterhintergründe; keine 3D-Darstellung.

## Bewegung, Sound und Bedienung

Tatsächliche öffentliche Zustandswechsel können kurze einmalige Effekte auslösen: Flip wechselt per zweidimensionaler Einblendung/Skalierung für **380 ms**; Kartenaktion, Rundenstart/-ende, Sieg und Ausscheiden verwenden einen thematischen Akzent für **440 ms**. Der Effekt hat nur den Namen des öffentlichen Ereignisses als lokalen Zustand. Ein frischer Reconnect oder das Betreten eines anderen Raums löst keinen nachträglichen Flip aus. Bestehende Animationen werden bei neuer Darstellung oder Pause abgebrochen.

`prefers-reduced-motion`, die persönliche Einstellung `prefs.calm` und der tatsächliche gemeinsame Status `gamePaused` unterdrücken diese Effekte. Es gibt keine dauernden Animationen, Flackerfolgen oder Jumpscares. Die vorhandenen abschaltbaren Spielsounds werden weiterverwendet; keine neuen Geräuschdateien, Audiozugriffe oder erhöhten Pegel. Kein Kamera- oder Mikrofonzugriff.

Handkarten bleiben lesbar und mindestens 44 Pixel breit im normalen Größenmodus; lange Hände lassen sich horizontal verschieben. Bestehende Vorschau, Lupe, Kartengrößen, Drag-and-drop und native Tastaturbedienung bleiben verfügbar. Sonderaktionen und runde Farbwahl behalten erreichbare eigene Flächen. Auf kleinen Displays scrollt die Hauptfläche vertikal, statt das gesamte Material zu verkleinern.

## Prüfung und Aufnahmen

- Vorher: **8 Browserfälle erfolgreich** für die vier vorhandenen Varianten, `artifacts/uno-ultimate-before.log`.
- Bestehende Varianten-/Darstellungstests: **44 bestanden**, `artifacts/uno-ultimate-first-node.log`.
- Neue Engine-/Material-/Effektprüfungen: 12 Fälle, einschließlich 60 vollständiger Spuknacht-Botpartien mit Erhaltung aller 108 Karten. Der erste Lauf hatte eine falsche Erwartung an das vorhandene Snapshotformat; der Test prüft nun das tatsächliche Wiederherstellungsverhalten.
- Vollständiger Node-Lauf: **892 bestanden, 0 fehlgeschlagen**, 46,3 Sekunden; `artifacts/uno-ultimate-full-node.log`. Nach den letzten Hinweis-/Sortierzuordnungen **24 gezielte Renderer-/Geheimhaltungsfälle erfolgreich**, `artifacts/uno-ultimate-render-final.log`.
- Die erste neue Browserrunde scheiterte in 10 Fällen an einem uneindeutigen Testselektor für die beiden vorhandenen Schließen-Schaltflächen. Danach blieben 2 Classic-Fälle wegen zweier vorhandener Host-Einstiege im Ergebniszustand: **8 bestanden, 2 fehlgeschlagen**. Beide Testselektoren sind präzisiert. Der anschließende Lauf bestand mit **10 Fällen**, `artifacts/uno-ultimate-release.log`.
- Relevante Browserregression: **189 bestanden, 0 fehlgeschlagen, 1 bestehender Skip**, 10,5 Minuten; `artifacts/uno-ultimate-regression.log`. Die 190 Fälle aus 11 Dateien umfassen die gemeinsamen Host-/Varianten-/Kartenkomponenten, alle registrierten Spieloberflächen, Bots, Lupe, Sprachen, Sitzungen und mobile Darstellung.
- Abschließende Aufnahmen und vollständige Varianten-/Statistikprüfung: **10 bestanden**, 55,0 Sekunden; `artifacts/uno-ultimate-final-capture.log`. Nach der letzten Kontrastkorrektur zusätzlich **2 Flip-Fälle bestanden**, 14,6 Sekunden; `artifacts/uno-ultimate-contrast.log`. Der Kontrast der hellen Flip-Wildcard-Werte wird dabei gegen 4,5 geprüft.

Alle fünf Varianten werden auf **1920×1080, 1440×900, 768×1024, 390×844, 360×800 und 900×450** geprüft; zusätzlich mobile Touch-Kontexte. Echte isolierte Räume enthalten Host, Gast und Zuschauer. Geprüft werden native/visuelle Auswahl, Create, Lobby, Start, eigene/Gegner-/Zuschaueransicht, Hand-/Rückseitenthema, Pause, Englisch, identische Hand nach Reconnect, Host-Sperre, Ergebnis und Wechsel von Classic zu Spuknacht. Die Spuknacht-Wertung wird über die echte Bestenlisten-API getrennt von Classic abgefragt. Die neue Flip-Animation wird im Browser mit normaler, reduzierter und persönlich beruhigter Bewegung geprüft.

Material-Kontaktbögen enthalten ausschließlich bekannte Kartentypen, keine tatsächlich verdeckten Karten. Strafketten-/Ausscheidungs- und dunkle Farbwahl-Aufnahmen verwenden ausdrücklich kontrollierte reine Anzeigefiktionen. Vor echten Aktionen wird neu geladen und der tatsächliche Serverzustand wiederhergestellt. Diese Kontaktbögen sind Testinstrumentierung; es entsteht keine zusätzliche Demo-Seite oder Produktoberfläche.

Weitere Abschlussnachprüfung: **2 Spuknacht-Fälle bestanden**, 12,3 Sekunden, `artifacts/uno-ultimate-ghost-final.log`; die Ergebnisaufnahmen verwenden dieselbe Portrait-/Desktopgröße wie die übrigen Zustandsbilder. Die echte getrennte Statistikabfrage ist erneut erfolgreich.

## Bildnachweise und betroffene Dateien

Die **42** ausgewählten dauerhaften Bilder liegen unter `docs/design/screenshots/uno-ultimate/`. Das [Bildmanifest](uno-ultimate-screenshots.json) trennt versionierte Vergleiche mit SHA-256-Prüfsummen von ignorierten lokalen Aufnahmen. Für die neue Spuknacht existiert naturgemäß kein Vorher-Spielzustand. Zufällige Hände und Raumcodes unterscheiden sich zwischen Vorher und Nachher.

| Variante | Tisch vorher/nachher | Kartenmaterial nachher |
| --- | --- | --- |
| Classic | [Vorher](screenshots/uno-ultimate/classic-before-table-desktop.png) · [Nachher](screenshots/uno-ultimate/classic-after-table-desktop.png) | [Vorder-/Rückseiten](screenshots/uno-ultimate/classic-material-0.png) |
| Flip | [Vorher](screenshots/uno-ultimate/flip-before-table-desktop.png) · [Nachher](screenshots/uno-ultimate/flip-after-table-desktop.png) | [Hell](screenshots/uno-ultimate/flip-material-0.png) · [Dunkel](screenshots/uno-ultimate/flip-material-1.png) |
| No Mercy | [Vorher](screenshots/uno-ultimate/no-mercy-before-table-desktop.png) · [Nachher](screenshots/uno-ultimate/no-mercy-after-table-desktop.png) | [Vorder-/Rückseiten](screenshots/uno-ultimate/no-mercy-material-0.png) |
| All Wild | [Vorher](screenshots/uno-ultimate/all-wild-before-table-desktop.png) · [Nachher](screenshots/uno-ultimate/all-wild-after-table-desktop.png) | [Vorder-/Rückseiten](screenshots/uno-ultimate/all-wild-material-0.png) |
| Spuknacht | [Desktop](screenshots/uno-ultimate/halloween-ghosthunt-after-table-desktop.png) · [Handy](screenshots/uno-ultimate/halloween-ghosthunt-after-table-mobile.png) · [Querformat](screenshots/uno-ultimate/halloween-ghosthunt-landscape.png) | [Vorder-/Rückseiten](screenshots/uno-ultimate/halloween-ghosthunt-material-0.png) |

Weitere Nachweise: [Host-Auswahl](screenshots/uno-ultimate/halloween-ghosthunt-host-menu-desktop.png), [Strafkette/Ausscheiden](screenshots/uno-ultimate/no-mercy-penalty-elimination.png), [dunkle Farbwahl](screenshots/uno-ultimate/flip-dark-colour-choice.png), [Pause](screenshots/uno-ultimate/halloween-ghosthunt-paused.png), [Englisch](screenshots/uno-ultimate/halloween-ghosthunt-english.png), [Ergebnis](screenshots/uno-ultimate/halloween-ghosthunt-result.png). Mobile Vorher-/Nachher- und Lobbybilder sind ebenfalls im Manifest enthalten.

Betroffene Produktdateien: `games/farbenchaos/index.js`, `games/farbenchaos/art.js`, `games/variants.js`, `public/games/farbenchaos/farbenchaos.js/.css`, die beiden neuen SVGs, `public/games/kit.js`, `public/hub.js`, `public/variants.js/.css`, `public/i18n-en.js`. Dazu gehören die neuen Engine-/Browserprüfungen und die aktualisierten VIS-004-Nachweise.

## Abschließender Code- und Nachweisstand

Hauptimplementierung: `852d2e1112281dc3cc6f0ee3826955c997b4df64`. Letzte Absicherung gegen Übergangseffekte zwischen unterschiedlichen Räumen: `dc2079a5862ba549cdcc9359c4a67157436ff1d9`, gezielt mit **12 Tests** geprüft. Nach dem finalen Code und der Roadmap-Pflege erneut **892 Node-Tests bestanden, 0 fehlgeschlagen**, 46,4 Sekunden; `artifacts/uno-ultimate-final-node.log`. **6 Planungstests** einschließlich aller dauerhaften Bildprüfsummen sind erfolgreich. Die übrigen **94 Paketeinträge** sind unverändert zur Vorher-Basis.

## Abschluss und Grenzen

Die bestehende Kennzeichnung „English (Beta)“ gilt weiterhin für bisherige Detailregeln; neue Variantenbeschreibungen und Themenbeschriftungen sind zweisprachig. Serverneustarts nutzen unverändert die bestehende Snapshotstrategie zwischen Runden. Weitere Spiele und die historische V2-Planung bleiben außerhalb dieses Auftrags.

Vor dem Push werden Remote-Stand und bekannte Automatik geprüft. Der vorhandene GitHub-Workflow führt Tests mit Node 22 aus und veröffentlicht das GHCR-Image. Kein eigenständiger Produktivdeploy und keine Änderungen an produktiven Daten. Nach diesem UNO-Auftrag wird kein weiteres Paket begonnen.

## Späterer Bedienungsauftrag

[Karten-Interaktion UX V1](CARD_INTERACTION_UX.md) ergänzt anschließend für alle fünf UNO-Welten die sichere Auswahl mit ausdrücklicher Bestätigung. Designs, Kartenmaterialien und Spielregeln dieses historischen UNO-Ultimate-Stands bleiben erhalten; die neue Bedienung hat eigene Tests und Bildnachweise.
