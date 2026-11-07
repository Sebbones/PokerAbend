// Twelve original inline line drawings. No fonts, external images or copied sets.
export const MOTIFS=[['Blatt','Leaf'],['Sonne','Sun'],['Mond','Moon'],['Blüte','Flower'],['Segel','Sail'],['Berg','Mountain'],['Tasse','Cup'],['Fisch','Fish'],['Schirm','Umbrella'],['Stern','Star'],['Haus','House'],['Schmetterling','Butterfly']];
const drawings=[
 '<path d="M17 48C5 18 44 7 49 14c2 30-17 43-32 34Z"/><path d="m14 55 29-34M25 42l-1-16m10 7 12 1"/>',
 '<circle cx="32" cy="32" r="12"/><path d="M32 4v8m0 40v8M4 32h8m40 0h8M12 12l6 6m28 28 6 6M12 52l6-6m28-28 6-6"/>',
 '<path d="M44 9C10 4 2 46 29 55c12 4 23-2 28-11C28 50 19 19 44 9Z"/>',
 '<circle cx="32" cy="30" r="6"/><path d="M26 25C8 9 32-1 34 20c10-23 30-3 11 9 25 0 15 27-4 14 4 22-22 22-20 0C0 54-4 26 20 30c-14-12-3-20 6-5ZM32 47v14"/>',
 '<path d="M32 7v39H12L32 7Zm5 8 16 27H37V15ZM8 49h48l-9 9H18L8 49Z"/>',
 '<path d="m5 54 19-38 13 25 8-16 15 29H5Zm13-26 6 6 5-7m11 10 5 4 4-4"/>',
 '<path d="M12 15h32v29a10 10 0 0 1-10 10H22a10 10 0 0 1-10-10V15Zm32 5h5a10 10 0 0 1 0 20h-5M18 5v4m10-4v4m10-4v4M8 59h43"/>',
 '<path d="M9 32c15-22 35-18 43 0-8 18-28 22-43 0Zm0 0L3 18v28l6-14Zm23-7v14"/><circle cx="42" cy="28" r="1.5"/>',
 '<path d="M5 31a27 27 0 0 1 54 0c-10-6-15-6-27 0-12-6-17-6-27 0Zm27-25v45c0 12 15 12 15 0M18 29C18 13 25 7 32 6c8 1 14 7 14 23"/>',
 '<path d="m32 5 8 18 19 2-14 14 4 20-17-10-17 10 4-20L5 25l19-2 8-18Z"/>',
 '<path d="M6 29 32 7l26 22M12 25v32h40V25M26 57V38h12v19M19 28h6m14 0h6"/>',
 '<path d="M30 29C5 0-5 34 19 37-3 57 27 65 31 39c6 27 34 18 14-2C68 33 58 0 34 29M32 24v28m-2-30-6-9m10 9 6-9"/>',
];
export const motif=i=>`<svg viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${drawings[i]}</svg>`;
