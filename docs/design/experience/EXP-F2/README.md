# EXP-F2 · Animations-Baukasten

Implementierung: `f1fbbc1156988ec53b8a66cba5f53c6d03faed92`, 09.11.2026.

## Umfang

`public/motion/motion.js` bietet `flyTo`, `flip`, `deal`, `roll`, `walk`, `stack`, `shake`, `pulse` und `celebrate(stufe)` über Web Animations. Animiert werden ausschließlich `transform` und `opacity`. Es gibt keine Filter, Hintergrundunschärfe, Layout-Animationen, Zufallswürfe oder Änderungen an Spielregeln. Die unverlinkte Demo liegt unter `/motion/test-motion.html`; sie gehört zur Testfläche, nicht zum Hub. Bestehende Spieloberflächen bleiben unverändert; ihre individuellen EXP-Pakete können diesen Baukasten verwenden.

## Verwendung

```js
import Motion from '/motion/motion.js';
const motion = Motion.table(roomCode, { root: tableElement });

motion.bind(socket, {
  select: view => view.code === roomCode ? view : null,
  mode: view => ({ spectator: view.spectator === true }), // aus der jeweiligen Spielansicht ableiten
  render(view, m) {
    renderConfirmedBoard(view); // synchron, ausschließlich die erlaubte Serveransicht
    if (view.die !== undefined) m.roll({ el: dieElement, value: view.die, confirmed: true });
  },
});

motion.flyTo(piece, targetElement); // alternativ ein Mittelpunkt { x, y } in Viewport-Koordinaten
motion.flip(card, { value: serverView.card, confirmed: true });
motion.deal(3, { elements: cards, from: deckElement });
motion.walk(piece, [field1, field2, field3]); // Elemente oder Viewport-Punkte
motion.stack(chips, { target: potElement, gap: 5 });
motion.shake(card);
motion.pulse(piece);
motion.celebrate(2, { elements: trophyElement });

// Bei asynchronen Aufrufen die Version vor dem Warten festhalten:
const version = motion.version;
// Nach einer Serverantwort: motion.flip(card, { value, confirmed: true, version });
// Veraltete Versionen werden verworfen, auch nach disconnect vor der nächsten Antwort.

Motion.release(roomCode); // beim Verlassen des Tisches: Animationen und Listener freigeben
```

Direkte Methoden am exportierten `Motion` verwenden einen Standardtisch. Mehrere Tische erhalten getrennte Controller. `createTableMotion({ root })` erzeugt einen Controller ohne Registry. Methoden liefern ein Promise mit Status `completed`, `instant`, `finished`, `waiting` oder `stale` und der betreffenden Version. Optional: `duration` (max. 5 Sekunden), `instant` und `version`.

## Zustand und Abbruch

- `update(view, render, mode)` beendet laufende und vorgemerkte Bewegungen synchron und rendert danach die neue autoritative Ansicht. Bei Unterbrechung zeigt der neue Render seine Endzustände unmittelbar. Eine alte Promise-Fortsetzung schreibt keine alten Endwerte zurück.
- Die erste vollständige Ansicht animiert nicht. `gamePaused`, `spectator` und explizite Modi unterdrücken Bewegungen. `setMode` leert den Ablauf und invalidiert alte Versionstoken. Der Socket-Adapter wartet nach `disconnect`/`connect` auf eine neue vollständige Ansicht, die ohne Animationsrückstau erscheint.
- `finish()` leert den Ablauf und installiert die bereits bestätigten Endpunkte; `dispose()` löst zusätzlich Listener. Seitenwechsel und Hintergrundwechsel beenden den Ablauf ebenfalls. Entfernte Elemente und fehlende WAAPI funktionieren ohne Animation bis zum Endzustand.
- Der Renderer ist synchron. Wer außerhalb des Renderers asynchron weiterarbeitet, übergibt dessen Versionstoken. Spielansichten und sichtbare Informationen kommen vom Server; die Bibliothek trifft keine Spielentscheidung.
- `flip` benötigt einen ausdrücklich bestätigten Wert. `roll` übernimmt ausschließlich bestätigte ganze Werte 1 bis 6 und rotiert die bekannte Fläche; es erfindet keine Zwischenwerte. Fehlende/unbestätigte Ergebnisse verändern weder Text noch Wertattribute.
- „Animationen reduzieren“ aus den bestehenden Einstellungen und `prefers-reduced-motion` begrenzen jedes Bewegungsbündel auf höchstens 150 ms, ohne gestaffelte Verzögerungen. Eine Änderung während einer Bewegung beendet auch den vorgemerkten Rest sofort. Transiente Effekte stellen die ursprünglichen Inline-Transforms/Deckkraft wieder her.
- Maximal 32 Elemente pro Gruppe und 32 vorgemerkte Gruppen; Wege umfassen maximal 64 Punkte. Bei Überlauf wird der bisherige Ablauf bis zu seinen bestätigten Endpunkten geleert.

## Tests und Messergebnisse

`test/ui/motion.spec.js`: **22 bestanden**, Desktop und Mobilgerät. Geprüft: alle neun Endzustände, ausschließlich erlaubte Animationseigenschaften, Zustandsabbruch, getrennte Tische, Versionstoken, Pause, Zuschauen, Wiederverbinden, Erstansicht/Reload, keine verdeckten Werte vor Bestätigung, beide Bewegungsvorgaben, Freigabe, entfernte Elemente und WAAPI-Rückfall.

Nach der zusätzlichen Invalidierung der Versionstoken bei Verbindungsabbruch: **4 gezielte Lebenszyklusprüfungen bestanden**, jeweils Desktop und Mobilgerät.

| Messung während einer 1,6-Sekunden-Bewegung | rAF-Samples | FPS | Grenze im Test |
|---|---:|---:|---:|
| Desktop, CPU 4× gedrosselt | 97 | 60,00 | mindestens 45 |
| Mobilansicht, ohne CPU-Drosselung | 96 | 60,01 | 60-Hz-Ziel mit Scheduling-Toleranz: mindestens 55 |

Die Messung zählt rAF-Zeitstempel während einer tatsächlich laufenden WAAPI-Animation; sie belegt diese Demo auf der Cloud-Testmaschine, keine Leistungsgarantie für physische Mobilgeräte. Der spätere allgemeine `expectSmoothMotion`-Helfer wird hier nicht vorweggenommen.

Messdaten: [Desktop](fps-desktop.json), [Mobilgerät](fps-mobil.json). Endzustandsbilder: [Desktop](demo-desktop.png), [Mobilgerät](demo-mobil.png).

Aufruf: `PLAYWRIGHT_CHANNEL=chromium npm run test:ui -- test/ui/motion.spec.js`. In dieser Cloud wurde der vorhandene externe Playwright-Override mit `/usr/bin/chromium` verwendet (`--config=/workspace/pokerabend-tools/playwright.config.mjs`). Vor dem Push zusätzlich `npm run test:fast` nach `git pull --rebase`.
