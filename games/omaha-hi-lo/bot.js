import {newDeck,compareScores} from '../poker/engine/cards.js';
import {pokerWagerDecision} from '../bots.js';

// Monte Carlo over unknown cards, never the actual deck or another private hand.
// All three variants reuse the established poker wagering policy.
export function variantDecision(view,{players},rules,rng=Math.random){
  const L=view.legal;if(!L)return null;if(L.bringInRequired)return {type:'bringIn'};
  const opponents=players.filter(p=>!p.folded&&p.id!==view.viewerId),known=new Set([...(view.hand||[]),...view.board,...Object.values(view.openCards||{}).flat()]),unseen=(rules.deck?.()||newDeck()).filter(c=>!known.has(c));
  let equity=0;const trials=16;
  for(let n=0;n<trials;n++){
    const deck=[...unseen],draw=()=>deck.splice(Math.min(deck.length-1,Math.floor(rng()*deck.length)),1)[0],board=[...view.board],hands=[];
    if(!rules.stud)while(board.length<5)board.push(draw());
    const own=[...view.hand];if(rules.stud)while(own.length+board.length<7)own.push(draw());hands.push(rules.evaluate(own,board));
    for(const opponent of opponents){const h=rules.stud?[...(view.openCards[opponent.id]||[])]:[];while(h.length<(rules.stud?7-board.length:rules.holeCards||2))h.push(draw());hands.push(rules.evaluate(h,board));}
    const winners=(low=false)=>{let best=[],score=null;hands.forEach((h,i)=>{const next=low?h.low?.score:h.score;if(!next)return;const c=score===null?1:compareScores(next,score)*(low?-1:1);if(c>0){score=next;best=[i];}else if(c===0)best.push(i);});return best;};
    const high=winners(),low=rules.hiLo?winners(true):[],share=w=>w.includes(0)?1/w.length:0;equity+=low.length?(share(high)+share(low))/2:share(high);
  }
  return pokerWagerDecision(L,view.pot,equity/trials,rng);
}
