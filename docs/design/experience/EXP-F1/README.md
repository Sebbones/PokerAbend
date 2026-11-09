# EXP-F1 · Klang-Engine

Implementierung: `7a5bc52a4ed203d29cde9d84cbd5b49e2d19d2b0`, 09.11.2026.

## Paletten und Klang

| Palette | Klang |
|---|---|
| `standard` | Die bisherigen 14 SFX: dieselben Frequenzen, Wellenformen, Filter, Lautstärken, Hüllkurven und Zeitabstände. |
| `casino` | Helle Messing-/FM-Glocken, feines Filzrauschen, kurze Chipklänge, weicher Siegakkord. |
| `holz` | Warme, trockene Holz-Tocks, Plopps und ein ruhiger Akkord für Brettspiele. |
| `kneipe` | Würfelklappern auf dem Tresen, dumpfer Becher, kleine Barglocke. |
| `party` | Federnde Plopps, helle Glocken und freundliche Schlussakkorde. |

Alle Klänge entstehen per Web Audio. Keine Audiodateien, Fremdaufnahmen oder Drittmusik. Jede Palette kennt `select`, `confirm`, `deny`, `turn`, `win`, `lose` sowie `card`, `deal`, `chip`, `dice`, `piece`, `capture`. Die vier zusätzlichen Paletten werden dynamisch importiert. Bestehende Spiele behalten ihre SFX- und `beep`/`noise`-Aufrufe; ihre Aufrufstellen und individuellen GameDesign-Motive bleiben unverändert.

## API und Grenzen

```js
await Sound.use('casino'); // standard | casino | holz | kneipe | party
Sound.play('chip', { volume: 0.8 });
Sound.play('win');
Sound.ambient('room');    // leises synthetisches Rauschbett, nur bei aktivierter Atmosphäre
Sound.ambient(null);
```

Ein direkt nach `use` gerufenes `play` wartet kurz auf die Palette. Überholte Ladeanforderungen und Ereignisse älter als 600 ms werden nicht nachgespielt. Ein Spielwechsel beendet Stimmen und setzt die Standardpalette zurück. Ein Spiel kann beim Eintritt seine eigene Palette wählen. Höchstens sechs Stimmen einschließlich Atmosphäre; alte Effektstimmen werden bei Bedarf freigegeben. FM-Träger und Modulator bilden eine Stimme, Akkordnoten zählen einzeln. Effekte enden spätestens nach 600 ms; nur `win`, `lose`, `highlight` dürfen länger dauern. Web Audio wird erst beim ersten tatsächlich hörbaren Ereignis angelegt. Versteckte/verlassene Seiten beenden laufende Stimmen; ein Audio-Unlock spielt keine alten Effekte nach.

Der Ton-Abschnitt bietet Gesamt, Effekte, Atmosphäre, vorbereitete Sprachausgabe-Lautstärke und Stumm pro Spiel (auch Einzelspieler). Standardwerte: Gesamt/Effekte/Sprache 100 %, Atmosphäre **0 %**. Sprache ist nur eine gespeicherte Vorbereitung für spätere Ansagen, keine neue Sprachausgabe. Atmosphäre-Welten und Ambient-Gestaltung bleiben EXP-F5 vorbehalten. Validierung und Speicherung erfolgen über den vorhandenen Einstellungs-Endpunkt an der Spieler-ID, einschließlich Geräteverknüpfung und Zurücksetzen.

Mit `window.__soundLog = []` protokolliert die Engine statt Audio zu erzeugen:

```js
{ event: 'chip', palette: 'casino', game: 'maumau', channel: 'effects' }
```

Stumme Kanäle/Spiele werden nicht als abgespielt protokolliert. Alte direkte Tonaufrufe erscheinen als `beep` bzw. `noise`.

## Nachweise

- `npm run test:fast`: **1.823 bestanden, 3 übersprungen, 0 fehlgeschlagen** (1.826 Tests).
- `node --test test/experience-roadmap.test.js`: **4 bestanden**, einschließlich des tatsächlichen Implementierungscommits und vorhandener Nachweise.

- `node --test test/sound.test.js test/settings.test.js`: **21 bestanden**, keine übersprungen. Paletten, ursprüngliche SFX-Parameter, Stimmenlimit, Cleanup, Testmodus, Spielwechsel/Laderennen, Schema, Kontospeicherung und Geräteverknüpfung.
- `npm run test:ui -- --config=/workspace/pokerabend-tools/playwright.config.mjs test/ui/sound.spec.js test/ui/settings.spec.js test/ui/smoke.spec.js`: **26 bestanden**, Desktop und Mobilgerät.
- Nach zusätzlicher Prüfung der Kanal-/Spiel-Stummschaltung: `test/ui/sound.spec.js` erneut **6 bestanden**, Desktop und Mobilgerät. Einschließlich eines echten Mau-Mau-Zugs und echter Web-Audio-Knoten (alle Paletten, Stimmenfreigabe, Atmosphäre stoppen).
- Browserkonfiguration dieser Cloud: externer Playwright-Override mit `/usr/bin/chromium`. Regulär im Repository: `PLAYWRIGHT_CHANNEL=chromium npm run test:ui -- test/ui/sound.spec.js` nach Installation des Playwright-Chromiums.
- Dauerhafte Mixer-Screenshots: [Desktop](mixer-desktop.png), [Mobilgerät](mixer-mobil.png).
- Keine Spiellogik, keine `.env`, kein Deployment geändert. Bestehende Source-Audits referenzieren keine der geänderten Dateien; fremde Audit-Hashes bleiben erhalten.

### CI-Korrektur: flacher Checkout

Der erste Roadmap-Nachweistest verwendete `git cat-file` auf den früheren Implementierungscommit. Das scheitert beim standardmäßigen Actions-Checkout mit Tiefe 1, obwohl alle Dateien und Nachweise vorliegen. Reproduziert in einem lokalen `--depth 1`-Clone: 3 Tests bestanden, 1 fehlgeschlagen (`could not get object info`). Der Test prüft jetzt Commitformat, vorhandene Nachweisdateien und die Nennung desselben Commits im eingecheckten Markdown-Nachweis. Nach der Korrektur bestehen alle 4 Roadmap-Tests auch im flachen Checkout; keine zusätzliche Git-Historie oder Netzwerkzugriffe sind dafür nötig.
