# Karten-UX – individuelle Folgeplanung

Stand der ursprünglichen Inventur: 31.10.2026, **13 registrierte Kartenspiele**. Maschinenlesbare Quelle: [card-interaction-roadmap.json](card-interaction-roadmap.json). UNO, Skip-Bo und Phase 10 sind die drei ausdrücklich beauftragten Piloten. Alle folgenden zehn Pakete bleiben **planned**, ohne Implementierungsfreigabe.

Nachtrag 01.11.2026: Der gesonderte Auftrag BACKLOG-03 ergänzt Hearts und Five Card Draw; aktuell gibt es **15 registrierte Kartenspiele**. Die neuen Spiele verwenden ausdrücklich bestätigte Kartenauswahl und sind als `post_baseline_games` erfasst. Die ursprünglichen 13 CUX-Pakete und ihre zehn geplanten Folgeaufträge bleiben erhalten. Die beauftragte Wiederverwendung der Poker-Chipanimationen ist eine eng begrenzte gemeinsame Auslagerung für Hold’em, Omaha und Draw, kein abgeschlossenes Poker-/Omaha-UX-Paket. Originale Quellhashes bleiben im JSON erhalten; aktuelle Hashes und vier echte Browserregressionen dokumentieren die Auslagerung. Details: [Five Card Draw](../../games/five-card-draw/README.md).

Nach BACKLOG-04 sind zusätzlich Omaha Hi/Lo, Short Deck Poker und Seven Card Stud als eigene Spiele mit wiederverwendeten Poker-Aktionen implementiert: **18 registrierte Kartenspiele**. Sie stehen mit echten Spiel-Commits in `post_baseline_games`. Die ursprünglichen 13 CUX-Pakete, drei Piloten und zehn geplanten Folgeaufträge bleiben erhalten. Dieser Auftrag implementiert kein geplantes CUX-Paket für die alte Hold’em-/Omaha-Oberfläche. Spielregeln, JSON-Geheimhaltung, sechs Größen und Desktop-/Handy-Abnahme: [BACKLOG-04](../backlog/WEITERE_SPIELE.md).

Diese Prüfung ist ein individueller Quellcode-Audit gegen `18451f45110be4773565466db8b4715779d5cfe1`, keine behauptete manuelle Safari-Abnahme der weiteren Spiele. Die konkrete Umsetzung und Browserabnahme der Piloten steht in [CARD_INTERACTION_UX.md](CARD_INTERACTION_UX.md). CUX-IDs sind unabhängig von bestehenden VIS-/V2-IDs. Gleiche Renderer (Poker/Omaha) erhalten eigene game_id-bezogene Abnahmen; nicht implementierte Backlog-Spiele wie Solitaire sind kein registriertes Kartenspiel in dieser Inventur.

## CUX-004 – Mau-Mau

ID: `maumau` · **planned** · P1 · grob 4–7 Stunden · Bezug VIS-003. Eigene Freigabe erforderlich.

Quelle: [public/games/maumau/maumau.js](../../public/games/maumau/maumau.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** kitShedding spielt normale Karten sofort. Auf überlappenden Mobilhänden wird zuerst vergrößert, danach gespielt. Farbwahl ist ein zusätzlicher Zustand; Handkarten werden nach Wert adressiert.

**Konkrete Befunde:**

- Desktop-Klick und mobiler Ersttipp haben unterschiedliche Folgen.
- Ein erneuter Tipp kann einen Zug auslösen, statt die Auswahl aufzuheben.
- Auswahl ist hauptsächlich eine Farbwahl-Vorbereitung; der allgemeine Auswahlzustand hat kein aria-pressed.

**Individueller Plan:**

- Den sicheren Shedding-Adapter nur nach eigener Freigabe übernehmen.
- Französisches/deutsches Blatt, Bube-Wunsch, Ziehstapeln und Mau-Meldungen unverändert lassen.
- Spielbare Karte auswählen, passende Ablage beziehungsweise explizites Ausspielen bestätigen; Wunsch separat.

**Gegner-/Statusinformationen:** Die öffentliche Restkartenzahl und der aktive Spieler sind vorhanden, aber nur als kleine Zusatzzeilen. Nicht die Hand anderer Spieler als Vorschau verwenden.

**Komponenten und Drag-and-drop:** Kit, deckCard/DECK, kitShedding; vorhandenes Desktop-DnD auf die Ablage.

**Separater bestehender Bot-Befund:** Der unveränderte Massentest kann bei sieben Spielern mit neun Karten, leerem Nachziehstapel und aktiver Ass-Regel hängen bleiben: Bot0 zieht/legt wiederholt dieselbe `Ad`, bleibt am Zug und überschreitet die 600-Schritte-Grenze. Im UI-Auftrag wurden weder diese Engine noch der Bot verändert. Ein eigener Folgeauftrag muss den Bot-Zyklus mit einer festen Austeilung reproduzieren und beheben; nicht den Test abschwächen oder die Ass-Regel im Rahmen dieser UX-Arbeit ändern. Nachweis und Prüfverlauf: [Abnahmebericht](CARD_INTERACTION_UX.md#bestehender-befund-außerhalb-der-piloten).

**Abnahme für einen späteren Auftrag:**

- [ ] Derselbe normale Klick wählt auf Desktop und Touch nur aus.
- [ ] Bube wird erst nach ausdrücklich gewählter Farbe gespielt.
- [ ] Beide Blätter, Stapeln, Nachziehen und Mau-Regeln bleiben erhalten.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-005 – Durak

ID: `durak` · **planned** · P1 · grob 6–10 Stunden · Bezug VIS-023. Eigene Freigabe erforderlich.

Quelle: [public/games/durak/durak.js](../../public/games/durak/durak.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Angriff: Karte wählen und Angreifen. Verteidigung: Karte wählen und Angriffskarte antippen; bei genau einem offenen Angriff spielt ein zweiter Tipp auf dieselbe Handkarte sofort.

**Konkrete Befunde:**

- Der erneute Tipp ist abhängig von der Anzahl offener Angriffe entweder Abwählen oder Verteidigen.
- Angriffsknöpfe erhalten bei irgendeiner Auswahl einen Handler, auch wenn beats() für die gewählte Karte false ergibt.
- Auswahl wird vor der Serverantwort gelöscht.

**Individueller Plan:**

- Wiederholter Kartentipp soll immer nur abwählen; Verteidigung benötigt ein ausdrücklich gewähltes Angriffsziel.
- Nur mit beats() kompatible Ziele aktivieren und die Rollen Angreifer/Verteidiger/Taking deutlich trennen.
- Quelle bis zur Serverbestätigung erhalten; Aufnehmen und Genug bleiben eigenständige Aktionen.

**Gegner-/Statusinformationen:** Kartenzahl und Rolle sind öffentlich vorhanden. Beide Rollen und Nachwerfberechtigung müssen den Status bestimmen; kein pauschaler UNO-Zugstatus.

**Komponenten und Drag-and-drop:** Kit und frenchCard, eigene sortHand/sel/Beats-Anzeige; kein eigener DnD-Adapter.

**Abnahme für einen späteren Auftrag:**

- [ ] Eine einzelne offene Angriffskarte bewirkt keinen Sonderfall beim Abwählen.
- [ ] Ungültiges Verteidigungsziel sendet keinen Zug.
- [ ] Trumpf, Rollenwechsel, Nachwerfen und Aufnehmen behalten ihre Serverregeln.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-006 – 6 nimmt!

ID: `sechs-nimmt` · **planned** · P1 · grob 5–8 Stunden · Bezug VIS-044. Eigene Freigabe erforderlich.

Quelle: [public/games/sechs-nimmt/sechs-nimmt.js](../../public/games/sechs-nimmt/sechs-nimmt.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Ein Klick auf eine Handkarte sendet choose unmittelbar. Der Server bindet diese verdeckte Auswahl; ein zweiter choose wird abgelehnt. Reihenwahl ist ein eigener bestätigender Knopf.

**Konkrete Befunde:**

- Ein versehentlicher erster Klick bindet eine unwiderrufliche verdeckte Karte.
- Es fehlt eine lokale Vorschau-/Abwahlstufe vor choose.
- Öffentliche Kartenzahl wird im Bereit-Zustand durch das Bereit-Häkchen ersetzt.

**Individueller Plan:**

- Lokale Zahl auswählen und erst mit Verdeckt bestätigen senden.
- Status gleichzeitig für alle Unfertigen anzeigen, danach Warten und Aufdecken unterscheiden.
- Öffentliche Restkartenzahl neben bereit/nicht bereit erhalten; weder gegnerische Werte noch eine absehbare Zuordnung des Kartenpools verraten.

**Gegner-/Statusinformationen:** Die Auswahlphase ist simultan. Ein einzelner turnId reicht als Zugstatus nicht aus; ready ist für jeden Spieler separat öffentlich.

**Komponenten und Drag-and-drop:** Kit und eigener Zahlenrenderer, eigener pick/row/reveal-Ablauf; kein DnD.

**Abnahme für einen späteren Auftrag:**

- [ ] Vor Bestätigung bleibt chosen auf dem Server leer.
- [ ] Nach Bestätigung ist keine Änderung vorgetäuscht möglich.
- [ ] Reihenwahl, Profi/Taktik, Gleichzeitigkeit und automatische Timerwahl bleiben korrekt.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-007 – Schwimmen

ID: `schwimmen` · **planned** · P2 · grob 4–7 Stunden · Bezug VIS-010. Eigene Freigabe erforderlich.

Quelle: [public/games/schwimmen/schwimmen.js](../../public/games/schwimmen/schwimmen.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Eine Quelle aus Hand oder Mitte wählen, danach eine Karte der anderen Seite antippen und sofort tauschen. Alle drei tauschen, Schieben und Klopfen sind eigene Knöpfe.

**Konkrete Befunde:**

- Die Quelle wird nur über Seite und Index gehalten; eine passende Handänderung bei gleichem Zug kann diese Referenz verschieben.
- Auswahl hat eine visuelle sel-Klasse, aber kein aria-pressed.
- Tauschauswahl wird vor Bestätigung gelöscht; Status zu letzter Runde/Klopfen ist hauptsächlich Fließtext.

**Individueller Plan:**

- Einzeltausch mit zustandsgebundenem Quellschlüssel und beschriftetem Mittelkarten-Ziel vereinheitlichen.
- Bestehenden zweiten Zielschritt erhalten; nicht noch eine unnötige Bestätigung nach jedem Ziel erzwingen.
- Klopfen/letzte Runde und Leben prominent machen; die immer drei Karten nicht als schrumpfendes UNO-Ziel darstellen.

**Gegner-/Statusinformationen:** Gegnerinformationen sind Leben/Badges, keine frei einsehbaren Handwerte. Kartenzahl ist hier kein Fortschrittsziel.

**Komponenten und Drag-and-drop:** Kit, deckCard und eigener sel; vorhandenes Hand-zu-Mitte-DnD.

**Abnahme für einen späteren Auftrag:**

- [ ] Hand-/Mitte-Updates verwerfen ungültige Quellen zuverlässig.
- [ ] Klick, Touch und optionales DnD tauschen dieselben zwei Karten.
- [ ] Alle drei tauschen, Leben und Klopfen bleiben unverändert.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-008 – Mogeln

ID: `mogeln` · **planned** · P2 · grob 5–8 Stunden · Bezug VIS-021. Eigene Freigabe erforderlich.

Quelle: [public/games/mogeln/mogeln.js](../../public/games/mogeln/mogeln.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Mehrere Karten über Set auswählen, dann als geforderten Rang ablegen. Mogeln! ist ein separates Reaktionsfenster. Volle Kartenwerte dienen als eindeutige Schlüssel im einzelnen Deck.

**Konkrete Befunde:**

- Auswahlklassen haben keine aria-pressed-Semantik oder Auswahlreihenfolge.
- play leert die Auswahl vor dem Server-Ack.
- Ein generischer Spielbarkeitsfilter nach ehrlichem Kartenrang wäre für den Bluffmechanismus falsch.

**Individueller Plan:**

- Mehrfachauswahl mit Zähler, Abwahl und gut lesbarem Rang-/Mengenhinweis verbessern.
- Bestätigung abwarten und das erlaubte Anklagefenster unabhängig vom normalen Zug anzeigen.
- Keine ehrlichen/bluffenden Karten als richtig oder falsch markieren; Karteninhalte bleiben bis zum regelkonformen Aufdecken geheim.

**Gegner-/Statusinformationen:** Öffentliche Restkartenzahl ist vorhanden. Keine zusätzlichen Werte aus fremden Händen oder unberechtigt aus dem Stapel anzeigen.

**Komponenten und Drag-and-drop:** Kit, frenchCard und eigener sortHand/Mehrfachauswahl; kein DnD.

**Abnahme für einen späteren Auftrag:**

- [ ] Sowohl ehrliche als auch gebluffte Mengen lassen sich ausdrücklich bestätigen.
- [ ] Abgelehntes Ablegen erhält die Auswahl.
- [ ] Reaktionsfenster und zulässige Kartenhöchstmenge bleiben erhalten.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-009 – Präsident

ID: `praesident` · **planned** · P2 · grob 4–7 Stunden · Bezug VIS-022. Eigene Freigabe erforderlich.

Quelle: [public/games/praesident/praesident.js](../../public/games/praesident/praesident.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Karten gleichen Rangs auswählen, danach mit Mengenknopf ablegen. Ein anderer Rang ersetzt die Auswahl. Passen ist separat.

**Konkrete Befunde:**

- Die vorhandene sichere Zweistufigkeit ist sinnvoll, aber aria-pressed fehlt.
- Die Auswahl wird bei play vor dem Server-Ack gelöscht.
- passt()/fits() und Mindestmengen werden nur über Farbe/Umrandung sowie einen deaktivierten Knopf vermittelt.

**Individueller Plan:**

- Mehrfachauswahl nach Rang erhalten, Auswahlzähler und verständlichen Mengen-/Ranggrund ergänzen.
- Bestätigungs-/Fehlerzustand ohne vorzeitiges Löschen ergänzen.
- Restkarten und erreichten Platz gemeinsam anzeigen; keine erzwungene Einzelkartenauswahl.

**Gegner-/Statusinformationen:** Nach dem Ausspielen aller Karten wird im Spielertext primär der Platz gezeigt; der Plan soll Platz und öffentlichen Rest klar kombinieren.

**Komponenten und Drag-and-drop:** Kit und frenchCard, eigener Rang-Set-Renderer; kein DnD.

**Abnahme für einen späteren Auftrag:**

- [ ] Paare/Drillinge bleiben Mehrfachauswahlen und werden nicht einzeln gespielt.
- [ ] Unzulässige Anzahl und zu niedriger Rang sind verständlich erkennbar.
- [ ] Passen, Platzierung und nächste Runde bleiben erhalten.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-010 – Monopoly Deal

ID: `monopoly-deal` · **planned** · P2 · grob 8–14 Stunden · Bezug VIS-045. Eigene Freigabe erforderlich.

Quelle: [public/games/monopoly-deal/monopoly-deal.js](../../public/games/monopoly-deal/monopoly-deal.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Kartentipp öffnet bereits einen Detaildialog. Bank, Grundstück und Aktion haben ausdrücklich beschriftete Knöpfe. Zahlung, Just-Say-No und Umordnen sind eigene Dialogabläufe.

**Konkrete Befunde:**

- act() schließt den Kartendialog vor der Serverantwort.
- Abwurf nutzt eine sel-Klasse ohne aria-pressed auf den Karten.
- Reaktions-/Zahlungsstatus und regulärer aktiver Spieler sind unterschiedliche Rollen.

**Individueller Plan:**

- Die gute Detail-/Bestätigungsstufe erhalten, den Dialog bei Ablehnung mit Auswahlwerten wiederherstellen.
- Für das Abwerfen eindeutige Kartenwahl, Restmenge und Bestätigung ergänzen.
- Actor, responder, Aktionsbudget und Bank/Auslage als getrennte Begriffe beibehalten.

**Gegner-/Statusinformationen:** Handkarten, Geld und vollständige Sätze sind getrennte öffentliche Größen; private Handkarten anderer bleiben verborgen.

**Komponenten und Drag-and-drop:** Kit plus md-dialog, cards.js-Regeln und eigene Dialoglistener; kein generisches Karten-DnD erzwingen.

**Abnahme für einen späteren Auftrag:**

- [ ] Bankwert und ausgespielte Aktion lassen sich niemals durch bloßen Kartentipp verwechseln.
- [ ] Fehler verliert keine gewählten Ziel-/Farb-/Satzwerte.
- [ ] Zahlungen, Reaktionsketten, volle Sätze und Joker bleiben serverautoritativ.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-011 – Blackjack

ID: `blackjack` · **planned** · P3 · grob 4–7 Stunden · Bezug VIS-011. Eigene Freigabe erforderlich.

Quelle: [public/games/blackjack/blackjack.js](../../public/games/blackjack/blackjack.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Karten sind Anzeigen, keine auszuspielenden Handobjekte. Der Spieler setzt und wählt Hit/Stay/Double/Split oder Versicherung über explizite Aktionsknöpfe.

**Konkrete Befunde:**

- Knöpfe senden ohne sichtbaren gemeinsamen Pending-Zustand.
- Bei geteilten Händen ist die aktive handIdx vor allem über die now-Klasse erkennbar.
- Eine Karten-Ausspiel-/Drag-Logik wäre für dieses Spiel sachlich falsch.

**Individueller Plan:**

- Nur gemeinsamen Status und Aktionssperre prüfen und gegebenenfalls angepasst übernehmen.
- Aktive geteilte Hand als Hand 1/2 mit Entscheidungshinweis beschriften.
- Betragsentwurf und Split-/Versicherungsentscheidung bei passenden Updates erhalten.

**Gegner-/Statusinformationen:** Offene Hände und verdeckte Dealer-Karte haben andere Regeln als fremde UNO-Hände. Spielstände/Chips sind wichtiger als Restkarten-Badges.

**Komponenten und Drag-and-drop:** Kit und eigener Einsatz-/Split-Renderer, explizite Blackjack-Aktionen.

**Abnahme für einen späteren Auftrag:**

- [ ] Kein Kartenausspielen oder Karten-Drag wird eingeführt.
- [ ] Mehrfachklick auf Hit/Double erzeugt während Pending keine zweite Anfrage.
- [ ] Dealer-Hole-Card, Insurance und Split-/Double-Rechte bleiben unverändert.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-012 – Texas Hold'em

ID: `poker` · **planned** · P3 · grob 6–10 Stunden · Bezug VIS-002. Eigene Freigabe erforderlich.

Quelle: [public/games/poker/poker.js](../../public/games/poker/poker.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Hole-Cards werden angezeigt. Fold/Check/Call/Raise sind eigene Aktionen; Raise hat einen lokalen Betragsentwurf, Aktionen haben bereits eindeutige IDs, Fold statt kostenlosem Check fragt nach.

**Konkrete Befunde:**

- doAction() sendet ohne sichtbare gemeinsame Pending-Sperre; vorhandene Aktions-IDs ersetzen nicht die Rückmeldung während einer laufenden Anfrage.
- Zugstatus liegt primär in Header/Tischmarkern und kann am mobilen Betragseditor weniger präsent sein.
- Kartenauswahl ist weder erforderlich noch eine passende Übernahme des UNO-Adapters.

**Individueller Plan:**

- Eigenen Poker-Rahmen behalten und nur Status/Pending gezielt prüfen.
- Raise-Entwurf, erlaubten Betrag, Einsatz und All-in klar zusammenhalten.
- Tastenkürzel müssen dieselbe Pending-Sperre wie Knöpfe nutzen; bestehende IDs und Fold-Bestätigung erhalten.

**Gegner-/Statusinformationen:** Gegnerinformationen sind Stack, Einsatz, Fold/All-in und Position. Nicht das UNO-Restkarten-Modell auf Poker übertragen.

**Komponenten und Drag-and-drop:** Eigener Poker-Renderer, kein kitGame; core send(), bestehende newId()/doAction().

**Abnahme für einen späteren Auftrag:**

- [ ] Keine freie Hole-Card-Auswahl und kein Karten-DnD ergänzen.
- [ ] Betragsentwurf bleibt bei unveränderten Limits stabil.
- [ ] Side-Pots, All-in, verdeckte Hände und Check/Fold-Entscheidung bleiben korrekt.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## CUX-013 – Omaha

ID: `omaha` · **planned** · P3 · grob 3–6 Stunden · Bezug VIS-024. Eigene Freigabe erforderlich.

Quelle: [public/games/poker/poker.js](../../public/games/poker/poker.js), SHA-256 und Analysecommit im JSON.

**Bestehende Bedienung:** Die eigene technische Spiel-ID nutzt über GAME_FILES.omaha denselben Poker-Renderer. Vier Hole-Cards und Pot-Limit unterscheiden die Aufgabe; genau zwei eigene Karten zählen bei der Wertung.

**Konkrete Befunde:**

- Die vier eigenen Karten erhöhen die mobile Dichte im selben Betrags-/Aktionsbereich.
- Pot-Limit-Maximum und genau-zwei-Regel brauchen einen eigenen Hinweis, keinen scheinbaren Kartenauswahlmodus.
- Gemeinsame Poker-Änderungen könnten Omaha unbeabsichtigt treffen.

**Individueller Plan:**

- Als eigenes Prüf-/Abnahmepaket am gemeinsamen Poker-Rahmen führen.
- Vier Karten vollständig erreichbar halten und Pot-Limit-Entwurf/-Maximum passend anzeigen.
- Genau zwei zählen als Regelhinweis; keine vom Spieler bestätigte falsche Kartenkombination verlangen.

**Gegner-/Statusinformationen:** Eigene Viererhand darf keinen fremden Informationsgewinn erzeugen; Gegnerdaten wie Poker.

**Komponenten und Drag-and-drop:** GAME_FILES-Alias auf public/games/poker/poker.js; gemeinsame Quelle, eigene Variante und eigener Servermodus.

**Abnahme für einen späteren Auftrag:**

- [ ] Vier Karten in 360 Pixeln und Querformat lesbar.
- [ ] Pot-Limit und Hold’em-Regression jeweils separat geprüft.
- [ ] Keine Regeln, Bewertungslogik oder verdeckten Gegnerkarten ändern.
- [ ] Desktop, iPhone-/Touch-Bedienung, Tastatur, Pause, Reconnect und DE/EN prüfen.
- [ ] Negative Serverantwort, Doppelklick und unveränderte verdeckte Informationen nachweisen.

## Übergreifende Grenzen

Die gemeinsame Basis ist opt-in. Kartenspiele ohne frei auszuspielende Hand (Poker, Omaha, Blackjack) erhalten keinen UNO-Ablauf. Simultane Auswahl (6 nimmt!) und Reaktionsfenster (Mogeln/Monopoly Deal) benötigen eine passende Statuslogik statt eines pauschalen turnId-Vergleichs. Kein hier aufgeführtes Folgepaket wurde implementiert; Nachweisfelder bleiben leer und Abschlusscommits null.
