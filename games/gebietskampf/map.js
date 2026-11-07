// Gebietskampf: eigene, erfundene Weltkarte „Meridia“ – sechs Landmassen mit je sieben Gebieten.
// Keine Vorlage aus einem anderen Spiel: Namen, Zuschnitt und Grenzen sind eigens entworfen.
// Koordinaten gelten für ein SVG mit viewBox 0 0 1000 620.

// Gleiche Grundform für jede Landmasse (lokale Koordinaten, 300 × 260) – gespiegelt, damit die Länder unterschiedlich liegen.
const SHAPE = [[40, 40], [140, 25], [245, 55], [55, 135], [155, 120], [250, 160], [130, 215]];
const INNER = [[0, 1], [1, 2], [0, 3], [1, 4], [2, 4], [2, 5], [3, 4], [4, 5], [3, 6], [4, 6], [5, 6]];

export const CONTINENTS = [
  { id: 'nordmark', name: 'Nordmark', nameEn: 'Northmark', bonus: 4, color: '#6f8fb8', origin: [20, 20], flipX: false, flipY: false,
    names: ['Eisfjord', 'Wolfsklippe', 'Kaltwasser', 'Rauhgrat', 'Nebelheide', 'Bärental', 'Frostwacht'] },
  { id: 'silberland', name: 'Silberland', nameEn: 'Silverland', bonus: 3, color: '#a9a9b8', origin: [350, 20], flipX: true, flipY: false,
    names: ['Silberbucht', 'Hohenwald', 'Lindenfurt', 'Mondtal', 'Kupferstadt', 'Rabenstein', 'Quellgrund'] },
  { id: 'sonnenreich', name: 'Sonnenreich', nameEn: 'Sunrealm', bonus: 4, color: '#d9a441', origin: [680, 20], flipX: false, flipY: false,
    names: ['Dünenmeer', 'Goldoase', 'Salzpforte', 'Tamarinde', 'Sandhafen', 'Feuerklamm', 'Schakalfels'] },
  { id: 'perlkueste', name: 'Perlküste', nameEn: 'Pearl Coast', bonus: 4, color: '#4fa59b', origin: [20, 330], flipX: false, flipY: true,
    names: ['Muschelbank', 'Korallental', 'Perlhafen', 'Gezeitenburg', 'Algenwiese', 'Leuchtturm', 'Sturmriff'] },
  { id: 'eisenland', name: 'Eisenland', nameEn: 'Ironland', bonus: 3, color: '#b0675a', origin: [350, 330], flipX: false, flipY: true,
    names: ['Erzberg', 'Schmiedetal', 'Kohlenfeld', 'Ambosswacht', 'Rußhafen', 'Zinnmoor', 'Kesselstadt'] },
  { id: 'inselmeer', name: 'Inselmeer', nameEn: 'Island Sea', bonus: 4, color: '#8b6fb3', origin: [680, 330], flipX: false, flipY: true,
    names: ['Palmeninsel', 'Vulkanrund', 'Nebelatoll', 'Fährhafen', 'Windspitze', 'Bambusbucht', 'Korallenkap'] },
];

export const TERRITORIES = CONTINENTS.flatMap((c, ci) => c.names.map((name, k) => {
  let [x, y] = SHAPE[k];
  if (c.flipX) x = 300 - x;
  if (c.flipY) y = 260 - y;
  return { id: ci * 7 + k, name, continent: ci, x: c.origin[0] + x, y: c.origin[1] + y };
}));

// Grenzen innerhalb der Landmassen + Wege zwischen den Landmassen (Index = Kontinent × 7 + Platz)
const at = (ci, k) => ci * 7 + k;
export const EDGES = [
  ...CONTINENTS.flatMap((_, ci) => INNER.map(([a, b]) => [at(ci, a), at(ci, b)])),
  [at(0, 2), at(1, 2)], [at(0, 5), at(1, 5)],     // Nordmark – Silberland
  [at(1, 0), at(2, 0)], [at(1, 3), at(2, 3)],     // Silberland – Sonnenreich
  [at(0, 6), at(3, 6)], [at(1, 6), at(4, 6)], [at(2, 6), at(5, 6)], // von oben nach unten
  [at(3, 2), at(4, 0)], [at(3, 5), at(4, 3)],     // Perlküste – Eisenland
  [at(4, 2), at(5, 0)], [at(4, 5), at(5, 3)],     // Eisenland – Inselmeer
];

// Kleine Karte: vier Landmassen (Nordmark, Silberland, Perlküste, Eisenland) – sie hängen als Block zusammen.
export const MAPS = {
  full: { id: 'full', label: 'Meridia (42 Gebiete)', continents: [0, 1, 2, 3, 4, 5] },
  small: { id: 'small', label: 'Klein-Meridia (28 Gebiete)', continents: [0, 1, 3, 4] },
};

export const mapTerritories = (mapId) => TERRITORIES.filter((t) => MAPS[mapId].continents.includes(t.continent)).map((t) => t.id);
const ADJ = new Map(TERRITORIES.map((t) => [t.id, []]));
for (const [a, b] of EDGES) { ADJ.get(a).push(b); ADJ.get(b).push(a); }
export const neighbors = (id, mapId = 'full') => (ADJ.get(id) || []).filter((n) => MAPS[mapId].continents.includes(TERRITORIES[n].continent));
export const continentTerritories = (ci) => TERRITORIES.filter((t) => t.continent === ci).map((t) => t.id);

// Was die Oberfläche zum Zeichnen braucht (ändert sich nie während eines Spiels)
export function mapView(mapId) {
  const conts = MAPS[mapId].continents, ids = new Set(mapTerritories(mapId));
  return {
    id: mapId,
    continents: conts.map((ci) => ({ id: ci, name: CONTINENTS[ci].name, nameEn: CONTINENTS[ci].nameEn, bonus: CONTINENTS[ci].bonus, color: CONTINENTS[ci].color })),
    nodes: [...ids].map((id) => ({ id, name: TERRITORIES[id].name, c: TERRITORIES[id].continent, x: TERRITORIES[id].x, y: TERRITORIES[id].y })),
    edges: EDGES.filter(([a, b]) => ids.has(a) && ids.has(b)),
  };
}
