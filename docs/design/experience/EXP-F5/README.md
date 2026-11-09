# EXP-F5 · Atmosphäre und Lobby-Leben

Implementierung: `ede1e846d9790b8616336d7442463ace0b1a7374`, 09.11.2026.

## Atmosphäre

Acht leise Schleifen von je 12 Sekunden, vollständig per Code erzeugt (Rauschen und Oszillatoren aus einem festen Startwert). Es gibt keine Aufnahmen und keine Fremdmusik.

| Szene | Klang | Standard für |
|---|---|---|
| `kamin` | Tiefes Feuerrauschen, Knistern, ab und zu ein Knacken | Karten- und Brettspiele am Tisch (Skat, Doppelkopf, Mau-Mau, Schach, Monopoly …) |
| `salon` | Gedämpftes Gemurmel, gelegentlich klickende Chips | Poker-Varianten, Blackjack, Hearts, Lügenbaron … |
| `kneipe` | Lebhafteres Gemurmel, ab und zu ein Glasklirren | Mäxchen, Schocken, Lügenwürfel, Schlagfertig … |
| `meer` | Anrollende Wellen mit Gischt | Schwimmen, Schiffe versenken, Schatzinsel … |
| `stadtregen` | Weicher Regen, Tropfen, fernes Verkehrsgrollen | Scotland Yard, Doppelagent, Reaktor-Notfall … |
| `wald-nacht` | Wind, zwei Grillen, einmal pro Schleife eine Eule | Werwolf, Jäger & Schatten, Survival-Abend … |
| `jahrmarkt` | Leises Publikum, verspielte Drehorgel-Melodie | Party-Brett, Kronenjagd, Echtzeit-Partyspiele … |
| `room` | Neutrales Raumrauschen (der F1-Name) | nur auf ausdrücklichen Wunsch |

Alle Szenen sind gleich laut (RMS 0,06) und weich begrenzt (Spitze ≤ 0,6). Die Schleifenstelle ist per Equal-Power-Überblendung nahtlos. Der Test prüft das. Erzeugt wird jede Szene beim ersten Gebrauch in rund 50 ms, danach liegt sie im Speicher. Übersicht: [scenes-spectrogram.png](scenes-spectrogram.png).

### Verhalten

- **Standardmäßig aus:** Der Mixer-Regler „Atmosphäre“ steht auf 0 %. Erst wer ihn hochzieht, hört etwas.
- **Welt pro Spiel:** `public/sound/ambient/worlds.js` ordnet jedem Mehrspieler-Spiel eine Szene zu. Einzelspieler-Spiele bleiben bewusst still.
- **Paletten:** `casino` bringt `salon` mit, `holz` bringt `kamin`, `kneipe` bringt `kneipe`, `party` bringt `jahrmarkt`.
- **Rangfolge:** Was ein Spiel selbst mit `Sound.ambient(name)` wählt, gilt vor der Palette, und die Palette gilt vor dem Welt-Standard.
- **Einblenden:** über 1,5 s. Grundpegel 0,35 auf dem Atmosphäre-Kanal, multipliziert mit Gesamt- und Atmosphäre-Regler.
- **Spielpause:** Bei einer gemeinsamen Spielpause verstummt die Atmosphäre und setzt danach wieder ein.
- **Tab im Hintergrund:** Alles stoppt. Kommt der Tab zurück, läuft nur die Atmosphäre weiter. Effekte werden nie nachgespielt.
- **Stumm pro Spiel und Gesamt-Aus** gelten wie bei den Effekten.
- **Zustand lesen:** `Sound.state()` liefert `{ ambient, playing }` (für Tests und spätere Anzeigen).

## Lobby-Leben

`public/motion/lobby-life.js` wird von `kit.js` nach jedem Zeichnen aufgerufen und gilt damit für alle kit-basierten Spiele.

- **Hinsetzen:** Wer in der Lobby Platz nimmt, rutscht in 380 ms auf seinen Platz (nur `transform` und `opacity`). Dazu kommt der Ton `seat` (Stuhlrücken).
- **Aufstehen:** Wer aufsteht, hebt sich als Abbild seines letzten Platzes kurz an und verblasst in 420 ms. Dazu kommt der Ton `stand`.
- **Kein Nachspielen:** Der erste Stand eines Tisches (Betreten, Neuladen, Wiederverbinden) wird nur gemerkt, nie animiert.
- **Grenzen:** Zuschauen ist kein Hinsetzen. Mitten in einer Partie und während einer Pause gibt es kein Lobby-Leben.
- **Reduzierte Bewegung:** Der Ton bleibt, die Bewegung entfällt. Höchstens 8 Plätze werden gleichzeitig animiert.

Poker ist kein kit-Spiel und bekommt das Lobby-Leben mit seinem eigenen Paket (EXP-002).

## Nachweise

- `test/ambient.test.js`: Szenen deterministisch, gleich laut, begrenzt, ohne Naht. Jede Welt gültig, Einzelspieler still. Paletten-Atmosphären und Lobby-Töne im Zeitbudget. Rangfolge Welt/Palette/eigene Wahl. Spielpause und Tab-Verhalten.
- `test/ui/ambient.spec.js` (Desktop und Handy):
  - Echter Web-Audio-Ton am Mau-Mau-Tisch, standardmäßig still.
  - Spielpause stoppt und setzt fort.
  - Wechsel zu Werwolf bringt `wald-nacht`.
  - Zwei Browser: Hinsetzen, Aufstehen mit Abbild, erneutes Hinsetzen, Neuladen ohne Nachspielen.
- `test/sound.test.js` erwartet nach einem Tab-Wechsel jetzt die Atmosphäre zurück (EXP-F1 hatte sie absichtlich EXP-F5 überlassen).
