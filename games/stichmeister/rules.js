import {RANKS,newDeck} from '../poker/engine/cards.js';
export {newDeck};
export const rank=c=>RANKS.indexOf(c[0]);
export function legal(hand,trick){const suit=trick[0]?.card[1];const same=hand.filter(c=>c[1]===suit);return same.length?same:[...hand];}
export function winner(trick,trump){const suit=trick.some(p=>p.card[1]===trump)?trump:trick[0].card[1];return trick.filter(p=>p.card[1]===suit).reduce((a,b)=>rank(a.card)>rank(b.card)?a:b).id;}
export const score=(bid,taken)=>taken+(bid===taken?10:0);
