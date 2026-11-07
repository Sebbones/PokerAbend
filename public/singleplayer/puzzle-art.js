// Eigene Zeichnungen für Mahjong-Solitär (18 Steinmotive) und Match-3 (6 Pflanzensymbole). Keine fremden Bilder, Namen oder Figuren.
// Jedes Motiv unterscheidet sich schon an der Form, nicht nur an der Farbe.
export const MAHJONG=[
 ['Sonne','Sun','<circle cx="16" cy="16" r="5"/><path d="M16 3v5M16 24v5M3 16h5M24 16h5M7 7l3.5 3.5M21.5 21.5 25 25M25 7l-3.5 3.5M10.5 21.5 7 25"/>'],
 ['Mond','Moon','<path d="M22 5a11 11 0 1 0 5 17A9 9 0 0 1 22 5z"/>'],
 ['Blatt','Leaf','<path d="M6 26C6 12 14 6 27 5c0 13-6 21-19 21zM6 26 20 12"/>'],
 ['Welle','Wave','<path d="M3 12c4-5 6 5 10 0s6 5 10 0 4 0 6-1M3 22c4-5 6 5 10 0s6 5 10 0 4 0 6-1"/>'],
 ['Flamme','Flame','<path d="M16 4c3 6 9 8 9 15a9 9 0 0 1-18 0c0-4 2-6 4-8 0 3 1 4 3 4 0-4-1-7 2-11z"/>'],
 ['Stern','Star','<path d="m16 4 3.5 8 8.5.8-6.4 5.7 2 8.5L16 22.5 8.4 27l2-8.5L4 12.8l8.5-.8z"/>'],
 ['Schlüssel','Key','<circle cx="10" cy="11" r="5"/><path d="M14 15l13 12m-6-5 3-3m-8-3 3-3"/>'],
 ['Glocke','Bell','<path d="M8 23V14a8 8 0 0 1 16 0v9l3 3H5zM13 28a3 3 0 0 0 6 0"/>'],
 ['Anker','Anchor','<circle cx="16" cy="7" r="3"/><path d="M16 10v18M9 16h14M5 20c1 6 5 8 11 8s10-2 11-8"/>'],
 ['Tasse','Cup','<path d="M6 12h17v7a7 7 0 0 1-17 0zM23 14h3a4 4 0 0 1 0 8h-3M10 4v4M15 3v5M20 4v4"/>'],
 ['Tanne','Fir','<path d="M16 3 7 15h5l-6 9h20l-6-9h5zM16 24v5"/>'],
 ['Fisch','Fish','<path d="M3 16c5-8 14-9 20-3l6-5v16l-6-5c-6 6-15 5-20-3zM21 14h.01"/>'],
 ['Tropfen','Drop','<path d="M16 3C10 12 7 16 7 20a9 9 0 0 0 18 0c0-4-3-8-9-17z"/>'],
 ['Blüte','Flower','<circle cx="16" cy="16" r="3"/><path d="M16 4a4 4 0 0 1 0 9 4 4 0 0 1 0-9zM16 19a4 4 0 0 1 0 9 4 4 0 0 1 0-9zM4 16a4 4 0 0 1 9 0 4 4 0 0 1-9 0zM19 16a4 4 0 0 1 9 0 4 4 0 0 1-9 0z"/>'],
 ['Raute','Diamond','<path d="M16 3 28 16 16 29 4 16zM4 16h24M16 3l-5 13 5 13 5-13z"/>'],
 ['Wolke','Cloud','<path d="M9 25a6 6 0 0 1-1-12 8 8 0 0 1 15-2 6 6 0 0 1 1 14z"/>'],
 ['Blitz','Bolt','<path d="M18 3 7 18h8l-2 11 12-16h-8z"/>'],
 ['Pilz','Mushroom','<path d="M4 17a12 10 0 0 1 24 0zM12 17v7a4 4 0 0 0 8 0v-7"/>'],
];
export function mahjongSvg(kind){return `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${MAHJONG[kind][2]}</svg>`;}
// Match-3: [Name de, en, Füllfarbe, Pfad]
export const PLANTS=[
 ['Blatt','Leaf','#5fae6b','<path d="M5 27C4 13 12 5 27 4c1 14-6 22-22 23z"/><path d="M6 26 21 11" fill="none"/>'],
 ['Blüte','Blossom','#e48fae','<circle cx="16" cy="7" r="5"/><circle cx="25" cy="14" r="5"/><circle cx="21.5" cy="24" r="5"/><circle cx="10.5" cy="24" r="5"/><circle cx="7" cy="14" r="5"/><circle cx="16" cy="16" r="3.5" fill="#f4d56a"/>'],
 ['Eichel','Acorn','#c08a52','<path d="M8 14h16c0 9-4 15-8 15s-8-6-8-15z"/><path d="M6 14a10 7 0 0 1 20 0z" fill="#7a5233"/><path d="M16 3v4" fill="none"/>'],
 ['Beere','Berry','#7f64b8','<circle cx="10" cy="20" r="6"/><circle cx="22" cy="20" r="6"/><circle cx="16" cy="11" r="6"/><path d="M16 5V2" fill="none"/>'],
 ['Pilz','Mushroom','#d4604f','<path d="M3 17a13 11 0 0 1 26 0z"/><path d="M11 17v8a5 4 0 0 0 10 0v-8z" fill="#efe3c6"/><circle cx="11" cy="12" r="2" fill="#f7efd8"/><circle cx="19" cy="10" r="2.2" fill="#f7efd8"/>'],
 ['Spross','Sprout','#e6c24f','<path d="M16 29V15" fill="none"/><path d="M16 17C8 18 5 12 5 6c7 0 11 3 11 11z"/><path d="M16 15c0-6 4-10 11-10 0 7-4 11-11 10z"/>'],
];
export function plantSvg(kind){const p=PLANTS[kind];return `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="${p[2]}" stroke="#25362b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${p[3]}</svg>`;}
