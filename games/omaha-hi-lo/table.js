import {Table} from '../poker/engine/table.js';
import {omahaBest,combinations,compareScores} from '../poker/engine/cards.js';

export function lowBest(hole,board){
  let best=null;
  for(const h of combinations(hole.filter(c=>'A2345678'.includes(c[0])),2))for(const b of combinations(board.filter(c=>'A2345678'.includes(c[0])),3)){
    const cards=[...h,...b],score=cards.map(c=>c[0]==='A'?1:'23456789TJQK'.indexOf(c[0])+2).sort((a,b)=>b-a);
    if(score[0]>8||new Set(score).size!==5)continue;
    if(!best||compareScores(score,best.score)<0)best={score,cards,name:'Low '+score.join('–')};
  }return best;
}
export class HiLoTable extends Table {
  constructor(options={}){super({...options,holeCards:4,potLimit:true});}
  evaluate(hole,board){return {...omahaBest(hole,board),low:lowBest(hole,board)};}
  splitPot(pot,evals,showdown){
    if(!showdown)return [pot];const qualifying=pot.eligible.filter(i=>evals[i]?.low);if(!qualifying.length)return [pot];
    let winners=[];for(const i of qualifying){const c=winners.length?compareScores(evals[i].low.score,evals[winners[0]].low.score):-1;if(c<0)winners=[i];else if(c===0)winners.push(i);}
    return [{...pot,amount:Math.ceil(pot.amount/2),kind:'high'},{...pot,amount:Math.floor(pot.amount/2),fixedWinners:winners,kind:'low',handLabel:evals[winners[0]].low.name,handCards:evals[winners[0]].low.cards}].filter(p=>p.amount>0);
  }
}
