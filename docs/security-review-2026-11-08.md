# Sicherheits- und Datenschutzdurchgang (V2-09) – 8. November 2026

Umfang laut Freigabe: Eingaben, Rate-Limits, Cookie-Flags, CSP, Admin-Schutz, Leck fremder Karten/Rollen in Views, Datenschutz, schnellerer Nachtlauf, wackelige Tests. Kein Produktivdeployment, keine Secrets, bestehende Spiele, Rechte, Cookies und Räume unverändert.

## Kurzfassung

- **Kein echtes Leck und kein abstürzender Handler gefunden.** Ein Differenztest über alle Spiele (siehe 1.5) zeigte keine fremden Karten, Würfel oder Rollen in den Ansichten. Müll-Eingaben (Zahlen, Listen, `null`, Text statt Objekt) erzeugten keine ungefangenen Fehler.
- Behoben wurden **Härtungslücken** (kein Allgemein-Limit für `/api`, unbegrenzte Gast-Konten pro Anschluss, interne Fehlertexte im Ack, schwächere Header) und eine **fehlende Datenschutzseite**.
- Offen bleiben bewusst dokumentierte Restrisiken (Abschnitt 5).

## 1. Sicherheitsdurchgang

| # | Bereich | Befund | Maßnahme | Nachweis |
|---|---|---|---|---|
| 1.1 | Socket-Eingaben | Nutzdaten waren nur durch `payload \|\| {}` abgesichert: Zahl, Text oder Liste als Nutzdaten ging bis in die Spiellogik. Bei einem `TypeError` wäre `e.message` (Programmtext) im Ack beim Browser gelandet. | Nur reine Objekte gelten als Nutzdaten (sonst `{}`); `TypeError/RangeError/ReferenceError/SyntaxError` werden serverseitig protokolliert und als „Ungültige Eingabe“ beantwortet. Spielregel-Fehler behalten ihre lesbare Meldung. | `test/security-review.test.js` (Fuzz über alle Ereignisse mit Fremddaten; 0 interne Fehler aus Raum-Handlern) |
| 1.2 | Rate-Limits | Socket-Ereignisse (Token-Bucket 40/8 pro s, 16 KB), Login, Tickets, Räume, Admin hatten Limits. `/api` insgesamt und das Anlegen von Gast-Konten hatten keine. Wer ohne Cookie wiederholt `/` lud, erzeugte unbegrenzt Konten. | `apiLimit` (900/min je Anschluss, `429` + `Retry-After`, einstellbar `API_LIMIT`); `newAccount` (30 / 10 min je Anschluss, `NEW_ACCOUNT_LIMIT`). | zwei Tests: 429 bei Überschreitung, andere Adresse unberührt |
| 1.3 | Cookie-Flags | `pa_auth`, `pa_guest`: HttpOnly, SameSite=Lax, 180 Tage; `pa_admin`: HttpOnly, SameSite=Strict, Pfad `/admin`; `Secure` über HTTPS. Befund: in Ordnung. | keine Änderung nötig; jetzt per Test festgeschrieben (der Gast-Cookie wird über einen echten Seitenaufruf geprüft, nicht nur formal). | Test „Cookie-Flags“ |
| 1.4 | CSP und Header | CSP ohne `eval`/Inline-Skripte, bereits vorhanden. Es fehlten `frame-src`, `manifest-src`, `worker-src`, HSTS, `upgrade-insecure-requests`, CORP. | ergänzt; HSTS und `upgrade-insecure-requests` **nur über HTTPS** (hinter dem Proxy), damit lokales HTTP nicht bricht. | Tests „Antwort-Header“, „HSTS nur über HTTPS“ |
| 1.5 | Admin-Schutz | Befund: jede Admin-Schnittstelle verlangt Seitenpasswort **und** Admin-Anmeldung; Aktionen ohne beides abgelehnt. | keine Änderung; als Test über alle Admin-Pfade festgeschrieben. | Test „Admin-Schutz“ |
| 1.6 | Leck fremder Karten/Rollen | Befund: keins. Der Test spielt jedes Spiel mit Bots und vergleicht pro Spieler und Zuschauer die Ansicht bei verändertem Geheimnis des anderen: nichts darf sich ändern. | neuer Test; dokumentierte Ausnahmen (öffentliche Bezeichnungen, aufgedeckte Rollen nach Tod/Spielende, identische Kartenarten), Gegenprobe mit künstlich eingebautem Leck, Nicht-Leer-Prüfung. | `test/view-leaks.test.js` (alle Spiele, 25 Wiederholungen stabil) |
| 1.7 | XSS / Namen | Namen werden gekürzt und bereinigt, Ausgabe über `textContent`; CSP verhindert Inline-Skripte. Befund: in Ordnung. | keine Änderung. | bestehende `test/identity.test.js`, `test/discord.test.js` (Discord-Anmeldung gegen `test/discord-fake.js`, ohne echte Secrets) und `test/platform.test.js` |

## 2. Datenschutz

Neue Seite **`/datenschutz`** (Deutsch/Englisch, umschaltbar, ohne Skript lesbar), verlinkt unter *Einstellungen → Meine Daten*. Inhalt: was gespeichert wird, wie lange, wie löschbar; Cookies und Browser-Speicher; wer was sieht; Auskunft (JSON-Download) und Löschung (Konto löschen mit Game-ID).

Die Zahlen der Seite (Cookie-Laufzeiten, 50.000 Runden, 30 Min. Tischablauf, 500 Admin-Einträge, 30/14 Tage Discord-Sitzung) prüft ein Test gegen die Konstanten im Code, damit Text und Verhalten nicht auseinanderlaufen.

IP-Adressen werden nirgends persistiert (nur flüchtige Zähler im Arbeitsspeicher, 10–15 Minuten).

## 3. Regression: Nachtlauf und wackelige Tests

- **Nachtlauf:** vorher ein Job (Node-Tests und alle Playwright-Tests nacheinander, bis 90 Minuten). Jetzt: 4 Node-Teile (`--test-shard`) und 12 Browser-Teile (`--shard`) parallel plus ein Zusammenfassungs-Job (`scripts/nightly-summary.mjs`), der Fehler, fehlende Teilberichte und wackelige Tests ausweist und den Lauf bei Fehlern rot macht. Die Zeit entspricht dem längsten Teil (Schätzung 15–25 Minuten pro Browser-Teil bei ca. 860 Prüfungen / 12; Ziel unter 40 Minuten). *Die tatsächliche Laufzeit auf GitHub ist noch nicht gemessen – der Zeitplan-Lauf hat mit dieser Änderung noch nicht stattgefunden.*
- **CI-Toleranz:** nur unter `CI`: Timeout 60 s, `expect` 10 s, ein Wiederholungsversuch, `forbidOnly`. Lokal bleibt alles streng. Wackler erscheinen im Bericht als „wackelig“.
- **Stabilisiert:** zwei veraltete UI-Tests (Neuer-Tisch-Schalter sind seit V2-05 in den Einstellungen; Beschriftung Kartengröße), Server-Startzeit im UI-Helfer auf 45 s, das Sicherheitstest-Paket in der Schnellliste als langsam eingestuft (`scripts/test-fast.mjs`). Der Leck-Test war anfangs durch ungeseedetes `Math.random` instabil und läuft jetzt deterministisch.
- Nicht geändert: Der Browser-Teil nutzt weiter `workers: 1` je Teil (Ports und Zustand je Prüfung).

## 4. Test-Nachweise

Siehe `plan.json` → V2-09 → `test_results`.

## 5. Offene Risiken

1. **Keine automatische Aufbewahrungsfrist** für Konten, Tickets, Abendplanungen und Rückblicke: Löschung durch die Person selbst (Konto) oder den Admin. Freitexte in Tickets/Planungen bleiben bei Kontolöschung stehen (auf der Datenschutzseite genannt).
2. **CSP `style-src 'unsafe-inline'`** bleibt, weil Oberfläche und Spielwelten Inline-Stile setzen; Skripte sind strikt (`script-src 'self'`).
3. **Gast-Konten** entstehen bei jedem Aufruf ohne Cookie; jetzt je Anschluss begrenzt, hinter einem gemeinsamen Proxy ohne `TRUST_PROXY` teilen sich aber alle eine Adresse (30 / 10 min) – in der Produktion muss `TRUST_PROXY` gesetzt sein (wie bereits für die anderen Limits).
4. **Docker-Build (Node 22 Alpine)** wurde in dieser Umgebung nicht gebaut (kein Docker); die Änderungen nutzen keine neuen Abhängigkeiten. Der GHCR-Lauf nach dem Push prüft den Build.
5. **Nachtlauf-Zeit** ist geschätzt, nicht gemessen (siehe 3).
6. Keine echten Discord-Secrets in Tests: OAuth-Pfade bleiben durch die bestehenden Mock-Tests abgedeckt; WebRTC-Signaling ist (Video-Paket nicht umgesetzt) nicht Teil dieses Durchgangs.
