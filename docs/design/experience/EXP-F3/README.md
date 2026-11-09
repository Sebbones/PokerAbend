# EXP-F3 · Material-Bibliothek

Implementierung: `2d9e57a09c839aa4ac86431083f5a3f4d1a81e6b`, 09.11.2026.

## Eigene Vektorsätze

| Satz | Umfang |
|---|---|
| Kartenrücken | 12 eigene Muster: Salon, Sternpfad, Wellen, Laub, Webwerk, Orbit, Komet, Mosaik, Fächer, Berglicht, Fenster, Knoten |
| Würfel | Holz, Glas, Metall, Kneipe, Marmor; jeweils alle sechs Augenzahlen als echte Vektor-Punkte |
| Spielsteine | Holz, Stein, Glas, Messing |
| Pöppel | Eigene Figur mit klarer Silhouette |
| Chips | 1, 5, 10, 25, 50, 100; Einzelschlitz, Doppelschlitz, Dreieck, Quadrat, Raute, Doppelpunkt als wiederholte Kantenmuster |
| Taler-Scheine | 1, 5, 10, 20, 50, 100; eigene Spielwährung ohne reale Banknoten-Motive |
| Zubehör | Plakette, Stirnzettel, Umschlag, Stempel |
| Avatar-Overlays | Detektivhut, Kochmütze, Krone, Papiermütze, Sonnenbrille, Raumhelm, Sumo-Gürtel, Schwimmreifen |

Insgesamt **71 SVGs**. Das größte ist **2.569 Bytes** groß, alle liegen unter 8 KB. Keine eingebetteten Rasterbilder, Fremdgrafiken, externen Ressourcen, Schriften oder Scripts. Der unveränderliche Katalog `public/material/index.js` enthält für jedes Teil ID, Namen, Datei, Herkunft/Lizenz `eigen`, Kategorie und ViewBox; Würfel/Chips/Scheine enthalten zusätzlich ihre Werte. Herkunft und bestehende Repository-Lizenz: `public/material/LICENSE.md`. Die SVGs sind direkt editierbare Originaldateien und benötigen keinen Generator oder Build-Schritt.

## Einfärbung und Verwendung

CSS-Variablen greifen bei inline eingebundenen SVGs; bei separaten `<img>`-Dokumenten werden die Variablen eines umgebenden Spielbretts nicht vererbt. Der Loader lädt ausschließlich Dateien aus dem festen Katalog, hält die Quellen im Cache und liefert pro Verwendung einen eigenen SVG-Knoten.

```html
<link rel="stylesheet" href="/material/material.css">
```

```js
import { MATERIALS, createMaterial, createAccessory } from '/material/index.js';
const piece = await createMaterial('stone-holz', { label: 'Mein Spielstein' });
slot.append(piece);

// Beliebiger Avatar als Emoji-, Initialen-, Bild- oder SVG-Knoten im quadratischen Host.
const host = document.createElement('span');
host.className = 'material-avatar';
host.style.width = host.style.height = '64px';
const base = document.createElement('span');
base.className = 'material-avatar-base';
base.textContent = '🦉';
host.append(base, await createAccessory('accessory-detektivhut'));
```

```css
.meine-spielwelt {
  --material-primary: #353955;   /* Grundmaterial */
  --material-secondary: #999ab0; /* Maserung, Kanten, helle Flächen */
  --material-accent: #dc9b69;    /* Ornamente und Akzente */
  --material-paper: #f7ead5;     /* Papier und helle Zeichen */
  --material-ink: #1a1926;       /* Konturen, Augen und Zahlen */
}
```

Alle Accessoires haben eine transparente `100 × 100`-ViewBox. Die Overlay-Klasse positioniert sie auf dem Avatar-Host, skaliert mit ihm und lässt Zeigerereignisse durch. Die Mitte der Overlay-Dateien bleibt transparent; die Basisgrafik wird nicht ersetzt oder verändert. Beim Zusammensetzen sind die Accessoires dekorativ (`aria-hidden`), während eigenständig verwendete SVGs Namen und Titel haben. Benutzerdefinierte Beschriftungen werden ausschließlich als Text gesetzt.

Die Bibliothek bindet nichts automatisch in vorhandene Spiele ein und verändert keine Spielregeln, Avatareinstellungen oder verdeckten Informationen. Die individuellen EXP-Spielpakete können die Teile später auswählen und passend zu ihrer Welt einfärben.

## Tests und Bildnachweise

- `node --test test/material.test.js`: **75 bestanden**. Vollständigkeit, eindeutige IDs/Dateien, Grenzen unterhalb von `public/material/`, Größenlimit, Vektor-/CSS-Struktur, Ausschluss externer Ressourcen und aktiver Inhalte, echte Würfelaugen, zwölf verschiedene Rücken, sechs verschiedene Chip-Kanten und alle acht Overlays.
- `test/ui/material.spec.js`: **6 bestanden**, Desktop und Mobilgerät. Alle 71 SVGs tatsächlich gerendert, keine Browserfehler, keine horizontale Überbreite, CSS-Einfärbung, Chips in identischer grauer Farbe, transparente Overlay-Mitte, Verwendung auf Emoji-/Initialen-/Bildavataren und sichere Textbeschriftungen.
- Testübersicht: `/material/test-material.html`, nicht in der Anwendung verlinkt. Sie enthält Materialfarben, eine alternative Farbwelt und eine einheitliche Graupalette. Die Eulenbasis in der Demo ist der vorhandene System-Emoji-Typ; die acht neuen Accessoires sind eigenständige Vektoren.
- Browseraufruf: `PLAYWRIGHT_CHANNEL=chromium npm run test:ui -- test/ui/material.spec.js`. Diese Cloud verwendet den vorhandenen externen Override mit `/usr/bin/chromium`: `--config=/workspace/pokerabend-tools/playwright.config.mjs`.
- Vor dem Push: `git pull --rebase`, anschließend `npm run test:fast`.

Screenshots:

- [Übersicht Desktop](overview-desktop.png)
- [Übersicht Mobilgerät](overview-mobil.png)
- [Chips ohne Farbe, Desktop](chips-monochrome-desktop.png)
- [Chips ohne Farbe, Mobilgerät](chips-monochrome-mobil.png)
