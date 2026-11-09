# Playwright-Prüfwerkzeuge

`helpers.js` exportiert die gemeinsamen Fixtures und EXP-F6-Assertions. Beispiele mit positiven und absichtlich fehlerhaften Fällen: `experience-helpers.spec.js`.

```sh
npm run test:ui -- test/ui/experience-helpers.spec.js
```

FPS-Läufe ohne parallele CPU-intensive Tests ausführen: Die Messung soll die Aktion bewerten und wird durch andere Last auf der Testmaschine beeinflusst.

Die Projekte `desktop` und `mobil` nutzen Chromium. Für FPS ist Chromium mit CDP erforderlich; ein Mobilprojekt emuliert die Ansicht und ersetzt keine Messung auf einem physischen Telefon.

## Bewegung

```js
import { test, expectSmoothMotion } from './helpers.js';
// Nach Aufbau der Seite:
const metrics = await expectSmoothMotion(page,
  () => page.evaluate(() => motionDemo.run('walk', { duration: 1800 })));
```

`expectSmoothMotion(page, action, {minFps, timeout})` drosselt die CPU über CDP auf 4×, zählt rAF-Intervalle während der Aktion und wartet auf neue endliche Web-Animations-Animationen. Schon vorher laufende oder unendliche Animationen verlängern die Messung nicht. Standardbudget: **60 FPS bei grobem Zeiger (Mobilprojekt), sonst 45 FPS**. `minFps` überschreibt das Budget. Die Messung braucht mindestens acht Frames und 200 ms; eine Sofortaktion ist kein aussagekräftiger Performancetest. `timeout` (Standard 10000 ms) begrenzt das Warten auf auslaufende Animationen, nicht die übergebene Aktion; dafür gilt Playwrights Testtimeout.

Rückgabe und Fehlermeldung enthalten FPS, rohe FPS, Frames, Dauer, Budget und Anzahl neuer Animationen. Der Vergleich rundet nur auf zwei Nachkommastellen, um rAF-Zeitstempelpräzision abzubilden. Auch bei Fehlern werden Recorder und CPU-Drosselung aufgeräumt (1×). Das Werkzeug benötigt eine exklusive Messung pro Seite; es misst rAF-Takt, keine GPU-Rasterzeit und kein vollständiges Rendering-Profil.

## Klang

```js
await page.evaluate(() => { window.__soundLog = []; }); // vor der Aktion
await page.getByRole('button', { name: 'Bestätigen' }).click();
await expectSound(page, 'confirm');
// Optional: exakte zusätzliche Felder und nur neue Einträge:
await expectSound(page, { event: 'confirm', palette: 'holz' }, { since: 0 });
```

Der F1-Testmodus protokolliert statt abzuspielen. `expectSound` wartet maximal 2500 ms (mit `timeout` änderbar) und liefert den gefundenen Eintrag. Ohne aktiviertes Array schlägt der Helfer ausdrücklich fehl. Zwischen Aktionen Array leeren oder den bisherigen Index als `since` übergeben, damit ein altes Ereignis den Test nicht erfüllt.

## Verdeckte Informationen

```js
import { expectNoLeak, observeServerView } from './helpers.js';
observeServerView(otherPlayerPage); // vor Navigation/Verbindungsaufbau
// Beide Spieler beitreten lassen und bestätigten Zustand abwarten.
await expectNoLeak(page);
await expectNoLeak(page, { action: () => makeMove(page) });
```

Die Hauptseite wird automatisch beobachtet. Zusätzliche Spieler brauchen `observeServerView` vor dem Socket-Verbindungsaufbau. Der Testrunner erfasst empfangene Socket.IO-Serveransichten getrennt vom veränderbaren Browser-`lastState`. Er vergleicht DOM, Attribute, aktive Animationsziele und während `action` erzeugte Web-Animations-Ziele einschließlich kurzlebiger Elemente. Standardbereich ist `#game-root`; `scope` kann ihn eingrenzen. Auch Inline-Stile und Zeichenketten in Keyframes werden geprüft. Recorder und der temporäre `Element.animate`-Wrapper werden anschließend entfernt.

Wie V2-09 gewinnt der Vergleich private Werte aus einer zweiten Spieleransicht desselben Raums, Spiels und derselben Runde. Auf abgeschlossene Serveraktionen warten: Ansichten verschiedener Zwischenzustände sind kein geeignetes Testpaar. Für private Kartenspiele sind ein Vergleichspartner und tatsächlich unterschiedliche private Werte Pflicht. Fehlende Ansichten, fehlende Wurzeln und mehr als 12000 Samples schlagen fehl. Für serverseitig erzeugte Fixtures sind `{serverView, peers: [otherView]}` möglich; diese Daten aus dem Node-Runner übergeben, nicht aus dem Browser lesen. `requireSecrets: true` erzwingt die private Gegenprobe auch für andere Spiele.

Kartenkennungen, Farbkarten mit physischer ID, bekannte private Werte, Würfelattribute und semantische Würfelelemente werden erkannt. Gewöhnliche Zahlen wie Punktestand 6 gelten nicht als Würfelleck. Bei eigenen Darstellungen einen Serverpfad binden:

```html
<span data-view-path=".g.opponentCard" data-view-value="">??</span>
```

Ein sichtbarer Wert an diesem Pfad muss exakt der autorisierten Ansicht entsprechen; Maskierungen bleiben erlaubt. Das erkennt auch eine verdeckte Kartenposition, deren Kartenwert anderswo bereits öffentlich ist. Für eigene SVG-/Canvas-Darstellungen, übersetzte Beschriftungen oder abweichende Wertcodierungen sind solche Bindungen bzw. zusätzliche spielbezogene Assertions notwendig. Der Helfer ist kein Pixelvergleich und beweist keine vollständige Geheimhaltung beliebiger Darstellungen. Die serverseitigen V2-09-Tests bleiben ergänzend erforderlich.
