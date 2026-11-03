// Gemeinsame Varianten-Metadaten. IDs bleiben unabhängig von Anzeigenamen stabil.
import { unoPreview } from './farbenchaos/art.js';
const v = (id, name, extra = {}) => ({ id, name, ...extra });
export const VARIANTS = {
  schach: [v('classic', 'Klassisch'), v('chess960', 'Chess960')],
  monopoly: [v('classic', 'Klassisch'), v('speed', 'Tempowürfel'), v('junior', 'Junior', { minPlayers: 2, maxPlayers: 4 })],
  farbenchaos: [
    v('classic', 'Klassisch', { art: unoPreview('classic'), description: 'Modern Card Table · Gleiche Farbe oder Zahl, mit wählbaren Classic-Hausregeln.' }),
    v('flip', 'Flip', { maxPlayers: 10, art: unoPreview('flip'), description: 'Dual World · Zwei Kartenseiten, neue Farben und echte Flip-Wechsel.' }),
    v('no-mercy', 'No Mercy', { maxPlayers: 6, art: unoPreview('no-mercy'), description: 'Extreme Edition · Strafketten, mächtige Aktionen und Ausscheiden bei 25 Karten.' }),
    v('all-wild', 'All Wild', { maxPlayers: 10, art: unoPreview('all-wild'), description: 'Wild Card Universe · Jede Karte passt; Aktionen und Handtausch bestimmen den Zug.' }),
    v('halloween-ghosthunt', 'Spuknacht', { displayName: 'UNO: Spuknacht', art: unoPreview('halloween-ghosthunt'), description: 'Halloween Special – Die Geisterjagd beginnt. Classic-Regeln und Hausregeln auf einem paranormalen Ermittlertisch.' }),
  ],
  kniffel: [v('classic', 'Klassisch'), v('triple', 'Dreifach-Kniffel')],
  huetchen: [v('classic', 'Klassisch'), v('six', 'Sechseck', { minPlayers: 2, maxPlayers: 6 }), v('team', 'Team 2 gegen 2', { minPlayers: 4, maxPlayers: 4 })],
  viergewinnt: [v('classic', 'Klassisch'), v('pop-out', 'Pop Out'), v('five', 'Fünf in einer Reihe')],
  schiffe: [v('classic', 'Klassisch'), v('salvo', 'Salvo')],
  stapelrennen: [v('classic', 'Klassisch'), v('short', 'Kurze Partie'), v('team', 'Team 2 gegen 2', { minPlayers: 4, maxPlayers: 4 })],
  zehnetappen: [v('classic', 'Klassisch'), v('short', 'Kurze Partie'), v('team', 'Team 2 gegen 2', { minPlayers: 4, maxPlayers: 4 })],
  'monopoly-deal': [v('classic', 'Klassisch'), v('quick', 'Schnelle Partie')],
  'spiel-des-lebens': [v('classic', 'Klassisch'), v('short', 'Schnelles Leben', { duration: 20 })],
};
export function variantOf(game, id = 'classic') {
  const variant = (VARIANTS[game] || [v('classic', 'Klassisch')]).find((v) => v.id === id);
  if (!variant) throw new Error('Diese Variante gibt es nicht'); return variant;
}
export const variantName = (game, name, id = 'classic') => id === 'classic' ? name : (variantOf(game, id).displayName || `${name} ${variantOf(game, id).name}`);
export const scoreKey = (game, id = 'classic') => { variantOf(game, id); return id === 'classic' ? game : `${game}~${id}`; };
