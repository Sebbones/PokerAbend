# EXP-F4 · Gemeinsame Siegerbühne

Implementierung: `158a4b79922b5d463ae82c92097c5f787a998d0f`, 09.11.2026.

## Drei Stufen

- **Runde:** Punkte zählen sichtbar bis zum bestätigten Ergebnis hoch, einschließlich negativer Werte und Dezimalpunkte. Der finale Wert steht für assistive Technik sofort bereit. Die bisherigen Ergebnistabellen und Aktionen bleiben erhalten.
- **Partie:** Podest mit Gewinnertext und Stern, maximal 24 Konfettiteile in Weltfarben und dem Siegklang der gewählten Palette. Geteilte Siege behalten mehrere Gewinner; ein Unentschieden bekommt keinen erfundenen Sieger.
- **Abend:** Eigener SVG-Pokal, Programmname, Anzahl gewerteter Spiele, Gesamtwertung und Bestwerte. Bestwerte sind die höchsten veröffentlichten Abendpunkte pro Spiel innerhalb dieses Abends; sie entstehen aus den bereits sichtbaren Programm-Ergebnissen.

Die Stufe folgt der bestätigten Ansicht: ein abgeschlossenes Abendprogramm ergibt Stufe 3, Brett-/Party-Partien bzw. ein expliziter Partieabschluss Stufe 2, sonst die Rundenwertung. Für andere Oberflächen ist eine explizite Stufe möglich. Teamprogramme verwenden die veröffentlichten Teamgewinner. Spielregeln, Wertung, Ranglisten und Serverzustände werden nicht verändert.

## Einbindung und Weltvarianten

`public/motion/celebrate.js` enthält die gemeinsame Komponente. `kit.js` ergänzt sie innerhalb der bestehenden Ergebnisansicht für alle darauf aufbauenden Spiele. Poker verwendet denselben Helfer am bestätigten Handende; der kleine Adapter übernimmt öffentliche Sitz-/Spieler-IDs und Pot-Ergebnisse. Sitzende Nichtteilnehmer bleiben Zuschauer dieser Hand. Das zusätzliche Poker-Ergebnisfenster lässt sich schließen und verändert das Tisch-/Dock-Layout nicht.

```js
// In einer eigenen Weltdatei registrieren, nicht in einer zentralen Klang-Sammeldatei:
await window.configureWinnerWorld('mein-spiel', {
  colors: ['#e3bd72', '#76ac99', '#f2e8c8'],
  shape: 'paper', // paper | chip | leaf | star
  palette: 'casino', // vorhandene Palette aus EXP-F1
  winEvent: 'win',   // ein Ereignis, das die Palette bereitstellt
});

// Kleine Hilfsfunktion für weitere Nicht-kit-Spiele, nur bei bestätigtem Ergebnis:
await window.showWinnerStage(container, publicServerView, {
  level: 2,
  fresh: previousView?.phase === 'playing' && publicServerView.phase === 'over',
});
window.finishWinnerStages(); // bei einem neuen Zustand oder Abbruch
```

Standard ist Papierkonfetti. Ohne explizite Farben erbt es `--scene-accent`, `--scene-light` und `--scene-dark` der Welt. Eigene Welt-CSS-Dateien können über `.winner-stage[data-winner-game="mein-spiel"] .winner-paper` zusätzliche statische Formen gestalten. Konfettiflug und Deckkraft entstehen über die `celebrate`-Erweiterung in EXP-F2, ausschließlich mit `transform` und `opacity`. Der Pokal ist eine eigene Vektorzeichnung.

## Lebenszyklus und Zugänglichkeit

Nur eine frische bestätigte Ergebnisänderung eines Mitspielers startet die Feier. Reload, wiederhergestellte Verbindung, Zuschauen, Pause und reduzierte Bewegung zeigen unmittelbar die Endwerte, ohne nachträglichen Siegklang oder Konfettirückstau. Eine neue Ansicht beendet laufende Zähler und Bewegungen. Ausblenden, Entfernen des Elements und Seitenwechsel räumen ebenfalls auf. Wiederholtes Rendern derselben Ergebnis-ID spielt die Feier nicht erneut ab.

Siegklänge laufen über `Sound.use`/`Sound.play`; Mixer und Stummschaltung pro Spiel gelten unverändert. Zuschauer erhalten weder neue Feieranimationen noch den Siegklang. Die öffentliche Ergebnisliste bestimmt Gewinner und Werte; weder Konfetti noch Zähler beeinflussen Ergebnisse oder enthalten private Karten. Spielertexte werden als Textknoten gesetzt.

## Prüfungen

- `node --test test/celebrate.test.js`: **6 bestanden**. Stufenauswahl, bestätigte Punkte, Unentschieden, Zuschauer/Pause, veröffentlichte Abendbestwerte, Teamgewinner, geteilte Poker-Pots und Spieler-ID-Zuordnung.
- Zusammen mit `test/card-interaction.test.js`: **14 bestanden**; die aktuellen Source-Audit-Hashes für `kit.js` und Poker sind geprüft.
- `test/ui/celebrate.spec.js`: **20 bestanden**, Desktop und Mobilgerät. Alle drei Stufen, Weltfarben/-klang, Bewegungsvorgaben, Zuschauer, Zustandswechsel, Ausblenden/Verbindungsabbruch, tatsächliche Vier-gewinnt-Partie und -Abendwertung, Reload sowie ein echtes Poker-Handende.
- Zusätzliche Regressionen: **22 Motion-Prüfungen und 4 Abendprogramm-Prüfungen bestanden**. Der gemeinsame Lauf mit den zunächst 18 Siegerbühnen-Prüfungen bestand insgesamt 44 Prüfungen. Nach den Ergänzungen wurden die 20 Siegerbühnen-Prüfungen und gezielt die drei Stufen (6 Prüfungen) sowie der Poker-Adapter (2 Prüfungen) erneut geprüft.
- Browseraufruf: `PLAYWRIGHT_CHANNEL=chromium npm run test:ui -- test/ui/celebrate.spec.js test/ui/motion.spec.js test/ui/evening-mode.spec.js`. In dieser Cloud wurde der vorhandene externe Override mit `/usr/bin/chromium` verwendet (`--config=/workspace/pokerabend-tools/playwright.config.mjs`).
- Die aktuellen Hashfelder in `test/fixtures/release-2026-11-08/source-audit.json` und `docs/release-bugjagd-2026-11-08/evidence.json` wurden ausschließlich für die geänderten Dateien `kit.js` und Poker aktualisiert. Historische Baseline-/Archiv-Hashes bleiben erhalten.
- Vor dem Push: `git pull --rebase`, danach `npm run test:fast`.

## FPS und Bilder

rAF-Messung während der Konfettiphase mit 24 Teilen:

| Ansicht | CPU | Samples | FPS | Testgrenze |
|---|---:|---:|---:|---:|
| Desktop | 4× gedrosselt | 60 | 48,50 | mindestens 45 |
| Mobilansicht | normal | 71 | 59,16 | 60-Hz-Ziel mit Scheduling-Toleranz: mindestens 55 |

Die Daten beschreiben die Cloud-Testmaschine mit Browser-/Mobilansicht. Messdateien: [Desktop](fps-desktop.json), [Mobilgerät](fps-mobil.json).

Screenshots aller Stufen: [Runde Desktop](stage-1-desktop.png), [Partie Desktop](stage-2-desktop.png), [Abend Desktop](stage-3-desktop.png), [Runde Mobilgerät](stage-1-mobil.png), [Partie Mobilgerät](stage-2-mobil.png), [Abend Mobilgerät](stage-3-mobil.png).
