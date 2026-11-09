# EXP-F6 · Prüfwerkzeuge

Implementierung: `c86713ecf0b52b647ca8f942f456c9bc63664017`, 09.11.2026.

Die vorhandene `test/ui/helpers.js` wurde ausschließlich ergänzt. Produktivcode und Workflows bleiben unverändert. Nutzungsbeispiele, Voraussetzungen und Grenzen stehen in [test/ui/README.md](../../../../test/ui/README.md).

- `expectSmoothMotion(page, action, {minFps})`: rAF-Messung während der Aktion und neuer endlicher Animationen, CDP-CPU-Drosselung 4× für beide Ansichten. Standardbudget 60 FPS mobil bzw. 45 FPS Desktop, aussagekräftige Mindestdauer und Frameanzahl. Fehler nennen Messwerte; Recorder und CPU werden auch bei Fehlern aufgeräumt.
- `expectSound(page, event)`: prüft das zuvor aktivierte F1-`__soundLog`, optional mit Palette, Spiel oder Startindex; fehlende Ereignisse schlagen fehl.
- `expectNoLeak(page)`: baut auf den differentiellen V2-09-Ansichtsprüfungen auf. Der Node-Testrunner erfasst tatsächliche Servernachrichten unabhängig von Browser-`lastState`. Vergleich von DOM, Attributen, Inline-Stilen und Animationszielen einschließlich kurzlebiger Web-Animations-Elemente. Explizite Serverpfad-Bindungen erlauben die Prüfung eigener Darstellungen. Fehlende Prüfdaten ergeben keinen grünen Test.

Die Gegenproben enthalten absichtlich zu hohe FPS-Budgets, abgebrochene Aktionen, fehlende Klangereignisse, fremde Mau-Mau-Karten in kurzlebigen Animationen und manipuliertes Browser-`lastState`. Ein echtes serverseitiges V2-09-Mäxchen-Fixture prüft verdeckte Würfel, ohne öffentliche Punktzahlen als Würfelleck zu behandeln. Vier Node-Tests decken zusätzlich Kartenkennungen, Keyframe-/Stil-URLs, physische Farbkarten-IDs und Rundengrenzen ab.

## Ergebnisse

- `node --test test/presentation-audit.test.js test/view-leaks.test.js`: **99 bestanden, 3 übersprungen**, kein Fehler.
- Browserlauf `test/ui/experience-helpers.spec.js test/ui/smoke.spec.js`: **18 bestanden**, zwölf neue Helferprüfungen und sechs bestehende Rauchtests, Desktop und Mobilgerät.
- `npm run test:fast`: **1908 bestanden, 3 übersprungen**, kein Fehler. Abschließende Prüfung nach `git pull --rebase` vor dem Push.
- `node --test test/experience-roadmap.test.js`: prüft Status, Nachweise und erzeugtes JSON.

Browseraufruf in dieser Cloud: `npm run test:ui -- --config=/workspace/pokerabend-tools/playwright.config.mjs test/ui/experience-helpers.spec.js test/ui/smoke.spec.js`. Der externe Override verwendet das vorhandene `/usr/bin/chromium`; die Repository-Konfiguration wurde nicht verändert.

| Ansicht | CPU | Frames | Dauer | FPS | Budget |
|---|---:|---:|---:|---:|---:|
| Desktop | 4× | 116 | 1916,6 ms | 60,00 | ≥ 45 |
| Mobilansicht | 4× | 115 | 1899,9 ms | 60,00 | ≥ 60 |

Messdateien: [Desktop](fps-desktop.json), [Mobilansicht](fps-mobil.json). Gemessen wurde die echte `walk`-Bewegung der F2-Testseite. Das sind rAF-Messungen auf der Cloud-Testmaschine, keine Hardwaremessung auf einem Telefon. Ein zusätzlicher Lauf gleichzeitig mit `test:fast` unterschritt mobil mit **58,45 FPS** das Budget und schlug korrekt fehl (17/18 bestanden). Der oben dokumentierte vollständige Wiederholungslauf erfolgte ohne parallelen Schnelltest; das Budget wurde nicht abgesenkt.

Die Leckprüfung ergänzt V2-09, ersetzt aber keine spielbezogenen Prüfungen beliebiger Pixel-, Canvas- oder übersetzter Darstellungen. Dafür sind die dokumentierten Serverpfad-Bindungen oder zusätzliche Assertions nötig. Historische Auditdaten wurden nicht verändert; keine geänderte Datei ist in den vorhandenen Source-Audit-JSONs referenziert.
