import {randomInt} from 'node:crypto';
import {shuffle} from '../poker/engine/cards.js';
export const CARDS={bomb:['Knallkiste','Blast crate'],defuse:['Sicherung','Safety fuse'],attack:['Doppelschicht','Double shift'],skip:['Feierabend','Clock out'],future:['Prüflampe','Inspection lamp'],shuffle:['Werkstatt wirbeln','Workshop whirl'],favor:['Werkzeug leihen','Borrow a tool'],nope:['Einspruch!','Objection!'],cat0:['Schraube','Screw'],cat1:['Zahnrad','Gear'],cat2:['Feder','Spring'],cat3:['Mutter','Nut'],cat4:['Unterlegscheibe','Washer']};
export const NORMAL_COUNTS={attack:4,skip:4,future:5,shuffle:4,favor:4,nope:5,cat0:4,cat1:4,cat2:4,cat3:4,cat4:4};
export function deal(players,double=false,rng=randomInt){
  if(!Number.isInteger(players)||players<2||players>(double?10:5))throw Error('Ein Deck: 2–5 Spieler; doppeltes Deck: bis 10');
  const copies=double?2:1,normal=shuffle(Object.entries(NORMAL_COUNTS).flatMap(([kind,count])=>Array.from({length:count*copies},(_,i)=>({id:`${kind}-${i}`,kind}))),rng);
  const hands=Array.from({length:players},(_,i)=>[{id:`defuse-${i}`,kind:'defuse'},...normal.splice(0,6)]);
  const rest=[...normal,...Array.from({length:6*copies-players},(_,i)=>({id:`defuse-${i+players}`,kind:'defuse'})),...Array.from({length:players-1},(_,i)=>({id:`bomb-${i}`,kind:'bomb'}))];
  return {hands,deck:shuffle(rest,rng)};
}
