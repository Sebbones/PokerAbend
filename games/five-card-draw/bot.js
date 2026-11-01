import {bestHand,RANKS} from '../poker/engine/cards.js';
export function exchangeCards(hand,aceFour=false){
  const score=bestHand(hand).score;if(score[0]>=4)return [];
  const counts=new Map();for(const c of hand)counts.set(c[0],(counts.get(c[0])||0)+1);
  if(score[0]>0)return hand.filter(c=>counts.get(c[0])===1);
  const flush=['s','h','d','c'].map(s=>hand.filter(c=>c[1]===s)).find(cs=>cs.length===4);if(flush)return hand.filter(c=>!flush.includes(c));
  for(const ranks of ['A2345','23456','34567','45678','56789','6789T','789TJ','89TJQ','9TJQK','TJQKA']){const keep=hand.filter(c=>ranks.includes(c[0]));if(keep.length===4)return hand.filter(c=>!keep.includes(c));}
  const sorted=[...hand].sort((a,b)=>RANKS.indexOf(b[0])-RANKS.indexOf(a[0]));return hand.filter(c=>!sorted.slice(0,aceFour&&sorted[0][0]==='A'?1:2).includes(c));
}
export function betDecision(view,rng=Math.random){const L=view.legal;if(!L)return null;const category=bestHand(view.hand).category,call=L.toCall,stack=L.stackTo-L.bet,cheap=call<=Math.max(view.bigBlind,Math.floor((view.pot+call)*.3));if(L.canRaise&&category>=2&&rng()<.22)return {type:'raise',amount:L.minTo};if(L.canCheck)return {type:'check'};if(category>=1||cheap||call<=stack*.04)return {type:'call'};return {type:'fold'};}
