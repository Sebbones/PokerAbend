# V2-03 – Ranked-Ergebnisse und historische Bestenlisten

Umgesetzt nach ausdrücklicher Freigabe von V2-03. Abhängigkeiten V2-01 (Konto-IDs) und V2-02 (Discord) sind erledigt.

## Was gespeichert wird

`leaderboard.json` (schemaVersion 3, im Datenvolumen, damit auch von `scripts/backup.sh` erfasst) enthält zusätzlich zu den alten Aggregaten:

- `rounds`: eine Zeile pro Runde mit stabiler Runden-ID (16 Hex-Zeichen, vom Server gewürfelt), Spiel (inkl. Variante), Zeitpunkt, `ranked` (ja/nein), Grund bei „nein“ und je Mitspieler: Konto-ID (nur Menschen), angezeigter Name, `bot`, Sieg, Punkte, Platzierung (Gleichstand teilt den Platz; bei Spielen mit „wenig ist gut“ gewinnt die kleinere Zahl). Höchstens 50 000 Runden, danach fallen die ältesten heraus.
- `alias`: zusammengeführte Konten (zweites Gerät), damit Ranked-Ergebnisse dem Ziel-Konto folgen.

Die bisherigen Zähler (`players[…].games`, je Monat) bleiben unverändert und zählen weiter **jede** beendete Partie. Das ist die „Statistik“.

## Wann eine Runde „gewertet“ ist

Entscheidung nur auf dem Server (`server/ranked.js`), nie aus Namen oder Clientangaben:

1. Keine Computer-Mitspieler (Serverflag `bot`, nicht der Name).
2. Alle Menschen sind registriert, also mit Discord verknüpft (`accounts.isRegistered`). Gäste zählen nicht.
3. Mindestens zwei verschiedene Konten (zwei Plätze desselben Kontos sind ein Mensch).
4. Die Berechtigung wird beim Rundenstart eingefroren (`roundStart` bei Rundenspielen, bei Poker je Hand). Späteres Verknüpfen oder Hinzufügen eines Bots ändert die laufende Runde nicht.
5. Nur vollständig beendete Runden. Eine abgebrochene Runde (`roundAbort`) verwirft den eingefrorenen Stand und hinterlässt keinen Eintrag.
6. Ein Ergebnis mit einem Spieler, der nicht zum eingefrorenen Teilnehmerkreis gehört, wird nicht gewertet (Grund `teilnehmer`).
7. Jede eingefrorene Runde wird höchstens einmal verbucht (Runden-ID wird beim Verbuchen verbraucht; zusätzlich lehnt `recordRound` bekannte IDs ab).

Nicht gewertete Runden werden mit Grund (`bots`, `gast`, `zu-wenige`, `teilnehmer`) gespeichert und in der Bestenliste als Zähler ausgewiesen.

Hinweis zum Auftrag: Er nennt Bots und abgebrochene Partien. Die Planung in `plan.json` verlangt zusätzlich „ohne Gäste“ und „mindestens zwei registrierte Menschen“; beides ist umgesetzt. Wer ohne Discord spielt, bleibt in der Statistik, nicht im Ranked.

## Bestenlisten im Hub

Seite „Bestenliste“ und Dialog am Tisch haben eine Ansicht-Auswahl:

- **Gewertet (Ranked)** (Standard): Spiel oder „Alle Spiele zusammen“; Zeitraum Diese Woche (letzte 7 Tage), Dieser Monat (Kalendermonat), Alles. Spalten: Partien, Siege, Ø Platz, bei einem einzelnen Spiel Punkte. Über alle Spiele gibt es keine Punktespalte, weil Punkte verschiedener Spiele nicht vergleichbar sind. Darunter: Anzahl gewerteter und nicht gewerteter Runden mit Gründen. Ohne Daten steht ein echter leerer Zustand da.
- **Statistik, unbestätigt (alle Partien)**: die bisherige, namensbasierte Liste (je Monat), deutlich gekennzeichnet.

API: `GET /api/ranked?game=<id|all>&period=week|month|all`; unbekannte Werte fallen auf `all` zurück. `GET /api/leaderboard` bleibt unverändert.

Am Tisch zeigt eine Marke „Gewertet“ bzw. „Nicht gewertet · Grund“, ob die Runde zählt (Vorschau auf die Sitzenden, ab Rundenstart eingefroren). Die Marke steht im gemeinsamen Spielrahmen; die eigene Pokeroberfläche zeigt sie nicht, der Server-Zustand (`ranked`) liegt aber auch dort an.

## Migration

- Alte Dateien (`schemaVersion` < 3) werden beim ersten Laden einmalig nach `leaderboard.json.pre-v2-03` kopiert, dann kommen die leeren Felder `rounds` und `alias` dazu. Ein zweiter Start ändert nichts und überschreibt die Sicherung nie.
- Alte namensbasierte Einträge bleiben unverändert liegen und über den bestehenden Weg erreichbar („Alten Namen übernehmen“, `claim`, Admin kann zurücknehmen). Sie werden nie automatisch einer Discord-ID zugeordnet und nie in Ranked-Runden umgerechnet; es gibt keine Rundendaten dazu.
- Rundenspiele melden die Teilnehmer-IDs parallel zu den bisherigen Ergebniseinträgen (`ids`), deren Form unverändert ist.

## Nicht Teil

- Rückwirkende Ranked-Wertung alter Partien, Ranglisten nach Variante getrennt von der Statistik-Zählung, Preise/Saisons.
- Zeitraum Woche für die alte Namensstatistik (sie kennt nur Monate).
- Ranked-Marke in der Pokeroberfläche.
- Produktivdaten wurden nicht angefasst; kein Produktivdeployment.
