const one=(list,rng)=>list[Math.floor(rng()*list.length)];
export function decide(g,id,level,rng=Math.random){
  const d={key:g.key,revision:g.revision},act=(method,data)=>({method,args:[data]}),hand=g.hand||[],has=kind=>hand.find(c=>c.kind===kind),play=(cards,extra={})=>act('playCard',{...d,cards:cards.map(c=>c.id),...extra}),others=g.people.filter(p=>p.id!==id&&p.cards>0).sort((a,b)=>b.cards-a.cards),hard=level==='hard',easy=level==='easy';
  if(g.pending){const p=g.pending,nope=has('nope'),next=g.alive[(g.alive.indexOf(p.actor)+1)%g.alive.length],harms=p.target===id||p.kind==='attack'&&next===id,benefits=p.actor===id;const wanted=(harms&&p.nopeCount%2===0||benefits&&p.nopeCount%2===1);if(nope&&rng()<(easy?.12:wanted?(hard?.92:.7):.02))return act('nope',{key:g.key,actionId:p.id,card:nope.id});return act('passReaction',{key:g.key,actionId:p.id,chain:p.nopeCount});}
  if(g.canGive){const card=easy?one(hand,rng):[...hand].sort((a,b)=>(a.kind==='defuse'?100:a.kind==='nope'?50:0)-(b.kind==='defuse'?100:b.kind==='nope'?50:0))[0];return act('giveCard',{...d,card:card.id});}
  if(g.canInsert)return act('insertBomb',{...d,index:easy?Math.floor(rng()*(g.deckCount+1)):hard?Math.min(g.deckCount,Math.max(0,g.turnsLeft-1)):Math.floor(g.deckCount*.8)});
  const knownBomb=g.future[0]?.kind==='bomb',danger=knownBomb||(!has('defuse')&&g.deckCount<=Math.max(6,g.alive.length*2));
  if(easy&&rng()<.8)return act('drawCard',d);
  if(danger&&has('attack'))return play([has('attack')]);if(danger&&has('skip'))return play([has('skip')]);if(knownBomb&&has('shuffle'))return play([has('shuffle')]);
  if(!g.future.length&&has('future'))return play([has('future')]);
  if(others.length){if(!has('defuse')&&has('favor'))return play([has('favor')],{target:others[0].id});for(let n=0;n<5;n++){const same=hand.filter(c=>c.kind==='cat'+n);if(same.length>=2)return play(same.slice(0,hard&&same.length>=3?3:2),{target:others[0].id,request:has('defuse')?'nope':'defuse'});}}
  return act('drawCard',d);
}
export const fallback=o=>decide(o.g,o.id,'medium',()=>.99);
export const strategy=(o,level,c)=>{c.check();return decide(o.g,o.id,level,c.rng);};
