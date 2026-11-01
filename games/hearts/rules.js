import {newDeck,RANKS} from '../poker/engine/cards.js';
export const penalty=c=>c==='Qs'?13:c[1]==='h'?1:0;
export const rank=c=>RANKS.indexOf(c[0]);
export function heartsDeck(players){return newDeck().filter(c=>!(players!==4&&c==='2d')&&!(players===5&&c==='2s'));}
export function passOffset(hand,players){return [1,-1,players%2===0?players/2:0,0][(hand-1)%4];}
export function legalCards(hand,trick,number,broken){
  if(!trick.length){if(number===0)return hand.includes('2c')?['2c']:[];const safe=hand.filter(c=>c[1]!=='h');return !broken&&safe.length?safe:[...hand];}
  const suit=trick[0].card[1],follow=hand.filter(c=>c[1]===suit);if(follow.length)return follow;
  const safe=hand.filter(c=>!penalty(c));return number===0&&safe.length?safe:[...hand];
}
export function trickWinner(trick){const suit=trick[0].card[1];return trick.filter(p=>p.card[1]===suit).sort((a,b)=>rank(b.card)-rank(a.card))[0].id;}
export function scoreDeal(captured,jackBonus=false){const ids=Object.keys(captured),raw=Object.fromEntries(ids.map(id=>[id,captured[id].reduce((n,c)=>n+penalty(c),0)])),moon=ids.find(id=>raw[id]===26)||null,points=Object.fromEntries(ids.map(id=>[id,moon?(id===moon?0:26):raw[id]]));if(jackBonus)for(const id of ids)if(captured[id].includes('Jd'))points[id]-=10;return {points,raw,moon};}
export function choosePass(hand){const count=s=>hand.filter(c=>c[1]===s).length;return [...hand].sort((a,b)=>risk(b)-risk(a)).slice(0,3);function risk(c){return (c==='Qs'?100:c[1]==='s'&&rank(c)>rank('Qs')?75:penalty(c)*8)+rank(c)+(count(c[1])<=3?8:0);}}
export function chooseCard(view){const legal=view.legal,trick=view.trick;if(!trick.length)return [...legal].sort((a,b)=>rank(a)-rank(b))[0];const suit=trick[0].card[1],top=Math.max(...trick.filter(p=>p.card[1]===suit).map(p=>rank(p.card))),following=legal[0]?.[1]===suit;
  if(!following)return [...legal].sort((a,b)=>(penalty(b)*10+rank(b))-(penalty(a)*10+rank(a)))[0];
  const duck=legal.filter(c=>rank(c)<top);if(duck.length)return duck.sort((a,b)=>rank(b)-rank(a))[0];
  const safe=trick.every(p=>penalty(p.card)===0);return [...legal].sort((a,b)=>safe&&trick.length===view.players-1?rank(b)-rank(a):rank(a)-rank(b))[0];
}
