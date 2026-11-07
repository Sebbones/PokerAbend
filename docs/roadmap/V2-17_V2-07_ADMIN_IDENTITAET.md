# V2-17 und V2-07 – Admin-Moderation und Spieler-Identität

Ausdrückliche Freigabe vom 07.11.2026, direkt auf `main`. Implementierung: `3f3005f3942283b16be29bba6b68166b1eb2706c`. Nur diese beiden Pakete sind Gegenstand des Auftrags; alle anderen Task-Objekte der `plan.json` bleiben unverändert. Keine Freundesliste, keine Discord-Video-Übernahme, kein Produktivdeployment.

## V2-17 – `/admin`

Zugang wie bisher nur über `ADMIN_PASSWORD` (eigenes Cookie, Pfad `/admin`). Das Gruppenpasswort, ein Discord-Login und das Ticket-Admin-Cookie geben keinen Zugang. Das Login ist auf 8 Fehlversuche je 15 Minuten und Adresse begrenzt; auch das richtige Passwort wird danach mit 429 und `Retry-After` abgewiesen. Schreibende Aufrufe brauchen weiterhin den Header `X-Requested-With: spieleabend`, gleiche Herkunft und JSON.

Neu in der Oberfläche und in `/admin/api`:

| Bereich | Möglichkeiten |
| --- | --- |
| Rückblicke | alle Abende ansehen (auch private), ausblenden und wieder einblenden |
| Bestenliste | gewertete Rangliste je Spiel und Zeitraum mit Game-ID |
| Partien | letzte Runden mit Platzierungen ansehen, falsche Partie aus-/einblenden |
| Spieler | Konten über Game-ID oder Name suchen, zwei Konten zusammenführen |
| Tickets | Liste und Suche, Status ändern, als „Admin“ kommentieren, Kommentar oder Ticket löschen |
| Update | Ankündigung und Rücknahme unverändert |
| Protokoll | jede Änderung mit Zeit, Aktion und Ziel; Anmeldungen und Fehlversuche |

**Ausblenden statt Löschen.** Ein ausgeblendeter Rückblick verschwindet aus Liste, Direktlink und Export, bleibt aber gespeichert und trägt das Kennzeichen `hidden`; das gilt auch, wenn der Raum den Stand später erneut meldet. Eine ausgeblendete Partie (`rounds[id].hidden`) zählt in keiner Rangliste, keiner Ranglisten-Zusammenfassung, keiner Konto-Zusammenfassung und keinem neu berechneten Erfolgsprofil; Einblenden stellt alles wieder her. Ausblenden von Partien und Rückblicken verlangt in der Oberfläche eine Bestätigung.

**Zusammenführen.** Wie beim Verbinden eines zweiten Geräts: alle Ergebnisse, Tickets, Planungen und Bretter des alten Kontos gehören danach dem Ziel; das alte Gerät behält seine Rechte, weil sein Cookie auf das Ziel zeigt. Die Verwaltung arbeitet ausschließlich mit öffentlichen Game-IDs; interne Konto-IDs erscheinen in keiner Antwort. Die Zusammenführung ist über die Oberfläche nicht umkehrbar (der Hinweis steht vor der Bestätigung).

## V2-07 – Identität für Tickets, Planungen, Rückblicke und Presence

Besitz und Rechte bleiben an der Konto-/Cookie-Kennung aus V2-01. Neu ist, dass Anzeigeangaben nicht mehr aus der Anfrage stammen:

- Mit Konto setzt der Server Name, Avatar und öffentliche Game-ID für Tickets, Kommentare, Planungen und Stimmen selbst. Ein Name im Anfragetext wird dann ignoriert; nur wenn das Konto noch keinen Namen hat, gilt der gesendete Name wie bisher.
- Ersteller, Kommentierende, Planungsinhaber und Teilnehmende tragen zusätzlich `gameId`. Eine gleichnamige Person mit anderem Konto bekommt dadurch keine Rechte (Test: Ticket bearbeiten und Planung absagen liefern 403).
- Rückblicke speichern für bekannte Spieler die Game-ID. Gäste ohne Konto und alte Rückblicke haben keine.
- Konten mit der Freigabe „Profil verstecken“ geben keine Game-ID weiter.
- Zusammenführen schreibt gespeicherte Game-IDs auf die des Ziels um (nur Felder namens `gameId`; ein Ticket-Titel wie „#ABCD“ bleibt unberührt). Löschen eines Kontos entfernt seine Game-ID aus Tickets, Planungen und Rückblicken wie bisher die Konto-ID.
- Presence verwendete seit V2-14 die öffentliche Game-ID als Schlüssel; ein Test belegt, dass gleichnamige Konten getrennt bleiben und versteckte fehlen.
- Altbestand ohne `gameId` wird unverändert geladen und angezeigt. Es werden keine Daten migriert oder gelöscht.

## Offene Grenzen

- Rückblicke lassen sich nicht bearbeiten oder endgültig löschen; Tickets nicht wiederherstellen; es gibt kein Begründungsfeld, keine MFA und keine getrennten Admin-Rollen.
- Das Ausblenden einer Partie ändert nur die Rundenablage (Ranked-Wertung, Profile, Erfolgsberechnung). Bereits vergebene Abzeichen bleiben bestehen. Die alte namensbasierte Gesamtstatistik (`/api/leaderboard`) kennt keine einzelnen Partien und wird nicht korrigiert.
- Admin-Aktionen stehen im bestehenden Admin-Protokoll (die letzten 500 Einträge); ein Vorher/Nachher-Abbild wird nicht gespeichert.
- Die Tab-Leiste verdeckt auf dem Handy in den Browserfällen „Tickets-Verwaltung“ und „Planung“ Schaltflächen. Beide Fälle schlagen unverändert auch auf dem Stand `d83268f` fehl und sind nicht Teil dieser Pakete.

## Prüfung

- `node --test test/v2-17-07.test.js`: 12 Fälle (Schutz je Endpunkt, Login-Sperre, Rückblicke, Partien, Zusammenführen, Tickets, Protokoll auf der Platte, Speicher-Bausteine, Presence).
- Gezielte Node-Läufe mit angrenzenden Tests: 134 bestanden, 0 fehlgeschlagen (`artifacts/v2-17-07-focus-node.log`).
- Vollständige Node-Suite auf dem Stand `d83268f` plus diesen Änderungen: 1397 bestanden, 0 fehlgeschlagen (`artifacts/v2-17-07-full-node.log`).
- Playwright (Desktop und Handy): 58 bestanden, 2 vorbestehende Handy-Fehlschläge (siehe oben), Bericht `artifacts/v2-17-07-browser-report.json`. Der neue Fall `test/ui/v2-17-07.spec.js` besteht in beiden Varianten.
- Der Nachweis `V2-13_V2-14_EVIDENCE.json` prüft Quellhashes und den Hash der übrigen Task-Objekte. Beides wurde bewusst auf den neuen Stand gesetzt, weil `server/leaderboard.js`, `server/index.js` und die Pakete V2-07 und V2-17 in dieser Freigabe geändert wurden.
