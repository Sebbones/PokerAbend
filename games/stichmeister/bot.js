import {rank,winner} from './rules.js';
const command=(g,method,data)=>({method,args:[{key:g.key,revision:g.revision,...data}]});
export function decide(g,id,level='medium',rng=Math.random,c){
 if(g.stage==='bid'){let estimate=g.hand.reduce((n,card)=>n+(card[1]===g.trump?.[1]?(rank(card)+3)/15:rank(card)>=10?(rank(card)-8)/5:.035),0);
  if(level==='easy')estimate+=rng()*3-1.5;
  if(level==='hard'){const announced=Object.values(g.bids).reduce((a,b)=>a+b,0);estimate-=Math.max(0,announced+estimate-g.handSize)*.22;estimate+=g.hand.filter(card=>rank(card)===12).length*.15;}
  return command(g,'bid',{amount:Math.max(0,Math.min(g.handSize,Math.round(estimate)))});
 }
 const cards=g.legal;if(level==='easy')return command(g,'play',{card:cards[Math.floor(rng()*cards.length)]});
 const need=g.bids[id]-g.taken[id],power=card=>rank(card)+(card[1]===g.trump?.[1]?20:0);let best=cards[0],value=-Infinity;
 for(const card of cards){c?.check();const winning=g.trick.length?winner([...g.trick,{id,card}],g.trump?.[1])===id:power(card)>9;let v=need>0?(winning?50:0)-power(card):winning?-50-power(card):power(card);
  if(level==='hard'){const remaining=g.hand.length,urgency=need/remaining;v+=(need>0?1:-1)*(power(card)*(g.trick.length?urgency:2));if(g.trick.length===g.players-1)v+=winning?(need>0?100:-100):need<=0?100:0;}
  if(v>value){value=v;best=card;c?.best(command(g,'play',{card}));}}
 return command(g,'play',{card:best});
}
export const fallback=o=>o.g.stage==='bid'?command(o.g,'bid',{amount:0}):command(o.g,'play',{card:o.g.legal[0]});
export const strategy=(o,level,c)=>decide(o.g,o.id,level,c.rng,c);
